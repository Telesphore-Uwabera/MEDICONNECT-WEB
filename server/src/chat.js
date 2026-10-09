import { insert, one, pool, q, tableExists } from "./db.js";
import { broadcast } from "./realtime.js";

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
  const row = await one("SELECT * FROM appointments WHERE id = ?", [id]).catch(() => null);
  return row ? { ...row, kind: "appointment" } : null;
}

async function participantRole(req, row) {
  if (!req.user || !row) return null;
  const doctor = row.doctor_id
    ? await one("SELECT id, user_id FROM doctors WHERE id = ?", [row.doctor_id]).catch(() => null)
    : null;
  if (doctor && Number(doctor.user_id) === Number(req.user.id)) return "doctor";
  const profile = await tableExists("patients")
    ? await one("SELECT id FROM patients WHERE user_id = ? ORDER BY id DESC LIMIT 1", [req.user.id]).catch(() => null)
    : null;
  const samePatient = Number(row.patient_id) === Number(req.user.id)
    || (profile && Number(row.patient_id) === Number(profile.id));
  const sameEmail = row.guest_email && req.user.email
    && String(row.guest_email).toLowerCase() === String(req.user.email).toLowerCase();
  if (samePatient || sameEmail) return "patient";
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

export function attachChatRoutes(router, { requireAuth }) {
  async function load(req, res, kind) {
    const row = await consultation(kind, req.params.id);
    if (!row) {
      res.status(404).json({ message: "Consultation not found." });
      return null;
    }
    const role = await participantRole(req, row);
    if (!role) {
      res.status(403).json({ message: "This conversation belongs to the patient and the doctor." });
      return null;
    }
    return { row, role };
  }

  function where(kind) {
    return kind === "instant" ? "instant_consultation_request_id = ?" : "appointment_id = ?";
  }

  function channel(kind, id) {
    return kind === "instant" ? `instant-consultation.${id}.chat` : `appointment.${id}.chat`;
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
    const fields = {
      sender_id: req.user.id,
      sender_type: loaded.role,
      message: text.slice(0, 4000),
    };
    if (kind === "instant") fields.instant_consultation_request_id = req.params.id;
    else fields.appointment_id = req.params.id;
    if (kind === "instant" && !(await nullable("appointment_id"))) fields.appointment_id = 0;
    if (kind === "appointment" && !(await nullable("instant_consultation_request_id"))) {
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

  router.get("/chat/instant/:id", requireAuth, (req, res, next) => listMessages(req, res, "instant").catch(next));
  router.post("/chat/instant/:id", requireAuth, (req, res, next) => sendMessage(req, res, "instant").catch(next));
  router.post("/chat/instant/:id/read", requireAuth, (req, res, next) => markRead(req, res, "instant").catch(next));
  router.get("/chat/:id", requireAuth, (req, res, next) => listMessages(req, res, "appointment").catch(next));
  router.post("/chat/:id", requireAuth, (req, res, next) => sendMessage(req, res, "appointment").catch(next));
  router.post("/chat/:id/read", requireAuth, (req, res, next) => markRead(req, res, "appointment").catch(next));
}
