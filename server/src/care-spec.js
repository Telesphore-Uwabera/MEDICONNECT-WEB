import fs from "fs";
import path from "path";
import multer from "multer";
import { loadOwnedId } from "./auth.js";
import { forgetColumns, hasColumn, insert, one, presentRow, q, tableExists, update } from "./db.js";
import { shapeReferral } from "./care-referrals.js";
import {
  ensureCareOrderReviewColumns,
  onCareOrderUpdated,
  onConsultationSummarySaved,
  onPharmacyRequestFulfilled,
} from "./clinical-episodes.js";

export const PLATFORM_BOOKING_FEE = 1000;
export const PLATFORM_BOOKING_CURRENCY = "RWF";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function saveCareFile(file, prefix) {
  if (!file?.buffer) return null;
  const dir = process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, "doctors-webp")
    : path.resolve("storage", "doctors-webp");
  fs.mkdirSync(dir, { recursive: true });
  const rawExt = path.extname(String(file.originalname || "")).toLowerCase();
  const ext = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx"].includes(rawExt)
    ? rawExt
    : file.mimetype === "application/pdf"
      ? ".pdf"
      : ".bin";
  const filename = `${prefix}_${Date.now()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `https://mediconnect.rw/api/v1/media/${filename}`;
}

async function addColumn(table, name, ddl) {
  if (!(await tableExists(table))) return;
  if (await hasColumn(table, name)) return;
  await q(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`).catch(() => {});
  forgetColumns(table);
}

export async function ensureCareSpecTables() {
  await ensureCareOrderReviewColumns();
  if (await tableExists("pharmacy_prescription_requests")) {
    await addColumn("pharmacy_prescription_requests", "fulfillment_status", "`fulfillment_status` VARCHAR(40) NULL");
    await addColumn("pharmacy_prescription_requests", "fulfillment_method", "`fulfillment_method` VARCHAR(20) NULL");
    await addColumn("pharmacy_prescription_requests", "served_at", "`served_at` TIMESTAMP NULL");
    await addColumn("pharmacy_prescription_requests", "picked_up_at", "`picked_up_at` TIMESTAMP NULL");
    await addColumn("pharmacy_prescription_requests", "delivered_at", "`delivered_at` TIMESTAMP NULL");
    await addColumn("pharmacy_prescription_requests", "partial_notes", "`partial_notes` TEXT NULL");
  }
  if (await tableExists("service_bookings")) {
    await addColumn("service_bookings", "booking_fee", "`booking_fee` DECIMAL(12,2) NULL");
    await addColumn("service_bookings", "booking_fee_currency", "`booking_fee_currency` VARCHAR(8) NULL");
    await addColumn("service_bookings", "booking_channel", "`booking_channel` VARCHAR(40) NULL");
    await addColumn("service_bookings", "created_by_user_id", "`created_by_user_id` BIGINT UNSIGNED NULL");
    await addColumn("service_bookings", "agent_notes", "`agent_notes` TEXT NULL");
  }
  await q(`
    CREATE TABLE IF NOT EXISTS external_prescriptions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      patient_id BIGINT UNSIGNED NOT NULL,
      uploaded_by BIGINT UNSIGNED NULL,
      pharmacy_id BIGINT UNSIGNED NULL,
      file_url VARCHAR(500) NOT NULL,
      notes TEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      fulfillment_status VARCHAR(40) NULL,
      fulfillment_method VARCHAR(20) NULL,
      claimed_at TIMESTAMP NULL,
      served_at TIMESTAMP NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY external_prescriptions_patient (patient_id),
      KEY external_prescriptions_pharmacy (pharmacy_id)
    )
  `).catch(() => {});
  forgetColumns("external_prescriptions");
}

export async function stampServiceBooking(row, { channel, userId, agentNotes } = {}) {
  if (!row?.id || !(await tableExists("service_bookings"))) return row;
  await ensureCareSpecTables();
  const patch = {};
  if (await hasColumn("service_bookings", "booking_fee") && (row.booking_fee == null || row.booking_fee === "")) {
    patch.booking_fee = PLATFORM_BOOKING_FEE;
  }
  if (await hasColumn("service_bookings", "booking_fee_currency") && !row.booking_fee_currency) {
    patch.booking_fee_currency = PLATFORM_BOOKING_CURRENCY;
  }
  if (channel && await hasColumn("service_bookings", "booking_channel") && !row.booking_channel) {
    patch.booking_channel = channel;
  }
  if (userId && await hasColumn("service_bookings", "created_by_user_id") && !row.created_by_user_id) {
    patch.created_by_user_id = userId;
  }
  if (agentNotes && await hasColumn("service_bookings", "agent_notes")) {
    patch.agent_notes = agentNotes;
  }
  if (Object.keys(patch).length) {
    await update("service_bookings", row.id, patch);
    return one("SELECT * FROM service_bookings WHERE id = ?", [row.id]);
  }
  return row;
}

export async function applyPharmacyFulfillment(table, row, body = {}) {
  await ensureCareSpecTables();
  const fulfillmentStatus = String(body.fulfillment_status || body.status || "SERVED").toUpperCase() === "PARTIALLY_FULFILLED"
    ? "PARTIALLY_FULFILLED"
    : "SERVED";
  const method = String(body.fulfillment_method || body.method || row.delivery_type || "pickup").toLowerCase() === "delivery"
    ? "delivery"
    : "pickup";
  const now = new Date();
  const patch = { status: "fulfilled" };
  if (await hasColumn(table, "fulfillment_status")) patch.fulfillment_status = fulfillmentStatus;
  if (await hasColumn(table, "fulfillment_method")) patch.fulfillment_method = method;
  if (await hasColumn(table, "served_at")) patch.served_at = now;
  if (method === "pickup" && await hasColumn(table, "picked_up_at")) patch.picked_up_at = now;
  if (method === "delivery" && await hasColumn(table, "delivered_at")) patch.delivered_at = now;
  if (body.partial_notes && await hasColumn(table, "partial_notes")) patch.partial_notes = body.partial_notes;
  await update(table, row.id, patch);
  const fresh = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]);
  await onPharmacyRequestFulfilled(fresh, fulfillmentStatus);
  return fresh;
}

export async function attachCareOrderResultFiles(order, files = []) {
  if (!order?.id) return order;
  await ensureCareOrderReviewColumns();
  const saved = [];
  for (const file of files) {
    const url = saveCareFile(file, `care_${order.id}`);
    if (url) saved.push({ url, name: file.originalname || "result" });
  }
  if (!saved.length) return order;
  const existing = (() => {
    try {
      const parsed = typeof order.result_files_json === "string" ? JSON.parse(order.result_files_json) : order.result_files_json;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const next = [...existing, ...saved];
  const patch = {};
  if (await hasColumn("care_orders", "result_files_json")) patch.result_files_json = JSON.stringify(next);
  if (await hasColumn("care_orders", "result_file_url")) patch.result_file_url = next[next.length - 1].url;
  if (Object.keys(patch).length) await update("care_orders", order.id, patch);
  return one("SELECT * FROM care_orders WHERE id = ?", [order.id]);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function referralLetterHtml(referral) {
  const soap = referral.appointment_id
    ? await one("SELECT * FROM consultation_summaries WHERE appointment_id = ? ORDER BY id DESC LIMIT 1", [referral.appointment_id]).catch(() => null)
    : referral.instant_consultation_id
      ? await one("SELECT * FROM consultation_summaries WHERE instant_consultation_id = ? ORDER BY id DESC LIMIT 1", [referral.instant_consultation_id]).catch(() => null)
      : await one("SELECT * FROM consultation_summaries WHERE patient_id = ? AND doctor_id = ? ORDER BY id DESC LIMIT 1", [referral.patient_id, referral.doctor_id || referral.referring_doctor_id]).catch(() => null);
  const target = referral.hospital?.name || referral.pharmacy?.name || referral.referred_to_doctor?.name || "MediConnect partner";
  const soapBits = soap
    ? `<p><strong>Consult findings</strong></p><p>${esc(soap.chief_complaint || soap.diagnosis || soap.assessment || soap.plan || "")}</p>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Referral letter #${referral.id}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;line-height:1.5}h1{font-size:20px}p{font-size:14px}.muted{color:#555}</style></head>
<body>
<p class="muted">MediConnect LTD · Referral letter</p>
<h1>Referral #${referral.id}</h1>
<p><strong>Patient:</strong> ${esc(referral.patient?.name || `#${referral.patient_id}`)}</p>
<p><strong>Referring clinician:</strong> ${esc(referral.referring_doctor?.name || "")}</p>
<p><strong>Referred to:</strong> ${esc(target)}</p>
<p><strong>Urgency:</strong> ${esc(referral.urgency || "medium")}</p>
<p><strong>Reason:</strong> ${esc(referral.reason)}</p>
${referral.notes ? `<p><strong>Notes:</strong> ${esc(referral.notes)}</p>` : ""}
${soapBits}
<p class="muted">This letter is generated from the existing referral and consultation note. It does not replace the in-app care packet.</p>
</body></html>`;
}

async function patientIdsForUser(userId) {
  const owned = await loadOwnedId(userId, "patients");
  const patient = await one("SELECT * FROM patients WHERE id = ? OR user_id = ? LIMIT 1", [owned, userId]).catch(() => null);
  return [...new Set([patient?.id, patient?.user_id, userId, owned].filter(Boolean).map(Number))];
}

export function registerCareSpecRoutes(router, { requireAuth, requireRole }) {
  const letter = async (req, res, next) => {
    try {
      const id = Number(req.params.referralId);
      const row = await one("SELECT * FROM referrals WHERE id = ?", [id]).catch(() => null);
      if (!row) return res.status(404).json({ message: "Referral not found." });
      const shaped = await shapeReferral(row);
      const scope = req.path.startsWith("/patient") ? "patient" : "doctor";
      if (scope === "doctor") {
        const doctorId = await loadOwnedId(req.user.id, "doctors");
        if (Number(row.doctor_id || row.referring_doctor_id) !== Number(doctorId)) {
          return res.status(404).json({ message: "Referral not found." });
        }
      } else {
        const ids = new Set(await patientIdsForUser(req.user.id));
        if (!ids.has(Number(row.patient_id))) return res.status(404).json({ message: "Referral not found." });
      }
      const html = await referralLetterHtml(shaped);
      res.json({ html, referral: shaped, data: shaped });
    } catch (error) {
      next(error);
    }
  };

  router.get("/doctor/referrals/:referralId/letter", requireAuth, requireRole("doctor"), letter);
  router.get("/patient/referrals/:referralId/letter", requireAuth, requireRole("patient"), letter);

  router.post("/doctor/care-orders/:careOrderId/handover", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      await ensureCareOrderReviewColumns();
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const order = await one("SELECT * FROM care_orders WHERE id = ?", [Number(req.params.careOrderId)]).catch(() => null);
      if (!order || Number(order.doctor_id) !== Number(doctorId)) {
        return res.status(404).json({ message: "Care order not found." });
      }
      const status = String(req.body?.handover_status || req.body?.status || "").toUpperCase();
      if (!["RECEIVED", "IN_TRANSIT", "ADMITTED", "TRANSFERRED", "DISCHARGED"].includes(status)) {
        return res.status(422).json({ message: "Choose a valid handover status." });
      }
      const patch = { handover_status: status };
      if (status === "DISCHARGED" || status === "TRANSFERRED") patch.status = "completed";
      await update("care_orders", order.id, patch);
      const fresh = await one("SELECT * FROM care_orders WHERE id = ?", [order.id]);
      await onCareOrderUpdated(fresh, status === "DISCHARGED" || status === "TRANSFERRED" ? "complete" : "accept", "hospital");
      const presented = await presentRow("care_orders", fresh);
      res.json({ message: "Handover updated.", order: presented, data: presented });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/service-bookings", requireAuth, requireRole("admin", "moderator", "help_desk"), async (req, res, next) => {
    try {
      await ensureCareSpecTables();
      const body = req.body || {};
      const patient = await one("SELECT * FROM patients WHERE id = ? OR user_id = ? LIMIT 1", [body.patient_id, body.patient_id]).catch(() => null);
      if (!patient) return res.status(422).json({ message: "Choose a patient for this booking." });
      const hospitalId = Number(body.hospital_id || 0);
      if (!hospitalId) return res.status(422).json({ message: "Choose a hospital." });
      const payload = {
        patient_id: patient.user_id || patient.id,
        hospital_id: hospitalId,
        hospital_service_id: body.hospital_service_id || null,
        department_id: body.department_id || null,
        preferred_date: body.preferred_date,
        preferred_time: body.preferred_time,
        notes: body.notes || null,
        status: "pending",
        booked_by: "admin",
      };
      const id = await insert("service_bookings", payload);
      let row = await one("SELECT * FROM service_bookings WHERE id = ?", [id]);
      row = await stampServiceBooking(row, {
        channel: "admin_cs",
        userId: req.user.id,
        agentNotes: body.agent_notes || `Booked by ${req.user.email || req.user.id}`,
      });
      const booking = await presentRow("service_bookings", row);
      res.status(201).json({
        message: "Booking created. The RWF 1,000 platform fee is layered on top of the hospital price and does not replace it.",
        booking,
        data: booking,
        booking_fee: PLATFORM_BOOKING_FEE,
        booking_fee_currency: PLATFORM_BOOKING_CURRENCY,
      });
    } catch (error) {
      next(error);
    }
  });

  const listExternal = async (req, res, next) => {
    try {
      await ensureCareSpecTables();
      const scope = req.path.startsWith("/pharmacy") ? "pharmacy" : "patient";
      let rows = [];
      if (scope === "patient") {
        const ids = await patientIdsForUser(req.user.id);
        rows = await q(
          `SELECT * FROM external_prescriptions WHERE patient_id IN (${ids.map(() => "?").join(",") || "?"}) ORDER BY id DESC LIMIT 80`,
          ids.length ? ids : [0],
        ).catch(() => []);
      } else {
        const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
        rows = await q(
          "SELECT * FROM external_prescriptions WHERE status = 'pending' OR pharmacy_id = ? ORDER BY id DESC LIMIT 80",
          [pharmacyId || 0],
        ).catch(() => []);
      }
      res.json({ prescriptions: rows, data: rows, total: rows.length });
    } catch (error) {
      next(error);
    }
  };

  router.get("/patient/external-prescriptions", requireAuth, requireRole("patient"), listExternal);
  router.get("/pharmacy/external-prescriptions", requireAuth, requireRole("pharmacy"), listExternal);

  router.post("/patient/external-prescriptions", requireAuth, requireRole("patient"), upload.any(), async (req, res, next) => {
    try {
      await ensureCareSpecTables();
      const patient = await one("SELECT * FROM patients WHERE user_id = ? OR id = ? LIMIT 1", [
        req.user.id,
        await loadOwnedId(req.user.id, "patients"),
      ]).catch(() => null);
      if (!patient) return res.status(403).json({ message: "A patient profile is required." });
      const file = req.files?.[0];
      const url = saveCareFile(file, `ext_rx_${patient.id}`);
      if (!url) return res.status(422).json({ message: "Upload a photo or PDF of the paper prescription." });
      const id = await insert("external_prescriptions", {
        patient_id: patient.id,
        uploaded_by: req.user.id,
        file_url: url,
        notes: req.body?.notes || null,
        status: "pending",
      });
      const row = await one("SELECT * FROM external_prescriptions WHERE id = ?", [id]);
      res.status(201).json({
        message: "Paper prescription uploaded. This is not a MediConnect consult and is not clinically owned until a pharmacy claims it.",
        prescription: row,
        data: row,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/pharmacy/external-prescriptions/:id/:action", requireAuth, requireRole("pharmacy"), async (req, res, next) => {
    try {
      await ensureCareSpecTables();
      const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
      const row = await one("SELECT * FROM external_prescriptions WHERE id = ?", [Number(req.params.id)]).catch(() => null);
      if (!row) return res.status(404).json({ message: "External prescription not found." });
      const action = String(req.params.action || "");
      if (action === "claim") {
        await update("external_prescriptions", row.id, {
          pharmacy_id: pharmacyId,
          status: "claimed",
          claimed_at: new Date(),
        });
      } else if (action === "fulfill") {
        if (Number(row.pharmacy_id) !== Number(pharmacyId)) {
          return res.status(403).json({ message: "Claim this paper prescription before serving it." });
        }
        const fulfillmentStatus = String(req.body?.fulfillment_status || "SERVED").toUpperCase();
        await update("external_prescriptions", row.id, {
          status: "fulfilled",
          fulfillment_status: fulfillmentStatus === "PARTIALLY_FULFILLED" ? "PARTIALLY_FULFILLED" : "SERVED",
          fulfillment_method: req.body?.fulfillment_method || "pickup",
          served_at: new Date(),
        });
      } else {
        return res.status(422).json({ message: "Unknown action." });
      }
      const fresh = await one("SELECT * FROM external_prescriptions WHERE id = ?", [row.id]);
      res.json({ message: "Updated.", prescription: fresh, data: fresh });
    } catch (error) {
      next(error);
    }
  });
}

export async function afterResourceSaved(table, row, req) {
  if (!row) return row;
  if (table === "consultation_summaries") {
    await onConsultationSummarySaved(row).catch(() => null);
  }
  if (table === "service_bookings") {
    const channel = req?.user?.active_role === "admin" || req?.user?.role === "admin" ? "admin_cs" : "patient";
    row = await stampServiceBooking(row, { channel, userId: req?.user?.id });
  }
  return row;
}
