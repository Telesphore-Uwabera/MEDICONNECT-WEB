import { hasColumn, insert, one, pool, q, tableExists } from "./db.js";
import { broadcast } from "./realtime.js";
import { roomFromToken } from "./call-token.js";

let chatTableReady = false;

async function ensureChatTable() {
  if (chatTableReady) return;
  await pool.query(
    `CREATE TABLE IF NOT EXISTS chat_messages (
       id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       instant_consultation_request_id BIGINT UNSIGNED NULL,
       appointment_id BIGINT UNSIGNED NULL,
       sender_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
       sender_type VARCHAR(32) NOT NULL DEFAULT 'patient',
       message TEXT NOT NULL,
       read_at DATETIME NULL,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       INDEX idx_chat_instant (instant_consultation_request_id),
       INDEX idx_chat_appointment (appointment_id)
     )`,
  ).catch(() => null);
  chatTableReady = true;
}

async function nullable(column) {
  const meta = await one(
    `SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = ?`,
    [column],
  ).catch(() => null);
  return String(meta?.nullable || "YES").toUpperCase() === "YES";
}

async function consultation(kind, id) {
  if (kind === "instant") {
    const table = (await tableExists("instant_consultation_requests"))
      ? "instant_consultation_requests"
      : "instant_consultations";
    const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]).catch(() => null);
    return row ? { ...row, kind } : null;
  }
  if (kind === "certificate") {
    if (!(await tableExists("fitness_certificates"))) return null;
    const row = await one("SELECT * FROM fitness_certificates WHERE id = ?", [id]).catch(() => null);
    return row ? { ...row, kind: "certificate" } : null;
  }
  const row = await one("SELECT * FROM appointments WHERE id = ?", [id]).catch(() => null);
  return row ? { ...row, kind: "appointment" } : null;
}

function phoneTail(value) {
  return String(value || "").replace(/\D/g, "").slice(-9);
}

function bearerOrGuestToken(req) {
  const guestHeader = String(req.headers?.["x-guest-token"] || req.query?.guest_token || req.body?.guest_token || "").trim();
  if (guestHeader) return guestHeader;
  const auth = String(req.headers?.authorization || "").trim();
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return "";
}

async function participantRole(req, row) {
  if (!row) return null;
  if (req.user) {
    const doctor = row.doctor_id
      ? await one("SELECT id, user_id FROM doctors WHERE id = ?", [row.doctor_id]).catch(() => null)
      : null;
    if (doctor && Number(doctor.user_id) === Number(req.user.id)) return "doctor";
    const profile = await tableExists("patients")
      ? await one("SELECT id FROM patients WHERE user_id = ? ORDER BY id DESC LIMIT 1", [req.user.id]).catch(() => null)
      : null;
    const sameUser = row.user_id != null && Number(row.user_id) === Number(req.user.id);
    const samePatient = (row.patient_id != null && Number(row.patient_id) === Number(req.user.id))
      || (profile && row.patient_id != null && Number(row.patient_id) === Number(profile.id));
    const sameEmail = row.guest_email && req.user.email
      && String(row.guest_email).toLowerCase() === String(req.user.email).toLowerCase();
    const userTail = phoneTail(req.user.phone);
    const rowTail = phoneTail(row.guest_phone || row.phone);
    const samePhone = Boolean(userTail && rowTail && userTail.length >= 8 && userTail === rowTail);
    if (sameUser || samePatient || sameEmail || samePhone) return "patient";
    if (req.user.active_role === "doctor" && !row.doctor_id) return "doctor";
  }

  const candidateToken = bearerOrGuestToken(req);
  if (candidateToken) {
    if (row.guest_token && String(row.guest_token) === candidateToken) return "patient";
    const expectedRoom = row.kind === "instant"
      ? `instant-${row.id}`
      : row.kind === "certificate"
        ? `certificate-${row.id}`
        : `appointment-${row.id}`;
    const tokenRoom = roomFromToken(candidateToken);
    if (tokenRoom && (tokenRoom === expectedRoom || tokenRoom === row.daily_room_name || tokenRoom === row.room_name)) {
      return "patient";
    }
  }
  return null;
}

function presentMessage(row) {
  return {
    id: row.id,
    instant_consultation_request_id: row.instant_consultation_request_id || null,
    appointment_id: row.appointment_id || null,
    sender_id: row.sender_id,
    sender_type: row.sender_type,
    message: row.message,
    read_at: row.read_at || null,
    created_at: row.created_at,
  };
}

export function attachChatRoutes(router) {
  async function load(req, res, kind) {
    await ensureChatTable();
    const row = await consultation(kind, req.params.id);
    if (!row) {
      res.status(404).json({ message: "Consultation not found." });
      return null;
    }
    const role = await participantRole(req, row);
    if (!role) {
      if (!req.user && !bearerOrGuestToken(req)) {
        res.status(401).json({ message: "Unauthenticated." });
        return null;
      }
      res.status(403).json({ message: "This conversation belongs to the patient and the doctor." });
      return null;
    }
    return { row, role };
  }

  function where(kind) {
    return kind === "instant" ? "instant_consultation_request_id = ?" : "appointment_id = ?";
  }

  function channel(kind, id) {
    if (kind === "instant") return `instant-consultation.${id}.chat`;
    if (kind === "certificate") return `certificate.${id}.chat`;
    return `appointment.${id}.chat`;
  }

  async function listMessages(req, res, kind) {
    const loaded = await load(req, res, kind);
    if (!loaded) return;
    const rows = await q(
      `SELECT * FROM chat_messages WHERE ${where(kind)} ORDER BY id ASC LIMIT 100`,
      [req.params.id],
    ).catch(() => []);
    res.json({
      messages: {
        data: rows.map(presentMessage),
        next_cursor: null,
        next_page_url: null,
      },
    });
  }

  async function sendMessage(req, res, kind) {
    const loaded = await load(req, res, kind);
    if (!loaded) return;
    const text = String(req.body?.message || "").trim();
    if (!text) return res.status(422).json({ message: "Write a message first." });
    const senderId = req.user?.id || loaded.row.user_id || loaded.row.patient_id || 0;
    const fields = {
      sender_id: senderId,
      sender_type: loaded.role,
      message: text.slice(0, 4000),
    };
    if (kind === "instant") fields.instant_consultation_request_id = req.params.id;
    else fields.appointment_id = req.params.id;
    if (kind === "instant" && !(await nullable("appointment_id"))) fields.appointment_id = 0;
    if (kind !== "instant" && !(await nullable("instant_consultation_request_id"))) {
      fields.instant_consultation_request_id = 0;
    }
    const id = await insert("chat_messages", fields);
    const saved = presentMessage(await one("SELECT * FROM chat_messages WHERE id = ?", [id]));
    broadcast(channel(kind, req.params.id), "message.sent", saved);
    res.status(201).json({ message: "Message sent.", data: saved });
  }

  async function markRead(req, res, kind) {
    const loaded = await load(req, res, kind);
    if (!loaded) return;
    await pool.query(
      `UPDATE chat_messages SET read_at = NOW() WHERE ${where(kind)} AND sender_type <> ? AND read_at IS NULL`,
      [req.params.id, loaded.role],
    ).catch(() => null);
    res.json({ message: "Messages marked as read." });
  }

  router.get("/chat/instant/:id", (req, res, next) => listMessages(req, res, "instant").catch(next));
  router.post("/chat/instant/:id", (req, res, next) => sendMessage(req, res, "instant").catch(next));
  router.post("/chat/instant/:id/read", (req, res, next) => markRead(req, res, "instant").catch(next));
  router.get("/chat/appointment/:id", (req, res, next) => listMessages(req, res, "appointment").catch(next));
  router.post("/chat/appointment/:id", (req, res, next) => sendMessage(req, res, "appointment").catch(next));
  router.post("/chat/appointment/:id/read", (req, res, next) => markRead(req, res, "appointment").catch(next));
  router.get("/chat/certificate/:id", (req, res, next) => listMessages(req, res, "certificate").catch(next));
  router.post("/chat/certificate/:id", (req, res, next) => sendMessage(req, res, "certificate").catch(next));
  router.post("/chat/certificate/:id/read", (req, res, next) => markRead(req, res, "certificate").catch(next));
  router.get("/chat/:id", (req, res, next) => listMessages(req, res, "appointment").catch(next));
  router.post("/chat/:id", (req, res, next) => sendMessage(req, res, "appointment").catch(next));
  router.post("/chat/:id/read", (req, res, next) => markRead(req, res, "appointment").catch(next));
}
