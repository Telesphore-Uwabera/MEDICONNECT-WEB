import * as db from "./db.js";

const { hasColumn, one, pool, q, update } = db;
const forgetColumns = db.forgetColumns || (() => {});

const VERIFIED_TABLES = new Set(["doctors", "hospitals", "pharmacies", "patients", "users"]);

export async function ensureVerifierColumns(table) {
  if (!VERIFIED_TABLES.has(table)) return;
  if (!(await hasColumn(table, "verified_by"))) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN verified_by BIGINT UNSIGNED NULL`).catch(() => {});
    forgetColumns(table);
  }
  if (!(await hasColumn(table, "verified_at"))) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN verified_at TIMESTAMP NULL`).catch(() => {});
    forgetColumns(table);
  }
}

export async function recordVerifier(table, id, adminUserId) {
  if (!VERIFIED_TABLES.has(table) || !adminUserId || !id) return;
  await ensureVerifierColumns(table);
  const patch = {};
  if (await hasColumn(table, "verified_by")) patch.verified_by = adminUserId;
  if (await hasColumn(table, "verified_at")) patch.verified_at = new Date();
  if (await hasColumn(table, "is_verified")) patch.is_verified = 1;
  if (Object.keys(patch).length) await update(table, id, patch);
}

export async function verifierNames(rows) {
  const ids = [...new Set((rows || []).map((row) => Number(row?.verified_by)).filter((id) => id > 0))];
  if (!ids.length) return rows || [];
  const users = await q(
    `SELECT id, name FROM users WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids,
  ).catch(() => []);
  const names = new Map(users.map((user) => [Number(user.id), user.name]));
  return rows.map((row) => ({
    ...row,
    verified_by_name: names.get(Number(row?.verified_by)) || null,
  }));
}
