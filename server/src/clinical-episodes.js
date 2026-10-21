import { loadOwnedId } from "./auth.js";
import { hasColumn, insert, one, presentRow, q, tableExists, update, forgetColumns } from "./db.js";

const INVESTIGATION_TYPES = new Set(["lab", "imaging", "procedure", "facility_packet", "nursing"]);
const CLINICAL_OPEN = new Set(["CREATED", "SCHEDULED", "IN_PROGRESS", "AWAITING_INVESTIGATIONS", "AWAITING_RESULTS_REVIEW", "AWAITING_REFERRAL_OUTCOME", "AWAITING_FOLLOW_UP"]);
const COVERAGE_THRESHOLD = 80;

export async function ensureClinicalEpisodeTables() {
  await q(`
    CREATE TABLE IF NOT EXISTS clinical_episodes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      patient_id BIGINT UNSIGNED NOT NULL,
      doctor_id BIGINT UNSIGNED NULL,
      appointment_id BIGINT UNSIGNED NULL,
      instant_consultation_id BIGINT UNSIGNED NULL,
      consultation_summary_id BIGINT UNSIGNED NULL,
      episode_status VARCHAR(40) NOT NULL DEFAULT 'CREATED',
      note_finalized_at TIMESTAMP NULL,
      closed_at TIMESTAMP NULL,
      closure_reason VARCHAR(80) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY clinical_episodes_patient (patient_id),
      KEY clinical_episodes_doctor (doctor_id),
      KEY clinical_episodes_appointment (appointment_id),
      KEY clinical_episodes_instant (instant_consultation_id)
    )
  `).catch(() => {});
  await q(`
    CREATE TABLE IF NOT EXISTS clinical_episode_tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      episode_id BIGINT UNSIGNED NOT NULL,
      task_type VARCHAR(40) NOT NULL,
      subject_table VARCHAR(64) NULL,
      subject_id BIGINT UNSIGNED NULL,
      assigned_role VARCHAR(20) NULL,
      assigned_to BIGINT UNSIGNED NULL,
      task_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
      payload_json JSON NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY clinical_episode_tasks_episode (episode_id),
      KEY clinical_episode_tasks_subject (subject_table, subject_id)
    )
  `).catch(() => {});
  forgetColumns("clinical_episodes");
  forgetColumns("clinical_episode_tasks");
}

export async function ensureCareOrderReviewColumns() {
  if (!(await tableExists("care_orders"))) return;
  const extra = {
    episode_id: "`episode_id` BIGINT UNSIGNED NULL",
    review_status: "`review_status` VARCHAR(40) NULL",
    reviewed_at: "`reviewed_at` TIMESTAMP NULL",
    reviewed_by: "`reviewed_by` BIGINT UNSIGNED NULL",
    doctor_interpretation: "`doctor_interpretation` TEXT NULL",
    management_decision: "`management_decision` VARCHAR(40) NULL",
    handover_status: "`handover_status` VARCHAR(40) NULL",
    result_file_url: "`result_file_url` VARCHAR(500) NULL",
    result_files_json: "`result_files_json` JSON NULL",
  };
  for (const [name, ddl] of Object.entries(extra)) {
    if (!(await hasColumn("care_orders", name))) {
      await q(`ALTER TABLE care_orders ADD COLUMN ${ddl}`).catch(() => {});
      forgetColumns("care_orders");
    }
  }
}

async function notifyUser(userId, title, message, type = "care.episode") {
  if (!userId || !(await hasColumn("notifications", "notifiable_id"))) return;
  const fields = {
    notifiable_id: userId,
    data: JSON.stringify({ title, message, body: message, type }),
  };
  if (await hasColumn("notifications", "type")) fields.type = type;
  if (await hasColumn("notifications", "notifiable_type")) fields.notifiable_type = "App\\Models\\User";
  const now = new Date();
  if (await hasColumn("notifications", "created_at")) fields.created_at = now;
  if (await hasColumn("notifications", "updated_at")) fields.updated_at = now;
  await insert("notifications", fields).catch(() => {});
}

export async function ensureEpisode(input = {}) {
  await ensureClinicalEpisodeTables();
  const patientId = Number(input.patient_id) || 0;
  if (!patientId) return null;
  const appointmentId = Number(input.appointment_id) || null;
  const instantId = Number(input.instant_consultation_id) || null;
  const doctorId = Number(input.doctor_id) || null;

  let row = null;
  if (appointmentId) {
    row = await one("SELECT * FROM clinical_episodes WHERE appointment_id = ? ORDER BY id DESC LIMIT 1", [appointmentId]).catch(() => null);
  }
  if (!row && instantId) {
    row = await one("SELECT * FROM clinical_episodes WHERE instant_consultation_id = ? ORDER BY id DESC LIMIT 1", [instantId]).catch(() => null);
  }
  if (!row && doctorId) {
    row = await one(
      "SELECT * FROM clinical_episodes WHERE patient_id = ? AND doctor_id = ? AND episode_status NOT IN ('CLOSED','CANCELLED') ORDER BY id DESC LIMIT 1",
      [patientId, doctorId],
    ).catch(() => null);
  }
  if (row) {
    const patch = {};
    if (appointmentId && !row.appointment_id) patch.appointment_id = appointmentId;
    if (instantId && !row.instant_consultation_id) patch.instant_consultation_id = instantId;
    if (doctorId && !row.doctor_id) patch.doctor_id = doctorId;
    if (input.consultation_summary_id && !row.consultation_summary_id) patch.consultation_summary_id = input.consultation_summary_id;
    if (input.note_finalized && !row.note_finalized_at) patch.note_finalized_at = new Date();
    if (Object.keys(patch).length) {
      await update("clinical_episodes", row.id, patch);
      row = await one("SELECT * FROM clinical_episodes WHERE id = ?", [row.id]);
    }
    return row;
  }

  const id = await insert("clinical_episodes", {
    patient_id: patientId,
    doctor_id: doctorId,
    appointment_id: appointmentId,
    instant_consultation_id: instantId,
    consultation_summary_id: input.consultation_summary_id || null,
    episode_status: input.note_finalized ? "CLINICALLY_COMPLETED" : "CREATED",
    note_finalized_at: input.note_finalized ? new Date() : null,
  });
  return one("SELECT * FROM clinical_episodes WHERE id = ?", [id]);
}

async function upsertTask(episodeId, taskType, subjectTable, subjectId, patch = {}) {
  if (!episodeId) return null;
  let task = await one(
    "SELECT * FROM clinical_episode_tasks WHERE episode_id = ? AND task_type = ? AND subject_table <=> ? AND subject_id <=> ? LIMIT 1",
    [episodeId, taskType, subjectTable || null, subjectId || null],
  ).catch(() => null);
  if (!task) {
    const id = await insert("clinical_episode_tasks", {
      episode_id: episodeId,
      task_type: taskType,
      subject_table: subjectTable || null,
      subject_id: subjectId || null,
      assigned_role: patch.assigned_role || null,
      assigned_to: patch.assigned_to || null,
      task_status: patch.task_status || "PENDING",
      payload_json: patch.payload_json ? JSON.stringify(patch.payload_json) : null,
      completed_at: patch.task_status && patch.task_status !== "PENDING" ? new Date() : null,
    });
    return one("SELECT * FROM clinical_episode_tasks WHERE id = ?", [id]);
  }
  const next = { ...patch };
  if (next.payload_json && typeof next.payload_json === "object") next.payload_json = JSON.stringify(next.payload_json);
  if (next.task_status && next.task_status !== "PENDING" && !task.completed_at) next.completed_at = new Date();
  if (next.task_status === "PENDING") next.completed_at = null;
  await update("clinical_episode_tasks", task.id, next);
  return one("SELECT * FROM clinical_episode_tasks WHERE id = ?", [task.id]);
}

export async function recalculateEpisodeStatus(episodeId) {
  if (!episodeId) return null;
  const episode = await one("SELECT * FROM clinical_episodes WHERE id = ?", [episodeId]).catch(() => null);
  if (!episode) return null;
  const tasks = await q("SELECT * FROM clinical_episode_tasks WHERE episode_id = ?", [episodeId]).catch(() => []);
  const open = (type) => tasks.filter((t) => {
    const st = String(t.task_status || "");
    return t.task_type === type && (st === "PENDING" || st === "PARTIALLY_FULFILLED" || st === "RECEIVED" || st === "IN_TRANSIT");
  });
  let status = episode.note_finalized_at ? "CLINICALLY_COMPLETED" : "IN_PROGRESS";
  if (open("investigation").length) status = "AWAITING_INVESTIGATIONS";
  if (open("result_review").length) status = "AWAITING_RESULTS_REVIEW";
  else if (open("referral").length || open("inpatient").length) status = "AWAITING_REFERRAL_OUTCOME";
  else if (open("follow_up").length || open("pharmacy_fulfillment").length) status = "AWAITING_FOLLOW_UP";
  else if (episode.note_finalized_at && !open("result_review").length && !open("investigation").length) {
    status = "CLINICALLY_COMPLETED";
  }
  if (episode.closed_at) status = "CLOSED";
  if (status !== episode.episode_status) {
    await update("clinical_episodes", episodeId, { episode_status: status });
  }
  return one("SELECT * FROM clinical_episodes WHERE id = ?", [episodeId]);
}

export async function onCareOrderCreated(order) {
  if (!order) return;
  await ensureCareOrderReviewColumns();
  const episode = await ensureEpisode({
    patient_id: order.patient_id,
    doctor_id: order.doctor_id,
    appointment_id: order.appointment_id,
    instant_consultation_id: order.instant_consultation_id,
    note_finalized: true,
  });
  if (!episode) return;
  if (await hasColumn("care_orders", "episode_id") && !order.episode_id) {
    await update("care_orders", order.id, { episode_id: episode.id });
  }
  const type = String(order.order_type || "");
  if (INVESTIGATION_TYPES.has(type)) {
    await upsertTask(episode.id, "investigation", "care_orders", order.id, {
      assigned_role: "hospital",
      assigned_to: order.hospital_id || null,
      task_status: "PENDING",
    });
  } else if (type === "pharmacy_packet") {
    await upsertTask(episode.id, "pharmacy_fulfillment", "care_orders", order.id, {
      assigned_role: "pharmacy",
      assigned_to: order.pharmacy_id || null,
      task_status: "PENDING",
    });
  } else if (type === "follow_up") {
    await upsertTask(episode.id, "follow_up", "care_orders", order.id, { task_status: "PENDING" });
  } else if (type === "admission") {
    if (await hasColumn("care_orders", "handover_status") && !order.handover_status) {
      await update("care_orders", order.id, { handover_status: "RECEIVED" }).catch(() => {});
    }
    await upsertTask(episode.id, "inpatient", "care_orders", order.id, {
      assigned_role: "hospital",
      assigned_to: order.hospital_id || null,
      task_status: "PENDING",
      payload_json: { handover_status: order.handover_status || "RECEIVED" },
    });
  }
  await recalculateEpisodeStatus(episode.id);
}

export async function onCareOrderUpdated(order, action, scope) {
  if (!order) return;
  await ensureCareOrderReviewColumns();
  const episode = await ensureEpisode({
    patient_id: order.patient_id,
    doctor_id: order.doctor_id,
    appointment_id: order.appointment_id,
    instant_consultation_id: order.instant_consultation_id,
    note_finalized: true,
  });
  if (!episode) return;
  const type = String(order.order_type || "");
  if (action === "complete" && INVESTIGATION_TYPES.has(type)) {
    const alreadyReviewed = String(order.review_status || "") === "reviewed";
    if (!alreadyReviewed) {
      await update("care_orders", order.id, { review_status: "pending_review" }).catch(() => {});
    }
    await upsertTask(episode.id, "investigation", "care_orders", order.id, { task_status: "COMPLETED" });
    await upsertTask(episode.id, "result_review", "care_orders", order.id, {
      assigned_role: "doctor",
      assigned_to: order.doctor_id || null,
      task_status: alreadyReviewed ? "COMPLETED" : "PENDING",
    });
    if (order.doctor_id) {
      const doctor = await one("SELECT user_id FROM doctors WHERE id = ?", [order.doctor_id]).catch(() => null);
      await notifyUser(
        doctor?.user_id,
        "Results ready for clinical review",
        "A facility uploaded investigation results. Review them before closing this episode — an upload does not complete the consult.",
        "care.review",
      );
    }
  } else if (action === "complete" && type === "pharmacy_packet") {
    await upsertTask(episode.id, "pharmacy_fulfillment", "care_orders", order.id, { task_status: "SERVED" });
  } else if (action === "complete" && type === "admission") {
    const handover = String(order.handover_status || "ADMITTED");
    await upsertTask(episode.id, "inpatient", "care_orders", order.id, {
      task_status: handover === "DISCHARGED" || handover === "TRANSFERRED" ? "COMPLETED" : "PENDING",
      payload_json: { handover_status: handover },
    });
  } else if (action === "reject") {
    await upsertTask(episode.id, INVESTIGATION_TYPES.has(type) ? "investigation" : "pharmacy_fulfillment", "care_orders", order.id, {
      task_status: "CANCELLED",
    });
  }
  await recalculateEpisodeStatus(episode.id);
}

export async function onConsultationSummarySaved(row) {
  if (!row || !(row.patient_id || row.user_id)) return null;
  const episode = await ensureEpisode({
    patient_id: row.patient_id || row.user_id,
    doctor_id: row.doctor_id || null,
    appointment_id: row.appointment_id || null,
    instant_consultation_id: row.instant_consultation_id || null,
    consultation_summary_id: row.id,
    note_finalized: true,
  });
  if (!episode) return null;
  await upsertTask(episode.id, "consult_note", "consultation_summaries", row.id, { task_status: "COMPLETED" });
  return recalculateEpisodeStatus(episode.id);
}

export async function onReferralCreated(row) {
  if (!row) return null;
  const episode = await ensureEpisode({
    patient_id: row.patient_id,
    doctor_id: row.doctor_id || row.referring_doctor_id,
    appointment_id: row.appointment_id,
    instant_consultation_id: row.instant_consultation_id,
    note_finalized: true,
  });
  if (!episode) return null;
  await upsertTask(episode.id, "referral", "referrals", row.id, {
    assigned_role: row.hospital_id ? "hospital" : row.pharmacy_id ? "pharmacy" : "doctor",
    assigned_to: row.hospital_id || row.pharmacy_id || row.referred_to_doctor_id || null,
    task_status: "PENDING",
  });
  return recalculateEpisodeStatus(episode.id);
}

export async function onPharmacyRequestFulfilled(row, fulfillmentStatus = "SERVED") {
  if (!row) return null;
  const prescription = row.prescription_id
    ? await one("SELECT * FROM prescriptions WHERE id = ?", [row.prescription_id]).catch(() => null)
    : null;
  const patientId = prescription?.patient_id || row.patient_id;
  if (!patientId) return null;
  const episode = await ensureEpisode({
    patient_id: patientId,
    doctor_id: prescription?.doctor_id || row.doctor_id || null,
    appointment_id: prescription?.appointment_id || null,
    instant_consultation_id: prescription?.instant_consultation_id || null,
    note_finalized: true,
  });
  if (!episode) return null;
  const status = String(fulfillmentStatus || "SERVED").toUpperCase() === "PARTIALLY_FULFILLED" ? "PARTIALLY_FULFILLED" : "SERVED";
  await upsertTask(episode.id, "pharmacy_fulfillment", "pharmacy_prescription_requests", row.id, {
    assigned_role: "pharmacy",
    assigned_to: row.pharmacy_id || null,
    task_status: status,
  });
  if (prescription?.id && (await tableExists("prescriptions")) && (await hasColumn("prescriptions", "status"))) {
    await update("prescriptions", prescription.id, {
      status: status === "PARTIALLY_FULFILLED" ? "partially_dispensed" : "dispensed",
    }).catch(() => null);
  }
  return recalculateEpisodeStatus(episode.id);
}

export async function reviewCareOrder(order, doctorId, body = {}) {
  await ensureCareOrderReviewColumns();
  const interpretation = String(body.interpretation || body.doctor_interpretation || "").trim();
  const decision = String(body.management_decision || body.decision || "ADVICE_ONLY").trim().toUpperCase();
  await update("care_orders", order.id, {
    review_status: "reviewed",
    reviewed_at: new Date(),
    reviewed_by: doctorId,
    doctor_interpretation: interpretation || order.doctor_interpretation,
    management_decision: decision,
  });
  const episode = await ensureEpisode({
    patient_id: order.patient_id,
    doctor_id: order.doctor_id || doctorId,
    appointment_id: order.appointment_id,
    instant_consultation_id: order.instant_consultation_id,
    note_finalized: true,
  });
  if (episode) {
    await upsertTask(episode.id, "result_review", "care_orders", order.id, { task_status: "COMPLETED" });
    await recalculateEpisodeStatus(episode.id);
  }
  return one("SELECT * FROM care_orders WHERE id = ?", [order.id]);
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

async function shapeEpisode(row) {
  if (!row) return null;
  const presented = await presentRow("clinical_episodes", row);
  const tasks = await q("SELECT * FROM clinical_episode_tasks WHERE episode_id = ? ORDER BY id ASC", [row.id]).catch(() => []);
  const pending = tasks.filter((t) => t.task_status === "PENDING");
  return {
    ...presented,
    episode_id: presented.id,
    tasks: tasks.map((t) => ({
      ...t,
      payload: parseJson(t.payload_json, null),
    })),
    pending_count: pending.length,
    next_action: pending[0]
      ? {
          task_type: pending[0].task_type,
          assigned_role: pending[0].assigned_role,
          subject_id: pending[0].subject_id,
        }
      : null,
    clinically_open: CLINICAL_OPEN.has(presented.episode_status),
  };
}

async function timelineFor(episode) {
  const events = [];
  events.push({ at: episode.created_at, kind: "episode_created", label: "Clinical episode opened" });
  if (episode.note_finalized_at) {
    events.push({ at: episode.note_finalized_at, kind: "note_finalized", label: "Consultation note finalized" });
  }
  const tasks = await q("SELECT * FROM clinical_episode_tasks WHERE episode_id = ? ORDER BY id ASC", [episode.id]).catch(() => []);
  for (const task of tasks) {
    events.push({
      at: task.created_at,
      kind: task.task_type,
      label: `${task.task_type.replace(/_/g, " ")} ${task.task_status.toLowerCase()}`,
      task_status: task.task_status,
      subject_id: task.subject_id,
    });
    if (task.completed_at) {
      events.push({
        at: task.completed_at,
        kind: `${task.task_type}_done`,
        label: `${task.task_type.replace(/_/g, " ")} ${task.task_status.toLowerCase()}`,
        task_status: task.task_status,
        subject_id: task.subject_id,
      });
    }
  }
  events.sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  return events;
}

function foldName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadPrescriptionItems(prescriptionId) {
  const tables = ["prescription_items", "prescription_medicines", "prescription_lines"];
  for (const table of tables) {
    if (!(await tableExists(table))) continue;
    const col = (await hasColumn(table, "prescription_id")) ? "prescription_id" : null;
    if (!col) continue;
    const rows = await q(`SELECT * FROM \`${table}\` WHERE prescription_id = ?`, [prescriptionId]).catch(() => []);
    if (rows.length) return rows;
  }
  const rx = await one("SELECT * FROM prescriptions WHERE id = ?", [prescriptionId]).catch(() => null);
  const embedded = parseJson(rx?.items_json || rx?.items, []);
  return Array.isArray(embedded) ? embedded : [];
}

function itemKey(item) {
  return foldName(item.medicine_name || item.name || item.generic_name || item.drug_name || item.medication_name);
}

function stockQty(medicine) {
  const n = Number(medicine.quantity ?? medicine.stock ?? medicine.stock_quantity ?? medicine.units_in_stock ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function matchPharmaciesForPrescription(prescriptionId, doctorId) {
  const rx = await one("SELECT * FROM prescriptions WHERE id = ?", [prescriptionId]).catch(() => null);
  if (!rx) return { error: 404, message: "Prescription not found." };
  if (doctorId && Number(rx.doctor_id || rx.prescriber_id) && Number(rx.doctor_id || rx.prescriber_id) !== Number(doctorId)) {
    return { error: 403, message: "You do not have access to this prescription." };
  }
  const items = await loadPrescriptionItems(prescriptionId);
  const distinct = [];
  const seen = new Set();
  for (const item of items) {
    const key = itemKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distinct.push({ key, name: item.medicine_name || item.name || key });
  }
  const total = distinct.length;
  const pharmacies = await q(
    "SELECT id, name, slug, city, province, address, phone, email, status FROM pharmacies ORDER BY id DESC LIMIT 400",
  ).catch(() => []);
  const offers = [];
  for (const pharmacy of pharmacies) {
    const inactive = ["rejected", "suspended", "inactive"].includes(String(pharmacy.status || "").toLowerCase());
    if (inactive) continue;
    const stock = await q("SELECT * FROM pharmacy_medicines WHERE pharmacy_id = ?", [pharmacy.id]).catch(() => []);
    const availableKeys = new Set();
    const missing = [];
    for (const need of distinct) {
      const hit = stock.find((row) => {
        if (stockQty(row) <= 0) return false;
        if (row.is_active === 0 || row.status === "inactive") return false;
        const names = [row.name, row.generic_name, row.brand_name].map(foldName).filter(Boolean);
        return names.some((n) => n === need.key || n.includes(need.key) || need.key.includes(n));
      });
      if (hit) availableKeys.add(need.key);
      else missing.push(need.name);
    }
    const available = availableKeys.size;
    const coverage = total === 0 ? 0 : Math.round((available / total) * 1000) / 10;
    offers.push({
      id: pharmacy.id,
      name: pharmacy.name,
      slug: pharmacy.slug,
      city: pharmacy.city,
      province: pharmacy.province,
      address: pharmacy.address,
      phone: pharmacy.phone,
      email: pharmacy.email,
      match_count: available,
      coverage_percentage: coverage,
      eligible: total === 0 ? false : coverage >= COVERAGE_THRESHOLD,
      missing_items: missing,
      confirmed: true,
    });
  }
  offers.sort((a, b) => b.coverage_percentage - a.coverage_percentage || a.name.localeCompare(b.name));
  const eligible = offers.filter((o) => o.eligible);
  const alternatives = offers.filter((o) => !o.eligible);
  return {
    status: true,
    prescription_id: Number(prescriptionId),
    total_medicines: total,
    coverage_threshold: COVERAGE_THRESHOLD,
    data: eligible.length ? eligible : [],
    alternatives,
    message: eligible.length
      ? null
      : total === 0
        ? "This prescription has no distinct medicines to match."
        : "No pharmacy has confirmed stock for at least 80% of distinct items. Alternatives are listed with missing medicines. Do not assume unconfirmed inventory is available.",
  };
}

export async function syncCareOrderToEpisode(order) {
  if (!order) return;
  await onCareOrderCreated(order);
  if (order.status === "completed") await onCareOrderUpdated(order, "complete", "hospital");
  if (String(order.review_status || "") === "reviewed") {
    const episode = await ensureEpisode({
      patient_id: order.patient_id,
      doctor_id: order.doctor_id,
      appointment_id: order.appointment_id,
      instant_consultation_id: order.instant_consultation_id,
      note_finalized: true,
    });
    if (episode) {
      await upsertTask(episode.id, "result_review", "care_orders", order.id, { task_status: "COMPLETED" });
      await recalculateEpisodeStatus(episode.id);
    }
  }
}

async function backfillFromCareOrders(doctorId, patientIds) {
  if (doctorId) {
    const rows = await q("SELECT * FROM care_orders WHERE doctor_id = ? ORDER BY id DESC LIMIT 80", [doctorId]).catch(() => []);
    for (const row of rows) await syncCareOrderToEpisode(row);
  } else if (patientIds?.length) {
    const rows = await q(
      `SELECT * FROM care_orders WHERE patient_id IN (${patientIds.map(() => "?").join(",")}) ORDER BY id DESC LIMIT 80`,
      patientIds,
    ).catch(() => []);
    for (const row of rows) await syncCareOrderToEpisode(row);
  }
}

async function listEpisodes(whereSql, params) {
  const rows = await q(`SELECT * FROM clinical_episodes ${whereSql} ORDER BY id DESC LIMIT 80`, params).catch(() => []);
  const out = [];
  for (const row of rows) out.push(await shapeEpisode(row));
  return out;
}

export function registerClinicalEpisodeRoutes(router, { requireAuth, requireRole }) {
  router.get("/doctor/prescriptions/:prescriptionId/matching-pharmacies", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const result = await matchPharmaciesForPrescription(req.params.prescriptionId, doctorId);
      if (result.error) return res.status(result.error).json({ message: result.message });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/episodes", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      await ensureClinicalEpisodeTables();
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      if (!doctorId) return res.status(403).json({ message: "A doctor profile is required." });
      await backfillFromCareOrders(doctorId, null);
      let sql = "WHERE doctor_id = ?";
      const params = [doctorId];
      if (req.query.status) {
        sql += " AND episode_status = ?";
        params.push(req.query.status);
      }
      const episodes = await listEpisodes(sql, params);
      res.json({ episodes, data: episodes, total: episodes.length });
    } catch (error) {
      next(error);
    }
  });

  router.get("/patient/episodes", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await ensureClinicalEpisodeTables();
      const patientId = await loadOwnedId(req.user.id, "patients");
      const patient = await one("SELECT * FROM patients WHERE id = ? OR user_id = ? LIMIT 1", [patientId, req.user.id]).catch(() => null);
      const ids = [...new Set([patient?.id, patient?.user_id, req.user.id, patientId].filter(Boolean).map(Number))];
      await backfillFromCareOrders(null, ids);
      const episodes = await listEpisodes(
        `WHERE patient_id IN (${ids.map(() => "?").join(",") || "?"})`,
        ids.length ? ids : [0],
      );
      res.json({ episodes, data: episodes, total: episodes.length });
    } catch (error) {
      next(error);
    }
  });

  const showEpisode = async (req, res, next) => {
    try {
      await ensureClinicalEpisodeTables();
      const id = Number(req.params.episodeId);
      const row = await one("SELECT * FROM clinical_episodes WHERE id = ?", [id]).catch(() => null);
      if (!row) return res.status(404).json({ message: "Episode not found." });
      const scope = req.path.startsWith("/patient") ? "patient" : "doctor";
      if (scope === "doctor") {
        const doctorId = await loadOwnedId(req.user.id, "doctors");
        if (Number(row.doctor_id) !== Number(doctorId)) return res.status(404).json({ message: "Episode not found." });
      } else {
        const patientId = await loadOwnedId(req.user.id, "patients");
        const patient = await one("SELECT * FROM patients WHERE id = ? OR user_id = ? LIMIT 1", [patientId, req.user.id]).catch(() => null);
        const ids = new Set([patient?.id, patient?.user_id, req.user.id, patientId].filter(Boolean).map(Number));
        if (!ids.has(Number(row.patient_id))) return res.status(404).json({ message: "Episode not found." });
      }
      const episode = await shapeEpisode(row);
      if (req.path.endsWith("/tasks")) return res.json({ tasks: episode.tasks, data: episode.tasks });
      if (req.path.endsWith("/timeline")) {
        const timeline = await timelineFor(row);
        return res.json({ timeline, data: timeline, episode_status: episode.episode_status });
      }
      res.json({ episode, data: episode, ...episode });
    } catch (error) {
      next(error);
    }
  };

  for (const scope of ["doctor", "patient"]) {
    router.get(`/${scope}/episodes/:episodeId`, requireAuth, requireRole(scope), showEpisode);
    router.get(`/${scope}/episodes/:episodeId/tasks`, requireAuth, requireRole(scope), showEpisode);
    router.get(`/${scope}/episodes/:episodeId/timeline`, requireAuth, requireRole(scope), showEpisode);
  }

  router.post("/doctor/care-orders/:careOrderId/review", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const raw = String(req.params.careOrderId || "");
      const order = /^\d+$/.test(raw)
        ? await one("SELECT * FROM care_orders WHERE id = ?", [Number(raw)]).catch(() => null)
        : await one("SELECT * FROM care_orders WHERE patient_code = ? LIMIT 1", [raw.toUpperCase()]).catch(() => null);
      if (!order || Number(order.doctor_id) !== Number(doctorId)) {
        return res.status(404).json({ message: "Care order not found." });
      }
      if (String(order.status) !== "completed") {
        return res.status(422).json({ message: "Results must be uploaded before you can review them." });
      }
      const updated = await reviewCareOrder(order, doctorId, req.body || {});
      const presented = await presentRow("care_orders", updated);
      res.json({
        message: "Review recorded. The episode stays open only if another clinical task is still required.",
        order: presented,
        data: presented,
      });
    } catch (error) {
      next(error);
    }
  });
}
