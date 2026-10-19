import crypto from "crypto";
import { forgetColumns, hasColumn, insert, one, pool, presentRow, q, tableExists, update } from "./db.js";
import { loadOwnedId } from "./auth.js";
import { callToken } from "./call-token.js";

export const FITNESS_CERT_FEE = 5000;
export const FITNESS_CERT_CURRENCY = "RWF";
export const FITNESS_CERT_VALIDITY_MONTHS = 6;
export const FITNESS_PAYABLE_TYPE = "fitness_certificate";
export const FITNESS_PAYABLE_MORPH = "App\\Models\\FitnessCertificate";

const RED_FLAG_FIELDS = {
  chest_pain: "red_flag_chest_pain",
  shortness_breath: "red_flag_shortness_of_breath",
  fainting: "red_flag_syncope",
  recent_surgery: "red_flag_recent_surgery",
  visual_disturbances: "red_flag_neurological",
  headache_dizziness: "red_flag_severe_headache",
};

const JOB_FLAGS = {
  "Heavy physical labor": "job_heavy_labor",
  "Driving/operating machinery": "job_driving_machinery",
  "Armed forces/security": "job_armed_forces",
  "Mining/construction": "job_mining_construction",
  "Work requiring chest X-ray": "job_requires_xray",
  "None of the above": "job_none_of_above",
};

const CERT_COLS = {
  certificate_number: "`certificate_number` VARCHAR(64) NULL",
  status: "`status` VARCHAR(40) NOT NULL DEFAULT 'draft'",
  current_step: "`current_step` INT NOT NULL DEFAULT 0",
  purpose: "`purpose` VARCHAR(80) NULL",
  purpose_other: "`purpose_other` VARCHAR(255) NULL",
  job_type: "`job_type` VARCHAR(120) NULL",
  patient_id: "`patient_id` BIGINT UNSIGNED NULL",
  doctor_id: "`doctor_id` BIGINT UNSIGNED NULL",
  appointment_id: "`appointment_id` BIGINT UNSIGNED NULL",
  patient_full_name: "`patient_full_name` VARCHAR(255) NULL",
  patient_national_id: "`patient_national_id` VARCHAR(80) NULL",
  patient_contact: "`patient_contact` VARCHAR(80) NULL",
  consent_given: "`consent_given` TINYINT(1) NOT NULL DEFAULT 0",
  answers_json: "`answers_json` JSON NULL",
  temperature: "`temperature` VARCHAR(40) NULL",
  blood_pressure: "`blood_pressure` VARCHAR(40) NULL",
  pulse: "`pulse` VARCHAR(40) NULL",
  oxygen_saturation: "`oxygen_saturation` VARCHAR(40) NULL",
  vitals_available: "`vitals_available` TINYINT(1) NOT NULL DEFAULT 0",
  patient_notes: "`patient_notes` TEXT NULL",
  doctor_notes: "`doctor_notes` TEXT NULL",
  decision: "`decision` VARCHAR(40) NULL",
  valid_until: "`valid_until` DATE NULL",
  has_red_flags: "`has_red_flags` TINYINT(1) NOT NULL DEFAULT 0",
  requires_inperson: "`requires_inperson` TINYINT(1) NOT NULL DEFAULT 0",
  identity_verified_via_video: "`identity_verified_via_video` TINYINT(1) NOT NULL DEFAULT 0",
  confirmation_room: "`confirmation_room` VARCHAR(120) NULL",
  confirmation_requested_at: "`confirmation_requested_at` DATETIME NULL",
  is_signed: "`is_signed` TINYINT(1) NOT NULL DEFAULT 0",
  signed_at: "`signed_at` DATETIME NULL",
  reviewed_at: "`reviewed_at` DATETIME NULL",
  rejection_reason: "`rejection_reason` TEXT NULL",
  revoke_reason: "`revoke_reason` TEXT NULL",
  qr_code: "`qr_code` VARCHAR(255) NULL",
  pdf_url: "`pdf_url` VARCHAR(255) NULL",
  download_token: "`download_token` VARCHAR(64) NULL",
  initial_fee_paid: "`initial_fee_paid` DECIMAL(12,2) NOT NULL DEFAULT 0",
  actual_fee_paid: "`actual_fee_paid` DECIMAL(12,2) NOT NULL DEFAULT 0",
  job_heavy_labor: "`job_heavy_labor` TINYINT(1) NOT NULL DEFAULT 0",
  job_driving_machinery: "`job_driving_machinery` TINYINT(1) NOT NULL DEFAULT 0",
  job_armed_forces: "`job_armed_forces` TINYINT(1) NOT NULL DEFAULT 0",
  job_mining_construction: "`job_mining_construction` TINYINT(1) NOT NULL DEFAULT 0",
  job_requires_xray: "`job_requires_xray` TINYINT(1) NOT NULL DEFAULT 0",
  job_none_of_above: "`job_none_of_above` TINYINT(1) NOT NULL DEFAULT 1",
  red_flag_chest_pain: "`red_flag_chest_pain` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_shortness_of_breath: "`red_flag_shortness_of_breath` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_syncope: "`red_flag_syncope` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_severe_headache: "`red_flag_severe_headache` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_neurological: "`red_flag_neurological` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_weight_loss: "`red_flag_weight_loss` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_cardiac_history: "`red_flag_cardiac_history` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_recent_surgery: "`red_flag_recent_surgery` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_seizure: "`red_flag_seizure` TINYINT(1) NOT NULL DEFAULT 0",
  red_flag_pregnancy_complications: "`red_flag_pregnancy_complications` TINYINT(1) NOT NULL DEFAULT 0",
};

let ensured = false;

export async function ensureFitnessTables() {
  if (ensured) return;
  await q(`
    CREATE TABLE IF NOT EXISTS fitness_certificates (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      certificate_number VARCHAR(64) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      current_step INT NOT NULL DEFAULT 0,
      patient_id BIGINT UNSIGNED NULL,
      doctor_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY fitness_patient (patient_id),
      KEY fitness_doctor (doctor_id),
      KEY fitness_status (status),
      KEY fitness_number (certificate_number)
    )
  `).catch(() => {});
  forgetColumns("fitness_certificates");
  for (const [name, ddl] of Object.entries(CERT_COLS)) {
    if (!(await hasColumn("fitness_certificates", name))) {
      await q(`ALTER TABLE fitness_certificates ADD COLUMN ${ddl}`).catch(() => {});
      forgetColumns("fitness_certificates");
    }
  }
  await q(`
    CREATE TABLE IF NOT EXISTS certification_doctors (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      doctor_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'active',
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY cert_doc_doctor (doctor_id)
    )
  `).catch(() => {});
  forgetColumns("certification_doctors");
  await ensureFitnessPaymentType().catch(() => null);
  ensured = true;
}

async function ensureEnumValue(table, column, value) {
  if (!(await tableExists(table)) || !(await hasColumn(table, column))) return false;
  const meta = await one(
    `SELECT COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  ).catch(() => null);
  if (!meta) return false;
  const type = String(meta.column_type || "");
  if (!/^enum\(/i.test(type)) return true;
  if (type.toLowerCase().includes(`'${String(value).toLowerCase()}'`)) return true;
  const widened = type.replace(/\)\s*$/, `,'${String(value).replace(/'/g, "''")}')`);
  let sql = `ALTER TABLE \`${table}\` MODIFY \`${column}\` ${widened}`;
  sql += String(meta.is_nullable).toUpperCase() === "NO" ? " NOT NULL" : " NULL";
  if (meta.column_default != null && String(meta.column_default).toUpperCase() !== "NULL") {
    sql += ` DEFAULT '${String(meta.column_default).replace(/'/g, "''")}'`;
  }
  await pool.query(sql);
  return true;
}

async function ensureFitnessPaymentType() {
  if (!(await tableExists("payments"))) return;
  for (const column of ["payable_type", "type", "payment_type"]) {
    if (!(await hasColumn("payments", column))) continue;
    await ensureEnumValue("payments", column, FITNESS_PAYABLE_TYPE).catch(() => null);
    await ensureEnumValue("payments", column, FITNESS_PAYABLE_MORPH).catch(() => null);
  }
  if (!(await hasColumn("payments", "payable_type"))) return;
  await q(
    `UPDATE payments p
     INNER JOIN fitness_certificates c ON c.id = p.payable_id
     SET p.payable_type = ?
     WHERE p.payable_type IS NULL
        OR TRIM(p.payable_type) = ''
        OR LOWER(p.payable_type) IN ('other', 'others')`,
    [FITNESS_PAYABLE_TYPE],
  ).catch(() => null);
  if (await hasColumn("payments", "type")) {
    await q(
      `UPDATE payments p
       INNER JOIN fitness_certificates c ON c.id = p.payable_id
       SET p.type = ?
       WHERE p.type IS NULL OR TRIM(p.type) = '' OR LOWER(p.type) IN ('other', 'others')`,
      [FITNESS_PAYABLE_TYPE],
    ).catch(() => null);
  }
  await q(
    `UPDATE payments
     SET payable_type = ?
     WHERE description LIKE 'Fitness certificate%'
       AND (payable_type IS NULL OR TRIM(payable_type) = '' OR LOWER(payable_type) IN ('other', 'others'))`,
    [FITNESS_PAYABLE_TYPE],
  ).catch(() => null);
}

function bodyOf(req) {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function bool(value) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "Yes";
}

function certNumber() {
  const year = new Date().getFullYear();
  const stamp = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `MC-FC-${year}-${stamp}`;
}

function fileToken() {
  return crypto.randomBytes(18).toString("hex");
}

function pdfEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildCertificatePdf(cert) {
  const lines = [
    "MediConnect Fitness Certificate",
    `Certificate: ${cert.certificate_number || ""}`,
    `Patient: ${cert.patient_full_name || ""}`,
    `Purpose: ${cert.purpose || ""}`,
    `Decision: ${cert.decision || ""}`,
    `Issued: ${cert.signed_at || cert.updated_at || ""}`,
    `Valid until: ${cert.valid_until || ""}`,
    `Doctor notes: ${String(cert.doctor_notes || "").replace(/<[^>]+>/g, " ").slice(0, 400)}`,
    `Verify: ${cert.qr_code || ""}`,
  ];
  const ops = ["BT", "/F1 16 Tf", "50 780 Td", `(${pdfEscape(lines[0])}) Tj`, "/F1 11 Tf"];
  for (const line of lines.slice(1)) {
    ops.push("0 -20 Td", `(${pdfEscape(line)}) Tj`);
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "utf8");
}

async function notifyUser(userId, title, message) {
  if (!userId || !(await hasColumn("notifications", "notifiable_id"))) return;
  const fields = {
    notifiable_id: userId,
    data: JSON.stringify({ title, message, body: message, type: "fitness.certificate" }),
  };
  if (await hasColumn("notifications", "type")) fields.type = "fitness.certificate";
  if (await hasColumn("notifications", "notifiable_type")) fields.notifiable_type = "App\\Models\\User";
  await insert("notifications", fields).catch(() => {});
}

async function loadPatientForUser(userId) {
  return one("SELECT * FROM patients WHERE user_id = ? OR id = ? LIMIT 1", [userId, userId]).catch(() => null);
}

async function loadDoctorCard(doctorId) {
  if (!doctorId) return null;
  const row = await one(
    `SELECT d.id, d.user_id, u.name, u.avatar
     FROM doctors d LEFT JOIN users u ON u.id = d.user_id
     WHERE d.id = ? LIMIT 1`,
    [doctorId],
  ).catch(() => null);
  if (!row) return null;
  const pending = await one(
    "SELECT COUNT(*) AS total FROM fitness_certificates WHERE doctor_id = ? AND status IN ('pending','in_review')",
    [doctorId],
  ).catch(() => ({ total: 0 }));
  return {
    id: row.id,
    name: row.name || "Doctor",
    avatar: row.avatar || undefined,
    pending_load: Number(pending?.total || 0),
    user_id: row.user_id,
  };
}

async function activeCertDoctor() {
  if (!(await tableExists("certification_doctors"))) return null;
  return one(
    `SELECT * FROM certification_doctors
     WHERE (status = 'active' OR status IS NULL) AND (is_available = 1 OR is_available IS NULL)
     ORDER BY id DESC LIMIT 1`,
  ).catch(() => null);
}

async function availableDoctors() {
  const assigned = await q(
    `SELECT d.id, u.name, u.avatar
     FROM certification_doctors cd
     JOIN doctors d ON d.id = cd.doctor_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE (cd.status = 'active' OR cd.status IS NULL) AND (cd.is_available = 1 OR cd.is_available IS NULL)`,
  ).catch(() => []);
  const source = assigned.length
    ? assigned
    : await q(
      `SELECT d.id, u.name, u.avatar FROM doctors d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.status IN ('active','approved') OR d.status IS NULL
       ORDER BY d.id DESC LIMIT 12`,
    ).catch(() => []);
  const doctors = [];
  for (const row of source) {
    const pending = await one(
      "SELECT COUNT(*) AS total FROM fitness_certificates WHERE doctor_id = ? AND status IN ('pending','in_review')",
      [row.id],
    ).catch(() => ({ total: 0 }));
    doctors.push({
      id: row.id,
      name: row.name || "Doctor",
      avatar: row.avatar || undefined,
      pending_load: Number(pending?.total || 0),
    });
  }
  return doctors;
}

function answersFromSteps(steps) {
  const out = [];
  for (const [step, payload] of Object.entries(steps || {})) {
    const answers = payload?.answers || {};
    for (const [key, value] of Object.entries(answers)) {
      out.push({
        step: Number(step),
        question_key: key,
        field: key,
        answer: String(value ?? ""),
        value: String(value ?? ""),
        boolean_answer: String(value).toLowerCase() === "yes",
        triggered_red_flag: Boolean(RED_FLAG_FIELDS[key]) && String(value).toLowerCase() === "yes",
      });
    }
  }
  return out;
}

function applyJobFlags(jobType) {
  const flags = {
    job_heavy_labor: 0,
    job_driving_machinery: 0,
    job_armed_forces: 0,
    job_mining_construction: 0,
    job_requires_xray: 0,
    job_none_of_above: 0,
  };
  const key = JOB_FLAGS[jobType] || "job_none_of_above";
  flags[key] = 1;
  return flags;
}

function applyRedFlags(answers) {
  const flags = {
    red_flag_chest_pain: 0,
    red_flag_shortness_of_breath: 0,
    red_flag_syncope: 0,
    red_flag_severe_headache: 0,
    red_flag_neurological: 0,
    red_flag_weight_loss: 0,
    red_flag_cardiac_history: 0,
    red_flag_recent_surgery: 0,
    red_flag_seizure: 0,
    red_flag_pregnancy_complications: 0,
  };
  for (const [field, column] of Object.entries(RED_FLAG_FIELDS)) {
    if (String(answers[field] || "").toLowerCase() === "yes") flags[column] = 1;
  }
  return flags;
}

function flagList(row) {
  return Object.values(RED_FLAG_FIELDS).filter((column) => bool(row[column]));
}

async function shapeCert(row) {
  if (!row) return null;
  const presented = await presentRow("fitness_certificates", row);
  const steps = parseJson(presented.answers_json, {});
  const doctor = await loadDoctorCard(presented.doctor_id);
  const redFlags = flagList(presented);
  const hasRed = bool(presented.has_red_flags) || redFlags.length > 0;
  const requiresInperson = bool(presented.requires_inperson) || hasRed;
  const payment = await one(
    `SELECT status, amount, uuid, invoice_number, paid_at
     FROM payments
     WHERE payable_id = ? AND payable_type LIKE '%fitness%'
     ORDER BY id DESC LIMIT 1`,
    [presented.id],
  ).catch(() => null);
  const paymentStatus = String(payment?.status || "").toLowerCase();
  const feePaid = Number(presented.initial_fee_paid || 0) >= FITNESS_CERT_FEE
    || ["paid", "completed", "success", "successful"].includes(paymentStatus);
  return {
    ...presented,
    answers: answersFromSteps(steps),
    doctor,
    has_red_flags: hasRed,
    red_flags_found: hasRed,
    requires_inperson: requiresInperson,
    identity_verified_via_video: bool(presented.identity_verified_via_video),
    is_signed: bool(presented.is_signed),
    consent_given: bool(presented.consent_given),
    vitals_available: bool(presented.vitals_available),
    confirmation_session: presented.confirmation_room
      ? { room_name: presented.confirmation_room, requested_at: presented.confirmation_requested_at }
      : null,
    qr_code: presented.qr_code,
    pdf_url: presented.pdf_url,
    fee_amount: FITNESS_CERT_FEE,
    fee_currency: FITNESS_CERT_CURRENCY,
    fee_paid: feePaid,
    payment_status: feePaid ? "paid" : (paymentStatus || (presented.status === "awaiting_payment" ? "pending" : null)),
    payment_uuid: payment?.uuid || null,
    invoice_number: payment?.invoice_number || null,
    paid_at: payment?.paid_at || null,
  };
}

async function loadCert(id) {
  return one("SELECT * FROM fitness_certificates WHERE id = ?", [id]).catch(() => null);
}

async function patientDraft(patientId) {
  return one(
    `SELECT * FROM fitness_certificates
     WHERE patient_id = ? AND status IN ('draft','awaiting_payment')
     ORDER BY id DESC LIMIT 1`,
    [patientId],
  ).catch(() => null);
}

function monthsFromNow(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function invoiceStillOpen(payment) {
  if (!payment?.invoice_number) return false;
  const status = String(payment.status || "").toLowerCase();
  if (!["pending", "initiated", "unpaid"].includes(status)) return false;
  if (!payment.expires_at) return true;
  const expires = new Date(String(payment.expires_at).replace(" ", "T") + "Z");
  if (Number.isNaN(expires.getTime())) return true;
  return expires.getTime() > Date.now() + 60_000;
}

export async function markFitnessCertificatePaid(certificateId, amount = FITNESS_CERT_FEE) {
  await ensureFitnessTables();
  const row = await loadCert(certificateId);
  if (!row) return null;
  const assigned = row.doctor_id || (await activeCertDoctor())?.doctor_id || null;
  const alreadyQueued = ["pending", "in_review", "issued", "approved"].includes(String(row.status || ""));
  await update("fitness_certificates", certificateId, {
    status: alreadyQueued ? row.status : "pending",
    doctor_id: assigned,
    initial_fee_paid: Number(amount) || FITNESS_CERT_FEE,
    actual_fee_paid: Number(amount) || FITNESS_CERT_FEE,
  });
  if (!alreadyQueued) {
    if (assigned) {
      const doctor = await one("SELECT user_id FROM doctors WHERE id = ?", [assigned]).catch(() => null);
      await notifyUser(
        doctor?.user_id,
        "Paid fitness certificate request",
        `${row.patient_full_name || "A patient"} paid 5,000 FRW. Review it, confirm identity on video, then issue the certificate.`,
      );
    }
    const patient = await one("SELECT user_id FROM patients WHERE id = ?", [row.patient_id]).catch(() => null);
    await notifyUser(
      patient?.user_id,
      "Fitness certificate payment received",
      "Your 5,000 FRW payment is confirmed. A licensed doctor will review your request and start the identity video check.",
    );
  }
  return loadCert(certificateId);
}

async function startCertificateInvoice(req, row) {
  if (!row.doctor_id) {
    const error = new Error("Choose the doctor who should review this fitness certificate.");
    error.status = 422;
    throw error;
  }
  await ensureFitnessPaymentType().catch(() => null);
  const paid = Number(row.initial_fee_paid || 0) >= FITNESS_CERT_FEE
    || await one(
      `SELECT id FROM payments
       WHERE payable_id = ? AND payable_type LIKE '%fitness%'
         AND LOWER(status) IN ('paid','completed','success','successful')
       LIMIT 1`,
      [row.id],
    ).catch(() => null);
  if (paid) {
    const updated = await markFitnessCertificatePaid(row.id, FITNESS_CERT_FEE);
    return { paid: true, certificate: await shapeCert(updated) };
  }

  const open = await one(
    `SELECT * FROM payments
     WHERE payable_id = ? AND payable_type LIKE '%fitness%'
       AND status IN ('pending','initiated','unpaid')
     ORDER BY id DESC LIMIT 1`,
    [row.id],
  ).catch(() => null);

  const { createIremboInvoice } = await import("./public.js");
  const user = await one("SELECT id, name, email, phone FROM users WHERE id = ?", [req.user.id]).catch(() => null);
  let invoiceNumber = open && invoiceStillOpen(open) ? open.invoice_number : null;
  let publicKey = process.env.PAYMENT_PUBLIC_KEY || "";
  let paymentUuid = open?.uuid || open?.payment_uuid || crypto.randomUUID();

  if (!invoiceNumber) {
    paymentUuid = crypto.randomUUID();
    const created = await createIremboInvoice({
      transactionId: paymentUuid,
      amount: FITNESS_CERT_FEE,
      customer: {
        name: user?.name || row.patient_full_name || "Patient",
        email: user?.email || "",
        phone: user?.phone || row.patient_contact || "",
      },
      description: `Fitness certificate ${row.certificate_number || row.id}`,
    });
    invoiceNumber = created.invoiceNumber;
    publicKey = created.publicKey;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
    await insert("payments", {
      patient_id: row.patient_id,
      payable_type: FITNESS_PAYABLE_TYPE,
      type: FITNESS_PAYABLE_TYPE,
      payment_type: FITNESS_PAYABLE_TYPE,
      payable_id: row.id,
      invoice_number: invoiceNumber,
      transaction_id: paymentUuid,
      idempotency_key: paymentUuid,
      amount: FITNESS_CERT_FEE,
      currency: FITNESS_CERT_CURRENCY,
      status: "pending",
      description: `Fitness certificate ${row.certificate_number || row.id}`,
      expires_at: expiresAt,
      uuid: paymentUuid,
      payment_uuid: paymentUuid,
    });
  } else {
    publicKey = publicKey || process.env.PAYMENT_PUBLIC_KEY || "";
  }

  await update("fitness_certificates", row.id, {
    status: "awaiting_payment",
    doctor_id: row.doctor_id,
    consent_given: 1,
  });

  return {
    paid: false,
    invoice_number: invoiceNumber,
    public_key: publicKey,
    amount: FITNESS_CERT_FEE,
    currency: FITNESS_CERT_CURRENCY,
    payment_uuid: paymentUuid,
    message: "Pay 5,000 FRW to send this request to a licensed doctor.",
  };
}

async function ensureDraft(req) {
  const patient = await loadPatientForUser(req.user.id);
  if (!patient) return { error: "A patient profile is required." };
  const existing = await patientDraft(patient.id);
  if (existing) return { patient, row: existing };
  const user = await one("SELECT id, name, email, phone, country_code FROM users WHERE id = ?", [req.user.id]).catch(() => null);
  const id = await insert("fitness_certificates", {
    certificate_number: certNumber(),
    status: "draft",
    current_step: 0,
    patient_id: patient.id,
    doctor_id: null,
    patient_full_name: user?.name || patient.full_name || "",
    patient_contact: user?.phone || patient.phone || "",
    consent_given: 1,
    answers_json: {},
    job_none_of_above: 1,
  });
  return { patient, row: await loadCert(id) };
}

function canAccess(req, row) {
  return Boolean(row);
}

async function patientOwns(req, row) {
  const patient = await loadPatientForUser(req.user.id);
  return Boolean(patient && Number(row.patient_id) === Number(patient.id));
}

async function doctorMayReview(req, row) {
  const doctorId = await loadOwnedId(req.user.id, "doctors");
  if (!doctorId) return false;
  if (!row.doctor_id) return true;
  return Number(row.doctor_id) === Number(doctorId);
}

async function saveStep(req, step) {
  const { error, row } = await ensureDraft(req);
  if (error) return { error };
  const body = bodyOf(req);
  const steps = parseJson(row.answers_json, {});
  const patch = { current_step: Math.max(Number(row.current_step || 0), step) };
  if (step === 1) {
    patch.purpose = body.purpose || row.purpose;
    patch.purpose_other = body.purpose_other ?? row.purpose_other;
    patch.job_type = body.job_type || row.job_type;
    const doctorId = Number(body.doctor_id || body.chosen_doctor_id);
    if (doctorId) patch.doctor_id = doctorId;
    Object.assign(patch, applyJobFlags(patch.job_type));
    steps["1"] = {
      purpose: patch.purpose,
      purpose_other: patch.purpose_other,
      job_type: patch.job_type,
      doctor_id: patch.doctor_id || row.doctor_id || null,
    };
  } else {
    const answers = body.answers || {};
    steps[String(step)] = {
      answers,
      temperature: body.temperature,
      blood_pressure: body.blood_pressure,
      pulse: body.pulse,
      oxygen_saturation: body.oxygen_saturation,
      notes: body.notes,
    };
    if (step === 4) {
      patch.temperature = body.temperature || null;
      patch.blood_pressure = body.blood_pressure || null;
      patch.pulse = body.pulse || null;
      patch.oxygen_saturation = body.oxygen_saturation || null;
      patch.patient_notes = body.notes || null;
      patch.vitals_available = Boolean(body.temperature || body.blood_pressure || body.pulse || body.oxygen_saturation) ? 1 : 0;
    }
    const mergedAnswers = {};
    for (const payload of Object.values(steps)) Object.assign(mergedAnswers, payload.answers || {});
    const flags = applyRedFlags(mergedAnswers);
    Object.assign(patch, flags);
    const hasRed = Object.values(flags).some((v) => v === 1);
    patch.has_red_flags = hasRed ? 1 : 0;
    patch.requires_inperson = hasRed ? 1 : 0;
  }
  patch.answers_json = steps;
  await update("fitness_certificates", row.id, patch);
  return { row: await loadCert(row.id) };
}

function stepPayload(row, step) {
  const steps = parseJson(row?.answers_json, {});
  const payload = steps[String(step)] || {};
  return {
    certificate_id: row?.id || 0,
    current_step: row?.current_step || 0,
    step,
    answers: answersFromSteps({ [step]: payload }),
    purpose: payload.purpose || row?.purpose,
    purpose_other: payload.purpose_other ?? row?.purpose_other,
    job_type: payload.job_type || row?.job_type,
    doctor_id: payload.doctor_id || row?.doctor_id || null,
    vitals: {
      temperature: payload.temperature || row?.temperature,
      blood_pressure: payload.blood_pressure || row?.blood_pressure,
      pulse: payload.pulse || row?.pulse,
      oxygen_saturation: payload.oxygen_saturation || row?.oxygen_saturation,
    },
    notes: payload.notes || row?.patient_notes,
  };
}

function wantsPdf(req) {
  const accept = String(req.headers.accept || "");
  return Boolean(req.query.file || req.query.raw || accept.includes("application/pdf"));
}

async function sendPdf(res, row) {
  const cert = await shapeCert(row);
  const pdf = buildCertificatePdf(cert);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${cert.certificate_number || "certificate"}.pdf"`);
  res.send(pdf);
  return true;
}

async function shapeCertificationDoctor(row) {
  const doctor = await one(
    `SELECT d.id, u.name, u.email FROM doctors d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
    [row.doctor_id],
  ).catch(() => null);
  const pending = await one(
    "SELECT COUNT(*) AS total FROM fitness_certificates WHERE doctor_id = ? AND status = 'pending'",
    [row.doctor_id],
  ).catch(() => ({ total: 0 }));
  const review = await one(
    "SELECT COUNT(*) AS total FROM fitness_certificates WHERE doctor_id = ? AND status = 'in_review'",
    [row.doctor_id],
  ).catch(() => ({ total: 0 }));
  return {
    id: row.id,
    status: row.status || "inactive",
    is_available: bool(row.is_available),
    pending_count: Number(pending?.total || 0),
    in_review_count: Number(review?.total || 0),
    doctor: { id: doctor?.id || row.doctor_id, user: { name: doctor?.name || "Doctor", email: doctor?.email || "" } },
    created_at: row.created_at,
  };
}

async function handleAdminCertificates(req, res, parts) {
  if (parts[0] !== "admin" || parts[1] !== "certificates") return false;
  await ensureFitnessTables();
  if (req.method !== "GET") return false;
  const status = req.query.status ? String(req.query.status) : "";
  const term = String(req.query.q || req.query.search || "").trim();
  const where = ["1=1"];
  const params = [];
  if (status && status !== "all") {
    where.push("c.status = ?");
    params.push(status);
  } else {
    where.push("c.status NOT IN ('draft')");
  }
  if (term) {
    where.push("(c.certificate_number LIKE ? OR c.patient_full_name LIKE ? OR c.purpose LIKE ?)");
    params.push(`%${term}%`, `%${term}%`, `%${term}%`);
  }
  const rows = await q(
    `SELECT c.* FROM fitness_certificates c WHERE ${where.join(" AND ")} ORDER BY c.id DESC LIMIT 200`,
    params,
  ).catch(() => []);
  const certificates = [];
  for (const row of rows) certificates.push(await shapeCert(row));
  const tally = async (sql) => Number((await one(sql).catch(() => ({ total: 0 })))?.total || 0);
  const summary = {
    awaiting_payment: await tally("SELECT COUNT(*) AS total FROM fitness_certificates WHERE status = 'awaiting_payment'"),
    pending: await tally("SELECT COUNT(*) AS total FROM fitness_certificates WHERE status IN ('pending','in_review')"),
    issued: await tally("SELECT COUNT(*) AS total FROM fitness_certificates WHERE status IN ('issued','approved')"),
    rejected: await tally("SELECT COUNT(*) AS total FROM fitness_certificates WHERE status IN ('rejected','revoked')"),
    paid_revenue: Number((await one(
      `SELECT COALESCE(SUM(amount),0) AS total FROM payments
       WHERE payable_type LIKE '%fitness%' AND LOWER(status) IN ('paid','completed','success','successful')`,
    ).catch(() => ({ total: 0 })))?.total || 0),
    fee: FITNESS_CERT_FEE,
    currency: FITNESS_CERT_CURRENCY,
  };
  res.json({ certificates, data: certificates, summary });
  return true;
}

async function handleAdminCertDoctors(req, res, parts) {
  if (parts[0] !== "admin" || parts[1] !== "certification-doctors") return false;
  await ensureFitnessTables();
  const id = Number(parts[2]) || null;
  if (req.method === "GET" && !id) {
    const rows = await q("SELECT * FROM certification_doctors ORDER BY id DESC").catch(() => []);
    const list = [];
    for (const row of rows) list.push(await shapeCertificationDoctor(row));
    res.json({ certification_doctors: list, data: list });
    return true;
  }
  if (req.method === "POST" && !id) {
    const doctorId = Number(bodyOf(req).doctor_id);
    if (!doctorId) return res.status(422).json({ message: "Choose a doctor." }) || true;
    const existing = await one("SELECT * FROM certification_doctors WHERE doctor_id = ? LIMIT 1", [doctorId]).catch(() => null);
    let rowId = existing?.id;
    if (existing) {
      await update("certification_doctors", existing.id, { status: "active", is_available: 1 });
    } else {
      rowId = await insert("certification_doctors", { doctor_id: doctorId, status: "active", is_available: 1 });
    }
    const row = await one("SELECT * FROM certification_doctors WHERE id = ?", [rowId]);
    res.status(201).json({ certification_doctor: await shapeCertificationDoctor(row) });
    return true;
  }
  if (id && req.method === "PUT") {
    const body = bodyOf(req);
    const patch = {};
    if (body.status != null) patch.status = body.status;
    if (body.is_available != null) patch.is_available = bool(body.is_available) ? 1 : 0;
    if (Object.keys(patch).length) await update("certification_doctors", id, patch);
    const row = await one("SELECT * FROM certification_doctors WHERE id = ?", [id]);
    res.json({ certification_doctor: await shapeCertificationDoctor(row) });
    return true;
  }
  if (id && req.method === "DELETE") {
    await q("DELETE FROM certification_doctors WHERE id = ?", [id]).catch(() => {});
    res.json({ message: "Removed." });
    return true;
  }
  return false;
}

export async function handlePublicFitness(req, res) {
  const parts = String(req.path || "").replace(/^\/+|\/+$/g, "").split("/");
  if (req.method !== "GET") return false;
  if (parts[0] !== "public") return false;
  await ensureFitnessTables();
  const verifyNumber = req.params?.certificateNumber || (parts[1] === "verify" ? parts[2] : null);
  if (verifyNumber) {
    const number = decodeURIComponent(String(verifyNumber)).trim();
    const row = await one(
      "SELECT * FROM fitness_certificates WHERE certificate_number = ? LIMIT 1",
      [number],
    ).catch(() => null);
    if (!row || !["issued", "approved"].includes(row.status) || !bool(row.is_signed)) {
      res.json({ valid: false, message: "This certificate number is not valid." });
      return true;
    }
    const cert = await shapeCert(row);
    const doctor = cert.doctor;
    res.json({
      valid: true,
      message: "Certificate is valid.",
      certificate: {
        certificate_number: cert.certificate_number,
        patient_name: cert.patient_full_name,
        purpose: cert.purpose,
        decision: cert.decision,
        issued_by: doctor?.name || "MediConnect doctor",
        issued_at: cert.signed_at || cert.updated_at,
        valid_until: cert.valid_until,
        platform: "MediConnect",
      },
    });
    return true;
  }
  const fileTokenValue = req.params?.token || (parts[1] === "certificates" && parts[2] === "file" ? parts[3] : null);
  if (fileTokenValue) {
    const row = await one("SELECT * FROM fitness_certificates WHERE download_token = ? LIMIT 1", [fileTokenValue]).catch(() => null);
    if (!row || !["issued", "approved"].includes(row.status)) {
      res.status(404).json({ message: "Certificate file not found." });
      return true;
    }
    return sendPdf(res, row);
  }
  return false;
}

export async function handleFitnessCertificates(req, res, parts) {
  if (await handleAdminCertificates(req, res, parts)) return true;
  if (await handleAdminCertDoctors(req, res, parts)) return true;
  if (!["patient", "doctor"].includes(parts[0]) || parts[1] !== "certificates") return false;
  await ensureFitnessTables();
  const scope = parts[0];
  const action = parts[2];
  const id = Number(parts[2]) || null;
  const nested = parts[3];

  if (scope === "patient" && req.method === "GET" && action === "available-doctors") {
    res.json({ doctors: await availableDoctors() });
    return true;
  }

  if (scope === "patient" && req.method === "GET" && action === "request" && parts[3] === "step") {
    const step = Number(parts[4]) || 1;
    const patient = await loadPatientForUser(req.user.id);
    const row = patient ? await patientDraft(patient.id) : null;
    res.json(stepPayload(row, step));
    return true;
  }

  if (scope === "patient" && req.method === "GET" && action === "request") {
    const patient = await loadPatientForUser(req.user.id);
    const row = patient ? await patientDraft(patient.id) : null;
    res.json({ certificate: row ? await shapeCert(row) : null });
    return true;
  }

  if (scope === "patient" && req.method === "POST" && action === "step") {
    const step = Number(parts[3]) || 1;
    const saved = await saveStep(req, step);
    if (saved.error) return res.status(422).json({ message: saved.error }) || true;
    const certificate = await shapeCert(saved.row);
    res.json({ message: "Step saved.", certificate, current_step: certificate.current_step });
    return true;
  }

  if (scope === "patient" && req.method === "POST" && action === "submit") {
    const { error, row } = await ensureDraft(req);
    if (error) return res.status(422).json({ message: error }) || true;
    if (Number(row.current_step || 0) < 4) {
      return res.status(422).json({ message: "Complete all certificate steps before submitting." }) || true;
    }
    if (["pending", "in_review", "issued", "approved"].includes(row.status)) {
      res.json({ message: "Request already submitted.", certificate: await shapeCert(row) });
      return true;
    }
    try {
      const started = await startCertificateInvoice(req, row);
      if (started.paid) {
        res.json({ message: "Certificate request submitted for doctor review.", certificate: started.certificate });
        return true;
      }
      res.json({
        message: started.message,
        invoice_number: started.invoice_number,
        public_key: started.public_key,
        amount: started.amount,
        currency: started.currency,
        payment_uuid: started.payment_uuid,
      });
      return true;
    } catch (err) {
      const status = Number(err?.status) || 502;
      return res.status(status).json({ message: err?.message || "Could not start certificate payment." }) || true;
    }
  }

  if (scope === "patient" && req.method === "POST" && action === "withdraw") {
    const patient = await loadPatientForUser(req.user.id);
    const row = patient ? await patientDraft(patient.id) : null;
    if (row) await update("fitness_certificates", row.id, { status: "withdrawn" });
    res.json({ message: "Request withdrawn." });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && action === "availability") {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    const row = await one("SELECT * FROM certification_doctors WHERE doctor_id = ? LIMIT 1", [doctorId]).catch(() => null);
    const next = row ? (bool(row.is_available) ? 0 : 1) : 1;
    if (row) await update("certification_doctors", row.id, { is_available: next, status: "active" });
    else if (doctorId) await insert("certification_doctors", { doctor_id: doctorId, status: "active", is_available: next });
    res.json({ is_available: Boolean(next) });
    return true;
  }

  if (req.method === "GET" && !action) {
    const status = req.query.status ? String(req.query.status) : null;
    let rows = [];
    if (scope === "patient") {
      const patient = await loadPatientForUser(req.user.id);
      rows = patient
        ? await q(
          `SELECT * FROM fitness_certificates
           WHERE patient_id = ? ${status ? "AND status = ?" : "AND status NOT IN ('draft')"}
           ORDER BY id DESC`,
          status ? [patient.id, status] : [patient.id],
        ).catch(() => [])
        : [];
    } else {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const where = [];
      const params = [];
      if (status) { where.push("status = ?"); params.push(status); }
      else where.push("status NOT IN ('draft','awaiting_payment')");
      if (doctorId) {
        where.push("(doctor_id = ? OR doctor_id IS NULL)");
        params.push(doctorId);
      }
      rows = await q(
        `SELECT * FROM fitness_certificates WHERE ${where.join(" AND ")} ORDER BY id DESC`,
        params,
      ).catch(() => []);
    }
    const certificates = [];
    for (const row of rows) certificates.push(await shapeCert(row));
    res.json({ certificates, data: certificates });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && !action) {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    const body = bodyOf(req);
    const patient = await one("SELECT * FROM patients WHERE id = ? LIMIT 1", [body.patient_id]).catch(() => null);
    const idNew = await insert("fitness_certificates", {
      certificate_number: certNumber(),
      status: "draft",
      patient_id: patient?.id || null,
      doctor_id: doctorId,
      appointment_id: body.appointment_id || null,
      patient_full_name: body.patient_full_name || "",
      patient_national_id: body.patient_national_id || null,
      patient_contact: body.patient_contact || null,
      purpose: body.purpose || "general_fitness",
      purpose_other: body.purpose_other || null,
      consent_given: bool(body.consent_given) ? 1 : 0,
      answers_json: {},
    });
    const certificate = await shapeCert(await loadCert(idNew));
    res.status(201).json({ certificate, data: certificate, ...certificate });
    return true;
  }

  if (!id) return false;
  const row = await loadCert(id);
  if (!row) return res.status(404).json({ message: "Certificate not found." }) || true;
  if (scope === "patient" && !(await patientOwns(req, row))) {
    return res.status(403).json({ message: "This certificate belongs to another patient." }) || true;
  }
  if (scope === "doctor" && !(await doctorMayReview(req, row))) {
    return res.status(403).json({ message: "This certificate is assigned to another doctor." }) || true;
  }

  if (req.method === "GET" && nested === "download") {
    if (!["issued", "approved"].includes(row.status) || !bool(row.is_signed)) {
      return res.status(422).json({ message: "This certificate has not been issued yet." }) || true;
    }
    if (wantsPdf(req)) return sendPdf(res, row);
    const token = row.download_token || fileToken();
    if (!row.download_token) await update("fitness_certificates", row.id, { download_token: token });
    res.json({ url: `/api/v1/public/certificates/file/${token}`, expires_in: 86400 });
    return true;
  }

  if (scope === "patient" && (req.method === "GET" || req.method === "POST") && nested === "confirmation-session") {
    if (!row.confirmation_room) return res.status(404).json({ message: "No confirmation session yet." }) || true;
    const token = callToken({ room: row.confirmation_room, role: "patient", consultationId: row.id, name: row.patient_full_name });
    res.json({
      message: "Join the identity confirmation call.",
      room_url: `/consultation-room?room=${encodeURIComponent(row.confirmation_room)}`,
      room_name: row.confirmation_room,
      token,
      patient_token: token,
    });
    return true;
  }

  if (req.method === "GET" && !nested) {
    if (scope === "doctor" && row.status === "pending") {
      await update("fitness_certificates", row.id, { status: "in_review", reviewed_at: new Date() });
    }
    const fresh = await loadCert(row.id);
    const certificate = await shapeCert(fresh);
    res.json({ certificate, data: certificate, ...certificate });
    return true;
  }

  if (scope === "doctor" && req.method === "PUT" && !nested) {
    const body = bodyOf(req);
    const patch = {};
    const copy = [
      "decision", "doctor_notes", "valid_until", "temperature", "blood_pressure", "pulse", "oxygen_saturation",
      "identity_verified_via_video", "vitals_available",
      "job_heavy_labor", "job_driving_machinery", "job_armed_forces", "job_mining_construction", "job_requires_xray", "job_none_of_above",
      ...Object.values(RED_FLAG_FIELDS),
      "red_flag_weight_loss", "red_flag_cardiac_history", "red_flag_seizure", "red_flag_pregnancy_complications",
    ];
    for (const key of copy) {
      if (body[key] !== undefined) patch[key] = typeof body[key] === "boolean" ? (body[key] ? 1 : 0) : body[key];
    }
    const merged = { ...row, ...patch };
    const red = flagList(merged);
    patch.has_red_flags = red.length ? 1 : 0;
    patch.requires_inperson = red.length ? 1 : 0;
    if (row.status === "pending") patch.status = "in_review";
    await update("fitness_certificates", row.id, patch);
    const certificate = await shapeCert(await loadCert(row.id));
    res.json({
      certificate,
      red_flags_found: red,
      requires_inperson: certificate.requires_inperson,
      message: "Certificate updated.",
    });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && nested === "checklist") {
    const answers = bodyOf(req).answers || [];
    const flags = {};
    for (const item of answers) {
      if (item.boolean_answer && item.question_id) flags[`q_${item.question_id}`] = true;
    }
    res.json({ certificate: await shapeCert(row), data: await shapeCert(row) });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && nested === "confirmation-session") {
    const room = row.confirmation_room || `fitness-${row.id}-${crypto.randomBytes(3).toString("hex")}`;
    await update("fitness_certificates", row.id, {
      confirmation_room: room,
      confirmation_requested_at: new Date(),
      status: row.status === "pending" ? "in_review" : row.status,
    });
    const patient = await one("SELECT user_id FROM patients WHERE id = ?", [row.patient_id]).catch(() => null);
    await notifyUser(patient?.user_id, "Identity confirmation call", "Your doctor started a short video check for your fitness certificate. Join from your certificates page.");
    const token = callToken({ room, role: "doctor", consultationId: row.id, name: "Doctor" });
    res.json({
      room_url: `/consultation-room?room=${encodeURIComponent(room)}`,
      doctor_token: token,
      ice_servers: [],
    });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && nested === "confirm-identity") {
    await update("fitness_certificates", row.id, {
      identity_verified_via_video: 1,
      status: row.status === "pending" ? "in_review" : row.status,
    });
    const certificate = await shapeCert(await loadCert(row.id));
    res.json({ certificate, data: certificate, ...certificate });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && nested === "sign") {
    const fresh = await loadCert(row.id);
    const shaped = await shapeCert(fresh);
    if (!bool(shaped.identity_verified_via_video)) {
      return res.status(422).json({ message: "Confirm the patient's identity before signing." }) || true;
    }
    const issuable = shaped.decision === "fit" || shaped.decision === "fit_with_restrictions";
    if (!issuable) {
      return res.status(422).json({ message: "Set the decision to Fit or Fit with restrictions before issuing." }) || true;
    }
    if (shaped.decision === "fit" && (shaped.has_red_flags || shaped.requires_inperson)) {
      return res.status(422).json({ message: "Red flags require Fit with restrictions, a physical exam, or rejection — not an unrestricted Fit." }) || true;
    }
    const token = fresh.download_token || fileToken();
    const number = fresh.certificate_number || certNumber();
    const until = fresh.valid_until || monthsFromNow(FITNESS_CERT_VALIDITY_MONTHS);
    const qr = `/fitness-certificates/verify/${encodeURIComponent(number)}`;
    await update("fitness_certificates", row.id, {
      status: "issued",
      is_signed: 1,
      signed_at: new Date(),
      certificate_number: number,
      download_token: token,
      qr_code: qr,
      pdf_url: `/api/v1/public/certificates/file/${token}`,
      valid_until: until,
    });
    const certificate = await shapeCert(await loadCert(row.id));
    const patient = await one("SELECT user_id FROM patients WHERE id = ?", [row.patient_id]).catch(() => null);
    await notifyUser(patient?.user_id, "Fitness certificate issued", `Certificate ${number} is ready to download and verify.`);
    res.json({ certificate, data: certificate, ...certificate });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && nested === "reject") {
    const reason = bodyOf(req).reason || "";
    await update("fitness_certificates", row.id, { status: "rejected", rejection_reason: reason, doctor_notes: reason || row.doctor_notes });
    const certificate = await shapeCert(await loadCert(row.id));
    const patient = await one("SELECT user_id FROM patients WHERE id = ?", [row.patient_id]).catch(() => null);
    await notifyUser(patient?.user_id, "Fitness certificate not issued", reason || "Your fitness certificate request was not approved.");
    res.json({ certificate, data: certificate, ...certificate });
    return true;
  }

  if (scope === "doctor" && req.method === "POST" && nested === "revoke") {
    const reason = bodyOf(req).reason || "";
    await update("fitness_certificates", row.id, { status: "revoked", revoke_reason: reason });
    const certificate = await shapeCert(await loadCert(row.id));
    res.json({ certificate, data: certificate, ...certificate });
    return true;
  }

  return canAccess(req, row) ? false : false;
}
