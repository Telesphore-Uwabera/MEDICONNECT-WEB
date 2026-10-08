import crypto from "crypto";
import bcrypt from "bcryptjs";
import { hasColumn, insert, one, presentRow, q, tableExists, update } from "./db.js";

const USER_TYPE = "App\\Models\\User";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const ROLE_PRIORITY = ["admin", "doctor", "hospital", "pharmacy", "moderator", "finance", "help_desk", "patient"];

export function sortRoleNames(names) {
  return [...names].sort((a, b) => {
    const ai = ROLE_PRIORITY.indexOf(a);
    const bi = ROLE_PRIORITY.indexOf(b);
    return (ai === -1 ? ROLE_PRIORITY.length : ai) - (bi === -1 ? ROLE_PRIORITY.length : bi);
  });
}

export async function roleNames(userId) {
  const rows = await q(
    `SELECT r.name
     FROM model_has_roles m
     JOIN roles r ON r.id = m.role_id
     WHERE m.model_id = ?`,
    [userId],
  );
  return sortRoleNames(rows.map((row) => row.name));
}

export async function toUser(row, activeRole) {
  const names = await roleNames(row.id);
  const switchable = names.filter((name) => ["patient", "doctor", "hospital", "pharmacy"].includes(name));
  const canBeAdmin = Boolean(row.can_be_admin) || names.includes("admin");
  const active = activeRole || row.active_role || (canBeAdmin && names.includes("admin") ? "admin" : switchable[0]) || names[0] || "patient";
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? "",
    country_code: row.country_code ?? "",
    avatar: row.avatar ?? null,
    role: active,
    is_verified: Boolean(row.is_verified || row.email_verified_at || row.phone_verified_at),
    status: row.status ?? "active",
    preferred_language: row.preferred_language ?? null,
    active_role: active,
    available_roles: switchable,
    can_be_admin: canBeAdmin,
  };
}

function roleFromAbilities(abilities) {
  const list = Array.isArray(abilities) ? abilities : [];
  const marked = list.find((item) => String(item).startsWith("role:"));
  return marked ? String(marked).slice(5) : null;
}

export async function issueToken(userId, role) {
  const plain = crypto.randomBytes(20).toString("hex");
  const id = await insert("personal_access_tokens", {
    tokenable_type: USER_TYPE,
    tokenable_id: userId,
    name: "auth",
    token: sha256(plain),
    abilities: ["*", `role:${role}`],
  });
  return `${id}|${plain}`;
}

export async function userFromToken(header) {
  if (!header?.startsWith("Bearer ")) return null;
  const raw = header.slice(7).trim();
  const split = raw.indexOf("|");
  if (split <= 0) return null;
  const id = Number(raw.slice(0, split));
  const plain = raw.slice(split + 1);
  if (!id || !plain) return null;
  const token = await one("SELECT * FROM personal_access_tokens WHERE id = ? AND token = ?", [id, sha256(plain)]);
  if (!token) return null;
  if (token.expires_at && new Date(token.expires_at).getTime() < Date.now()) return null;
  const row = await one("SELECT * FROM users WHERE id = ?", [token.tokenable_id]);
  if (!row) return null;
  let abilities = token.abilities;
  if (typeof abilities === "string") {
    try { abilities = JSON.parse(abilities); } catch { abilities = []; }
  }
  const user = await toUser(row, roleFromAbilities(abilities));
  return { token, row, user };
}

export async function auth(req, res, next) {
  try {
    const found = await userFromToken(req.headers.authorization);
    req.auth = found;
    req.user = found?.user ?? null;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthenticated." });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthenticated." });
    if (!roles.includes(req.user.active_role)) {
      return res.status(403).json({ message: "You do not have access to this area." });
    }
    next();
  };
}

export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(String(plain), String(hash));
}

export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}

export async function findUserByLogin(body) {
  if (body.email) return one("SELECT * FROM users WHERE email = ? LIMIT 1", [String(body.email).trim()]);
  if (body.phone) return one("SELECT * FROM users WHERE phone = ? LIMIT 1", [String(body.phone).trim()]);
  return null;
}

export async function setActiveRole(userId, role) {
  if (await hasColumn("users", "active_role")) {
    await update("users", userId, { active_role: role });
  }
}

export async function ensureRole(userId, role) {
  const names = await roleNames(userId);
  if (names.includes(role)) return;
  const roleRow = await one("SELECT id FROM roles WHERE name = ? LIMIT 1", [role]);
  if (!roleRow) {
    const error = new Error(`Role ${role} is not configured.`);
    error.status = 422;
    throw error;
  }
  const sample = await one("SELECT model_type FROM model_has_roles LIMIT 1");
  await insert("model_has_roles", {
    role_id: roleRow.id,
    model_type: sample?.model_type || USER_TYPE,
    model_id: userId,
  });
}

export async function loadOwnedId(userId, table) {
  if (!(await tableExists(table)) || !(await hasColumn(table, "user_id"))) return null;
  const row = await one(`SELECT id FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId]);
  return row?.id ?? null;
}

export async function publicRow(table, id) {
  const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return presentRow(table, row);
}
