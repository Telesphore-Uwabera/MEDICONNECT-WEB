import { beforeEach, describe, expect, it, vi } from "vitest";

const users = new Map();
const columns = new Set(["password_must_change", "temp_password_expires_at", "temp_password_used_at"]);
const hashes = new Map();
let hashCount = 0;

vi.mock("./db.js", () => ({
  hasColumn: async (_table, name) => columns.has(name),
  one: async (_sql, params) => users.get(Number(params?.[0])) ?? null,
  update: async (_table, id, data) => {
    const row = users.get(Number(id));
    if (row) Object.assign(row, data);
  },
}));

vi.mock("./auth.js", () => ({
  hashPassword: async (plain) => {
    const id = `hash-${++hashCount}`;
    hashes.set(id, plain);
    return id;
  },
  verifyPassword: async (plain, hash) => hashes.get(hash) === plain,
}));

const {
  createGuestPassword,
  reissueGuestPassword,
  markGuestPasswordUsed,
  checkGuestLogin,
  guestAccessLine,
  guestPasswordState,
} = await import("./guest-password.js");

const NOW = Date.parse("2026-11-10T00:00:00Z");

describe("guest temporary password", () => {
  beforeEach(() => {
    users.clear();
    hashes.clear();
    hashCount = 0;
    columns.clear();
    for (const name of ["password_must_change", "temp_password_expires_at", "temp_password_used_at"]) {
      columns.add(name);
    }
  });

  it("creates a hash, can be emailed, rotates until use, then stops, and expires", async () => {
    const created = await createGuestPassword(NOW);
    expect(created.plain).toHaveLength(10);
    expect(created.password).not.toBe(created.plain);
    expect(JSON.stringify(created.extra)).not.toContain(created.plain);
    users.set(1, {
      id: 1,
      email: "guest@example.com",
      password: created.password,
      ...created.extra,
    });
    expect(JSON.stringify(users.get(1))).not.toContain(created.plain);

    const mailed = guestAccessLine("en", "guest@example.com", created.plain);
    expect(mailed).toContain(created.plain);
    expect(mailed).toContain("guest@example.com");

    const rotated = await reissueGuestPassword(1, NOW + 1000);
    expect(rotated.plain).not.toBe(created.plain);
    expect(hashes.get(users.get(1).password)).toBe(rotated.plain);
    expect(await checkGuestLogin(users.get(1), created.plain)).toMatchObject({ ok: false });
    expect(JSON.stringify(users.get(1))).not.toContain(rotated.plain);

    await markGuestPasswordUsed(1, NOW + 2000);
    const passwordAfterUse = users.get(1).password;
    expect(await reissueGuestPassword(1, NOW + 3000)).toBeNull();
    expect(users.get(1).password).toBe(passwordAfterUse);
    expect(guestPasswordState(users.get(1), NOW + 3000)).toBe("used");
    expect(await checkGuestLogin(users.get(1), rotated.plain)).toMatchObject({ ok: true, mustChange: true });

    users.set(2, {
      id: 2,
      email: "late@example.com",
      password: "hash-old",
      password_must_change: 1,
      temp_password_expires_at: new Date(NOW - 1000),
      temp_password_used_at: null,
    });
    hashes.set("hash-old", "still-the-secret");
    expect(await reissueGuestPassword(2, NOW)).toBeNull();
    expect(await checkGuestLogin(users.get(2), "still-the-secret")).toMatchObject({
      ok: false,
      message: expect.stringMatching(/expired/i),
    });
    expect((await checkGuestLogin(users.get(2), "still-the-secret")).message).toMatch(/Forgot password/i);
  });

  it("still creates a password when the tracking columns are missing", async () => {
    columns.clear();
    const created = await createGuestPassword(NOW);
    expect(created.plain).toHaveLength(10);
    expect(created.extra).toEqual({});
    users.set(3, { id: 3, email: "plain@example.com", password: created.password });
    expect(await reissueGuestPassword(3, NOW)).toBeNull();
  });
});
