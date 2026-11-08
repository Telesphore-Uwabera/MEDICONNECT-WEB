import { describe, expect, it } from "vitest";
import {
  ageSeconds,
  canJoinInstant,
  canPayInstant,
  ownsInstant,
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
      queue_position: 8,
      people_ahead: 7,
      you_are_next: false,
    });
    expect(queueLabel(1, 0).you_are_next).toBe(true);
  });

  it("places a named request only among that doctor's open rows", () => {
    const mine = row({ id: 106, created_at: "2026-11-08 06:17:00" });
    const peers = [
      row({ id: 100, created_at: "2026-11-08 06:00:00" }),
      row({ id: 90, doctor_id: null, created_at: "2026-11-08 05:00:00" }),
      row({ id: 101, doctor_id: 99, created_at: "2026-11-08 05:30:00" }),
      row({ id: 102, status: "completed", created_at: "2026-11-08 04:00:00" }),
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

  it("offers join only after the doctor has accepted", () => {
    expect(canJoinInstant(row({ status: "accepted", payment_status: "paid" }))).toBe(true);
    expect(canJoinInstant(row({ status: "pending", payment_status: "paid" }))).toBe(false);
  });
});
