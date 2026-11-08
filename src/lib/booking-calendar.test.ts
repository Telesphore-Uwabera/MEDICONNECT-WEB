import { describe, expect, it } from "vitest";
import {
  bookableDates,
  calendarDayKind,
  initialCalendarMonth,
  kigaliDate,
  slotIsBookable,
} from "./booking-calendar";

const NOW = new Date("2026-11-04T08:00:00Z"); // 10:00 Africa/Kigali

describe("booking calendar", () => {
  it("uses the Kigali date when the UTC date is still the same morning", () => {
    expect(kigaliDate(NOW)).toBe("2026-11-04");
  });

  it("opens on the current month and ignores an October backlog", () => {
    const slots: Record<string, { start_time: string; status: string }[]> = {};
    for (let day = 6; day <= 24; day += 1) {
      const date = `2026-10-${String(day).padStart(2, "0")}`;
      slots[date] = [{ start_time: "08:00:00", status: "available" }];
    }
    slots["2026-12-02"] = [{ start_time: "09:00:00", status: "available" }];
    const dates = bookableDates(slots, NOW);
    expect(dates).toEqual(["2026-12-02"]);
    expect(initialCalendarMonth(dates, NOW)).toEqual(new Date(2026, 11, 1));
  });

  it("stays on the current month when the schedule has no upcoming days", () => {
    const dates = bookableDates({
      "2026-10-24": [{ start_time: "08:00:00", status: "available" }],
    }, NOW);
    expect(dates).toEqual([]);
    expect(initialCalendarMonth(dates, NOW)).toEqual(new Date(2026, 10, 1));
  });

  it("distinguishes past days from days with no slots", () => {
    const open = new Set(["2026-11-12"]);
    expect(calendarDayKind("2026-11-03", open, "2026-11-04")).toBe("past");
    expect(calendarDayKind("2026-11-04", open, "2026-11-04")).toBe("none");
    expect(calendarDayKind("2026-11-12", open, "2026-11-04")).toBe("open");
  });

  it("refuses a slot that has already started today", () => {
    expect(slotIsBookable(
      { slot_date: "2026-11-04", start_time: "10:00:00", status: "available" },
      "2026-11-04",
      10 * 60,
    )).toBe(false);
    expect(slotIsBookable(
      { slot_date: "2026-11-04", start_time: "10:30:00", status: "available" },
      "2026-11-04",
      10 * 60,
    )).toBe(true);
  });
});
