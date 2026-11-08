import fs from "fs";
import path from "path";
import multer from "multer";
import { loadOwnedId } from "./auth.js";
import { hasColumn, insert, one, presentRow, q, tableExists, update } from "./db.js";
import { plausibleDateOfBirth, sniffedUploadExtension } from "./input-checks.js";
import { validateIncomingPhone } from "./phone.js";
import { doctorHasCareLink } from "./visit-rules.js";

const MEDICAL_TABLES = [
  "patient_medical_infos",
  "patient_medical_info",
  "medical_infos",
  "medical_records",
  "patient_medical_records",
];

const FILE_TABLES = ["patient_files", "medical_files"];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function saveFile(file, prefix) {
  if (!file?.buffer) return null;
  const dir = process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, "doctors-webp")
    : path.resolve("storage", "doctors-webp");
  fs.mkdirSync(dir, { recursive: true });
  const sniffed = sniffedUploadExtension(file.buffer);
  if (!sniffed) return { error: "Upload a PDF or an image (PNG, JPG, or WEBP)." };
  const ext = sniffed === ".jpg" ? ".jpg" : sniffed;
  const filename = `${prefix}_${Date.now()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return { url: `https://mediconnect.rw/api/v1/media/${filename}` };
}

async function firstTable(names) {
  for (const name of names) {
    if (await tableExists(name)) return name;
  }
  return null;
}

/**
 * Chart identity. A profile id and an account id are different people when both
 * exist. A lookup error is not "no such patient", and neither person is returned.
 */
async function resolveChartPatient(rawId) {
  const id = Number(rawId);
  if (!id) return { patient: null, unreadable: false, ambiguous: false };
  try {
    const byId = await one("SELECT * FROM patients WHERE id = ? LIMIT 1", [id]);
    const byAccount = await q("SELECT * FROM patients WHERE user_id = ?", [id]);
    const profileIsOther = Boolean(byId && Number(byId.user_id) !== id);
    const accountOthers = byAccount.filter((row) => Number(row.id) !== Number(byId?.id));
    if (profileIsOther && accountOthers.length) return { patient: null, unreadable: false, ambiguous: true };
    if (byAccount.length > 1) return { patient: null, unreadable: false, ambiguous: true };
    if (byId && !profileIsOther) return { patient: byId, unreadable: false, ambiguous: false };
    if (byAccount.length === 1) return { patient: byAccount[0], unreadable: false, ambiguous: false };
    if (byId) return { patient: byId, unreadable: false, ambiguous: false };
    return { patient: null, unreadable: false, ambiguous: false };
  } catch {
    return { patient: null, unreadable: true, ambiguous: false };
  }
}

function linkedAccountId(patient) {
  const accountId = Number(patient?.user_id);
  return accountId > 0 ? accountId : null;
}

/** The profile id is not an account id. A guest chart must not borrow users.id. */
async function accountForChart(patient) {
  const accountId = linkedAccountId(patient);
  if (!accountId) return null;
  return one(
    "SELECT id, name, email, phone, country_code, avatar FROM users WHERE id = ? LIMIT 1",
    [accountId],
  ).catch(() => null);
}

async function openChart(res, user, rawId) {
  const found = await resolveChartPatient(rawId);
  if (found.unreadable || found.ambiguous) {
    res.status(403).json({ message: "You do not have access to this record." });
    return null;
  }
  if (!found.patient) {
    res.status(404).json({ message: "Patient not found." });
    return null;
  }
  if (!(await assertCareLink(res, user, found.patient))) return null;
  return found.patient;
}

async function assertCareLink(res, user, patient) {
  let linked = false;
  try {
    linked = await doctorHasCareLink(user, patient);
  } catch {
    linked = false;
  }
  if (!linked) {
    res.status(403).json({ message: "You do not have access to this record." });
    return false;
  }
  return true;
}

async function medicalRow(patient) {
  const table = await firstTable(MEDICAL_TABLES);
  if (!table || !patient?.id) return { table: null, row: null };
  const row = await one(
    `SELECT * FROM \`${table}\` WHERE patient_id = ? ORDER BY id DESC LIMIT 1`,
    [patient.id],
  ).catch(() => null);
  return { table, row };
}

function shapeRecord(patient, row, user) {
  return {
    id: row?.id || null,
    patient_id: patient.id,
    blood_type: row?.blood_type || null,
    chronic_conditions: row?.chronic_conditions || row?.conditions || null,
    known_allergies: row?.known_allergies || row?.allergies || null,
    current_medications: row?.current_medications || row?.medications || null,
    family_history: row?.family_history || null,
    surgical_history: row?.surgical_history || null,
    disabilities: row?.disabilities || null,
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
    patient: {
      id: patient.id,
      name: user?.name || null,
      email: user?.email || null,
    },
  };
}

async function listVisits(patient) {
  const accountId = Number(patient?.user_id) || null;
  const profileId = Number(patient?.id) || null;
  const visits = [];
  if (accountId && (await tableExists("appointments"))) {
    const userClause = (await hasColumn("appointments", "user_id"))
      ? "AND (`user_id` IS NULL OR `user_id` = ?)"
      : "";
    const rows = await q(
      `SELECT * FROM appointments WHERE patient_id = ? ${userClause} ORDER BY id DESC LIMIT 40`,
      userClause ? [accountId, accountId] : [accountId],
    ).catch(() => []);
    for (const row of rows) {
      visits.push({
        id: row.id,
        patient_id: row.patient_id,
        doctor_id: row.doctor_id,
        visit_type: "appointment",
        source_id: row.id,
        chief_complaint: row.chief_complaint || row.notes || null,
        diagnosis: row.diagnosis || null,
        visited_at: row.appointment_date || row.created_at,
      });
    }
  }
  const instantTable = (await tableExists("instant_consultation_requests"))
    ? "instant_consultation_requests"
    : (await tableExists("instant_consultations")) ? "instant_consultations" : null;
  if (instantTable && profileId) {
    const userClause = (await hasColumn(instantTable, "user_id"))
      ? "AND (`user_id` IS NULL OR `user_id` = ?)"
      : "";
    const rows = await q(
      `SELECT * FROM \`${instantTable}\` WHERE patient_id = ? ${userClause} ORDER BY id DESC LIMIT 40`,
      userClause ? [profileId, accountId || 0] : [profileId],
    ).catch(() => []);
    for (const row of rows) {
      visits.push({
        id: row.id,
        patient_id: row.patient_id,
        doctor_id: row.doctor_id,
        visit_type: "instant_consultation",
        source_id: row.id,
        chief_complaint: row.chief_complaint || row.reason || row.notes || null,
        visited_at: row.created_at,
      });
    }
  }
  visits.sort((a, b) => String(b.visited_at || "").localeCompare(String(a.visited_at || "")));
  return visits;
}

async function readIntakeVisit(table, id) {
  const names = ["id", "doctor_id", "patient_id"];
  if (await hasColumn(table, "user_id")) names.push("user_id");
  return one(
    `SELECT ${names.map((name) => `\`${name}\``).join(", ")} FROM \`${table}\` WHERE id = ? LIMIT 1`,
    [id],
  );
}

async function intakeVisits(appointmentId, instantId, doctorId) {
  try {
    let appointment = null;
    let instant = null;
    let instantTable = null;
    if (appointmentId) {
      if (!(await tableExists("appointments"))) {
        return { ok: false, status: 403, message: "You do not have access to this record." };
      }
      appointment = await readIntakeVisit("appointments", appointmentId);
      if (!appointment || Number(appointment.doctor_id) !== Number(doctorId)) {
        return { ok: false, status: 403, message: "You do not have access to this record." };
      }
      if (appointment.user_id && Number(appointment.user_id) > 0 && Number(appointment.user_id) !== Number(appointment.patient_id)) {
        return { ok: false, status: 403, message: "You do not have access to this record." };
      }
    }
    if (instantId) {
      instantTable = (await tableExists("instant_consultation_requests"))
        ? "instant_consultation_requests"
        : (await tableExists("instant_consultations")) ? "instant_consultations" : null;
      if (!instantTable) return { ok: false, status: 403, message: "You do not have access to this record." };
      instant = await readIntakeVisit(instantTable, instantId);
      if (!instant || Number(instant.doctor_id) !== Number(doctorId)) {
        return { ok: false, status: 403, message: "You do not have access to this record." };
      }
    }
    return { ok: true, appointment, instant, instantTable };
  } catch {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
}

export function registerPatientRecordRoutes(router, { requireAuth, requireRole }) {
  router.post("/doctor/patients/intake", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const body = req.body || {};
      const name = String(body.full_name || body.name || "").trim();
      const phone = String(body.phone || "").trim();
      if (!name || !phone) return res.status(422).json({ message: "Name and phone are required." });
      const phoneCheck = validateIncomingPhone(phone, body.country_code || "+250");
      if (!phoneCheck.ok) return res.status(422).json({ message: phoneCheck.message });
      const birth = plausibleDateOfBirth(body.date_of_birth);
      if (!birth.ok) return res.status(422).json({ message: birth.message });
      const payload = {
        name,
        name_en: name,
        phone: phoneCheck.phone,
        email: body.email || null,
        date_of_birth: birth.value,
        gender: body.gender || null,
        national_id: body.national_id || null,
        address: body.address || null,
        city: body.city || null,
        province: body.province || null,
        country: body.country || "Rwanda",
        status: "pending",
      };
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      if (!doctorId) return res.status(403).json({ message: "You do not have access to this record." });
      const instantId = Number(body.instant_consultation_id) || null;
      const apptId = Number(body.appointment_id) || null;
      const linked = await intakeVisits(apptId, instantId, doctorId);
      if (!linked.ok) return res.status(linked.status).json({ message: linked.message });
      let existingPhone = null;
      if (phone) {
        try {
          existingPhone = await one("SELECT * FROM patients WHERE phone = ? ORDER BY id DESC LIMIT 1", [phone]);
        } catch {
          return res.status(403).json({ message: "You do not have access to this record." });
        }
      }
      if (linked.instant?.user_id && Number(linked.instant.user_id) !== Number(existingPhone?.user_id || 0)) {
        return res.status(403).json({ message: "You do not have access to this record." });
      }
      if (linked.instant?.patient_id && Number(linked.instant.patient_id) !== Number(existingPhone?.id || 0)) {
        return res.status(403).json({ message: "You do not have access to this record." });
      }
      const id = existingPhone?.id || await insert("patients", payload);
      if (existingPhone?.id) {
        await update("patients", existingPhone.id, payload);
      }
      const patientId = Number(id);
      const saved = await one("SELECT * FROM patients WHERE id = ?", [patientId]);
      if (linked.instant && !Number(linked.instant.patient_id)) {
        await update(linked.instantTable, linked.instant.id, { patient_id: patientId });
      }
      if (linked.appointment) {
        const accountId = Number(saved?.user_id) || null;
        const current = Number(linked.appointment.patient_id) || null;
        if (current && accountId && current !== accountId) {
          return res.status(403).json({ message: "You do not have access to this record." });
        }
        if (!current && accountId) {
          await update("appointments", linked.appointment.id, { patient_id: accountId });
        }
      }
      const patient = await presentRow("patients", await one("SELECT * FROM patients WHERE id = ?", [patientId]));
      res.status(201).json({ message: "Patient profile saved.", patient, data: patient, patient_id: patientId });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/profile", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await openChart(res, req.user, req.params.patientId);
      if (!patient) return;
      const user = await accountForChart(patient);
      const presented = await presentRow("patients", patient);
      const data = { ...presented, user };
      res.json({ patient: data, data, ...data });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/record", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await openChart(res, req.user, req.params.patientId);
      if (!patient) return;
      const user = await accountForChart(patient);
      const { row } = await medicalRow(patient);
      const record = shapeRecord(patient, row, user);
      res.json({ record, data: record, ...record });
    } catch (error) {
      next(error);
    }
  });

  router.put("/doctor/patients/:patientId/record", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await openChart(res, req.user, req.params.patientId);
      if (!patient) return;
      const { table, row } = await medicalRow(patient);
      if (!table) return res.status(422).json({ message: "Medical records are not available yet." });
      const body = req.body || {};
      const payload = {};
      for (const key of ["blood_type", "chronic_conditions", "known_allergies", "current_medications", "family_history", "surgical_history", "disabilities"]) {
        if (body[key] !== undefined && await hasColumn(table, key)) payload[key] = body[key];
      }
      if (await hasColumn(table, "allergies") && body.known_allergies !== undefined) payload.allergies = body.known_allergies;
      if (row) await update(table, row.id, payload);
      else {
        payload.patient_id = patient.id;
        await insert(table, payload);
      }
      const fresh = await medicalRow(patient);
      const user = await accountForChart(patient);
      const record = shapeRecord(patient, fresh.row, user);
      res.json({ message: "Record saved.", record, data: record });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/visits", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await openChart(res, req.user, req.params.patientId);
      if (!patient) return;
      let visits = await listVisits(patient);
      if (req.query.visit_type) visits = visits.filter((row) => row.visit_type === req.query.visit_type);
      res.json({ data: visits, visits });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/files", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await openChart(res, req.user, req.params.patientId);
      if (!patient) return;
      const table = await firstTable(FILE_TABLES);
      if (!table) return res.json({ data: [], files: [] });
      const rows = await q(
        `SELECT * FROM \`${table}\` WHERE patient_id = ? ORDER BY id DESC LIMIT 80`,
        [patient.id],
      ).catch(() => []);
      const files = [];
      for (const row of rows) {
        if (req.query.file_type && row.file_type !== req.query.file_type) continue;
        files.push(await presentRow(table, row));
      }
      res.json({ data: files, files });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/patients/:patientId/files", requireAuth, requireRole("doctor"), upload.any(), async (req, res, next) => {
    try {
      const patient = await openChart(res, req.user, req.params.patientId);
      if (!patient) return;
      let table = await firstTable(FILE_TABLES);
      if (!table) {
        await q(`
          CREATE TABLE IF NOT EXISTS patient_files (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            patient_id BIGINT UNSIGNED NOT NULL,
            visit_type VARCHAR(40) NULL,
            source_id BIGINT UNSIGNED NULL,
            file_type VARCHAR(40) NULL,
            title VARCHAR(255) NULL,
            file_path VARCHAR(500) NULL,
            notes TEXT NULL,
            uploaded_by BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY patient_files_patient (patient_id)
          )
        `).catch(() => {});
        table = "patient_files";
      }
      const file = req.files?.[0];
      const saved = saveFile(file, `patient_${patient.id}`);
      if (!saved?.url) return res.status(422).json({ message: saved?.error || "Choose a file to upload." });
      const url = saved.url;
      const id = await insert(table, {
        patient_id: patient.id,
        visit_type: req.body?.visit_type || null,
        source_id: req.body?.source_id || null,
        file_type: req.body?.file_type || req.body?.type || "other",
        title: req.body?.title || file.originalname || "File",
        file_path: url,
        notes: req.body?.notes || null,
        uploaded_by: req.user.id,
      });
      const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
      res.status(201).json({ message: "File uploaded.", file: { ...row, file_url: url }, data: row });
    } catch (error) {
      next(error);
    }
  });
}
