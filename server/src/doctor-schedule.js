import { one, q, tableExists } from "./db.js";

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

/** A doctor tab must check in at least this often or instant consultation turns off. */
export const INSTANT_HEARTBEAT_MS = 3 * 60 * 1000;

/**
 * Turns instant consultation off only. A live logout always does.
 * An expired token does too, unless another unexpired token is still signed in.
 */
export function shouldDisableInstantOnLogout({ expired = false, otherValidTokens = 0 } = {}) {
  if (!expired) return true;
  return Number(otherValidTokens) <= 0;
}

/** True when the doctor has not been seen inside the heartbeat window. */
export function instantSeenIsStale(seenAt, now = Date.now(), staleMs = INSTANT_HEARTBEAT_MS) {
  if (seenAt == null || seenAt === "") return true;
  const ms = new Date(seenAt).getTime();
  if (Number.isNaN(ms)) return true;
  return now - ms >= staleMs;
}

/** Only sets instant_consultation to 0. Never turns it on. */
export const TURN_OFF_STALE_INSTANT_SQL = `UPDATE doctors
 SET instant_consultation = 0
 WHERE instant_consultation = 1
   AND (instant_seen_at IS NULL OR instant_seen_at < DATE_SUB(NOW(), INTERVAL 3 MINUTE))`;

let warnedMissingSeenColumn = false;

/**
 * Turns instant consultation off for doctors who still have it on and have
 * not sent a heartbeat for about 3 minutes. Never turns it on.
 * If instant_seen_at does not exist yet, this does nothing and warns once.
 */
export async function autoDisableInstantOutsideSchedule() {
  try {
    const { hasColumn, pool } = await import("./db.js");
    if (!(await tableExists("doctors"))) return { disabled: 0, missingColumn: false };
    if (!(await hasColumn("doctors", "instant_consultation"))) return { disabled: 0, missingColumn: false };
    if (!(await hasColumn("doctors", "instant_seen_at"))) {
      if (!warnedMissingSeenColumn) {
        warnedMissingSeenColumn = true;
        console.warn("[instant] doctors.instant_seen_at is missing. Apply server/sql/2026-11-23-doctor-instant-seen.sql after the owner approves it. Idle doctors stay instant-on until that column exists.");
      }
      return { disabled: 0, missingColumn: true };
    }
    const result = await pool.query(TURN_OFF_STALE_INSTANT_SQL);
    const header = Array.isArray(result) ? result[0] : result;
    return { disabled: Number(header?.affectedRows || 0), missingColumn: false };
  } catch (error) {
    console.error("[instant] could not turn off stale instant consultations", error?.message || error);
    return { disabled: 0, missingColumn: false };
  }
}

/** Records that this doctor's dashboard is still open. No-op if the column is absent. */
export async function touchDoctorPresence(userId) {
  try {
    const { hasColumn, update } = await import("./db.js");
    const { loadOwnedId } = await import("./auth.js");
    if (!(await hasColumn("doctors", "instant_seen_at"))) return false;
    const doctorId = await loadOwnedId(userId, "doctors");
    if (!doctorId) return false;
    await update("doctors", doctorId, { instant_seen_at: new Date() });
    return true;
  } catch (error) {
    console.error("[instant] could not record doctor presence", error?.message || error);
    return false;
  }
}

/** Last explicit logout turns the doctor's instant flag off. Login and password change do not. */
export async function disableInstantOnLogout(userId) {
  try {
    const { loadOwnedId } = await import("./auth.js");
    const { hasColumn, update } = await import("./db.js");
    const doctorId = await loadOwnedId(userId, "doctors");
    if (!doctorId || !(await hasColumn("doctors", "instant_consultation"))) return;
    await update("doctors", doctorId, { instant_consultation: 0 });
  } catch (error) {
    console.error("[logout] could not turn off instant consultations", error?.message || error);
  }
}
