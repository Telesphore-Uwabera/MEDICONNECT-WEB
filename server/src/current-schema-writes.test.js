import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { partitionWrite } from "./write-fields.js";

/**
 * Columns present on the live database before
 * server/sql/2026-11-11-dashboard-data.sql is applied.
 * instant_consultation_requests has no patient_id, payment_status, amount,
 * currency, started_at, ended_at, duration_seconds, declined_at, decline_reason
 * or cancelled_at. patients has no name_en, slug or profile_completed_at.
 * The notes tables and patient_medical_files are absent.
 */
const columnNames = {
  users: ["id", "name", "email", "phone", "country_code", "gender", "password", "status", "active_role", "is_verified", "preferred_language", "avatar", "created_at", "updated_at"],
  patients: ["id", "user_id", "name", "email", "phone", "status", "gender", "date_of_birth", "national_id", "blood_type", "address", "city", "province", "country", "emergency_contact_name", "emergency_contact_relation", "emergency_contact_phone", "created_at", "updated_at"],
  roles: ["id", "name"],
  model_has_roles: ["id", "role_id", "model_id", "model_type"],
  personal_access_tokens: ["id", "tokenable_type", "tokenable_id", "name", "token", "abilities", "expires_at", "created_at", "updated_at"],
  doctors: ["id", "user_id", "consultation_fee", "status", "instant_consultation", "created_at", "updated_at"],
  doctor_wallets: ["id", "doctor_id", "balance", "total_earned", "currency", "created_at", "updated_at"],
  instant_consultation_requests: ["id", "doctor_id", "user_id", "guest_name", "guest_email", "guest_phone", "guest_token", "description", "status", "room_name", "daily_room_name", "created_at", "updated_at", "accepted_at", "completed_at"],
  payments: ["id", "status", "amount", "payable_type", "payable_id", "invoice_number", "appointment_id", "payment_method", "provider_reference", "patient_id", "created_at", "updated_at", "expires_at"],
  consultation_summaries: ["id", "doctor_id", "instant_consultation_id", "appointment_id", "patient_id", "summary", "guest_name", "guest_phone", "guest_email", "created_at", "updated_at"],
};

const tables = Object.fromEntries(Object.keys(columnNames).map((name) => [name, []]));
const writes = [];

function matchRows(sql, params = []) {
  const text = String(sql).replace(/`/g, "");
  if (/^DELETE\s+FROM\s+personal_access_tokens/i.test(text)) {
    const [userId, keep] = params;
    tables.personal_access_tokens = tables.personal_access_tokens.filter((row) => row.tokenable_id !== userId || row.id === keep);
    return [];
  }
  const table = text.match(/FROM\s+(\w+)/i)?.[1];
  if (!table || !tables[table]) return [];
  if (text.includes("JOIN roles")) {
    return tables.model_has_roles
      .filter((row) => Number(row.model_id) === Number(params[0]))
      .map((row) => ({ name: tables.roles.find((role) => role.id === row.role_id)?.name }))
      .filter((row) => row.name);
  }
  let rows = tables[table];
  if (/WHERE\s+email\s*=\s*\?/i.test(text)) rows = rows.filter((row) => row.email === params[0]);
  else if (/WHERE\s+id\s*=\s*\?\s+AND\s+token\s*=\s*\?/i.test(text)) rows = rows.filter((row) => Number(row.id) === Number(params[0]) && row.token === params[1]);
  else if (/WHERE\s+id\s*=\s*\?/i.test(text)) rows = rows.filter((row) => Number(row.id) === Number(params[0]));
  else if (/WHERE\s+user_id\s*=\s*\?/i.test(text)) rows = rows.filter((row) => Number(row.user_id) === Number(params[0]));
  else if (/WHERE\s+name\s*=\s*\?/i.test(text)) rows = rows.filter((row) => row.name === params[0]);
  else if (/WHERE\s+guest_token\s*=\s*\?/i.test(text)) rows = rows.filter((row) => row.guest_token === params[0]);
  else if (/payable_id/i.test(text)) rows = rows.filter((row) => Number(row.payable_id) === Number(params[0]));
  if (/ORDER BY id DESC/i.test(text)) rows = [...rows].sort((a, b) => Number(b.id) - Number(a.id));
  return rows;
}

async function query(sql, params = []) {
  const text = String(sql).replace(/`/g, "");
  if (text.includes("GET_LOCK")) return [[{ locked: 1 }]];
  if (text.includes("RELEASE_LOCK")) return [[{ locked: 1 }]];
  if (/^UPDATE\s+payments/i.test(text)) {
    const id = params[params.length - 5];
    const row = tables.payments.find((item) => Number(item.id) === Number(id));
    if (!row || ["paid", "completed", "success", "successful"].includes(String(row.status || "").toLowerCase())) {
      return [{ affectedRows: 0 }];
    }
    row.status = "paid";
    writes.push({ op: "claim", table: "payments", id: row.id, data: { status: "paid" } });
    return [{ affectedRows: 1 }];
  }
  if (/^UPDATE\s+doctor_wallets/i.test(text)) {
    const id = params.at(-1);
    const wallet = tables.doctor_wallets.find((item) => Number(item.id) === Number(id));
    if (wallet) {
      wallet.balance = Number(wallet.balance || 0) + Number(params[0]);
      wallet.total_earned = Number(wallet.total_earned || 0) + Number(params[1] ?? params[0]);
    }
    return [{ affectedRows: wallet ? 1 : 0 }];
  }
  return [matchRows(sql, params)];
}

vi.mock("./db.js", () => ({
  pool: {
    query,
    getConnection: async () => ({ query, release() {} }),
  },
  columns: async (table) => new Map((columnNames[table] || []).map((name) => [name, { DATA_TYPE: "varchar", COLUMN_TYPE: "varchar(255)", IS_NULLABLE: "YES" }])),
  forgetColumns: () => {},
  hasColumn: async (table, name) => (columnNames[table] || []).includes(name),
  tableExists: async (table) => Boolean(columnNames[table]),
  q: async (sql, params) => matchRows(sql, params),
  one: async (sql, params) => matchRows(sql, params)[0] ?? null,
  present: (row) => row,
  presentRow: async (_table, row) => row,
  presentRows: async (_table, rows) => rows,
  pageArgs: () => ({ page: 1, perPage: 10, offset: 0 }),
  paginateList: ({ data }) => ({ data }),
  countWhere: async () => 0,
  knownWrite: async (table, data) => partitionWrite(data, columnNames[table] || []),
  insert: async (table, data) => {
    const split = partitionWrite(data, columnNames[table] || []);
    if (split.unknown.length) {
      const error = new Error(`unexpected unknown ${table} ${split.unknown.join(",")}`);
      error.status = 422;
      throw error;
    }
    const id = (tables[table].at(-1)?.id || 0) + 1;
    tables[table].push({ id, ...split.payload });
    writes.push({ op: "insert", table, data: split.payload });
    return id;
  },
  update: async (table, id, data) => {
    const split = partitionWrite(data, columnNames[table] || []);
    if (split.unknown.length) {
      const error = new Error(`unexpected unknown ${table} ${split.unknown.join(",")}`);
      error.status = 422;
      throw error;
    }
    const row = tables[table].find((item) => Number(item.id) === Number(id));
    if (row) Object.assign(row, split.payload);
    writes.push({ op: "update", table, id, data: split.payload });
  },
  ensureDoctorSearchFields: async () => {},
  paymentServiceFields: () => ({}),
}));

const { auth } = await import("./auth.js");
const { appRoutes } = await import("./app.js");
const { attachPayerAccount, confirmPaidInvoice, expireLinkedVisit, publicRoutes } = await import("./public.js");

function request(method, path, { token, body } = {}) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.use(auth);
  publicRoutes(router);
  appRoutes(router);
  app.use("/api/v1", router);
  app.use((req, res) => res.status(404).json({ message: "no route", path: req.path }));
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message || "error", status: error.status || 500 });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
          method,
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        resolve({ status: response.status, body: await response.json().catch(() => ({})) });
      } finally {
        server.close();
      }
    });
  });
}

const profile = {
  name: "Amina Uwase",
  gender: "female",
  date_of_birth: "1994-04-12",
  national_id: "1199480012345678",
  blood_type: "O+",
  address: "KG 12 Ave",
  city: "Kigali",
  province: "Kigali",
  country: "Rwanda",
  emergency_contact_name: "Eric",
  emergency_contact_relation: "brother",
  emergency_contact_phone: "788100200",
  phone: "788123456",
  country_code: "+250",
  name_en: "Amina",
  slug: "amina",
};

describe("live writes on the current schema", () => {
  beforeEach(() => {
    writes.length = 0;
    for (const name of Object.keys(tables)) tables[name] = [];
    tables.roles.push({ id: 1, name: "patient" }, { id: 2, name: "doctor" });
    tables.doctors.push({ id: 31, user_id: 4, consultation_fee: 5000, status: "approved", instant_consultation: 1 });
  });

  it("does not 422 instant request, payment confirm, poll, expiry, payer link, profile save or notes", async () => {
    const requested = await request("POST", "/public/instant-consultations/request", {
      body: {
        doctor_id: 31,
        name: "Keza Guest",
        phone: "788123456",
        country_code: "+250",
        email: "keza.guest@example.com",
        symptoms: "Headache since morning",
        patient_id: 99,
        payment_status: "pending",
        amount: 5000,
        currency: "RWF",
        extra_field: "nope",
      },
    });
    expect(requested.status, JSON.stringify(requested.body)).toBe(201);
    const created = writes.find((write) => write.op === "insert" && write.table === "instant_consultation_requests");
    expect(created.data).toMatchObject({ doctor_id: 31, guest_name: "Keza Guest", description: "Headache since morning", status: "pending" });
    expect(created.data).not.toHaveProperty("payment_status");
    expect(created.data).not.toHaveProperty("amount");
    expect(created.data).not.toHaveProperty("currency");
    expect(created.data).not.toHaveProperty("patient_id");
    const visit = tables.instant_consultation_requests[0];

    tables.payments.push({
      id: 8,
      status: "pending",
      amount: 5000,
      payable_type: "instant_consultation",
      payable_id: visit.id,
      patient_id: null,
    });
    const confirmed = await confirmPaidInvoice(tables.payments[0], null);
    expect(confirmed.status).toBe("paid");
    expect(tables.instant_consultation_requests[0].status).toBe("confirmed");
    expect(tables.instant_consultation_requests[0]).not.toHaveProperty("payment_status");
    expect(tables.doctor_wallets[0].balance).toBe(5000);
    const again = await confirmPaidInvoice({ ...tables.payments[0], status: "paid" }, null);
    expect(again.status).toBe("paid");
    expect(tables.doctor_wallets[0].balance).toBe(5000);

    const polled = await request("GET", `/public/instant-consultations/${visit.guest_token}/status`);
    expect(polled.status, JSON.stringify(polled.body)).not.toBe(422);

    tables.instant_consultation_requests.push({
      id: 2,
      doctor_id: 31,
      status: "pending",
      guest_token: "old-token",
      guest_name: "Late Guest",
      created_at: "2020-01-01 00:00:00",
    });
    await expireLinkedVisit({ payable_type: "instant_consultation", payable_id: 2, status: "pending" });
    expect(tables.instant_consultation_requests.find((row) => row.id === 2).status).toBe("expired");
    const expiredWrite = writes.filter((write) => write.table === "instant_consultation_requests" && Number(write.id) === 2).at(-1);
    expect(expiredWrite.data).not.toHaveProperty("payment_status");

    const linked = await attachPayerAccount({
      id: 8,
      payable_type: "instant_consultation",
      payable_id: visit.id,
      patient_id: null,
    });
    expect(linked.email).toBe("keza.guest@example.com");
    const patientInsert = writes.find((write) => write.op === "insert" && write.table === "patients");
    expect(patientInsert.data).not.toHaveProperty("name_en");
    expect(patientInsert.data).not.toHaveProperty("slug");
    const paymentLink = writes.find((write) => write.op === "update" && write.table === "payments" && write.data.patient_id != null);
    expect(paymentLink.data.patient_id).toBe(tables.users.find((row) => row.email === "keza.guest@example.com").id);

    const registered = await request("POST", "/auth/register", {
      body: {
        name: "Amina Uwase",
        email: "amina.schema@example.com",
        password: "secret-pass",
        password_confirmation: "secret-pass",
        role: "patient",
        phone: "788123456",
        country_code: "+250",
      },
    });
    expect(registered.status, JSON.stringify(registered.body)).toBe(201);
    const signedIn = await request("POST", "/auth/login", {
      body: { email: "amina.schema@example.com", password: "secret-pass" },
    });
    expect(signedIn.status).toBe(200);
    const saved = await request("POST", "/patient/profile", { token: signedIn.body.token, body: profile });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    expect(saved.body.user.profile_complete).toBe(true);
    const patient = tables.patients.find((row) => row.email === "amina.schema@example.com" || row.name === "Amina Uwase");
    expect(patient).not.toHaveProperty("name_en");
    expect(patient).not.toHaveProperty("slug");
    expect(patient).not.toHaveProperty("profile_completed_at");

    const amina = tables.users.find((row) => row.email === "amina.schema@example.com");
    tables.users.push({ id: 4, name: "Dr Aline", email: "doctor@example.com", phone: "788000000", status: "active", active_role: "doctor", password: amina.password });
    tables.model_has_roles.push({ id: 9, role_id: 2, model_id: 4, model_type: "App\\Models\\User" });
    const doctor = await request("POST", "/auth/login", { body: { email: "doctor@example.com", password: "secret-pass" } });
    expect(doctor.status, JSON.stringify(doctor.body)).toBe(200);
    const notes = await request("POST", `/doctor/instant-consultations/${visit.id}/notes`, {
      token: doctor.body.token,
      body: { notes: "Guest was seen for a headache." },
    });
    expect(notes.status, JSON.stringify(notes.body)).not.toBe(422);
    expect(notes.body.message).toMatch(/Notes saved/i);

    const summary = await request("POST", "/doctor/consultation-summaries", {
      token: doctor.body.token,
      body: { instant_consultation_id: 2, summary: "Guest consult, no account yet." },
    });
    expect(summary.status, JSON.stringify(summary.body)).not.toBe(422);
    const summaryRow = tables.consultation_summaries.at(-1);
    expect(summaryRow.guest_name).toBe("Late Guest");
    expect(summaryRow.patient_id == null || summaryRow.patient_id === "").toBe(true);
  });
});
