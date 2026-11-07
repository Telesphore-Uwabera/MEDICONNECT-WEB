import { describe, expect, it } from "vitest";
import { upcomingPublicSlots } from "./booking-calendar.js";
import { kigaliClock } from "./doctor-schedule.js";

const NOW = new Date("2026-11-04T08:00:00Z"); // 10:00 in Kigali

function octoberRows() {
  const rows = [];
  for (let day = 6; day <= 24; day += 1) {
    for (let hour = 8; hour < 20; hour += 1) {
      rows.push({
        id: day * 100 + hour,
        slot_date: `2026-10-${String(day).padStart(2, "0")}`,
        start_time: `${String(hour).padStart(2, "0")}:00:00`,
        end_time: `${String(hour).padStart(2, "0")}:30:00`,
        status: "available",
      });
    }
  }
  return rows;
}

describe("upcomingPublicSlots", () => {
  it("reads Kigali wall time, not UTC", () => {
    expect(kigaliClock(NOW)).toMatchObject({ date: "2026-11-04", minutes: 10 * 60 });
  });

  it("drops a backlog of past slots even when they would fill a 500-row cap", () => {
    const rows = octoberRows();
    expect(rows.length).toBeGreaterThan(200);
    rows.push({
      id: 9001,
      slot_date: "2026-11-12",
      start_time: "09:00:00",
      end_time: "09:30:00",
      status: "available",
    });
    const result = upcomingPublicSlots({
      rows,
      now: kigaliClock(NOW),
      from: "2026-11-04",
      to: "2027-02-02",
    });
    expect(result.dates).toEqual(["2026-11-12"]);
    expect(result.slots["2026-10-06"]).toBeUndefined();
    expect(result.total).toBe(1);
  });

  it("hides today's slots that have already started and keeps later ones", () => {
    const result = upcomingPublicSlots({
      rows: [
        { id: 1, slot_date: "2026-11-04", start_time: "08:00:00", end_time: "08:30:00", status: "available" },
        { id: 2, slot_date: "2026-11-04", start_time: "10:00:00", end_time: "10:30:00", status: "available" },
        { id: 3, slot_date: "2026-11-04", start_time: "11:00:00", end_time: "11:30:00", status: "available" },
        { id: 4, slot_date: "2026-11-04", start_time: "15:00:00", end_time: "15:30:00", status: "booked" },
      ],
      now: kigaliClock(NOW),
      from: "2026-11-04",
      to: "2026-11-04",
    });
    expect(result.dates).toEqual(["2026-11-04"]);
    expect(result.slots["2026-11-04"].map((slot) => slot.start_time)).toEqual(["11:00:00"]);
  });

  it("builds upcoming days from the doctor's schedule when slot rows were never generated", () => {
    const result = upcomingPublicSlots({
      rows: [],
      periods: [{
        id: 7,
        from_date: "2026-11-04",
        to_date: "2026-11-06",
        days_of_week: ["wednesday", "thursday", "friday"],
        start_time: "09:00:00",
        end_time: "10:00:00",
        slot_duration_minutes: 30,
        is_active: 1,
        type: "online",
      }],
      now: kigaliClock(NOW),
      from: "2026-11-04",
      to: "2026-11-30",
    });
    // 10:00 Kigali is already at the end of the 09:00–10:00 window, so today has no slot left.
    expect(result.dates).toEqual(["2026-11-05", "2026-11-06"]);
    expect(result.slots["2026-11-04"]).toBeUndefined();
    expect(result.slots["2026-11-05"].map((slot) => slot.start_time)).toEqual(["09:00:00", "09:30:00"]);
  });

  it("does not invent days after a schedule period has ended", () => {
    const result = upcomingPublicSlots({
      rows: octoberRows(),
      periods: [{
        id: 58,
        from_date: "2026-10-06",
        to_date: "2026-10-27",
        days_of_week: ["tuesday"],
        start_time: "08:00:00",
        end_time: "17:00:00",
        slot_duration_minutes: 30,
        is_active: 1,
      }],
      now: kigaliClock(NOW),
      from: "2026-11-04",
      to: "2026-12-04",
    });
    expect(result.dates).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("projects a weekly rule across the horizon when no slot rows exist", () => {
    const result = upcomingPublicSlots({
      rows: [],
      recurring: [{
        id: 3,
        day_of_week: "friday",
        start_time: "14:00:00",
        end_time: "15:00:00",
        slot_duration_minutes: 30,
        is_active: 1,
      }],
      now: kigaliClock(NOW),
      from: "2026-11-04",
      to: "2026-11-14",
    });
    expect(result.dates).toEqual(["2026-11-06", "2026-11-13"]);
  });
});
