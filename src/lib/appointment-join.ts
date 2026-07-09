export const APPOINTMENT_JOIN_WINDOW_MINUTES = 10;

export interface JoinableAppointment {
  appointment_date?: string | null;
  appointment_time?: string | null;
  duration_minutes?: number | null;
  status?: string | null;
  can_join?: boolean | null;
}

function getAppointmentStartMs(appointment: JoinableAppointment) {
  if (!appointment.appointment_date || !appointment.appointment_time) return null;

  const normalizedTime =
    appointment.appointment_time.length <= 5
      ? `${appointment.appointment_time}:00`
      : appointment.appointment_time;
  const parsed = new Date(`${appointment.appointment_date}T${normalizedTime}`).getTime();

  return Number.isNaN(parsed) ? null : parsed;
}

export function canJoinAppointment(
  appointment: JoinableAppointment,
  nowMs = Date.now(),
) {
  if (typeof appointment.can_join === "boolean") return appointment.can_join;
  if (appointment.status === "in_progress") return true;
  if (appointment.status !== "confirmed") return false;

  const startMs = getAppointmentStartMs(appointment);
  if (startMs == null) return false;

  const opensMs = startMs - APPOINTMENT_JOIN_WINDOW_MINUTES * 60_000;
  const closesMs = startMs + (appointment.duration_minutes ?? 60) * 60_000;

  return nowMs >= opensMs && nowMs <= closesMs;
}
