import fs from "fs";
import os from "os";
import path from "path";
import express from "express";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = new DatabaseSync(":memory:");

function columns(table) {
  try {
    return new Set(database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
  } catch {
    return new Set();
  }
}

function reset() {
  database.exec(`
    DROP TABLE IF EXISTS patients;
    DROP TABLE IF EXISTS pharmacies;
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS instant_consultation_requests;
    DROP TABLE IF EXISTS prescriptions;
    DROP TABLE IF EXISTS pharmacy_prescription_requests;
    DROP TABLE IF EXISTS consultation_summaries;
    CREATE TABLE patients (id INTEGER PRIMARY KEY, user_id INTEGER);
    CREATE TABLE pharmacies (id INTEGER PRIMARY KEY, user_id INTEGER);
    CREATE TABLE appointments (
      id INTEGER PRIMARY KEY,
      doctor_id INTEGER,
      patient_id INTEGER,
      status TEXT
    );
    CREATE TABLE instant_consultation_requests (
      id INTEGER PRIMARY KEY,
      doctor_id INTEGER,
      patient_id INTEGER,
      user_id INTEGER,
      guest_email TEXT
    );
    CREATE TABLE prescriptions (
      id INTEGER PRIMARY KEY,
      doctor_id INTEGER,
      patient_id INTEGER
    );
    CREATE TABLE pharmacy_prescription_requests (
      id INTEGER PRIMARY KEY,
      prescription_id INTEGER,
      pharmacy_id INTEGER,
      doctor_id INTEGER
    );
    CREATE TABLE consultation_summaries (
      id INTEGER PRIMARY KEY,
      doctor_id INTEGER,
      patient_id INTEGER
    );
    INSERT INTO patients (id, user_id) VALUES (55, 1004);
    INSERT INTO pharmacies (id, user_id) VALUES (7, 200);
  `);
}

vi.mock("./db.js", () => ({
  tableExists: async (name) => columns(name).size > 0,
  hasColumn: async (table, column) => columns(table).has(column),
  q: async () => [],
  one: async (sql, params = []) => database.prepare(String(sql).replace(/`/g, '"')).all(...params)[0] ?? null,
  update: async () => {},
}));

const { hasClinicalLink, privateFileGuard, readStoredUpload } = await import("./private-documents.js");
const { decideDocumentAccess, registerPrivateDocumentRoutes } = await import("./private-documents.js");

const signature = {
  doctorId: 31,
  userId: 1003,
  field: "signature",
  filename: "signature_31.webp",
};

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function appFor() {
  const app = express();
  const router = express.Router();
  router.use((req, _res, next) => {
    const raw = req.headers["x-user"];
    req.user = raw ? JSON.parse(raw) : null;
    next();
  });
  registerPrivateDocumentRoutes(router, {
    requireAuth(req, res, next) {
      if (!req.user) return res.status(401).json({ message: "Unauthenticated." });
      return next();
    },
    lookup: async () => signature,
    readFile: () => Buffer.from("signature-bytes"),
    loadStoredField: async () => signature,
  });
  app.use("/api/v1", router);
  return app;
}

async function openAs(server, user) {
  const { port } = server.address();
  return fetch(`http://127.0.0.1:${port}/api/v1/documents/open?path=signature_31.webp`, {
    headers: user ? { "x-user": JSON.stringify(user) } : {},
  });
}

describe("signature viewers", () => {
  beforeEach(reset);

  it("serves the owner doctor and an admin, and refuses everyone else without a visit", async () => {
    const server = await listen(appFor());
    try {
      const owner = await openAs(server, { id: 1003, role: "doctor" });
      const admin = await openAs(server, { id: 1, role: "admin" });
      const unrelated = await openAs(server, { id: 999, role: "patient" });
      const anonymous = await openAs(server);
      expect(owner.status).toBe(200);
      expect(admin.status).toBe(200);
      expect(unrelated.status).toBe(403);
      expect(anonymous.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("serves an instant patient and an appointment-only patient", async () => {
    database.prepare(
      "INSERT INTO instant_consultation_requests (id, doctor_id, patient_id, user_id) VALUES (2, 31, 55, NULL)",
    ).run();
    const instantServer = await listen(appFor());
    try {
      const instantPatient = await openAs(instantServer, { id: 1004, role: "patient" });
      expect(instantPatient.status).toBe(200);
    } finally {
      instantServer.close();
    }
    await expect(hasClinicalLink({ id: 1004, role: "patient" }, 31)).resolves.toBe(true);
    expect(decideDocumentAccess({ field: "signature", isAdmin: false, isOwner: false, hasClinicalLink: true })).toBe("allow");

    database.exec("DELETE FROM instant_consultation_requests");
    database.prepare(
      "INSERT INTO appointments (id, doctor_id, patient_id, status) VALUES (5, 31, 1004, 'confirmed')",
    ).run();
    expect(columns("appointments").has("user_id")).toBe(false);
    await expect(hasClinicalLink({ id: 1004, role: "patient" }, 31)).resolves.toBe(true);

    const server = await listen(appFor());
    try {
      const appointmentPatient = await openAs(server, { id: 1004, role: "patient" });
      expect(appointmentPatient.status).toBe(200);
    } finally {
      server.close();
    }
  });

  it("serves a pharmacy with a prescription request and still refuses an unrelated user", async () => {
    database.prepare(
      "INSERT INTO prescriptions (id, doctor_id, patient_id) VALUES (9, 31, 55)",
    ).run();
    database.prepare(
      "INSERT INTO pharmacy_prescription_requests (id, prescription_id, pharmacy_id, doctor_id) VALUES (3, 9, 7, NULL)",
    ).run();
    await expect(hasClinicalLink({ id: 200, role: "pharmacy" }, 31)).resolves.toBe(true);
    database.exec("UPDATE pharmacy_prescription_requests SET doctor_id = NULL");
    await expect(hasClinicalLink({ id: 200, role: "pharmacy" }, 31)).resolves.toBe(true);
    database.exec("DELETE FROM pharmacy_prescription_requests");
    await expect(hasClinicalLink({ id: 200, role: "pharmacy" }, 31)).resolves.toBe(false);
    await expect(hasClinicalLink({ id: 999, role: "patient" }, 31)).resolves.toBe(false);
  });
});

describe("private file guard", () => {
  it("refuses the file when the database lookup fails", async () => {
    const app = express();
    app.use("/api/v1/media", privateFileGuard(async () => {
      throw new Error("database down");
    }), (_req, res) => res.status(200).json({ ok: true }));
    const server = await listen(app);
    try {
      const { port } = server.address();
      const blocked = await fetch(`http://127.0.0.1:${port}/api/v1/media/doctor_documents_1.webp`);
      expect(blocked.status).toBe(503);
    } finally {
      server.close();
    }
  });

  it("reads an older signature from a minio subfolder", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mediconnect-minio-"));
    const previous = process.env.MINIO_DIR;
    process.env.MINIO_DIR = root;
    try {
      const file = path.join(root, "doctors", "31", "signature_31.webp");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "old-signature");
      const bytes = readStoredUpload("https://mediconnect.rw/minio/doctors/31/signature_31.webp");
      expect(bytes.toString()).toBe("old-signature");
    } finally {
      if (previous == null) delete process.env.MINIO_DIR;
      else process.env.MINIO_DIR = previous;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
