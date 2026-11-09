import { one, q, tableExists } from "./db.js";

export const READY_MAIL_TABLE = "ready_mail_claims";
/** A process that died stops renewing, so another call may take the claim after this. */
export const READY_CLAIM_STALE_MS = 2 * 60 * 1000;
export const READY_CLAIM_RENEW_MS = 30 * 1000;
/**
 * Nodemailer's socket timeout defaults to 10 minutes and its connection
 * timeout to 2 minutes. The ready-mail send uses this shorter bound so a
 * hung SMTP attempt ends, and the lease is renewed while that attempt is
 * still running so the stale window alone does not start a second send.
 */
export const READY_MAIL_TIMEOUT_MS = 60 * 1000;

const localSent = new Set();
const localFlight = new Set();
let durabilityWarned = false;

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

function unreadable(error) {
  const failure = new Error("Ready mail claims could not be read.");
  failure.cause = error;
  failure.retryable = true;
  return failure;
}

function warnUndurable() {
  if (durabilityWarned) return;
  durabilityWarned = true;
  console.warn(
    "ready_mail_claims is not installed, so ready mail is not durable across restarts. Apply server/sql/ready-mail-claims.sql. Durability is not active; this process only keeps one in-flight send.",
  );
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
 * At-least-once claim. `send: false` means this call must not send.
 * A missing table is process-local single-flight only. A read error throws
 * and does not record a delivery.
 */
export async function beginReadyMail(key, now = new Date()) {
  if (!key) return { send: false, reason: "no-key", attempt: null, durable: false };
  let durable;
  try {
    durable = await tableExists(READY_MAIL_TABLE);
  } catch (error) {
    throw unreadable(error);
  }
  if (!durable) {
    warnUndurable();
    if (localSent.has(key)) return { send: false, reason: "local-sent", attempt: null, durable: false };
    if (localFlight.has(key)) return { send: false, reason: "in-flight", attempt: null, durable: false };
    localFlight.add(key);
    return { send: true, reason: "undurable", attempt: null, durable: false };
  }
  let row;
  try {
    row = await readClaim(key);
  } catch (error) {
    throw unreadable(error);
  }
  let choice = decision(row, now);
  if (choice.action === "skip") return { send: false, reason: "sent", attempt: null, durable: true };
  if (choice.action === "busy") return { send: false, reason: "in-flight", attempt: null, durable: true };
  if (choice.action === "insert") {
    try {
      await q(
        `INSERT INTO \`${READY_MAIL_TABLE}\` (claim_key, status, attempts, claimed_at) VALUES (?, 'sending', 1, ?)`,
        [key, sqlTime(now)],
      );
      return { send: true, reason: "claimed", attempt: 1, durable: true };
    } catch (error) {
      try {
        row = await readClaim(key);
      } catch (readError) {
        throw unreadable(readError);
      }
      if (!row) throw error;
      choice = decision(row, now);
      if (choice.action === "skip") return { send: false, reason: "sent", attempt: null, durable: true };
      if (choice.action === "busy") return { send: false, reason: "in-flight", attempt: null, durable: true };
    }
  }
  const attempt = await takeover(key, choice.from, now);
  if (attempt) return { send: true, reason: "retry", attempt, durable: true };
  const latest = await readClaim(key);
  if (latest?.status === "sent") return { send: false, reason: "sent", attempt: null, durable: true };
  return { send: false, reason: "in-flight", attempt: null, durable: true };
}

export async function renewReadyMail(key, attempt, now = new Date()) {
  if (!key || !attempt) return false;
  let durable = false;
  try {
    durable = await tableExists(READY_MAIL_TABLE);
  } catch {
    return false;
  }
  if (!durable) return false;
  const result = await q(
    `UPDATE \`${READY_MAIL_TABLE}\` SET claimed_at = ? WHERE claim_key = ? AND status = 'sending' AND attempts = ?`,
    [sqlTime(now), key, attempt],
  );
  return writeCount(result) === 1;
}

export async function finishReadyMail(key, attempt, ok, errorText = "", now = new Date()) {
  if (!key) return;
  if (!attempt) {
    if (!localFlight.has(key)) return;
    localFlight.delete(key);
    if (ok) localSent.add(key);
    return;
  }
  let durable = false;
  try {
    durable = await tableExists(READY_MAIL_TABLE);
  } catch {
    return;
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
