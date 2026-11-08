import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const claims = new DatabaseSync(":memory:");
claims.exec(`
  CREATE TABLE ready_mail_claims (
    claim_key TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    last_error TEXT,
    claimed_at TEXT NOT NULL,
    sent_at TEXT
  )
`);

const sent = [];
const notes = [];
const db = {
  doctors: [{ id: 31, user_id: 31, name: "Dr. Jane Doe", email: "doctor@example.com", phone: "788000001" }],
  patients: [{ id: 9, user_id: 77, name: "Amina Uwase", email: "owner@example.com", phone: "788000077" }],
  users: [
    { id: 9, name: "Stranger Account", email: "stranger@example.com", phone: "788000009" },
    { id: 77, name: "Amina Uwase", email: "owner@example.com", phone: "788000077" },
    { id: 31, name: "Dr. Jane Doe", email: "doctor@example.com", phone: "788000001" },
    { id: 8, name: "Other Profile", email: "other-profile@example.com", phone: "788000008" },
  ],
  appointments: [],
  patientsAvailable: true,
  profileThrows: false,
  userThrows: false,
  claimsTable: true,
  mailThrows: false,
  mailResult: true,
  mailGate: null,
  mailAttempts: 0,
  claimReadThrows: false,
  lastMail: null,
  noticeFails: false,
  templateThrows: false,
};

vi.mock("./mail.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildEmailHtml: (opts) => {
      if (db.templateThrows) throw new Error("template failed");
      return actual.buildEmailHtml(opts);
    },
    sendMail: async (message) => {
      db.mailAttempts += 1;
      db.lastMail = message;
      if (db.mailGate) await db.mailGate;
      if (db.mailThrows) throw new Error("smtp down");
      if (db.mailResult === false) return false;
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
    tableExists: async (name) => {
      if (name === "ready_mail_claims") return db.claimsTable;
      if (name === "patients") return db.patientsAvailable;
      return ["users", "doctors", "notifications", "appointments"].includes(name);
    },
    hasColumn: async () => true,
    insert: async (table, fields) => {
      if (db.noticeFails && table === "notifications") throw new Error("notice unreadable");
      notes.push({ table, fields });
      return notes.length;
    },
    update: async () => 1,
    q: async (sql, params = []) => {
      const text = String(sql);
      if (text.includes("ready_mail_claims")) {
        const statement = claims.prepare(text.replace(/`/g, ""));
        if (/^\s*(with|select)/i.test(text)) return statement.all(...params);
        return { affectedRows: statement.run(...params).changes };
      }
      return text.includes("FROM appointments") ? db.appointments : [];
    },
    one: async (sql, params) => {
      const text = String(sql);
      if (text.includes("ready_mail_claims")) {
        if (db.claimReadThrows && /^\s*select/i.test(text)) throw new Error("claims unreadable");
        return claims.prepare(text.replace(/`/g, "")).get(...(params || [])) ?? null;
      }
      const id = Number(params?.[0]);
      if (text.includes("FROM patients")) {
        if (db.profileThrows) throw new Error("patients unreadable");
        return db.patients.find((row) => row.id === id) || null;
      }
      if (text.includes("FROM users")) {
        if (db.userThrows) throw new Error("users unreadable");
        return db.users.find((row) => row.id === id) || null;
      }
      if (text.includes("FROM doctors")) return db.doctors.find((row) => row.id === id) || null;
      return null;
    },
  };
});

const { notifyBookedVisit, notifyDoctorReady, remindUpcomingVisits } = await import("./visit-notify.js");
const { READY_CLAIM_STALE_MS, READY_MAIL_TIMEOUT_MS } = await import("./ready-mail.js");

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
    db.patients = [{ id: 9, user_id: 77, name: "Amina Uwase", email: "owner@example.com", phone: "788000077" }];
    db.patientsAvailable = true;
    db.profileThrows = false;
    db.userThrows = false;
    db.claimsTable = true;
    db.mailThrows = false;
    db.mailResult = true;
    db.mailGate = null;
    db.mailAttempts = 0;
    db.claimReadThrows = false;
    db.lastMail = null;
    db.noticeFails = false;
    db.templateThrows = false;
    claims.exec("DELETE FROM ready_mail_claims");
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

  it("does not guess an owner when the profile lookup fails or the integer is unused", async () => {
    db.profileThrows = true;
    await notifyDoctorReady({ id: 40, patient_id: 9, doctor_id: 31, status: "accepted", guest_email: "stranger@example.com" });
    db.profileThrows = false;
    db.patientsAvailable = false;
    await notifyDoctorReady({ id: 41, patient_id: 9, doctor_id: 31, status: "accepted", guest_email: "stranger@example.com" });
    db.patientsAvailable = true;
    await notifyDoctorReady({ id: 42, patient_id: 77, doctor_id: 31, status: "accepted", guest_email: "owner@example.com" });
    db.userThrows = true;
    await notifyDoctorReady({ id: 46, user_id: 77, doctor_id: 31, status: "accepted", guest_email: "stranger@example.com" });
    expect(sent).toEqual([]);
    expect(notes).toEqual([]);
  });

  it("drops a row whose account and profile name different people", async () => {
    db.patients = [{ id: 9, user_id: 8, name: "Other Profile", email: "other-profile@example.com", phone: "788000008" }];
    await notifyBookedVisit({
      id: 13,
      user_id: 77,
      patient_id: 9,
      doctor_id: 31,
      guest_email: "stranger@example.com",
      appointment_date: "2026-11-09",
      appointment_time: "09:00",
      patient_pays: 10,
      status: "pending",
    });
    expect(sent.map((message) => message.to)).toEqual(["doctor@example.com"]);
    expect(JSON.stringify(sent)).not.toContain("stranger@example.com");
    expect(JSON.stringify(sent)).not.toContain("other-profile@example.com");
    expect(JSON.stringify(sent)).not.toContain("owner@example.com");
    expect(notes.map((note) => note.fields.notifiable_id)).toEqual([31]);
  });

  it("uses the account contact when the row carries a different email", async () => {
    await notifyDoctorReady({
      id: 43,
      user_id: 77,
      patient_id: 77,
      doctor_id: 31,
      status: "accepted",
      guest_email: "stranger@example.com",
      guest_name: "Stranger Account",
    });
    expect(sent.map((message) => message.to)).toEqual(["owner@example.com"]);
    expect(sent[0].html).toContain("Hello, Amina!");
    expect(JSON.stringify(sent)).not.toContain("stranger@example.com");
    expect(notes.map((note) => note.fields.notifiable_id)).toEqual([77]);
  });

  it("emails a guest only when the row has no account id and the contacts agree", async () => {
    await notifyDoctorReady({
      id: 44,
      doctor_id: 31,
      status: "accepted",
      guest_name: "Keza",
      guest_email: "keza@example.com",
      guest_phone: "788111222",
    });
    await notifyDoctorReady({
      id: 45,
      doctor_id: 31,
      status: "accepted",
      guest_email: "one@example.com",
      email: "two@example.com",
    });
    expect(sent.map((message) => message.to)).toEqual(["keza@example.com"]);
    expect(sent[0].html).toContain("Hello, Keza!");
    expect(notes).toEqual([]);
  });

  it("keeps a successful ready mail stored when a new module loads", async () => {
    const row = { id: 4, patient_id: 9, doctor_id: 31, status: "accepted" };
    await notifyDoctorReady(row);
    await notifyDoctorReady(row);
    vi.resetModules();
    const fresh = await import("./visit-notify.js");
    await fresh.notifyDoctorReady(row);
    expect(sent.map((message) => message.to)).toEqual(["owner@example.com"]);
  });

  it("sends the ready mail again after a restart when no claims table exists", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    db.claimsTable = false;
    const row = { id: 70, patient_id: 9, doctor_id: 31, status: "accepted" };
    await notifyDoctorReady(row);
    vi.resetModules();
    db.claimsTable = false;
    const fresh = await import("./visit-notify.js");
    await fresh.notifyDoctorReady(row);
    expect(sent.map((message) => message.to)).toEqual(["owner@example.com", "owner@example.com"]);
    expect(warn.mock.calls.some((call) => String(call[0]).includes("Durability is not active"))).toBe(true);
    warn.mockRestore();
  });

  it("retries after the mailer declines or throws, then stops once a send is recorded", async () => {
    const row = { id: 71, patient_id: 9, doctor_id: 31, status: "accepted" };
    db.mailResult = false;
    await notifyDoctorReady(row);
    await notifyDoctorReady(row);
    expect(sent).toEqual([]);
    expect(db.mailAttempts).toBe(2);
    expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(1);
    db.mailResult = true;
    await notifyDoctorReady(row);
    await notifyDoctorReady(row);
    expect(sent).toHaveLength(1);
    expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(1);
    expect(db.lastMail.timeoutMs).toBe(READY_MAIL_TIMEOUT_MS);
    expect(READY_MAIL_TIMEOUT_MS).toBeLessThan(READY_CLAIM_STALE_MS);
    db.mailThrows = true;
    db.mailAttempts = 0;
    const other = { id: 72, patient_id: 9, doctor_id: 31, status: "accepted" };
    await expect(notifyDoctorReady(other)).rejects.toThrow("smtp down");
    expect(sent).toHaveLength(1);
    db.mailThrows = false;
    await notifyDoctorReady(other);
    await notifyDoctorReady(other);
    expect(sent).toHaveLength(2);
  });

  it("sends once when two ready calls overlap", async () => {
    let release;
    db.mailGate = new Promise((resolve) => {
      release = resolve;
    });
    const row = { id: 73, patient_id: 9, doctor_id: 31, status: "accepted" };
    const first = notifyDoctorReady(row);
    const second = notifyDoctorReady(row);
    await vi.waitFor(() => {
      expect(db.mailAttempts).toBe(1);
    });
    release();
    await Promise.all([first, second]);
    expect(sent).toHaveLength(1);
  });

  it("keeps one in-flight ready mail and one notice when the claims table is missing", async () => {
    db.claimsTable = false;
    let release;
    db.mailGate = new Promise((resolve) => {
      release = resolve;
    });
    const row = { id: 75, patient_id: 9, doctor_id: 31, status: "accepted" };
    const first = notifyDoctorReady(row);
    const second = notifyDoctorReady(row);
    await vi.waitFor(() => expect(db.mailAttempts).toBe(1));
    release();
    await Promise.all([first, second]);
    expect(sent).toHaveLength(1);
    expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(1);
  });

  it("does not mark a ready mail sent when the claim row cannot be read", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    db.claimReadThrows = true;
    const row = { id: 76, patient_id: 9, doctor_id: 31, status: "accepted" };
    await expect(notifyDoctorReady(row)).rejects.toThrow(/could not be read/);
    expect(sent).toEqual([]);
    expect(notes).toEqual([]);
    expect(claims.prepare("SELECT COUNT(*) AS total FROM ready_mail_claims").get().total).toBe(0);
    expect(errorLog.mock.calls.some((call) => String(call[0]).includes("was not sent"))).toBe(true);
    errorLog.mockRestore();
    db.claimReadThrows = false;
    await notifyDoctorReady(row);
    expect(sent).toHaveLength(1);
    expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(1);
  });

  it("does not start a second send while the first is still inside a slow SMTP attempt", async () => {
    vi.useFakeTimers();
    try {
      let release;
      db.mailGate = new Promise((resolve) => {
        release = resolve;
      });
      const row = { id: 74, patient_id: 9, doctor_id: 31, status: "accepted" };
      const first = notifyDoctorReady(row);
      for (let i = 0; i < 20 && db.mailAttempts < 1; i += 1) {
        await vi.advanceTimersByTimeAsync(0);
      }
      expect(db.mailAttempts).toBe(1);
      await vi.advanceTimersByTimeAsync(READY_CLAIM_STALE_MS + 1000);
      await notifyDoctorReady(row);
      expect(db.mailAttempts).toBe(1);
      release();
      await first;
      expect(sent).toHaveLength(1);
      expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(1);
    } finally {
      db.mailGate = null;
      vi.useRealTimers();
    }
  });

  it("retries a failed in-app notice after the email is already complete", async () => {
    db.noticeFails = true;
    const row = { id: 81, patient_id: 9, doctor_id: 31, status: "accepted" };
    await notifyDoctorReady(row);
    expect(sent).toHaveLength(1);
    expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(0);
    db.noticeFails = false;
    await notifyDoctorReady(row);
    expect(sent).toHaveLength(1);
    expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(1);
    const owner = db.users.find((user) => user.id === 77);
    const previousEmail = owner.email;
    owner.email = "";
    db.noticeFails = true;
    notes.length = 0;
    sent.length = 0;
    try {
      const quiet = { id: 82, patient_id: 9, doctor_id: 31, status: "accepted" };
      await notifyDoctorReady(quiet);
      expect(sent).toEqual([]);
      expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(0);
      db.noticeFails = false;
      await notifyDoctorReady(quiet);
      expect(sent).toEqual([]);
      expect(notes.filter((note) => note.fields.type === "visit.ready")).toHaveLength(1);
    } finally {
      owner.email = previousEmail;
    }
  });

  it("releases the in-process mail claim when preparation throws, then one later send proceeds", async () => {
    db.claimsTable = false;
    db.templateThrows = true;
    const row = { id: 83, patient_id: 9, doctor_id: 31, status: "accepted" };
    await expect(notifyDoctorReady(row)).rejects.toThrow(/template failed/);
    expect(sent).toEqual([]);
    db.templateThrows = false;
    let release;
    db.mailGate = new Promise((resolve) => {
      release = resolve;
    });
    const first = notifyDoctorReady(row);
    const second = notifyDoctorReady(row);
    await vi.waitFor(() => expect(db.mailAttempts).toBe(1));
    release();
    await Promise.all([first, second]);
    expect(sent).toHaveLength(1);
  });
});
