export const APPOINTMENT_JOIN_EARLY_MINUTES = 20;
export const APPOINTMENT_JOIN_LATE_MINUTES = 40;
export const APPOINTMENT_JOIN_WINDOW_MINUTES = APPOINTMENT_JOIN_EARLY_MINUTES;

export interface JoinableAppointment {
  appointment_date?: string | null;
  appointment_time?: string | null;
  duration_minutes?: number | null;
  status?: string | null;
  payment_status?: string | null;
  consultation_fee?: number | string | null;
  patient_pays?: number | string | null;
  amount_due?: number | string | null;
  can_join?: boolean | null;
  /** A paid instant consult can be joined immediately. */
  instant?: boolean | null;
}

const PAID = new Set(["paid", "completed", "success", "successful"]);
const LEGACY_PAID = new Set(["confirmed", "accepted", "in_progress", "completed", "done"]);
const CLOSED = new Set(["expired", "cancelled", "canceled", "declined", "rejected", "no_show"]);
const FINISHED = new Set(["completed", "done"]);

function kigaliClock(now: Date) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kigali",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hour, minute] = time.split(":");
  return { date, minutes: Number(hour) * 60 + Number(minute) };
}

function clockTime(value?: string | null) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function isPaid(appointment: JoinableAppointment) {
  const fee = appointment.consultation_fee ?? appointment.patient_pays ?? appointment.amount_due;
  if (fee != null && fee !== "" && Number(fee) === 0) return true;
  const raw = appointment.payment_status;
  const payment = String(raw || "").toLowerCase();
  if (PAID.has(payment)) return true;
  if (raw != null && String(raw).trim() !== "") return false;
  return LEGACY_PAID.has(String(appointment.status || "").toLowerCase());
}

/**
 * Same window as the server: 20 minutes before the slot until
 * start + duration + 40 minutes, on the booked Kigali day.
 * A paid instant consult is joinable at once.
 */
export function canJoinAppointment(
  appointment: JoinableAppointment,
  nowMs = Date.now(),
) {
  const status = String(appointment.status || "").toLowerCase();
  if (CLOSED.has(status) || FINISHED.has(status)) return false;
  if (!isPaid(appointment)) return false;
  if (appointment.instant) return true;

  const date = String(appointment.appointment_date || "").slice(0, 10);
  const start = clockTime(appointment.appointment_time);
  if (!date || !start) return false;
  const kigali = kigaliClock(new Date(nowMs));
  if (date !== kigali.date) return false;
  const from = start.hour * 60 + start.minute;
  const duration = Math.max(5, Number(appointment.duration_minutes) || 30);
  if (kigali.minutes < from - APPOINTMENT_JOIN_EARLY_MINUTES) return false;
  if (kigali.minutes > from + duration + APPOINTMENT_JOIN_LATE_MINUTES) return false;
  return true;
}
