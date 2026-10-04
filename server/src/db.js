import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "mediconnect",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  timezone: "Z",
});

const columnsByTable = new Map();

export async function columns(table) {
  if (columnsByTable.has(table)) return columnsByTable.get(table);
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  const map = new Map(rows.map((row) => [row.COLUMN_NAME, row]));
  columnsByTable.set(table, map);
  return map;
}

export async function hasColumn(table, name) {
  const cols = await columns(table);
  return cols.has(name);
}

export async function tableExists(table) {
  const cols = await columns(table);
  return cols.size > 0;
}

export async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function one(sql, params = []) {
  const rows = await q(sql, params);
  return rows[0] ?? null;
}

export function present(row, cols) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "password" || key === "remember_token") continue;
    const info = cols?.get(key);
    if (value == null) {
      out[key] = value;
      continue;
    }
    if (info?.DATA_TYPE === "tinyint" && String(info.COLUMN_TYPE).startsWith("tinyint(1)")) {
      out[key] = Boolean(value);
      continue;
    }
    if (typeof value === "string" && (info?.DATA_TYPE === "json" || key === "days_of_week" || key === "abilities" || key === "sub_specializations")) {
      try {
        out[key] = JSON.parse(value);
      } catch {
        out[key] = value;
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}

export async function presentRow(table, row) {
  if (!row) return null;
  return present(row, await columns(table));
}

export async function presentRows(table, rows) {
  const cols = await columns(table);
  return rows.map((row) => present(row, cols));
}

export function pageArgs(req, fallback = 15) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || fallback));
  return { page, perPage, offset: (page - 1) * perPage };
}

export function laravelPage({ data, total, page, perPage, path }) {
  const last = Math.max(1, Math.ceil(total / perPage) || 1);
  const withPage = (n) => `${path}?page=${n}`;
  return {
    current_page: page,
    data,
    first_page_url: withPage(1),
    from: total === 0 ? null : (page - 1) * perPage + 1,
    last_page: last,
    last_page_url: withPage(last),
    links: [],
    next_page_url: page < last ? withPage(page + 1) : null,
    path,
    per_page: perPage,
    prev_page_url: page > 1 ? withPage(page - 1) : null,
    to: total === 0 ? null : Math.min(page * perPage, total),
    total,
  };
}

export async function insert(table, data) {
  const cols = await columns(table);
  const payload = {};
  for (const [key, value] of Object.entries(data)) {
    if (!cols.has(key) || key === "id") continue;
    const info = cols.get(key);
    payload[key] = value != null && (info.DATA_TYPE === "json" || typeof value === "object") && !(value instanceof Date)
      ? JSON.stringify(value)
      : value;
  }
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  if (cols.has("created_at") && payload.created_at == null) payload.created_at = now;
  if (cols.has("updated_at")) payload.updated_at = now;
  const keys = Object.keys(payload);
  if (!keys.length) throw new Error(`No writable columns for ${table}`);
  const sql = `INSERT INTO \`${table}\` (${keys.map((key) => `\`${key}\``).join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
  const [result] = await pool.query(sql, keys.map((key) => payload[key]));
  return result.insertId;
}

export async function update(table, id, data) {
  const cols = await columns(table);
  const payload = {};
  for (const [key, value] of Object.entries(data)) {
    if (!cols.has(key) || key === "id") continue;
    const info = cols.get(key);
    payload[key] = value != null && typeof value === "object" && !(value instanceof Date)
      ? JSON.stringify(value)
      : value;
    if (info?.DATA_TYPE === "tinyint" && typeof value === "boolean") payload[key] = value ? 1 : 0;
  }
  if (cols.has("updated_at")) payload.updated_at = new Date().toISOString().slice(0, 19).replace("T", " ");
  const keys = Object.keys(payload);
  if (!keys.length) return;
  const sql = `UPDATE \`${table}\` SET ${keys.map((key) => `\`${key}\` = ?`).join(", ")} WHERE id = ?`;
  await pool.query(sql, [...keys.map((key) => payload[key]), id]);
}

export async function countWhere(table, whereSql, params) {
  const from = /\s/.test(table) ? table : `\`${table}\``;
  const row = await one(`SELECT COUNT(*) AS total FROM ${from} ${whereSql}`, params);
  return Number(row?.total ?? 0);
}
