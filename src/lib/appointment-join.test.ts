import { describe, expect, it } from "vitest";
import { canJoinAppointment } from "./appointment-join";

const slot = {
  appointment_date: "2026-11-23",
  appointment_time: "10:00",
  duration_minutes: 30,
  status: "confirmed",
  payment_status: "paid",
};

describe("appointment join window", () => {
  it("opens 20 minutes before the slot and closes duration plus 40 minutes after, on that Kigali day", () => {
    expect(canJoinAppointment(slot, Date.parse("2026-11-23T07:40:00Z"))).toBe(true);
    expect(canJoinAppointment(slot, Date.parse("2026-11-23T07:39:00Z"))).toBe(false);
    expect(canJoinAppointment(slot, Date.parse("2026-11-23T09:10:00Z"))).toBe(true);
    expect(canJoinAppointment(slot, Date.parse("2026-11-23T09:11:00Z"))).toBe(false);
    expect(canJoinAppointment(slot, Date.parse("2026-11-22T08:00:00Z"))).toBe(false);
  });

  it("lets a paid instant consult be joined immediately and keeps an unpaid one closed", () => {
    expect(canJoinAppointment({ instant: true, status: "pending", payment_status: "paid" }, Date.parse("2026-11-23T01:00:00Z"))).toBe(true);
    expect(canJoinAppointment({ instant: true, status: "confirmed", payment_status: "unpaid" })).toBe(false);
    expect(canJoinAppointment({ instant: true, status: "completed", payment_status: "paid" })).toBe(false);
  });
});
