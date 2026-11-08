import { beforeEach, describe, expect, it, vi } from "vitest";

const sent = [];
const notes = [];
const db = {
  doctors: [{ id: 31, user_id: 31, name: "Dr. Jane Doe", email: "doctor@example.com", phone: "788000001" }],
  patients: [{ id: 9, user_id: 77, name: "Amina Uwase", email: "owner@example.com", phone: "788000077" }],
  users: [
    { id: 9, name: "Stranger Account", email: "stranger@example.com", phone: "788000009" },
    { id: 77, name: "Amina Uwase", email: "owner@example.com", phone: "788000077" },
    { id: 31, name: "Dr. Jane Doe", email: "doctor@example.com", phone: "788000001" },
  ],
  appointments: [],
};

vi.mock("./mail.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sendMail: async (message) => {
      sent.push(message);
      return { accepted: true };
    },
  };
});

vi.mock("./realtime.js", () => ({
  broadcast: () => {},
}));

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => ["patients", "users", "doctors", "notifications", "appointments"].includes(name),
    hasColumn: async () => true,
    insert: async (table, fields) => {
      notes.push({ table, fields });
      return notes.length;
    },
    update: async () => 1,
    q: async (sql) => (String(sql).includes("FROM appointments") ? db.appointments : []),
    one: async (sql, params) => {
      const text = String(sql);
      const id = Number(params?.[0]);
      if (text.includes("FROM doctors")) return db.doctors.find((row) => row.id === id) || null;
      if (text.includes("FROM patients")) return db.patients.find((row) => row.id === id) || null;
      if (text.includes("FROM users")) return db.users.find((row) => row.id === id) || null;
      return null;
    },
  };
});

const { notifyBookedVisit, notifyDoctorReady, remindUpcomingVisits } = await import("./visit-notify.js");

function clock(minutesAhead) {
  const start = new Date(Date.now() + minutesAhead * 60000);
  return {
    appointment_date: start.toISOString().slice(0, 10),
    appointment_time: start.toISOString().slice(11, 16),
  };
}

describe("visit notifications", () => {
  beforeEach(() => {
    sent.length = 0;
    notes.length = 0;
    db.appointments = [];
  });

  it("addresses the profile owner and cites the consultation, once", async () => {
    const row = { id: 4, patient_id: 9, doctor_id: 31, status: "accepted" };
    await notifyDoctorReady(row);
    await notifyDoctorReady(row);
    expect(sent.map((message) => message.to)).toEqual(["owner@example.com"]);
    expect(sent[0].subject).toBe("Your doctor is ready for consultation #4");
    expect(sent[0].text).toContain("consultation #4");
    expect(sent[0].html).toContain("Hello, Amina!");
    expect(sent[0].html).not.toContain("Hello, Dr.!");
    expect(JSON.stringify(sent)).not.toContain("stranger@example.com");
    expect(notes.map((note) => note.fields.notifiable_id)).toEqual([77]);
  });

  it("does not send a ready notice for an unpaid request", async () => {
    await notifyDoctorReady({ id: 5, patient_id: 9, doctor_id: 31, status: "pending", amount: 10 });
    expect(sent).toEqual([]);
    expect(notes).toEqual([]);
  });

  it("greets a doctor by name and keeps the appointment id on the payment notice", async () => {
    await notifyBookedVisit({
      id: 12,
      user_id: 77,
      patient_id: 9,
      doctor_id: 31,
      appointment_date: "2026-11-09",
      appointment_time: "09:00",
      patient_pays: 10,
      status: "pending",
    });
    const patientMail = sent.find((message) => message.to === "owner@example.com");
    const doctorMail = sent.find((message) => message.to === "doctor@example.com");
    expect(patientMail.subject).toContain("appointment #12");
    expect(patientMail.text).toContain("Pay");
    expect(doctorMail.html).toContain("Hello, Jane!");
    expect(doctorMail.html).not.toContain("Hello, Dr.!");
    expect(JSON.stringify(sent)).not.toContain("stranger@example.com");
  });

  it("tells an unpaid upcoming appointment to pay instead of join", async () => {
    db.appointments = [
      { id: 80, patient_id: 9, doctor_id: 31, status: "pending", patient_pays: 10, ...clock(60) },
      { id: 81, user_id: 77, doctor_id: 31, status: "confirmed", ...clock(60) },
    ];
    await remindUpcomingVisits();
    const unpaid = sent.find((message) => message.subject.includes("#80"));
    const confirmed = sent.find((message) => message.subject.includes("starts in 1 hour") && message.to === "owner@example.com");
    expect(unpaid.text).toContain("still unpaid");
    expect(unpaid.text).not.toMatch(/join/i);
    expect(unpaid.html).not.toContain("Join");
    expect(confirmed.text).toMatch(/join/i);
  });
});
