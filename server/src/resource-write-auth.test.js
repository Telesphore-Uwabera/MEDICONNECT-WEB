import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const writes = [];
const db = {
  patientThrows: false,
  careThrows: false,
    columnThrows: false,
    hideUserId: false,
  doctors: [
    { id: 31, user_id: 4 },
    { id: 32, user_id: 5 },
  ],
  pharmacies: [{ id: 8, user_id: 6 }],
  patients: [
    { id: 55, user_id: 77, name: "Amina" },
    { id: 56, user_id: 80, name: "Other" },
    { id: 77, user_id: 8, name: "Foreign Profile" },
  ],
  prescriptions: [
    { id: 5, doctor_id: 31, prescriber_id: 31, patient_id: 55, notes: "" },
    { id: 11, doctor_id: 31, prescriber_id: 31, patient_id: 77, notes: "" },
  ],
  appointments: [
    { id: 5, doctor_id: 31, patient_id: 77, user_id: null, status: "confirmed" },
    { id: 8, doctor_id: 31, patient_id: 55, user_id: null, status: "confirmed" },
    { id: 9, doctor_id: 31, patient_id: 77, user_id: 8, status: "confirmed" },
  ],
  instants: [
    { id: 9, doctor_id: 31, patient_id: 55, user_id: null, status: "accepted" },
    { id: 10, doctor_id: 31, patient_id: 77, user_id: null, status: "accepted" },
    { id: 12, doctor_id: 31, patient_id: 55, user_id: 8, status: "accepted" },
  ],
};

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => [
      "appointments", "prescriptions", "prescription_requests", "patients", "doctors", "pharmacies",
      "patient_medical_infos", "team_members", "instant_consultation_requests",
      "pharmacy_orders", "service_bookings", "hospitals", "users", "leaflets",
    ].includes(name),
    hasColumn: async (table, column) => {
      if (db.columnThrows) throw new Error("columns unreadable");
      if (db.hideUserId && column === "user_id" && (table === "appointments" || table === "instant_consultation_requests")) {
        return false;
      }
      if (table === "leaflets") return false;
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
    q: async (sql, params = []) => {
      const text = String(sql).replace(/`/g, "");
      if (db.careThrows && text.includes("FROM appointments") && text.includes("doctor_id")) {
        throw new Error("care unreadable");
      }
      if (text.includes("FROM patients WHERE user_id")) {
        return db.patients.filter((row) => row.user_id === Number(params[0]));
      }
      if (text.includes("FROM appointments") && text.includes("doctor_id")) {
        return db.appointments.filter((row) => row.doctor_id === Number(params[0]) && row.patient_id === Number(params[1]));
      }
      if (text.includes("instant_consultation_requests") && text.includes("patient_id =")) {
        return db.instants.filter((row) => row.doctor_id === Number(params[0]) && row.patient_id === Number(params[1]));
      }
      if (text.includes("instant_consultation_requests") && text.includes("user_id =")) {
        return db.instants.filter((row) => row.doctor_id === Number(params[0]) && row.user_id === Number(params[1]));
      }
      return [];
    },
    one: async (sql, params = []) => {
      const text = String(sql).replace(/`/g, "");
      if (db.patientThrows && text.includes("FROM patients")) throw new Error("patients unreadable");
      if (db.careThrows && text.includes("FROM appointments") && text.includes("doctor_id")) {
        throw new Error("care unreadable");
      }
      if (text.includes("FROM doctors") && text.includes("WHERE id")) {
        return db.doctors.find((row) => row.id === Number(params[0])) || null;
      }
      if (text.includes("FROM doctors") && text.includes("user_id")) {
        return db.doctors.find((row) => row.user_id === Number(params[0])) || null;
      }
      if (text.includes("FROM pharmacies") && text.includes("user_id")) {
        return db.pharmacies.find((row) => row.user_id === Number(params[0])) || null;
      }
      if (text.includes("FROM hospitals") && text.includes("WHERE id")) {
        return Number(params[0]) === 4 ? { id: 4 } : null;
      }
      if (text.includes("FROM hospitals") && text.includes("user_id")) {
        return { id: 4, user_id: 10 };
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
      if (text.includes("FROM appointments WHERE id") || (text.includes("FROM appointments") && text.includes("WHERE id ="))) {
        return db.appointments.find((row) => row.id === Number(params[0])) || null;
      }
      if (text.includes("instant_consultation_requests") && text.includes("WHERE id")) {
        return db.instants.find((row) => row.id === Number(params[0])) || null;
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
    pool: {
      query: async (...args) => { writes.push({ op: "sql", args }); return []; },
      getConnection: async () => ({
        query: async (sql) => {
          if (String(sql).includes("GET_LOCK")) return [[{ locked: 1 }]];
          return [[{ released: 1 }]];
        },
        release() {},
      }),
    },
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
  hospital: { id: 10, active_role: "hospital", role: "hospital" },
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
    db.hideUserId = false;
    db.appointments = [
      { id: 5, doctor_id: 31, patient_id: 77, user_id: null, status: "confirmed" },
      { id: 8, doctor_id: 31, patient_id: 55, user_id: null, status: "confirmed" },
      { id: 9, doctor_id: 31, patient_id: 77, user_id: 8, status: "confirmed" },
    ];
    db.instants = [
      { id: 9, doctor_id: 31, patient_id: 55, user_id: null, status: "accepted" },
      { id: 10, doctor_id: 31, patient_id: 77, user_id: null, status: "accepted" },
      { id: 12, doctor_id: 31, patient_id: 55, user_id: 8, status: "accepted" },
    ];
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

  it("does not let an appointment id rule write an instant row, or the reverse", async () => {
    const ownInstant = await request(users.patient, "PATCH", "/patient/instant-consultation-requests/9", { status: "accepted" });
    expect(ownInstant.status).toBe(200);
    writes.length = 0;
    const foreignProfile = await request(users.patient, "PATCH", "/patient/instant-consultation-requests/10", { status: "accepted" });
    const contradicted = await request(users.patient, "PATCH", "/patient/instant-consultation-requests/12", { status: "accepted" });
    expect(foreignProfile.status).toBe(403);
    expect(contradicted.status).toBe(403);
    const legacyAppointment = await request(users.patient, "PATCH", "/patient/my-visits/5", { notes: "mine" });
    expect(legacyAppointment.status).toBe(200);
    writes.length = 0;
    const profileOnAppointment = await request(users.patient, "PATCH", "/patient/my-visits/8", { notes: "nope" });
    const foreignUser = await request(users.patient, "DELETE", "/patient/my-visits/9");
    expect(profileOnAppointment.status).toBe(403);
    expect(foreignUser.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("keeps a validated patient on clinical create and rejects a foreign target", async () => {
    const created = await request(users.doctor, "POST", "/doctor/prescriptions", {
      patient_id: 55,
      doctor_id: 99,
      notes: "amoxicillin",
    });
    expect(created.status).toBe(201);
    expect(writes[0]).toMatchObject({ op: "insert", table: "prescriptions" });
    expect(writes[0].data.patient_id).toBe(55);
    expect(writes[0].data.doctor_id).toBe(31);
    writes.length = 0;
    const foreign = await request(users.doctor, "POST", "/doctor/prescriptions", { patient_id: 56, notes: "no" });
    expect(foreign.status).toBe(403);
    const ownRequest = await request(users.patient, "POST", "/patient/prescription-requests", { patient_id: 55, doctor_id: 99 });
    expect(ownRequest.status).toBe(201);
    expect(writes.at(-1).data.patient_id).toBe(55);
    expect(writes.at(-1).data.doctor_id).toBeUndefined();
    writes.length = 0;
    const stolen = await request(users.patient, "POST", "/patient/prescription-requests", { patient_id: 77 });
    const pharmacy = await request(users.pharmacy, "POST", "/pharmacy/pharmacy-orders", { patient_id: 55, pharmacy_id: 99 });
    expect(stolen.status).toBe(403);
    expect(pharmacy.status).toBe(201);
    expect(pharmacy.body.data?.patient_id || writes.at(-1)?.data?.patient_id).toBe(55);
    expect(writes.at(-1).data.pharmacy_id).toBe(8);
    const hospital = await request(users.hospital, "POST", "/hospital/service-bookings", {
      patient_id: 55,
      hospital_id: 99,
    });
    expect(hospital.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({ hospital_id: 4, patient_id: 77 });
    expect(writes.at(-1).data.hospital_id).not.toBe(99);
    writes.length = 0;
    const missing = await request(users.hospital, "POST", "/hospital/service-bookings", { patient_id: 999 });
    expect(missing.status).toBe(422);
    expect(writes).toEqual([]);
  });

  it("refuses an appointment alias and keeps the booking form's account id and doctor", async () => {
    const alias = await request(users.patient, "POST", "/patient/my-visits", {
      doctor_id: 31,
      patient_id: 55,
      appointment_date: "2026-12-01",
      appointment_time: "09:00",
    });
    const quick = await request(users.patient, "POST", "/patient/quick", { doctor_id: 31 });
    const records = await request(users.patient, "POST", "/patient/records/appointments", { doctor_id: 31 });
    expect(alias.status).toBe(405);
    expect(quick.status).toBe(405);
    expect(records.status).toBe(405);
    expect(writes).toEqual([]);
    const booked = await request(users.patient, "POST", "/patient/appointments", {
      doctor_id: 31,
      patient_id: 55,
      appointment_date: "2026-12-01",
      appointment_time: "09:00",
    });
    expect(booked.status).toBe(201);
    const created = writes.find((write) => write.op === "insert" && write.table === "appointments");
    expect(created.data.patient_id).toBe(77);
    expect(created.data.doctor_id).toBe(31);
  });

  it("keeps the visit target on the prescription and booking forms the UI actually posts", async () => {
    writes.length = 0;
    const fromAppointment = await request(users.doctor, "POST", "/doctor/prescriptions", {
      appointment_id: 5,
      doctor_id: 99,
      diagnosis: "malaria",
      notes: "course",
      items: [],
    });
    expect(fromAppointment.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({
      patient_id: 55,
      doctor_id: 31,
      appointment_id: 5,
      diagnosis: "malaria",
    });
    expect(writes.at(-1).data.patient_id).not.toBe(77);
    writes.length = 0;
    const fromInstant = await request(users.doctor, "POST", "/doctor/prescriptions", {
      instant_consultation_id: 9,
      diagnosis: "follow-up",
      items: [],
    });
    expect(fromInstant.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({ patient_id: 55, doctor_id: 31, instant_consultation_id: 9 });
    writes.length = 0;
    const contradicted = await request(users.doctor, "POST", "/doctor/prescriptions", {
      instant_consultation_id: 12,
      diagnosis: "no",
      items: [],
    });
    expect(contradicted.status).toBe(403);
    expect(writes).toEqual([]);
    const booked = await request(users.doctor, "POST", "/doctor/service-bookings", {
      patient_id: 55,
      hospital_id: 4,
      hospital_service_id: 3,
      preferred_date: "2026-12-02",
      preferred_time: "10:00",
      notes: "lab",
      doctor_id: 99,
    });
    expect(booked.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({
      patient_id: 77,
      doctor_id: 31,
      hospital_id: 4,
      hospital_service_id: 3,
      preferred_date: "2026-12-02",
      preferred_time: "10:00",
      notes: "lab",
    });
    writes.length = 0;
    const badHospital = await request(users.doctor, "POST", "/doctor/service-bookings", {
      patient_id: 55,
      hospital_id: 99,
      hospital_service_id: 3,
      preferred_date: "2026-12-02",
      preferred_time: "10:00",
    });
    expect(badHospital.status).toBe(422);
    expect(writes).toEqual([]);
    const patientBooking = await request(users.patient, "POST", "/patient/service-bookings", {
      hospital_id: 4,
      hospital_service_id: 3,
      department_id: 2,
      preferred_date: "2026-12-03",
      preferred_time: "11:30",
      notes: "scan",
    });
    expect(patientBooking.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({
      patient_id: 77,
      hospital_id: 4,
      hospital_service_id: 3,
      department_id: 2,
      preferred_date: "2026-12-03",
      preferred_time: "11:30",
      notes: "scan",
    });
    expect(writes.at(-1).data.doctor_id).toBeUndefined();
  });

  it("does not grant a chart from a conflicting instant while a valid appointment exists", async () => {
    db.appointments = [];
    db.instants = [{ id: 12, doctor_id: 31, patient_id: 55, user_id: 8, status: "accepted" }];
    const contradicted = await request(users.doctor, "PUT", "/doctor/patients/55/record", { known_allergies: "nuts" });
    expect(contradicted.status).toBe(403);
    db.instants = [{ id: 10, doctor_id: 31, patient_id: 77, user_id: null, status: "accepted" }];
    const foreignProfile = await request(users.doctor, "PUT", "/doctor/patients/55/record", { known_allergies: "nuts" });
    expect(foreignProfile.status).toBe(403);
    db.instants = [{ id: 9, doctor_id: 31, patient_id: 55, user_id: 77, status: "accepted" }];
    const linked = await request(users.doctor, "PUT", "/doctor/patients/55/record", { known_allergies: "nuts" });
    expect(linked.status).toBe(200);
    expect(writes.some((write) => JSON.stringify(write).includes("nuts"))).toBe(true);
  });

  it("still finds a care link when appointments have no user_id column", async () => {
    db.hideUserId = true;
    db.instants = [];
    const allowed = await request(users.doctor, "PUT", "/doctor/patients/55/record", { known_allergies: "pollen" });
    expect(allowed.status).toBe(200);
  });

  it("refuses a generic insert that cannot name an owner", async () => {
    const result = await request(users.doctor, "POST", "/doctor/leaflets", { title: "Flu" });
    expect(result.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("hashes a password when an admin creates a user", async () => {
    const result = await request(users.admin, "POST", "/admin/users", {
      name: "New Admin",
      email: "new-admin@example.com",
      password: "a-real-password",
    });
    expect(result.status).toBe(201);
    const created = writes.find((write) => write.op === "insert" && write.table === "users");
    expect(created?.data?.password).toBeTruthy();
    expect(created.data.password).not.toBe("a-real-password");
    expect(created.data.email).toBe("new-admin@example.com");
  });
});
