import { describe, expect, it } from "vitest";
import { doctorOffersInstant } from "./doctor-presence";

const outsideHours = {
  slots_for_date: [],
  availability_periods: [{
    from_date: "2026-10-06",
    to_date: "2026-10-27",
    days_of_week: ["tuesday"],
    start_time: "08:00:00",
    end_time: "17:00:00",
    is_active: 1,
  }],
};

describe("doctorOffersInstant", () => {
  it("follows the instant-consult switch even when no slot covers right now", () => {
    expect(doctorOffersInstant(
      { instant_consultation: true, bookings_paused: false },
      outsideHours,
      new Date("2026-11-04T08:00:00Z"),
    )).toBe(true);
  });

  it("stays off when the switch is off, including string and numeric zeroes", () => {
    expect(doctorOffersInstant({ instant_consultation: false })).toBe(false);
    expect(doctorOffersInstant({ instant_consultation: 0 })).toBe(false);
    expect(doctorOffersInstant({ instant_consultation: "0" })).toBe(false);
    expect(doctorOffersInstant({ instant_consultation: 1 })).toBe(true);
    expect(doctorOffersInstant({ instant_consultation: "1" })).toBe(true);
  });
});
