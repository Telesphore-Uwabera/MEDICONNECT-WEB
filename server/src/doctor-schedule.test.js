import { beforeEach, describe, expect, it, vi } from "vitest";

const updates = [];
vi.mock("./db.js", () => ({
  one: async () => null,
  q: async () => [],
  tableExists: async () => false,
  hasColumn: async () => true,
  update: async (table, id, data) => { updates.push({ table, id, data }); },
}));
vi.mock("./auth.js", () => ({
  loadOwnedId: async () => 31,
}));

const { disableInstantForDoctor, disableInstantOnLogout } = await import("./doctor-schedule.js");

describe("doctor instant availability", () => {
  beforeEach(() => {
    updates.length = 0;
  });

  it("turns instant consultation off for a doctor entering a call", async () => {
    await disableInstantForDoctor(31);
    expect(updates).toEqual([
      { table: "doctors", id: 31, data: { instant_consultation: 0 } },
    ]);
  });

  it("turns instant consultation off on logout", async () => {
    await disableInstantOnLogout(1003);
    expect(updates).toEqual([
      { table: "doctors", id: 31, data: { instant_consultation: 0 } },
    ]);
  });
});
