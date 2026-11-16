import { hasColumn, q, tableExists } from "./db.js";

export const VISIT_NAME_TABLES = new Set([
  "appointments",
  "prescriptions",
  "consultation_summaries",
  "service_bookings",
  "instant_consultation_requests",
  "instant_consultations",
  "pharmacy_prescription_requests",
  "prescription_requests",
  "referrals",
]);

function idsOf(rows, key) {
  return [...new Set(rows.map((row) => Number(row?.[key])).filter((id) => id > 0))];
}

function text(value) {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function label(row) {
  return text(row?.name || row?.name_en || row?.title || row?.title_en);
}

async function rowsById(table, idList) {
  if (!idList.length || !(await tableExists(table))) return new Map();
  const rows = await q(
    `SELECT * FROM \`${table}\` WHERE id IN (${idList.map(() => "?").join(",")})`,
    idList,
  ).catch(() => []);
  return new Map(rows.map((row) => [Number(row.id), row]));
}

/** Appointments store the user account id in patient_id. Match that before the profile id. */
async function patientMaps(idList) {
  const byProfileId = new Map();
  const byUserId = new Map();
  if (!idList.length || !(await tableExists("patients"))) return { byProfileId, byUserId };
  const hasUser = await hasColumn("patients", "user_id");
  const marks = idList.map(() => "?").join(",");
  const rows = await q(
    hasUser
      ? `SELECT * FROM patients WHERE user_id IN (${marks}) OR id IN (${marks})`
      : `SELECT * FROM patients WHERE id IN (${marks})`,
    hasUser ? [...idList, ...idList] : idList,
  ).catch(() => []);
  for (const row of rows) {
    byProfileId.set(Number(row.id), row);
    if (hasUser && Number(row.user_id) > 0) byUserId.set(Number(row.user_id), row);
  }
  return { byProfileId, byUserId };
}

function patientFor(maps, patientId) {
  const key = Number(patientId);
  if (!(key > 0)) return null;
  return maps.byUserId.get(key) || maps.byProfileId.get(key) || null;
}

function namedParty(current, details) {
  const party = mergeParty(current, details);
  const id = Number(party.id);
  const name = text(party.name) || text(party.name_en);
  if (!(id > 0) && !name) return null;
  return party;
}

function setOptional(row, key, party) {
  if (party) row[key] = party;
  else delete row[key];
}

function mergeParty(current, { id, name, nameEn, withUser = false }) {
  const previous = current && typeof current === "object" ? current : {};
  const previousUser = previous.user && typeof previous.user === "object" ? previous.user : {};
  const party = {
    ...previous,
    id: previous.id ?? id ?? null,
    name: text(previous.name) || name,
  };
  if (nameEn) party.name_en = text(previous.name_en) || nameEn;
  if (withUser) {
    party.user = {
      ...previousUser,
      name: text(previousUser.name) || name,
    };
  }
  return party;
}

/** Add the flat names and nested parties the patient and doctor screens read. */
export async function decorateVisitRows(rows) {
  const single = rows != null && !Array.isArray(rows);
  const list = (single ? [rows] : Array.isArray(rows) ? rows : []).filter(Boolean);
  if (!list.length) return rows;

  const patientIds = idsOf(list, "patient_id");
  const [patients, doctors, hospitals, pharmacies, services] = await Promise.all([
    patientMaps(patientIds),
    rowsById("doctors", idsOf(list, "doctor_id")),
    rowsById("hospitals", idsOf(list, "hospital_id")),
    rowsById("pharmacies", idsOf(list, "pharmacy_id")),
    rowsById("services", idsOf(list, "service_id")),
  ]);
  const userIds = new Set(patientIds);
  for (const patient of patients.byProfileId.values()) if (Number(patient.user_id) > 0) userIds.add(Number(patient.user_id));
  for (const doctor of doctors.values()) if (Number(doctor.user_id) > 0) userIds.add(Number(doctor.user_id));
  const loadedUsers = await rowsById("users", [...userIds]);

  for (const row of list) {
    const patient = patientFor(patients, row.patient_id);
    const patientUser = loadedUsers.get(Number(patient?.user_id)) || loadedUsers.get(Number(row.patient_id));
    const patientName = text(row.patient_name || row.guest_name || patientUser?.name || label(patient));

    const doctor = doctors.get(Number(row.doctor_id));
    const doctorUser = loadedUsers.get(Number(doctor?.user_id));
    const doctorName = text(row.doctor_name || doctorUser?.name || label(doctor));

    const hospital = hospitals.get(Number(row.hospital_id));
    const hospitalName = text(row.hospital_name || label(hospital));
    const pharmacy = pharmacies.get(Number(row.pharmacy_id));
    const pharmacyName = text(row.pharmacy_name || label(pharmacy));
    const service = services.get(Number(row.service_id));
    const serviceName = text(row.service_name || label(service));

    row.patient_name = patientName;
    row.doctor_name = doctorName;
    row.hospital_name = hospitalName;
    row.pharmacy_name = pharmacyName;
    row.service_name = serviceName;
    row.patient = mergeParty(row.patient, { id: patient?.id ?? (Number(row.patient_id) || null), name: patientName, withUser: true });
    row.doctor = mergeParty(row.doctor, { id: doctor?.id ?? (Number(row.doctor_id) || null), name: doctorName, withUser: true });
    setOptional(row, "hospital", namedParty(row.hospital, {
      id: hospital?.id ?? (Number(row.hospital_id) || null),
      name: hospitalName,
      nameEn: text(hospital?.name_en) || hospitalName,
    }));
    setOptional(row, "pharmacy", namedParty(row.pharmacy, {
      id: pharmacy?.id ?? (Number(row.pharmacy_id) || null),
      name: pharmacyName,
    }));
    setOptional(row, "service", namedParty(row.service, {
      id: service?.id ?? (Number(row.service_id) || null),
      name: serviceName,
      nameEn: text(service?.name_en || service?.title_en) || serviceName,
    }));
  }
  return single ? list[0] : rows;
}

export async function nameVisitRows(table, rows) {
  if (!VISIT_NAME_TABLES.has(table) || rows == null) return rows;
  return decorateVisitRows(rows);
}
