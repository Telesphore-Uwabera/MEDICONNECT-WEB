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

/** Instant consultation is offered only while the doctor's own schedule is open.
 *
 * Logic:
 * - Returns false immediately if doctor.instant_consultation is off or bookings paused.
 * - If no schedule data has loaded yet (schedule === undefined), returns true as a
 *   temporary optimistic state — the button will disappear once schedule loads if
 *   the doctor is outside hours.
 * - If schedule is loaded but has NO slots/windows at all, trust the flag (doctor
 *   may not use the slot system but has instant on).
 * - If schedule has slots/windows for today, at least one must cover the current
 *   Kigali time for the button to show.
 */
export function doctorOffersInstant(
  doctor: Pick<ApiDoctor, "bookings_paused" | "instant_consultation">,
  schedule: PublicDoctorSchedule | undefined,
  now = new Date(),
) {
  if (doctor.bookings_paused || !doctor.instant_consultation) return false;

  // Schedule hasn't loaded yet — optimistically show the button (loading state)
  if (!schedule) return true;

  const { weekday, date, minutes } = kigaliNow(now);

  // Check slots_for_date first (most precise — actual generated slots for today)
  const todaySlots = (schedule.slots_for_date ?? []).filter(isCurrentWindow);
  if (todaySlots.length > 0) {
    // Slots exist for today — at least one must cover now and be available
    return todaySlots.some(
      (s) => !isBusy(s) && coversNow(s.start_time, s.end_time, minutes) && isOnlineVisit(s),
    );
  }

  // No slots for today — check recurring + period windows
  const windows = [
    ...(schedule.recurring_availability ?? []),
    ...(schedule.availability_periods ?? []),
  ];

  if (windows.length === 0) {
    // No schedule configured at all — trust the flag (doctor doesn't use slots)
    return true;
  }

  // Windows exist — check if current time falls inside one
  return windows.some(
    (window) =>
      isCurrentWindow(window) &&
      !isBusy(window) &&
      onDate(window, date, weekday) &&
      coversNow(window.start_time, window.end_time, minutes) &&
      isOnlineVisit(window),
  );
}
