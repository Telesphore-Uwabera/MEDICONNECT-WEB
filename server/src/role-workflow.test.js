import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const writes = [];
const db = { profileTables: false };

vi.mock("./mail.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, sendMail: async () => true };
});

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => db.profileTables && ["patients", "hospitals", "doctors", "pharmacies", "users"].includes(name),
    hasColumn: async () => true,
    presentRow: async (_table, row) => row,
    presentRows: async (_table, rows) => rows,
    q: async () => [{ name: "patient" }],
    insert: async (table, data) => {
      writes.push({ op: "insert", table, data });
      return 50;
    },
    update: async (table, id, data) => {
      writes.push({ op: "update", table, id, data });
      return 1;
    },
    one: async (sql) => {
      const text = String(sql);
      if (text.includes("personal_access_tokens")) {
        return { id: 1, tokenable_id: 77, abilities: '["*","role:patient"]', expires_at: null };
      }
      if (text.includes("FROM roles")) return { id: 4 };
      if (text.includes("FROM users") && text.includes("email =")) return null;
      if (text.includes("FROM users")) {
        return {
          id: 77,
          name: "Amina Uwase",
          email: "amina@example.com",
          phone: "788100100",
          country_code: "+250",
          status: "active",
          active_role: "patient",
        };
      }
      if (text.includes("patients")) return { id: 55, user_id: 77, name: "Amina Uwase" };
      return null;
    },
  };
});

const { appRoutes } = await import("./app.js");

function listen() {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.use((req, _res, next) => {
    if (req.headers.authorization) {
      req.user = {
        id: 77,
        name: "Amina Uwase",
        email: "amina@example.com",
        phone: "788100100",
        country_code: "+250",
        role: "patient",
        active_role: "patient",
        available_roles: ["patient"],
        profile_complete: true,
      };
    }
    next();
  });
  appRoutes(router);
  app.use("/api/v1", router);
  app.use((err, _req, res, _next) => {
    console.error("ROUTE", err);
    res.status(err.status || 500).json({ message: err.message });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function request(server, path, { method = "POST", json, form, contentType, auth = false } = {}) {
  const headers = {};
  if (auth) headers.Authorization = "Bearer 1|secret";
  let body;
  if (json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (contentType) {
    headers["Content-Type"] = contentType;
  }
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
    method,
    headers,
    body: form || body,
  });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    return { status: response.status, body: { raw: text.slice(0, 180) } };
  }
}

describe("role signup and profile workflows", () => {
  let server;

  beforeEach(async () => {
    writes.length = 0;
    db.profileTables = false;
    server = await listen();
  });

  async function stop() {
    await new Promise((resolve) => server.close(resolve));
  }

  it("checks signup per role and rejects a phone the form would not send", async () => {
    const badPhone = await request(server, "/auth/register", {
      json: {
        name: "Amina",
        email: "amina@example.com",
        password: "secret-pass",
        password_confirmation: "secret-pass",
        role: "patient",
        phone: "0712345678",
        country_code: "+250",
      },
    });
    const doctor = await request(server, "/auth/register", {
      json: { name: "Dr Jane", email: "jane@example.com", password: "secret-pass", password_confirmation: "secret-pass", role: "doctor" },
    });
    const hospital = await request(server, "/auth/register", {
      json: { name: "Kigali Clinic", email: "clinic@example.com", password: "secret-pass", password_confirmation: "secret-pass", role: "hospital" },
    });
    const pharmacy = await request(server, "/auth/register", {
      json: { name: "City Pharmacy", email: "pharmacy@example.com", password: "secret-pass", password_confirmation: "secret-pass", role: "pharmacy" },
    });
    const withSpeciality = await request(server, "/auth/register", {
      json: {
        name: "Dr Jane",
        email: "jane2@example.com",
        password: "secret-pass",
        password_confirmation: "secret-pass",
        role: "doctor",
        phone: "0789107304",
        country_code: "+250",
        specialities: ["Pediatrics"],
      },
    });
    expect(badPhone.status).toBe(422);
    expect(doctor.status).toBe(422);
    expect(hospital.status).toBe(201);
    expect(pharmacy.status).toBe(201);
    expect(withSpeciality.status).toBe(201);
    expect(writes.some((write) => write.table === "users" && write.data.phone === "0712345678")).toBe(false);
    expect(writes.filter((write) => write.table === "users").map((write) => write.data.active_role)).toEqual(["hospital", "pharmacy", "doctor"]);
    expect(writes.find((write) => write.table === "users" && write.data.email === "jane2@example.com").data.phone).toBe("789107304");
    await stop();
  });

  it("does not open another role's profile and keeps a patient save on the owning fields", async () => {
    db.profileTables = true;
    const foreign = await request(server, "/hospital/profile", {
      auth: true,
      json: { name: "Stolen Clinic", status: "approved", user_id: 8 },
    });
    const birth = await request(server, "/patient/profile", {
      auth: true,
      json: { date_of_birth: "1990-02-31", status: "approved", user_id: 8 },
    });
    const saved = await request(server, "/patient/profile", {
      auth: true,
      json: {
        full_name: "Amina Uwase",
        phone: "0789107304",
        country_code: "+250",
        date_of_birth: "1990-02-28",
        status: "approved",
        user_id: 8,
      },
    });
    const boundary = "----roleworkflow";
    const file = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\n`),
      Buffer.from("not-an-image"),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const upload = await request(server, "/patient/profile/avatar", {
      auth: true,
      form: file,
      contentType: `multipart/form-data; boundary=${boundary}`,
    });
    const otherRole = await request(server, "/pharmacy/profile/logo", {
      auth: true,
      form: file,
      contentType: `multipart/form-data; boundary=${boundary}`,
    });
    expect(foreign.status).toBe(403);
    expect(birth.status).toBe(422);
    expect(saved.status).toBe(200);
    expect(upload.status).toBe(422);
    expect(otherRole.status).toBe(403);
    expect(writes.some((write) => write.table === "hospitals" || write.table === "pharmacies")).toBe(false);
    const patientUpdate = writes.find((write) => write.op === "update" && write.table === "patients");
    expect(patientUpdate.data).toMatchObject({ name: "Amina Uwase", phone: "789107304", date_of_birth: "1990-02-28" });
    expect(patientUpdate.data.status).toBeUndefined();
    expect(patientUpdate.data.user_id).toBeUndefined();
    expect(writes.some((write) => write.op === "update" && write.table === "users" && write.data.phone === "789107304")).toBe(true);
    await stop();
  });
});
