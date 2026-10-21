import { insert, one, q, update } from "./db.js";
import { loadOwnedId } from "./auth.js";

export const TELEMEDICINE_CONSENT_VERSION = "telemedicine-v1-2026";

export async function ensureTelemedicineConsentsTable() {
  await q(`
    CREATE TABLE IF NOT EXISTS telemedicine_consents (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      patient_id BIGINT UNSIGNED NOT NULL,
      doctor_id BIGINT UNSIGNED NULL,
      appointment_id BIGINT UNSIGNED NULL,
      instant_consultation_id BIGINT UNSIGNED NULL,
      form_version VARCHAR(64) NOT NULL,
      method VARCHAR(40) NOT NULL DEFAULT 'platform',
      representative_name VARCHAR(255) NULL,
      representative_relationship VARCHAR(80) NULL,
      patient_consented_at TIMESTAMP NULL,
      doctor_confirmed_at TIMESTAMP NULL,
      doctor_confirmed_by BIGINT UNSIGNED NULL,
      emergency_override TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY telemedicine_consents_patient (patient_id),
      KEY telemedicine_consents_appointment (appointment_id),
      KEY telemedicine_consents_instant (instant_consultation_id)
    )
  `).catch(() => {});
}

function idsFromBody(body = {}) {
  const appointmentId = Number(body.appointment_id) || null;
  const instantId = Number(body.instant_consultation_id) || null;
  return { appointmentId, instantId };
}

async function findConsent(patientId, appointmentId, instantId) {
  if (appointmentId) {
    const row = await one(
      "SELECT * FROM telemedicine_consents WHERE patient_id = ? AND appointment_id = ? ORDER BY id DESC LIMIT 1",
      [patientId, appointmentId],
    ).catch(() => null);
    if (row) return row;
  }
  if (instantId) {
    const row = await one(
      "SELECT * FROM telemedicine_consents WHERE patient_id = ? AND instant_consultation_id = ? ORDER BY id DESC LIMIT 1",
      [patientId, instantId],
    ).catch(() => null);
    if (row) return row;
  }
  return one(
    "SELECT * FROM telemedicine_consents WHERE patient_id = ? AND appointment_id IS NULL AND instant_consultation_id IS NULL ORDER BY id DESC LIMIT 1",
    [patientId],
  ).catch(() => null);
}

function presentConsent(row) {
  if (!row) return null;
  return {
    id: row.id,
    form_version: row.form_version,
    method: row.method,
    representative_name: row.representative_name,
    representative_relationship: row.representative_relationship,
    patient_consented_at: row.patient_consented_at,
    doctor_confirmed_at: row.doctor_confirmed_at,
    emergency_override: Boolean(Number(row.emergency_override)),
    appointment_id: row.appointment_id,
    instant_consultation_id: row.instant_consultation_id,
  };
}

export function registerTelemedicineConsentRoutes(router, { requireAuth, requireRole }) {
  router.post("/patient/telemedicine-consent", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await ensureTelemedicineConsentsTable();
      const patientId = await loadOwnedId(req.user.id, "patients");
      if (!patientId) return res.status(404).json({ message: "Patient profile not found." });
      const { appointmentId, instantId } = idsFromBody(req.body);
      const existing = await findConsent(patientId, appointmentId, instantId);
      const payload = {
        patient_id: patientId,
        appointment_id: appointmentId,
        instant_consultation_id: instantId,
        form_version: String(req.body.form_version || TELEMEDICINE_CONSENT_VERSION).slice(0, 64),
        method: String(req.body.method || "platform").slice(0, 40),
        representative_name: req.body.representative_name ? String(req.body.representative_name).slice(0, 255) : null,
        representative_relationship: req.body.representative_relationship
          ? String(req.body.representative_relationship).slice(0, 80)
          : null,
        patient_consented_at: new Date(),
        emergency_override: req.body.emergency_override ? 1 : 0,
      };
      if (existing) {
        await update("telemedicine_consents", existing.id, payload);
        const row = await one("SELECT * FROM telemedicine_consents WHERE id = ?", [existing.id]);
        return res.json({ message: "Consent recorded.", consent: presentConsent(row) });
      }
      const id = await insert("telemedicine_consents", payload);
      const row = await one("SELECT * FROM telemedicine_consents WHERE id = ?", [id]);
      res.json({ message: "Consent recorded.", consent: presentConsent(row) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/patient/telemedicine-consent", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await ensureTelemedicineConsentsTable();
      const patientId = await loadOwnedId(req.user.id, "patients");
      if (!patientId) return res.status(404).json({ message: "Patient profile not found." });
      const appointmentId = Number(req.query.appointment_id) || null;
      const instantId = Number(req.query.instant_consultation_id) || null;
      const row = await findConsent(patientId, appointmentId, instantId);
      res.json({ consent: presentConsent(row) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/telemedicine-consent/confirm", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      await ensureTelemedicineConsentsTable();
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found." });
      const patientId = Number(req.body.patient_id) || 0;
      if (!patientId) return res.status(422).json({ message: "Patient is required." });
      const { appointmentId, instantId } = idsFromBody(req.body);
      const existing = await findConsent(patientId, appointmentId, instantId);
      const now = new Date();
      if (existing) {
        await update("telemedicine_consents", existing.id, {
          doctor_id: existing.doctor_id || doctorId,
          doctor_confirmed_at: now,
          doctor_confirmed_by: doctorId,
        });
        const row = await one("SELECT * FROM telemedicine_consents WHERE id = ?", [existing.id]);
        return res.json({ message: "Consent confirmed.", consent: presentConsent(row) });
      }
      const id = await insert("telemedicine_consents", {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointmentId,
        instant_consultation_id: instantId,
        form_version: TELEMEDICINE_CONSENT_VERSION,
        method: "doctor_verified",
        doctor_confirmed_at: now,
        doctor_confirmed_by: doctorId,
      });
      const row = await one("SELECT * FROM telemedicine_consents WHERE id = ?", [id]);
      res.json({ message: "Consent confirmed.", consent: presentConsent(row) });
    } catch (error) {
      next(error);
    }
  });
}
