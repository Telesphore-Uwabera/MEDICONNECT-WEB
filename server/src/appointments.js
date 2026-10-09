import crypto from "crypto";
import { hasColumn, insert, one, presentRow, q, tableExists, update } from "./db.js";
import { loadOwnedId } from "./auth.js";
import { doctorIsApproved } from "./doctor-review.js";
import { createIremboInvoice } from "./public.js";
import { notifyAppointmentConfirmed, notifyBookedVisit } from "./visit-notify.js";

export async function doctorOnlineFee(doctorId) {
  const doctor = await one(
    "SELECT consultation_fee, specialization_fee_id, specialization FROM doctors WHERE id = ?",
    [doctorId],
  ).catch(() => null);
  let amount = Number(doctor?.consultation_fee || 0);
  if (!amount && await tableExists("specialization_fees")) {
    const fee = doctor?.specialization_fee_id
      ? await one("SELECT online_fee FROM specialization_fees WHERE id = ?", [doctor.specialization_fee_id]).catch(() => null)
      : await one(
        "SELECT online_fee FROM specialization_fees WHERE sub_specialization = ? ORDER BY id ASC LIMIT 1",
        [doctor?.specialization || ""],
      ).catch(() => null);
    amount = Number(fee?.online_fee || 0);
  }
  return amount;
}

function marks(values) {
  return values.map(() => "?").join(",");
}

export async function decorateAppointments(rows) {
  const single = !Array.isArray(rows);
  const list = (single ? [rows] : rows).filter(Boolean);
  if (!list.length) return single ? null : rows;
  const patientIds = [...new Set(list.map((row) => Number(row.patient_id)).filter(Boolean))];
  const doctorIds = [...new Set(list.map((row) => Number(row.doctor_id)).filter(Boolean))];
  const users = patientIds.length
    ? await q(`SELECT id, name, email, phone, avatar FROM users WHERE id IN (${marks(patientIds)})`, patientIds).catch(() => [])
    : [];
  const profiles = patientIds.length && await tableExists("patients")
    ? await q(
      `SELECT p.id, p.user_id, u.name, u.email, u.phone, u.avatar
       FROM patients p LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id IN (${marks(patientIds)}) OR p.user_id IN (${marks(patientIds)})`,
      [...patientIds, ...patientIds],
    ).catch(() => [])
    : [];
  const doctors = doctorIds.length
    ? await q(
      `SELECT d.id, d.specialization, d.image, d.currency, u.id AS user_id, u.name AS user_name, u.avatar
       FROM doctors d LEFT JOIN users u ON u.id = d.user_id
       WHERE d.id IN (${marks(doctorIds)})`,
      doctorIds,
    ).catch(() => [])
    : [];
  const userById = new Map(users.map((user) => [Number(user.id), user]));
  const profileById = new Map(profiles.map((profile) => [Number(profile.id), profile]));
  const profileByUser = new Map(profiles.filter((profile) => profile.user_id).map((profile) => [Number(profile.user_id), profile]));
  const doctorById = new Map(doctors.map((doctor) => [Number(doctor.id), doctor]));

  for (const row of list) {
    const profile = profileById.get(Number(row.patient_id)) || profileByUser.get(Number(row.patient_id));
    const person = userById.get(Number(row.patient_id))
      || (profile?.user_id ? userById.get(Number(profile.user_id)) : null)
      || profile;
    row.patient = {
      id: Number(row.patient_id) || profile?.id || null,
      name: person?.name || row.guest_name || "Patient",
      email: person?.email || "",
      phone: person?.phone || row.guest_phone || "",
      avatar: person?.avatar || null,
    };
    const doctor = doctorById.get(Number(row.doctor_id));
    if (doctor) {
      row.doctor = {
        id: doctor.id,
        specialization: doctor.specialization || "",
        image: doctor.image || null,
        designations: "",
        doctor_degree: "",
        user: { id: doctor.user_id, name: doctor.user_name || "Doctor", avatar: doctor.avatar || null },
      };
    }
    const stored = Number(row.consultation_fee || 0);
    let fee = stored || Number(row.patient_pays || 0);
    if (!(fee > 0)) fee = await doctorOnlineFee(row.doctor_id);
    row.currency = row.currency || doctor?.currency || "RWF";
    row.booking_type = row.booking_type || "scheduled";
    if (row.insurance_covered == null) row.insurance_covered = "0.00";
    if (fee > 0) {
      row.consultation_fee = Number(fee).toFixed(2);
      if (!(Number(row.patient_pays) > 0)) row.patient_pays = Number(fee).toFixed(2);
      const unpaid = String(row.payment_status || "unpaid").toLowerCase() !== "paid";
      const open = ["pending", "payment_pending", ""].includes(String(row.status || "").toLowerCase());
      if (!(stored > 0) && unpaid && open) {
        await update("appointments", row.id, {
          consultation_fee: fee,
          patient_pays: fee,
          insurance_covered: Number(row.insurance_covered || 0),
          currency: row.currency,
          payment_status: row.payment_status || "unpaid",
        }).catch(() => null);
      }
    }
  }
  return single ? list[0] : rows;
}

async function payer(userId) {
  return one("SELECT id, name, email, phone FROM users WHERE id = ?", [userId]).catch(() => null);
}

export function attachAppointmentRoutes(router, { requireAuth, requireRole }) {
  router.post("/patient/appointments", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const body = req.body ?? {};
      const doctorId = Number(body.doctor_id);
      if (!doctorId || !body.appointment_date || !body.appointment_time) {
        return res.status(422).json({ message: "Choose a doctor, date, and time." });
      }
      const doctor = await one("SELECT * FROM doctors WHERE id = ?", [doctorId]);
      if (!doctor || !doctorIsApproved(doctor.status)) {
        return res.status(422).json({ message: "This doctor is not available for appointments yet." });
      }
      const amount = await doctorOnlineFee(doctorId);
      const id = await insert("appointments", {
        doctor_id: doctorId,
        patient_id: req.user.id,
        type: body.type || "online",
        status: "pending",
        booking_type: "scheduled",
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        duration_minutes: Number(body.duration_minutes) || 30,
        consultation_fee: amount,
        insurance_covered: 0,
        patient_pays: amount,
        currency: "RWF",
        payment_status: "unpaid",
      });
      const row = await decorateAppointments(await presentRow("appointments", await one("SELECT * FROM appointments WHERE id = ?", [id])));
      notifyBookedVisit({ ...row, patient_id: req.user.id, doctor_id: doctorId, patient_pays: amount, consultation_fee: amount }).catch(() => null);
      res.status(201).json({
        message: amount > 0
          ? "Appointment reserved. Pay before the doctor can confirm it."
          : "Appointment reserved.",
        id,
        amount,
        data: row,
        ...(row ?? {}),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/patient/appointments/:id/pay", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      const ownerProfile = await loadOwnedId(req.user.id, "patients");
      const ownerIds = new Set([Number(req.user.id), Number(ownerProfile || 0)]);
      if (!ownerIds.has(Number(appointment.patient_id))) {
        return res.status(403).json({ message: "This appointment belongs to another patient." });
      }
      if (String(appointment.payment_status || "").toLowerCase() === "paid") {
        return res.json({ message: "This appointment is already paid.", status: "paid", already_paid: true });
      }
      let amount = Number(appointment.consultation_fee || appointment.patient_pays || 0);
      if (!(amount > 0)) amount = await doctorOnlineFee(appointment.doctor_id);
      if (!(amount > 0)) return res.status(422).json({ message: "This appointment has no payable fee." });
      const user = await payer(req.user.id);
      const paymentUuid = crypto.randomUUID();
      const created = await createIremboInvoice({
        transactionId: paymentUuid,
        amount,
        customer: {
          name: user?.name || "Patient",
          email: user?.email || "",
          phone: user?.phone || "",
        },
        description: `Appointment ${appointment.id}`,
      });
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      await insert("payments", {
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        payable_type: "appointment",
        payable_id: appointment.id,
        invoice_number: created.invoiceNumber,
        transaction_id: paymentUuid,
        idempotency_key: paymentUuid,
        amount,
        currency: appointment.currency || "RWF",
        status: "pending",
        description: `Appointment ${appointment.id}`,
        expires_at: expiresAt,
        uuid: paymentUuid,
        payment_uuid: paymentUuid,
      });
      if (!(Number(appointment.consultation_fee) > 0)) {
        await update("appointments", appointment.id, {
          consultation_fee: amount,
          patient_pays: amount,
          currency: appointment.currency || "RWF",
          payment_status: appointment.payment_status || "unpaid",
        }).catch(() => null);
      }
      res.json({
        message: "Payment started.",
        invoice_number: created.invoiceNumber,
        public_key: created.publicKey,
        amount,
        currency: appointment.currency || "RWF",
        payment_uuid: paymentUuid,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/appointments/:id/confirm", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      if (Number(appointment.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This appointment belongs to another doctor." });
      }
      if (["cancelled", "canceled", "expired", "completed", "declined"].includes(String(appointment.status || ""))) {
        return res.status(422).json({ message: "This appointment can no longer be confirmed." });
      }
      const fee = Number(appointment.consultation_fee || appointment.patient_pays || 0) || await doctorOnlineFee(appointment.doctor_id);
      const paid = String(appointment.payment_status || "").toLowerCase() === "paid";
      if (!paid && fee > 0) {
        return res.status(422).json({ message: "The patient must pay before you can confirm this appointment." });
      }
      if (String(appointment.status || "") !== "confirmed") {
        const patch = { status: "confirmed" };
        if (await hasColumn("appointments", "confirmed_at")) patch.confirmed_at = new Date();
        await update("appointments", appointment.id, patch);
      }
      const updated = await one("SELECT * FROM appointments WHERE id = ?", [appointment.id]);
      const row = await decorateAppointments(await presentRow("appointments", updated));
      if (String(appointment.status || "") !== "confirmed") notifyAppointmentConfirmed(updated).catch(() => null);
      res.json({ message: "Appointment confirmed.", appointment: row, data: row });
    } catch (error) {
      next(error);
    }
  });
}
