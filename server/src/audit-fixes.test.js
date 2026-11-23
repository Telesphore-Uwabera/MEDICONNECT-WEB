import { describe, expect, it } from "vitest";
import { chartWithSpend, confirmedTodayCount, paidStatusSql } from "./dashboard-stats.js";
import {
  containsLike,
  countsAsPaidRevenue,
  distanceKm,
  doctorOrderKey,
  escapeLike,
  freshInstantSql,
  hospitalAppointmentFilter,
  languageFilterValues,
  likeContains,
  publicMedicine,
  serviceBookingIsPaid,
  sortByDistance,
} from "./search-text.js";
import { sumPharmacyStock } from "./medicine-stock.js";
import { kigaliPeriodSql } from "./dashboard-stats.js";
import { appointmentJoinWindow } from "./visit-rules.js";

describe("audit search rules", () => {
  it("treats Kinyarwanda spellings as one language", () => {
    const expected = ["rw", "kin", "kiny", "kinyarwanda", "ikinyarwanda"];
    for (const input of ["rw", "kin", "Kinyarwanda", "Ikinyarwanda", "KINY"]) {
      expect(languageFilterValues(input)).toEqual(expected);
    }
    expect(languageFilterValues("en")).toEqual(["en", "english"]);
    expect(languageFilterValues("")).toEqual([]);
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("100%_done")).toBe("100\\%\\_done");
    expect(likeContains("a%b")).toBe("%a\\%b%");
    expect(containsLike("m.name")).toBe("m.name LIKE ? ESCAPE '\\\\'");
  });

  it("sorts pharmacies by distance and leaves unknown coordinates last", () => {
    const rows = [
      { id: 1, name: "Far", latitude: -1.94, longitude: 30.1 },
      { id: 2, name: "Near", latitude: -1.95, longitude: 30.06 },
      { id: 3, name: "Unknown", latitude: null, longitude: null },
    ];
    const sorted = sortByDistance(rows, -1.944, 30.061);
    expect(sorted.map((row) => row.name)).toEqual(["Near", "Far", "Unknown"]);
    expect(sorted[0].distance_km).toBeLessThan(sorted[1].distance_km);
    expect(sorted[2].distance_km).toBeNull();
    expect(distanceKm(0, 0, 0, 0)).toBe(0);
  });

  it("publishes medicine fields from an approved pharmacy and hides cost data", () => {
    const listed = publicMedicine({
      id: 8,
      name: "Amoxicillin",
      price: 1500,
      quantity: 4,
      requires_prescription: 1,
      cost_price: 400,
      supplier: "Secret Supplier",
      batch_number: "B-1",
      pharmacy_id: 3,
      pharmacy_name: "City Pharmacy",
      pharmacy_slug: "city",
      pharmacy_city: "Kigali",
    });
    expect(listed).toMatchObject({
      id: 8,
      name: "Amoxicillin",
      price: 1500,
      in_stock: true,
      requires_prescription: true,
      pharmacy: { id: 3, name: "City Pharmacy", slug: "city", city: "Kigali" },
    });
    expect(JSON.stringify(listed)).not.toMatch(/Secret Supplier|cost_price|B-1/);
  });
});

describe("audit dashboard rules", () => {
  it("counts revenue from payment status, not delivery", () => {
    expect(countsAsPaidRevenue({ status: "delivered", payment_status: "pending" })).toBe(false);
    expect(countsAsPaidRevenue({ status: "accepted", payment_status: "paid" })).toBe(true);
    expect(countsAsPaidRevenue({ status: "delivered" })).toBe(false);
    expect(countsAsPaidRevenue({ status: "paid" })).toBe(true);
    expect(paidStatusSql("payment_status")).not.toMatch(/delivered|dispensed/);
  });

  it("limits a hospital to its own appointments", () => {
    expect(hospitalAppointmentFilter(12)).toEqual({ sql: "hospital_id = ?", params: [12] });
    expect(hospitalAppointmentFilter(12).sql).not.toMatch(/doctor_id/);
  });

  it("keeps a session seed and ignores stock rows with no pharmacy", () => {
    expect(doctorOrderKey({ seed: "session-seed-1" }, 0)).toBe("session-seed-1");
    expect(doctorOrderKey({}, 10 * 60 * 1000)).toBe("1");
    expect(sumPharmacyStock([
      { pharmacy_id: 4, quantity: 2 },
      { pharmacy_id: null, quantity: 9 },
      { pharmacy_id: 8, quantity: 5 },
    ], 4)).toBe(2);
    expect(kigaliPeriodSql("created_at", "all")).toBe("1=1");
    expect(freshInstantSql(["started_at", "updated_at"])).toMatch(/INTERVAL 2 HOUR/);
  });

  it("lets a late join window cross midnight", () => {
    const late = { appointment_date: "2026-11-23", appointment_time: "23:50", duration_minutes: 30, status: "confirmed", payment_status: "paid" };
    expect(appointmentJoinWindow(late, new Date("2026-11-23T21:30:00Z")).ok).toBe(true);
    expect(appointmentJoinWindow(late, new Date("2026-11-23T22:30:00Z")).ok).toBe(true);
    expect(appointmentJoinWindow(late, new Date("2026-11-23T23:01:00Z")).reason).toBe("too-late");
  });

  it("counts confirmed today from today's statuses and charts real payments", () => {
    expect(confirmedTodayCount({ confirmed: 2, accepted: 1, pending: 9 })).toBe(3);
    expect(chartWithSpend(
      [{ label: "2026-11-23", appointments: 1, spent: 0 }],
      { "2026-11-23": 4500 },
    )).toEqual([{ label: "2026-11-23", appointments: 1, spent: 4500 }]);
  });
});

describe("service booking completion", () => {
  it("allows completion only after payment, or when no fee is due", () => {
    expect(serviceBookingIsPaid({ payment_status: "paid" })).toBe(true);
    expect(serviceBookingIsPaid({ payment_status: "completed" })).toBe(true);
    expect(serviceBookingIsPaid({ payment_status: "pending", price: 5000 })).toBe(false);
    expect(serviceBookingIsPaid({ price: 1500 })).toBe(false);
    expect(serviceBookingIsPaid({ patient_pays: 0, price: 0 })).toBe(true);
    expect(serviceBookingIsPaid({})).toBe(true);
  });
});
