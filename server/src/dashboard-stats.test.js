import { describe, expect, it } from "vitest";
import { average, displayedPaymentStatus, durationMinutes, historyPageArgs, kigaliDaySql, kigaliPeriodSql, kigaliTodaySql } from "./dashboard-stats.js";

describe("dashboard stat helpers", () => {
  it("shifts a timestamp onto the Kigali day without running MySQL", () => {
    expect(kigaliDaySql("completed_at")).toBe("DATE(DATE_ADD(`completed_at`, INTERVAL 2 HOUR))");
    expect(kigaliTodaySql()).toContain("UTC_TIMESTAMP()");
    const utcLate = new Date("2026-11-11T22:30:00Z");
    const kigali = new Date(utcLate.getTime() + 2 * 60 * 60 * 1000);
    const day = kigali.toISOString().slice(0, 10);
    expect(day).toBe("2026-11-12");
  });

  it("averages real visit lengths and marks a finished row paid when payment_status is missing", () => {
    expect(durationMinutes("2026-11-11T10:00:00Z", "2026-11-11T10:25:00Z")).toBe(25);
    expect(average([10, 20, null])).toBe(15);
    expect(displayedPaymentStatus({ status: "completed" })).toBe("paid");
    expect(displayedPaymentStatus({ status: "pending", payment_status: "unpaid" })).toBe("unpaid");
    expect(displayedPaymentStatus({ status: "pending", consultation_fee: 0 })).toBe("paid");
  });

  it("measures a week on the Kigali day and pages history", () => {
    expect(kigaliPeriodSql("created_at", "week")).toContain("INTERVAL 2 HOUR");
    expect(kigaliPeriodSql("created_at", "week")).not.toContain("CURDATE()");
    expect(historyPageArgs({ page: "2", limit: "10" })).toEqual({ page: 2, limit: 10, offset: 10 });
    expect(historyPageArgs({ history_page: "3", page: "1", history_per_page: "5" })).toEqual({ page: 3, limit: 5, offset: 10 });
    expect(historyPageArgs({})).toEqual({ page: 1, limit: 100, offset: 0 });
  });
});
