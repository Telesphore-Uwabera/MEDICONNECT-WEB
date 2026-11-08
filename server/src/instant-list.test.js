import express from "express";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ROW_FIELDS = [
  "id", "patient_id", "user_id", "guest_email", "guest_phone", "email", "phone",
  "doctor_id", "status", "created_at", "guest_token", "amount", "currency", "payment_status",
  "daily_room_url", "room_url", "daily_room_name", "room_name",
];

const db = vi.hoisted(() => ({
  rows: [],
  patients: [
    { id: 55, user_id: 9 },
    { id: 9, user_id: 77 },
  ],
  columns: new Set(["id", "patient_id", "user_id", "guest_email", "guest_phone", "doctor_id", "status", "created_at", "guest_token"]),
  queries: [],
  fetches: [],
}));

const database = new DatabaseSync(":memory:");
database.exec(`
  CREATE TABLE patients (id INTEGER, user_id INTEGER);
  CREATE TABLE users (id INTEGER, name TEXT);
  CREATE TABLE doctors (
    id INTEGER, user_id INTEGER, consultation_fee REAL,
    specialization_fee_id INTEGER, specialization TEXT
  );
  CREATE TABLE instant_consultation_requests (
    id INTEGER, patient_id INTEGER, user_id INTEGER,
    guest_email TEXT, guest_phone TEXT, email TEXT, phone TEXT,
    doctor_id INTEGER, status TEXT, created_at TEXT, guest_token TEXT,
    amount REAL, currency TEXT, payment_status TEXT,
    daily_room_url TEXT, room_url TEXT, daily_room_name TEXT, room_name TEXT
  );
`);
database.prepare("INSERT INTO users (id, name) VALUES (?, ?)").run(31, "Assigned Doctor");
database.prepare("INSERT INTO doctors (id, user_id, consultation_fee) VALUES (?, ?, ?)").run(31, 31, 10);

function toSqlite(sql) {
  return String(sql)
    .replace(/`/g, '"')
    .replace(/\bCHAR_LENGTH\s*\(/gi, "length(")
    .replace(/\bSUBSTRING\s*\(/gi, "substr(")
    .replace(/\bLEFT\s*\(\s*"created_at"\s*,\s*10\s*\)/gi, 'substr("created_at", 1, 10)');
}

function sync() {
  database.exec("DELETE FROM patients");
  database.exec("DELETE FROM instant_consultation_requests");
  const insertPatient = database.prepare("INSERT INTO patients (id, user_id) VALUES (?, ?)");
  for (const patient of db.patients) insertPatient.run(patient.id ?? null, patient.user_id ?? null);
  const insertRow = database.prepare(
    `INSERT INTO instant_consultation_requests (${ROW_FIELDS.join(",")}) VALUES (${ROW_FIELDS.map(() => "?").join(",")})`,
  );
  for (const row of db.rows) {
    insertRow.run(...ROW_FIELDS.map((field) => (row[field] == null ? null : row[field])));
  }
}

function query(sql, params = []) {
  db.queries.push(String(sql));
  sync();
  const statement = database.prepare(toSqlite(sql));
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
    tableExists: async (name) => ["instant_consultation_requests", "patients", "doctors", "users"].includes(name),
    hasColumn: async (table, name) => {
      if (table === "patients") return name === "id" || name === "user_id";
      if (table === "doctors" || table === "users") return true;
      return db.columns.has(name);
    },
    q: async (sql, params) => query(sql, params),
    one: async (sql, params) => query(sql, params)[0] ?? null,
  };
});

const { registerDedicatedResourceRoutes } = await import("./dedicated-ids.js");
const { registerPatientInstantList } = await import("./instant-list.js");
const { publicRoutes } = await import("./public.js");
const { instantOwnedWhere, ownsInstant } = await import("./instant-visit.js");

const owner = { id: 9, email: "owner@example.com", phone: "789107304", active_role: "patient", role: "patient" };
const originalFetch = globalThis.fetch;
const envKeys = ["PAYMENT_PUBLIC_KEY", "PAYMENT_SECRET_KEY", "PAYMENT_PRODUCT_CODE", "PAYMENT_ENVIRONMENT"];
const savedEnv = {};

function app() {
  const api = express();
  api.use(express.json());
  const router = express.Router();
  const pass = (_req, _res, next) => next();
  router.use((req, _res, next) => {
    req.user = owner;
    next();
  });
  registerDedicatedResourceRoutes(router, { requireAuth: pass, requireRole: () => pass });
  registerPatientInstantList(router, { requireAuth: pass, requireRole: () => pass });
  publicRoutes(router);
  api.use("/api/v1", router);
  api.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message || "error" });
  });
  return api;
}

function listen(api) {
  return new Promise((resolve) => {
    const server = api.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function request(path, options) {
  const server = await listen(app());
  try {
    const { port } = server.address();
    const response = await originalFetch(`http://127.0.0.1:${port}${path}`, options);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const get = (path) => request(path);
const post = (path) => request(path, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});

describe("mounted patient instant list", () => {
  beforeEach(() => {
    db.patients = [
      { id: 55, user_id: 9 },
      { id: 9, user_id: 77 },
    ];
    db.columns = new Set([
      "id", "patient_id", "user_id", "guest_email", "guest_phone", "doctor_id",
      "status", "created_at", "guest_token", "amount", "currency",
    ]);
    db.rows = [];
    db.queries = [];
    db.fetches = [];
    globalThis.fetch = async (url, options) => {
      const target = String(url);
      if (target.startsWith("http://127.0.0.1") || target.startsWith("http://localhost")) {
        return originalFetch(url, options);
      }
      db.fetches.push(target);
      if (!target.includes("irembopay.com")) throw new Error(`unexpected payment host ${target}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { invoiceNumber: "INV-STUB", paymentStatus: "NEW" } }),
      };
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (savedEnv[key] == null) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it("falls through the earlier catalog route and pages 10 of 12 newest first", async () => {
    db.rows = Array.from({ length: 12 }, (_, index) => ({
      id: 101 + index,
      patient_id: 55,
      user_id: 9,
      doctor_id: 31,
      status: "pending",
      created_at: "2026-11-08 06:00:00",
      guest_token: `token-${101 + index}`,
    }));
    const first = await get("/api/v1/patient/instant-consultations?per_page=10");
    const second = await get("/api/v1/patient/instant-consultations?per_page=10&page=2");
    expect(first.status).toBe(200);
    expect(first.body.per_page).toBe(10);
    expect(first.body.total).toBe(12);
    expect(first.body.last_page).toBe(2);
    expect(first.body.data.map((row) => row.id)).toEqual([112, 111, 110, 109, 108, 107, 106, 105, 104, 103]);
    expect(first.body.data.every((row) => row.can_pay === true && row.amount === 10 && row.currency === "RWF")).toBe(true);
    expect(JSON.stringify(first.body)).not.toContain("token-");
    expect(second.body.data.map((row) => row.id)).toEqual([102, 101]);
    expect(first.body.counts.pending).toBe(12);
    expect(first.body.open).toHaveLength(12);
  });

  it("keeps a profile, an account id, and an email match, and hides an id collision", async () => {
    db.rows = [
      { id: 74, patient_id: 55, doctor_id: 31, status: "pending", created_at: "2026-10-18 08:00:00", guest_token: "old-token" },
      { id: 106, patient_id: 9, guest_email: "owner@example.com", doctor_id: 31, status: "pending", created_at: "2026-11-08 06:17:00", guest_token: "legacy-user-token" },
      { id: 107, guest_email: "owner@example.com", doctor_id: 31, status: "pending", created_at: "2026-11-08 07:00:00", guest_token: "email-token" },
      { id: 108, user_id: 9, patient_id: null, doctor_id: 31, status: "pending", created_at: "2026-11-08 07:05:00", guest_token: "account-token" },
      { id: 109, guest_email: "owner@example.com", guest_phone: "788000000", doctor_id: 31, status: "pending", created_at: "2026-11-08 07:06:00", guest_token: "conflict-token" },
      { id: 8, patient_id: 999, guest_email: "other@example.com", doctor_id: 31, status: "pending", created_at: "2026-11-01 00:00:00", guest_token: "stranger-token" },
    ];
    const { body } = await get("/api/v1/patient/instant-consultations");
    expect(body.data.map((row) => row.id).sort((a, b) => a - b)).toEqual([74, 107, 108]);
    expect(body.open.map((row) => row.id)).toEqual(expect.arrayContaining([74, 107, 108]));
    expect(body.open.map((row) => row.id)).not.toContain(106);
    const leaked = JSON.stringify(body);
    expect(leaked).not.toContain("legacy-user-token");
    expect(leaked).not.toContain("conflict-token");
    expect(leaked).not.toContain("stranger-token");
    expect(leaked).not.toContain("owner@example.com");
  });

  it("does not start a payment for a different patient who shares the account integer", async () => {
    db.rows = [
      { id: 106, patient_id: 9, guest_email: "owner@example.com", guest_phone: "789107304", doctor_id: 31, status: "pending", amount: 10, currency: "RWF", created_at: "2026-11-08 06:17:00", guest_token: "legacy-user-token" },
      { id: 108, user_id: 9, patient_id: 55, doctor_id: 31, status: "pending", amount: 10, currency: "RWF", created_at: "2026-11-08 07:05:00", guest_token: "account-token" },
    ];
    for (const key of envKeys) savedEnv[key] = process.env[key];
    process.env.PAYMENT_PUBLIC_KEY = "pk_test_stub";
    process.env.PAYMENT_SECRET_KEY = "sk_test_stub";
    process.env.PAYMENT_PRODUCT_CODE = "stub-product";
    process.env.PAYMENT_ENVIRONMENT = "production";
    const denied = await post("/api/v1/public/instant-consultations/pay/106");
    expect(denied.status).toBe(404);
    expect(db.fetches).toEqual([]);
    const allowed = await post("/api/v1/public/instant-consultations/pay/108");
    expect(allowed.status).toBe(200);
    expect(allowed.body).toMatchObject({ invoice_number: "INV-STUB", amount: 10, currency: "RWF", status: "pending" });
    expect(db.fetches.length).toBeGreaterThan(0);
    expect(db.fetches.every((url) => url.includes("irembopay.com"))).toBe(true);
    expect(JSON.stringify(allowed.body)).not.toContain("account-token");
  });

  it("still offers the doctor fee when payment columns are absent", async () => {
    db.columns = new Set(["id", "patient_id", "doctor_id", "status", "created_at", "guest_token"]);
    db.rows = [{
      id: 106,
      patient_id: 55,
      doctor_id: 31,
      status: "pending",
      created_at: "2026-11-08 06:17:00",
      guest_token: "hidden-token",
    }];
    const { body } = await get("/api/v1/patient/instant-consultations");
    expect(body.data[0]).toMatchObject({
      id: 106,
      payment_status: null,
      amount: 10,
      currency: "RWF",
      can_pay: true,
      can_join: false,
    });
    expect(body.data[0].guest_token).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("hidden-token");
  });

  it("filters the page by created day and keeps the unfiltered counts", async () => {
    db.rows = [
      { id: 3, patient_id: 55, user_id: 9, doctor_id: 31, status: "completed", created_at: "2026-11-08 06:00:00" },
      { id: 2, patient_id: 55, user_id: 9, doctor_id: 31, status: "pending", created_at: "2026-10-18 08:00:00" },
      { id: 1, patient_id: 55, user_id: 9, doctor_id: 31, status: "cancelled", created_at: "2026-10-01 08:00:00" },
    ];
    const { body } = await get("/api/v1/patient/instant-consultations?date_from=2026-11-01&date_to=2026-11-08");
    expect(body.data.map((row) => row.id)).toEqual([3]);
    expect(body.total).toBe(1);
    expect(body.counts).toMatchObject({ total: 3, pending: 1, completed: 1, cancelled: 1 });
    expect(body.open.map((row) => row.id)).toEqual([2]);
  });

  it("pages and counts every owned row past 200, including the oldest and newest", async () => {
    db.rows = Array.from({ length: 205 }, (_, index) => ({
      id: index + 1,
      patient_id: 55,
      user_id: 9,
      doctor_id: 31,
      status: index + 1 === 205 ? "completed" : "pending",
      created_at: `2026-01-01 ${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00`,
    }));
    const first = await get("/api/v1/patient/instant-consultations?per_page=10");
    const last = await get("/api/v1/patient/instant-consultations?per_page=10&page=21");
    expect(first.body.total).toBe(205);
    expect(first.body.counts.total).toBe(205);
    expect(first.body.counts.pending).toBe(204);
    expect(first.body.counts.completed).toBe(1);
    expect(first.body.last_page).toBe(21);
    expect(first.body.data[0].id).toBe(205);
    expect(first.body.data).toHaveLength(10);
    expect(last.body.data.map((row) => row.id)).toContain(1);
    expect(first.body.open.map((row) => row.id)).toContain(1);
    expect(first.body.open.map((row) => row.id)).not.toContain(205);
    expect(db.queries.some((sql) => /LIMIT\s+200\b/.test(sql))).toBe(false);
  });

  it("uses the same ownership predicate the payment route uses", () => {
    const viewer = {
      userId: 9,
      patientIds: [55],
      email: "owner@example.com",
      phone: "789107304",
      occupiedUserId: 77,
    };
    const where = instantOwnedWhere(viewer, db.columns);
    const samples = [
      { id: 1, patient_id: 55, user_id: 9 },
      { id: 2, patient_id: 9, guest_email: "owner@example.com" },
      { id: 3, user_id: 9, patient_id: 9 },
      { id: 4, guest_email: "owner@example.com" },
      { id: 5, guest_email: "owner@example.com", guest_phone: "788000000" },
      { id: 6, user_id: 8, patient_id: 55 },
      { id: 7, guest_phone: "+250789107304" },
    ];
    db.rows = samples;
    const selected = query(
      `SELECT id FROM instant_consultation_requests WHERE ${where.sql}`,
      where.params,
    ).map((row) => row.id);
    const expected = samples.filter((row) => ownsInstant(row, viewer)).map((row) => row.id);
    expect(selected.sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b));
    expect(expected).toEqual([1, 4, 7]);
  });
});
