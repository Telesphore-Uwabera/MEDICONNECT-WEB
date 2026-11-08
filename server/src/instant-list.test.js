import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rows: [],
  patients: [{ id: 55 }],
  columns: new Set(["id", "patient_id", "user_id", "guest_email", "guest_phone", "doctor_id", "status", "created_at", "guest_token"]),
}));

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => ["instant_consultation_requests", "patients", "doctors", "users"].includes(name),
    hasColumn: async (_table, name) => db.columns.has(name),
    q: async (sql) => {
      const text = String(sql);
      if (text.includes("FROM patients")) return db.patients;
      if (text.includes("status IN")) {
        return db.rows.filter((row) => ["pending", "queued", "waiting", "payment_pending", "confirmed", "accepted", "in_progress"].includes(row.status));
      }
      return db.rows;
    },
    one: async (sql) => {
      if (String(sql).includes("FROM doctors")) return { name: "Assigned Doctor", consultation_fee: 10 };
      return null;
    },
  };
});

const { registerDedicatedResourceRoutes } = await import("./dedicated-ids.js");
const { registerPatientInstantList } = await import("./instant-list.js");

const owner = { id: 9, email: "owner@example.com", phone: "789107304", active_role: "patient", role: "patient" };

function app() {
  const api = express();
  const router = express.Router();
  const pass = (req, _res, next) => next();
  router.use((req, _res, next) => {
    req.user = owner;
    next();
  });
  registerDedicatedResourceRoutes(router, { requireAuth: pass, requireRole: () => pass });
  registerPatientInstantList(router, { requireAuth: pass, requireRole: () => pass });
  api.use("/api/v1", router);
  return api;
}

function listen(api) {
  return new Promise((resolve) => {
    const server = api.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function get(path) {
  const server = await listen(app());
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe("mounted patient instant list", () => {
  beforeEach(() => {
    db.patients = [{ id: 55 }];
    db.columns = new Set(["id", "patient_id", "user_id", "guest_email", "guest_phone", "doctor_id", "status", "created_at", "guest_token"]);
    db.rows = [];
  });

  it("falls through the earlier catalog route and pages 10 of 12 newest first", async () => {
    db.rows = Array.from({ length: 12 }, (_, index) => ({
      id: 101 + index,
      patient_id: 55,
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
  });

  it("keeps a legacy user id, a profile id, and an email match, and drops another patient", async () => {
    db.rows = [
      { id: 74, patient_id: 55, doctor_id: 31, status: "pending", created_at: "2026-10-18 08:00:00", guest_token: "old-token" },
      { id: 106, patient_id: 9, doctor_id: 31, status: "pending", created_at: "2026-11-08 06:17:00", guest_token: "legacy-user-token" },
      { id: 107, patient_id: null, guest_email: "owner@example.com", doctor_id: 31, status: "pending", created_at: "2026-11-08 07:00:00", guest_token: "email-token" },
      { id: 8, patient_id: 999, guest_email: "other@example.com", doctor_id: 31, status: "pending", created_at: "2026-11-01 00:00:00", guest_token: "stranger-token" },
    ];
    const { body } = await get("/api/v1/patient/instant-consultations");
    expect(body.data.map((row) => row.id).sort((a, b) => a - b)).toEqual([74, 106, 107]);
    expect(body.open.map((row) => row.id)).toContain(106);
    expect(JSON.stringify(body)).not.toContain("stranger-token");
    expect(JSON.stringify(body)).not.toContain("email-token");
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
      { id: 3, patient_id: 55, doctor_id: 31, status: "completed", created_at: "2026-11-08 06:00:00" },
      { id: 2, patient_id: 55, doctor_id: 31, status: "pending", created_at: "2026-10-18 08:00:00" },
      { id: 1, patient_id: 55, doctor_id: 31, status: "cancelled", created_at: "2026-10-01 08:00:00" },
    ];
    const { body } = await get("/api/v1/patient/instant-consultations?date_from=2026-11-01&date_to=2026-11-08");
    expect(body.data.map((row) => row.id)).toEqual([3]);
    expect(body.total).toBe(1);
    expect(body.counts).toMatchObject({ total: 3, pending: 1, completed: 1, cancelled: 1 });
    expect(body.open.map((row) => row.id)).toEqual([2]);
  });
});
