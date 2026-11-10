import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  ageSeconds,
  canJoinInstant,
  canPayInstant,
  countsInInstantQueue,
  isPaidStatus,
  ownsInstant,
  paidMarkerSql,
  placeInQueue,
  queueLabel,
  UNPAID_LIMIT_SEC,
} from "./instant-visit.js";

const NOW = new Date("2026-11-08T06:33:00Z"); // 08:33 Africa/Tripoli

function row(partial) {
  return {
    id: 1,
    doctor_id: 31,
    status: "pending",
    payment_status: null,
    created_at: "2026-11-08 06:17:00",
    ...partial,
  };
}

describe("instant visit queue", () => {
  it("does not call position 8 next when people_ahead was not stored", () => {
    expect(queueLabel(8, null)).toEqual({
      state: "waiting",
      queue_position: 8,
      people_ahead: 7,
      you_are_next: false,
    });
    expect(queueLabel(1, 0)).toEqual({
      state: "next",
      queue_position: 1,
      people_ahead: 0,
      you_are_next: true,
    });
    expect(queueLabel(25, 7)).toEqual({
      state: "unknown",
      queue_position: null,
      people_ahead: null,
      you_are_next: false,
    });
  });

  it("keeps an unpaid request out of the paid queue", () => {
    const early = row({ id: 1, created_at: "2026-11-08 06:00:00", status: "pending", payment_status: "pending" });
    const confirmedUnpaid = row({ id: 3, created_at: "2026-11-08 06:05:00", status: "confirmed", payment_status: "unpaid" });
    const paid = row({ id: 2, created_at: "2026-11-08 06:10:00", status: "confirmed", payment_status: "paid" });
    expect(placeInQueue(paid, [early, confirmedUnpaid, paid], NOW)).toMatchObject({
      queue_position: 1,
      people_ahead: 0,
      you_are_next: true,
    });
  });

  it("places a named request only among that doctor's open rows", () => {
    const mine = row({ id: 106, status: "confirmed", payment_status: "paid", created_at: "2026-11-08 06:17:00" });
    const peers = [
      row({ id: 100, status: "confirmed", payment_status: "paid", created_at: "2026-11-08 06:00:00" }),
      row({ id: 90, doctor_id: null, status: "confirmed", payment_status: "paid", created_at: "2026-11-08 05:00:00" }),
      row({ id: 101, doctor_id: 99, status: "confirmed", payment_status: "paid", created_at: "2026-11-08 05:30:00" }),
      row({ id: 102, status: "completed", payment_status: "paid", created_at: "2026-11-08 04:00:00" }),
      row({ id: 103, status: "pending", payment_status: "pending", created_at: "2026-11-08 05:45:00" }),
      mine,
    ];
    expect(placeInQueue(mine, peers, NOW)).toMatchObject({
      queue_position: 2,
      people_ahead: 1,
      you_are_next: false,
    });
  });

  it("keeps a pending request payable after 16 UTC minutes until its status is expired", () => {
    const created = "2026-11-08 06:17:00";
    expect(ageSeconds(created, NOW)).toBe(16 * 60);
    const fresh = row({ created_at: "2026-11-08 06:25:00" });
    expect(ageSeconds(fresh.created_at, NOW)).toBe(8 * 60);
    expect(canPayInstant(fresh)).toBe(true);
    expect(canJoinInstant(fresh)).toBe(false);
    expect(canPayInstant(row({ created_at: created }))).toBe(true);
    expect(canPayInstant(row({ status: "payment_expired", created_at: created }))).toBe(false);
    expect(UNPAID_LIMIT_SEC).toBe(15 * 60);
  });

  it("lets the signed-in owner recover the request and rejects another account", () => {
    const visit = row({
      id: 106,
      patient_id: 55,
      guest_email: "patient@example.com",
      guest_phone: "789107304",
      guest_token: "owner-token",
    });
    const owner = { userId: 9, patientIds: [55], email: "other@example.com", phone: "788000000", occupiedUserId: null };
    expect(ownsInstant(visit, owner)).toBe(true);
    expect(ownsInstant(visit, { ...owner, patientIds: [], email: "patient@example.com", phone: "" })).toBe(false);
    expect(ownsInstant(
      { guest_email: "patient@example.com", guest_phone: "" },
      { userId: 9, patientIds: [], email: "patient@example.com", phone: "", occupiedUserId: null },
    )).toBe(true);
    expect(ownsInstant(visit, { userId: 8, patientIds: [99], email: "stranger@example.com", phone: "788111111" })).toBe(false);
  });

  it("fails closed when the account id collides with another profile or the contacts disagree", () => {
    const viewer = { userId: 9, patientIds: [55], email: "owner@example.com", phone: "789107304", occupiedUserId: 77 };
    expect(ownsInstant({ patient_id: 9, guest_email: "owner@example.com" }, viewer)).toBe(false);
    expect(ownsInstant({ user_id: 9, patient_id: 9 }, viewer)).toBe(false);
    expect(ownsInstant({ user_id: 8, patient_id: 55, guest_email: "owner@example.com" }, viewer)).toBe(false);
    expect(ownsInstant({ user_id: 9, patient_id: 55, guest_email: "someone-else@example.com" }, viewer)).toBe(true);
    expect(ownsInstant({ guest_email: "owner@example.com", guest_phone: "788000000" }, viewer)).toBe(false);
    expect(ownsInstant({ guest_phone: "+250 789 107 304" }, viewer)).toBe(true);
    expect(ownsInstant({ guest_phone: "11789107304" }, viewer)).toBe(false);
    expect(ownsInstant(
      { user_id: 9, patient_id: 9 },
      { ...viewer, occupiedUserId: null },
    )).toBe(true);
  });

  it("offers join only after the doctor has accepted a paid visit", () => {
    expect(canJoinInstant(row({ status: "accepted", payment_status: "paid" }))).toBe(true);
    expect(canJoinInstant(row({ status: "pending", payment_status: "paid" }))).toBe(false);
    expect(canJoinInstant(row({ status: "accepted", payment_status: "pending" }))).toBe(false);
    expect(canJoinInstant(row({ status: "confirmed", payment_status: "unpaid" }))).toBe(false);
  });

  it("counts only a paid open request for this doctor, including a paid any-doctor request", () => {
    expect(isPaidStatus(row({ status: "confirmed", payment_status: "paid" }))).toBe(true);
    expect(isPaidStatus(row({ status: "confirmed", payment_status: null }))).toBe(true);
    expect(isPaidStatus(row({ status: "confirmed", payment_status: "pending" }))).toBe(false);
    expect(isPaidStatus(row({ status: "pending", payment_status: null }))).toBe(false);
    expect(countsInInstantQueue(row({ status: "confirmed", payment_status: "paid", doctor_id: 31 }), 31)).toBe(true);
    expect(countsInInstantQueue(row({ status: "pending", payment_status: "pending", doctor_id: 31 }), 31)).toBe(false);
    expect(countsInInstantQueue(row({ status: "confirmed", payment_status: "paid", doctor_id: null }), 31)).toBe(true);
    expect(countsInInstantQueue(row({ status: "pending", payment_status: null, doctor_id: null }), 31)).toBe(false);
    expect(countsInInstantQueue(row({ status: "confirmed", payment_status: "paid", doctor_id: 99 }), 31)).toBe(false);
    expect(isPaidStatus(row({ status: "pending", payment_status: "unpaid", consultation_fee: 0 }))).toBe(true);
    expect(isPaidStatus(row({ status: "pending", payment_status: "unpaid", consultation_fee: null, patient_pays: 0 }))).toBe(true);
    expect(isPaidStatus(row({ status: "confirmed", payment_status: "unpaid", consultation_fee: 5000 }))).toBe(false);
  });

  it("counts a zero fee as paid in the dashboard SQL", () => {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE visits (
        id INTEGER, status TEXT, payment_status TEXT,
        consultation_fee REAL, patient_pays REAL, amount_due REAL
      );
    `);
    const insert = database.prepare("INSERT INTO visits (id, status, payment_status, consultation_fee, patient_pays, amount_due) VALUES (?, ?, ?, ?, ?, ?)");
    insert.run(1, "pending", "pending", 5000, null, null);
    insert.run(2, "confirmed", "paid", 5000, null, null);
    insert.run(3, "pending", "unpaid", 0, null, null);
    insert.run(4, "pending", "unpaid", null, 0, null);
    insert.run(5, "confirmed", "", null, null, null);
    insert.run(6, "confirmed", "unpaid", 1000, null, null);
    const marker = paidMarkerSql(["consultation_fee", "patient_pays", "amount_due"]).replace(/`/g, "\"");
    const ids = database.prepare(`SELECT id FROM visits WHERE ${marker} ORDER BY id`).all().map((item) => item.id);
    expect(ids).toEqual([2, 3, 4, 5]);
    const withoutPayment = paidMarkerSql(["consultation_fee"], { paymentColumn: false }).replace(/`/g, "\"");
    const legacyIds = database.prepare(`SELECT id FROM visits WHERE ${withoutPayment} ORDER BY id`).all().map((item) => item.id);
    expect(legacyIds).toEqual([2, 3, 5, 6]);
  });
});
