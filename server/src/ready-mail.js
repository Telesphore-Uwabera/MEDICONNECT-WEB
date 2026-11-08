import { one, q, tableExists } from "./db.js";

export const READY_MAIL_TABLE = "ready_mail_claims";
export const READY_CLAIM_STALE_MS = 2 * 60 * 1000;

function sqlTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function claimedAt(value) {
  const text = String(value || "").trim();
  if (!text) return Number.NaN;
  const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text.replace(" ", "T")}Z`;
  return new Date(iso).getTime();
}

function writeCount(result) {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return Number(result.affectedRows ?? result.changes ?? 0);
  }
  return 0;
}

function decision(row, now) {
  if (!row) return { action: "insert" };
  if (row.status === "sent") return { action: "skip" };
  if (row.status === "failed") return { action: "takeover", from: "failed" };
  const age = now.getTime() - claimedAt(row.claimed_at);
  if (row.status === "sending" && Number.isFinite(age) && age < READY_CLAIM_STALE_MS) return { action: "busy" };
  return { action: "takeover", from: row.status || "sending" };
}

async function readClaim(key) {
  return one(
    `SELECT claim_key, status, attempts, claimed_at FROM \`${READY_MAIL_TABLE}\` WHERE claim_key = ? LIMIT 1`,
    [key],
  );
}

async function takeover(key, from, now) {
  const staleBefore = sqlTime(new Date(now.getTime() - READY_CLAIM_STALE_MS));
  const result = await q(
    `UPDATE \`${READY_MAIL_TABLE}\`
     SET status = 'sending', attempts = attempts + 1, claimed_at = ?, last_error = NULL
     WHERE claim_key = ? AND status = ? AND (? = 'failed' OR claimed_at <= ?)`,
    [sqlTime(now), key, from, from, staleBefore],
  );
  if (writeCount(result) !== 1) return null;
  const row = await readClaim(key);
  return Number(row?.attempts) || null;
}

/**
 * At-least-once claim. `send: false` means another attempt owns it or a
 * successful send is already recorded. A missing table returns `undurable`:
 * the caller still sends, because dropping the mail would hide it.
 */
export async function beginReadyMail(key, now = new Date()) {
  if (!key) return { send: false, reason: "no-key", attempt: null };
  let durable = false;
  try {
    durable = await tableExists(READY_MAIL_TABLE);
  } catch {
    durable = false;
  }
  if (!durable) return { send: true, reason: "undurable", attempt: null };
  let row = await readClaim(key);
  let choice = decision(row, now);
  if (choice.action === "skip") return { send: false, reason: "sent", attempt: null };
  if (choice.action === "busy") return { send: false, reason: "in-flight", attempt: null };
  if (choice.action === "insert") {
    try {
      await q(
        `INSERT INTO \`${READY_MAIL_TABLE}\` (claim_key, status, attempts, claimed_at) VALUES (?, 'sending', 1, ?)`,
        [key, sqlTime(now)],
      );
      return { send: true, reason: "claimed", attempt: 1 };
    } catch (error) {
      row = await readClaim(key);
      if (!row) throw error;
      choice = decision(row, now);
      if (choice.action === "skip") return { send: false, reason: "sent", attempt: null };
      if (choice.action === "busy") return { send: false, reason: "in-flight", attempt: null };
    }
  }
  const attempt = await takeover(key, choice.from, now);
  if (attempt) return { send: true, reason: "retry", attempt };
  const latest = await readClaim(key);
  if (latest?.status === "sent") return { send: false, reason: "sent", attempt: null };
  return { send: false, reason: "in-flight", attempt: null };
}

export async function finishReadyMail(key, attempt, ok, errorText = "", now = new Date()) {
  if (!key || !attempt) return;
  let durable = false;
  try {
    durable = await tableExists(READY_MAIL_TABLE);
  } catch {
    durable = false;
  }
  if (!durable) return;
  if (ok) {
    await q(
      `UPDATE \`${READY_MAIL_TABLE}\` SET status = 'sent', sent_at = ?, last_error = NULL WHERE claim_key = ? AND status = 'sending' AND attempts = ?`,
      [sqlTime(now), key, attempt],
    );
    return;
  }
  await q(
    `UPDATE \`${READY_MAIL_TABLE}\` SET status = 'failed', last_error = ? WHERE claim_key = ? AND status = 'sending' AND attempts = ?`,
    [String(errorText || "send failed").slice(0, 255), key, attempt],
  );
}
