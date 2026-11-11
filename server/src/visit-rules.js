import { hasColumn, one, pool, q, tableExists } from "./db.js";
import { hashPassword, loadOwnedId } from "./auth.js";
import { kigaliClock } from "./doctor-schedule.js";
import { canJoinInstant, instantOwnedWhere, isPaidStatus, ownsInstant, UNPAID_APPOINTMENT_JOIN_MESSAGE, UNPAID_INSTANT_JOIN_MESSAGE } from "./instant-visit.js";
import { pick } from "./user-text.js";

/**
 * A visit is settled only after a verified payment (or a zero fee) and a
 * status the doctor can act on. An explicit unpaid payment_status is never
 * settled, even when status is confirmed. When the payment column is absent,
 * status confirmed/accepted is the marker the payment callback leaves behind.
 */

const SETTLED = new Set(["confirmed", "accepted", "in_progress", "completed", "done"]);
const CLOSED = new Set(["expired", "cancelled", "canceled", "declined", "rejected", "no_show"]);
const SLOT_TAKEN = ["booked", "reserved", "held", "unavailable", "blocked", "closed"];

export function clockTime(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function visitIsSettled(row) {
  const status = String(row?.status || "").toLowerCase();
  if (!isPaidStatus(row)) return false;
  return SETTLED.has(status);
}

export function visitIsClosed(row) {
  return CLOSED.has(String(row?.status || "").toLowerCase());
}

/** The patient has not made a verified payment, and the visit is still open. */
export function visitAwaitsPayment(row) {
  if (visitIsClosed(row)) return false;
  return !isPaidStatus(row);
}

/**
 * Kigali wall clock versus the appointment's own date and time. The window opens
 * 20 minutes early and closes duration + 40 minutes after the start, so a doctor
 * running late can still get in but a visit booked for tomorrow cannot.
 */
export function appointmentJoinWindow(appointment, now = new Date()) {
  // Once the doctor has taken the visit, they are waiting in the room; locking
  // the patient out at that point would only strand the call.
  if (["accepted", "in_progress"].includes(String(appointment?.status || "").toLowerCase())) {
    return { ok: true, reason: null };
  }
  const date = String(appointment?.appointment_date || "").slice(0, 10);
  const start = clockTime(appointment?.appointment_time);
  if (!date || !start) return { ok: true, reason: null };
  const kigali = kigaliClock(now);
  if (date !== kigali.date) return { ok: false, reason: "not-today" };
  const [hour, minute] = start.split(":").map(Number);
  const from = hour * 60 + minute;
  const duration = Math.max(5, Number(appointment?.duration_minutes) || 30);
  if (kigali.minutes < from - 20) return { ok: false, reason: "too-early" };
  if (kigali.minutes > from + duration + 40) return { ok: false, reason: "too-late" };
  return { ok: true, reason: null };
}

const APPOINTMENT_JOIN_STATUSES = new Set(["confirmed", "accepted", "in_progress"]);
const FINISHED = new Set(["completed", "done"]);

const JOIN_BLOCK_COPY = {
  en: {
    "unpaid-appointment": UNPAID_APPOINTMENT_JOIN_MESSAGE,
    "unpaid-instant": UNPAID_INSTANT_JOIN_MESSAGE,
    "unconfirmed-appointment": "Wait for the doctor to confirm this visit before joining.",
    "unaccepted-instant": "Wait until the doctor accepts this consultation before joining.",
    "too-early": "This consultation has not started yet. Join a few minutes before your slot.",
    "too-late": "This consultation slot has passed. Contact the doctor to reschedule.",
    "not-today": "Consultations can only be joined on the booked day.",
    closed: "This visit is no longer open.",
  },
  fr: {
    "unpaid-appointment": "Payez cette visite et attendez que le médecin la confirme avant de la rejoindre.",
    "unpaid-instant": "Cette consultation n'est pas encore payée. Le patient doit terminer le paiement avant que vous puissiez la rejoindre.",
    "unconfirmed-appointment": "Attendez que le médecin confirme cette visite avant de la rejoindre.",
    "unaccepted-instant": "Attendez que le médecin accepte cette consultation avant de la rejoindre.",
    "too-early": "Cette consultation n'a pas encore commencé. Rejoignez-la quelques minutes avant le créneau.",
    "too-late": "Ce créneau de consultation est passé. Contactez le médecin pour le reporter.",
    "not-today": "Une consultation ne peut être rejointe que le jour prévu.",
    closed: "Cette visite n'est plus ouverte.",
  },
  rw: {
    "unpaid-appointment": "Ishyura iyi konsultasiyo hanyuma utegereze ko muganga ayemeza mbere yo kuyinjiramo.",
    "unpaid-instant": "Iyi konsultasiyo ntirishyurwa. Umurwayi agomba kurangiza kwishyura mbere yo kuyinjiramo.",
    "unconfirmed-appointment": "Tegereza ko muganga yemeza iyi konsultasiyo mbere yo kuyinjiramo.",
    "unaccepted-instant": "Tegereza ko muganga yemera iyi konsultasiyo mbere yo kuyinjiramo.",
    "too-early": "Iyi konsultasiyo ntiratangira. Injira iminota mike mbere y'isaha yateganyijwe.",
    "too-late": "Igihe cy'iyi konsultasiyo cyararangiye. Vugana na muganga kugira ngo musubiremo igihe.",
    "not-today": "Konsultasiyo irinjirwa gusa ku munsi wateganyijwe.",
    closed: "Iyi konsultasiyo ntikiri ifunguye.",
  },
};

export function joinBlockMessage(code, lang = "en") {
  const key = String(code || "");
  return pick(lang, {
    en: JOIN_BLOCK_COPY.en[key],
    fr: JOIN_BLOCK_COPY.fr[key],
    rw: JOIN_BLOCK_COPY.rw[key],
  }) || JOIN_BLOCK_COPY.en[key] || JOIN_BLOCK_COPY.en.closed;
}

/**
 * Why a generic join must not mint a room token. Null means the visit can be joined.
 * Appointments need a verified payment, a doctor confirmation, and the same
 * booked-day window the dedicated patient join route already uses. Instant
 * visits need a verified payment and a doctor acceptance.
 */
export function visitJoinBlock(table, row, now = new Date()) {
  if (!VISIT_TABLES.has(table) || !row) return null;
  const status = String(row.status || "").toLowerCase();
  if (visitIsClosed(row) || FINISHED.has(status)) return { code: "closed" };
  const instant = table !== "appointments";
  if (!isPaidStatus(row)) return { code: instant ? "unpaid-instant" : "unpaid-appointment" };
  if (instant) {
    if (!canJoinInstant(row)) return { code: "unaccepted-instant" };
    return null;
  }
  if (!APPOINTMENT_JOIN_STATUSES.has(status)) return { code: "unconfirmed-appointment" };
  const window = appointmentJoinWindow(row, now);
  if (!window.ok) return { code: window.reason || "not-today", reason: window.reason };
  return null;
}

export function appointmentStartIsInPast(date, time, now = new Date()) {
  const kigali = kigaliClock(now);
  const day = String(date || "").slice(0, 10);
  const start = clockTime(time);
  if (!day || !start) return false;
  if (day < kigali.date) return true;
  if (day > kigali.date) return false;
  const [hour, minute] = start.split(":").map(Number);
  return hour * 60 + minute <= kigali.minutes;
}

export async function patientOwnsAppointment(appointment, user) {
  const accountId = Number(user?.id) || 0;
  if (!accountId || !appointment) return false;
  if (contradictsAccount(appointment, accountId)) return false;
  return Number(appointment.patient_id) === accountId;
}

/**
 * The signed-in viewer for instant ownership. Profile ids come only from
 * `patients.user_id`. The account id is not added as a profile id.
 * `occupiedUserId` is the owner of the patient profile whose id equals this
 * account id, when that profile exists.
 */
export async function loadInstantViewer(user) {
  if (!user?.id) return null;
  const patientIds = [];
  let occupiedUserId = null;
  if (await tableExists("patients") && await hasColumn("patients", "user_id")) {
    const profiles = await q("SELECT id FROM patients WHERE user_id = ?", [user.id]).catch(() => []);
    for (const profile of profiles) {
      const id = Number(profile.id);
      if (id > 0) patientIds.push(id);
    }
    const occupant = await one("SELECT user_id FROM patients WHERE id = ? LIMIT 1", [user.id]).catch(() => null);
    if (occupant && Number(occupant.user_id) > 0) occupiedUserId = Number(occupant.user_id);
  }
  return {
    userId: Number(user.id),
    patientIds,
    email: user.email || "",
    phone: user.phone || "",
    occupiedUserId,
  };
}

/**
 * Instant rows belong to a signed-up patient through user_id or that account's
 * patient profile. Contact is only a fallback when both of those are empty.
 */
export async function patientOwnsInstant(row, user) {
  const viewer = await loadInstantViewer(user);
  if (!viewer) return false;
  return ownsInstant(row, viewer);
}

export async function doctorOwnsVisit(row, user) {
  if (!row || !user) return false;
  const doctorId = await loadOwnedId(user.id, "doctors");
  return Boolean(doctorId) && Number(row.doctor_id) === Number(doctorId);
}

export const VISIT_TABLES = new Set(["appointments", "instant_consultation_requests", "instant_consultations"]);
export const DOCTOR_WORK_STATUSES = new Set(["accepted", "confirmed", "in_progress", "completed"]);

/**
 * The generic /:scope/:resource routes serve every table, but a visit row is not
 * ordinary data: it carries a room token and a payment state. Only the owning
 * side may read or move it, so one check covers all of those route shapes.
 */
export async function visitOpenTo(scope, table, row, user) {
  if (!VISIT_TABLES.has(table) || !row) return true;
  try {
    if (scope === "admin") return scopeRoleAllowed(user, "admin");
    if (scope === "patient") {
      if (table === "appointments") return patientMayWriteAppointment(row, user);
      return patientMayWriteInstant(row, user);
    }
    if (scope === "doctor") return doctorOwnsVisit(row, user);
    return columnMatches(scope, table, row, user);
  } catch {
    return false;
  }
}

const ADMIN_ROLES = ["admin", "moderator", "finance", "help_desk"];
const PROFILE_TABLE = { doctor: "doctors", patient: "patients", hospital: "hospitals", pharmacy: "pharmacies" };
const CLINICAL_TABLES = new Set(["prescriptions", "consultation_summaries", "prescription_requests"]);
const OWNER_KEYS = ["doctor_id", "patient_id", "user_id", "hospital_id", "pharmacy_id", "prescriber_id", "notifiable_id"];

/** Same scope rule as the generic list: the active role must be the area being written. */
export function scopeRoleAllowed(user, scope) {
  if (!user) return false;
  const role = user.active_role || user.role;
  if (scope === "admin") return ADMIN_ROLES.includes(role);
  return role === scope;
}

export function stripClientOwners(body, { keep = false } = {}) {
  const safe = { ...(body ?? {}) };
  delete safe.password;
  delete safe.id;
  if (!keep) {
    for (const key of OWNER_KEYS) delete safe[key];
  }
  return safe;
}

/** Fields a profile form must not be able to set on its own row. */
export function profileFormBody(body, { doctor = false } = {}) {
  const safe = stripClientOwners(body);
  delete safe.status;
  delete safe.role;
  delete safe.active_role;
  delete safe.can_be_admin;
  delete safe.profile_completed_at;
  if (doctor) {
    delete safe.license_expires_at;
    delete safe.license_expiry_reminded_for;
  }
  return safe;
}

async function profileId(user, scope) {
  const table = PROFILE_TABLE[scope];
  if (!table) return null;
  return loadOwnedId(user.id, table);
}

async function columnMatches(scope, table, row, user) {
  const column = `${scope}_id`;
  let present = false;
  try {
    present = await hasColumn(table, column);
  } catch {
    return false;
  }
  if (present) {
    const ownerId = await profileId(user, scope);
    return Boolean(ownerId) && Number(row[column]) === Number(ownerId);
  }
  try {
    if (await hasColumn(table, "user_id")) return Number(row.user_id) === Number(user.id);
  } catch {
    return false;
  }
  return false;
}

async function ownProfileIds(user) {
  if (!(await tableExists("patients"))) {
    throw new Error("patients table is unreadable");
  }
  const profiles = await q("SELECT id FROM patients WHERE user_id = ?", [user.id]);
  return new Set(profiles.map((row) => Number(row.id)).filter((id) => id > 0));
}

function contradictsAccount(row, accountId) {
  return row?.user_id != null && row.user_id !== "" && Number(row.user_id) > 0 && Number(row.user_id) !== accountId;
}

/** Appointment patient_id is the account id. The profile id is not a substitute. */
function patientMayWriteAppointment(row, user) {
  const accountId = Number(user?.id) || 0;
  if (!accountId || contradictsAccount(row, accountId)) return false;
  return Number(row?.patient_id) === accountId;
}

/** Instant patient_id is a profile id. A failed profile lookup is not ownership. */
async function patientMayWriteInstant(row, user) {
  if (!user?.id) return false;
  if (!(await tableExists("patients"))) return false;
  const profiles = await ownProfileIds(user);
  const occupant = await one("SELECT user_id FROM patients WHERE id = ? LIMIT 1", [user.id]);
  return ownsInstant(row, {
    userId: Number(user.id),
    patientIds: [...profiles],
    email: user.email || "",
    phone: user.phone || "",
    occupiedUserId: occupant?.user_id ? Number(occupant.user_id) : null,
  });
}

async function clinicalRowOpen(scope, table, row, user) {
  if (scope === "doctor") {
    const doctorId = await profileId(user, "doctor");
    if (!doctorId) return false;
    return Number(row.doctor_id || row.prescriber_id) === Number(doctorId);
  }
  if (scope === "patient") {
    const profiles = await ownProfileIds(user);
    if (contradictsAccount(row, Number(user.id))) return false;
    return profiles.has(Number(row.patient_id));
  }
  if (scope === "pharmacy") {
    const pharmacyId = await profileId(user, "pharmacy");
    if (!pharmacyId) return false;
    if (Number(row.pharmacy_id) === Number(pharmacyId)) return true;
    if (!(await tableExists("pharmacy_prescription_requests"))) return false;
    const link = await one(
      "SELECT id FROM pharmacy_prescription_requests WHERE prescription_id = ? AND pharmacy_id = ? LIMIT 1",
      [row.id, pharmacyId],
    );
    return Boolean(link);
  }
  return columnMatches(scope, table, row, user);
}

/**
 * Write gate for generic and alias record routes.
 * A missing ownership column, or a lookup that throws, is not access.
 * Admin catalog managers may write after the scope role check. Hospital and
 * pharmacy do not inherit visit rows unless the row names their own profile.
 */
export async function mayWriteRow(scope, table, row, user) {
  if (!scopeRoleAllowed(user, scope) || !table || !row) return false;
  if (scope === "admin") return true;
  try {
    if (VISIT_TABLES.has(table)) {
      if (scope === "patient") {
        if (table === "appointments") return patientMayWriteAppointment(row, user);
        return patientMayWriteInstant(row, user);
      }
      if (scope === "doctor") return doctorOwnsVisit(row, user);
      return columnMatches(scope, table, row, user);
    }
    if (CLINICAL_TABLES.has(table)) return clinicalRowOpen(scope, table, row, user);
    return columnMatches(scope, table, row, user);
  } catch {
    return false;
  }
}

/**
 * A doctor may write a chart only when an appointment or instant row already
 * names both this doctor profile and this patient. Appointments store the
 * account id. Instant rows store the patient profile id or user_id.
 */
export async function doctorHasCareLink(user, patient) {
  if (!user?.id || !patient?.id) return false;
  let doctorId;
  try {
    doctorId = await loadOwnedId(user.id, "doctors");
  } catch {
    return false;
  }
  if (!doctorId) return false;
  const accountId = Number(patient.user_id) || null;
  const profileId = Number(patient.id);
  try {
    if (await tableExists("appointments") && accountId) {
      const booked = await careRows("appointments", "doctor_id = ? AND patient_id = ?", [doctorId, accountId]);
      if (booked.some((row) => !contradictsAccount(row, accountId))) return true;
    }
    let instantTable = null;
    if (await tableExists("instant_consultation_requests")) instantTable = "instant_consultation_requests";
    else if (await tableExists("instant_consultations")) instantTable = "instant_consultations";
    if (!instantTable) return false;
    const byProfile = await careRows(instantTable, "doctor_id = ? AND patient_id = ?", [doctorId, profileId]);
    if (byProfile.some((row) => !("user_id" in row) || row.user_id == null || row.user_id === "" || Number(row.user_id) === accountId)) {
      return true;
    }
    if (accountId && await hasColumn(instantTable, "user_id")) {
      const byAccount = await careRows(instantTable, "doctor_id = ? AND user_id = ?", [doctorId, accountId]);
      let occupantOfAccount = null;
      let occupantKnown = false;
      if (await tableExists("patients")) {
        const occupant = await one("SELECT user_id FROM patients WHERE id = ? LIMIT 1", [accountId]);
        occupantKnown = true;
        occupantOfAccount = occupant?.user_id ? Number(occupant.user_id) : null;
      }
      for (const row of byAccount) {
        const pointed = Number(row.patient_id) || null;
        if (!pointed || pointed === profileId) return true;
        if (pointed === accountId) {
          if (!occupantKnown || (occupantOfAccount && occupantOfAccount !== accountId)) continue;
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function strictInstantViewer(user) {
  const profiles = await ownProfileIds(user);
  const occupant = await one("SELECT user_id FROM patients WHERE id = ? LIMIT 1", [user.id]);
  return {
    userId: Number(user.id),
    patientIds: [...profiles],
    email: user?.email || "",
    phone: user?.phone || "",
    occupiedUserId: occupant?.user_id ? Number(occupant.user_id) : null,
  };
}

const INSTANT_TABLES = new Set(["instant_consultation_requests", "instant_consultations"]);
const PROFILE_OWNED_TABLES = new Set([
  "prescriptions",
  "consultation_summaries",
  "prescription_requests",
  "pharmacy_orders",
  "referrals",
  "fitness_certificates",
]);
const PERSONAL_TABLES = new Set(["reviews", "refunds", "payments"]);
const PUBLIC_CATALOGS = new Set([
  "specializations",
  "specialization_fees",
  "help_center_links",
  "legal_documents",
  "fitness_checklist_questions",
]);

/**
 * Patient ownership for one table. Appointments and service bookings use the
 * account id. Instant rows use the profile rules. Clinical rows use profile ids.
 * A lookup failure is no access. Reviews and refunds match a profile id, or an
 * account id only when that integer is not someone else's profile. Any other
 * patient_id table is closed.
 */
export async function patientOwnedWhere(table, user) {
  try {
    const accountId = Number(user?.id) || 0;
    if (!accountId) return { sql: "0", params: [] };
    if (ACCOUNT_PATIENT_TABLES.has(table)) {
      if (await hasColumn(table, "user_id")) {
        return {
          sql: "`patient_id` = ? AND (`user_id` IS NULL OR `user_id` = ?)",
          params: [accountId, accountId],
        };
      }
      return { sql: "`patient_id` = ?", params: [accountId] };
    }
    if (INSTANT_TABLES.has(table)) {
      const columns = new Set(["patient_id"]);
      for (const name of ["user_id", "guest_email", "email", "guest_phone", "phone"]) {
        if (await hasColumn(table, name)) columns.add(name);
      }
      return instantOwnedWhere(await strictInstantViewer(user), columns);
    }
    if (PROFILE_OWNED_TABLES.has(table)) {
      const ids = [...(await ownProfileIds(user))];
      if (!ids.length) return { sql: "0", params: [] };
      let sql = `\`patient_id\` IN (${ids.map(() => "?").join(",")})`;
      const params = [...ids];
      if (await hasColumn(table, "user_id")) {
        sql += " AND (`user_id` IS NULL OR `user_id` = ?)";
        params.push(accountId);
      }
      return { sql, params };
    }
    if (PERSONAL_TABLES.has(table)) return patientIdentityWhere(table, user);
    return { sql: "0", params: [] };
  } catch {
    return { sql: "0", params: [] };
  }
}

/** Profile ids, or an account id only when no other person occupies that integer. */
async function patientIdentityWhere(table, user) {
  const accountId = Number(user?.id) || 0;
  if (!accountId) return { sql: "0", params: [] };
  const ids = [...(await ownProfileIds(user))];
  const parts = [];
  const params = [];
  if (ids.length) {
    parts.push(`\`patient_id\` IN (${ids.map(() => "?").join(",")})`);
    params.push(...ids);
  }
  parts.push("(`patient_id` = ? AND NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = ? AND p.user_id IS NOT NULL AND p.user_id <> ?))");
  params.push(accountId, accountId, accountId);
  let sql = `(${parts.join(" OR ")})`;
  if (await hasColumn(table, "user_id")) {
    sql = `(${sql} AND (\`user_id\` IS NULL OR \`user_id\` = ?))`;
    params.push(accountId);
  }
  return { sql, params };
}

export async function insuranceCatalogWhere() {
  const parts = [];
  if (await hasColumn("insurances", "patient_id")) parts.push("(`patient_id` IS NULL OR `patient_id` = 0)");
  if (await hasColumn("insurances", "policy_number")) parts.push("(`policy_number` IS NULL OR TRIM(`policy_number`) = '')");
  return { sql: parts.length ? parts.join(" AND ") : "1=1", params: [] };
}

export function insuranceRowIsPublic(row) {
  const patient = Number(row?.patient_id) || 0;
  const policy = String(row?.policy_number ?? "").trim();
  return !patient && !policy;
}

export async function personalPatientWhere(table, user) {
  return patientIdentityWhere(table, user);
}

export async function mayReadRow(scope, table, row, user) {
  if (!table || !row) return false;
  if (VISIT_TABLES.has(table)) return visitOpenTo(scope, table, row, user);
  if (scope === "admin") return scopeRoleAllowed(user, "admin");
  if (table === "insurances") return insuranceRowIsPublic(row);
  if (PUBLIC_CATALOGS.has(table)) return true;
  try {
    if (scope === "patient" && (await hasColumn(table, "patient_id"))) {
      return patientRowMatches(row, user);
    }
    return columnMatches(scope, table, row, user);
  } catch {
    return false;
  }
}

async function patientRowMatches(row, user) {
  const accountId = Number(user?.id) || 0;
  if (!accountId || contradictsAccount(row, accountId)) return false;
  const profiles = await ownProfileIds(user);
  if (profiles.has(Number(row.patient_id))) return true;
  if (Number(row.patient_id) !== accountId) return false;
  const occupant = await one("SELECT user_id FROM patients WHERE id = ? LIMIT 1", [accountId]);
  return !(occupant?.user_id && Number(occupant.user_id) !== accountId);
}

export function isPublicCatalog(table) {
  return PUBLIC_CATALOGS.has(table);
}

/** List filter for a visit table. Never falls open when the owner column is absent. */
export async function visitReadWhere(scope, table, user) {
  if (!VISIT_TABLES.has(table)) return null;
  try {
    if (scope === "admin") {
      return scopeRoleAllowed(user, "admin") ? { sql: "1=1", params: [] } : { sql: "0", params: [] };
    }
    if (scope === "patient") return (await patientOwnedWhere(table, user)) || { sql: "0", params: [] };
    if (scope === "doctor") {
      const doctorId = await loadOwnedId(user?.id, "doctors");
      if (!doctorId || !(await hasColumn(table, "doctor_id"))) return { sql: "0", params: [] };
      return { sql: "`doctor_id` = ?", params: [doctorId] };
    }
    const column = `${scope}_id`;
    if (PROFILE_TABLE[scope] && (await hasColumn(table, column))) {
      const ownerId = await loadOwnedId(user?.id, PROFILE_TABLE[scope]);
      if (!ownerId) return { sql: "0", params: [] };
      return { sql: `\`${column}\` = ?`, params: [ownerId] };
    }
    return { sql: "0", params: [] };
  } catch {
    return { sql: "0", params: [] };
  }
}

async function careRows(table, whereSql, params) {
  const names = ["id", "patient_id"];
  if (await hasColumn(table, "user_id")) names.push("user_id");
  return q(
    `SELECT ${names.map((name) => `\`${name}\``).join(", ")} FROM \`${table}\` WHERE ${whereSql} LIMIT 5`,
    params,
  );
}

/**
 * Create keeps a target patient only when that profile is real and, for a
 * doctor, already linked by a visit. The actor's own id is stamped. A spoofed
 * doctor, pharmacy, or hospital id is not copied from the body.
 */
const ACCOUNT_PATIENT_TABLES = new Set(["appointments", "service_bookings"]);

async function profileById(id) {
  return one("SELECT id, user_id FROM patients WHERE id = ? LIMIT 1", [id]);
}

export async function resolveCreateBody(scope, table, body, user) {
  if (!scopeRoleAllowed(user, scope)) {
    return { ok: false, status: 403, message: "You do not have access to this area." };
  }
  if (table === "appointments") {
    return {
      ok: false,
      status: 405,
      message: "Book an appointment from the appointment form.",
    };
  }
  if (scope === "admin") {
    const password = body?.password;
    const kept = stripClientOwners(body, { keep: true });
    if (table === "users" && password) kept.password = await hashPassword(password);
    return { ok: true, body: kept };
  }
  const actor = {};
  const source = { ...(body ?? {}) };
  try {
    if (scope === "doctor") {
      const doctorId = await loadOwnedId(user.id, "doctors");
      if (!doctorId) return { ok: false, status: 403, message: "You do not have access to this area." };
      if (await hasColumn(table, "doctor_id")) actor.doctor_id = doctorId;
      if (await hasColumn(table, "prescriber_id")) actor.prescriber_id = doctorId;
      if (CLINICAL_TABLES.has(table)) {
        const linked = await patientFromClinicalVisit(source, doctorId, user);
        if (!linked.ok) return linked;
        actor.patient_id = linked.patientId;
      } else if (await hasColumn(table, "patient_id")) {
        const patient = await resolveTargetPatient(source.patient_id, { accountPointer: ACCOUNT_PATIENT_TABLES.has(table) });
        if (!patient.ok) return patient;
        if (!(await doctorHasCareLink(user, patient.patient))) {
          return { ok: false, status: 403, message: "You do not have access to this record." };
        }
        actor.patient_id = patient.storedId;
      }
      if (await hasColumn(table, "hospital_id") && source.hospital_id != null && source.hospital_id !== "") {
        const hospital = await one("SELECT id FROM hospitals WHERE id = ? LIMIT 1", [source.hospital_id]);
        if (!hospital?.id) return { ok: false, status: 422, message: "Choose a hospital." };
        actor.hospital_id = Number(hospital.id);
      }
    } else if (scope === "patient") {
      const profiles = await ownProfileIds(user);
      if (await hasColumn(table, "patient_id")) {
        if (ACCOUNT_PATIENT_TABLES.has(table)) actor.patient_id = Number(user.id);
        else {
          const requested = Number(source.patient_id) || null;
          if (requested && !profiles.has(requested)) {
            return { ok: false, status: 403, message: "You do not have access to this record." };
          }
          const profileId = requested || (profiles.size === 1 ? [...profiles][0] : null);
          if (!profileId) return { ok: false, status: 422, message: "Choose the patient this record is for." };
          actor.patient_id = profileId;
        }
      }
      if (await hasColumn(table, "user_id")) actor.user_id = Number(user.id);
      if (await hasColumn(table, "hospital_id") && source.hospital_id != null && source.hospital_id !== "") {
        const hospital = await one("SELECT id FROM hospitals WHERE id = ? LIMIT 1", [source.hospital_id]);
        if (!hospital?.id) return { ok: false, status: 422, message: "Choose a hospital." };
        actor.hospital_id = Number(hospital.id);
      }
      if (await hasColumn(table, "pharmacy_id") && source.pharmacy_id != null && source.pharmacy_id !== "") {
        const pharmacy = await one("SELECT id FROM pharmacies WHERE id = ? LIMIT 1", [source.pharmacy_id]);
        if (!pharmacy?.id) return { ok: false, status: 422, message: "Choose a pharmacy." };
        actor.pharmacy_id = Number(pharmacy.id);
      }
    } else if (scope === "hospital" || scope === "pharmacy") {
      const ownerId = await loadOwnedId(user.id, PROFILE_TABLE[scope]);
      if (!ownerId) return { ok: false, status: 403, message: "You do not have access to this area." };
      const column = `${scope}_id`;
      if (await hasColumn(table, column)) actor[column] = ownerId;
      if (await hasColumn(table, "patient_id") && source.patient_id != null && source.patient_id !== "") {
        const patient = await resolveTargetPatient(source.patient_id, { accountPointer: ACCOUNT_PATIENT_TABLES.has(table) });
        if (!patient.ok) return patient;
        actor.patient_id = patient.storedId;
      }
      if (scope === "hospital" && await hasColumn(table, "doctor_id") && source.doctor_id != null && source.doctor_id !== "") {
        const doctor = await one("SELECT id FROM doctors WHERE id = ? LIMIT 1", [source.doctor_id]);
        if (!doctor?.id) return { ok: false, status: 422, message: "Choose a doctor." };
        actor.doctor_id = Number(doctor.id);
      }
    } else {
      return { ok: false, status: 403, message: "You do not have access to this record." };
    }
  } catch {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
  const callerKeys = {
    doctor: ["doctor_id", "prescriber_id"],
    patient: ["patient_id", "user_id"],
    hospital: ["hospital_id"],
    pharmacy: ["pharmacy_id"],
  }[scope] || [];
  if (!callerKeys.some((key) => actor[key] != null)) {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
  return { ok: true, body: { ...stripClientOwners(source), ...actor } };
}

/** One integer must not name both a foreign profile and a different account. */
async function unambiguousProfile(rawId) {
  const requested = Number(rawId);
  if (!requested) return { ok: false, status: 422, message: "Choose the patient this record is for." };
  const byAccount = await q("SELECT id, user_id FROM patients WHERE user_id = ?", [requested]);
  const profile = await profileById(requested);
  const profileIsOther = Boolean(profile?.id && Number(profile.user_id) !== requested);
  const accountOthers = byAccount.filter((row) => Number(row.id) !== Number(profile?.id));
  if (profileIsOther && accountOthers.length) {
    return { ok: false, status: 422, message: "Choose the patient this record is for." };
  }
  if (byAccount.length > 1) return { ok: false, status: 422, message: "Choose the patient this record is for." };
  if (profile?.id && !profileIsOther) {
    return { ok: true, patient: profile, profileId: Number(profile.id), accountId: Number(profile.user_id) || requested };
  }
  if (byAccount.length === 1) {
    return { ok: true, patient: byAccount[0], profileId: Number(byAccount[0].id), accountId: requested };
  }
  if (profile?.id) {
    return { ok: true, patient: profile, profileId: Number(profile.id), accountId: Number(profile.user_id) || null };
  }
  return { ok: false, status: 422, message: "Choose the patient this record is for." };
}

async function resolveTargetPatient(rawId, { accountPointer }) {
  const named = await unambiguousProfile(rawId);
  if (!named.ok) return named;
  if (accountPointer) {
    if (!named.accountId) return { ok: false, status: 422, message: "Choose the patient this record is for." };
    return { ok: true, patient: named.patient, storedId: named.accountId };
  }
  return { ok: true, patient: named.patient, storedId: named.profileId };
}

async function appointmentProfile(appointmentId, doctorId) {
  const names = ["id", "doctor_id", "patient_id"];
  if (await hasColumn("appointments", "user_id")) names.push("user_id");
  const visit = await one(
    `SELECT ${names.map((name) => `\`${name}\``).join(", ")} FROM appointments WHERE id = ? LIMIT 1`,
    [appointmentId],
  );
  if (!visit || Number(visit.doctor_id) !== Number(doctorId)) {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
  if (contradictsAccount(visit, Number(visit.patient_id))) {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
  const profiles = await q("SELECT id, user_id FROM patients WHERE user_id = ?", [visit.patient_id]);
  if (profiles.length !== 1) return { ok: false, status: 422, message: "Choose the patient this record is for." };
  return { ok: true, patientId: Number(profiles[0].id) };
}

async function instantProfile(instantId, doctorId) {
  let instantTable = null;
  if (await tableExists("instant_consultation_requests")) instantTable = "instant_consultation_requests";
  else if (await tableExists("instant_consultations")) instantTable = "instant_consultations";
  if (!instantTable) return { ok: false, status: 403, message: "You do not have access to this record." };
  const names = ["id", "doctor_id", "patient_id"];
  if (await hasColumn(instantTable, "user_id")) names.push("user_id");
  const visit = await one(
    `SELECT ${names.map((name) => `\`${name}\``).join(", ")} FROM \`${instantTable}\` WHERE id = ? LIMIT 1`,
    [instantId],
  );
  if (!visit || Number(visit.doctor_id) !== Number(doctorId)) {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
  const pointed = Number(visit.patient_id) || null;
  const account = Number(visit.user_id) || null;
  if (pointed) {
    const profile = await profileById(pointed);
    if (!profile?.id) return { ok: false, status: 403, message: "You do not have access to this record." };
    if (account && Number(profile.user_id) !== account) {
      return { ok: false, status: 403, message: "You do not have access to this record." };
    }
    return { ok: true, patientId: Number(profile.id) };
  }
  if (!account) return { ok: false, status: 403, message: "You do not have access to this record." };
  const profiles = await q("SELECT id, user_id FROM patients WHERE user_id = ?", [account]);
  if (profiles.length !== 1) return { ok: false, status: 403, message: "You do not have access to this record." };
  return { ok: true, patientId: Number(profiles[0].id) };
}

async function patientFromClinicalVisit(body, doctorId, user) {
  const appointmentId = Number(body?.appointment_id) || null;
  const instantId = Number(body?.instant_consultation_id) || null;
  const rawPatient = Number(body?.patient_id) || null;
  if (!appointmentId && !instantId && !rawPatient) {
    return { ok: false, status: 422, message: "Choose the patient this record is for." };
  }
  const fromAppointment = appointmentId ? await appointmentProfile(appointmentId, doctorId) : null;
  if (fromAppointment && !fromAppointment.ok) return fromAppointment;
  const fromInstant = instantId ? await instantProfile(instantId, doctorId) : null;
  if (fromInstant && !fromInstant.ok) return fromInstant;
  if (fromAppointment && fromInstant && fromAppointment.patientId !== fromInstant.patientId) {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
  const visitProfile = fromAppointment?.patientId || fromInstant?.patientId || null;
  if (rawPatient) {
    const named = await unambiguousProfile(rawPatient);
    if (!named.ok) return named;
    if (visitProfile && named.profileId !== visitProfile) {
      return { ok: false, status: 403, message: "You do not have access to this record." };
    }
    if (!(await doctorHasCareLink(user, named.patient))) {
      return { ok: false, status: 403, message: "You do not have access to this record." };
    }
    return { ok: true, patientId: named.profileId };
  }
  if (!visitProfile) return { ok: false, status: 422, message: "Choose the patient this record is for." };
  const patient = await profileById(visitProfile);
  if (!patient?.id || !(await doctorHasCareLink(user, patient))) {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }
  return { ok: true, patientId: visitProfile };
}

/** Fields no caller may set on a visit with a plain record update. */
export function visitBodyGuard(scope, table, body) {
  if (!VISIT_TABLES.has(table) || !["patient", "doctor"].includes(scope)) return body;
  const safe = { ...body };
  for (const key of ["id", "status", "payment_status", "consultation_fee", "patient_pays", "amount", "doctor_id", "patient_id", "user_id"]) {
    delete safe[key];
  }
  return safe;
}

/**
 * Looks up the slot the patient is trying to book. Slots only exist for doctors
 * who publish availability, so a missing slot is not a reason to refuse a booking;
 * a slot that exists and is already taken is.
 */
export async function bookableSlot(doctorId, date, time) {
  if (!(await tableExists("appointment_slots"))) return { found: false };
  const day = String(date || "").slice(0, 10);
  const start = clockTime(time);
  if (!day || !start) return { found: false };
  const rows = await q(
    "SELECT * FROM appointment_slots WHERE doctor_id = ? AND DATE(slot_date) = ? ORDER BY start_time",
    [doctorId, day],
  ).catch(() => []);
  const slot = rows.find((row) => clockTime(row.start_time) === start);
  if (!slot) return { found: false };
  const status = String(slot.status || "").toLowerCase();
  const active = slot.is_active == null || slot.is_active === true || Number(slot.is_active) === 1;
  const open = !status || !SLOT_TAKEN.includes(status);
  return { found: true, slot, bookable: open && active };
}

/** An appointment already open in the same doctor/date/time is a double booking. */
export async function appointmentCollision(doctorId, date, time, exceptId = null) {
  const day = String(date || "").slice(0, 10);
  const start = clockTime(time);
  if (!day || !start) return null;
  const rows = await q(
    `SELECT id, status, appointment_time FROM appointments
     WHERE doctor_id = ? AND DATE(appointment_date) = ?
       AND status NOT IN ('cancelled','canceled','expired','declined','rejected','no_show')`,
    [doctorId, day],
  ).catch(() => []);
  return rows.find(
    (row) => clockTime(row.appointment_time) === start && Number(row.id) !== Number(exceptId || 0),
  ) || null;
}

/**
 * Marks a slot taken only if it is still open, so two patients racing for the
 * same minute cannot both get in.
 * Returns true (taken by us), false (somebody else won) or null (the slot table
 * refused the write, e.g. an enum without 'booked') — callers must not lose a
 * paid booking over a slot bookkeeping failure, so null means "carry on".
 */
export async function claimSlot(slotId, appointmentId) {
  if (!slotId || !(await tableExists("appointment_slots"))) return null;
  const link = await hasColumn("appointment_slots", "appointment_id");
  const sets = ["status = 'booked'"];
  const values = [];
  if (link) {
    sets.push("appointment_id = ?");
    values.push(appointmentId);
  }
  let result = null;
  try {
    [result] = await pool.query(
      `UPDATE appointment_slots SET ${sets.join(", ")}
       WHERE id = ? AND (status IS NULL OR status NOT IN (${SLOT_TAKEN.map(() => "?").join(",")}))`,
      [...values, slotId, ...SLOT_TAKEN],
    );
  } catch {
    return null;
  }
  if (Number(result?.affectedRows || 0) > 0) return true;
  if (!link) return false;
  // This appointment already holds the slot (re-confirm, reschedule back onto it).
  return Boolean(await one(
    "SELECT id FROM appointment_slots WHERE id = ? AND appointment_id = ?",
    [slotId, appointmentId],
  ).catch(() => null));
}

/** Puts a slot back on the shelf when its appointment is cancelled, expired or moved. */
export async function releaseSlot(appointment) {
  if (!appointment?.id || !(await tableExists("appointment_slots"))) return;
  const link = await hasColumn("appointment_slots", "appointment_id");
  const date = String(appointment.appointment_date || "").slice(0, 10);
  const start = clockTime(appointment.appointment_time);
  const matches = [];
  const params = [];
  if (link) {
    matches.push("appointment_id = ?");
    params.push(appointment.id);
  }
  if (date && start && appointment.doctor_id) {
    matches.push("(doctor_id = ? AND DATE(slot_date) = ? AND TIME(start_time) = ?)");
    params.push(appointment.doctor_id, date, `${start}:00`);
  }
  if (!matches.length) return;
  const clear = link ? "appointment_id = NULL, " : "";
  await pool.query(
    `UPDATE appointment_slots SET ${clear}status = 'available'
     WHERE (${matches.join(" OR ")}) AND status IN ('booked','reserved','held')`,
    params,
  ).catch(() => null);
}
