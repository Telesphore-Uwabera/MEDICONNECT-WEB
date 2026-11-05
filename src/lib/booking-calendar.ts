export interface CalendarSlot {
  slot_date?: string;
  start_time: string;
  status?: string | null;
}

export function kigaliDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function kigaliMinutes(now = new Date()): number {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kigali",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hour, minute] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatLocalDate(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

function startMinutes(value: string): number | null {
  const [hour, minute] = String(value || "").split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function slotIsBookable(slot: CalendarSlot, today: string, minutes: number): boolean {
  const status = String(slot.status || "").toLowerCase();
  if (status && status !== "available" && status !== "open") return false;
  const date = String(slot.slot_date || "").slice(0, 10);
  if (date && date < today) return false;
  if (!date || date === today) {
    const start = startMinutes(slot.start_time);
    if (start == null || start <= minutes) return false;
  }
  return true;
}

export function bookableDates(
  slots: Record<string, CalendarSlot[]>,
  now = new Date(),
): string[] {
  const today = kigaliDate(now);
  const minutes = kigaliMinutes(now);
  return Object.keys(slots)
    .filter((date) => (slots[date] || []).some((slot) =>
      slotIsBookable({ ...slot, slot_date: slot.slot_date || date }, today, minutes)))
    .sort();
}

/** Current Kigali month, or the month of the first upcoming opening when that is later. */
export function initialCalendarMonth(bookable: string[], now = new Date()): Date {
  const today = kigaliDate(now);
  const [year, month] = today.split("-").map(Number);
  const current = new Date(year, month - 1, 1);
  const first = bookable.find((date) => date >= today);
  if (!first) return current;
  const opened = parseIsoDate(first);
  const openedMonth = new Date(opened.getFullYear(), opened.getMonth(), 1);
  return openedMonth < current ? current : openedMonth;
}

export type CalendarDayKind = "past" | "open" | "none";

export function calendarDayKind(date: string, bookable: Set<string>, today: string): CalendarDayKind {
  if (date < today) return "past";
  if (bookable.has(date)) return "open";
  return "none";
}
