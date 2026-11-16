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
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS patients;
    DROP TABLE IF EXISTS doctors;
    DROP TABLE IF EXISTS hospitals;
    DROP TABLE IF EXISTS pharmacies;
    DROP TABLE IF EXISTS services;
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE patients (id INTEGER PRIMARY KEY, user_id INTEGER);
    CREATE TABLE doctors (id INTEGER PRIMARY KEY, user_id INTEGER);
    CREATE TABLE hospitals (id INTEGER PRIMARY KEY, name TEXT, name_en TEXT);
    CREATE TABLE pharmacies (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE services (id INTEGER PRIMARY KEY, name_en TEXT, title_en TEXT);
    INSERT INTO users (id, name) VALUES (77, 'Amina'), (4, 'Dr Alice');
    INSERT INTO patients (id, user_id) VALUES (55, 77);
    INSERT INTO doctors (id, user_id) VALUES (31, 4);
    INSERT INTO hospitals (id, name, name_en) VALUES (8, 'Kigali Care', 'Kigali Care');
    INSERT INTO pharmacies (id, name) VALUES (3, 'City Pharmacy');
    INSERT INTO services (id, name_en, title_en) VALUES (12, 'Lab draw', 'Lab draw');
  `);
}

vi.mock("./db.js", () => ({
  tableExists: async (name) => columns(name).size > 0,
  q: async (sql, params = []) => database.prepare(String(sql).replace(/`/g, '"')).all(...params),
}));

const { decorateVisitRows, nameVisitRows } = await import("./visit-rows.js");

describe("decorateVisitRows", () => {
  beforeEach(reset);

  it("adds the flat names and nested parties the app reads", async () => {
    const [row] = await decorateVisitRows([{
      id: 1,
      patient_id: 55,
      doctor_id: 31,
      hospital_id: 8,
      pharmacy_id: 3,
      service_id: 12,
    }]);
    expect(row).toMatchObject({
      patient_name: "Amina",
      doctor_name: "Dr Alice",
      hospital_name: "Kigali Care",
      pharmacy_name: "City Pharmacy",
      service_name: "Lab draw",
      patient: { name: "Amina", user: { name: "Amina" } },
      doctor: { name: "Dr Alice", user: { name: "Dr Alice" } },
      hospital: { name: "Kigali Care" },
      pharmacy: { name: "City Pharmacy" },
      service: { name: "Lab draw", name_en: "Lab draw" },
    });
    expect(row.patient.user.email).toBeUndefined();
    expect(row.doctor.user.id).toBeUndefined();
  });

  it("uses an appointment account id when there is no patient profile row", async () => {
    const row = await decorateVisitRows({
      id: 5,
      patient_id: 77,
      doctor_id: 31,
    });
    expect(row.patient_name).toBe("Amina");
    expect(row.doctor.user.name).toBe("Dr Alice");
  });

  it("leaves unrelated tables unchanged", async () => {
    const rows = [{ id: 1, name: "Admin" }];
    await expect(nameVisitRows("users", rows)).resolves.toEqual(rows);
  });
});
