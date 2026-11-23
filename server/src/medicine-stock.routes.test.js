import express from "express";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = new DatabaseSync(":memory:");

function columnNames(table) {
  try {
    return new Set(database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
  } catch {
    return new Set();
  }
}

function reset() {
  database.exec(`
    DROP TABLE IF EXISTS pharmacies;
    DROP TABLE IF EXISTS pharmacy_medicines;
    DROP TABLE IF EXISTS pharmacy_stocks;
    CREATE TABLE pharmacies (id INTEGER PRIMARY KEY, user_id INTEGER);
    CREATE TABLE pharmacy_medicines (
      id INTEGER PRIMARY KEY,
      pharmacy_id INTEGER,
      name TEXT,
      quantity REAL,
      low_stock_threshold REAL,
      batch_number TEXT,
      expiry_date TEXT
    );
    CREATE TABLE pharmacy_stocks (
      id INTEGER PRIMARY KEY,
      pharmacy_id INTEGER,
      medicine_id INTEGER,
      quantity REAL,
      low_stock_threshold REAL,
      batch_number TEXT,
      expiry_date TEXT
    );
    INSERT INTO pharmacies (id, user_id) VALUES (8, 9), (99, 4);
    INSERT INTO pharmacy_medicines (id, pharmacy_id, name, quantity, low_stock_threshold, batch_number, expiry_date) VALUES
      (1, 8, 'Amoxicillin', 40, 10, 'OWN', '2028-01-01'),
      (2, 8, 'Paracetamol', 3, 10, 'OWN2', '2028-02-01'),
      (3, 8, 'Zinc', 50, 5, 'OWN3', '2028-03-01');
    INSERT INTO pharmacy_stocks (id, pharmacy_id, medicine_id, quantity, low_stock_threshold, batch_number, expiry_date) VALUES
      (11, 99, 1, 2, 10, 'SECRET', '2020-01-01'),
      (12, 8, 1, 25, 5, 'LOCAL', '2027-06-01'),
      (21, 99, 2, 100, 5, 'OTHER', '2029-01-01'),
      (31, 8, 3, 4, 10, 'LOW', '2027-01-15');
  `);
}

function query(sql, params = []) {
  const statement = database.prepare(String(sql).replace(/`/g, '"'));
  return statement.all(...params.map((value) => (value == null ? null : value)));
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

const { registerDedicatedResourceRoutes } = await import("./dedicated-ids.js");

const pharmacyUser = { id: 9, active_role: "pharmacy", role: "pharmacy" };

function app() {
  const api = express();
  api.use(express.json());
  const router = express.Router();
  const pass = (req, _res, next) => {
    req.user = pharmacyUser;
    next();
  };
  registerDedicatedResourceRoutes(router, { requireAuth: pass, requireRole: () => (_req, _res, next) => next() });
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

describe("pharmacy inventory stock routes", () => {
  beforeEach(reset);

  it("returns this pharmacy's quantity, batch and expiry", async () => {
    const response = await get("/api/v1/pharmacy/inventory/medicines");
    expect(response.status).toBe(200);
    const rows = response.body.data;
    const amoxicillin = rows.find((row) => row.id === 1);
    const paracetamol = rows.find((row) => row.id === 2);
    const zinc = rows.find((row) => row.id === 3);
    expect(amoxicillin.stock).toEqual({
      quantity: 25,
      low_stock_threshold: 5,
      batch_number: "LOCAL",
      expiry_date: "2027-06-01",
    });
    expect(paracetamol.stock).toMatchObject({ quantity: 3, batch_number: "OWN2" });
    expect(zinc.stock).toMatchObject({ quantity: 4, batch_number: "LOW", expiry_date: "2027-01-15" });
    expect(JSON.stringify(response.body)).not.toContain("SECRET");
    expect(JSON.stringify(response.body)).not.toContain("OTHER");
  });

  it("keeps the low-stock filter on this pharmacy's rows", async () => {
    const response = await get("/api/v1/pharmacy/inventory/medicines?low_stock=true");
    expect(response.status).toBe(200);
    expect(response.body.data.map((row) => row.id).sort()).toEqual([2, 3]);
    expect(JSON.stringify(response.body)).not.toContain("SECRET");
  });
});
