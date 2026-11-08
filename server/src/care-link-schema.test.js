import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = new DatabaseSync(":memory:");

function reset() {
  database.exec("DROP TABLE IF EXISTS patients");
  database.exec("DROP TABLE IF EXISTS doctors");
  database.exec("DROP TABLE IF EXISTS appointments");
  database.exec("DROP TABLE IF EXISTS instant_consultation_requests");
  database.exec(`
    CREATE TABLE patients (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT);
    CREATE TABLE doctors (id INTEGER PRIMARY KEY, user_id INTEGER);
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
      status TEXT
    );
  `);
  database.prepare("INSERT INTO patients (id, user_id, name) VALUES (55, 77, 'Amina')").run();
  database.prepare("INSERT INTO patients (id, user_id, name) VALUES (77, 8, 'Foreign')").run();
  database.prepare("INSERT INTO doctors (id, user_id) VALUES (31, 4)").run();
  database.prepare(
    "INSERT INTO appointments (id, doctor_id, patient_id, status) VALUES (5, 31, 77, 'confirmed')",
  ).run();
}

function columns(table) {
  return new Set(database.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
}

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => columns(name).size > 0,
    hasColumn: async (table, column) => columns(table).has(column),
    q: async (sql, params = []) => database.prepare(String(sql).replace(/`/g, '"')).all(...params),
    one: async (sql, params = []) => database.prepare(String(sql).replace(/`/g, '"')).all(...params)[0] ?? null,
  };
});

const { doctorHasCareLink } = await import("./visit-rules.js");

const doctor = { id: 4, active_role: "doctor" };
const patient = { id: 55, user_id: 77 };

describe("care link without an appointments.user_id column", () => {
  beforeEach(reset);

  it("accepts the treating appointment and rejects a contradictory instant on its own", async () => {
    await expect(doctorHasCareLink(doctor, patient)).resolves.toBe(true);
    database.exec("DELETE FROM appointments");
    database.prepare(
      "INSERT INTO instant_consultation_requests (id, doctor_id, patient_id, user_id, status) VALUES (12, 31, 55, 8, 'accepted')",
    ).run();
    await expect(doctorHasCareLink(doctor, patient)).resolves.toBe(false);
    database.exec("DELETE FROM instant_consultation_requests");
    database.prepare(
      "INSERT INTO instant_consultation_requests (id, doctor_id, patient_id, user_id, status) VALUES (10, 31, 77, NULL, 'accepted')",
    ).run();
    await expect(doctorHasCareLink(doctor, patient)).resolves.toBe(false);
    database.exec("DELETE FROM instant_consultation_requests");
    database.prepare(
      "INSERT INTO instant_consultation_requests (id, doctor_id, patient_id, user_id, status) VALUES (9, 31, 55, 77, 'accepted')",
    ).run();
    await expect(doctorHasCareLink(doctor, patient)).resolves.toBe(true);
  });

  it("does not open a care link when the appointment ownership column is missing", async () => {
    database.exec("DROP TABLE appointments");
    database.exec("CREATE TABLE appointments (id INTEGER PRIMARY KEY, patient_id INTEGER, status TEXT)");
    database.prepare("INSERT INTO appointments (id, patient_id, status) VALUES (5, 77, 'confirmed')").run();
    database.exec("DELETE FROM instant_consultation_requests");
    await expect(doctorHasCareLink(doctor, patient)).resolves.toBe(false);
  });
});
