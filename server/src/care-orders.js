import crypto from "crypto";
import multer from "multer";
import { forgetColumns, hasColumn, insert, one, presentRow, q, tableExists, update } from "./db.js";
import { loadOwnedId } from "./auth.js";
import { requireRegisteredFacility, requireRegisteredPharmacy } from "./care-partners.js";
import { ensureCareOrderReviewColumns, onCareOrderCreated, onCareOrderUpdated } from "./clinical-episodes.js";
import { attachCareOrderResultFiles } from "./care-spec.js";

const careUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const ORDER_TYPES = new Set([
  "lab",
  "imaging",
  "procedure",
  "nursing",
  "admission",
  "follow_up",
  "rehab",
  "vaccination",
  "home_care",
  "pharmacy_packet",
  "facility_packet",
]);

export async function ensureCareOrdersTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS care_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      patient_id BIGINT UNSIGNED NOT NULL,
      doctor_id BIGINT UNSIGNED NULL,
      hospital_id BIGINT UNSIGNED NULL,
      pharmacy_id BIGINT UNSIGNED NULL,
      appointment_id BIGINT UNSIGNED NULL,
      instant_consultation_id BIGINT UNSIGNED NULL,
      referral_id BIGINT UNSIGNED NULL,
      order_type VARCHAR(40) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      urgency VARCHAR(20) NOT NULL DEFAULT 'medium',
      title VARCHAR(255) NULL,
      clinical_notes TEXT NULL,
      items_json JSON NULL,
      snapshot_json JSON NULL,
      result_notes TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY care_orders_patient (patient_id),
      KEY care_orders_hospital (hospital_id),
      KEY care_orders_pharmacy (pharmacy_id),
      KEY care_orders_doctor (doctor_id)
    )
  `).catch(() => {});
  forgetColumns("care_orders");
  const extra = {
    patient_code: "`patient_code` VARCHAR(40) NULL",
    protocol_json: "`protocol_json` JSON NULL",
    doctor_message: "`doctor_message` TEXT NULL",
    parent_order_id: "`parent_order_id` BIGINT UNSIGNED NULL",
    responded_at: "`responded_at` TIMESTAMP NULL",
    episode_id: "`episode_id` BIGINT UNSIGNED NULL",
    review_status: "`review_status` VARCHAR(40) NULL",
    reviewed_at: "`reviewed_at` TIMESTAMP NULL",
    reviewed_by: "`reviewed_by` BIGINT UNSIGNED NULL",
    doctor_interpretation: "`doctor_interpretation` TEXT NULL",
    management_decision: "`management_decision` VARCHAR(40) NULL",
  };
  for (const [name, ddl] of Object.entries(extra)) {
    if (!(await hasColumn("care_orders", name))) {
      await q(`ALTER TABLE care_orders ADD COLUMN ${ddl}`).catch(() => {});
      forgetColumns("care_orders");
    }
  }
}

async function notifyUser(userId, title, message) {
  if (!userId || !(await hasColumn("notifications", "notifiable_id"))) return;
  const fields = {
    notifiable_id: userId,
    data: JSON.stringify({ title, message, body: message, type: "care.order" }),
  };
  if (await hasColumn("notifications", "type")) fields.type = "care.order";
  if (await hasColumn("notifications", "notifiable_type")) fields.notifiable_type = "App\\Models\\User";
  const now = new Date();
  if (await hasColumn("notifications", "created_at")) fields.created_at = now;
  if (await hasColumn("notifications", "updated_at")) fields.updated_at = now;
  await insert("notifications", fields).catch(() => {});
}

async function resolvePatient(rawId) {
  const id = Number(rawId);
  if (!id) return null;
  return one("SELECT * FROM patients WHERE id = ? OR user_id = ? LIMIT 1", [id, id]).catch(() => null);
}

async function loadMedicalSnapshot(patient) {
  if (!patient) return {};
  const tables = ["patient_medical_infos", "patient_medical_info", "medical_infos", "medical_records", "patient_medical_records"];
  let info = null;
  for (const table of tables) {
    if (!(await tableExists(table))) continue;
    info = await one(`SELECT * FROM \`${table}\` WHERE patient_id = ? ORDER BY id DESC LIMIT 1`, [patient.id]).catch(() => null);
    if (!info && patient.user_id) {
      info = await one(`SELECT * FROM \`${table}\` WHERE patient_id = ? ORDER BY id DESC LIMIT 1`, [patient.user_id]).catch(() => null);
    }
    if (info) break;
  }
  const user = await one("SELECT id, name, email, phone, country_code, avatar FROM users WHERE id = ?", [patient.user_id || patient.id]).catch(() => null);
  return {
    patient: {
      id: patient.id,
      user_id: user?.id || patient.user_id,
      name: user?.name || null,
      phone: user?.phone || null,
      email: user?.email || null,
      country_code: user?.country_code || null,
    },
    blood_type: info?.blood_type || null,
    allergies: info?.known_allergies || info?.allergies || null,
    current_medications: info?.current_medications || info?.medications || null,
    chronic_conditions: info?.chronic_conditions || info?.conditions || null,
    surgical_history: info?.surgical_history || null,
    family_history: info?.family_history || null,
    disabilities: info?.disabilities || null,
    captured_at: new Date().toISOString(),
  };
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function shapeOrder(row) {
  if (!row) return null;
  const presented = await presentRow("care_orders", row);
  return {
    ...presented,
    care_order_id: presented.id,
    items: parseJson(presented.items_json, []),
    protocol: parseJson(presented.protocol_json, []),
    snapshot: parseJson(presented.snapshot_json, {}),
    result_files: parseJson(presented.result_files_json, []),
  };
}

async function findCareOrder(careOrderId) {
  const raw = String(careOrderId || "").trim();
  if (!raw || raw === "undefined" || raw === "null") return null;
  if (/^\d+$/.test(raw)) {
    return one("SELECT * FROM care_orders WHERE id = ?", [Number(raw)]).catch(() => null);
  }
  return one("SELECT * FROM care_orders WHERE patient_code = ? LIMIT 1", [raw.toUpperCase()]).catch(() => null);
}

async function orderMatchesScope(scope, req, row) {
  if (!row) return false;
  if (scope === "doctor") {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    return Number(row.doctor_id) === Number(doctorId);
  }
  if (scope === "hospital") {
    const hospitalId = await loadOwnedId(req.user.id, "hospitals");
    return Number(row.hospital_id) === Number(hospitalId);
  }
  if (scope === "pharmacy") {
    const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
    return Number(row.pharmacy_id) === Number(pharmacyId);
  }
  if (scope === "patient") {
    const patient = await resolvePatient(await loadOwnedId(req.user.id, "patients"));
    const ids = new Set([patient?.id, patient?.user_id, req.user.id].filter(Boolean).map(Number));
    return ids.has(Number(row.patient_id));
  }
  return false;
}

function careCode() {
  const year = new Date().getFullYear();
  return `MC-CR-${year}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function ownedWhere(scope, req) {
  const clauses = [];
  const params = [];
  if (scope === "doctor") {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    clauses.push("`doctor_id` = ?");
    params.push(doctorId || 0);
  } else if (scope === "patient") {
    const patient = await resolvePatient(await loadOwnedId(req.user.id, "patients"));
    const ids = [...new Set([patient?.id, patient?.user_id, req.user.id].filter(Boolean))];
    clauses.push(`\`patient_id\` IN (${ids.map(() => "?").join(",") || "?"})`);
    params.push(...(ids.length ? ids : [0]));
  } else if (scope === "hospital") {
    const hospitalId = await loadOwnedId(req.user.id, "hospitals");
    clauses.push("`hospital_id` = ?");
    params.push(hospitalId || 0);
  } else if (scope === "pharmacy") {
    const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
    clauses.push("`pharmacy_id` = ?");
    params.push(pharmacyId || 0);
  }
  if (req.query?.status) {
    clauses.push("`status` = ?");
    params.push(req.query.status);
  }
  if (req.query?.order_type || req.query?.type) {
    clauses.push("`order_type` = ?");
    params.push(req.query.order_type || req.query.type);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "WHERE 1=1",
    params,
  };
}

export async function handleCareOrders(req, res, parts) {
  if (parts[1] !== "care-orders") return false;
  const scope = parts[0];
  if (!["doctor", "patient", "hospital", "pharmacy"].includes(scope)) return false;
  await ensureCareOrdersTable();
  await ensureCareOrderReviewColumns();

  if (req.method === "GET" && !parts[2]) {
    const owned = await ownedWhere(scope, req);
    const rows = await q(`SELECT * FROM care_orders ${owned.sql} ORDER BY id DESC LIMIT 150`, owned.params).catch(() => []);
    const orders = [];
    for (const row of rows) orders.push(await shapeOrder(row));
    res.json({ orders, data: orders, total: orders.length });
    return true;
  }

  if (req.method === "GET" && parts[2] && !parts[3]) {
    const row = await findCareOrder(parts[2]);
    if (!row || !(await orderMatchesScope(scope, req, row))) {
      return res.status(404).json({ message: "Care order not found." }) || true;
    }
    const order = await shapeOrder(row);
    res.json({ order, data: order, care_order_id: order.id, ...order });
    return true;
  }

  if (req.method === "POST" && scope === "doctor" && !parts[2]) {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    if (!doctorId) return res.status(403).json({ message: "A doctor profile is required." }) || true;
    const body = req.body || {};
    const orderType = String(body.order_type || body.type || "").trim();
    if (!ORDER_TYPES.has(orderType)) {
      return res.status(422).json({ message: "Choose a valid care order type." }) || true;
    }
    const patient = await resolvePatient(body.patient_id);
    if (!patient) return res.status(422).json({ message: "Choose a patient." }) || true;
    const hospitalId = Number(body.hospital_id || 0) || null;
    const pharmacyId = Number(body.pharmacy_id || 0) || null;
    if (["lab", "imaging", "procedure", "nursing", "admission", "rehab", "vaccination", "facility_packet"].includes(orderType)) {
      const facility = await requireRegisteredFacility(hospitalId);
      if (facility.error) return res.status(422).json({ message: facility.error }) || true;
    }
    if (orderType === "pharmacy_packet") {
      const pharmacy = await requireRegisteredPharmacy(pharmacyId);
      if (pharmacy.error) return res.status(422).json({ message: pharmacy.error }) || true;
    }
    const items = Array.isArray(body.items) ? body.items : [];
    const protocol = Array.isArray(body.protocol) ? body.protocol : [];
    const doctorMessage = String(body.doctor_message || body.message || "").trim();
    const patientCode = careCode();
    const parent = body.parent_order_id
      ? await findCareOrder(body.parent_order_id)
      : null;
    if (body.parent_order_id && (!parent || Number(parent.doctor_id) !== Number(doctorId))) {
      return res.status(422).json({ message: "Hospital results must come from your own care packet." }) || true;
    }
    const parentId = parent?.id || null;
    const snapshot = {
      ...(await loadMedicalSnapshot(patient)),
      patient_code: patientCode,
      diagnosis: body.diagnosis || null,
      chief_complaint: body.chief_complaint || null,
      doctor_message: doctorMessage,
      hospital_results: body.hospital_results || parent?.result_notes || null,
      extra: body.snapshot || null,
    };
    const title = body.title || `${orderType.replace("_", " ")} order`;
    const id = await insert("care_orders", {
      patient_id: patient.id,
      doctor_id: doctorId,
      hospital_id: hospitalId,
      pharmacy_id: pharmacyId,
      appointment_id: body.appointment_id || null,
      instant_consultation_id: body.instant_consultation_id || null,
      parent_order_id: parentId,
      order_type: orderType,
      status: "pending",
      urgency: body.urgency || "medium",
      title,
      patient_code: patientCode,
      clinical_notes: body.clinical_notes || body.notes || null,
      doctor_message: doctorMessage || null,
      protocol_json: protocol,
      items_json: items,
      snapshot_json: snapshot,
    });
    if (hospitalId || pharmacyId) {
      await insert("referrals", {
        patient_id: patient.id,
        doctor_id: doctorId,
        referring_doctor_id: doctorId,
        hospital_id: hospitalId,
        referred_hospital_id: hospitalId,
        pharmacy_id: pharmacyId,
        referred_pharmacy_id: pharmacyId,
        appointment_id: body.appointment_id || null,
        instant_consultation_id: body.instant_consultation_id || null,
        reason: doctorMessage || title,
        notes: body.clinical_notes || body.notes || null,
        urgency: body.urgency || "medium",
        status: "pending",
        referred_at: new Date(),
        type: hospitalId ? "hospital" : "pharmacy",
      }).catch(() => null);
    }
    const order = await shapeOrder(await one("SELECT * FROM care_orders WHERE id = ?", [id]));
    await onCareOrderCreated(await one("SELECT * FROM care_orders WHERE id = ?", [id]));
    await notifyUser(
      patient.user_id,
      "Your doctor sent a care order",
      `A ${title} was sent so you can continue inside MediConnect.`,
    );
    if (hospitalId) {
      const hospital = await one("SELECT user_id FROM hospitals WHERE id = ?", [hospitalId]).catch(() => null);
      await notifyUser(hospital?.user_id, "New clinical order", `${snapshot.patient?.name || "A patient"} has a ${title} for your facility.`);
    }
    if (pharmacyId) {
      const pharmacy = await one("SELECT user_id FROM pharmacies WHERE id = ?", [pharmacyId]).catch(() => null);
      await notifyUser(pharmacy?.user_id, "Medicine context received", `${snapshot.patient?.name || "A patient"} was sent with allergies, current medicines, and the new prescription context.`);
    }
    res.status(201).json({ message: "Care order sent with the patient clinical packet.", order, data: order });
    return true;
  }

  if (req.method === "POST" && parts[2] && parts[3]) {
    const action = parts[3];
    if (!["accept", "complete", "reject"].includes(action)) {
      return res.status(422).json({ message: "Unknown care packet action." }) || true;
    }
    if (scope !== "hospital" && scope !== "pharmacy") {
      return res.status(403).json({ message: "Only the assigned clinic/hospital or pharmacy can update this packet." }) || true;
    }
    const row = await findCareOrder(parts[2]);
    if (!row || !(await orderMatchesScope(scope, req, row))) {
      return res.status(404).json({ message: "Care order not found." }) || true;
    }
    const status = action === "accept" ? "accepted" : action === "complete" ? "completed" : "rejected";
    const resultNotes = req.body?.result_notes || req.body?.notes || row.result_notes || null;
    const patch = { status, result_notes: resultNotes };
    if (action === "complete") patch.responded_at = new Date();
    if (action === "accept" && String(row.order_type) === "admission" && await hasColumn("care_orders", "handover_status")) {
      patch.handover_status = row.handover_status || "RECEIVED";
    }
    if (req.body?.handover_status && await hasColumn("care_orders", "handover_status")) {
      patch.handover_status = String(req.body.handover_status).toUpperCase();
    }
    await update("care_orders", row.id, patch);
    let fresh = await one("SELECT * FROM care_orders WHERE id = ?", [row.id]);
    if (action === "complete" && req.files?.length) {
      fresh = await attachCareOrderResultFiles(fresh, req.files);
    }
    await onCareOrderUpdated(fresh, action, scope);
    const order = await shapeOrder(fresh);
    if (action === "complete" && row.doctor_id) {
      const doctor = await one("SELECT user_id FROM doctors WHERE id = ?", [row.doctor_id]).catch(() => null);
      const who = scope === "pharmacy" ? "The pharmacy" : "The clinic/hospital";
      await notifyUser(
        doctor?.user_id,
        `${who} replied on ${row.patient_code || "a care packet"}`,
        resultNotes || `${who} completed the packet. Open Care packets to review the findings. Uploaded results do not close the clinical episode.` ,
      );
    }
    res.json({ message: "Updated.", order, data: order });
    return true;
  }

  return false;
}

function dispatchCare(handler) {
  return async (req, res, next) => {
    try {
      const parts = req.path.split("/").filter(Boolean);
      const handled = await handler(req, res, parts);
      if (!handled) return next();
    } catch (error) {
      next(error);
    }
  };
}

export function registerCareOrderRoutes(router, { requireAuth, requireRole }) {
  const run = dispatchCare(handleCareOrders);
  for (const scope of ["doctor", "patient", "hospital", "pharmacy"]) {
    router.get(`/${scope}/care-orders`, requireAuth, requireRole(scope), run);
    router.get(`/${scope}/care-orders/:careOrderId`, requireAuth, requireRole(scope), run);
    router.post(`/${scope}/care-orders/:careOrderId/:action`, requireAuth, requireRole(scope), careUpload.any(), run);
  }
  router.post("/doctor/care-orders", requireAuth, requireRole("doctor"), run);
}
