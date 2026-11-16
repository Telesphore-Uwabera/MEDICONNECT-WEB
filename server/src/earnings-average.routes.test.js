import express from "express";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = new DatabaseSync(":memory:");
const queries = [];

function columnNames(table) {
  try {
    return new Set(database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
  } catch {
    return new Set();
  }
}

function reset() {
  queries.length = 0;
  database.exec(`
    DROP TABLE IF EXISTS doctors;
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS instant_consultation_requests;
    CREATE TABLE doctors (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      status TEXT,
      doctor_degree TEXT,
      medical_license TEXT,
      bio_en TEXT,
      bio_fr TEXT,
      bio_kiny TEXT
    );
    CREATE TABLE appointments (
      id INTEGER PRIMARY KEY,
      doctor_id INTEGER,
      status TEXT,
      payment_status TEXT,
      consultation_fee REAL,
      appointment_date TEXT
    );
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY,
      amount REAL,
      status TEXT,
      payable_type TEXT,
      payable_id INTEGER
    );
    CREATE TABLE instant_consultation_requests (
      id INTEGER PRIMARY KEY,
      doctor_id INTEGER,
      status TEXT
    );
    INSERT INTO doctors (id, user_id, status) VALUES (31, 4, 'approved');
    INSERT INTO appointments (id, doctor_id, status, payment_status, consultation_fee, appointment_date)
      VALUES (10, 31, 'completed', 'paid', 3000, '2026-11-01');
    INSERT INTO payments (id, amount, status, payable_type, payable_id) VALUES
      (1, 3000, 'paid', 'appointment', 10),
      (2, 1500, 'paid', 'instant_consultation', 20);
    INSERT INTO instant_consultation_requests (id, doctor_id, status) VALUES (20, 31, 'completed');
  `);
}

function query(sql, params = []) {
  queries.push(String(sql));
  const statement = database.prepare(String(sql).replace(/`/g, '"'));
  try {
    return statement.all(...params.map((value) => (value == null ? null : value)));
  } catch (error) {
    throw new Error(`${error.message}\nSQL: ${sql}`);
  }
}

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => columnNames(name).size > 0,
    hasColumn: async (table, name) => columnNames(table).has(name),
    columns: async (table) => new Map([...columnNames(table)].map((name) => [name, { DATA_TYPE: "varchar" }])),
    q: async (sql, params) => query(sql, params),
    one: async (sql, params) => query(sql, params)[0] ?? null,
    presentRow: async (_table, row) => row,
    presentRows: async (_table, rows) => rows,
    countWhere: async (table, whereSql, params) => {
      const from = /\s/.test(table) ? table : `\`${table}\``;
      return Number(query(`SELECT COUNT(*) AS total FROM ${from} ${whereSql}`, params)[0]?.total ?? 0);
    },
    pool: { query: async (sql) => { throw new Error(`unexpected pool query: ${sql}`); } },
  };
});

const { appRoutes } = await import("./app.js");

function app() {
  const api = express();
  api.use(express.json());
  const router = express.Router();
  router.use((req, _res, next) => {
    req.user = { id: 4, active_role: "doctor", role: "doctor", email: "doctor@example.com" };
    next();
  });
  appRoutes(router);
  api.use("/api/v1", router);
  api.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message || "error" });
  });
  return api;
}

async function get(path) {
  const server = await new Promise((resolve) => {
    const listening = app().listen(0, "127.0.0.1", () => resolve(listening));
  });
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe("doctor earnings average without payments.appointment_id", () => {
  beforeEach(reset);

  it("divides paid appointment and instant totals without reading the missing column", async () => {
    expect(columnNames("payments").has("appointment_id")).toBe(false);
    const response = await get("/api/v1/doctor/wallet/earnings");
    expect(response.status).toBe(200);
    expect(response.body.summary.total_earned).toBe(4500);
    expect(response.body.summary.average_per_appointment).toBe(2250);
    expect(queries.some((sql) => sql.includes("appointment_id"))).toBe(false);
  });
});
