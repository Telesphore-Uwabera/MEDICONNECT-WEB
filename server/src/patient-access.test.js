import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { partitionWrite, unknownFieldError } from "./write-fields.js";

const tables = {
  users: [],
  patients: [],
  roles: [{ id: 1, name: "patient" }],
  model_has_roles: [],
  personal_access_tokens: [],
};

const columnNames = {
  users: ["id", "name", "email", "phone", "country_code", "gender", "password", "status", "active_role", "preferred_language", "avatar", "is_verified", "email_verified_at", "phone_verified_at", "can_be_admin", "created_at", "updated_at"],
  patients: ["id", "user_id", "name", "email", "phone", "country_code", "status", "gender", "date_of_birth", "national_id", "blood_type", "address", "city", "province", "country", "emergency_contact_name", "emergency_contact_relation", "emergency_contact_phone", "profile_completed_at", "created_at", "updated_at"],
  roles: ["id", "name"],
  model_has_roles: ["id", "role_id", "model_id", "model_type"],
  personal_access_tokens: ["id", "tokenable_type", "tokenable_id", "name", "token", "abilities", "expires_at", "created_at", "updated_at"],
};

function columnMap(table) {
  return new Map((columnNames[table] || []).map((name) => [name, { DATA_TYPE: "varchar", COLUMN_TYPE: "varchar(255)" }]));
}

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
    const modelId = Number(params[0]);
    return tables.model_has_roles
      .filter((row) => Number(row.model_id) === modelId)
      .map((row) => ({ name: tables.roles.find((role) => role.id === row.role_id)?.name }))
      .filter((row) => row.name);
  }
  let rows = tables[table];
  if (/WHERE\s+email\s*=\s*\?/i.test(text)) rows = rows.filter((row) => row.email === params[0]);
  else if (/WHERE\s+id\s*=\s*\?\s+AND\s+token\s*=\s*\?/i.test(text)) {
    rows = rows.filter((row) => Number(row.id) === Number(params[0]) && row.token === params[1]);
  } else if (/WHERE\s+id\s*=\s*\?/i.test(text)) rows = rows.filter((row) => Number(row.id) === Number(params[0]));
  else if (/WHERE\s+user_id\s*=\s*\?/i.test(text)) rows = rows.filter((row) => Number(row.user_id) === Number(params[0]));
  else if (/WHERE\s+name\s*=\s*\?/i.test(text)) rows = rows.filter((row) => row.name === params[0]);
  if (/ORDER BY id DESC/i.test(text)) rows = [...rows].sort((a, b) => Number(b.id) - Number(a.id));
  return rows;
}

vi.mock("./db.js", () => ({
  pool: { query: async (sql, params) => [matchRows(sql, params)] },
  columns: async (table) => columnMap(table),
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
    if (split.unknown.length) throw unknownFieldError(table, split.unknown);
    const id = (tables[table].at(-1)?.id || 0) + 1;
    tables[table].push({ id, ...split.payload });
    return id;
  },
  update: async (table, id, data) => {
    const split = partitionWrite(data, columnNames[table] || []);
    if (split.unknown.length) throw unknownFieldError(table, split.unknown);
    const row = tables[table].find((item) => Number(item.id) === Number(id));
    if (row) Object.assign(row, split.payload);
  },
  ensureDoctorSearchFields: async () => {},
  paymentServiceFields: () => ({}),
}));

const { auth } = await import("./auth.js");
const { appRoutes } = await import("./app.js");

function request(method, path, { token, body } = {}) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.use(auth);
  appRoutes(router);
  app.use("/api/v1", router);
  app.use((req, res) => res.status(404).json({ message: "no route", path: req.path }));
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message || "error" });
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
};

describe("patient signup then profile unlocks the account", () => {
  beforeEach(() => {
    tables.users = [];
    tables.patients = [];
    tables.model_has_roles = [];
    tables.personal_access_tokens = [];
  });

  it("creates the patients row, marks the profile complete, and allows the next patient request", async () => {
    const registered = await request("POST", "/auth/register", {
      body: {
        name: "Amina Uwase",
        email: "amina.access@example.com",
        password: "secret-pass",
        password_confirmation: "secret-pass",
        role: "patient",
        phone: "788123456",
        country_code: "+250",
      },
    });
    expect(registered.status).toBe(201);
    expect(tables.patients).toHaveLength(1);
    expect(tables.patients[0].user_id).toBe(tables.users[0].id);
    expect(tables.patients[0].status).toBe("active");

    const signedIn = await request("POST", "/auth/login", {
      body: { email: "amina.access@example.com", password: "secret-pass" },
    });
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.user.profile_complete).toBe(false);
    const token = signedIn.body.token;

    const blocked = await request("POST", "/patient/appointments", { token, body: { doctor_id: 1 } });
    expect(blocked.status).toBe(403);
    expect(blocked.body.profile_complete).toBe(false);

    const saved = await request("POST", "/patient/profile", { token, body: profile });
    expect(saved.status).toBe(200);
    expect(saved.body.user.profile_complete).toBe(true);
    expect(tables.patients[0].profile_completed_at).toBeTruthy();

    const opened = await request("POST", "/patient/appointments", { token, body: { doctor_id: 1 } });
    expect(opened.status).not.toBe(403);
    expect(opened.body.profile_complete).not.toBe(false);
  });
});
