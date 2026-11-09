import fs from "fs";
import os from "os";
import path from "path";
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
    pool: { query: async () => [[]] },
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
      if (text.includes("doctors")) {
        return { id: 31, user_id: 77, status: "pending", name: "Dr Jane", user_name: "Dr Jane", user_gender: "female" };
      }
      if (text.includes("hospitals")) return { id: 4, user_id: 77, name: "Kigali Clinic" };
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
    const header = String(req.headers.authorization || "");
    if (header) {
      const role = header.includes("role:doctor") ? "doctor" : header.includes("role:hospital") ? "hospital" : "patient";
      req.user = {
        id: 77,
        name: role === "hospital" ? "Kigali Clinic" : role === "doctor" ? "Dr Jane" : "Amina Uwase",
        email: "amina@example.com",
        phone: "788100100",
        country_code: "+250",
        role,
        active_role: role,
        available_roles: [role],
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
  if (auth) headers.Authorization = `Bearer 1|secret role:${auth === true ? "patient" : auth}`;
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

  it("ignores owner fields on a profile subsection and accepts real image bytes", async () => {
    db.profileTables = true;
    const uploadRoot = path.join(os.tmpdir(), `mediconnect-profile-${process.pid}`);
    process.env.UPLOAD_DIR = uploadRoot;
    try {
      const section = await request(server, "/patient/profile/medical-info", {
        auth: true,
        json: {
          blood_type: "O+",
          status: "approved",
          user_id: 8,
          role: "admin",
          active_role: "admin",
          can_be_admin: true,
          profile_completed_at: "2020-01-01",
          hospital_id: 9,
        },
      });
      expect(section.status).toBe(200);
      const saved = writes.find((write) => write.op === "update" && write.table === "patients");
      expect(saved.data).toEqual({ blood_type: "O+" });

      const images = [
        ["png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ".png"],
        ["jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xd9]), ".jpg"],
        ["webp", Buffer.concat([Buffer.from("RIFF"), Buffer.from([8, 0, 0, 0]), Buffer.from("WEBP")]), ".webp"],
      ];
      for (const [name, bytes, extension] of images) {
        writes.length = 0;
        const boundary = `----${name}`;
        const file = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="photo.${name}"\r\nContent-Type: image/${name}\r\n\r\n`),
          bytes,
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);
        const uploaded = await request(server, "/patient/profile/avatar", {
          auth: true,
          form: file,
          contentType: `multipart/form-data; boundary=${boundary}`,
        });
        expect(uploaded.status).toBe(200);
        const update = writes.find((write) => write.op === "update" && write.table === "patients");
        expect(update.data.avatar.endsWith(extension)).toBe(true);
        const filename = update.data.avatar.split("/").pop();
        const stored = fs.readFileSync(path.join(uploadRoot, "doctors-webp", filename));
        expect(stored.subarray(0, bytes.length)).toEqual(bytes);
      }
    } finally {
      delete process.env.UPLOAD_DIR;
      fs.rmSync(uploadRoot, { recursive: true, force: true });
      await stop();
    }
  });

  it("saves a doctor's own profile and a hospital's own profile", async () => {
    db.profileTables = true;
    const doctor = await request(server, "/doctor/profile", {
      auth: "doctor",
      json: { bio_en: "I treat children", status: "approved", user_id: 8 },
    });
    const hospital = await request(server, "/hospital/profile", {
      auth: "hospital",
      json: { name: "Kigali Clinic", city: "Kigali", status: "approved", user_id: 8 },
    });
    expect(doctor.status).toBe(200);
    expect(hospital.status).toBe(200);
    const doctorUpdate = writes.find((write) => write.op === "update" && write.table === "doctors" && write.data.bio_en);
    expect(doctorUpdate.data).toEqual({ bio_en: "I treat children" });
    const hospitalUpdate = writes.find((write) => write.op === "update" && write.table === "hospitals");
    expect(hospitalUpdate.data).toMatchObject({ name: "Kigali Clinic", city: "Kigali" });
    expect(hospitalUpdate.data.status).toBeUndefined();
    expect(hospitalUpdate.data.user_id).toBeUndefined();
    await stop();
  });
});
