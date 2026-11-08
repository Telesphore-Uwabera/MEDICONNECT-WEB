import fs from "fs";
import path from "path";
import multer from "multer";
import { hasColumn, insert, one, presentRow, q, tableExists, update } from "./db.js";
import { plausibleDateOfBirth, sniffedUploadExtension } from "./input-checks.js";
import { validateIncomingPhone } from "./phone.js";

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

export async function resolvePatientByAnyId(rawId) {
  const id = Number(rawId);
  if (!id) return null;
  return one("SELECT * FROM patients WHERE id = ? OR user_id = ? ORDER BY id DESC LIMIT 1", [id, id]).catch(() => null);
}

async function medicalRow(patient) {
  const table = await firstTable(MEDICAL_TABLES);
  if (!table || !patient) return { table: null, row: null };
  const ids = [...new Set([patient.id, patient.user_id].filter(Boolean))];
  for (const patientId of ids) {
    const row = await one(
      `SELECT * FROM \`${table}\` WHERE patient_id = ? ORDER BY id DESC LIMIT 1`,
      [patientId],
    ).catch(() => null);
    if (row) return { table, row };
  }
  return { table, row: null };
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
  const ids = [...new Set([patient.id, patient.user_id].filter(Boolean))];
  const inList = ids.map(() => "?").join(",") || "?";
  const visits = [];
  if (await tableExists("appointments")) {
    const rows = await q(
      `SELECT * FROM appointments WHERE patient_id IN (${inList}) ORDER BY id DESC LIMIT 40`,
      ids.length ? ids : [0],
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
  if (instantTable) {
    const rows = await q(
      `SELECT * FROM \`${instantTable}\` WHERE patient_id IN (${inList}) ORDER BY id DESC LIMIT 40`,
      ids.length ? ids : [0],
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
      const existingPhone = phone
        ? await one("SELECT * FROM patients WHERE phone = ? ORDER BY id DESC LIMIT 1", [phone]).catch(() => null)
        : null;
      const id = existingPhone?.id || await insert("patients", payload);
      if (existingPhone?.id) {
        await update("patients", existingPhone.id, payload);
      }
      const patientId = Number(id);
      const instantId = Number(body.instant_consultation_id) || null;
      const apptId = Number(body.appointment_id) || null;
      if (instantId) {
        for (const table of ["instant_consultations", "instant_consultation_requests"]) {
          if ((await tableExists(table)) && (await hasColumn(table, "patient_id"))) {
            const row = await one(`SELECT id FROM \`${table}\` WHERE id = ?`, [instantId]).catch(() => null);
            if (row) await update(table, instantId, { patient_id: patientId });
          }
        }
      }
      if (apptId && (await tableExists("appointments")) && (await hasColumn("appointments", "patient_id"))) {
        const row = await one("SELECT id FROM appointments WHERE id = ?", [apptId]).catch(() => null);
        if (row) await update("appointments", apptId, { patient_id: patientId });
      }
      const patient = await presentRow("patients", await one("SELECT * FROM patients WHERE id = ?", [patientId]));
      res.status(201).json({ message: "Patient profile saved.", patient, data: patient, patient_id: patientId });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/profile", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await resolvePatientByAnyId(req.params.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found." });
      const user = patient.user_id
        ? await one("SELECT id, name, email, phone, country_code, avatar FROM users WHERE id = ?", [patient.user_id]).catch(() => null)
        : null;
      const presented = await presentRow("patients", patient);
      const data = { ...presented, user };
      res.json({ patient: data, data, ...data });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/record", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await resolvePatientByAnyId(req.params.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found." });
      const user = await one("SELECT id, name, email FROM users WHERE id = ?", [patient.user_id || patient.id]).catch(() => null);
      const { row } = await medicalRow(patient);
      const record = shapeRecord(patient, row, user);
      res.json({ record, data: record, ...record });
    } catch (error) {
      next(error);
    }
  });

  router.put("/doctor/patients/:patientId/record", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await resolvePatientByAnyId(req.params.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found." });
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
      const user = await one("SELECT id, name, email FROM users WHERE id = ?", [patient.user_id || patient.id]).catch(() => null);
      const record = shapeRecord(patient, fresh.row, user);
      res.json({ message: "Record saved.", record, data: record });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/visits", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await resolvePatientByAnyId(req.params.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found." });
      let visits = await listVisits(patient);
      if (req.query.visit_type) visits = visits.filter((row) => row.visit_type === req.query.visit_type);
      res.json({ data: visits, visits });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/patients/:patientId/files", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const patient = await resolvePatientByAnyId(req.params.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found." });
      const table = await firstTable(FILE_TABLES);
      if (!table) return res.json({ data: [], files: [] });
      const ids = [...new Set([patient.id, patient.user_id].filter(Boolean))];
      const rows = await q(
        `SELECT * FROM \`${table}\` WHERE patient_id IN (${ids.map(() => "?").join(",") || "?"}) ORDER BY id DESC LIMIT 80`,
        ids.length ? ids : [0],
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
      const patient = await resolvePatientByAnyId(req.params.patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found." });
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
