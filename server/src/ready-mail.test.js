import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = new DatabaseSync(":memory:");
const claimsOpen = { value: true };
database.exec(`
  CREATE TABLE ready_mail_claims (
    claim_key TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    last_error TEXT,
    claimed_at TEXT NOT NULL,
    sent_at TEXT
  )
`);

function sqlText(sql) {
  return String(sql).replace(/`/g, "");
}

vi.mock("./db.js", () => ({
  tableExists: async (name) => name === "ready_mail_claims" && claimsOpen.value,
  one: async (sql, params = []) => database.prepare(sqlText(sql)).get(...params) ?? null,
  q: async (sql, params = []) => {
    const text = sqlText(sql);
    const statement = database.prepare(text);
    if (/^\s*select/i.test(text)) return statement.all(...params);
    return { affectedRows: statement.run(...params).changes };
  },
}));

const { beginReadyMail, finishReadyMail, READY_CLAIM_STALE_MS } = await import("./ready-mail.js");

describe("ready mail claims", () => {
  beforeEach(() => {
    database.exec("DELETE FROM ready_mail_claims");
    claimsOpen.value = true;
  });

  it("records one send and ignores a later claim, including after the caller is new", async () => {
    const now = new Date("2026-11-08T10:00:00Z");
    const first = await beginReadyMail("instant:4", now);
    expect(first).toMatchObject({ send: true, reason: "claimed", attempt: 1 });
    await finishReadyMail("instant:4", first.attempt, true, "", now);
    expect(await beginReadyMail("instant:4", new Date("2026-11-08T11:00:00Z"))).toMatchObject({
      send: false,
      reason: "sent",
    });
    vi.resetModules();
    const fresh = await import("./ready-mail.js");
    expect(await fresh.beginReadyMail("instant:4", new Date("2026-11-08T12:00:00Z"))).toMatchObject({
      send: false,
      reason: "sent",
    });
  });

  it("retries a failed send and lets a stale in-flight claim be taken over", async () => {
    const now = new Date("2026-11-08T10:00:00Z");
    const claimed = await beginReadyMail("instant:8", now);
    await finishReadyMail("instant:8", claimed.attempt, false, "smtp down", now);
    const retry = await beginReadyMail("instant:8", new Date(now.getTime() + 1000));
    expect(retry).toMatchObject({ send: true, reason: "retry", attempt: 2 });
    const busy = await beginReadyMail("instant:9", now);
    expect(busy.send).toBe(true);
    expect(await beginReadyMail("instant:9", new Date(now.getTime() + 1000))).toMatchObject({
      send: false,
      reason: "in-flight",
    });
    const later = new Date(now.getTime() + READY_CLAIM_STALE_MS + 1000);
    const takeover = await beginReadyMail("instant:9", later);
    expect(takeover).toMatchObject({ send: true, reason: "retry", attempt: 2 });
    await finishReadyMail("instant:9", busy.attempt, false, "old owner", later);
    const row = database.prepare("SELECT status, attempts FROM ready_mail_claims WHERE claim_key = ?").get("instant:9");
    expect(row).toMatchObject({ status: "sending", attempts: 2 });
  });

  it("sends without a durable row when the claims table is absent", async () => {
    claimsOpen.value = false;
    expect(await beginReadyMail("instant:10", new Date("2026-11-08T10:00:00Z"))).toMatchObject({
      send: true,
      reason: "undurable",
      attempt: null,
    });
    expect(database.prepare("SELECT COUNT(*) AS total FROM ready_mail_claims").get().total).toBe(0);
  });
});
