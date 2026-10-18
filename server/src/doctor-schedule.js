import { hasColumn, one, q, tableExists, update } from "./db.js";

export function kigaliClock(dateInput = new Date()) {
  const now = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Kigali",
    weekday: "long",
  }).format(now).toLowerCase();
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kigali",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hour, minute] = time.split(":");
  return { date, weekday, minutes: Number(hour) * 60 + Number(minute) };
}

export function clockMinutes(value) {
  const [hour, minute] = String(value || "").split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function timeCovers(start, end, minutes) {
  const from = clockMinutes(start);
  const to = clockMinutes(end);
  if (from == null || to == null || to <= from) return false;
  return minutes >= from && minutes < to;
}

export function listedDays(value) {
  if (Array.isArray(value)) return value.map((day) => String(day).toLowerCase());
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((day) => String(day).toLowerCase());
    } catch {
      return value.split(",").map((day) => day.trim().toLowerCase()).filter(Boolean);
    }
  }
  return [];
}

export function dayListed(value, weekday) {
  const days = listedDays(value);
  if (!days.length) return true;
  return days.some((day) => day === weekday || day.startsWith(weekday.slice(0, 3)) || weekday.startsWith(day.slice(0, 3)));
}

export function onlineVisit(type) {
  const value = String(type || "").toLowerCase();
  return !value || value === "online" || value === "both" || value === "instant";
}

/**
 * Checks whether a doctor currently has an active, open consultation slot or period
 * covering right now in Kigali time zone.
 */
export async function doctorOnInstantSchedule(doctorId) {
  if (!doctorId) return false;
  const now = kigaliClock();

  // 1. Check appointment_slots for today
  if (await tableExists("appointment_slots")) {
    const slots = await q(
      `SELECT start_time, end_time, type, status
       FROM appointment_slots
       WHERE doctor_id = ? AND slot_date = ?
         AND (is_active = 1 OR is_active IS NULL)`,
      [doctorId, now.date],
    ).catch(() => []);
    if (slots.length) {
      return slots.some((slot) => {
        const status = String(slot.status || "").toLowerCase();
        const open = !status || status === "available" || status === "open";
        return open && onlineVisit(slot.type) && timeCovers(slot.start_time, slot.end_time, now.minutes);
      });
    }
  }

  // 2. Check doctor_availability_periods covering today
  if (await tableExists("doctor_availability_periods")) {
    const periods = await q(
      `SELECT start_time, end_time, type, days_of_week
       FROM doctor_availability_periods
       WHERE doctor_id = ?
         AND (is_active = 1 OR is_active IS NULL)
         AND (deleted_at IS NULL OR deleted_at > NOW())
         AND ? BETWEEN DATE(from_date) AND DATE(to_date)`,
      [doctorId, now.date],
    ).catch(() => []);
    if (periods.length) {
      return periods.some((period) =>
        dayListed(period.days_of_week, now.weekday)
        && onlineVisit(period.type)
        && timeCovers(period.start_time, period.end_time, now.minutes));
    }
  }

  // 3. Check recurring doctor_availabilities for current weekday
  if (await tableExists("doctor_availabilities")) {
    const recurring = await q(
      `SELECT start_time, end_time, type, day_of_week
       FROM doctor_availabilities
       WHERE doctor_id = ?
         AND (is_active = 1 OR is_active IS NULL)
         AND (deleted_at IS NULL OR deleted_at > NOW())`,
      [doctorId],
    ).catch(() => []);
    if (recurring.length) {
      return recurring.some((r) =>
        dayListed(r.day_of_week, now.weekday)
        && onlineVisit(r.type)
        && timeCovers(r.start_time, r.end_time, now.minutes));
    }
  }

  return false;
}

/**
 * Automatically disables instant consultation for any doctor who currently has
 * instant_consultation = 1 but is outside their consultation hours.
 * Note: NEVER turns instant consultation on automatically; only the doctor can turn it on.
 */
export async function autoDisableInstantOutsideSchedule() {
  if (!(await tableExists("doctors")) || !(await hasColumn("doctors", "instant_consultation"))) return;

  const instantDoctors = await q(
    "SELECT id FROM doctors WHERE instant_consultation = 1 AND (deleted_at IS NULL OR deleted_at > NOW())",
  ).catch(() => []);

  if (!instantDoctors.length) return;

  for (const { id: doctorId } of instantDoctors) {
    const onSchedule = await doctorOnInstantSchedule(doctorId);
    if (!onSchedule) {
      await update("doctors", doctorId, { instant_consultation: 0 }).catch(() => null);
      console.info(`[autoDisable] Automatically disabled instant consultation for doctor ${doctorId} — outside consultation hours`);
    }
  }
}
