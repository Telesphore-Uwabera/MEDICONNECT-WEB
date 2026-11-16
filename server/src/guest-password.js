import { randomBytes } from "crypto";
import { hasColumn, one, update } from "./db.js";
import { hashPassword, verifyPassword } from "./auth.js";
import { pick } from "./user-text.js";

/** A guest who has not signed in yet has this long to use the latest password. */
export const TEMP_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const FLAG_COLUMNS = ["password_must_change", "temp_password_expires_at", "temp_password_used_at"];

export function freshTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function flagOn(value) {
  return value === 1 || value === true || value === "1";
}

/**
 * pending: still email the password (and rotate it).
 * used: they signed in or joined; stop.
 * expired: the latest password is too old; stop and refuse login.
 * permanent: a normal account, or the tracking columns are absent.
 */
export function guestPasswordState(user, now = Date.now()) {
  if (!user) return "missing";
  const tracked = user.password_must_change != null
    || user.temp_password_expires_at != null
    || user.temp_password_used_at != null;
  if (!tracked || !flagOn(user.password_must_change)) return "permanent";
  if (user.temp_password_used_at) return "used";
  const expires = new Date(user.temp_password_expires_at || 0).getTime();
  if (!expires || expires <= now) return "expired";
  return "pending";
}

export function mayReissue(user, now = Date.now()) {
  return guestPasswordState(user, now) === "pending";
}

/** The settings screens and the first-login form both use this length. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * A normal account must prove the current password before choosing a new one.
 * A guest whose account is still flagged password_must_change has just signed
 * in with the temporary password. The first-login form does not ask for it
 * again, so current_password may be omitted. The new password still cannot be
 * that temporary password, and it still has to meet the length rule.
 */
export async function reviewPasswordChange(user, body, lang = "en") {
  const next = String(body?.password || "");
  const confirmation = body?.password_confirmation;
  const current = String(body?.current_password || "");
  const copy = {
    missing: pick(lang, {
      en: "Enter your current password.",
      fr: "Saisissez votre mot de passe actuel.",
      rw: "Andika ijambo ry'ibanga ukoresha ubu.",
    }),
    wrong: pick(lang, {
      en: "That current password is not correct.",
      fr: "Ce mot de passe actuel n'est pas correct.",
      rw: "Iryo jambo ry'ibanga rya none ntabwo ari ryo.",
    }),
    short: pick(lang, {
      en: "Use at least 8 characters.",
      fr: "Utilisez au moins 8 caractères.",
      rw: "Koresha byibuze inyuguti 8.",
    }),
    same: pick(lang, {
      en: "Choose a password that is different from your current one.",
      fr: "Choisissez un mot de passe différent de celui que vous utilisez.",
      rw: "Hitamo ijambo ry'ibanga ritandukanye n'iryo ukoresha ubu.",
    }),
    mismatch: pick(lang, {
      en: "Password confirmation does not match.",
      fr: "La confirmation du mot de passe ne correspond pas.",
      rw: "Kwemeza ijambo ry'ibanga ntibihuye.",
    }),
  };
  if (next.length < MIN_PASSWORD_LENGTH) return { ok: false, status: 422, message: copy.short };
  if (confirmation != null && confirmation !== next) return { ok: false, status: 422, message: copy.mismatch };
  const mustChange = flagOn(user?.password_must_change);
  if (!mustChange) {
    if (!current) return { ok: false, status: 422, message: copy.missing };
    if (!(await verifyPassword(current, user?.password))) return { ok: false, status: 422, message: copy.wrong };
  }
  if ((current && current === next) || await verifyPassword(next, user?.password)) {
    return { ok: false, status: 422, message: copy.same };
  }
  return { ok: true, mustChange };
}

export function loginDecision(user, passwordOk, now = Date.now()) {
  if (!passwordOk) return { ok: false, status: 401, message: "Incorrect password." };
  const state = guestPasswordState(user, now);
  if (state === "expired") {
    return { ok: false, status: 401, message: "This temporary password has expired. Use Forgot password to choose a new one." };
  }
  const mustChange = flagOn(user?.password_must_change);
  if (state === "pending") return { ok: true, markUsed: true, mustChange: true };
  return { ok: true, markUsed: false, mustChange };
}

export function guestAccessLine(lang, email, plain) {
  if (!plain) return "";
  return pick(lang, {
    en: `Temporary password for ${email}: ${plain}. Change it after you sign in. It expires in 7 days.`,
    fr: `Mot de passe temporaire pour ${email} : ${plain}. Changez-le après la connexion. Il expire dans 7 jours.`,
    rw: `Ijambo ry'ibanga ry'igihe gito rya ${email}: ${plain}. Rihindure nyuma yo kwinjira. Rirangira mu minsi 7.`,
  });
}

async function flagsReady() {
  try {
    for (const name of FLAG_COLUMNS) {
      if (!(await hasColumn("users", name))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function createGuestPassword(now = Date.now()) {
  const plain = freshTemporaryPassword();
  const password = await hashPassword(plain);
  const extra = (await flagsReady())
    ? {
      password_must_change: 1,
      temp_password_expires_at: new Date(now + TEMP_PASSWORD_TTL_MS),
      temp_password_used_at: null,
    }
    : {};
  return { plain, password, extra };
}

/** New password for a guest who has not used the previous one. Old hash is replaced. */
export async function reissueGuestPassword(userId, now = Date.now()) {
  const id = Number(userId);
  if (!id || !(await flagsReady())) return null;
  const user = await one("SELECT * FROM users WHERE id = ? LIMIT 1", [id]).catch(() => null);
  if (!mayReissue(user, now)) return null;
  const plain = freshTemporaryPassword();
  await update("users", id, {
    password: await hashPassword(plain),
    password_must_change: 1,
    temp_password_expires_at: new Date(now + TEMP_PASSWORD_TTL_MS),
    temp_password_used_at: null,
  });
  return { email: user.email || "", plain };
}

export async function markGuestPasswordUsed(userId, now = Date.now()) {
  const id = Number(userId);
  if (!id || !(await flagsReady())) return false;
  const user = await one("SELECT * FROM users WHERE id = ? LIMIT 1", [id]).catch(() => null);
  if (!user || guestPasswordState(user, now) === "permanent") return false;
  if (user.temp_password_used_at) return true;
  await update("users", id, { temp_password_used_at: new Date(now) });
  return true;
}

export async function checkGuestLogin(user, password) {
  const passwordOk = Boolean(user && await verifyPassword(password, user.password));
  return loginDecision(user, passwordOk, Date.now());
}
