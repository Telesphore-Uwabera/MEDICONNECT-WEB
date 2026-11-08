import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const writes = [];
const db = {
  patientThrows: false,
  careThrows: false,
  columnThrows: false,
  doctors: [
    { id: 31, user_id: 4 },
    { id: 32, user_id: 5 },
  ],
  pharmacies: [{ id: 8, user_id: 6 }],
  patients: [
    { id: 55, user_id: 77, name: "Amina" },
    { id: 56, user_id: 80, name: "Other" },
  ],
  prescriptions: [{ id: 5, doctor_id: 31, prescriber_id: 31, patient_id: 55, notes: "" }],
  appointments: [{ id: 5, doctor_id: 31, patient_id: 77, status: "confirmed" }],
};

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => [
      "appointments", "prescriptions", "prescription_requests", "patients", "doctors", "pharmacies",
      "patient_medical_infos", "team_members", "instant_consultation_requests",
    ].includes(name),
    hasColumn: async () => {
      if (db.columnThrows) throw new Error("columns unreadable");
      return true;
    },
    insert: async (table, data) => {
      writes.push({ op: "insert", table, data });
      return 50;
    },
    update: async (table, id, data) => {
      writes.push({ op: "update", table, id, data });
      return 1;
    },
    q: async () => [],
    one: async (sql, params = []) => {
      const text = String(sql).replace(/`/g, "");
      if (db.patientThrows && text.includes("FROM patients")) throw new Error("patients unreadable");
      if (db.careThrows && text.includes("FROM appointments") && text.includes("doctor_id")) {
        throw new Error("care unreadable");
      }
      if (text.includes("FROM doctors") && text.includes("user_id")) {
        return db.doctors.find((row) => row.user_id === Number(params[0])) || null;
      }
      if (text.includes("FROM pharmacies") && text.includes("user_id")) {
        return db.pharmacies.find((row) => row.user_id === Number(params[0])) || null;
      }
      if (text.includes("FROM patients WHERE user_id")) {
        return db.patients.find((row) => row.user_id === Number(params[0])) || null;
      }
      if (text.includes("FROM patients WHERE id")) {
        return db.patients.find((row) => row.id === Number(params[0])) || null;
      }
      if (text.includes("FROM prescriptions") || text.includes("FROM prescription_requests")) {
        const row = db.prescriptions.find((item) => item.id === Number(params[0]));
        if (!row) return null;
        if (text.includes("doctor_id = ?") && Number(params[1]) !== Number(row.doctor_id)) return null;
        if (text.includes("patient_id = ?") && Number(params[1]) !== Number(row.patient_id)) return null;
        return row;
      }
      if (text.includes("FROM appointments WHERE id")) {
        return db.appointments.find((row) => row.id === Number(params[0])) || null;
      }
      if (text.includes("FROM appointments") && text.includes("doctor_id")) {
        return db.appointments.find((row) => (
          row.doctor_id === Number(params[0]) && row.patient_id === Number(params[1])
        )) || null;
      }
      if (text.includes("FROM `instant_consultation_requests`") || text.includes("FROM instant_consultation_requests")) {
        return null;
      }
      if (text.includes("FROM patient_medical_infos") || text.includes("FROM `patient_medical_infos`")) return null;
      if (text.includes("FROM team_members")) return { id: Number(params[0]) || 50, name: "Nurse", is_active: 1 };
      return null;
    },
    presentRow: async (_table, row) => row,
    presentRows: async (_table, rows) => rows,
    pool: { query: async (...args) => { writes.push({ op: "sql", args }); return []; } },
    countWhere: async () => 0,
  };
});

const { appRoutes } = await import("./app.js");

const users = {
  patient: { id: 77, active_role: "patient", role: "patient" },
  admin: { id: 1, active_role: "admin", role: "admin" },
  doctor: { id: 4, active_role: "doctor", role: "doctor" },
  otherDoctor: { id: 5, active_role: "doctor", role: "doctor" },
  pharmacy: { id: 6, active_role: "pharmacy", role: "pharmacy" },
};

function request(user, method, path, body) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.use((req, _res, next) => {
    req.user = user;
    next();
  });
  appRoutes(router);
  app.use("/api/v1", router);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message || "error" });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
          method,
          headers: { "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        resolve({ status: response.status, body: await response.json().catch(() => ({})) });
      } finally {
        server.close();
      }
    });
  });
}

describe("resource write authorization", () => {
  beforeEach(() => {
    writes.length = 0;
    db.patientThrows = false;
    db.careThrows = false;
    db.columnThrows = false;
  });

  it("refuses a patient team create and allows an admin manager", async () => {
    const denied = await request(users.patient, "POST", "/admin/team", { name: "Nurse" });
    expect(denied.status).toBe(403);
    expect(writes).toEqual([]);
    const allowed = await request(users.admin, "POST", "/admin/team", { name: "Nurse" });
    expect(allowed.status).toBe(201);
    expect(writes).toEqual([expect.objectContaining({ op: "insert", table: "team_members" })]);
  });

  it("refuses a patient prescription write on the dedicated route and the alias", async () => {
    const dedicated = await request(users.patient, "PATCH", "/doctor/prescriptions/5", { notes: "x", doctor_id: 99 });
    const alias = await request(users.patient, "PATCH", "/doctor/prescription-requests/5", { notes: "x", doctor_id: 99 });
    expect(dedicated.status).toBe(403);
    expect(alias.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("lets the treating doctor update a prescription and ignores a spoofed doctor id", async () => {
    const result = await request(users.doctor, "PATCH", "/doctor/prescription-requests/5", {
      notes: "reviewed",
      doctor_id: 99,
    });
    expect(result.status).toBe(200);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ op: "update", id: "5" });
    expect(writes[0].data.notes).toBe("reviewed");
    expect(writes[0].data.doctor_id).toBeUndefined();
  });

  it("refuses another doctor changing that prescription", async () => {
    const result = await request(users.otherDoctor, "PATCH", "/doctor/prescription-requests/5", { notes: "mine" });
    expect(result.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("refuses a pharmacy write or delete of another clinician's appointment", async () => {
    const patched = await request(users.pharmacy, "PATCH", "/pharmacy/appointments/5", { status: "cancelled" });
    const removed = await request(users.pharmacy, "DELETE", "/pharmacy/appointments/5");
    expect(patched.status).toBe(403);
    expect(removed.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("fails closed when the ownership column lookup throws", async () => {
    db.columnThrows = true;
    const result = await request(users.pharmacy, "PATCH", "/pharmacy/appointments/5", { status: "cancelled" });
    expect(result.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("refuses an unrelated doctor chart write and allows the assigned doctor", async () => {
    const denied = await request(users.doctor, "PUT", "/doctor/patients/56/record", { known_allergies: "penicillin" });
    expect(denied.status).toBe(403);
    expect(writes).toEqual([]);
    const allowed = await request(users.doctor, "PUT", "/doctor/patients/55/record", {
      known_allergies: "penicillin",
      patient_id: 56,
    });
    expect(allowed.status).toBe(200);
    expect(writes.some((write) => write.op === "insert" || write.op === "update")).toBe(true);
    expect(JSON.stringify(writes)).toContain("penicillin");
    expect(JSON.stringify(writes)).not.toContain("\"patient_id\":56");
  });

  it("fails closed when the care-link or patient lookup cannot be read", async () => {
    db.careThrows = true;
    const care = await request(users.doctor, "PUT", "/doctor/patients/55/record", { known_allergies: "penicillin" });
    expect(care.status).toBe(403);
    db.careThrows = false;
    db.patientThrows = true;
    const patient = await request(users.doctor, "PUT", "/doctor/patients/55/record", { known_allergies: "penicillin" });
    expect(patient.status).toBe(403);
    expect(writes).toEqual([]);
  });
});
