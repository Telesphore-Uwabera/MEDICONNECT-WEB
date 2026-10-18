import type { ApiDoctor } from "@/hooks/patient/use-patient-doctor";

export interface ScheduleWindow {
  day_of_week?: string;
  days_of_week?: string[];
  from_date?: string;
  to_date?: string;
  start_time?: string;
  end_time?: string;
  type?: string;
  status?: string;
  slot_date?: string;
  is_active?: boolean | number;
  deleted_at?: string | null;
}

export interface PublicDoctorSchedule {
  recurring_availability?: ScheduleWindow[];
  availability_periods?: ScheduleWindow[];
  slots_for_date?: ScheduleWindow[];
}

function kigaliNow(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Kigali",
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    weekday: String(parts.weekday ?? "").toLowerCase(),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function toMinutes(value?: string) {
  if (!value) return null;
  const [hour, minute] = value.split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function coversNow(start: string | undefined, end: string | undefined, minutes: number) {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from == null || to == null) return false;
  if (to > from) return minutes >= from && minutes < to;
  return minutes >= from || minutes < to;
}

function weekdays(window: ScheduleWindow) {
  const raw = window.days_of_week as unknown;
  if (Array.isArray(raw)) return raw.map((day) => String(day).toLowerCase());
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((day) => String(day).toLowerCase());
    } catch {
      return raw.split(",").map((day) => day.trim().toLowerCase()).filter(Boolean);
    }
  }
  return [];
}

function sameDay(stored: string, weekday: string) {
  return stored === weekday || stored.startsWith(weekday.slice(0, 3)) || weekday.startsWith(stored.slice(0, 3));
}

function onDate(window: ScheduleWindow, date: string, weekday: string) {
  if (window.slot_date) return String(window.slot_date).slice(0, 10) === date;
  if (window.from_date && window.to_date) {
    const days = weekdays(window);
    const dayOk = days.length === 0 || days.some((day) => sameDay(day, weekday));
    return dayOk && date >= String(window.from_date).slice(0, 10) && date <= String(window.to_date).slice(0, 10);
  }
  return sameDay((window.day_of_week ?? "").toLowerCase(), weekday);
}

function isOnlineVisit(window: ScheduleWindow) {
  const type = (window.type ?? "").toLowerCase();
  if (!type) return true;
  return type === "online" || type === "both" || type === "instant";
}

function isBusy(window: ScheduleWindow) {
  const status = (window.status ?? "").toLowerCase();
  return status === "booked" || status === "reserved" || status === "blocked";
}

function isCurrentWindow(window: ScheduleWindow) {
  if (window.deleted_at) return false;
  if (window.is_active === false || window.is_active === 0) return false;
  return true;
}

export function isDoctorOnInstantSchedule(
  schedule?: PublicDoctorSchedule,
  now = new Date(),
): boolean {
  if (!schedule) return true;
  const kigali = kigaliNow(now);

  const slots = schedule.slots_for_date ?? [];
  if (slots.length > 0) {
    return slots.some(
      (slot) =>
        isCurrentWindow(slot) &&
        !isBusy(slot) &&
        isOnlineVisit(slot) &&
        coversNow(slot.start_time, slot.end_time, kigali.minutes),
    );
  }

  const periods = schedule.availability_periods ?? [];
  const recurring = schedule.recurring_availability ?? [];
  const allWindows = [...periods, ...recurring];

  if (allWindows.length === 0) {
    return false;
  }

  return allWindows.some(
    (win) =>
      isCurrentWindow(win) &&
      !isBusy(win) &&
      isOnlineVisit(win) &&
      onDate(win, kigali.date, kigali.weekday) &&
      coversNow(win.start_time, win.end_time, kigali.minutes),
  );
}

/** Returns true if the doctor currently offers instant consultation.
 *
 * Rule: show the button if and only if doctor.instant_consultation === true,
 * bookings are not paused, and if schedule is loaded, current time is within
 * consultation hours.
 */
export function doctorOffersInstant(
  doctor: Pick<ApiDoctor, "bookings_paused" | "instant_consultation">,
  schedule?: PublicDoctorSchedule,
  now = new Date(),
) {
  if (doctor.bookings_paused || !doctor.instant_consultation) {
    return false;
  }
  if (schedule) {
    return isDoctorOnInstantSchedule(schedule, now);
  }
  return true;
}
