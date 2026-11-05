import { clockMinutes, dayListed } from "./doctor-schedule.js";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function addIsoDays(iso, days) {
  const cursor = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}

export function eachIsoDate(from, to, limit = 120) {
  const dates = [];
  const start = String(from || "").slice(0, 10);
  const end = String(to || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return dates;
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last && dates.length < limit) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function weekdayName(iso) {
  return WEEKDAYS[new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).getUTCDay()];
}

export function clockFromMinutes(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

export function slotDate(row) {
  return String(row?.slot_date || "").slice(0, 10);
}

export function slotIsOpen(row) {
  const status = String(row?.status || "").toLowerCase();
  const active = row?.is_active == null || row?.is_active === true || Number(row.is_active) === 1;
  if (!active || row?.deleted_at) return false;
  return !status || status === "available" || status === "open";
}

/** A slot can still be booked when its start is strictly after the Kigali clock. */
export function slotIsUpcoming(row, now) {
  const date = slotDate(row);
  if (!date || date < now.date) return false;
  if (date > now.date) return true;
  const start = clockMinutes(row.start_time);
  if (start == null) return false;
  return start > now.minutes;
}

function windowActive(window) {
  if (!window || window.deleted_at) return false;
  if (window.is_active === false || window.is_active === 0 || window.is_active === "0") return false;
  return true;
}

function generateWindows(windows, { from, to, existingDates, idPrefix }) {
  const created = [];
  for (const window of windows) {
    if (!windowActive(window)) continue;
    const start = clockMinutes(window.start_time);
    const end = clockMinutes(window.end_time);
    const duration = Math.max(5, Number(window.slot_duration_minutes) || 30);
    const step = duration + Math.max(0, Number(window.buffer_minutes) || 0);
    if (start == null || end == null || end <= start) continue;
    const rangeFrom = String(window.from_date || from).slice(0, 10);
    const rangeTo = String(window.to_date || to).slice(0, 10);
    const first = rangeFrom > from ? rangeFrom : from;
    const last = rangeTo < to ? rangeTo : to;
    for (const date of eachIsoDate(first, last)) {
      if (existingDates.has(date)) continue;
      if (!dayListed(window.days_of_week ?? window.day_of_week, weekdayName(date))) continue;
      for (let minute = start; minute + duration <= end; minute += step) {
        created.push({
          id: `${idPrefix}-${window.id ?? "rule"}-${date}-${minute}`,
          slot_date: date,
          start_time: clockFromMinutes(minute),
          end_time: clockFromMinutes(minute + duration),
          duration_minutes: duration,
          type: window.type || "online",
          hospital_id: window.hospital_id ?? null,
          status: "available",
          source: idPrefix,
        });
      }
    }
  }
  return created;
}

/**
 * Patient booking calendar payload.
 *
 * Historical slot rows must not crowd out the future: only dates from `from`
 * (Kigali today, unless the caller asked for a later day) through `to` are
 * returned, past times today are dropped, and an active schedule period or
 * weekly rule fills days that were never generated into appointment_slots.
 */
export function upcomingPublicSlots({ rows = [], periods = [], recurring = [], now, from, to }) {
  const start = from && from > now.date ? from : now.date;
  const end = to && to >= start ? to : start;
  const kept = [];
  const existingDates = new Set();
  for (const row of rows) {
    const date = slotDate(row);
    if (!date || date < start || date > end) continue;
    existingDates.add(date);
    if (slotIsOpen(row) && slotIsUpcoming(row, now)) kept.push(row);
  }
  const synthesized = [
    ...generateWindows(periods, { from: start, to: end, existingDates, idPrefix: "period" }),
    ...generateWindows(recurring, { from: start, to: end, existingDates, idPrefix: "weekly" }),
  ].filter((row) => slotIsUpcoming(row, now));
  const all = [...kept, ...synthesized].sort((a, b) => {
    const byDate = slotDate(a).localeCompare(slotDate(b));
    if (byDate) return byDate;
    return String(a.start_time).localeCompare(String(b.start_time));
  });
  const grouped = {};
  for (const row of all) {
    const key = slotDate(row);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }
  return {
    slots: grouped,
    dates: Object.keys(grouped).sort(),
    total: all.length,
  };
}
