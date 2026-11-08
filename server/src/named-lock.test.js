import { describe, expect, it } from "vitest";
import { withNamedLock } from "./named-lock.js";
import { clientMayClaimEmail, isServerGuestAccount } from "./guest-account.js";
import { sniffedUploadExtension } from "./input-checks.js";

function connectionPool({ locked = 1, releaseThrows = false } = {}) {
  const events = [];
  const connection = {
    id: "conn-1",
    query: async (sql) => {
      events.push(`query:${sql}`);
      return [[{ locked }]];
    },
    release() {
      events.push("release");
      if (releaseThrows) throw new Error("release failed");
    },
  };
  const pool = {
    events,
    connection,
    async getConnection() {
      events.push("checkout");
      return connection;
    },
    async query() {
      throw new Error("pool.query must not take the advisory lock");
    },
  };
  return pool;
}

describe("named locks on one connection", () => {
  it("checks out one connection, runs the work, unlocks, then releases", async () => {
    const pool = connectionPool();
    let seen = null;
    const value = await withNamedLock(pool, "book:1:2026-11-08:09:00", async (connection) => {
      seen = connection;
      pool.events.push("work");
      return "saved";
    });
    expect(value).toBe("saved");
    expect(seen).toBe(pool.connection);
    expect(pool.events).toEqual([
      "checkout",
      "query:SELECT GET_LOCK(?, 5) AS locked",
      "work",
      "query:SELECT RELEASE_LOCK(?)",
      "release",
    ]);
  });

  it("unlocks and releases the same connection when the work throws", async () => {
    const pool = connectionPool();
    await expect(withNamedLock(pool, "ic:1:u9", async () => {
      pool.events.push("work");
      throw new Error("insert failed");
    })).rejects.toThrow("insert failed");
    expect(pool.events).toEqual([
      "checkout",
      "query:SELECT GET_LOCK(?, 5) AS locked",
      "work",
      "query:SELECT RELEASE_LOCK(?)",
      "release",
    ]);
  });

  it("releases the connection without unlocking when the lock is not acquired", async () => {
    const pool = connectionPool({ locked: 0 });
    let ran = false;
    await expect(withNamedLock(pool, "book:2", async () => {
      ran = true;
    })).rejects.toMatchObject({ status: 409 });
    expect(ran).toBe(false);
    expect(pool.events).toEqual([
      "checkout",
      "query:SELECT GET_LOCK(?, 5) AS locked",
      "release",
    ]);
  });
});

describe("reserved guest addresses", () => {
  it("rejects a forged guest-<digits> address, not only a different local-part", () => {
    expect(clientMayClaimEmail("guest-1730000000000@mediconnect.local")).toBe(false);
    expect(clientMayClaimEmail("Guest-1@MediConnect.Local")).toBe(false);
    expect(clientMayClaimEmail("attacker@mediconnect.local")).toBe(false);
    expect(clientMayClaimEmail("patient@example.com")).toBe(true);
    expect(isServerGuestAccount("guest-1730000000000@mediconnect.local")).toBe(true);
    expect(isServerGuestAccount("attacker@mediconnect.local")).toBe(false);
  });
});

describe("upload byte sniff", () => {
  it("names a type from the header bytes and does not treat that as a safety scan", () => {
    expect(sniffedUploadExtension(Buffer.from("%PDF-1.4"))).toBe(".pdf");
    expect(sniffedUploadExtension(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe(".png");
    expect(sniffedUploadExtension(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(".jpg");
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);
    expect(sniffedUploadExtension(webp)).toBe(".webp");
    expect(sniffedUploadExtension(Buffer.from("<html></html>"))).toBe(null);
  });
});
