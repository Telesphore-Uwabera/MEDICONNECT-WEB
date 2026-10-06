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

function onDate(window: ScheduleWindow, date: string, weekday: string) {
  if (window.slot_date) return window.slot_date.slice(0, 10) === date;
  if (window.from_date && window.to_date) {
    const dayOk = !window.days_of_week?.length
      || window.days_of_week.some((day) => day.toLowerCase() === weekday);
    return dayOk && date >= window.from_date.slice(0, 10) && date <= window.to_date.slice(0, 10);
  }
  return (window.day_of_week ?? "").toLowerCase() === weekday;
}

function isOnlineVisit(window: ScheduleWindow) {
  const type = (window.type ?? "").toLowerCase();
  return type === "online" || type === "both";
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

/** Both card buttons show when Instant Consultation is on, or while an online schedule window says the doctor is present. */
export function doctorOffersInstant(
  doctor: Pick<ApiDoctor, "bookings_paused" | "instant_consultation">,
  schedule: PublicDoctorSchedule | undefined,
  now = new Date(),
) {
  if (doctor.bookings_paused) return false;
  if (doctor.instant_consultation) return true;
  if (!schedule) return false;

  const { weekday, date, minutes } = kigaliNow(now);
  const windows = [
    ...(schedule.recurring_availability ?? []),
    ...(schedule.availability_periods ?? []),
    ...(schedule.slots_for_date ?? []),
  ];
  const active = windows.filter(
    (window) =>
      isCurrentWindow(window) &&
      onDate(window, date, weekday) &&
      coversNow(window.start_time, window.end_time, minutes),
  );
  if (active.length === 0 || active.some(isBusy)) return false;
  return active.some(isOnlineVisit);
}
