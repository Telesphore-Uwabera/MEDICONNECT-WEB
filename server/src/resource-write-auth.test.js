import express from "express";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const writes = [];
const db = {
  patientThrows: false,
  careThrows: false,
    columnThrows: false,
    hideUserId: false,
  invoiceCalls: 0,
  doctors: [
    { id: 31, user_id: 4 },
    { id: 32, user_id: 5 },
  ],
  pharmacies: [{ id: 8, user_id: 6 }],
  patients: [
    { id: 55, user_id: 77, name: "Amina", email: "amina@example.com", phone: "788100100" },
    { id: 56, user_id: 80, name: "Other", email: "other@example.com", phone: "788200200" },
    { id: 77, user_id: 8, name: "Foreign Profile", email: "foreign@example.com" },
    { id: 90, user_id: null, name: "Guest Chart", email: null, phone: "788100200" },
  ],
  reviews: [
    { id: 1, patient_id: 55, user_id: null, doctor_id: 31, comment: "my-review", rating: 5 },
    { id: 2, patient_id: 77, user_id: null, doctor_id: 31, comment: "foreign-review", rating: 1 },
    { id: 3, patient_id: 56, user_id: null, doctor_id: 32, comment: "other-doctor-review", rating: 4 },
  ],
  serviceBookings: [
    { id: 1, patient_id: 77, user_id: null, hospital_id: 4, status: "pending" },
    { id: 2, patient_id: 55, user_id: null, hospital_id: 9, status: "pending" },
  ],
  pharmacyOrders: [
    { id: 1, patient_id: 55, user_id: null, status: "confirmed" },
    { id: 2, patient_id: 77, user_id: null, status: "confirmed" },
  ],
  referrals: [
    { id: 1, patient_id: 55, user_id: null, doctor_id: 31, reason: "my-referral" },
    { id: 2, patient_id: 77, user_id: null, doctor_id: 31, reason: "foreign-referral" },
  ],
  certificates: [
    { id: 1, patient_id: 55, user_id: null, status: "issued" },
    { id: 2, patient_id: 77, user_id: null, status: "issued" },
  ],
  refunds: [
    { id: 1, patient_id: 55, user_id: null, amount: "10", reason: "my-refund" },
    { id: 2, patient_id: 77, user_id: null, amount: "secret-refund", reason: "not-mine" },
  ],
  payments: [
    { id: 1, patient_id: 55, user_id: null, amount: "own-fee", status: "pending" },
    { id: 2, patient_id: 77, user_id: null, amount: 999, status: "paid" },
    { id: 3, patient_id: 55, user_id: null, amount: 15, status: "paid" },
  ],
  legal: [{ id: 1, title: "Terms of care", body: "Public terms" }],
  specializations: [{ id: 1, name: "Cardiology" }],
  fees: [{ id: 1, name: "General", online_fee: 10 }],
  helpLinks: [{ id: 1, title: "How to book" }],
  questions: [{ id: 1, question: "Do you smoke?" }],
  insurers: [
    { id: 1, name: "RSSB", hospital_id: 4, patient_id: null, policy_number: null },
    { id: 2, name: "Hidden policy", hospital_id: 9, patient_id: 55, policy_number: "secret-policy" },
  ],
  leaflets: [{ id: 1, title: "private-leaflet" }],
  accounts: [
    { id: 77, name: "Amina Account", email: "amina-account@example.com" },
    { id: 90, name: "Unrelated Account", email: "stranger@example.com" },
  ],
  medical: [
    { id: 1, patient_id: 55, known_allergies: "pollen" },
    { id: 2, patient_id: 77, known_allergies: "secret-foreign" },
  ],
  prescriptions: [
    { id: 5, doctor_id: 31, prescriber_id: 31, patient_id: 55, notes: "" },
    { id: 11, doctor_id: 31, prescriber_id: 31, patient_id: 77, notes: "" },
  ],
  appointments: [
    { id: 5, doctor_id: 31, patient_id: 77, user_id: null, status: "confirmed", notes: "own-appointment" },
    { id: 8, doctor_id: 31, patient_id: 55, user_id: null, status: "confirmed", notes: "profile-only-appointment" },
    { id: 9, doctor_id: 31, patient_id: 77, user_id: 8, status: "confirmed", notes: "contradictory-appointment" },
  ],
  instants: [
    { id: 9, doctor_id: 31, patient_id: 55, user_id: null, status: "accepted", daily_guest_token: "own-instant-token" },
    { id: 10, doctor_id: 31, patient_id: 77, user_id: null, status: "accepted", daily_guest_token: "foreign-instant-token" },
    { id: 12, doctor_id: 31, patient_id: 55, user_id: 8, status: "accepted", daily_guest_token: "contradictory-instant-token" },
  ],
};

function sqliteRows(sql, params) {
  const text = String(sql).replace(/`/g, "\"");
  if (/\bWHERE\s+0\b/i.test(text)) return [];
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE patients (id INTEGER, user_id INTEGER, name TEXT, email TEXT, phone TEXT);
    CREATE TABLE reviews (id INTEGER, patient_id INTEGER, user_id INTEGER, doctor_id INTEGER, comment TEXT, rating INTEGER);
    CREATE TABLE service_bookings (id INTEGER, patient_id INTEGER, user_id INTEGER, hospital_id INTEGER, status TEXT);
    CREATE TABLE pharmacy_orders (id INTEGER, patient_id INTEGER, user_id INTEGER, status TEXT);
    CREATE TABLE referrals (id INTEGER, patient_id INTEGER, user_id INTEGER, doctor_id INTEGER, reason TEXT);
    CREATE TABLE refunds (id INTEGER, patient_id INTEGER, user_id INTEGER, amount TEXT, reason TEXT);
    CREATE TABLE payments (id INTEGER, patient_id INTEGER, user_id INTEGER, amount TEXT, status TEXT);
    CREATE TABLE legal_documents (id INTEGER, title TEXT, body TEXT);
    CREATE TABLE insurances (id INTEGER, name TEXT, hospital_id INTEGER, patient_id INTEGER, policy_number TEXT);
    CREATE TABLE specializations (id INTEGER, name TEXT);
    CREATE TABLE specialization_fees (id INTEGER, name TEXT, online_fee INTEGER);
    CREATE TABLE help_center_links (id INTEGER, title TEXT);
    CREATE TABLE fitness_checklist_questions (id INTEGER, question TEXT);
    CREATE TABLE appointments (
      id INTEGER, doctor_id INTEGER, patient_id INTEGER, user_id INTEGER,
      pharmacy_id INTEGER, hospital_id INTEGER,
      status TEXT, notes TEXT, daily_guest_token TEXT,
      appointment_date TEXT, appointment_time TEXT, consultation_fee INTEGER
    );
    CREATE TABLE fitness_certificates (id INTEGER, patient_id INTEGER, user_id INTEGER, status TEXT);
    CREATE TABLE instant_consultation_requests (
      id INTEGER, doctor_id INTEGER, patient_id INTEGER, user_id INTEGER,
      pharmacy_id INTEGER, hospital_id INTEGER,
      status TEXT, notes TEXT, daily_guest_token TEXT
    );
    CREATE TABLE prescriptions (
      id INTEGER, doctor_id INTEGER, prescriber_id INTEGER, patient_id INTEGER,
      user_id INTEGER, notes TEXT
    );
    CREATE TABLE prescription_requests (
      id INTEGER, doctor_id INTEGER, prescriber_id INTEGER, patient_id INTEGER,
      user_id INTEGER, notes TEXT
    );
    CREATE TABLE patient_medical_infos (id INTEGER, patient_id INTEGER, known_allergies TEXT);
  `);
  const insert = database.prepare.bind(database);
  for (const row of db.patients) {
    insert("INSERT INTO patients (id, user_id, name, email, phone) VALUES (?, ?, ?, ?, ?)").run(row.id, row.user_id, row.name, row.email, row.phone ?? null);
  }
  for (const row of db.appointments) {
    insert("INSERT INTO appointments (id, doctor_id, patient_id, user_id, pharmacy_id, hospital_id, status, notes, daily_guest_token, consultation_fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      row.id, row.doctor_id, row.patient_id, row.user_id, row.pharmacy_id ?? null, row.hospital_id ?? null, row.status, row.notes || null, row.daily_guest_token || null, row.consultation_fee ?? null,
    );
  }
  for (const row of db.instants) {
    insert("INSERT INTO instant_consultation_requests (id, doctor_id, patient_id, user_id, pharmacy_id, hospital_id, status, notes, daily_guest_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      row.id, row.doctor_id, row.patient_id, row.user_id, row.pharmacy_id ?? null, row.hospital_id ?? null, row.status, row.notes || null, row.daily_guest_token || null,
    );
  }
  for (const row of db.prescriptions) {
    insert("INSERT INTO prescriptions (id, doctor_id, prescriber_id, patient_id, user_id, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
      row.id, row.doctor_id, row.prescriber_id, row.patient_id, row.user_id ?? null, row.notes,
    );
    insert("INSERT INTO prescription_requests (id, doctor_id, prescriber_id, patient_id, user_id, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
      row.id, row.doctor_id, row.prescriber_id, row.patient_id, row.user_id ?? null, row.notes,
    );
  }
  for (const row of db.medical) {
    insert("INSERT INTO patient_medical_infos (id, patient_id, known_allergies) VALUES (?, ?, ?)").run(row.id, row.patient_id, row.known_allergies);
  }
  for (const row of db.reviews) {
    insert("INSERT INTO reviews (id, patient_id, user_id, doctor_id, comment, rating) VALUES (?, ?, ?, ?, ?, ?)").run(row.id, row.patient_id, row.user_id, row.doctor_id, row.comment, row.rating ?? null);
  }
  for (const row of db.refunds) {
    insert("INSERT INTO refunds (id, patient_id, user_id, amount, reason) VALUES (?, ?, ?, ?, ?)").run(row.id, row.patient_id, row.user_id, row.amount, row.reason);
  }
  for (const row of db.payments) {
    insert("INSERT INTO payments (id, patient_id, user_id, amount, status) VALUES (?, ?, ?, ?, ?)").run(row.id, row.patient_id, row.user_id, row.amount, row.status ?? null);
  }
  for (const row of db.legal) {
    insert("INSERT INTO legal_documents (id, title, body) VALUES (?, ?, ?)").run(row.id, row.title, row.body);
  }
  for (const row of db.insurers) {
    insert("INSERT INTO insurances (id, name, hospital_id, patient_id, policy_number) VALUES (?, ?, ?, ?, ?)").run(
      row.id, row.name, row.hospital_id, row.patient_id, row.policy_number,
    );
  }
  for (const row of db.specializations) insert("INSERT INTO specializations (id, name) VALUES (?, ?)").run(row.id, row.name);
  for (const row of db.fees) insert("INSERT INTO specialization_fees (id, name, online_fee) VALUES (?, ?, ?)").run(row.id, row.name, row.online_fee);
  for (const row of db.helpLinks) insert("INSERT INTO help_center_links (id, title) VALUES (?, ?)").run(row.id, row.title);
  for (const row of db.questions) insert("INSERT INTO fitness_checklist_questions (id, question) VALUES (?, ?)").run(row.id, row.question);
  for (const row of db.serviceBookings || []) {
    insert("INSERT INTO service_bookings (id, patient_id, user_id, hospital_id, status) VALUES (?, ?, ?, ?, ?)").run(row.id, row.patient_id, row.user_id, row.hospital_id, row.status);
  }
  for (const row of db.pharmacyOrders || []) {
    insert("INSERT INTO pharmacy_orders (id, patient_id, user_id, status) VALUES (?, ?, ?, ?)").run(row.id, row.patient_id, row.user_id, row.status);
  }
  for (const row of db.referrals || []) {
    insert("INSERT INTO referrals (id, patient_id, user_id, doctor_id, reason) VALUES (?, ?, ?, ?, ?)").run(row.id, row.patient_id, row.user_id, row.doctor_id, row.reason);
  }
  for (const row of db.certificates || []) {
    insert("INSERT INTO fitness_certificates (id, patient_id, user_id, status) VALUES (?, ?, ?, ?)").run(row.id, row.patient_id, row.user_id, row.status);
  }
  return database.prepare(text).all(...params);
}

vi.mock("./public.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createIremboInvoice: async () => {
      db.invoiceCalls += 1;
      return { invoiceNumber: "INV-FIXTURE", publicKey: "pk_fixture" };
    },
  };
});

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => [
      "appointments", "prescriptions", "prescription_requests", "patients", "doctors", "pharmacies",
      "patient_medical_infos", "team_members", "instant_consultation_requests",
      "pharmacy_orders", "service_bookings", "hospitals", "users", "leaflets", "chart_notes",
      "reviews", "refunds", "payments", "legal_documents", "insurances",
      "specializations", "specialization_fees", "help_center_links", "fitness_checklist_questions",
      "service_bookings", "pharmacy_orders", "referrals", "fitness_certificates",
    ].includes(name),
    hasColumn: async (table, column) => {
      if (db.columnThrows) throw new Error("columns unreadable");
      if (db.hideUserId && column === "user_id" && (table === "appointments" || table === "instant_consultation_requests")) {
        return false;
      }
      if (table === "leaflets") return false;
      if (table === "chart_notes") return column === "patient_id";
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
      if (db.patientThrows && text.includes("FROM patients")) throw new Error("patients unreadable");
      if (/FROM\s+"?(patients|appointments|instant_consultation_requests|prescriptions|prescription_requests|patient_medical_infos|reviews|refunds|payments|legal_documents|insurances|specializations|specialization_fees|help_center_links|fitness_checklist_questions|service_bookings|pharmacy_orders|referrals|fitness_certificates)"?/i.test(text)) {
        return sqliteRows(sql, params);
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
      if (text.includes("FROM users") && text.includes("WHERE id")) {
        return db.accounts.find((row) => row.id === Number(params[0])) || null;
      }
      if (/FROM\s+"?(patients|appointments|instant_consultation_requests|prescriptions|prescription_requests|patient_medical_infos|reviews|refunds|payments|legal_documents|insurances|specializations|specialization_fees|help_center_links|fitness_checklist_questions|service_bookings|pharmacy_orders|referrals|fitness_certificates)"?/i.test(text)) {
        return sqliteRows(sql, params)[0] ?? null;
      }
      if (text.includes("FROM leaflets")) {
        return db.leaflets.find((row) => row.id === Number(params[0])) || null;
      }
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
    countWhere: async (table, where = "", params = []) => {
      try {
        return sqliteRows(`SELECT id FROM "${String(table).replace(/"/g, "")}" ${where}`, params).length;
      } catch {
        return 0;
      }
    },
  };
});

const { appRoutes } = await import("./app.js");
const { publicRoutes } = await import("./public.js");

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
  publicRoutes(router);
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
    db.invoiceCalls = 0;
    db.appointments = [
      { id: 5, doctor_id: 31, patient_id: 77, user_id: null, status: "confirmed", notes: "own-appointment" },
      { id: 8, doctor_id: 31, patient_id: 55, user_id: null, status: "confirmed", notes: "profile-only-appointment" },
      { id: 9, doctor_id: 31, patient_id: 77, user_id: 8, status: "confirmed", notes: "contradictory-appointment" },
    ];
    db.instants = [
      { id: 9, doctor_id: 31, patient_id: 55, user_id: null, status: "accepted", daily_guest_token: "own-instant-token" },
      { id: 10, doctor_id: 31, patient_id: 77, user_id: null, status: "accepted", daily_guest_token: "foreign-instant-token" },
      { id: 12, doctor_id: 31, patient_id: 55, user_id: 8, status: "accepted", daily_guest_token: "contradictory-instant-token" },
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

  it("uses the typed id on dedicated patient updates and does not return the other row", async () => {
    const ownAppointment = await request(users.patient, "PATCH", "/patient/appointments/5", { notes: "kept" });
    const profileAppointment = await request(users.patient, "PATCH", "/patient/appointments/8", { notes: "no" });
    const contradictoryAppointment = await request(users.patient, "PATCH", "/patient/appointments/9", { notes: "no" });
    expect(ownAppointment.status).toBe(200);
    expect(profileAppointment.status).toBe(404);
    expect(contradictoryAppointment.status).toBe(404);
    expect(writes.filter((write) => write.op === "update").map((write) => write.id)).toEqual([5]);
    writes.length = 0;
    const ownInstant = await request(users.patient, "PATCH", "/patient/instant-consultations/9", { notes: "kept" });
    const foreignInstant = await request(users.patient, "PATCH", "/patient/instant-consultations/10", { notes: "no" });
    const contradictoryInstant = await request(users.patient, "PATCH", "/patient/instant-consultations/12", { notes: "no" });
    expect(ownInstant.status).toBe(200);
    expect(foreignInstant.status).toBe(404);
    expect(contradictoryInstant.status).toBe(404);
    expect(JSON.stringify(foreignInstant.body)).not.toContain("foreign-instant-token");
    expect(writes.filter((write) => write.op === "update").map((write) => Number(write.id))).toEqual([9]);
    writes.length = 0;
    const ownPrescription = await request(users.patient, "PATCH", "/patient/prescriptions/5", { notes: "kept" });
    const foreignPrescription = await request(users.patient, "PATCH", "/patient/prescriptions/11", { notes: "no" });
    expect(ownPrescription.status).toBe(200);
    expect(foreignPrescription.status).toBe(404);
    expect(writes.filter((write) => write.op === "update").map((write) => Number(write.id))).toEqual([5]);
    const hidden = await request(users.patient, "GET", "/patient/appointments/8");
    const shown = await request(users.patient, "GET", "/patient/appointments/5");
    expect(hidden.status).toBe(404);
    expect(JSON.stringify(hidden.body)).not.toContain("profile-only-appointment");
    expect(shown.status).toBe(200);
    expect(JSON.stringify(shown.body)).toContain("own-appointment");
  });

  it("does not return another role's visit or a contradictory instant", async () => {
    const pharmacy = await request(users.pharmacy, "GET", "/pharmacy/instant_consultation_requests/10");
    expect(pharmacy.status).toBe(403);
    expect(JSON.stringify(pharmacy.body)).not.toContain("foreign-instant-token");
    const listed = await request(users.pharmacy, "GET", "/pharmacy/instant_consultation_requests");
    expect(JSON.stringify(listed.body)).not.toContain("foreign-instant-token");
    expect(JSON.stringify(listed.body)).not.toContain("own-instant-token");
    const contradicted = await request(users.patient, "GET", "/patient/instant_consultation_requests/12");
    const foreign = await request(users.patient, "GET", "/patient/instant_consultation_requests/10");
    const own = await request(users.patient, "GET", "/patient/instant_consultation_requests/9");
    expect(contradicted.status).toBe(403);
    expect(foreign.status).toBe(403);
    expect(JSON.stringify(contradicted.body)).not.toContain("contradictory-instant-token");
    expect(JSON.stringify(foreign.body)).not.toContain("foreign-instant-token");
    expect(own.status).toBe(200);
    expect(JSON.stringify(own.body)).toContain("own-instant-token");
    const patientList = await request(users.patient, "GET", "/patient/instant_consultation_requests");
    const packed = JSON.stringify(patientList.body);
    expect(packed).toContain("own-instant-token");
    expect(packed).not.toContain("foreign-instant-token");
    expect(packed).not.toContain("contradictory-instant-token");
  });

  it("reads a chart only for an unambiguous patient the doctor treats", async () => {
    const record = await request(users.doctor, "GET", "/doctor/patients/55/record");
    expect(record.status).toBe(200);
    expect(JSON.stringify(record.body)).toContain("pollen");
    expect(JSON.stringify(record.body)).not.toContain("secret-foreign");
    const collided = await request(users.doctor, "GET", "/doctor/patients/77/record");
    expect(collided.status).toBe(403);
    expect(JSON.stringify(collided.body)).not.toContain("secret-foreign");
    expect(JSON.stringify(collided.body)).not.toContain("foreign@example.com");
    expect(JSON.stringify(collided.body)).not.toContain("pollen");
    const stranger = await request(users.otherDoctor, "GET", "/doctor/patients/55/profile");
    expect(stranger.status).toBe(403);
    expect(JSON.stringify(stranger.body)).not.toContain("amina@example.com");
    const profile = await request(users.doctor, "GET", "/doctor/patients/55/profile");
    expect(profile.status).toBe(200);
    expect(JSON.stringify(profile.body)).toContain("amina@example.com");
    const visits = await request(users.doctor, "GET", "/doctor/patients/55/visits");
    expect(visits.status).toBe(200);
    const keys = (visits.body.data || []).map((row) => `${row.visit_type}:${row.id}`);
    expect(keys).toContain("appointment:5");
    expect(keys).toContain("instant_consultation:9");
    expect(keys).not.toContain("appointment:8");
    expect(keys).not.toContain("appointment:9");
    expect(keys).not.toContain("instant_consultation:10");
    expect(keys).not.toContain("instant_consultation:12");
  });

  it("refuses an ambiguous target and a create with no caller ownership column", async () => {
    const ambiguous = await request(users.doctor, "POST", "/doctor/service-bookings", {
      patient_id: 77,
      hospital_id: 4,
      hospital_service_id: 3,
      preferred_date: "2026-12-02",
      preferred_time: "10:00",
    });
    expect(ambiguous.status).toBe(422);
    expect(writes).toEqual([]);
    const crossed = await request(users.doctor, "POST", "/doctor/prescriptions", {
      appointment_id: 5,
      instant_consultation_id: 10,
      patient_id: 55,
      diagnosis: "no",
      items: [],
    });
    expect(crossed.status).toBe(403);
    const mismatched = await request(users.doctor, "POST", "/doctor/prescriptions", {
      appointment_id: 5,
      patient_id: 56,
      diagnosis: "no",
      items: [],
    });
    expect(mismatched.status).toBe(403);
    expect(writes).toEqual([]);
    const agreed = await request(users.doctor, "POST", "/doctor/prescriptions", {
      appointment_id: 5,
      patient_id: 55,
      diagnosis: "malaria",
      items: [],
    });
    expect(agreed.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({ patient_id: 55, doctor_id: 31, appointment_id: 5 });
    writes.length = 0;
    const hospital = await request(users.hospital, "POST", "/hospital/chart-notes", { patient_id: 55, hospital_id: 4 });
    const doctor = await request(users.doctor, "POST", "/doctor/chart-notes", { patient_id: 55 });
    expect(hospital.status).toBe(403);
    expect(doctor.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("does not borrow an account from a guest profile id and requires an instant profile", async () => {
    db.instants.push({ id: 20, doctor_id: 31, patient_id: 90, user_id: null, status: "accepted" });
    const guest = await request(users.doctor, "GET", "/doctor/patients/90/record");
    const guestProfile = await request(users.doctor, "GET", "/doctor/patients/90/profile");
    expect(guest.status).toBe(200);
    expect(guestProfile.status).toBe(200);
    expect(JSON.stringify(guest.body)).not.toContain("stranger@example.com");
    expect(JSON.stringify(guestProfile.body)).not.toContain("stranger@example.com");
    expect(JSON.stringify(guestProfile.body)).toContain("Guest Chart");
    const linked = await request(users.doctor, "GET", "/doctor/patients/55/record");
    expect(linked.status).toBe(200);
    expect(JSON.stringify(linked.body)).toContain("amina-account@example.com");
    writes.length = 0;
    db.instants.push(
      { id: 21, doctor_id: 31, patient_id: 404, user_id: null, status: "accepted" },
      { id: 22, doctor_id: 31, patient_id: null, user_id: null, status: "accepted" },
    );
    const missingProfile = await request(users.doctor, "POST", "/doctor/prescriptions", {
      instant_consultation_id: 21,
      diagnosis: "no",
      items: [],
    });
    const missingWithPatient = await request(users.doctor, "POST", "/doctor/prescriptions", {
      instant_consultation_id: 21,
      patient_id: 55,
      diagnosis: "no",
      items: [],
    });
    const nameless = await request(users.doctor, "POST", "/doctor/prescriptions", {
      instant_consultation_id: 22,
      patient_id: 55,
      diagnosis: "no",
      items: [],
    });
    expect(missingProfile.status).toBe(403);
    expect(missingWithPatient.status).toBe(403);
    expect(nameless.status).toBe(403);
    expect(writes).toEqual([]);
    db.instants.push({ id: 23, doctor_id: 31, patient_id: null, user_id: 77, status: "accepted" });
    const byAccount = await request(users.doctor, "POST", "/doctor/prescriptions", {
      instant_consultation_id: 23,
      diagnosis: "follow-up",
      items: [],
    });
    expect(byAccount.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({ patient_id: 55, doctor_id: 31, instant_consultation_id: 23 });
    writes.length = 0;
    db.hideUserId = true;
    const stillLinked = await request(users.doctor, "POST", "/doctor/prescriptions", {
      instant_consultation_id: 9,
      diagnosis: "course",
      items: [],
    });
    expect(stillLinked.status).toBe(201);
    expect(writes.at(-1).data).toMatchObject({ patient_id: 55, doctor_id: 31, instant_consultation_id: 9 });
  });

  it("keeps reviews, refunds, catalogs, and intake on the owning person", async () => {
    const ownReview = await request(users.patient, "GET", "/patient/reviews/1");
    const foreignReview = await request(users.patient, "GET", "/patient/reviews/2");
    const doctorReview = await request(users.doctor, "GET", "/doctor/reviews/1");
    const otherDoctorReview = await request(users.doctor, "GET", "/doctor/reviews/3");
    expect(ownReview.status).toBe(200);
    expect(JSON.stringify(ownReview.body)).toContain("my-review");
    expect(foreignReview.status).toBe(404);
    expect(JSON.stringify(foreignReview.body)).not.toContain("foreign-review");
    expect(doctorReview.status).toBe(200);
    expect(otherDoctorReview.status).toBe(404);
    const ownRefund = await request(users.patient, "GET", "/patient/refunds/1");
    const foreignRefund = await request(users.patient, "GET", "/patient/refunds/2");
    expect(ownRefund.status).toBe(200);
    expect(JSON.stringify(ownRefund.body)).toContain("my-refund");
    expect(foreignRefund.status).toBe(404);
    expect(JSON.stringify(foreignRefund.body)).not.toContain("secret-refund");
    const ownFee = await request(users.patient, "GET", "/patient/payments/1");
    const foreignFee = await request(users.patient, "GET", "/patient/payments/2");
    const feeList = await request(users.patient, "GET", "/patient/payments");
    expect(ownFee.status).toBe(200);
    expect(JSON.stringify(ownFee.body)).toContain("own-fee");
    expect(foreignFee.status).toBe(403);
    expect(JSON.stringify(foreignFee.body)).not.toContain("999");
    expect(JSON.stringify(feeList.body)).toContain("own-fee");
    expect(JSON.stringify(feeList.body)).not.toContain("999");
    const leaflet = await request(users.doctor, "GET", "/doctor/leaflets/1");
    expect(leaflet.status).toBe(403);
    expect(JSON.stringify(leaflet.body)).not.toContain("private-leaflet");
    const terms = await request(users.patient, "GET", "/patient/legal_documents/1");
    const termsList = await request(users.patient, "GET", "/patient/legal_documents");
    expect(terms.status).toBe(200);
    expect(JSON.stringify(terms.body)).toContain("Terms of care");
    expect(JSON.stringify(termsList.body)).toContain("Terms of care");
    const patientInsurers = await request(users.patient, "GET", "/patient/insurances");
    const hospitalInsurers = await request(users.hospital, "GET", "/hospital/insurances");
    const doctorPolicy = await request(users.doctor, "GET", "/doctor/insurances/2");
    const patientPolicy = await request(users.patient, "GET", "/patient/insurances/2");
    const doctorCatalog = await request(users.doctor, "GET", "/doctor/insurances");
    const publicCatalog = await request(users.patient, "GET", "/public/insurances");
    const catalogRecord = await request(users.doctor, "GET", "/doctor/insurances/1");
    expect(JSON.stringify(patientInsurers.body)).toContain("RSSB");
    expect(JSON.stringify(patientInsurers.body)).not.toContain("secret-policy");
    expect(JSON.stringify(hospitalInsurers.body)).toContain("RSSB");
    expect(JSON.stringify(hospitalInsurers.body)).not.toContain("secret-policy");
    expect(doctorPolicy.status).toBe(403);
    expect(JSON.stringify(doctorPolicy.body)).not.toContain("secret-policy");
    expect(patientPolicy.status).toBe(404);
    expect(JSON.stringify(patientPolicy.body)).not.toContain("secret-policy");
    expect(JSON.stringify(doctorCatalog.body)).toContain("RSSB");
    expect(JSON.stringify(doctorCatalog.body)).not.toContain("secret-policy");
    expect(JSON.stringify(publicCatalog.body)).toContain("RSSB");
    expect(JSON.stringify(publicCatalog.body)).not.toContain("secret-policy");
    expect(catalogRecord.status).toBe(200);
    expect(JSON.stringify(catalogRecord.body)).toContain("RSSB");
    const catalogs = [
      ["/patient/specializations", "/patient/specializations/1", "Cardiology"],
      ["/patient/specialization-fees", "/patient/specialization-fees/1", "General"],
      ["/patient/help-center-links", "/patient/help-center-links/1", "How to book"],
      ["/patient/fitness_checklist_questions", "/patient/fitness_checklist_questions/1", "Do you smoke?"],
    ];
    for (const [listPath, recordPath, label] of catalogs) {
      const list = await request(users.patient, "GET", listPath);
      const record = await request(users.patient, "GET", recordPath);
      expect(JSON.stringify(list.body), listPath).toContain(label);
      expect(record.status, recordPath).toBe(200);
      expect(JSON.stringify(record.body), recordPath).toContain(label);
    }
    db.columnThrows = true;
    const unreadable = await request(users.patient, "GET", "/patient/reviews/1");
    expect(unreadable.status).toBe(404);
    expect(JSON.stringify(unreadable.body)).not.toContain("my-review");
    db.columnThrows = false;
    writes.length = 0;
    db.instants.push({ id: 30, doctor_id: 31, patient_id: null, user_id: null, status: "accepted" });
    const saved = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest New",
      phone: "781234567",
      instant_consultation_id: 30,
      appointment_id: 5,
    });
    expect(saved.status).toBe(201);
    const appointmentWrites = writes.filter((write) => write.op === "update" && write.table === "appointments");
    const instantWrites = writes.filter((write) => write.op === "update" && write.table === "instant_consultation_requests");
    expect(appointmentWrites).toEqual([]);
    expect(instantWrites).toHaveLength(1);
    expect(instantWrites[0].data.patient_id).toBe(50);
    writes.length = 0;
    const stolen = await request(users.otherDoctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest New",
      phone: "781234568",
      appointment_id: 5,
    });
    const contradicted = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest New",
      phone: "781234569",
      appointment_id: 9,
    });
    const occupied = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest New",
      phone: "781234560",
      instant_consultation_id: 9,
    });
    expect(stolen.status).toBe(403);
    expect(contradicted.status).toBe(403);
    expect(occupied.status).toBe(403);
    expect(writes).toEqual([]);
    db.patientThrows = true;
    const unreadPhone = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest New",
      phone: "781234561",
      instant_consultation_id: 30,
    });
    expect(unreadPhone.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("refuses intake from a patient, another doctor, and another patient's phone", async () => {
    const asPatient = await request(users.patient, "POST", "/doctor/patients/intake", {
      full_name: "Amina",
      phone: "788100100",
      appointment_id: 8,
    });
    const otherDoctor = await request(users.otherDoctor, "POST", "/doctor/patients/intake", {
      full_name: "Amina",
      phone: "788100100",
      appointment_id: 8,
    });
    const otherPhone = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Other",
      phone: "788200200",
      appointment_id: 8,
    });
    expect(asPatient.status).toBe(403);
    expect(otherDoctor.status).toBe(403);
    expect(otherPhone.status).toBe(403);
    expect(writes).toEqual([]);
  });

  it("marks the temporary password used when a patient receives an instant token", async () => {
    const account = db.accounts.find((row) => row.id === 77);
    account.password_must_change = 1;
    account.temp_password_expires_at = new Date(Date.now() + 86_400_000);
    account.temp_password_used_at = null;
    const ready = await request(users.patient, "GET", "/patient/instant-consultations/ready");
    const quick = await request(users.patient, "GET", "/patient/quick/9");
    expect(ready.status).toBe(200);
    expect(ready.body.data?.daily_guest_token).toBeTruthy();
    expect(quick.status).toBe(200);
    expect(quick.body.daily_guest_token).toBeTruthy();
    const marks = writes.filter((write) => write.op === "update" && write.table === "users" && write.data.temp_password_used_at);
    expect(marks).toHaveLength(2);
    expect(marks.every((write) => write.id === 77)).toBe(true);
    delete account.password_must_change;
    delete account.temp_password_expires_at;
    delete account.temp_password_used_at;
  });

  it("refuses an intake that would change a profile before the appointment check fails", async () => {
    db.appointments.push({ id: 7, doctor_id: 31, patient_id: 80, user_id: null, status: "confirmed" });
    const mismatched = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Renamed Amina",
      phone: "788100100",
      appointment_id: 7,
    });
    expect(mismatched.status).toBe(403);
    expect(writes).toEqual([]);
    const stranger = await request(users.otherDoctor, "POST", "/doctor/patients/intake", {
      full_name: "Renamed Amina",
      phone: "788100100",
    });
    const noCare = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Renamed Guest",
      phone: "788100200",
    });
    expect(stranger.status).toBe(403);
    expect(noCare.status).toBe(403);
    expect(writes).toEqual([]);
    const cared = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Amina Updated",
      phone: "788100100",
    });
    expect(cared.status).toBe(201);
    expect(writes).toEqual([expect.objectContaining({ op: "update", table: "patients", id: 55 })]);
    expect(writes[0].data.status).toBeUndefined();
  });

  it("counts and lists only the id each table stores", async () => {
    const dashboard = await request(users.patient, "GET", "/patient/dashboard");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.period_stats.total_appointments).toBe(1);
    expect(dashboard.body.period_stats.instant_total).toBe(1);
    expect(dashboard.body.service_bookings.total).toBe(1);
    expect(dashboard.body.reviews.total).toBe(1);
    expect(dashboard.body.period_stats.pharmacy_orders_total).toBe(1);
    expect(dashboard.body.spending.total).toBe(15);
    expect(dashboard.body.spending.total).not.toBe(15 + 999);
    const bills = await request(users.patient, "GET", "/patient/bills");
    const billText = JSON.stringify(bills.body);
    expect(bills.status).toBe(200);
    expect(billText).toContain("own-fee");
    expect(billText).toContain("15");
    expect(billText).not.toContain("999");
    const referrals = await request(users.patient, "GET", "/patient/referrals");
    const packed = JSON.stringify(referrals.body);
    expect(referrals.status).toBe(200);
    expect(packed).toContain("my-referral");
    expect(packed).not.toContain("foreign-referral");
  });

  it("does not update a guest who has a care link when the appointment is another account", async () => {
    db.instants.push({ id: 40, doctor_id: 31, patient_id: 90, user_id: null, status: "accepted" });
    db.appointments.push({ id: 11, doctor_id: 31, patient_id: 80, user_id: null, status: "confirmed" });
    const refused = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Renamed Guest",
      phone: "788100200",
      appointment_id: 11,
    });
    expect(refused.status).toBe(403);
    expect(writes).toEqual([]);
    const allowed = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest Kept",
      phone: "788100200",
    });
    expect(allowed.status).toBe(201);
    expect(writes).toEqual([expect.objectContaining({ op: "update", table: "patients", id: 90 })]);
    writes.length = 0;
    db.instants = db.instants.filter((row) => row.id !== 40);
    db.appointments.push({ id: 12, doctor_id: 31, patient_id: 90, user_id: null, status: "confirmed" });
    const profileAppointment = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest From Appointment Id",
      phone: "788100200",
    });
    expect(profileAppointment.status).toBe(403);
    expect(writes).toEqual([]);
    db.instants.push(
      { id: 40, doctor_id: 31, patient_id: 90, user_id: null, status: "accepted" },
      { id: 41, doctor_id: 31, patient_id: null, user_id: null, status: "accepted" },
    );
    const relink = await request(users.doctor, "POST", "/doctor/patients/intake", {
      full_name: "Guest Kept",
      phone: "788100200",
      instant_consultation_id: 41,
    });
    expect(relink.status).toBe(201);
    expect(writes.some((write) => write.op === "update" && write.table === "patients" && write.id === 90)).toBe(true);
    expect(writes.some((write) => write.op === "update" && write.table === "instant_consultation_requests" && write.id === 41 && write.data.patient_id === 90)).toBe(true);
  });

  it("refuses an ambiguous referral target and keeps a cared-for profile", async () => {
    const ambiguous = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 77,
      hospital_id: 4,
      reason: "needs a ward",
    });
    expect(ambiguous.status).toBe(422);
    expect(writes.some((write) => write.table === "referrals")).toBe(false);
    const contradicted = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 55,
      hospital_id: 4,
      instant_consultation_id: 12,
      reason: "needs a ward",
    });
    expect(contradicted.status).toBe(403);
    expect(writes.some((write) => write.table === "referrals")).toBe(false);
    const otherDoctor = await request(users.otherDoctor, "POST", "/doctor/referrals", {
      patient_id: 55,
      hospital_id: 4,
      reason: "needs a ward",
    });
    expect(otherDoctor.status).toBe(403);
    expect(writes.some((write) => write.table === "referrals")).toBe(false);
    const sent = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 55,
      hospital_id: 4,
      instant_consultation_id: 9,
      reason: "needs a ward",
    });
    expect(sent.status).toBe(201);
    expect(writes.some((write) => write.op === "insert" && write.table === "referrals" && write.data.patient_id === 55)).toBe(true);
    writes.length = 0;
    const unrelated = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 56,
      hospital_id: 4,
      reason: "not my patient",
    });
    expect(unrelated.status).toBe(403);
    expect(writes.some((write) => write.table === "referrals")).toBe(false);
    db.appointments.push({ id: 13, doctor_id: 31, patient_id: 80, user_id: null, status: "confirmed" });
    const byAccount = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 80,
      hospital_id: 4,
      appointment_id: 13,
      reason: "needs a ward",
    });
    expect(byAccount.status).toBe(201);
    expect(writes.some((write) => write.op === "insert" && write.table === "referrals" && write.data.patient_id === 56)).toBe(true);
    writes.length = 0;
    db.instants.push({ id: 40, doctor_id: 31, patient_id: 90, user_id: null, status: "accepted" });
    const guest = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 90,
      hospital_id: 4,
      instant_consultation_id: 40,
      reason: "guest follow-up",
    });
    expect(guest.status).toBe(201);
    expect(writes.some((write) => write.op === "insert" && write.table === "referrals" && write.data.patient_id === 90)).toBe(true);
    writes.length = 0;
    const noVisit = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 55,
      hospital_id: 4,
      reason: "known patient",
    });
    expect(noVisit.status).toBe(201);
    expect(writes.some((write) => write.op === "insert" && write.table === "referrals" && write.data.patient_id === 55 && write.data.reason === "known patient")).toBe(true);
    writes.length = 0;
    db.patientThrows = true;
    const unreadable = await request(users.doctor, "POST", "/doctor/referrals", {
      patient_id: 55,
      hospital_id: 4,
      reason: "cannot read",
    });
    expect(unreadable.status).toBe(403);
    expect(writes.some((write) => write.table === "referrals")).toBe(false);
    db.patientThrows = false;
    db.patients.push(
      { id: 92, user_id: 81, name: "Twin A", email: "twin-a@example.com" },
      { id: 93, user_id: 81, name: "Twin B", email: "twin-b@example.com" },
    );
    try {
      writes.length = 0;
      const twoProfiles = await request(users.doctor, "POST", "/doctor/referrals", {
        patient_id: 81,
        hospital_id: 4,
        reason: "two profiles",
      });
      expect(twoProfiles.status).toBe(422);
      expect(writes.some((write) => write.table === "referrals")).toBe(false);
    } finally {
      db.patients = db.patients.filter((row) => row.id !== 92 && row.id !== 93);
    }
  });

  it("lists, opens, and counts only account appointments and profile certificates", async () => {
    const list = await request(users.patient, "GET", "/patient/appointments");
    const packed = JSON.stringify(list.body);
    expect(list.status).toBe(200);
    expect(packed).toContain("own-appointment");
    expect(packed).not.toContain("profile-only-appointment");
    expect(packed).not.toContain("contradictory-appointment");
    expect(list.body.total).toBe(1);
    expect(list.body.data).toHaveLength(1);
    const own = await request(users.patient, "GET", "/patient/appointments/5");
    const profileOnly = await request(users.patient, "GET", "/patient/appointments/8");
    const contradicted = await request(users.patient, "GET", "/patient/appointments/9");
    expect(own.status).toBe(200);
    expect(JSON.stringify(own.body)).toContain("own-appointment");
    expect(profileOnly.status).toBe(404);
    expect(JSON.stringify(profileOnly.body)).not.toContain("profile-only-appointment");
    expect(contradicted.status).toBe(404);
    expect(JSON.stringify(contradicted.body)).not.toContain("contradictory-appointment");
    const dashboard = await request(users.patient, "GET", "/patient/dashboard");
    expect(dashboard.body.period_stats.total_appointments).toBe(list.body.total);
    expect(dashboard.body.certificates.issued).toBe(1);
    expect(dashboard.body.certificates.total).toBe(1);
  });

  it("joins, pays, cancels, and reschedules only the account appointment", async () => {
    const own = db.appointments.find((row) => row.id === 5);
    own.consultation_fee = 10;
    const refused = async (method, path) => {
      const result = await request(users.patient, method, path, method === "POST" ? { appointment_date: "2026-12-15", appointment_time: "10:00" } : undefined);
      expect(result.status, `${method} ${path}`).toBe(403);
      expect(JSON.stringify(result.body), `${method} ${path}`).not.toMatch(/token|INV-FIXTURE|pk_fixture/);
    };
    await refused("POST", "/patient/appointments/8/join");
    await refused("POST", "/patient/appointments/9/join");
    await refused("POST", "/patient/appointments/8/pay");
    await refused("POST", "/patient/appointments/9/pay");
    await refused("DELETE", "/patient/appointments/8");
    await refused("DELETE", "/patient/appointments/9");
    await refused("POST", "/patient/appointments/8/reschedule");
    await refused("POST", "/patient/appointments/9/reschedule");
    const missing = await request(users.patient, "DELETE", "/patient/appointments/404");
    expect(missing.status).toBe(404);
    expect(writes).toEqual([]);
    expect(db.invoiceCalls).toBe(0);
    const joined = await request(users.patient, "POST", "/patient/appointments/5/join");
    expect(joined.status).toBe(200);
    expect(joined.body.token).toBeTruthy();
    expect(writes.filter((write) => write.table === "appointments" || write.table === "payments")).toEqual([]);
    const paid = await request(users.patient, "POST", "/patient/appointments/5/pay");
    expect(paid.status).toBe(200);
    expect(paid.body.invoice_number).toBe("INV-FIXTURE");
    expect(paid.body.public_key).toBe("pk_fixture");
    expect(db.invoiceCalls).toBe(1);
    expect(writes.some((write) => write.op === "insert" && write.table === "payments" && write.data.appointment_id === 5)).toBe(true);
    writes.length = 0;
    const cancelled = await request(users.patient, "DELETE", "/patient/appointments/5");
    expect(cancelled.status).toBe(200);
    expect(writes.some((write) => write.op === "update" && write.table === "appointments" && write.data.status === "cancelled")).toBe(true);
    writes.length = 0;
    const moved = await request(users.patient, "POST", "/patient/appointments/5/reschedule", {
      appointment_date: "2026-12-15",
      appointment_time: "10:00",
    });
    expect(moved.status).toBe(200);
    expect(writes.some((write) => write.op === "update" && write.table === "appointments" && write.data.appointment_date === "2026-12-15")).toBe(true);
  });
});
