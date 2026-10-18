import { hasColumn, one, pool, q, tableExists } from "./db.js";
import { loadOwnedId } from "./auth.js";
import { kigaliClock } from "./doctor-schedule.js";

/**
 * Visit rules shared by the patient, doctor and payment routes.
 *
 * `status = 'confirmed'` is the settled marker for both visit kinds: an instant
 * row only reaches it through a paid invoice, and an appointment only reaches it
 * through the doctor's confirm step, which already rejects unpaid visits. Keeping
 * that one fact here stops every doctor-facing action from re-deriving it — and
 * production's instant table has no payment_status column to derive it from.
 */

const SETTLED = new Set(["confirmed", "accepted", "in_progress", "completed", "done"]);
const CLOSED = new Set(["expired", "cancelled", "canceled", "declined", "rejected", "no_show"]);
const SLOT_TAKEN = ["booked", "reserved", "held", "unavailable", "blocked", "closed"];

export function clockTime(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function visitIsSettled(row) {
  const status = String(row?.status || "").toLowerCase();
  if (String(row?.payment_status || "").toLowerCase() === "paid") return true;
  if (SETTLED.has(status)) return true;
  // A doctor who charges nothing has no payment to wait for. Only applies when
  // the row actually carries a fee column — instant rows do not, so they can
  // only ever be settled by their status.
  const fee = row?.consultation_fee ?? row?.patient_pays ?? row?.amount_due;
  if (fee != null && fee !== "" && Number(fee) === 0) return true;
  return false;
}

export function visitIsClosed(row) {
  return CLOSED.has(String(row?.status || "").toLowerCase());
}

/** A visit that is neither settled nor finished — the patient has not paid yet. */
export function visitAwaitsPayment(row) {
  return !visitIsSettled(row) && !visitIsClosed(row);
}

/**
 * Kigali wall clock versus the appointment's own date and time. The window opens
 * 20 minutes early and closes duration + 40 minutes after the start, so a doctor
 * running late can still get in but a visit booked for tomorrow cannot.
 */
export function appointmentJoinWindow(appointment, now = new Date()) {
  // Once the doctor has taken the visit, they are waiting in the room; locking
  // the patient out at that point would only strand the call.
  if (["accepted", "in_progress"].includes(String(appointment?.status || "").toLowerCase())) {
    return { ok: true, reason: null };
  }
  const date = String(appointment?.appointment_date || "").slice(0, 10);
  const start = clockTime(appointment?.appointment_time);
  if (!date || !start) return { ok: true, reason: null };
  const kigali = kigaliClock(now);
  if (date !== kigali.date) return { ok: false, reason: "not-today" };
  const [hour, minute] = start.split(":").map(Number);
  const from = hour * 60 + minute;
  const duration = Math.max(5, Number(appointment?.duration_minutes) || 30);
  if (kigali.minutes < from - 20) return { ok: false, reason: "too-early" };
  if (kigali.minutes > from + duration + 40) return { ok: false, reason: "too-late" };
  return { ok: true, reason: null };
}

export function appointmentStartIsInPast(date, time, now = new Date()) {
  const kigali = kigaliClock(now);
  const day = String(date || "").slice(0, 10);
  const start = clockTime(time);
  if (!day || !start) return false;
  if (day < kigali.date) return true;
  if (day > kigali.date) return false;
  const [hour, minute] = start.split(":").map(Number);
  return hour * 60 + minute <= kigali.minutes;
}

export async function patientOwnsAppointment(appointment, user) {
  const profileId = await loadOwnedId(user?.id, "patients");
  return new Set([Number(user?.id), Number(profileId || 0)]).has(Number(appointment?.patient_id));
}

/**
 * Instant rows belong to a signed-up patient through user_id, and to a guest only
 * through the contact details they typed at the payment step.
 */
export async function patientOwnsInstant(row, user) {
  if (!row || !user) return false;
  if (Number(row.user_id) === Number(user.id)) return true;
  const profileId = await loadOwnedId(user.id, "patients");
  if (profileId && Number(row.patient_id) === Number(profileId)) return true;
  const email = String(user.email || "").trim().toLowerCase();
  const phone = String(user.phone || "").trim();
  const rowEmail = String(row.guest_email || "").trim().toLowerCase();
  const rowPhone = String(row.guest_phone || "").trim();
  return Boolean((email && rowEmail && email === rowEmail) || (phone && rowPhone && phone === rowPhone));
}

export async function doctorOwnsVisit(row, user) {
  if (!row || !user) return false;
  const doctorId = await loadOwnedId(user.id, "doctors");
  return Boolean(doctorId) && Number(row.doctor_id) === Number(doctorId);
}

export const VISIT_TABLES = new Set(["appointments", "instant_consultation_requests", "instant_consultations"]);
export const DOCTOR_WORK_STATUSES = new Set(["accepted", "confirmed", "in_progress", "completed"]);

/**
 * The generic /:scope/:resource routes serve every table, but a visit row is not
 * ordinary data: it carries a room token and a payment state. Only the owning
 * side may read or move it, so one check covers all of those route shapes.
 */
export async function visitOpenTo(scope, table, row, user) {
  if (!VISIT_TABLES.has(table) || !row) return true;
  if (scope === "patient") {
    return (await patientOwnsAppointment(row, user)) || (await patientOwnsInstant(row, user));
  }
  if (scope === "doctor") return doctorOwnsVisit(row, user);
  return true;
}

/** Fields no caller may set on a visit with a plain record update. */
export function visitBodyGuard(scope, table, body) {
  if (!VISIT_TABLES.has(table) || !["patient", "doctor"].includes(scope)) return body;
  const safe = { ...body };
  for (const key of ["id", "status", "payment_status", "consultation_fee", "patient_pays", "amount", "doctor_id", "patient_id", "user_id"]) {
    delete safe[key];
  }
  return safe;
}

/**
 * Looks up the slot the patient is trying to book. Slots only exist for doctors
 * who publish availability, so a missing slot is not a reason to refuse a booking;
 * a slot that exists and is already taken is.
 */
export async function bookableSlot(doctorId, date, time) {
  if (!(await tableExists("appointment_slots"))) return { found: false };
  const day = String(date || "").slice(0, 10);
  const start = clockTime(time);
  if (!day || !start) return { found: false };
  const rows = await q(
    "SELECT * FROM appointment_slots WHERE doctor_id = ? AND DATE(slot_date) = ? ORDER BY start_time",
    [doctorId, day],
  ).catch(() => []);
  const slot = rows.find((row) => clockTime(row.start_time) === start);
  if (!slot) return { found: false };
  const status = String(slot.status || "").toLowerCase();
  const active = slot.is_active == null || slot.is_active === true || Number(slot.is_active) === 1;
  const open = !status || !SLOT_TAKEN.includes(status);
  return { found: true, slot, bookable: open && active };
}

/** An appointment already open in the same doctor/date/time is a double booking. */
export async function appointmentCollision(doctorId, date, time, exceptId = null) {
  const day = String(date || "").slice(0, 10);
  const start = clockTime(time);
  if (!day || !start) return null;
  const rows = await q(
    `SELECT id, status, appointment_time FROM appointments
     WHERE doctor_id = ? AND DATE(appointment_date) = ?
       AND status NOT IN ('cancelled','canceled','expired','declined','rejected','no_show')`,
    [doctorId, day],
  ).catch(() => []);
  return rows.find(
    (row) => clockTime(row.appointment_time) === start && Number(row.id) !== Number(exceptId || 0),
  ) || null;
}

/**
 * Marks a slot taken only if it is still open, so two patients racing for the
 * same minute cannot both get in.
 * Returns true (taken by us), false (somebody else won) or null (the slot table
 * refused the write, e.g. an enum without 'booked') — callers must not lose a
 * paid booking over a slot bookkeeping failure, so null means "carry on".
 */
export async function claimSlot(slotId, appointmentId) {
  if (!slotId || !(await tableExists("appointment_slots"))) return null;
  const link = await hasColumn("appointment_slots", "appointment_id");
  const sets = ["status = 'booked'"];
  const values = [];
  if (link) {
    sets.push("appointment_id = ?");
    values.push(appointmentId);
  }
  let result = null;
  try {
    [result] = await pool.query(
      `UPDATE appointment_slots SET ${sets.join(", ")}
       WHERE id = ? AND (status IS NULL OR status NOT IN (${SLOT_TAKEN.map(() => "?").join(",")}))`,
      [...values, slotId, ...SLOT_TAKEN],
    );
  } catch {
    return null;
  }
  if (Number(result?.affectedRows || 0) > 0) return true;
  if (!link) return false;
  // This appointment already holds the slot (re-confirm, reschedule back onto it).
  return Boolean(await one(
    "SELECT id FROM appointment_slots WHERE id = ? AND appointment_id = ?",
    [slotId, appointmentId],
  ).catch(() => null));
}

/** Puts a slot back on the shelf when its appointment is cancelled, expired or moved. */
export async function releaseSlot(appointment) {
  if (!appointment?.id || !(await tableExists("appointment_slots"))) return;
  const link = await hasColumn("appointment_slots", "appointment_id");
  const date = String(appointment.appointment_date || "").slice(0, 10);
  const start = clockTime(appointment.appointment_time);
  const matches = [];
  const params = [];
  if (link) {
    matches.push("appointment_id = ?");
    params.push(appointment.id);
  }
  if (date && start && appointment.doctor_id) {
    matches.push("(doctor_id = ? AND DATE(slot_date) = ? AND TIME(start_time) = ?)");
    params.push(appointment.doctor_id, date, `${start}:00`);
  }
  if (!matches.length) return;
  const clear = link ? "appointment_id = NULL, " : "";
  await pool.query(
    `UPDATE appointment_slots SET ${clear}status = 'available'
     WHERE (${matches.join(" OR ")}) AND status IN ('booked','reserved','held')`,
    params,
  ).catch(() => null);
}
