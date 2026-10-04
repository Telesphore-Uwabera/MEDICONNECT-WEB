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

/** Instant Consultation is offered only while the doctor is online and free. */
export function doctorOffersInstant(
  doctor: Pick<ApiDoctor, "is_available" | "bookings_paused" | "instant_consultation" | "consultation_type">,
  schedule: PublicDoctorSchedule | undefined,
  now = new Date(),
) {
  if (doctor.bookings_paused) return false;

  const { weekday, date, minutes } = kigaliNow(now);
  const windows = [
    ...(schedule?.recurring_availability ?? []),
    ...(schedule?.availability_periods ?? []),
    ...(schedule?.slots_for_date ?? []),
  ];
  const hasSchedule = windows.length > 0;

  if (hasSchedule) {
    const active = windows.filter(
      (window) => onDate(window, date, weekday) && coversNow(window.start_time, window.end_time, minutes),
    );
    const inMeeting = active.some((window) => {
      const status = (window.status ?? "").toLowerCase();
      return status === "booked" || status === "reserved" || status === "blocked";
    });
    if (inMeeting) return false;
    return active.some((window) => (window.type ?? "").toLowerCase() === "online");
  }

  if (!doctor.is_available) return false;
  const type = (doctor.consultation_type ?? "").toLowerCase();
  return type === "online" || type === "both" || doctor.instant_consultation === true;
}
