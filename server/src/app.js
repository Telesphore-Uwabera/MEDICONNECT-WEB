import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { runningCommit } from "./runtime-commit.js";
import multer from "multer";
import { listHospitalPrescriptions, registerActions } from "./actions.js";
import {
  assertScheduleAllowed,
  doctorIsApproved,
  remindExpiringLicenses,
  reviewDoctor,
  saveUploadedFile,
  setLicenseExpiry,
  submitProfileForReview,
} from "./doctor-review.js";
import { callToken } from "./call-token.js";
import { notifyDoctorReady, notifyVisitCompleted } from "./visit-notify.js";
import { disableInstantForDoctor, disableInstantOnLogout } from "./doctor-schedule.js";
import { attachAppointmentRoutes, decorateAppointments } from "./appointments.js";
import { nameVisitRows } from "./visit-rows.js";
import { registerCareOrderRoutes } from "./care-orders.js";
import { registerCareReferralRoutes } from "./care-referrals.js";
import { registerClinicalEpisodeRoutes } from "./clinical-episodes.js";
import { afterResourceSaved, registerCareSpecRoutes } from "./care-spec.js";
import { registerPatientRecordRoutes } from "./patient-record.js";
import { registerTelemedicineConsentRoutes } from "./telemedicine-consent.js";
import { registerClinicalDocumentRoutes } from "./clinical-documents.js";
import { isDedicatedResource, registerDedicatedResourceRoutes } from "./dedicated-ids.js";
import { registerPrivateDocumentRoutes } from "./private-documents.js";
import { presentWithoutCallSecrets } from "./public-profile.js";
import { publicPagePath } from "./public-url.js";
import { selectedBrowseSpecialities } from "./browse-specialities.js";
import {
  appointmentCollision,
  joinBlockMessage,
  appointmentStartIsInPast,
  bookableSlot,
  claimSlot,
  mayWriteRow,
  patientOwnsAppointment,
  resolveCreateBody,
  patientOwnsInstant,
  releaseSlot,
  profileFormBody,
  scopeRoleAllowed,
  stripClientOwners,
  visitAwaitsPayment,
  visitBodyGuard,
  visitIsClosed,
  visitJoinBlock,
  insuranceCatalogWhere,
  isPublicCatalog,
  mayReadRow,
  patientOwnedWhere,
  personalPatientWhere,
  visitReadWhere,
} from "./visit-rules.js";
import { attachChatRoutes } from "./chat.js";
import { verifierNames } from "./verification.js";
import { withTeamPhoto, expireUnpaidPayments } from "./public.js";
import { ageSeconds, canJoinInstant, countsInInstantQueue, isPaidStatus, paidMarkerSql, placeInQueue, UNPAID_INSTANT_JOIN_MESSAGE } from "./instant-visit.js";
import { average, chartWithSpend, displayedPaymentStatus, durationMinutes, earnedAverage, historyMeta, historyPageArgs, kigaliDaySql, kigaliPeriodSql, kigaliPreviousSql, kigaliTodaySql } from "./dashboard-stats.js";
import { freshInstantSql, likeContains } from "./search-text.js";
import { registerPatientInstantList } from "./instant-list.js";
import { plausibleDateOfBirth } from "./input-checks.js";
import { validateIncomingPhone } from "./phone.js";
import { clientMayClaimEmail, isServerGuestAccount } from "./guest-account.js";
import { checkGuestLogin, createGuestPassword, guestAccessLine, markGuestPasswordUsed } from "./guest-password.js";
import { checkSocialLink } from "./social-links.js";
import {
  countWhere,
  forgetColumns,
  hasColumn,
  insert,
  knownWrite,
  paginateList,
  one,
  pageArgs,
  pool,
  presentRow,
  presentRows,
  q,
  tableExists,
  update,
} from "./db.js";
// ensureDoctorSearchFields is not present in all db.js versions — define a safe no-op
const ensureDoctorSearchFields = async () => {};
import {
  ensurePatientRow,
  ensureRole,
  findUserByLogin,
  hashPassword,
  issueToken,
  loadOwnedId,
  requireAuth,
  requireRole,
  setActiveRole,
  stampPatientProfileCompletion,
  toUser,
  verifyPassword,
} from "./auth.js";
import { sendMail, buildOtpEmail, buildWelcomeEmail, buildEmailHtml, emailP, emailBtn } from "./mail.js";
import { languageFromUserRow, normalizeLang, pick } from "./user-text.js";

const PROFILE_TABLE = {
  patient: "patients",
  doctor: "doctors",
  hospital: "hospitals",
  pharmacy: "pharmacies",
};

async function ensureEnumValue(table, column, value) {
  const { tableExists, hasColumn, one, pool } = await import("./db.js");
  if (!(await tableExists(table)) || !(await hasColumn(table, column))) return false;
  const meta = await one(
    `SELECT COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  ).catch(() => null);
  if (!meta) return false;
  const type = String(meta.column_type || "");
  if (!/^enum\(/i.test(type)) return true;
  if (type.toLowerCase().includes(`'${String(value).toLowerCase()}'`)) return true;
  const widened = type.replace(/\)\s*$/, `,'${value}')`);
  let sql = `ALTER TABLE \`${table}\` MODIFY \`${column}\` ${widened}`;
  sql += String(meta.is_nullable).toUpperCase() === "NO" ? " NOT NULL" : " NULL";
  if (meta.column_default != null && String(meta.column_default).toUpperCase() !== "NULL") {
    sql += ` DEFAULT '${String(meta.column_default).replace(/'/g, "''")}'`;
  }
  await pool.query(sql);
  return true;
}

function slugify(value) {
  const base = String(value || "user").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "user";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

async function saveDoctorBrowseSpecialities(doctorId, body) {
  const chosen = selectedBrowseSpecialities(body);
  if (!doctorId || !chosen.length) return;
  const labels = chosen.map((item) => item.label);
  const patch = { specialization: labels.join(", ") };
  const fee = chosen.find((item) => item.feeId);
  if (fee && await hasColumn("doctors", "specialization_fee_id")) patch.specialization_fee_id = fee.feeId;
  if (await hasColumn("doctors", "sub_specialization")) {
    patch.sub_specialization = labels.join(", ");
  }
  if (await hasColumn("doctors", "sub_specializations")) {
    patch.sub_specializations = chosen.map((item) => ({ name: item.label }));
  }
  await update("doctors", doctorId, patch);
  if (!(await tableExists("doctor_specialization_fees"))) return;
  await pool.query("DELETE FROM doctor_specialization_fees WHERE doctor_id = ?", [doctorId]).catch(() => {});
  for (const item of chosen) {
    if (!item.feeId) continue;
    const row = { doctor_id: doctorId, specialization_fee_id: item.feeId };
    if (await hasColumn("doctor_specialization_fees", "is_active")) row.is_active = 1;
    await insert("doctor_specialization_fees", row).catch(() => {});
  }
}

async function createProfile(user, role, body = {}) {
  const table = PROFILE_TABLE[role];
  if (!table || !(await tableExists(table))) return;
  if (await loadOwnedId(user.id, table)) return;
  const payload = {
    user_id: user.id,
    name: user.name,
    name_en: user.name,
    email: user.email,
    phone: user.phone,
    slug: slugify(user.name || user.email),
    status: role === "patient" ? "active" : "pending",
  };
  try {
    const known = await knownWrite(table, payload);
    if (!known.payload.user_id) return;
    await insert(table, known.payload);
  } catch (error) {
    console.error(`Could not create ${role} profile`, error.message);
    return;
  }
  if (role === "doctor") {
    const doctorId = await loadOwnedId(user.id, "doctors");
    await saveDoctorBrowseSpecialities(doctorId, body);
  }
}

const PERSONAL_READ_TABLES = new Set(["reviews", "refunds", "payments"]);

async function ownedFilter(req, table, scope) {
  const visitWhere = await visitReadWhere(scope, table, req.user);
  if (visitWhere) return visitWhere;
  if (scope === "admin" || scope === "notifications") return { sql: "1=1", params: [] };
  if (table === "insurances") return insuranceCatalogWhere();
  if (isPublicCatalog(table)) return { sql: "1=1", params: [] };
  if (scope === "patient" && PERSONAL_READ_TABLES.has(table) && (await hasColumn(table, "patient_id"))) {
    return personalPatientWhere(table, req.user);
  }
  const profile = PROFILE_TABLE[scope];
  const ownerId = profile ? await loadOwnedId(req.user.id, profile) : null;
  if (table === "referrals") {
    const clauses = [];
    const params = [];
    const add = async (column, value) => {
      if (value != null && (await hasColumn(table, column))) {
        clauses.push(`\`${column}\` = ?`);
        params.push(value);
      }
    };
    if (scope === "doctor") {
      await add("doctor_id", ownerId);
      await add("referring_doctor_id", ownerId);
      await add("referred_to_doctor_id", ownerId);
      if (clauses.length) return { sql: `(${clauses.join(" OR ")})`, params };
    }
    if (scope === "patient") {
      await add("patient_id", ownerId);
      await add("patient_id", req.user.id);
      if (clauses.length) return { sql: `(${clauses.join(" OR ")})`, params };
    }
    if (scope === "hospital") {
      await add("hospital_id", ownerId);
      await add("referred_hospital_id", ownerId);
      if (clauses.length) return { sql: `(${clauses.join(" OR ")})`, params };
    }
    if (scope === "pharmacy") {
      await add("pharmacy_id", ownerId);
      await add("referred_pharmacy_id", ownerId);
      if (clauses.length) return { sql: `(${clauses.join(" OR ")})`, params };
    }
  }
  if (await hasColumn(table, `${scope}_id`)) {
    return { sql: `\`${scope}_id\` = ?`, params: [ownerId ?? 0] };
  }
  if (await hasColumn(table, "user_id")) return { sql: "`user_id` = ?", params: [req.user.id] };
  return { sql: "0", params: [] };
}

async function listTable(req, table, scope) {
  const { page, perPage, offset } = pageArgs(req);
  const owned = await ownedFilter(req, table, scope);
  const filters = [owned.sql];
  const params = [...owned.params];
  if (req.query.status && (await hasColumn(table, "status"))) {
    filters.push("`status` = ?");
    params.push(req.query.status);
  }
  const term = req.query.search || req.query.q;
  if (term) {
    const searchable = ["name", "name_en", "title", "email", "phone", "slug", "status"].filter(asyncName => true);
    const cols = [];
    for (const name of searchable) if (await hasColumn(table, name)) cols.push(name);
    const likeParts = [];
    if (cols.length) {
      likeParts.push(`(${cols.map((name) => `\`${name}\` LIKE ? ESCAPE '\\\\'`).join(" OR ")})`);
      cols.forEach(() => params.push(likeContains(term)));
    }
    if (["appointments", "instant_consultation_requests", "instant_consultations"].includes(table)) {
      const like = likeContains(term);
      likeParts.push(`EXISTS (SELECT 1 FROM users pu WHERE pu.id = \`${table}\`.patient_id AND pu.name LIKE ? ESCAPE '\\\\')`);
      likeParts.push(`EXISTS (SELECT 1 FROM doctors dd JOIN users du ON du.id = dd.user_id WHERE dd.id = \`${table}\`.doctor_id AND du.name LIKE ? ESCAPE '\\\\')`);
      params.push(like, like);
    }
    if (likeParts.length) filters.push(`(${likeParts.join(" OR ")})`);
  }
  const where = `WHERE ${filters.join(" AND ")}`;
  const total = await countWhere(table, where, params);
  let data = await presentRows(table, await q(`SELECT * FROM \`${table}\` ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]));
  if (table === "appointments") data = await decorateAppointments(data);
  data = await nameVisitRows(table, data);
  if (["doctors", "hospitals", "pharmacies", "patients", "users"].includes(table)) {
    data = await verifierNames(data);
  }
  if (table === "team_members") data = data.map(withTeamPhoto);
  const path = publicPagePath(req);
  return presentWithoutCallSecrets(scope, table, paginateList({ data, total, page, perPage, path }), req.user);
}

async function doctorOnlineFee(doctorId) {
  const doctor = await one(
    "SELECT consultation_fee, specialization_fee_id, specialization FROM doctors WHERE id = ?",
    [doctorId],
  ).catch(() => null);
  let amount = Number(doctor?.consultation_fee || 0);
  if (!amount && await tableExists("specialization_fees")) {
    const fee = doctor?.specialization_fee_id
      ? await one("SELECT online_fee FROM specialization_fees WHERE id = ?", [doctor.specialization_fee_id]).catch(() => null)
      : await one(
        "SELECT online_fee FROM specialization_fees WHERE sub_specialization = ? ORDER BY id ASC LIMIT 1",
        [doctor?.specialization || ""],
      ).catch(() => null);
    amount = Number(fee?.online_fee || 0);
  }
  return amount;
}

async function retireUser(id) {
  const user = await one("SELECT id FROM users WHERE id = ?", [id]).catch(() => null);
  if (!user) return null;
  const patch = {};
  if (await hasColumn("users", "status")) patch.status = "suspended";
  if (await hasColumn("users", "is_active")) patch.is_active = 0;
  if (await hasColumn("users", "deleted_at")) patch.deleted_at = new Date();
  if (!Object.keys(patch).length) {
    const error = new Error("This account cannot be removed without deleting payment records.");
    error.status = 409;
    throw error;
  }
  await update("users", id, patch);
  for (const table of ["doctors", "patients", "hospitals", "pharmacies"]) {
    if (!(await tableExists(table)) || !(await hasColumn(table, "user_id")) || !(await hasColumn(table, "status"))) continue;
    await pool.query(`UPDATE \`${table}\` SET status = 'suspended' WHERE user_id = ?`, [id]).catch(() => null);
  }
  return patch;
}

function emptyDashboard(filters) {
  const zero = { total: 0, completed: 0, pending: 0, confirmed: 0, cancelled: 0, instant_active: 0 };
  return {
    filters_applied: {
      period: filters.period || "month",
      from: filters.start_date || null,
      to: filters.end_date || null,
      appointment_type: filters.appointment_type || "all",
      status: filters.status || "all",
      search: filters.search || null,
      chart_group: filters.chart_group || "day",
    },
    today: zero,
    period_stats: {
      unique_doctors: 0, unique_hospitals: 0, total_appointments: 0, completed: 0, cancelled: 0,
      pending: 0, online_count: 0, in_person_count: 0, avg_duration_minutes: 0, instant_total: 0,
      instant_completed: 0, prescriptions_received: 0, service_bookings_total: 0, pharmacy_orders_total: 0, certificates_issued: 0,
    },
    spending: {
      total: 0, previous_period_total: 0, change_percent: null, total_insurance_saved: 0,
      breakdown: { appointments: { total: 0, online: 0, in_person: 0, count: 0, avg_per_appointment: 0 }, service_bookings: { total: 0, booking_count: 0 } },
    },
    activity_chart: [],
    instant: { total: 0, completed: 0, declined: 0, pending: 0, active_now: 0, avg_duration_min: 0 },
    prescriptions: { total: 0, issued: 0, draft: 0, signed: 0, active: 0, expiring_soon: 0, recent: [] },
    certificates: { total: 0, issued: 0, pending: 0, rejected: 0, signed: 0, had_red_flags: 0, required_inperson: 0, expiring_soon: 0 },
    service_bookings: { total: 0, completed: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0, recent: [] },
    reviews: { total: 0, avg_rating: null, approved: 0, pending: 0, rejected: 0, five_star: 0, four_star: 0, three_star: 0, low_star: 0, pending_review: 0, recent: [] },
    medical_profile: { complete: false, allergies_count: 0, conditions_count: 0, medications_count: 0, surgeries_count: 0, smoking_status: null },
  };
}

async function countStatus(table, column, id) {
  if (!id || !(await tableExists(table))) return [];
  return q(`SELECT status, COUNT(*) AS total FROM \`${table}\` WHERE \`${column}\` = ? GROUP BY status`, [id]).catch(() => []);
}

const RESOURCES = {
  appointments: "appointments",
  prescriptions: "prescriptions",
  reviews: "reviews",
  refunds: "refunds",
  notifications: "notifications",
  certificates: "fitness_certificates",
  "service-bookings": "service_bookings",
  "pharmacy-orders": "pharmacy_orders",
  referrals: "referrals",
  "consultation-summaries": "consultation_summaries",
  insurances: "insurances",
  "working-hours": "hospital_working_hours",
  departments: "hospital_departments",
  services: "services",
  medicines: "pharmacy_medicines",
  categories: "pharmacy_medicine_categories",
  "stock-requests": "pharmacy_stock_requests",
  orders: "pharmacy_orders",
  users: "users",
  doctors: "doctors",
  patients: "patients",
  hospitals: "hospitals",
  pharmacies: "pharmacies",
  team: "team_members",
  settings: "system_settings",
  "help-center-links": "help_center_links",
  "legal-documents": "legal_documents",
  "checklist-questions": "fitness_checklist_questions",
  "service-pricing": "service_pricing",
  "multi-notifications": "notification_batches",
  staff: "users",
  wallet: "doctor_wallets",
  "specialization-fees": "specialization_fees",
  specializations: "specializations",
  "doctor-consultations": "doctors",
  "prescription-requests": "prescriptions",
  profile: null,
};

async function resolveResourceTable(scope, resource) {
  const scoped = {
    "pharmacy:working-hours": ["pharmacy_working_hours", "working_hours"],
    "hospital:working-hours": ["hospital_working_hours"],
    "pharmacy:closures": ["pharmacy_closures", "closures"],
    "hospital:closures": ["hospital_closures", "closures"],
    "pharmacy:prescription-requests": ["pharmacy_prescription_requests", "prescription_requests", "prescriptions"],
    "doctor:instant-consultations": ["instant_consultation_requests", "instant_consultations"],
    "patient:instant-consultations": ["instant_consultation_requests", "instant_consultations"],
  }[`${scope}:${resource}`];
  const candidates = [];
  if (isDedicatedResource(resource)) return null;
  if (scoped) candidates.push(...scoped);
  else if (RESOURCES[resource]) candidates.push(RESOURCES[resource]);
  else if (resource && resource !== "profile") candidates.push(String(resource).replace(/-/g, "_"));
  for (const name of candidates) {
    if (name && await tableExists(name)) return name;
  }
  return null;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function minutesOf(value) {
  const [hour, minute] = String(value || "").split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function clock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function eachDate(from, to) {
  const dates = [];
  const cursor = new Date(`${String(from).slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${String(to).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return dates;
  while (cursor <= end && dates.length < 92) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function generatePeriodSlots(doctorId, period) {
  const duration = Math.max(5, Number(period.slot_duration_minutes) || 30);
  const step = duration + Math.max(0, Number(period.buffer_minutes) || 0);
  const start = minutesOf(period.start_time);
  const end = minutesOf(period.end_time);
  if (start == null || end == null || end <= start) return 0;
  const days = new Set((Array.isArray(period.days_of_week) ? period.days_of_week : []).map((day) => String(day).toLowerCase()));
  let created = 0;
  for (const date of eachDate(period.from_date, period.to_date)) {
    if (days.size && !days.has(WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()])) continue;
    for (let minute = start; minute + duration <= end; minute += step) {
      const added = await upsertAvailableSlot(doctorId, {
        date,
        startTime: clock(minute),
        duration,
        type: period.type || "online",
        hospitalId: period.hospital_id ?? null,
        periodId: period.id,
      });
      if (added) created += 1;
    }
  }
  return created;
}

async function upsertAvailableSlot(doctorId, { date, startTime, duration, type, hospitalId, periodId }) {
  const start = minutesOf(startTime);
  if (start == null || duration < 5) return null;
  const startClock = clock(start);
  const existing = await one(
    "SELECT id, status FROM appointment_slots WHERE doctor_id = ? AND slot_date = ? AND start_time = ? LIMIT 1",
    [doctorId, date, startClock],
  ).catch(() => null);
  if (existing) {
    const status = String(existing.status || "").toLowerCase();
    if (status === "booked") return null;
    await update("appointment_slots", existing.id, { status: "available" });
    return existing;
  }
  const id = await insert("appointment_slots", {
    doctor_id: doctorId,
    hospital_id: hospitalId ?? null,
    doctor_availability_period_id: periodId ?? null,
    availability_period_id: periodId ?? null,
    period_id: periodId ?? null,
    slot_date: date,
    start_time: startClock,
    end_time: clock(start + duration),
    duration_minutes: duration,
    type: type || "online",
    status: "available",
  });
  return { id };
}

const licenseUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const DOCTOR_PROFILE_PREFIXES = [
  "/doctor/profile",
  "/doctor/documents",
  "/doctor/education",
  "/doctor/experience",
  "/doctor/qualifications",
  "/doctor/social-links",
];
const DOCTOR_SCHEDULE_PREFIXES = ["/doctor/availability", "/doctor/slots"];

const PATIENT_PROFILE_WRITE_OK = [
  "/patient/profile",
  "/settings/profile",
  "/auth",
  "/patient/medical-info",
  "/patient/insurance",
  "/notifications",
  "/broadcasting/auth",
  "/public/instant-consultations",
  "/public/payments",
  "/public/consultations",
  "/patient/instant-consultations",
  "/patient/quick",
  "/patient/telemedicine-consent",
  "/chat",
];

export function appRoutes(router) {
  // A patient who created an account cannot book, join, or change anything else
  // until the profile form is complete. Guests in a call are not account holders.
  router.use(async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || user.profile_complete !== false) return next();
      if ((user.active_role || user.role) !== "patient") return next();
      if (isServerGuestAccount(user.email)) return next();
      if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
      const path = req.path || "";
      const allowed = PATIENT_PROFILE_WRITE_OK.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
      if (allowed) return next();
      return res.status(403).json({
        message: "Complete your profile before using the rest of your account.",
        profile_complete: false,
      });
    } catch (error) {
      next(error);
    }
  });
  registerPrivateDocumentRoutes(router, { requireAuth });
  attachAppointmentRoutes(router, { requireAuth, requireRole });
  attachChatRoutes(router, { requireAuth });
  registerCareOrderRoutes(router, { requireAuth, requireRole });
  registerCareReferralRoutes(router, { requireAuth, requireRole });
  registerClinicalEpisodeRoutes(router, { requireAuth, requireRole });
  registerCareSpecRoutes(router, { requireAuth, requireRole });
  registerPatientRecordRoutes(router, { requireAuth, requireRole });
  registerTelemedicineConsentRoutes(router, { requireAuth, requireRole });
  registerClinicalDocumentRoutes(router, { requireAuth, requireRole });
  // ── Admin doctor pricing & availability (dedicated routes) ─────────────────
  // The generic table routes cannot express these shapes, so they live here
  // ahead of the catch-all /:scope/:resource/:id handlers.
  const adminPricingRole = requireRole("admin", "moderator", "finance");

  async function feeRecord(doctorId) {
    const doctor = await one("SELECT * FROM doctors WHERE id = ? LIMIT 1", [doctorId]).catch(() => null);
    if (!doctor) return null;
    const feeId = doctor.specialization_fee_id;
    const fee = feeId && await tableExists("specialization_fees")
      ? await one("SELECT * FROM specialization_fees WHERE id = ? LIMIT 1", [feeId]).catch(() => null)
      : null;
    const hasInPerson = await hasColumn("doctors", "in_person_fee");
    const onlineOverride = Number(doctor.consultation_fee) > 0 ? Number(doctor.consultation_fee) : null;
    const inPersonOverride = hasInPerson && Number(doctor.in_person_fee) > 0 ? Number(doctor.in_person_fee) : null;
    const baseOnline = Number(fee?.online_fee ?? 0);
    const baseInPerson = Number(fee?.in_person_fee ?? 0);
    return {
      id: doctor.id,
      doctor_id: doctor.id,
      specialization_fee_id: feeId ?? null,
      specialization_id: fee?.specialization_id ?? null,
      specialization_fee: fee
        ? { id: fee.id, online_fee: baseOnline, in_person_fee: baseInPerson, sub_specialization: fee.sub_specialization }
        : null,
      online_fee_override: onlineOverride,
      in_person_fee_override: inPersonOverride,
      resolved_online_fee: onlineOverride ?? baseOnline,
      resolved_in_person_fee: inPersonOverride ?? baseInPerson,
      is_active: Number(doctor.is_active ?? 1) !== 0 && String(doctor.status || "active") !== "suspended",
    };
  }

  router.get("/admin/doctor-consultations/:doctorId", requireAuth, adminPricingRole, async (req, res, next) => {
    try {
      const record = await feeRecord(req.params.doctorId);
      if (!record) return res.status(404).json({ message: "Doctor not found." });
      res.json({ doctor_id: record.doctor_id, records: [record], consultation: record, data: record });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/doctor-consultations/:doctorId/fee-override", requireAuth, adminPricingRole, async (req, res, next) => {
    try {
      const doctorId = Number(req.params.doctorId);
      const doctor = await one("SELECT id FROM doctors WHERE id = ? LIMIT 1", [doctorId]).catch(() => null);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      const patch = {};
      const body = req.body || {};
      if (body.online_fee_override !== undefined && body.online_fee_override !== null) {
        const value = Number(body.online_fee_override);
        if (!Number.isFinite(value) || value < 0) return res.status(422).json({ message: "Enter a valid online fee." });
        patch.consultation_fee = value;
      } else if (body.online_fee_override === null) {
        patch.consultation_fee = 0; // fall back to the specialization fee tier
      }
      if (body.in_person_fee_override !== undefined && await hasColumn("doctors", "in_person_fee")) {
        const value = body.in_person_fee_override == null ? 0 : Number(body.in_person_fee_override);
        if (!Number.isFinite(value) || value < 0) return res.status(422).json({ message: "Enter a valid in-person fee." });
        patch.in_person_fee = value;
      }
      if (body.override_reason !== undefined && await hasColumn("doctors", "override_reason")) {
        patch.override_reason = body.override_reason;
      }
      if (Object.keys(patch).length) await update("doctors", doctorId, patch);
      const record = await feeRecord(doctorId);
      res.json({
        message: "Fee override saved.",
        record,
        consultation: record,
        resolved_online_fee: record.resolved_online_fee,
        resolved_in_person_fee: record.resolved_in_person_fee,
      });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/doctor-consultations/:doctorId", requireAuth, adminPricingRole, async (req, res, next) => {
    try {
      const doctorId = Number(req.params.doctorId);
      const doctor = await one("SELECT id FROM doctors WHERE id = ? LIMIT 1", [doctorId]).catch(() => null);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      const patch = {};
      if (req.body?.specialization_fee_id != null) {
        const fee = await one("SELECT id FROM specialization_fees WHERE id = ? LIMIT 1", [req.body.specialization_fee_id]).catch(() => null);
        if (!fee) return res.status(422).json({ message: "Choose an existing fee tier." });
        patch.specialization_fee_id = fee.id;
      }
      if (req.body?.is_active !== undefined && await hasColumn("doctors", "is_active")) {
        patch.is_active = req.body.is_active ? 1 : 0;
      }
      if (Object.keys(patch).length) await update("doctors", doctorId, patch);
      const record = await feeRecord(doctorId);
      res.json({ message: "Consultation fee tier saved.", record, consultation: record });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/instant-consultations", requireAuth, adminPricingRole, async (req, res, next) => {
    try {
      const doctorId = Number(req.body?.doctor_id);
      const doctor = await one("SELECT id FROM doctors WHERE id = ? LIMIT 1", [doctorId]).catch(() => null);
      if (!doctor) return res.status(422).json({ message: "Choose a doctor." });
      const active = req.body?.active === true || req.body?.active === 1 || req.body?.active === "1";
      if (await hasColumn("doctors", "instant_consultation")) {
        await update("doctors", doctorId, { instant_consultation: active ? 1 : 0 });
      }
      res.json({ message: active ? "Instant consultation enabled." : "Instant consultation disabled.", data: { doctor_id: doctorId, instant_consultation: active, active } });
    } catch (error) {
      next(error);
    }
  });

  for (const [action, column, flag] of [
    ["instant", "instant_consultation", "instant_consultation"],
    ["paused", "bookings_paused", "bookings_paused"],
  ]) {
    router.get(`/admin/doctors/:doctorId/${action}-status`, requireAuth, adminPricingRole, async (req, res, next) => {
      try {
        const doctor = await one("SELECT * FROM doctors WHERE id = ? LIMIT 1", [req.params.doctorId]).catch(() => null);
        if (!doctor) return res.status(404).json({ message: "Doctor not found." });
        const enabled = Boolean(Number(doctor[column] ?? 0));
        res.json({
          doctor_id: doctor.id,
          [flag]: enabled,
          status: enabled ? "active" : "inactive",
          data: { doctor_id: doctor.id, [flag]: enabled },
        });
      } catch (error) {
        next(error);
      }
    });
    router.post(`/admin/doctors/:doctorId/toggle-${action}`, requireAuth, adminPricingRole, async (req, res, next) => {
      try {
        const doctor = await one("SELECT id FROM doctors WHERE id = ? LIMIT 1", [req.params.doctorId]).catch(() => null);
        if (!doctor) return res.status(404).json({ message: "Doctor not found." });
        const current = Boolean(Number(doctor[column] ?? 0));
        const nextValue = req.body?.active === undefined
          ? !current
          : (req.body.active === true || req.body.active === 1 || req.body.active === "1");
        const targetColumn = column === "bookings_paused" && !(await hasColumn("doctors", "bookings_paused")) && await hasColumn("doctors", "pause_bookings")
          ? "pause_bookings"
          : column;
        await update("doctors", doctor.id, { [targetColumn]: nextValue ? 1 : 0 });
        res.json({ message: "Updated.", doctor_id: doctor.id, [flag]: nextValue });
      } catch (error) {
        next(error);
      }
    });
  }

  router.put("/admin/service-pricing/bulk", requireAuth, adminPricingRole, async (req, res, next) => {
    try {
      if (!(await tableExists("service_pricing"))) return res.status(422).json({ message: "Service pricing is not available." });
      const raw = req.body?.prices;
      const entries = Array.isArray(raw)
        ? raw.map((item) => [Number(item?.id), item?.service_key ?? item?.key, item])
        : Object.entries(raw ?? {}).map(([key, value]) => [0, key, { price: value, value }]);
      if (!entries.length) return res.status(422).json({ message: "No prices were supplied." });
      let saved = 0;
      for (const [id, serviceKey, item] of entries) {
        let row = id
          ? await one("SELECT id FROM service_pricing WHERE id = ? LIMIT 1", [id]).catch(() => null)
          : await one("SELECT id FROM service_pricing WHERE service_key = ? LIMIT 1", [String(serviceKey)]).catch(() => null);
        if (!row && serviceKey) {
          row = await one("SELECT id FROM service_pricing WHERE service_key = ? LIMIT 1", [String(serviceKey)]).catch(() => null);
        }
        if (!row) continue;
        const patch = {};
        if (item.price !== undefined || item.value !== undefined) {
          patch.price = Number(item.price ?? item.value);
        }
        for (const key of ["name", "name_en", "description", "is_paid", "currency", "is_active"]) {
          if (item[key] !== undefined && await hasColumn("service_pricing", key)) patch[key] = item[key];
        }
        if (Object.keys(patch).length) {
          await update("service_pricing", row.id, patch);
          saved += 1;
        }
      }
      res.json({ message: `${saved} price${saved === 1 ? "" : "s"} updated.`, updated: saved });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/service-pricing/:key", requireAuth, adminPricingRole, async (req, res, next) => {
    try {
      const key = String(req.params.key || "");
      if (!(await tableExists("service_pricing")) || !key) return res.status(404).json({ message: "Price key not found." });
      const row = await one("SELECT * FROM service_pricing WHERE service_key = ? LIMIT 1", [key]).catch(() => null);
      if (!row) return res.status(404).json({ message: "Price key not found." });
      const patch = {};
      if (req.body?.value !== undefined || req.body?.price !== undefined) {
        patch.price = Number(req.body.price ?? req.body.value);
      }
      for (const field of ["name", "description", "is_paid", "is_active", "currency"]) {
        if (req.body?.[field] !== undefined && await hasColumn("service_pricing", field)) patch[field] = req.body[field];
      }
      if (Object.keys(patch).length) await update("service_pricing", row.id, patch);
      const fresh = await one("SELECT * FROM service_pricing WHERE id = ?", [row.id]).catch(() => row);
      res.json({ message: "Price updated.", pricing: { key: fresh.service_key, value: Number(fresh.price ?? 0), currency: fresh.currency || "RWF", updated_at: fresh.updated_at } });
    } catch (error) {
      next(error);
    }
  });

  registerDedicatedResourceRoutes(router, { requireAuth, requireRole });
  router.use(async (req, res, next) => {
    try {
      if (!req.user || req.user.active_role !== "doctor" || !req.path.startsWith("/doctor")) return next();
      if (DOCTOR_PROFILE_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) return next();
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      if (!doctorId) return next();
      const doctor = await one("SELECT status, doctor_degree, medical_license, bio_en, bio_fr, bio_kiny FROM doctors WHERE id = ?", [doctorId]);
      if (doctorIsApproved(doctor?.status)) return next();
      const scheduling = DOCTOR_SCHEDULE_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
      if (scheduling) {
        if (req.method === "GET") return next();
        await assertScheduleAllowed(doctorId);
        return next();
      }
      return res.status(403).json({
        message: "An admin still needs to approve your profile before you can use this.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/login", async (req, res, next) => {
    try {
      const row = await findUserByLogin(req.body ?? {});
      const decision = row ? await checkGuestLogin(row, req.body?.password) : { ok: false, message: "Incorrect password." };
      if (!decision.ok) {
        return res.status(401).json({ message: decision.message || "Incorrect password." });
      }
      if (row.status === "suspended") return res.status(403).json({ message: "This account is suspended." });
      if (decision.markUsed) await markGuestPasswordUsed(row.id).catch(() => null);
      const user = await toUser(row);
      const token = await issueToken(row.id, user.active_role);
      res.json({ message: "Signed in.", token, user, must_change_password: Boolean(decision.mustChange) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/register", async (req, res, next) => {
    try {
      const body = req.body ?? {};
      if (!body.email || !body.password || !body.name) {
        return res.status(422).json({ message: "Name, email, and password are required.", errors: { email: ["Name, email, and password are required."] } });
      }
      if (!clientMayClaimEmail(body.email)) {
        return res.status(422).json({ message: "Choose a different email address.", errors: { email: ["Choose a different email address."] } });
      }
      if (body.password !== body.password_confirmation) {
        return res.status(422).json({ message: "Password confirmation does not match.", errors: { password: ["Password confirmation does not match."] } });
      }
      if (body.phone) {
        const checked = validateIncomingPhone(body.phone, body.country_code || "+250");
        if (!checked.ok) {
          return res.status(422).json({ message: checked.message, errors: { phone: [checked.message] } });
        }
        body.phone = checked.phone;
        body.country_code = checked.country_code;
      }
      const existing = await one("SELECT id FROM users WHERE email = ? LIMIT 1", [body.email]);
      if (existing) return res.status(422).json({ message: "Email is already registered.", errors: { email: ["Email is already registered."] } });
      const role = ["patient", "doctor", "hospital", "pharmacy"].includes(body.role) ? body.role : "patient";
      if (role === "doctor" && !selectedBrowseSpecialities(body).length) {
        return res.status(422).json({
          message: "Choose at least one speciality from the home page list.",
          errors: { specialities: ["Choose at least one speciality from the home page list."] },
        });
      }
      const id = await insert("users", {
        name: body.name,
        email: body.email,
        phone: body.phone,
        country_code: body.country_code,
        gender: body.gender,
        password: await hashPassword(body.password),
        status: "active",
        active_role: role,
      });
      await ensureRole(id, role);
      const created = await one("SELECT * FROM users WHERE id = ?", [id]);
      await createProfile(created, role, body);

      // Send welcome email (best-effort — never block the response)
      if (created?.email) {
        const html = buildWelcomeEmail({ name: created.name, role, lang: created.preferred_language });
        const isPatient = role === "patient";
        sendMail({
          to: created.email,
          subject: isPatient ? "Complete your MediConnect profile" : "Welcome to MediConnect!",
          text: isPatient
            ? `Hi ${created.name || "there"},\n\nYour MediConnect account has been created. Complete your profile at https://mediconnect.rw/patient/profile before you book or start a consultation.\n\nThe MediConnect Team`
            : `Hi ${created.name || "there"},\n\nYour MediConnect account has been created. Sign in at https://mediconnect.rw/auth to get started.\n\nThe MediConnect Team`,
          html,
        }).catch(() => null);
      }

      res.status(201).json({ message: "Account created.", user_id: id });
    } catch (error) {
      next(error);
    }
  });

  router.get("/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.post("/auth/logout", requireAuth, async (req, res, next) => {
    try {
      await disableInstantOnLogout(req.user.id);
      const tokenId = req.auth?.token?.id;
      if (tokenId) await pool.query("DELETE FROM personal_access_tokens WHERE id = ?", [tokenId]);
      res.json({ message: "Signed out." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/refresh-token", requireAuth, async (req, res, next) => {
    try {
      await pool.query("DELETE FROM personal_access_tokens WHERE id = ?", [req.auth.token.id]);
      const token = await issueToken(req.user.id, req.user.active_role);
      res.json({ message: "Token refreshed.", token });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/add-role", requireAuth, async (req, res, next) => {
    try {
      const role = req.body?.role;
      if (!PROFILE_TABLE[role]) return res.status(422).json({ message: "Choose a patient, doctor, hospital, or pharmacy role." });
      await ensureRole(req.user.id, role);
      const row = await one("SELECT * FROM users WHERE id = ?", [req.user.id]);
      await createProfile(row, role);
      const user = await toUser(row, req.user.active_role);
      res.json({ message: "Role added.", available_roles: user.available_roles });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/switch-role", requireAuth, async (req, res, next) => {
    try {
      const role = req.body?.role;
      const row = await one("SELECT * FROM users WHERE id = ?", [req.user.id]);
      const current = await toUser(row);
      const allowed = current.available_roles.includes(role) || (role === "admin" && current.can_be_admin);
      if (!allowed) return res.status(403).json({ message: "That role is not on this account." });
      await setActiveRole(req.user.id, role);
      await pool.query("DELETE FROM personal_access_tokens WHERE id = ?", [req.auth.token.id]);
      const token = await issueToken(req.user.id, role);
      const user = await toUser(row, role);
      res.json({ message: "Role switched.", token, active_role: role, user });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/forgot-password", async (req, res, next) => {
    try {
      await ensureEnumValue("otps", "type", "password_reset").catch(() => null);
      await ensureEnumValue("otps", "type", "verification").catch(() => null);
      const row = await findUserByLogin(req.body ?? {});
      // Always return the same message so we don't leak whether the account exists.
      if (!row) return res.json({ message: "If that account exists, a reset code has been sent." });

      const code = String(crypto.randomInt(100000, 1000000));
      await insert("otps", {
        email: row.email ?? req.body?.email ?? null,
        phone: row.phone ?? req.body?.phone ?? null,
        country_code: row.country_code ?? req.body?.country_code ?? null,
        code,
        type: "password_reset",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "),
      });

      // Send by email when available
      if (row.email) {
        const html = buildOtpEmail({ code, type: "password_reset", recipientName: row.name, lang: row.preferred_language });
        await sendMail({
          to: row.email,
          subject: "MediConnect — Password reset code",
          text: `Your MediConnect password reset code is: ${code}\n\nThis code expires in 10 minutes. If you did not request a reset, you can ignore this email.`,
          html,
        });
      }

      res.json({ message: "If that account exists, a reset code has been sent." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/reset-password", async (req, res, next) => {
    try {
      const row = await findUserByLogin(req.body ?? {});
      if (!row) return res.status(422).json({ message: "Account not found." });
      const emailCandidates = [...new Set([req.body?.email, row.email].map((v) => String(v || "").trim()).filter(Boolean))];
      const phoneCandidates = [...new Set([req.body?.phone, row.phone].map((v) => String(v || "").trim()).filter(Boolean))];
      const otpClauses = [];
      const otpParams = [String(req.body?.otp || "").trim()];
      if (emailCandidates.length) {
        otpClauses.push(`email IN (${emailCandidates.map(() => "?").join(", ")})`);
        otpParams.push(...emailCandidates);
      }
      if (phoneCandidates.length) {
        otpClauses.push(`phone IN (${phoneCandidates.map(() => "?").join(", ")})`);
        otpParams.push(...phoneCandidates);
      }
      const otp = otpClauses.length
        ? await one(
            `SELECT id, expires_at FROM otps WHERE code = ? AND (${otpClauses.join(" OR ")}) AND type = 'password_reset' ORDER BY id DESC LIMIT 1`,
            otpParams,
          )
        : null;
      if (!otp) return res.status(422).json({ message: "That code is not valid." });
      // Check expiry
      if (otp.expires_at && new Date(otp.expires_at).getTime() < Date.now()) {
        await pool.query("DELETE FROM otps WHERE id = ?", [otp.id]);
        return res.status(422).json({ message: "That code has expired. Please request a new one." });
      }
      if (String(req.body?.password || "").length < 8) {
        return res.status(422).json({ message: "Password must be at least 8 characters." });
      }
      if (req.body?.password !== req.body?.password_confirmation) {
        return res.status(422).json({ message: "Password confirmation does not match." });
      }
      await update("users", row.id, {
        password: await hashPassword(req.body.password),
        password_must_change: 0,
        temp_password_used_at: new Date(),
      });
      await pool.query("DELETE FROM otps WHERE id = ?", [otp.id]);
      await pool.query("DELETE FROM personal_access_tokens WHERE tokenable_id = ?", [row.id]).catch(() => null);

      // Send confirmation email
      if (row.email) {
        sendMail({
          to: row.email,
          subject: "MediConnect — Your password has been changed",
          text: `Hi ${row.name || "there"},\n\nYour MediConnect password was successfully changed.\n\nIf you did not make this change, contact us immediately at admin@mediconnect.rw.\n\nThe MediConnect Team`,
          html: buildEmailHtml({
            lang: row.preferred_language,
            title: "Password changed successfully",
            preheader: "Your MediConnect password has been updated.",
            accentHex: "#38a169",
            body: `
              ${emailP(row.name ? `Hello, ${row.name.split(" ")[0]}!` : "Hello!")}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;border-left:4px solid #38a169;">
                    <p style="margin:0;font-size:15px;font-weight:700;color:#166534;font-family:'Segoe UI',Arial,sans-serif;">✓ Your password has been updated</p>
                  </td>
                </tr>
              </table>
              ${emailP("Your MediConnect password was successfully changed. You can now sign in with your new password.")}
              ${emailBtn("Sign In", "https://mediconnect.rw/auth", "#38a169")}
              ${emailP("If you did not make this change, contact us immediately at admin@mediconnect.rw before someone gains access to your account.", "font-size:12px;color:#dc2626;")}
            `,
          }),
        }).catch(() => null);
      }

      res.json({ message: "Password updated successfully." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/send-otp", async (req, res, next) => {
    try {
      await ensureEnumValue("otps", "type", "password_reset").catch(() => null);
      await ensureEnumValue("otps", "type", "verification").catch(() => null);
      await ensureEnumValue("otps", "type", req.body?.type || "login").catch(() => null);
      const code = String(crypto.randomInt(100000, 1000000));
      await insert("otps", {
        email: req.body?.email,
        phone: req.body?.phone,
        country_code: req.body?.country_code,
        code,
        type: req.body?.type || "login",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "),
      });

      // Deliver the code by email when an address was provided.
      // The lookup uses the same SELECT for every address. A missing account and
      // an existing one both continue into sendMail and the same JSON response.
      if (req.body?.email) {
        const account = await findUserByLogin({ email: req.body.email });
        const lang = languageFromUserRow(account);
        const typeLabel = pick(lang, {
          en: req.body?.type === "password_reset" ? "password reset" : "verification",
          fr: req.body?.type === "password_reset" ? "réinitialisation" : "vérification",
          rw: req.body?.type === "password_reset" ? "guhindura ijambo ry'ibanga" : "kwemeza",
        });
        const html = buildOtpEmail({ code, type: req.body?.type || "verification", recipientName: account?.name || req.body?.name, lang });
        await sendMail({
          to: req.body.email,
          subject: pick(lang, {
            en: `MediConnect — Your ${typeLabel} code`,
            fr: `MediConnect — Votre code de ${typeLabel}`,
            rw: `MediConnect — Kode yawe yo ${typeLabel}`,
          }),
          text: pick(lang, {
            en: `Your MediConnect ${typeLabel} code is: ${code}\n\nThis code expires in 10 minutes.`,
            fr: `Votre code MediConnect de ${typeLabel} est : ${code}\n\nCe code expire dans 10 minutes.`,
            rw: `Kode yawe ya MediConnect yo ${typeLabel} ni : ${code}\n\nIyi kode irangira mu minota 10.`,
          }),
          html,
        });
      }

      res.json({ message: "Verification code sent." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/verify-otp", async (req, res, next) => {
    try {
      await ensureEnumValue("otps", "type", "verification").catch(() => null);
      const row = await one(
        "SELECT * FROM otps WHERE code = ? AND (email = ? OR phone = ?) ORDER BY id DESC LIMIT 1",
        [req.body?.code, req.body?.email ?? "", req.body?.phone ?? ""],
      );
      if (!row) return res.status(422).json({ message: "That code is not valid." });
      let user = await findUserByLogin(req.body ?? {});
      if (!user && req.body?.email && !clientMayClaimEmail(req.body.email)) {
        return res.status(422).json({ message: "Choose a different email address." });
      }
      if (!user && req.body?.email) {
        const id = await insert("users", {
          name: req.body.email,
          email: req.body.email,
          phone: req.body.phone,
          password: await hashPassword(crypto.randomBytes(12).toString("hex")),
          status: "active",
          active_role: "patient",
        });
        await ensureRole(id, "patient");
        user = await one("SELECT * FROM users WHERE id = ?", [id]);
      }
      if (!user) return res.status(422).json({ message: "Account not found." });
      const shaped = await toUser(user);
      const token = await issueToken(user.id, shaped.active_role);
      res.json({ message: "Code verified.", token, user: shaped });
    } catch (error) {
      next(error);
    }
  });

  router.post("/broadcasting/auth", async (req, res, next) => {
    try {
      if (!req.user) {
        const authHeader = String(req.headers?.authorization || "").trim();
        const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        let guestAuthorized = false;
        if (bearer) {
          const table = await instantTable();
          if (table) {
            const guestRow = await one(`SELECT id FROM \`${table}\` WHERE guest_token = ? LIMIT 1`, [bearer]).catch(() => null);
            if (guestRow) guestAuthorized = true;
          }
          if (!guestAuthorized && roomFromToken(bearer)) guestAuthorized = true;
        }
        if (!guestAuthorized) return res.status(401).json({ message: "Unauthenticated." });
      }
      const secret = String(process.env.REVERB_APP_SECRET || process.env.CALL_TOKEN_SECRET || "").trim();
      const key = String(process.env.REVERB_APP_KEY || "mediconnect-staging-key").trim();
      const host = String(process.env.REVERB_HOST || "api.mediconnect.rw").trim();
      if (!secret || !host) {
        return res.status(200).json({ auth: null, enabled: false });
      }
      const socketId = String(req.body?.socket_id || "");
      const channel = String(req.body?.channel_name || "");
      if (!socketId || !channel) {
        return res.status(422).json({ message: "socket_id and channel_name are required." });
      }
      const signature = crypto.createHmac("sha256", secret).update(`${socketId}:${channel}`).digest("hex");
      res.json({ auth: `${key}:${signature}` });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/guest", async (req, res, next) => {
    try {
      const email = `guest-${Date.now()}@mediconnect.local`;
      const userId = await insert("users", {
        name: "Guest",
        email,
        phone: `07${String(Date.now()).slice(-8)}`,
        password: await hashPassword(crypto.randomUUID()),
        status: "active",
        active_role: "patient",
        is_verified: 0,
      });
      await ensureRole(userId, "patient");
      const token = await issueToken(userId, "patient");
      res.status(201).json({
        message: "Guest session started.",
        guest_token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/guest/convert", async (req, res, next) => {
    try {
      const plain = String(req.body?.guest_token || "").split("|")[1];
      const row = plain
        ? await one("SELECT tokenable_id FROM personal_access_tokens WHERE token = ? LIMIT 1", [crypto.createHash("sha256").update(plain).digest("hex")])
        : null;
      if (!row) return res.status(422).json({ message: "Guest session was not found." });
      if (req.body?.email && !clientMayClaimEmail(req.body.email)) {
        return res.status(422).json({ message: "Choose a different email address." });
      }
      await update("users", row.tokenable_id, {
        name: req.body?.name,
        phone: req.body?.phone,
        email: req.body?.email,
        country_code: req.body?.country_code,
        active_role: req.body?.role || "patient",
      });
      if (req.body?.role) await ensureRole(row.tokenable_id, req.body.role);
      const issued = await createGuestPassword();
      const lang = normalizeLang(req.body?.preferred_language);
      await update("users", row.tokenable_id, {
        password: issued.password,
        preferred_language: lang,
        ...issued.extra,
      });
      let tempPassword = null;
      if (!issued.extra.password_must_change && req.body?.email && issued.plain) {
        tempPassword = issued.plain;
        const line = guestAccessLine(lang, req.body.email, issued.plain);
        await sendMail({
          to: req.body.email,
          subject: pick(lang, {
            en: "Your MediConnect temporary password",
            fr: "Votre mot de passe temporaire MediConnect",
            rw: "Ijambo ry'ibanga ry'igihe gito rya MediConnect",
          }),
          text: line,
        }).catch(() => null);
      }
      res.json({
        message: "Guest account saved.",
        user_id: Number(row.tokenable_id),
        temp_password: tempPassword,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/patient/dashboard", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const dashboard = emptyDashboard(req.query);
      const userId = req.user.id;
      const profileId = await loadOwnedId(userId, "patients");
      const tally = (rows) => {
        const byStatus = {};
        for (const row of rows || []) {
          const key = String(row.status || "").toLowerCase();
          byStatus[key] = (byStatus[key] || 0) + Number(row.total || 0);
        }
        const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
        return { byStatus, total };
      };
      const pick = (bag, names) => names.reduce((sum, name) => sum + (bag.byStatus[name] ?? 0), 0);
      const ownerWhere = async (table) => {
        if (!(await tableExists(table))) return null;
        const owned = await patientOwnedWhere(table, req.user);
        if (!owned?.sql || owned.sql === "0") return null;
        return owned;
      };
      const period = String(req.query.period || "all");
      const periodStart = req.query.start_date ? String(req.query.start_date).slice(0, 10) : "";
      const periodEnd = req.query.end_date ? String(req.query.end_date).slice(0, 10) : "";
      const dateExpr = "DATE(DATE_ADD(COALESCE(appointment_date, created_at), INTERVAL 2 HOUR))";
      const kigaliNow = kigaliTodaySql();
      const appointmentOwned = await patientOwnedWhere("appointments", req.user);
      const apptOwner = appointmentOwned.sql;
      const ownerParams = appointmentOwned.params;
      const periodFilter = period === "today" || period === "day"
        ? { sql: `AND ${dateExpr} = ${kigaliNow}`, params: [] }
        : period === "week"
          ? { sql: `AND ${dateExpr} >= DATE_SUB(${kigaliNow}, INTERVAL 6 DAY)`, params: [] }
          : period === "year"
            ? { sql: `AND ${dateExpr} >= DATE_SUB(${kigaliNow}, INTERVAL 364 DAY)`, params: [] }
            : period === "custom" && periodStart && periodEnd
              ? { sql: `AND ${dateExpr} BETWEEN ? AND ?`, params: [periodStart, periodEnd] }
              : period === "month"
                ? { sql: `AND ${dateExpr} >= DATE_SUB(${kigaliNow}, INTERVAL 29 DAY)`, params: [] }
                : { sql: "", params: [] };
      const groups = await q(`SELECT status, COUNT(*) AS total FROM appointments WHERE ${apptOwner} ${periodFilter.sql} GROUP BY status`, [...ownerParams, ...periodFilter.params]).catch(() => []);
      const { byStatus, total } = tally(groups);
      const todayGroups = await q(`SELECT status, COUNT(*) AS total FROM appointments WHERE ${apptOwner} AND ${dateExpr} = ${kigaliNow} GROUP BY status`, ownerParams).catch(() => []);
      const todayTally = tally(todayGroups);
      const upcoming = Number((await one(
        `SELECT COUNT(*) AS total FROM appointments
         WHERE ${apptOwner}
           AND LOWER(status) IN ('pending','confirmed','accepted','in_progress')
           AND NOT (LOWER(status) IN ('pending','queued','waiting') AND ${dateExpr} < ${kigaliNow})`,
        ownerParams,
      ).catch(() => ({ total: 0 })))?.total ?? 0);
      const instantTableName = (await tableExists("instant_consultation_requests"))
        ? "instant_consultation_requests"
        : (await tableExists("instant_consultations")) ? "instant_consultations" : null;
      let instantRows = [];
      if (instantTableName) {
        const instantOwned = await patientOwnedWhere(instantTableName, req.user);
        const instantDate = await firstColumn(instantTableName, ["created_at", "updated_at"]);
        const instantPeriod = instantDate
          ? periodFilter.sql.replaceAll(dateExpr, kigaliDaySql(instantDate))
          : "";
        instantRows = await q(
          `SELECT status, COUNT(*) AS total FROM \`${instantTableName}\` WHERE ${instantOwned.sql} ${instantPeriod} GROUP BY status`,
          [...instantOwned.params, ...(instantPeriod ? periodFilter.params : [])],
        ).catch(() => []);
      }
      const instant = tally(instantRows);
      const instantActive = pick(instant, ["accepted", "in_progress", "confirmed"]);
      dashboard.today = {
        total: todayTally.total + instantActive,
        completed: pick(todayTally, ["completed", "done", "complete"]),
        pending: pick(todayTally, ["pending", "queued", "waiting", "in_progress"]),
        confirmed: upcoming,
        upcoming,
        cancelled: pick(todayTally, ["cancelled", "canceled"]),
        instant_active: instantActive,
      };
      dashboard.period_stats.total_appointments = total;
      dashboard.period_stats.completed = pick({ byStatus, total }, ["completed", "done", "complete"]);
      dashboard.period_stats.cancelled = pick({ byStatus, total }, ["cancelled", "canceled"]);
      dashboard.period_stats.pending = pick({ byStatus, total }, ["pending", "queued", "waiting", "in_progress"]);
      dashboard.period_stats.online_count = await hasColumn("appointments", "type")
        ? Number((await one(`SELECT COUNT(*) AS total FROM appointments WHERE ${apptOwner} AND type = 'online' ${periodFilter.sql}`, [...ownerParams, ...periodFilter.params]).catch(() => ({ total: 0 })))?.total ?? 0)
        : 0;
      dashboard.period_stats.in_person_count = Math.max(0, total - dashboard.period_stats.online_count);
      dashboard.period_stats.instant_total = instant.total;
      dashboard.period_stats.instant_completed = instant.byStatus.completed ?? 0;
      dashboard.period_stats.unique_doctors = Number((await one(`SELECT COUNT(DISTINCT doctor_id) AS total FROM appointments WHERE ${apptOwner} ${periodFilter.sql}`, [...ownerParams, ...periodFilter.params]).catch(() => ({ total: 0 })))?.total ?? 0);
      if (await tableExists("service_bookings")) {
        const bookingOwned = await patientOwnedWhere("service_bookings", req.user);
        const bookingDate = await firstColumn("service_bookings", ["preferred_date", "created_at"]);
        const bookingPeriod = bookingDate ? periodFilter.sql.replaceAll(dateExpr, kigaliDaySql(bookingDate)) : "";
        const bookings = await q(`SELECT status, COUNT(*) AS total FROM service_bookings WHERE ${bookingOwned.sql} ${bookingPeriod} GROUP BY status`, [...bookingOwned.params, ...(bookingPeriod ? periodFilter.params : [])]).catch(() => []);
        const bookingTally = tally(bookings);
        dashboard.service_bookings.total = bookingTally.total;
        dashboard.service_bookings.completed = bookingTally.byStatus.completed ?? 0;
        dashboard.service_bookings.pending = bookingTally.byStatus.pending ?? 0;
        dashboard.service_bookings.accepted = bookingTally.byStatus.accepted ?? 0;
        dashboard.service_bookings.cancelled = bookingTally.byStatus.cancelled ?? 0;
        dashboard.period_stats.service_bookings_total = bookingTally.total;
        dashboard.period_stats.unique_hospitals = Number((await one(
          `SELECT COUNT(DISTINCT hospital_id) AS total FROM service_bookings WHERE ${bookingOwned.sql} AND hospital_id IS NOT NULL ${bookingPeriod}`,
          [...bookingOwned.params, ...(bookingPeriod ? periodFilter.params : [])],
        ).catch(() => ({ total: 0 })))?.total ?? 0);
      }
      if (await tableExists("pharmacy_orders")) {
        const orderOwned = await patientOwnedWhere("pharmacy_orders", req.user);
        const orderDate = await firstColumn("pharmacy_orders", ["created_at", "updated_at"]);
        const orderPeriod = orderDate ? periodFilter.sql.replaceAll(dateExpr, kigaliDaySql(orderDate)) : "";
        dashboard.period_stats.pharmacy_orders_total = Number((await one(
          `SELECT COUNT(*) AS total FROM pharmacy_orders WHERE ${orderOwned.sql} AND (status IS NULL OR status <> 'draft') ${orderPeriod}`,
          [...orderOwned.params, ...(orderPeriod ? periodFilter.params : [])],
        ).catch(() => ({ total: 0 })))?.total ?? 0);
      }
      if (await tableExists("reviews")) {
        const reviewOwned = await personalPatientWhere("reviews", req.user);
        const reviewRow = await one(
          `SELECT COUNT(*) AS total, AVG(rating) AS avg_rating FROM reviews WHERE ${reviewOwned.sql}`,
          reviewOwned.params,
        ).catch(() => null);
        dashboard.reviews.total = Number(reviewRow?.total ?? 0);
        dashboard.reviews.avg_rating = reviewRow?.avg_rating == null ? null : Math.round(Number(reviewRow.avg_rating) * 10) / 10;
      }
      dashboard.activity_chart = (await q(
          `SELECT ${dateExpr} AS label,
                  COUNT(*) AS appointments,
                  COUNT(DISTINCT doctor_id) AS doctors_seen,
                  SUM(CASE WHEN status IN ('completed','done') THEN 1 ELSE 0 END) AS completed,
                  SUM(CASE WHEN type = 'online' THEN 1 ELSE 0 END) AS online,
                  SUM(CASE WHEN type <> 'online' OR type IS NULL THEN 1 ELSE 0 END) AS in_person
           FROM appointments
           WHERE ${apptOwner} ${periodFilter.sql}
           GROUP BY ${dateExpr}
           ORDER BY label`,
          [...ownerParams, ...periodFilter.params],
        ).catch(() => [])).map((row) => ({
          label: String(row.label).slice(0, 10),
          doctors_seen: Number(row.doctors_seen ?? 0),
          appointments: Number(row.appointments ?? 0),
          completed: Number(row.completed ?? 0),
          online: Number(row.online ?? 0),
          in_person: Number(row.in_person ?? 0),
          spent: 0,
        }));
      if (await tableExists("payments") && await hasColumn("payments", "amount")) {
        const payOwned = await ownerWhere("payments");
        const payDate = await firstColumn("payments", ["paid_at", "created_at"]);
        if (payOwned && payDate) {
          const payExpr = kigaliDaySql(payDate);
          const payWindow = period === "today" || period === "day"
            ? { sql: `AND ${payExpr} = ${kigaliNow}`, params: [] }
            : period === "week"
              ? { sql: `AND ${payExpr} >= DATE_SUB(${kigaliNow}, INTERVAL 6 DAY)`, params: [] }
              : period === "year"
                ? { sql: `AND ${payExpr} >= DATE_SUB(${kigaliNow}, INTERVAL 364 DAY)`, params: [] }
                : period === "custom" && periodStart && periodEnd
                  ? { sql: `AND ${payExpr} BETWEEN ? AND ?`, params: [periodStart, periodEnd] }
                  : period === "month"
                    ? { sql: `AND ${payExpr} >= DATE_SUB(${kigaliNow}, INTERVAL 29 DAY)`, params: [] }
                    : { sql: "", params: [] };
          const paidRows = await q(
            `SELECT ${payExpr} AS label, COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE ${payOwned.sql} AND LOWER(status) IN ('paid','completed','success','successful') ${payWindow.sql}
             GROUP BY ${payExpr}`,
            [...payOwned.params, ...payWindow.params],
          ).catch(() => []);
          const spentByLabel = Object.fromEntries(paidRows.map((row) => [String(row.label).slice(0, 10), Number(row.total || 0)]));
          dashboard.activity_chart = chartWithSpend(dashboard.activity_chart, spentByLabel);
        }
      }
      dashboard.instant = {
        total: instant.total,
        completed: pick(instant, ["completed", "done"]),
        declined: pick(instant, ["declined", "cancelled", "canceled", "expired", "payment_expired", "rejected"]),
        pending: pick(instant, ["pending", "queued", "waiting", "payment_pending"]),
        active_now: instantActive,
        avg_duration_min: 0,
      };
      const rxOwned = await ownerWhere("prescriptions");
      if (rxOwned) {
        const unsigned = (await hasColumn("prescriptions", "signed_at"))
          ? "AND NOT (LOWER(COALESCE(status,'')) IN ('draft','pending') AND signed_at IS NULL)"
          : "AND LOWER(COALESCE(status,'')) <> 'draft'";
        const rxDate = await firstColumn("prescriptions", ["created_at", "issued_at", "updated_at"]);
        const rxPeriod = rxDate ? periodFilter.sql.replaceAll(dateExpr, kigaliDaySql(rxDate)) : "";
        const rxGroups = await q(`SELECT status, COUNT(*) AS total FROM prescriptions WHERE ${rxOwned.sql} ${unsigned} ${rxPeriod} GROUP BY status`, [...rxOwned.params, ...(rxPeriod ? periodFilter.params : [])]).catch(() => []);
        const rx = tally(rxGroups);
        dashboard.prescriptions.total = rx.total;
        dashboard.prescriptions.issued = pick(rx, ["issued", "signed", "sent_to_pharmacy", "active", "dispensed", "filled", "completed"]);
        dashboard.prescriptions.draft = pick(rx, ["draft", "pending"]);
        dashboard.prescriptions.signed = pick(rx, ["signed", "issued"]);
        dashboard.prescriptions.active = dashboard.prescriptions.issued || rx.total;
        dashboard.period_stats.prescriptions_received = rx.total;
      }
      if (await tableExists("payments") && await hasColumn("payments", "amount")) {
        const payOwned = await ownerWhere("payments");
        let spent = 0;
        let count = 0;
        if (payOwned) {
          const paid = await one(
            `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE ${payOwned.sql} AND LOWER(status) IN ('paid','completed','success','successful')`,
            payOwned.params,
          ).catch(() => ({ total: 0, count: 0 }));
          spent = Number(paid?.total ?? 0);
          count = Number(paid?.count ?? 0);
        }
        if (!(spent > 0) && await tableExists("appointments")) {
          const qualifiedOwner = apptOwner.replaceAll("`patient_id`", "a.`patient_id`").replaceAll("`user_id`", "a.`user_id`");
          const viaAppt = await one(
            `SELECT COALESCE(SUM(p.amount), 0) AS total, COUNT(*) AS count
             FROM payments p
             INNER JOIN appointments a ON a.id = COALESCE(p.appointment_id, CASE WHEN p.payable_type LIKE '%appointment%' THEN p.payable_id END)
             WHERE ${qualifiedOwner} AND LOWER(p.status) IN ('paid','completed','success','successful')`,
            ownerParams,
          ).catch(() => null);
          spent = Number(viaAppt?.total ?? 0);
          count = Number(viaAppt?.count ?? 0);
        }
        dashboard.spending.total = spent;
        dashboard.spending.breakdown.appointments.total = spent;
        dashboard.spending.breakdown.appointments.count = count;
        dashboard.spending.breakdown.appointments.avg_per_appointment = count > 0 ? Math.round(spent / count) : 0;
        if (payOwned && await hasColumn("payments", "payable_type")) {
          const groups = await q(
            `SELECT payable_type, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
             FROM payments WHERE ${payOwned.sql} AND LOWER(status) IN ('paid','completed','success','successful')
             GROUP BY payable_type`,
            payOwned.params,
          ).catch(() => []);
          const bucket = (name) => {
            const match = groups.filter((row) => String(row.payable_type || "").toLowerCase().includes(name));
            const total = match.reduce((sum, row) => sum + Number(row.total || 0), 0);
            const n = match.reduce((sum, row) => sum + Number(row.count || 0), 0);
            return { total, count: n };
          };
          const instantSpend = bucket("instant");
          const pharmacySpend = bucket("pharmacy");
          const serviceSpend = bucket("service");
          if (instantSpend.count || pharmacySpend.count || serviceSpend.count) {
            dashboard.spending.breakdown.instant = instantSpend;
            dashboard.spending.breakdown.pharmacy = pharmacySpend;
            dashboard.spending.breakdown.services = serviceSpend;
            const appointmentSpend = bucket("appointment");
            if (appointmentSpend.count) dashboard.spending.breakdown.appointments = {
              ...dashboard.spending.breakdown.appointments,
              ...appointmentSpend,
              avg_per_appointment: appointmentSpend.count > 0 ? Math.round(appointmentSpend.total / appointmentSpend.count) : 0,
            };
          }
        }
      }
      const certOwned = await ownerWhere("fitness_certificates");
      if (certOwned) {
        const certificates = await q(`SELECT status, COUNT(*) AS total FROM fitness_certificates WHERE ${certOwned.sql} GROUP BY status`, certOwned.params).catch(() => []);
        const certs = tally(certificates);
        dashboard.certificates.total = certs.total;
        dashboard.certificates.issued = pick(certs, ["issued", "approved", "signed", "completed"]);
        dashboard.certificates.pending = pick(certs, ["pending", "submitted", "review"]);
        dashboard.period_stats.certificates_issued = dashboard.certificates.issued;
      }
      const medicalTables = ["patient_medical_infos", "patient_medical_info", "medical_infos", "medical_records", "patient_medical_records"];
      let info = null;
      for (const table of medicalTables) {
        if (!(await tableExists(table))) continue;
        const col = await firstColumn(table, ["patient_id", "user_id"]);
        if (!col) continue;
        const ownerId = col === "user_id" ? userId : (profileId || userId);
        if (!ownerId) continue;
        info = await one(`SELECT * FROM \`${table}\` WHERE \`${col}\` = ? ORDER BY id DESC LIMIT 1`, [ownerId]).catch(() => null);
        if (info) break;
      }
      if (info) {
          const listCount = (value) => {
            if (Array.isArray(value)) return value.length;
            if (typeof value === "string" && value.trim()) {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed.length : 1;
              } catch {
                return 1;
              }
            }
            return 0;
          };
          dashboard.medical_profile = {
            complete: true,
            allergies_count: listCount(info.allergies ?? info.known_allergies),
            conditions_count: listCount(info.conditions ?? info.chronic_conditions),
            medications_count: listCount(info.medications ?? info.current_medications),
            surgeries_count: listCount(info.surgeries ?? info.surgical_history),
            smoking_status: info.smoking_status ?? null,
          };
      }
      res.json({ status: true, data: dashboard, ...dashboard });
    } catch (error) {
      next(error);
    }
  });

  async function ensurePatientDependentsTable() {
    if (await tableExists("patient_dependents")) return;
    await q(`CREATE TABLE patient_dependents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      patient_id INT NULL,
      full_name VARCHAR(191) NOT NULL,
      relationship VARCHAR(64) NOT NULL,
      date_of_birth DATE NULL,
      phone VARCHAR(32) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_patient_dependents_user (user_id)
    )`);
    forgetColumns("patient_dependents");
  }

  router.get("/patient/bills", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const { page, perPage } = pageArgs(req);
      if (!(await tableExists("payments"))) {
        return res.json(paginateList({ data: [], total: 0, page, perPage, path: "/api/v1/patient/bills" }));
      }
      const owned = await personalPatientWhere("payments", req.user);
      let rows = [];
      if (owned?.sql && owned.sql !== "0") {
        rows = await q(
          `SELECT * FROM payments WHERE ${owned.sql} ORDER BY id DESC`,
          owned.params,
        ).catch(() => []);
      }
      if (!rows.length && await hasColumn("payments", "appointment_id") && await tableExists("appointments")) {
        const appointmentOwned = await patientOwnedWhere("appointments", req.user);
        const qualified = appointmentOwned.sql.replaceAll("`patient_id`", "a.`patient_id`").replaceAll("`user_id`", "a.`user_id`");
        rows = await q(
          `SELECT p.* FROM payments p
           INNER JOIN appointments a ON a.id = p.appointment_id
           WHERE ${qualified}
           ORDER BY p.id DESC`,
          appointmentOwned.params,
        ).catch(() => []);
      }
      const presented = await presentRows("payments", rows);
      const start = (page - 1) * perPage;
      res.json(paginateList({
        data: presented.slice(start, start + perPage),
        total: presented.length,
        page,
        perPage,
        path: "/api/v1/patient/bills",
      }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/patient/dependents", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await ensurePatientDependentsTable();
      const { page, perPage } = pageArgs(req);
      const rows = await q(
        "SELECT * FROM patient_dependents WHERE user_id = ? ORDER BY id DESC",
        [req.user.id],
      );
      const presented = await presentRows("patient_dependents", rows);
      const start = (page - 1) * perPage;
      res.json(paginateList({
        data: presented.slice(start, start + perPage),
        total: presented.length,
        page,
        perPage,
        path: "/api/v1/patient/dependents",
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/patient/dependents", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await ensurePatientDependentsTable();
      const fullName = String(req.body.full_name || req.body.name || "").trim();
      const relationship = String(req.body.relationship || "").trim();
      if (!fullName || !relationship) {
        return res.status(422).json({ message: "Name and relationship are required." });
      }
      const birth = plausibleDateOfBirth(req.body.date_of_birth);
      if (!birth.ok) return res.status(422).json({ message: birth.message });
      const patientId = await loadOwnedId(req.user.id, "patients");
      const id = await insert("patient_dependents", {
        user_id: req.user.id,
        patient_id: patientId,
        full_name: fullName,
        relationship,
        date_of_birth: birth.value,
        phone: req.body.phone || null,
        notes: req.body.notes || null,
      });
      res.status(201).json({
        message: "Dependent saved.",
        data: await presentRow("patient_dependents", await one("SELECT * FROM patient_dependents WHERE id = ?", [id])),
      });
    } catch (error) {
      next(error);
    }
  });

  router.put("/patient/dependents/:id", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await ensurePatientDependentsTable();
      const id = Number(req.params.id);
      const row = await one("SELECT * FROM patient_dependents WHERE id = ? AND user_id = ?", [id, req.user.id]);
      if (!row) return res.status(404).json({ message: "Dependent not found." });
      const birth = plausibleDateOfBirth(req.body.date_of_birth ?? row.date_of_birth);
      if (!birth.ok) return res.status(422).json({ message: birth.message });
      await update("patient_dependents", id, {
        full_name: String(req.body.full_name || req.body.name || row.full_name).trim(),
        relationship: String(req.body.relationship || row.relationship).trim(),
        date_of_birth: birth.value,
        phone: req.body.phone ?? row.phone,
        notes: req.body.notes ?? row.notes,
      });
      res.json({
        message: "Dependent updated.",
        data: await presentRow("patient_dependents", await one("SELECT * FROM patient_dependents WHERE id = ?", [id])),
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/patient/dependents/:id", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await ensurePatientDependentsTable();
      const id = Number(req.params.id);
      const row = await one("SELECT * FROM patient_dependents WHERE id = ? AND user_id = ?", [id, req.user.id]);
      if (!row) return res.status(404).json({ message: "Dependent not found." });
      await q("DELETE FROM patient_dependents WHERE id = ? AND user_id = ?", [id, req.user.id]);
      res.json({ message: "Dependent removed." });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/availability", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const recurring = await q("SELECT * FROM doctor_availabilities WHERE doctor_id = ?", [doctorId ?? 0]).catch(() => []);
      const periods = await q("SELECT * FROM doctor_availability_periods WHERE doctor_id = ?", [doctorId ?? 0]).catch(() => []);
      res.json({
        recurring_availability: await presentRows("doctor_availabilities", recurring),
        availability_periods: await presentRows("doctor_availability_periods", periods),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/availability", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const known = await knownWrite("doctor_availabilities", { ...req.body, doctor_id: doctorId });
      const id = await insert("doctor_availabilities", known.payload);
      res.status(201).json({ message: "Availability saved.", data: await presentRow("doctor_availabilities", await one("SELECT * FROM doctor_availabilities WHERE id = ?", [id])) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/availability/periods", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found." });
      await assertScheduleAllowed(doctorId);
      const from = String(req.body.from_date || "").slice(0, 10);
      const to = String(req.body.to_date || "").slice(0, 10);
      const days = [...new Set((Array.isArray(req.body.days_of_week) ? req.body.days_of_week : []).map((day) => String(day).toLowerCase()))]
        .filter((day) => WEEKDAYS.includes(day));
      if (!from || !to || from > to) return res.status(422).json({ message: "Choose a valid date range." });
      if (!days.length) return res.status(422).json({ message: "Choose at least one day." });
      if (eachDate(from, to).length >= 92) return res.status(422).json({ message: "Choose a range of 90 days or less." });
      const saved = [];
      for (const day of days) {
        const id = await insert("doctor_availability_periods", {
          doctor_id: doctorId,
          hospital_id: req.body.hospital_id ?? null,
          from_date: from,
          to_date: to,
          days_of_week: [day],
          start_time: req.body.start_time,
          end_time: req.body.end_time,
          slot_duration_minutes: Number(req.body.slot_duration_minutes) || 30,
          buffer_minutes: Number(req.body.buffer_minutes) || 0,
          type: req.body.type || "online",
          label: req.body.label ?? null,
          is_active: 1,
        });
        const period = await presentRow("doctor_availability_periods", await one("SELECT * FROM doctor_availability_periods WHERE id = ?", [id]));
        const slotsGenerated = await generatePeriodSlots(doctorId, period);
        saved.push({
          day,
          from_date: from,
          to_date: to,
          slots_generated: slotsGenerated,
          note: "",
        });
      }
      res.status(201).json({ message: "Schedule generated.", saved, skipped_days: [] });
    } catch (error) {
      next(error);
    }
  });

  router.put("/doctor/availability/periods/:id", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const period = await one("SELECT * FROM doctor_availability_periods WHERE id = ? AND doctor_id = ?", [req.params.id, doctorId ?? 0]);
      if (!period) return res.status(404).json({ message: "Schedule period not found." });
      const known = await knownWrite("doctor_availability_periods", req.body ?? {});
      if (Object.keys(known.payload).length) await update("doctor_availability_periods", period.id, known.payload);
      const nextPeriod = await presentRow("doctor_availability_periods", await one("SELECT * FROM doctor_availability_periods WHERE id = ?", [period.id]));
      res.json({ message: "Schedule updated.", period: nextPeriod, available_dates: eachDate(nextPeriod.from_date, nextPeriod.to_date) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/doctor/availability/periods/:id", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const period = await one("SELECT * FROM doctor_availability_periods WHERE id = ? AND doctor_id = ?", [req.params.id, doctorId ?? 0]);
      if (!period) return res.status(404).json({ message: "Schedule period not found." });
      await update("doctor_availability_periods", period.id, { is_active: 0, deleted_at: new Date().toISOString().slice(0, 19).replace("T", " ") });
      res.json({ message: "Schedule period removed." });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/doctor/availability/all", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      if (doctorId) {
        await pool.query(
          "UPDATE doctor_availability_periods SET is_active = 0, deleted_at = NOW() WHERE doctor_id = ? AND deleted_at IS NULL",
          [doctorId],
        ).catch(() => {});
        await pool.query(
          "DELETE FROM appointment_slots WHERE doctor_id = ? AND (status IS NULL OR status <> 'booked')",
          [doctorId],
        ).catch(() => {});
      }
      res.json({ message: "Schedule reset." });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/slots", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const doctor = doctorId ? await one("SELECT * FROM doctors WHERE id = ?", [doctorId]).catch(() => null) : null;
      const filters = ["doctor_id = ?"];
      const params = [doctorId ?? 0];
      if (await hasColumn("appointment_slots", "deleted_at")) filters.push("deleted_at IS NULL");
      if (req.query.date) {
        filters.push("slot_date = ?");
        params.push(String(req.query.date).slice(0, 10));
      }
      if (req.query.from) {
        filters.push("slot_date >= ?");
        params.push(String(req.query.from).slice(0, 10));
      } else if (!req.query.date) {
        filters.push("slot_date >= ?");
        params.push(kigaliIso());
      }
      if (req.query.to) {
        filters.push("slot_date <= ?");
        params.push(String(req.query.to).slice(0, 10));
      }
      if (req.query.status) {
        filters.push("status = ?");
        params.push(req.query.status);
      }
      if (req.query.type) {
        filters.push("type = ?");
        params.push(req.query.type);
      }
      const rows = await presentRows(
        "appointment_slots",
        await q(`SELECT * FROM appointment_slots WHERE ${filters.join(" AND ")} ORDER BY slot_date, start_time`, params).catch(() => []),
      );
      const bookedKeys = new Set();
      if (await tableExists("appointments")) {
        const visits = await q(
          `SELECT appointment_date, appointment_time FROM appointments
           WHERE doctor_id = ? AND LOWER(COALESCE(status,'')) NOT IN ('cancelled','canceled','expired','payment_expired','no_show','declined')
             AND appointment_date >= ?`,
          [doctorId ?? 0, kigaliIso()],
        ).catch(() => []);
        for (const visit of visits) {
          const day = String(visit.appointment_date || "").slice(0, 10);
          const time = String(visit.appointment_time || "").slice(0, 5);
          if (day && time) bookedKeys.add(`${day}|${time}`);
        }
      }
      const slots = {};
      for (const row of rows) {
        const key = String(row.slot_date || "").slice(0, 10);
        if (!key) continue;
        const start = String(row.start_time || "").slice(0, 5);
        if (bookedKeys.has(`${key}|${start}`) && String(row.status || "").toLowerCase() !== "booked") {
          row.status = "booked";
        }
        if (!slots[key]) slots[key] = [];
        slots[key].push(row);
      }
      res.json({
        slots,
        dates: Object.keys(slots),
        total: rows.length,
        doctor: {
          id: doctorId,
          instant_consultation: Boolean(Number(doctor?.instant_consultation ?? 0)),
          bookings_paused: Boolean(Number(doctor?.bookings_paused ?? 0)),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/slots", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const slotDate = String(req.body.slot_date || req.body.date || "").slice(0, 10);
      const startTime = String(req.body.start_time || "");
      const duration = Math.max(5, Number(req.body.duration_minutes) || 30);
      const type = String(req.body.type || "online") === "in_person" ? "in_person" : "online";
      const start = minutesOf(startTime);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found." });
      if (!slotDate || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate) || start == null) {
        return res.status(422).json({ message: "Choose a date and start time." });
      }
      if (start + duration > 24 * 60) {
        return res.status(422).json({ message: "That slot would run past midnight." });
      }
      const today = kigaliIso();
      if (slotDate < today) {
        return res.status(422).json({ message: "Past dates cannot receive new slots." });
      }
      const existing = await one(
        "SELECT id, status FROM appointment_slots WHERE doctor_id = ? AND slot_date = ? AND start_time = ? LIMIT 1",
        [doctorId, slotDate, clock(start)],
      ).catch(() => null);
      if (existing && String(existing.status || "").toLowerCase() === "booked") {
        return res.status(422).json({ message: "That time is already booked." });
      }
      const saved = await upsertAvailableSlot(doctorId, {
        date: slotDate,
        startTime,
        duration,
        type,
        hospitalId: req.body.hospital_id ?? null,
        periodId: null,
      });
      if (!saved?.id) return res.status(422).json({ message: "Could not add that slot." });
      const nextSlot = await presentRow(
        "appointment_slots",
        await one("SELECT * FROM appointment_slots WHERE id = ?", [saved.id]),
      );
      res.json({ message: "Slot added.", slot: nextSlot, reopened: Boolean(existing) });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/doctor/slots/:id", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const slot = await one("SELECT * FROM appointment_slots WHERE id = ? AND doctor_id = ?", [req.params.id, doctorId ?? 0]);
      if (!slot) return res.status(404).json({ message: "Slot not found." });
      if (String(slot.status || "").toLowerCase() === "booked") return res.status(422).json({ message: "A booked slot cannot be changed." });
      await update("appointment_slots", slot.id, { status: req.body.status });
      const nextSlot = await presentRow("appointment_slots", await one("SELECT * FROM appointment_slots WHERE id = ?", [slot.id]));
      res.json({ message: "Slot updated.", slot: nextSlot });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/slots/bulk", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const date = String(req.body.date || "").slice(0, 10);
      const status = String(req.body.status || "");
      if (!date || !["available", "blocked", "reserved"].includes(status)) {
        return res.status(422).json({ message: "Choose a date and a valid status." });
      }
      const [result] = await pool.query(
        "UPDATE appointment_slots SET status = ? WHERE doctor_id = ? AND slot_date = ? AND (status IS NULL OR status <> 'booked')",
        [status, doctorId ?? 0, date],
      );
      res.json({ message: "Slots updated.", updated: Number(result?.affectedRows ?? 0) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/slots/generate", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctorId = await loadOwnedId(req.user.id, "doctors");
      const sourceId = Number(req.body.source_id);
      const period = await one("SELECT * FROM doctor_availability_periods WHERE id = ? AND doctor_id = ?", [sourceId, doctorId ?? 0]);
      if (!period) return res.status(404).json({ message: "Schedule period not found." });
      const presented = await presentRow("doctor_availability_periods", period);
      const slotsGenerated = await generatePeriodSlots(doctorId, presented);
      res.json({ message: "Slots generated.", slots_generated: slotsGenerated });
    } catch (error) {
      next(error);
    }
  });

  async function currentDoctor(req) {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    const doctor = doctorId ? await one("SELECT * FROM doctors WHERE id = ?", [doctorId]).catch(() => null) : null;
    return { doctorId: doctorId ?? 0, doctor };
  }

  function periodWhere(column, period, start, end) {
    if (period === "custom" && start && end) {
      return { sql: `${kigaliDaySql(column)} BETWEEN ? AND ?`, params: [String(start).slice(0, 10), String(end).slice(0, 10)] };
    }
    return { sql: kigaliPeriodSql(column, period), params: [] };
  }

  function previousWhere(column, period) {
    return { sql: kigaliPreviousSql(column, period), params: [] };
  }

  async function firstColumn(table, names) {
    for (const name of names) {
      if (await hasColumn(table, name)) return name;
    }
    return null;
  }

  function tallyStatuses(rows) {
    const out = { total: 0, completed: 0, pending: 0, confirmed: 0, cancelled: 0 };
    for (const row of rows) {
      const count = Number(row.total ?? 0);
      out.total += count;
      const status = String(row.status || "").toLowerCase();
      if (["completed", "done", "complete"].includes(status)) out.completed += count;
      else if (["pending", "queued", "waiting", "in_progress"].includes(status)) out.pending += count;
      else if (["confirmed", "accepted", "approved"].includes(status)) out.confirmed += count;
      else if (["cancelled", "canceled", "declined", "rejected"].includes(status)) out.cancelled += count;
    }
    return out;
  }

  async function doctorWalletRow(doctorId, userId) {
    if (!(await tableExists("doctor_wallets"))) return null;
    const column = await firstColumn("doctor_wallets", ["doctor_id", "user_id"]);
    if (!column) return null;
    return one(`SELECT * FROM doctor_wallets WHERE \`${column}\` = ? ORDER BY id DESC LIMIT 1`, [column === "user_id" ? userId : doctorId]).catch(() => null);
  }

  async function paidAppointmentJoin() {
    if (!(await tableExists("payments")) || !(await tableExists("appointments"))) return null;
    const hasId = await hasColumn("payments", "appointment_id");
    const hasPayable = (await hasColumn("payments", "payable_id")) && (await hasColumn("payments", "payable_type"));
    if (hasId && hasPayable) {
      return "a.id = COALESCE(p.appointment_id, CASE WHEN p.payable_type LIKE '%appointment%' THEN p.payable_id END)";
    }
    if (hasId) return "a.id = p.appointment_id";
    if (hasPayable) return "(a.id = p.payable_id AND p.payable_type LIKE '%appointment%')";
    return null;
  }

  async function doctorPaidEarnings(doctorId) {
    let earned = 0;
    if (!(await tableExists("payments")) || !doctorId) return 0;
    const appointmentJoin = await paidAppointmentJoin();
    if (appointmentJoin) {
      const row = await one(
        `SELECT COALESCE(SUM(p.amount), 0) AS total
         FROM payments p
         INNER JOIN appointments a ON ${appointmentJoin}
         WHERE a.doctor_id = ? AND LOWER(COALESCE(p.status,'')) IN ('paid','completed','success','successful')`,
        [doctorId],
      ).catch(() => null);
      earned += Number(row?.total ?? 0);
    }
    const instantTable = (await tableExists("instant_consultation_requests"))
      ? "instant_consultation_requests"
      : ((await tableExists("instant_consultations")) ? "instant_consultations" : null);
    if (instantTable && await hasColumn(instantTable, "doctor_id")) {
      const row = await one(
        `SELECT COALESCE(SUM(p.amount), 0) AS total
         FROM payments p
         INNER JOIN \`${instantTable}\` i ON i.id = p.payable_id
         WHERE i.doctor_id = ? AND p.payable_type LIKE '%instant%'
           AND LOWER(COALESCE(p.status,'')) IN ('paid','completed','success','successful')`,
        [doctorId],
      ).catch(() => null);
      earned += Number(row?.total ?? 0);
    }
    return earned;
  }

  async function doctorPaidVisitCounts(doctorId) {
    const paid = "LOWER(COALESCE(p.status,'')) IN ('paid','completed','success','successful')";
    let appointments = 0;
    let instants = 0;
    const appointmentJoin = doctorId ? await paidAppointmentJoin() : null;
    if (appointmentJoin) {
      const row = await one(
        `SELECT COUNT(DISTINCT a.id) AS total
         FROM payments p
         INNER JOIN appointments a ON ${appointmentJoin}
         WHERE a.doctor_id = ? AND ${paid}`,
        [doctorId],
      ).catch(() => null);
      appointments = Number(row?.total ?? 0);
    }
    const instantTable = (await tableExists("instant_consultation_requests"))
      ? "instant_consultation_requests"
      : ((await tableExists("instant_consultations")) ? "instant_consultations" : null);
    if (
      instantTable && doctorId && await hasColumn(instantTable, "doctor_id")
      && await tableExists("payments")
      && await hasColumn("payments", "payable_id")
      && await hasColumn("payments", "payable_type")
    ) {
      const row = await one(
        `SELECT COUNT(DISTINCT i.id) AS total
         FROM payments p
         INNER JOIN \`${instantTable}\` i ON i.id = p.payable_id
         WHERE i.doctor_id = ? AND p.payable_type LIKE '%instant%' AND ${paid}`,
        [doctorId],
      ).catch(() => null);
      instants = Number(row?.total ?? 0);
    }
    return { appointments, instants };
  }

  async function doctorWithdrawnTotal(doctorId, userId) {
    const table = (await tableExists("doctor_withdrawals"))
      ? "doctor_withdrawals"
      : ((await tableExists("wallet_withdrawals")) ? "wallet_withdrawals" : ((await tableExists("withdrawals")) ? "withdrawals" : null));
    if (!table) return 0;
    const column = await firstColumn(table, ["doctor_id", "user_id"]);
    if (!column) return 0;
    const owner = column === "user_id" ? userId : doctorId;
    const row = await one(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM \`${table}\`
       WHERE \`${column}\` = ? AND LOWER(COALESCE(status,'')) IN ('paid','completed','approved','success','successful')`,
      [owner],
    ).catch(() => null);
    return Number(row?.total ?? 0);
  }

  async function doctorAvailableBalance(doctorId, userId) {
    const row = await doctorWalletRow(doctorId, userId);
    const stored = Number(row?.balance ?? row?.available_balance ?? 0);
    if (stored > 0) return { balance: stored, currency: row?.currency || "RWF", row };
    const computed = Math.max(0, (await doctorPaidEarnings(doctorId)) - (await doctorWithdrawnTotal(doctorId, userId)));
    return { balance: computed, currency: row?.currency || "RWF", row };
  }

  router.get("/doctor/toggle/mystatus", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctor, doctorId } = await currentDoctor(req);
      const instant = Boolean(Number(doctor?.instant_consultation ?? 0));
      res.json({
        instant_consultation: instant,
        bookings_paused: Boolean(Number(doctor?.bookings_paused ?? doctor?.pause_bookings ?? 0)),
      });
    } catch (error) {
      next(error);
    }
  });

  async function setDoctorFlag(req, res, next, column, value) {
    try {
      const { doctorId } = await currentDoctor(req);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found." });
      if (await hasColumn("doctors", column)) await update("doctors", doctorId, { [column]: value ? 1 : 0 });
      const doctor = await one("SELECT * FROM doctors WHERE id = ?", [doctorId]);
      res.json({
        message: "Updated.",
        instant_consultation: Boolean(Number(doctor?.instant_consultation ?? 0)),
        bookings_paused: Boolean(Number(doctor?.bookings_paused ?? doctor?.pause_bookings ?? 0)),
      });
    } catch (error) {
      next(error);
    }
  }

  function flagValue(body, keys, current) {
    for (const key of keys) {
      if (body && Object.prototype.hasOwnProperty.call(body, key)) {
        const value = body[key];
        return value === true || value === 1 || value === "1";
      }
    }
    return !current;
  }

  router.patch("/doctor/toggle/instant", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctor, doctorId } = await currentDoctor(req);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found." });
      const current = Boolean(Number(doctor?.instant_consultation ?? 0));
      const target = flagValue(req.body, ["instant_consultation", "enabled", "status"], current);
      return setDoctorFlag(req, res, next, "instant_consultation", target);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/doctor/toggle/pause", requireAuth, requireRole("doctor"), async (req, res, next) => {
    const { doctor } = await currentDoctor(req);
    const column = (await hasColumn("doctors", "bookings_paused")) ? "bookings_paused" : "pause_bookings";
    const current = Boolean(Number(doctor?.bookings_paused ?? doctor?.pause_bookings ?? 0));
    return setDoctorFlag(req, res, next, column, flagValue(req.body, ["bookings_paused", "paused", "enabled"], current));
  });

  router.get("/doctor/my-patients", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      if (!doctorId) return res.json({ data: [] });
      const search = String(req.query.search || req.query.q || "").trim().toLowerCase();
      const appointments = await tableExists("appointments")
        ? await q(
          "SELECT patient_id, user_id, appointment_date AS visit_date, status FROM appointments WHERE doctor_id = ? ORDER BY id DESC LIMIT 500",
          [doctorId],
        ).catch(() => [])
        : [];
      const instantTable = (await tableExists("instant_consultation_requests"))
        ? "instant_consultation_requests"
        : ((await tableExists("instant_consultations")) ? "instant_consultations" : null);
      const instants = instantTable
        ? await q(
          `SELECT patient_id, user_id, created_at AS visit_date, status FROM \`${instantTable}\` WHERE doctor_id = ? ORDER BY id DESC LIMIT 500`,
          [doctorId],
        ).catch(() => [])
        : [];
      const grouped = new Map();
      const add = (row, kind) => {
        const accountId = Number(row.user_id) || 0;
        const profileId = Number(row.patient_id) || 0;
        const key = accountId ? `u:${accountId}` : (profileId ? `p:${profileId}` : "");
        if (!key) return;
        const date = String(row.visit_date || "").slice(0, 10);
        const current = grouped.get(key) || { accountId, profileId, visits: 0, last_visit: "", kind };
        current.visits += 1;
        if (date && date > current.last_visit) current.last_visit = date;
        if (!current.kind) current.kind = kind;
        grouped.set(key, current);
      };
      for (const row of appointments) add(row, "Appointment");
      for (const row of instants) add(row, "Instant consult");
      const accountIds = [...grouped.values()].map((row) => row.accountId).filter((id) => id > 0);
      const profileIds = [...grouped.values()].map((row) => row.profileId).filter((id) => id > 0);
      const userDob = accountIds.length && await hasColumn("users", "date_of_birth") ? ", date_of_birth" : "";
      const users = accountIds.length
        ? await q(`SELECT id, name${userDob} FROM users WHERE id IN (${accountIds.map(() => "?").join(",")})`, accountIds).catch(() => [])
        : [];
      const profileDob = profileIds.length && await tableExists("patients") && await hasColumn("patients", "date_of_birth") ? ", date_of_birth" : "";
      const profiles = profileIds.length && await tableExists("patients")
        ? await q(`SELECT id, user_id, name${profileDob} FROM patients WHERE id IN (${profileIds.map(() => "?").join(",")})`, profileIds).catch(() => [])
        : [];
      const userName = new Map(users.map((row) => [Number(row.id), row]));
      const profileName = new Map(profiles.map((row) => [Number(row.id), row]));
      const ageOf = (value) => {
        const date = String(value || "").slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        const born = new Date(`${date}T00:00:00Z`);
        const years = Math.floor((Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return years > 0 && years < 130 ? years : null;
      };
      let data = [...grouped.values()].map((row) => {
        const account = userName.get(row.accountId);
        const profile = profileName.get(row.profileId);
        const person = account || profile;
        return {
          id: row.accountId || row.profileId,
          name: person?.name || "Patient",
          age: ageOf(person?.date_of_birth),
          last_visit: row.last_visit || null,
          condition: row.kind,
          visits: row.visits,
        };
      }).sort((a, b) => String(b.last_visit || "").localeCompare(String(a.last_visit || "")));
      if (search) data = data.filter((row) => row.name.toLowerCase().includes(search));
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/dashboard", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctor, doctorId } = await currentDoctor(req);
      const period = String(req.query.period || "week");
      const chartGroup = String(req.query.chart_group || "day");
      const count = async (sql, params = []) => Number((await one(sql, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const dateColumn = await firstColumn("appointments", ["appointment_date", "scheduled_at", "date", "created_at"]);
      const amountColumn = await firstColumn("appointments", ["fee", "amount", "consultation_fee", "price", "total_amount"]);
      const typeColumn = await firstColumn("appointments", ["appointment_type", "type", "consultation_type"]);
      const alive = (await hasColumn("appointments", "deleted_at")) ? "deleted_at IS NULL" : "1=1";
      const owned = `doctor_id = ? AND ${alive}`;
      const window = dateColumn ? periodWhere(dateColumn, period, req.query.start_date, req.query.end_date) : { sql: "1=1", params: [] };
      const previous = dateColumn ? previousWhere(dateColumn, period) : { sql: "1=0", params: [] };
      const todaySql = dateColumn ? `${kigaliDaySql(dateColumn)} = ${kigaliTodaySql()}` : "1=0";
      const statuses = await q(
        `SELECT status, COUNT(*) AS total FROM appointments WHERE ${owned} AND ${window.sql} GROUP BY status`,
        [doctorId, ...window.params],
      ).catch(() => []);
      let todayRows = await q(
        `SELECT status, COUNT(*) AS total FROM appointments WHERE ${owned} AND ${todaySql} GROUP BY status`,
        [doctorId],
      ).catch(() => []);
      const periodStats = tallyStatuses(statuses);
      let today = tallyStatuses(todayRows);
      if (today.total === 0 && dateColumn && dateColumn !== "created_at" && await hasColumn("appointments", "created_at")) {
        todayRows = await q(
          `SELECT status, COUNT(*) AS total FROM appointments WHERE ${owned} AND ${kigaliDaySql("created_at")} = ${kigaliTodaySql()} GROUP BY status`,
          [doctorId],
        ).catch(() => []);
        today = tallyStatuses(todayRows);
      }
      const typeCount = async (likeSql, params) => {
        if (!typeColumn) return 0;
        return count(`SELECT COUNT(*) AS total FROM appointments WHERE ${owned} AND ${window.sql} AND ${likeSql}`, [doctorId, ...window.params, ...params]);
      };
      const onlineCount = typeColumn ? await typeCount(`\`${typeColumn}\` NOT LIKE '%person%' AND \`${typeColumn}\` NOT LIKE '%instant%' AND \`${typeColumn}\` NOT LIKE '%clinic%'`, []) : periodStats.total;
      const inPersonCount = typeColumn ? await typeCount(`(\`${typeColumn}\` LIKE '%person%' OR \`${typeColumn}\` LIKE '%clinic%' OR \`${typeColumn}\` LIKE '%hospital%')`, []) : 0;
      const instantCount = typeColumn ? await typeCount(`\`${typeColumn}\` LIKE '%instant%'`, []) : 0;
      const sumAmount = async (extraSql, params) => {
        if (!amountColumn) return 0;
        return Number((await one(
          `SELECT COALESCE(SUM(\`${amountColumn}\`), 0) AS total FROM appointments WHERE ${owned} AND ${extraSql}`,
          [doctorId, ...params],
        ).catch(() => ({ total: 0 })))?.total ?? 0);
      };
      const completedSql = "status IN ('completed','done','complete','paid')";
      const paidAppointmentSql = (await hasColumn("appointments", "payment_status"))
        ? `${completedSql} AND LOWER(COALESCE(payment_status,'')) IN ('paid','completed','success','successful')`
        : completedSql;
      let revenueTotal = await sumAmount(`${window.sql} AND ${paidAppointmentSql}`, window.params);
      let instantPaidCount = 0;
      let previousTotal = await sumAmount(`${previous.sql} AND ${paidAppointmentSql}`, previous.params);
      const revenueCount = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${owned} AND ${window.sql} AND ${paidAppointmentSql}`, [doctorId, ...window.params]);
      const onlineRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${paidAppointmentSql} AND \`${typeColumn}\` NOT LIKE '%person%' AND \`${typeColumn}\` NOT LIKE '%instant%'`, window.params) : revenueTotal;
      const inPersonRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${paidAppointmentSql} AND (\`${typeColumn}\` LIKE '%person%' OR \`${typeColumn}\` LIKE '%clinic%')`, window.params) : 0;
      const instantRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${paidAppointmentSql} AND \`${typeColumn}\` LIKE '%instant%'`, window.params) : 0;
      if (period === "all" && !(revenueTotal > 0) && await tableExists("payments") && await hasColumn("payments", "amount") && await hasColumn("payments", "appointment_id")) {
        const paidPayments = await one(
          `SELECT COALESCE(SUM(p.amount), 0) AS total
           FROM payments p
           INNER JOIN appointments a ON a.id = p.appointment_id
           WHERE a.doctor_id = ? AND p.status IN ('paid','completed','success','successful')`,
          [doctorId],
        ).catch(() => null);
        if (paidPayments) revenueTotal = Number(paidPayments.total ?? 0);
      }
      const labelExpr = !dateColumn
        ? kigaliTodaySql()
        : chartGroup === "month"
          ? `DATE_FORMAT(DATE_ADD(\`${dateColumn}\`, INTERVAL 2 HOUR), '%Y-%m-01')`
          : kigaliDaySql(dateColumn);
      const flow = dateColumn ? await q(
        `SELECT ${labelExpr} AS label, COUNT(*) AS patients, SUM(CASE WHEN status IN ('completed','done','complete') THEN 1 ELSE 0 END) AS completed
         FROM appointments WHERE ${owned} AND ${window.sql} GROUP BY label ORDER BY label`,
        [doctorId, ...window.params],
      ).catch(() => []) : [];
      const rxOwnerCol = (await tableExists("prescriptions"))
        ? await firstColumn("prescriptions", ["doctor_id", "prescriber_id", "user_id", "created_by"])
        : null;
      const rxOwnerId = (rxOwnerCol === "user_id" || rxOwnerCol === "created_by") ? req.user.id : doctorId;
      const prescriptionAlive = (await hasColumn("prescriptions", "deleted_at")) ? "deleted_at IS NULL" : "1=1";
      const rxDate = rxOwnerCol ? await firstColumn("prescriptions", ["created_at", "issued_at", "updated_at"]) : null;
      const rxWindow = rxDate ? periodWhere(rxDate, period, req.query.start_date, req.query.end_date) : { sql: "1=1", params: [] };
      const prescriptionCount = async (extra = "1=1", extraParams = []) => {
        if (!rxOwnerCol) return 0;
        return count(
          `SELECT COUNT(*) AS total FROM prescriptions WHERE \`${rxOwnerCol}\` = ? AND ${prescriptionAlive} AND ${rxWindow.sql} AND ${extra}`,
          [rxOwnerId, ...rxWindow.params, ...extraParams],
        );
      };
      const patientIdCols = [];
      for (const name of ["patient_id", "user_id", "guest_phone"]) {
        if (await hasColumn("appointments", name)) patientIdCols.push(`\`${name}\``);
      }
      const uniqueExpr = patientIdCols.length ? `COALESCE(${patientIdCols.join(", ")}, id)` : "id";
      const uniquePatients = await count(
        `SELECT COUNT(DISTINCT ${uniqueExpr}) AS total FROM appointments WHERE ${owned} AND ${window.sql}`,
        [doctorId, ...window.params],
      ).catch(() => 0);
      const durationCol = await firstColumn("appointments", ["duration_minutes", "duration", "slot_duration_minutes"]);
      const avgDuration = durationCol
        ? Number((await one(
          `SELECT COALESCE(AVG(\`${durationCol}\`), 0) AS total FROM appointments WHERE ${owned} AND ${window.sql} AND ${completedSql}`,
          [doctorId, ...window.params],
        ).catch(() => ({ total: 0 })))?.total ?? 0)
        : 0;
      const reviewAlive = (await hasColumn("reviews", "deleted_at")) ? "r.deleted_at IS NULL" : "1=1";
      const ratingColumn = await firstColumn("reviews", ["rating", "stars", "score"]);
      const reviewDate = await firstColumn("reviews", ["created_at", "updated_at"]);
      const reviewWindow = reviewDate ? periodWhere(reviewDate, period, req.query.start_date, req.query.end_date) : { sql: "1=1", params: [] };
      const reviewSelect = ratingColumn
        ? `SELECT COUNT(*) AS total,
                AVG(\`${ratingColumn}\`) AS avg_rating,
                SUM(CASE WHEN \`${ratingColumn}\` >= 5 THEN 1 ELSE 0 END) AS five_star,
                SUM(CASE WHEN \`${ratingColumn}\` >= 4 AND \`${ratingColumn}\` < 5 THEN 1 ELSE 0 END) AS four_star,
                SUM(CASE WHEN \`${ratingColumn}\` >= 3 AND \`${ratingColumn}\` < 4 THEN 1 ELSE 0 END) AS three_star,
                SUM(CASE WHEN \`${ratingColumn}\` < 3 THEN 1 ELSE 0 END) AS low_star
         FROM reviews r WHERE r.doctor_id = ? AND ${reviewAlive}`
        : "";
      const reviewStats = ratingColumn ? await one(
        `${reviewSelect} AND ${reviewWindow.sql.replaceAll(`\`${reviewDate}\``, `r.\`${reviewDate}\``)}`,
        [doctorId, ...reviewWindow.params],
      ).catch(() => null) : null;
      const allTimeReviews = ratingColumn ? await one(reviewSelect, [doctorId]).catch(() => null) : null;
      const recentReviews = ratingColumn ? await q(
        `SELECT r.id, r.\`${ratingColumn}\` AS rating, r.comment, r.created_at, u.name AS patient_name
         FROM reviews r
         LEFT JOIN users u ON u.id = r.patient_id
         WHERE r.doctor_id = ? AND ${reviewAlive} AND ${reviewWindow.sql.replaceAll(`\`${reviewDate}\``, `r.\`${reviewDate}\``)}
         ORDER BY r.id DESC LIMIT 5`,
        [doctorId, ...reviewWindow.params],
      ).catch(() => []) : [];
      const instantTable = (await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : (await tableExists("instant_consultations")) ? "instant_consultations" : null;
      // Must match the ownership clause used by /doctor/instant-consultations/queue,
      // otherwise the dashboard stat and the queue tab can never agree.
      const instantOwned = instantTable && (await hasColumn(instantTable, "doctor_id")) ? "doctor_id = ?" : "1=0";
      const instantParams = instantOwned === "1=0" ? [] : [doctorId];
      const instantStatus = async (extra, extraParams = []) => instantTable
        ? count(`SELECT COUNT(*) AS total FROM \`${instantTable}\` WHERE ${instantOwned} AND ${extra}`, [...instantParams, ...extraParams])
        : 0;
      // One rule for the dashboard, the queue tab, and Today waiting: a verified
      // payment, still waiting, for this doctor (or a paid "any doctor" request).
      const hasPayColumn = instantTable ? await hasColumn(instantTable, "payment_status") : false;
      const feeColumns = [];
      if (instantTable) {
        for (const name of ["consultation_fee", "patient_pays", "amount_due"]) {
          if (await hasColumn(instantTable, name)) feeColumns.push(name);
        }
      }
      const paidMarker = paidMarkerSql(feeColumns, { paymentColumn: hasPayColumn });
      const instantQueueSql = `${paidMarker} AND LOWER(status) IN ('confirmed','pending','queued','waiting','payment_pending')`;
      const instantCreated = instantTable && (await firstColumn(instantTable, ["created_at", "updated_at"]));
      const instantCompletedAt = instantTable && (await firstColumn(instantTable, ["completed_at", "ended_at", "updated_at", "created_at"]));
      if (instantTable && instantCreated) {
        today.pending += await instantStatus(`status IN ('pending','queued','waiting') AND ${kigaliDaySql(instantCreated)} = ${kigaliTodaySql()}`);
        today.confirmed += await instantStatus(`status IN ('confirmed','accepted','in_progress') AND ${kigaliDaySql(instantCreated)} = ${kigaliTodaySql()}`);
      }
      if (instantTable && instantCompletedAt) {
        today.completed += await instantStatus(`status IN ('completed','done') AND ${kigaliDaySql(instantCompletedAt)} = ${kigaliTodaySql()}`);
      }
      today.total = today.pending + today.confirmed + today.completed + today.cancelled;
      const paidWaiting = await instantStatus(instantQueueSql);
      today.waiting = paidWaiting;
      let instantPatients = 0;
      let instantAvg = 0;
      let instantPaidTotal = 0;
      if (instantTable) {
        const idCol = await firstColumn(instantTable, ["patient_id", "user_id"]);
        if (idCol) {
          const peopleWindow = instantCreated ? periodWhere(instantCreated, period, req.query.start_date, req.query.end_date) : { sql: "1=1", params: [] };
          instantPatients = await count(
            `SELECT COUNT(DISTINCT \`${idCol}\`) AS total FROM \`${instantTable}\` WHERE ${instantOwned} AND ${peopleWindow.sql}`,
            [...instantParams, ...peopleWindow.params],
          );
        }
        const startCol = await firstColumn(instantTable, ["started_at", "accepted_at"]);
        const endCol = await firstColumn(instantTable, ["completed_at", "ended_at"]);
        if (startCol && endCol) {
          const raw = Number((await one(
            `SELECT AVG(TIMESTAMPDIFF(MINUTE, \`${startCol}\`, \`${endCol}\`)) AS total
             FROM \`${instantTable}\` WHERE ${instantOwned} AND \`${startCol}\` IS NOT NULL AND \`${endCol}\` IS NOT NULL`,
            instantParams,
          ).catch(() => ({ total: 0 })))?.total);
          instantAvg = Number.isFinite(raw) ? Math.round(raw) : 0;
        }
      }
      if (instantTable && await tableExists("payments") && await hasColumn("payments", "payable_id")) {
        const payDate = await firstColumn("payments", ["paid_at", "created_at"]);
        const payWindow = payDate ? periodWhere(payDate, period, req.query.start_date, req.query.end_date) : { sql: "1=1", params: [] };
        const paySql = payDate ? payWindow.sql.replaceAll(`\`${payDate}\``, `p.\`${payDate}\``) : "1=1";
        const instantPaid = await one(
          `SELECT COALESCE(SUM(p.amount), 0) AS total, COUNT(DISTINCT i.id) AS visits
           FROM payments p INNER JOIN \`${instantTable}\` i ON i.id = p.payable_id
           WHERE i.doctor_id = ? AND LOWER(p.status) IN ('paid','completed','success','successful')
             AND p.payable_type LIKE '%instant%' AND ${paySql}`,
          [doctorId, ...payWindow.params],
        ).catch(() => ({ total: 0, visits: 0 }));
        instantPaidTotal = Number(instantPaid?.total || 0);
        instantPaidCount = Number(instantPaid?.visits || 0);
        revenueTotal += instantPaidTotal;
        const previousPay = payDate ? previousWhere(payDate, period) : { sql: "1=0", params: [] };
        const previousPaySql = payDate ? previousPay.sql.replaceAll(`\`${payDate}\``, `p.\`${payDate}\``) : "1=0";
        const previousInstant = await one(
          `SELECT COALESCE(SUM(p.amount), 0) AS total
           FROM payments p INNER JOIN \`${instantTable}\` i ON i.id = p.payable_id
           WHERE i.doctor_id = ? AND LOWER(p.status) IN ('paid','completed','success','successful')
             AND p.payable_type LIKE '%instant%' AND ${previousPaySql}`,
          [doctorId, ...previousPay.params],
        ).catch(() => ({ total: 0 }));
        previousTotal += Number(previousInstant?.total || 0);
      }
      const change = previousTotal > 0 ? Math.round(((revenueTotal - previousTotal) / previousTotal) * 1000) / 10 : null;

      res.json({
        filters_applied: {
          period,
          from: req.query.start_date || null,
          to: req.query.end_date || null,
          appointment_type: req.query.appointment_type || "all",
          search: req.query.search || null,
          chart_group: chartGroup,
        },
        today: { ...today, instant_queue: paidWaiting },
        period_stats: {
          unique_patients: uniquePatients + instantPatients,
          total_appointments: periodStats.total,
          completed: periodStats.completed,
          cancelled: periodStats.cancelled,
          pending: periodStats.pending,
          confirmed: periodStats.confirmed,
          online_count: onlineCount,
          in_person_count: inPersonCount,
          instant_total: instantCount + await instantStatus(instantCreated ? periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).sql : "1=1", instantCreated ? periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).params : []),
          instant_completed: await instantStatus(instantCompletedAt ? `status IN ('completed','done') AND ${periodWhere(instantCompletedAt, period, req.query.start_date, req.query.end_date).sql}` : "status IN ('completed','done')", instantCompletedAt ? periodWhere(instantCompletedAt, period, req.query.start_date, req.query.end_date).params : []),
          avg_duration_minutes: Math.round(avgDuration),
          prescriptions_issued: await prescriptionCount("status IN ('issued','signed','completed','active','sent_to_pharmacy','dispensed','filled')"),
        },
        revenue: {
          total: revenueTotal,
          previous_period_total: previousTotal,
          change_percent: change,
          appointment_count: revenueCount,
          avg_per_appointment: earnedAverage(revenueTotal, revenueCount, instantPaidCount),
          breakdown: {
            online: { total: onlineRevenue, count: onlineCount },
            in_person: { total: inPersonRevenue, count: inPersonCount },
            instant: { total: instantRevenue + instantPaidTotal, count: instantCount },
          },
        },
        patient_flow: flow.map((row) => ({
          label: String(row.label).slice(0, 10),
          patients: Number(row.patients ?? 0),
        })),
        completion_rate: flow.map((row) => {
          const patients = Number(row.patients ?? 0);
          const completed = Number(row.completed ?? 0);
          return { label: String(row.label).slice(0, 10), rate: patients > 0 ? Math.round((completed / patients) * 100) : 0 };
        }),
        instant: {
          scope: "period",
          total: await instantStatus(instantCreated ? periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).sql : "1=1", instantCreated ? periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).params : []),
          completed: await instantStatus(instantCompletedAt ? `status IN ('completed','done') AND ${periodWhere(instantCompletedAt, period, req.query.start_date, req.query.end_date).sql}` : "status IN ('completed','done')", instantCompletedAt ? periodWhere(instantCompletedAt, period, req.query.start_date, req.query.end_date).params : []),
          declined: await instantStatus(instantCreated ? `status IN ('declined','rejected','cancelled','canceled') AND ${periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).sql}` : "status IN ('declined','rejected','cancelled','canceled')", instantCreated ? periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).params : []),
          pending: await instantStatus(instantCreated ? `status IN ('pending','queued','waiting') AND ${periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).sql}` : "status IN ('pending','queued','waiting')", instantCreated ? periodWhere(instantCreated, period, req.query.start_date, req.query.end_date).params : []),
          current_queue: paidWaiting,
          queue_scope: "live",
          paid_waiting: paidWaiting,
          avg_duration_min: instantAvg,
        },
        prescriptions: {
          total: await prescriptionCount(),
          issued: await prescriptionCount("status IN ('issued','signed','completed','active')"),
          draft: await prescriptionCount("status IN ('draft','pending')"),
          signed: await prescriptionCount("status IN ('signed','issued')"),
        },
        reviews: {
          all_time_avg: allTimeReviews?.avg_rating == null ? null : Math.round(Number(allTimeReviews.avg_rating) * 10) / 10,
          period: {
            total: Number(reviewStats?.total ?? 0),
            avg: reviewStats?.avg_rating == null ? null : Math.round(Number(reviewStats.avg_rating) * 10) / 10,
            five_star: Number(reviewStats?.five_star ?? 0),
            four_star: Number(reviewStats?.four_star ?? 0),
            three_star: Number(reviewStats?.three_star ?? 0),
            low_star: Number(reviewStats?.low_star ?? 0),
          },
          recent: recentReviews.map((row) => ({
            id: row.id,
            rating: Number(row.rating ?? 0),
            comment: row.comment ?? "",
            created_at: row.created_at,
            patient_name: row.patient_name || "Patient",
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/wallet", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const wallet = await doctorAvailableBalance(doctorId, req.user.id);
      const row = wallet.row;
      res.json({
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
          last_topup: row?.last_topup ?? row?.last_topup_at ?? null,
          last_withdrawn: row?.last_withdrawn ?? row?.last_withdrawn_at ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/wallet/earnings", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const { page, perPage, offset } = pageArgs(req);
      const amountColumn = await firstColumn("appointments", ["fee", "amount", "consultation_fee", "price", "total_amount"]);
      const dateColumn = await firstColumn("appointments", ["appointment_date", "scheduled_at", "completed_at", "created_at"]);
      const alive = (await hasColumn("appointments", "deleted_at")) ? "deleted_at IS NULL" : "1=1";
      // Earnings pay out from this list, so a completed visit only counts when the
      // money actually arrived (or the doctor charges nothing).
      const feeColumn = await firstColumn("appointments", ["consultation_fee", "patient_pays", "fee", "amount", "price", "total_amount"]);
      const settled = feeColumn && await hasColumn("appointments", "payment_status")
        ? ` AND (LOWER(COALESCE(payment_status, '')) = 'paid' OR COALESCE(\`${feeColumn}\`, 0) <= 0)`
        : "";
      const where = `doctor_id = ? AND ${alive} AND status IN ('completed','done','complete','paid')${settled}`;
      const summary = await one(
        `SELECT COUNT(*) AS total_appointments, COALESCE(SUM(${amountColumn ? `\`${amountColumn}\`` : "0"}), 0) AS total_earned, MAX(${dateColumn ? `\`${dateColumn}\`` : "NULL"}) AS last_appointment_at FROM appointments WHERE ${where}`,
        [doctorId],
      ).catch(() => null);
      const total = Number(summary?.total_appointments ?? 0);
      const rows = await q(
        `SELECT * FROM appointments WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [doctorId, perPage, offset],
      ).catch(() => []);
      const paidEarnings = await doctorPaidEarnings(doctorId);
      const totalEarned = paidEarnings > 0 ? paidEarnings : Number(summary?.total_earned ?? 0);
      const paidVisits = await doctorPaidVisitCounts(doctorId);
      const paidAppointments = paidVisits.appointments > 0 || paidVisits.instants > 0 ? paidVisits.appointments : total;
      res.json({
        summary: {
          total_appointments: total,
          total_earned: totalEarned,
          average_per_appointment: earnedAverage(totalEarned, paidAppointments, paidVisits.instants),
          last_appointment_at: summary?.last_appointment_at ?? null,
        },
        breakdown: paginateList({
          data: await presentRows("appointments", rows),
          total,
          page,
          perPage,
          path: "/api/v1/doctor/wallet/earnings",
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/wallet/withdrawals", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const { page, perPage, offset } = pageArgs(req);
      const table = (await tableExists("doctor_withdrawals"))
        ? "doctor_withdrawals"
        : (await tableExists("wallet_withdrawals"))
          ? "wallet_withdrawals"
          : (await tableExists("withdrawals"))
            ? "withdrawals"
            : null;
      if (!table) {
        return res.json(paginateList({ data: [], total: 0, page, perPage, path: "/api/v1/doctor/wallet/withdrawals" }));
      }
      const column = await firstColumn(table, ["doctor_id", "user_id"]);
      const where = column ? `\`${column}\` = ?` : "1=0";
      const params = column ? [column === "user_id" ? req.user.id : doctorId] : [];
      const total = Number((await one(`SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${where}`, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const rows = await q(`SELECT * FROM \`${table}\` WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(() => []);
      res.json(paginateList({
        data: await presentRows(table, rows),
        total,
        page,
        perPage,
        path: "/api/v1/doctor/wallet/withdrawals",
      }));
    } catch (error) {
      next(error);
    }
  });

  async function instantTable() {
    if (await tableExists("instant_consultation_requests")) return "instant_consultation_requests";
    if (await tableExists("instant_consultations")) return "instant_consultations";
    return null;
  }

  /** A doctor already inside a live appointment cannot take an instant consult. */
  async function doctorInActiveAppointment(doctorId) {
    if (!doctorId || !(await tableExists("appointments")) || !(await hasColumn("appointments", "doctor_id"))) return false;
    const row = await one(
      "SELECT id FROM appointments WHERE doctor_id = ? AND LOWER(COALESCE(status,'')) = 'in_progress' ORDER BY id DESC LIMIT 1",
      [doctorId],
    ).catch(() => null);
    return Boolean(row?.id);
  }

  async function doctorActiveInstant(doctorId, exceptId = null) {
    const table = await instantTable();
    if (!table || !(await hasColumn(table, "doctor_id"))) return null;
    const params = [doctorId];
    let sql = `SELECT * FROM \`${table}\` WHERE doctor_id = ? AND status IN ('accepted','in_progress')`;
    if (exceptId != null) {
      sql += " AND id <> ?";
      params.push(exceptId);
    }
    sql += " ORDER BY id DESC LIMIT 1";
    return one(sql, params).catch(() => null);
  }

  function instantDoctorToken(row, roomName) {
    return callToken({
      room: roomName,
      role: "doctor",
      consultationId: row.id,
      name: "Doctor",
    });
  }

  router.get("/doctor/instant-consultations/queue", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      await expireUnpaidPayments().catch(() => null);
      const { doctorId, doctor } = await currentDoctor(req);
      const table = await instantTable();
      let queue = [];
      let sourceRows = [];
      let seenToday = 0;
      let resolved = 0;
      let resolvedToday = 0;
      let active = null;
      let historyTotal = 0;
      if (table) {
        const owner = (await hasColumn(table, "doctor_id")) ? "(doctor_id = ? OR doctor_id IS NULL)" : "1=1";
        const params = owner.includes("?") ? [doctorId] : [];
        // Not every deployment stores payment_status on the instant table (the
        // column is absent in production, where a paid visit is only marked by
        // status='confirmed'). Naming it in ORDER BY makes the whole query fail,
        // and the catch below would then report an empty queue to every doctor.
        // Paid and accepted rows stay first in this doctor list. That eligibility
        // order is separate from queue_position, which remains the arrival place.
        const paidFirst = await hasColumn(table, "payment_status")
          ? "CASE WHEN LOWER(payment_status) = 'paid' THEN 0 ELSE 1 END ASC,"
          : "";
        const openRows = await q(
          `SELECT * FROM \`${table}\` WHERE ${owner} AND LOWER(status) IN ('pending','queued','waiting','payment_pending','confirmed','accepted','in_progress')
           ORDER BY
             ${paidFirst}
             CASE LOWER(status)
               WHEN 'in_progress' THEN 0
               WHEN 'accepted'    THEN 1
               WHEN 'confirmed'   THEN 2
               ELSE 3
             END ASC,
             id DESC
           LIMIT 100`,
          params,
        ).catch(() => []);
        const finishedColumn = await firstColumn(table, ["completed_at", "ended_at", "updated_at", "created_at"]);
        const historyPage = historyPageArgs(req.query);
        const historyOrder = finishedColumn ? `\`${finishedColumn}\`` : "id";
        const historyWhere = `${owner} AND LOWER(status) IN ('completed','done','expired','payment_expired','declined','cancelled','canceled')`;
        historyTotal = Number((await one(
          `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${historyWhere}`,
          params,
        ).catch(() => ({ total: 0 })))?.total ?? 0);
        const historyRows = await q(
          `SELECT * FROM \`${table}\` WHERE ${historyWhere}
           ORDER BY ${historyOrder} DESC, id DESC
           LIMIT ? OFFSET ?`,
          [...params, historyPage.limit, historyPage.offset],
        ).catch(() => []);
        const rows = [...openRows, ...historyRows];
        sourceRows = rows;
        active = await doctorActiveInstant(doctorId);
        const named = rows.filter((row) => Number(row.doctor_id) === Number(doctorId));
        queue = rows.map((row) => {
          const lowerStatus = String(row.status || "pending").toLowerCase();
          const isStillWaiting = ["pending", "queued", "waiting", "payment_pending", "confirmed"].includes(lowerStatus);
          const waitUntil = isStillWaiting
            ? new Date()
            : (row.accepted_at || row.started_at || row.completed_at || row.ended_at || row.updated_at || new Date());
          const waitingSeconds = Math.max(0, ageSeconds(row.created_at, waitUntil) ?? 0);
          const currentAgeSeconds = Math.max(0, ageSeconds(row.created_at) ?? 0);
          const rowDurationMinutes = durationMinutes(row.started_at || row.accepted_at, row.completed_at || row.ended_at);
          const rowDurationSeconds = row.duration_seconds != null
            ? Number(row.duration_seconds)
            : (row.started_at || row.accepted_at) && (row.completed_at || row.ended_at)
              ? Math.max(1, ageSeconds(row.started_at || row.accepted_at, row.completed_at || row.ended_at) ?? 0)
              : null;
          const place = placeInQueue(row, named.length ? named : [row]);
          return {
          id: row.id,
          doctor_id: row.doctor_id || null,
          guest_name: row.guest_name || row.patient_name || "",
          guest_phone: row.guest_phone || row.phone || "",
          description: row.description || row.reason || null,
          status: row.status || "pending",
          payment_status: displayedPaymentStatus(row),
          queue_position: Number(row.doctor_id) === Number(doctorId) ? place.queue_position : null,
          age_seconds: isStillWaiting ? currentAgeSeconds : waitingSeconds,
          waiting_seconds: waitingSeconds,
          waiting_label: waitingSeconds >= 3600
            ? `${Math.floor(waitingSeconds / 3600)}h`
            : waitingSeconds >= 60
              ? `${Math.floor(waitingSeconds / 60)}m`
              : `${waitingSeconds}s`,
          created_at: row.created_at || null,
          accepted_at: row.accepted_at || null,
          started_at: row.started_at || null,
          completed_at: row.completed_at || row.ended_at || null,
          ended_at: row.ended_at || row.completed_at || null,
          duration_seconds: rowDurationSeconds,
          duration_minutes: rowDurationMinutes,
          patient_id: row.patient_id || row.user_id || null,
          user_id: row.user_id || null,
        };
        });
        const namedOwner = owner.includes("?") ? "doctor_id = ?" : "1=1";
        const namedParams = owner.includes("?") ? [doctorId] : [];
        const doneColumn = await firstColumn(table, ["completed_at", "ended_at", "created_at"]);
        const todayExpr = doneColumn ? `${kigaliDaySql(doneColumn)} = ${kigaliTodaySql()}` : "1=0";
        seenToday = Number((await one(
          `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${namedOwner} AND LOWER(status) IN ('completed','done') AND ${todayExpr}`,
          namedParams,
        ).catch(() => ({ total: 0 })))?.total ?? 0);
        resolvedToday = seenToday;
        resolved = Number((await one(
          `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${namedOwner} AND LOWER(status) IN ('completed','done')`,
          namedParams,
        ).catch(() => ({ total: 0 })))?.total ?? 0);
      }
      const finishedStatus = ["completed", "done", "expired", "payment_expired", "declined", "cancelled", "canceled"];
      const liveQueue = queue.filter((item) => countsInInstantQueue(item, doctorId));
      const durations = sourceRows
        .map((row) => durationMinutes(row.started_at || row.accepted_at, row.completed_at || row.ended_at))
        .filter((value) => value != null);
      const history = queue.filter((item) => finishedStatus.includes(String(item.status || "").toLowerCase()));
      const historyPage = historyPageArgs(req.query);
      const paging = historyMeta(historyPage.page, historyPage.limit, historyTotal);
      res.json({
        queue,
        history,
        history_page: paging.current_page,
        history_per_page: paging.per_page,
        history_total: paging.total,
        history_meta: paging,
        history_pagination: paging,
        meta: paging,
        stats: {
          in_queue: liveQueue.length,
          seen_today: seenToday,
          avg_duration: average(durations),
          resolved,
          resolved_today: resolvedToday,
          resolved_all_time: resolved,
          is_online: Boolean(Number(doctor?.instant_consultation ?? 0)),
          doctor_busy: Boolean(active),
          active_instant_id: active?.id ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/instant-consultations/:instantConsultationId/accept", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.instantConsultationId]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (row.doctor_id && Number(row.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This request belongs to another doctor." });
      }
      if (["expired", "declined", "cancelled", "completed"].includes(String(row.status || ""))) {
        return res.status(422).json({ message: "This request is no longer waiting." });
      }
      // 'confirmed' is the only state a patient can reach by paying, so anything
      // still pending is an unpaid queue row the doctor must not be able to take.
      if (!isPaidStatus(row)) {
        return res.status(422).json({ message: "This consultation is not paid yet. The patient must complete payment before you can accept it." });
      }
      if (await doctorInActiveAppointment(doctorId)) {
        return res.status(409).json({
          message: "Finish your current video consultation before accepting an instant consultation.",
        });
      }
      const busy = await doctorActiveInstant(doctorId, row.id);
      if (busy) {
        return res.status(409).json({
          message: "Finish your current instant consultation before accepting another. Other patients will wait in the queue. Bookings remain available.",
          active_instant_id: busy.id,
        });
      }
      const patch = { status: "accepted" };
      if (await hasColumn(table, "doctor_id")) patch.doctor_id = doctorId;
      if (await hasColumn(table, "accepted_at")) patch.accepted_at = new Date();
      await update(table, row.id, patch);
      const updated = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]);
      const roomName = updated.daily_room_name || updated.room_name || `instant-${updated.id}`;
      const roomUrl = updated.daily_room_url || updated.room_url || `/consultation/${roomName}`;
      const doctorToken = instantDoctorToken(updated, roomName);
      notifyDoctorReady(updated).catch((error) => {
        console.error("Ready mail was not sent:", error?.message || error);
      });
      res.json({
        message: "Request accepted.",
        room_url: roomUrl,
        room_name: roomName,
        doctor_token: doctorToken,
        data: await presentRow(table, updated),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/instant-consultations/:instantConsultationId/decline", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.instantConsultationId]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (row.doctor_id && Number(row.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This request belongs to another doctor." });
      }
      const declinePatch = { status: "declined" };
      if (await hasColumn(table, "declined_at")) declinePatch.declined_at = new Date();
      if (await hasColumn(table, "decline_reason")) declinePatch.decline_reason = req.body?.reason || req.body?.decline_reason || null;
      await update(table, row.id, declinePatch);
      if (isPaidStatus(row) && await tableExists("refunds")) {
        const refund = await knownWrite("refunds", {
          patient_id: row.patient_id || row.user_id || null,
          doctor_id: doctorId,
          amount: row.amount || row.consultation_fee || row.patient_pays || 0,
          reason: declinePatch.decline_reason || "Instant consultation declined after payment",
          status: "pending",
          payable_type: "instant_consultation",
          payable_id: row.id,
        });
        if (Object.keys(refund.payload).length) await insert("refunds", refund.payload).catch(() => null);
      }
      res.json({ message: "Request declined." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/instant-consultations/:instantConsultationId/join", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.instantConsultationId]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (row.doctor_id && Number(row.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This request belongs to another doctor." });
      }
      if (!isPaidStatus(row)) {
        return res.status(422).json({ message: UNPAID_INSTANT_JOIN_MESSAGE });
      }
      const busy = await doctorActiveInstant(doctorId, row.id);
      if (busy) {
        return res.status(409).json({
          message: "You already have an active instant consultation. Finish it before joining another.",
          active_instant_id: busy.id,
        });
      }
      const roomName = row.daily_room_name || row.room_name || `instant-${row.id}`;
      const roomUrl = row.daily_room_url || row.room_url || `/consultation/${roomName}`;
      const doctorToken = instantDoctorToken(row, roomName);
      // Entering a call turns instant availability off until the doctor turns it back on.
      await disableInstantForDoctor(doctorId);
      const patch = { status: "in_progress" };
      if (await hasColumn(table, "doctor_id")) patch.doctor_id = doctorId;
      if (await hasColumn(table, "started_at") && !row.started_at) patch.started_at = new Date();
      if (await hasColumn(table, "daily_room_name")) patch.daily_room_name = roomName;
      if (await hasColumn(table, "daily_room_url")) patch.daily_room_url = roomUrl;
      if (await hasColumn(table, "daily_doctor_token")) patch.daily_doctor_token = doctorToken;
      await update(table, row.id, patch);
      const updated = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]);
      res.json({
        message: "Session ready.",
        room_url: roomUrl,
        room_name: roomName,
        doctor_token: doctorToken,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/instant-consultations/:instantConsultationId/complete", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.instantConsultationId]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (row.doctor_id && Number(row.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This request belongs to another doctor." });
      }
      if (["expired", "declined", "cancelled"].includes(String(row.status || ""))) {
        return res.status(422).json({ message: "This request is no longer active." });
      }
      if (String(row.status || "") === "completed") {
        return res.json({ message: "Session completed.", data: await presentRow(table, row) });
      }
      if (visitAwaitsPayment(row)) {
        return res.status(422).json({ message: "This patient has not paid yet, so this consultation cannot be completed." });
      }
      const patch = { status: "completed" };
      const ended = new Date();
      const start = row.started_at || row.accepted_at || row.created_at;
      if (await hasColumn(table, "completed_at")) patch.completed_at = ended;
      if (await hasColumn(table, "ended_at")) patch.ended_at = ended;
      if (await hasColumn(table, "duration_seconds")) {
        const exactSeconds = ageSeconds(start, ended);
        if (exactSeconds != null) patch.duration_seconds = Math.max(1, exactSeconds);
      }
      if (await hasColumn(table, "duration_minutes")) {
        const minutes = durationMinutes(start, ended);
        if (minutes != null) patch.duration_minutes = minutes;
      }
      await update(table, row.id, patch);
      const updated = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]);
      notifyVisitCompleted(updated || row, "instant consultation").catch(() => null);
      res.json({ message: "Session completed.", data: await presentRow(table, updated || row) });
    } catch (error) {
      next(error);
    }
  });

  registerPatientInstantList(router, { requireAuth, requireRole });

  router.get("/patient/appointments", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const owned = await patientOwnedWhere("appointments", req.user);
      if (!owned?.sql || owned.sql === "0") {
        return res.json({ data: [], total: 0, current_page: 1, last_page: 1, per_page: 10 });
      }
      const filters = [owned.sql];
      const params = [...owned.params];
      if (await hasColumn("appointments", "deleted_at")) filters.push("deleted_at IS NULL");
      if (req.query.status) {
        filters.push("status = ?");
        params.push(String(req.query.status));
      }
      if (req.query.type && await hasColumn("appointments", "type")) {
        filters.push("type = ?");
        params.push(String(req.query.type));
      }
      if (req.query.date) {
        filters.push("DATE(appointment_date) = ?");
        params.push(String(req.query.date).slice(0, 10));
      }
      if (req.query.date_from) {
        filters.push("DATE(appointment_date) >= ?");
        params.push(String(req.query.date_from).slice(0, 10));
      }
      if (req.query.date_to) {
        filters.push("DATE(appointment_date) <= ?");
        params.push(String(req.query.date_to).slice(0, 10));
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const { page, perPage, offset } = pageArgs(req, 10);
      const total = Number((await one(`SELECT COUNT(*) AS total FROM appointments ${where}`, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const rows = await presentRows(
        "appointments",
        await q(`SELECT * FROM appointments ${where} ORDER BY appointment_date DESC, appointment_time DESC, id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(() => []),
      );
      const data = await decorateAppointments(rows);
      res.json(paginateList({
        data: data || [],
        total,
        page,
        perPage,
        path: publicPagePath(req),
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/patient/appointments/:appointmentId/join", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.appointmentId]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      if (!(await patientOwnsAppointment(appointment, req.user))) {
        return res.status(403).json({ message: "This appointment belongs to another patient." });
      }
      const block = visitJoinBlock("appointments", appointment);
      if (block) {
        return res.status(422).json({
          message: joinBlockMessage(block.code, req.user?.preferred_language),
          ...(block.reason ? { reason: block.reason } : {}),
        });
      }
      const room = `appointment-${appointment.id}`;
      const token = callToken({
        room,
        role: "patient",
        consultationId: appointment.id,
        name: "Patient",
      });
      await markGuestPasswordUsed(req.user.id).catch(() => null);
      res.json({
        message: "Session ready.",
        room_url: `/consultation/${room}`,
        room_name: room,
        token,
        join_url: `/consultation/${room}`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/appointments/:appointmentId/join", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.appointmentId]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      if (appointment.doctor_id && Number(appointment.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This appointment belongs to another doctor." });
      }
      const block = visitJoinBlock("appointments", appointment);
      if (block) {
        return res.status(422).json({
          message: joinBlockMessage(block.code, req.user?.preferred_language),
          ...(block.reason ? { reason: block.reason } : {}),
        });
      }
      const room = `appointment-${appointment.id}`;
      const token = callToken({
        room,
        role: "doctor",
        consultationId: appointment.id,
        name: "Doctor",
      });
      // The doctor is now in a live video meeting: stop accepting instant consults.
      await disableInstantForDoctor(doctorId);
      if (await hasColumn("appointments", "status") && !["in_progress", "completed", "done"].includes(String(appointment.status || "").toLowerCase())) {
        const started = { status: "in_progress" };
        if (await hasColumn("appointments", "started_at") && !appointment.started_at) started.started_at = new Date();
        await update("appointments", appointment.id, started);
      }
      res.json({
        message: "Session ready.",
        room_url: `/consultation/${room}`,
        room_name: room,
        token,
        join_url: `/consultation/${room}`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/appointments/:appointmentId/complete", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.appointmentId]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      if (appointment.doctor_id && Number(appointment.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This appointment belongs to another doctor." });
      }
      if (["expired", "cancelled", "declined"].includes(String(appointment.status || ""))) {
        return res.status(422).json({ message: "This appointment is no longer active." });
      }
      if (String(appointment.status || "") === "completed") {
        return res.json({ message: "Appointment completed.", appointment: await presentRow("appointments", appointment) });
      }
      // Completion feeds earnings, so an unpaid visit that was never confirmed
      // must not be able to reach it.
      if (visitAwaitsPayment(appointment)) {
        return res.status(422).json({ message: "Confirm this appointment before completing it — the patient has not paid yet." });
      }
      const patch = { status: "completed" };
      const ended = new Date();
      const start = appointment.started_at || appointment.confirmed_at || appointment.updated_at || appointment.created_at;
      if (await hasColumn("appointments", "completed_at")) patch.completed_at = ended;
      if (await hasColumn("appointments", "ended_at")) patch.ended_at = ended;
      if (await hasColumn("appointments", "duration_minutes")) {
        const minutes = durationMinutes(start, ended);
        if (minutes != null) patch.duration_minutes = minutes;
      }
      if (await hasColumn("appointments", "duration_seconds")) {
        const exactSeconds = ageSeconds(start, ended);
        if (exactSeconds != null) patch.duration_seconds = Math.max(1, exactSeconds);
      }
      await update("appointments", appointment.id, patch);
      const updated = await one("SELECT * FROM appointments WHERE id = ?", [appointment.id]);
      notifyVisitCompleted(updated || appointment, "appointment").catch(() => null);
      res.json({ message: "Appointment completed.", appointment: await presentRow("appointments", updated) });
    } catch (error) {
      next(error);
    }
  });

  router.get([
    "/patient/instant-consultations/ready",
    "/patient/instant-consultations/active-session",
    "/patient/instant-consultations/active-session/live",
  ], requireAuth, async (req, res, next) => {
    try {
      const table = await instantTable();
      if (!table) return res.json({ data: null });
      const patient = await tableExists("patients")
        ? await one("SELECT id FROM patients WHERE user_id = ? LIMIT 1", [req.user.id]).catch(() => null)
        : null;
      const clauses = [];
      const params = [];
      if (patient?.id && await hasColumn(table, "patient_id")) {
        clauses.push("patient_id = ?");
        params.push(patient.id);
      }
      if (await hasColumn(table, "user_id")) {
        clauses.push("user_id = ?");
        params.push(req.user.id);
      }
      if (req.user.email && await hasColumn(table, "guest_email")) {
        clauses.push("guest_email = ?");
        params.push(req.user.email);
      }
      if (req.user.phone && await hasColumn(table, "guest_phone")) {
        clauses.push("guest_phone = ?");
        params.push(req.user.phone);
      }
      if (!clauses.length) return res.json({ data: null });
      const row = await one(
        `SELECT * FROM \`${table}\` WHERE (${clauses.join(" OR ")}) AND LOWER(status) NOT IN ('expired','cancelled','canceled','declined','rejected','no_show','completed','done') ORDER BY id DESC LIMIT 1`,
        params,
      ).catch(() => null);
      if (!row || !canJoinInstant(row)) return res.json({ data: null });
      await markGuestPasswordUsed(req.user.id).catch(() => null);
      const roomName = row.daily_room_name || row.room_name || `instant-${row.id}`;
      res.json({
        data: {
          id: row.id,
          status: row.status,
          guest_name: row.guest_name || req.user.name || "Patient",
          room_name: roomName,
          room_url: row.daily_room_url || row.room_url || `/consultation/${roomName}`,
          daily_guest_token: callToken({
            room: roomName,
            role: "patient",
            consultationId: row.id,
            name: row.guest_name || req.user.name || "Patient",
          }),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Mints a patient WebRTC token, so the id is treated as a capability: the
  // caller must own the row. Booked ids are resolved here too, which keeps this
  // route from falling through to the unscoped generic GET-by-id.
  router.get("/patient/quick/:id", requireAuth, async (req, res, next) => {
    try {
      const table = (await tableExists("instant_consultation_requests"))
        ? "instant_consultation_requests"
        : "instant_consultations";
      const row = await tableExists(table)
        ? await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]).catch(() => null)
        : null;
      if (row && !(await patientOwnsInstant(row, req.user))) {
        return res.status(403).json({ message: "This consultation belongs to another patient." });
      }
      // A completed row still resolves here (the summary lookup needs it), but an
      // expired or declined one must not hand out a room.
      if (row && visitIsClosed(row)) {
        return res.status(422).json({ message: "This consultation is no longer open." });
      }
      if (!row) {
        const appointment = await tableExists("appointments")
          ? await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]).catch(() => null)
          : null;
        if (!appointment) return next();
        if (!(await patientOwnsAppointment(appointment, req.user))) {
          return res.status(403).json({ message: "This appointment belongs to another patient." });
        }
        return res.json(await presentRow("appointments", appointment));
      }
      if (!canJoinInstant(row)) {
        return res.status(422).json({ message: "Pay for this consultation before joining the video call." });
      }
      await markGuestPasswordUsed(req.user.id).catch(() => null);
      const roomName = row.daily_room_name || row.room_name || `instant-${row.id}`;
      res.json({
        id: row.id,
        status: row.status,
        booking_type: "instant",
        daily_room_name: roomName,
        daily_room_url: row.daily_room_url || row.room_url || `/consultation/${roomName}`,
        daily_guest_token: callToken({
          room: roomName,
          role: "patient",
          consultationId: row.id,
          name: row.guest_name || req.user?.name || "Patient",
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  // Cancelling used to reach the generic hard DELETE, which destroyed the record
  // and left the doctor's slot marked as booked forever.
  router.delete("/patient/appointments/:appointmentId", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.appointmentId]).catch(() => null);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      if (!(await patientOwnsAppointment(appointment, req.user))) {
        return res.status(403).json({ message: "This appointment belongs to another patient." });
      }
      const status = String(appointment.status || "").toLowerCase();
      if (["in_progress", "accepted", "completed", "done"].includes(status)) {
        return res.status(422).json({ message: "This visit has already started, so it cannot be cancelled here. Ask the doctor or support to close it." });
      }
      if (status === "cancelled" || status === "canceled") {
        return res.json({ message: "This appointment is already cancelled." });
      }
      const patch = { status: "cancelled" };
      if (await hasColumn("appointments", "cancelled_at")) patch.cancelled_at = new Date();
      if (await hasColumn("appointments", "cancellation_reason")) patch.cancellation_reason = req.body?.reason ?? null;
      // payment_status keeps the money trail: a paid visit stays recorded as paid
      // even after the patient cancels, and 'cancelled' is not a value the column
      // is guaranteed to accept.
      await update("appointments", appointment.id, patch);
      await releaseSlot(appointment);
      const updated = await presentRow("appointments", await one("SELECT * FROM appointments WHERE id = ?", [appointment.id]));
      res.json({ message: "Appointment cancelled.", appointment: updated });
    } catch (error) {
      next(error);
    }
  });

  router.post("/patient/appointments/:appointmentId/reschedule", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.appointmentId]).catch(() => null);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      if (!(await patientOwnsAppointment(appointment, req.user))) {
        return res.status(403).json({ message: "This appointment belongs to another patient." });
      }
      const status = String(appointment.status || "").toLowerCase();
      if (["cancelled", "canceled", "expired", "completed", "done", "in_progress", "accepted"].includes(status)) {
        return res.status(422).json({ message: "This appointment can no longer be moved." });
      }
      const date = String(req.body?.appointment_date || "").slice(0, 10);
      const time = String(req.body?.appointment_time || "");
      if (!date || !time) return res.status(422).json({ message: "Choose a new date and time." });
      if (appointmentStartIsInPast(date, time)) {
        return res.status(422).json({ message: "Choose a time later today, or another day." });
      }
      const taken = await appointmentCollision(appointment.doctor_id, date, time, appointment.id);
      if (taken) {
        return res.status(409).json({ message: "That slot is already booked. Choose another time.", collision_id: taken.id });
      }
      const slot = await bookableSlot(appointment.doctor_id, date, time);
      if (slot.found && !slot.bookable) {
        return res.status(409).json({ message: "This doctor has closed that slot. Choose another time." });
      }
      const oldSlot = await bookableSlot(appointment.doctor_id, appointment.appointment_date, appointment.appointment_time);
      if (oldSlot.found && slot.found && oldSlot.slot.id === slot.slot.id) {
        return res.json({ message: "This appointment is already at that time.", appointment: await presentRow("appointments", appointment) });
      }
      // Free the old minute before claiming the new one: while the link column
      // still points at this appointment, releasing it would clear the new slot.
      await releaseSlot(appointment);
      await update("appointments", appointment.id, {
        appointment_date: date,
        appointment_time: time,
        status: "pending",
      });
      if (slot.found && (await claimSlot(slot.slot.id, appointment.id)) === false) {
        await update("appointments", appointment.id, {
          appointment_date: String(appointment.appointment_date).slice(0, 10),
          appointment_time: appointment.appointment_time,
          status: appointment.status,
        }).catch(() => null);
        if (oldSlot.found) await claimSlot(oldSlot.slot.id, appointment.id).catch(() => null);
        return res.status(409).json({ message: "That slot was taken a moment ago. Choose another time." });
      }
      const updated = await presentRow("appointments", await one("SELECT * FROM appointments WHERE id = ?", [appointment.id]));
      res.json({ message: "Appointment rescheduled. The doctor will confirm the new time.", appointment: updated });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/dashboard", requireAuth, requireRole("admin", "moderator", "finance", "help_desk"), async (req, res, next) => {
    try {
      const alive = async (table) => (await hasColumn(table, "deleted_at")) ? "deleted_at IS NULL" : "1=1";
      const count = async (sql, params = []) => Number((await one(sql, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const sum = async (sql, params = []) => Number((await one(sql, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const like = req.query.q ? likeContains(req.query.q) : null;
      const userFilter = like ? " AND (name LIKE ? ESCAPE '\\\\' OR email LIKE ? ESCAPE '\\\\' OR phone LIKE ? ESCAPE '\\\\')" : "";
      const userParams = like ? [like, like, like] : [];
      const roleCount = async (table) => {
        if (!(await tableExists(table))) return 0;
        if (!like || !(await hasColumn(table, "user_id"))) return count(`SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${await alive(table)}`);
        const deleted = (await hasColumn(table, "deleted_at")) ? "t.deleted_at IS NULL" : "1=1";
        return count(
          `SELECT COUNT(*) AS total FROM \`${table}\` t JOIN users u ON u.id = t.user_id WHERE ${deleted} AND (u.name LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\' OR u.phone LIKE ? ESCAPE '\\\\')`,
          userParams,
        );
      };
      const dateColumn = async (table) => {
        for (const column of ["appointment_date", "scheduled_at", "date", "created_at", "paid_at"]) {
          if (await hasColumn(table, column)) return column;
        }
        return null;
      };
      const dateClause = async (table) => {
        const column = await dateColumn(table);
        if (!column) return { sql: "", params: [] };
        const day = kigaliDaySql(column);
        if (req.query.date) return { sql: ` AND ${day} = ?`, params: [String(req.query.date).slice(0, 10)] };
        const params = [];
        let sql = "";
        if (req.query.date_from) { sql += ` AND ${day} >= ?`; params.push(String(req.query.date_from).slice(0, 10)); }
        if (req.query.date_to) { sql += ` AND ${day} <= ?`; params.push(String(req.query.date_to).slice(0, 10)); }
        return { sql, params };
      };

      const appointmentDates = await dateClause("appointments");
      const paymentDates = await dateClause("payments");
      const appointmentAlive = await alive("appointments");
      const patientDeleted = (await tableExists("users") && await hasColumn("users", "deleted_at"))
        ? " AND u.deleted_at IS NULL"
        : "";
      const patientsByRole = await tableExists("model_has_roles") && await tableExists("roles")
        ? await count(`SELECT COUNT(DISTINCT m.model_id) AS total FROM model_has_roles m JOIN roles r ON r.id = m.role_id JOIN users u ON u.id = m.model_id WHERE r.name = 'patient'${patientDeleted}`)
        : 0;
      const patients = patientsByRole || await roleCount("patients");
      const doctors = await roleCount("doctors");
      const doctorsPending = await tableExists("doctors") && await hasColumn("doctors", "status")
        ? await count("SELECT COUNT(*) AS total FROM doctors WHERE LOWER(COALESCE(status,'')) IN ('pending','submitted','in_review')")
        : 0;
      const doctorsActive = await tableExists("doctors") && await hasColumn("doctors", "status")
        ? await count("SELECT COUNT(*) AS total FROM doctors WHERE LOWER(COALESCE(status,'')) IN ('approved','active')")
        : doctors;
      const pharmacies = await roleCount("pharmacies");
      const hospitals = await roleCount("hospitals");
      const users = await count(`SELECT COUNT(*) AS total FROM users WHERE ${await alive("users")}${userFilter}`, userParams);
      const appointmentsTotal = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive}${appointmentDates.sql}`, appointmentDates.params);
      const appointmentsPending = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive} AND status = 'pending'${appointmentDates.sql}`, appointmentDates.params);
      const appointmentDay = await dateColumn("appointments");
      const appointmentsToday = appointmentDay
        ? await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive} AND ${kigaliDaySql(appointmentDay)} = ${kigaliTodaySql()}`)
        : 0;
      const amountColumn = (await hasColumn("payments", "amount")) ? "amount" : (await hasColumn("payments", "total_amount")) ? "total_amount" : null;
      const paid = "status IN ('paid','completed','success','successful')";
      const paymentAlive = await alive("payments");
      const revenue = amountColumn
        ? await sum(`SELECT COALESCE(SUM(\`${amountColumn}\`), 0) AS total FROM payments WHERE ${paymentAlive} AND ${paid}${paymentDates.sql}`, paymentDates.params)
        : 0;
      const paymentClock = (await hasColumn("payments", "paid_at")) && (await hasColumn("payments", "created_at"))
        ? "DATE(DATE_ADD(COALESCE(paid_at, created_at), INTERVAL 2 HOUR))"
        : kigaliDaySql("created_at");
      const revenueToday = amountColumn
        ? await sum(`SELECT COALESCE(SUM(\`${amountColumn}\`), 0) AS total FROM payments WHERE ${paymentAlive} AND ${paid} AND ${paymentClock} = ${kigaliTodaySql()}`)
        : 0;
      const pendingPayments = await count(`SELECT COUNT(*) AS total FROM payments WHERE ${paymentAlive} AND status = 'pending'`);
      const certificateAlive = await alive("fitness_certificates");
      const certificatesPending = await count(`SELECT COUNT(*) AS total FROM fitness_certificates WHERE ${certificateAlive} AND status IN ('pending','in_review','submitted','review')`);
      const certificatesApproved = await count(`SELECT COUNT(*) AS total FROM fitness_certificates WHERE ${certificateAlive} AND status IN ('approved','issued','signed','completed')`);
      const certificatesAwaitingPayment = await count(`SELECT COUNT(*) AS total FROM fitness_certificates WHERE ${certificateAlive} AND status = 'awaiting_payment'`);
      const certificatesRevenue = amountColumn && (await hasColumn("payments", "payable_type"))
        ? await sum(
          `SELECT COALESCE(SUM(\`${amountColumn}\`), 0) AS total FROM payments
           WHERE ${paymentAlive} AND ${paid} AND payable_type LIKE '%fitness%'`,
        )
        : 0;
      const instantColumns = [];
      for (const name of ["started_at", "accepted_at", "created_at", "updated_at"]) {
        if (await tableExists("instant_consultation_requests") && await hasColumn("instant_consultation_requests", name)) instantColumns.push(name);
      }
      const activeConsultations = await tableExists("instant_consultation_requests")
        ? await count(`SELECT COUNT(*) AS total FROM instant_consultation_requests WHERE LOWER(status) IN ('confirmed','accepted','in_progress') AND ${freshInstantSql(instantColumns)}`)
        : await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive} AND status IN ('in_progress','active','ongoing')`);

      res.json({
        status: true,
        data: {
          users: {
            patients,
            doctors: doctorsActive,
            doctors_pending: doctorsPending,
            doctors_total: doctors,
            pharmacies,
            hospitals,
            total: users,
          },
          instant_consultations: { active: activeConsultations },
          appointments: { today: appointmentsToday, pending: appointmentsPending, total: appointmentsTotal },
          payments: {
            total_revenue: String(revenue),
            revenue_today: String(revenueToday),
            pending_count: pendingPayments,
            currency: "RWF",
          },
          certificates: {
            pending: certificatesPending,
            approved: certificatesApproved,
            awaiting_payment: certificatesAwaitingPayment,
            paid_revenue: String(certificatesRevenue),
          },
          quick_consultations: { active: activeConsultations },
        },
        filters_applied: {
          q: req.query.q || undefined,
          date: req.query.date || undefined,
          date_from: req.query.date_from || undefined,
          date_to: req.query.date_to || undefined,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/users", requireAuth, requireRole("admin", "moderator", "finance", "help_desk"), async (req, res, next) => {
    try {
      const { page: pageNo, perPage, offset } = pageArgs(req);
      const role = req.query.role ? String(req.query.role) : "";
      const status = req.query.status ? String(req.query.status) : "";
      const term = req.query.search || req.query.q;
      const profileTable = { doctor: "doctors", patient: "patients", hospital: "hospitals", pharmacy: "pharmacies" }[role];
      const filters = ["1=1"];
      const params = [];
      if (await hasColumn("users", "deleted_at")) filters.push("users.deleted_at IS NULL");
      // A clinical tab is the profile table. Admin and staff tabs are role assignments.
      if (profileTable && (await tableExists(profileTable)) && (await hasColumn(profileTable, "user_id"))) {
        filters.push(`EXISTS (SELECT 1 FROM \`${profileTable}\` profile WHERE profile.user_id = users.id)`);
      } else if (role) {
        filters.push(`EXISTS (
          SELECT 1 FROM model_has_roles m
          JOIN roles r ON r.id = m.role_id
          WHERE m.model_id = users.id AND r.name = ?
        )`);
        params.push(role);
      }
      if (status && profileTable && (await tableExists(profileTable)) && (await hasColumn(profileTable, "status"))) {
        if (status === "active") {
          filters.push(`EXISTS (SELECT 1 FROM \`${profileTable}\` profile WHERE profile.user_id = users.id AND profile.status IN ('active','approved'))`);
        } else if (status === "pending" && profileTable === "doctors") {
          filters.push(`EXISTS (SELECT 1 FROM \`${profileTable}\` profile WHERE profile.user_id = users.id AND profile.status IN ('pending','submitted','action_requested'))`);
        } else {
          filters.push(`EXISTS (SELECT 1 FROM \`${profileTable}\` profile WHERE profile.user_id = users.id AND profile.status = ?)`);
          params.push(status);
        }
      } else if (status && (await hasColumn("users", "status"))) {
        filters.push("`users`.`status` = ?");
        params.push(status);
      }
      if (term) {
        filters.push("(users.name LIKE ? ESCAPE '\\\\' OR users.email LIKE ? ESCAPE '\\\\' OR users.phone LIKE ? ESCAPE '\\\\')");
        const like = likeContains(term);
        params.push(like, like, like);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const totalRow = await one(`SELECT COUNT(DISTINCT users.id) AS total FROM users ${where}`, params).catch(() => ({ total: 0 }));
      const rows = await q(`SELECT users.* FROM users ${where} ORDER BY users.id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
      const page = paginateList({
        data: await presentRows("users", rows),
        total: Number(totalRow?.total || 0),
        page: pageNo,
        perPage,
        path: publicPagePath(req),
      });
      page.data = await Promise.all(page.data.map(async (user) => {
        const roles = await q(
          `SELECT r.id, r.name FROM model_has_roles m JOIN roles r ON r.id = m.role_id
           WHERE m.model_id = ?
           ORDER BY CASE r.name
             WHEN 'admin' THEN 1
             WHEN 'doctor' THEN 2
             WHEN 'hospital' THEN 3
             WHEN 'pharmacy' THEN 4
             WHEN 'moderator' THEN 5
             WHEN 'finance' THEN 6
             WHEN 'help_desk' THEN 7
             WHEN 'patient' THEN 9
             ELSE 8
           END, r.id`,
          [user.id],
        );

        // If the user has no avatar on the users table, pull the profile image
        // from their role profile (doctor/hospital/pharmacy/patient).
        let avatar = user.avatar || null;
        if (!avatar) {
          const profileTables = [
            { table: "doctors",   col: "image" },
            { table: "hospitals", col: "image" },
            { table: "pharmacies",col: "image" },
            { table: "patients",  col: "avatar" },
          ];
          for (const { table, col } of profileTables) {
            if (!(await tableExists(table)) || !(await hasColumn(table, col)) || !(await hasColumn(table, "user_id"))) continue;
            const profile = await one(`SELECT \`${col}\` FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [user.id]).catch(() => null);
            if (profile?.[col]) {
              avatar = profile[col];
              break;
            }
          }
        }

        // Normalise to a browser-loadable URL: relative paths like
        // "doctors/doctor_6_...webp" live under /minio/mediconnect-avatars/
        // Full https://mediconnect.rw/api/v1/media/... are served as-is.
        if (avatar && !avatar.startsWith("http") && !avatar.startsWith("/")) {
          avatar = `https://mediconnect.rw/minio/mediconnect-avatars/${avatar}`;
        }

        let status = user.status;
        let profileStatus = null;
        const wanted = req.query.role ? String(req.query.role) : (roles[0]?.name || "");
        const statusTable = { doctor: "doctors", hospital: "hospitals", pharmacy: "pharmacies", patient: "patients" }[wanted];
        if (statusTable && (await tableExists(statusTable)) && (await hasColumn(statusTable, "status")) && (await hasColumn(statusTable, "user_id"))) {
          const profile = await one(`SELECT id, status FROM \`${statusTable}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [user.id]).catch(() => null);
          if (profile?.status) {
            profileStatus = profile.status;
            status = profile.status === "approved"
              ? "active"
              : (profile.status === "submitted" || profile.status === "action_requested" ? "pending" : profile.status);
          }
        }
        return { ...user, avatar, roles, status, profile_status: profileStatus };
      }));
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/admin/users/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const retired = await retireUser(Number(req.params.id));
      if (!retired) return res.status(404).json({ message: "User not found." });
      res.json({ message: "User suspended.", status: "suspended" });
    } catch (error) {
      next(error);
    }
  });

  router.post(["/admin/users/:id/reset-credentials", "/admin/users/:id/reset-password"], requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const target = await one("SELECT * FROM users WHERE id = ?", [req.params.id]);
      if (!target) return res.status(404).json({ message: "User not found." });
      const patch = {};
      const changes = [];
      let temporaryPassword = null;

      if (req.body?.email != null && String(req.body.email).trim() !== "" && String(req.body.email).trim() !== String(target.email || "")) {
        const nextEmail = String(req.body.email).trim().toLowerCase();
        if (!clientMayClaimEmail(nextEmail)) {
          return res.status(422).json({ message: "Choose a different email address." });
        }
        const collision = await one("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [nextEmail, target.id]);
        if (collision) return res.status(422).json({ message: "That email address is already in use." });
        patch.email = nextEmail;
        changes.push("email");
      }

      if (req.body?.phone != null && String(req.body.phone).trim() !== "") {
        const nextPhone = String(req.body.phone).trim();
        if (nextPhone !== String(target.phone || "")) {
          patch.phone = nextPhone;
          changes.push("phone");
        }
      }
      if (req.body?.country_code != null && String(req.body.country_code).trim() !== "") {
        patch.country_code = String(req.body.country_code).trim();
      }

      const explicitPassword = req.body?.password != null && String(req.body.password) !== "" ? String(req.body.password) : null;
      const isLegacyResetRoute = req.path.endsWith("/reset-password");
      if (explicitPassword || (isLegacyResetRoute && !changes.length)) {
        const plainPassword = explicitPassword || `MC-${crypto.randomBytes(4).toString("hex")}!`;
        if (plainPassword.length < 8) {
          return res.status(422).json({ message: "Password must be at least 8 characters." });
        }
        patch.password = await hashPassword(plainPassword);
        if (await hasColumn("users", "password_must_change")) patch.password_must_change = explicitPassword ? 0 : 1;
        if (!explicitPassword) temporaryPassword = plainPassword;
        changes.push("password");
      }

      if (!changes.length && !Object.keys(patch).length) {
        return res.status(422).json({ message: "Provide at least one credential to update." });
      }

      const known = await knownWrite("users", patch);
      if (Object.keys(known.payload).length) await update("users", target.id, known.payload);
      if (changes.includes("password") && await tableExists("personal_access_tokens")) {
        await pool.query("DELETE FROM personal_access_tokens WHERE tokenable_id = ?", [target.id]).catch(() => null);
      }
      const updated = await one("SELECT * FROM users WHERE id = ?", [target.id]);
      res.json({
        message: "Credentials updated.",
        ...(temporaryPassword ? { temporary_password: temporaryPassword } : {}),
        changes,
        user: {
          id: updated.id,
          name: updated.name || "",
          email: updated.email || "",
          phone: updated.phone || "",
          country_code: updated.country_code || "",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/users/:id/revoke-sessions", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const target = await one("SELECT id FROM users WHERE id = ?", [req.params.id]);
      if (!target) return res.status(404).json({ message: "User not found." });
      await disableInstantOnLogout(target.id);
      if (await tableExists("personal_access_tokens")) {
        await pool.query("DELETE FROM personal_access_tokens WHERE tokenable_id = ?", [target.id]).catch(() => null);
      }
      res.json({ message: "All active sessions revoked." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/users/:id/resend-verification", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      await ensureEnumValue("otps", "type", "verification").catch(() => null);
      const target = await one("SELECT * FROM users WHERE id = ?", [req.params.id]);
      if (!target) return res.status(404).json({ message: "User not found." });
      const code = String(crypto.randomInt(100000, 1000000));
      await insert("otps", {
        email: target.email || null,
        phone: target.phone || null,
        country_code: target.country_code || null,
        code,
        type: "verification",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "),
      }).catch(() => null);
      if (target.email) {
        const lang = languageFromUserRow(target);
        const html = buildOtpEmail({ code, type: "verification", recipientName: target.name, lang });
        sendMail({
          to: target.email,
          subject: "MediConnect — Verification code",
          text: `Your MediConnect verification code is: ${code}\n\nThis code expires in 10 minutes.`,
          html,
        }).catch(() => null);
      }
      res.json({ message: "Verification code sent." });
    } catch (error) {
      next(error);
    }
  });

  const STAFF_ROLE_NAMES = ["moderator", "finance", "help_desk"];

  async function shapeStaffMember(row) {
    if (!row) return null;
    const roles = await q(
      `SELECT r.id, r.name FROM model_has_roles m JOIN roles r ON r.id = m.role_id WHERE m.model_id = ? ORDER BY r.id`,
      [row.id],
    ).catch(() => []);
    const presented = await presentRow("users", row);
    return { ...presented, roles };
  }

  router.get("/admin/staff", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const { page: pageNo, perPage, offset } = pageArgs(req);
      const role = req.query.role ? String(req.query.role) : "";
      const term = req.query.search || req.query.q;
      const allowedRoles = role && STAFF_ROLE_NAMES.includes(role) ? [role] : STAFF_ROLE_NAMES;
      const rolePlaceholders = allowedRoles.map(() => "?").join(", ");
      const filters = [
        `EXISTS (SELECT 1 FROM model_has_roles m JOIN roles r ON r.id = m.role_id WHERE m.model_id = users.id AND r.name IN (${rolePlaceholders}))`,
      ];
      const params = [...allowedRoles];
      if (await hasColumn("users", "deleted_at")) filters.push("users.deleted_at IS NULL");
      if (term) {
        filters.push("(users.name LIKE ? ESCAPE '\\\\' OR users.email LIKE ? ESCAPE '\\\\' OR users.phone LIKE ? ESCAPE '\\\\')");
        const like = likeContains(term);
        params.push(like, like, like);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const totalRow = await one(`SELECT COUNT(DISTINCT users.id) AS total FROM users ${where}`, params).catch(() => ({ total: 0 }));
      const rows = await q(`SELECT users.* FROM users ${where} ORDER BY users.id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
      const data = await Promise.all(rows.map(shapeStaffMember));
      res.json(paginateList({
        data,
        total: Number(totalRow?.total || 0),
        page: pageNo,
        perPage,
        path: publicPagePath(req),
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/staff", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const role = String(req.body?.role || "").trim();
      if (!STAFF_ROLE_NAMES.includes(role)) {
        return res.status(422).json({ message: "Choose a valid staff role (moderator, finance, or help_desk)." });
      }
      const email = String(req.body?.email || "").trim().toLowerCase();
      const name = String(req.body?.name || "").trim();
      const password = String(req.body?.password || "");
      if (!name || !email) return res.status(422).json({ message: "Name and email are required." });
      if (password.length < 8) return res.status(422).json({ message: "Password must be at least 8 characters." });
      let user = await one("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
      let created = false;
      if (!user) {
        const known = await knownWrite("users", {
          name,
          email,
          phone: req.body?.phone || null,
          country_code: req.body?.country_code || null,
          password: await hashPassword(password),
          status: "active",
          active_role: role,
          is_verified: 1,
        });
        const id = await insert("users", known.payload);
        user = await one("SELECT * FROM users WHERE id = ?", [id]);
        created = true;
      } else {
        const known = await knownWrite("users", {
          name,
          phone: req.body?.phone || user.phone,
          password: await hashPassword(password),
          status: "active",
          active_role: role,
        });
        if (Object.keys(known.payload).length) await update("users", user.id, known.payload);
      }
      await ensureRole(user.id, role);
      const shaped = await shapeStaffMember(await one("SELECT * FROM users WHERE id = ?", [user.id]));
      res.status(created ? 201 : 200).json({ message: "Staff member saved.", user: shaped });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/staff/:id/role", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const role = String(req.body?.role || "").trim();
      if (!STAFF_ROLE_NAMES.includes(role)) {
        return res.status(422).json({ message: "Choose a valid staff role." });
      }
      const target = await one("SELECT * FROM users WHERE id = ?", [req.params.id]);
      if (!target) return res.status(404).json({ message: "Staff member not found." });
      const staffRoleRows = await q(
        `SELECT id FROM roles WHERE name IN (${STAFF_ROLE_NAMES.map(() => "?").join(", ")})`,
        STAFF_ROLE_NAMES,
      ).catch(() => []);
      if (staffRoleRows.length) {
        await pool.query(
          `DELETE FROM model_has_roles WHERE model_id = ? AND role_id IN (${staffRoleRows.map(() => "?").join(", ")})`,
          [target.id, ...staffRoleRows.map((r) => r.id)],
        ).catch(() => null);
      }
      await ensureRole(target.id, role);
      await setActiveRole(target.id, role);
      const shaped = await shapeStaffMember(await one("SELECT * FROM users WHERE id = ?", [target.id]));
      res.json({ message: "Staff role updated.", user: shaped });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/staff/:id/password", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const target = await one("SELECT id FROM users WHERE id = ?", [req.params.id]);
      if (!target) return res.status(404).json({ message: "Staff member not found." });
      const password = String(req.body?.password || "");
      if (password.length < 8) return res.status(422).json({ message: "Password must be at least 8 characters." });
      if (req.body?.password_confirmation != null && password !== String(req.body.password_confirmation)) {
        return res.status(422).json({ message: "Password confirmation does not match." });
      }
      await update("users", target.id, { password: await hashPassword(password) });
      if (await tableExists("personal_access_tokens")) {
        await pool.query("DELETE FROM personal_access_tokens WHERE tokenable_id = ?", [target.id]).catch(() => null);
      }
      res.json({ message: "Staff password updated." });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/staff/:id/suspend", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const target = await one("SELECT id FROM users WHERE id = ?", [req.params.id]);
      if (!target) return res.status(404).json({ message: "Staff member not found." });
      if (await hasColumn("users", "status")) await update("users", target.id, { status: "suspended" });
      if (await tableExists("personal_access_tokens")) {
        await pool.query("DELETE FROM personal_access_tokens WHERE tokenable_id = ?", [target.id]).catch(() => null);
      }
      res.json({ message: "Staff member suspended." });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/staff/:id/activate", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const target = await one("SELECT id FROM users WHERE id = ?", [req.params.id]);
      if (!target) return res.status(404).json({ message: "Staff member not found." });
      if (await hasColumn("users", "status")) await update("users", target.id, { status: "active" });
      res.json({ message: "Staff member activated." });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/admin/staff/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const retired = await retireUser(Number(req.params.id));
      if (!retired) return res.status(404).json({ message: "Staff member not found." });
      res.json({ message: "Staff member removed." });
    } catch (error) {
      next(error);
    }
  });

  router.get("/notifications", requireAuth, async (req, res, next) => {
    try {
      const page = await listTable(req, "notifications", "notifications");
      if (await hasColumn("notifications", "notifiable_id")) {
        const { page: pageNo, perPage, offset } = pageArgs(req);
        const total = await countWhere("notifications", "WHERE notifiable_id = ?", [req.user.id]);
        const data = await presentRows("notifications", await q("SELECT * FROM notifications WHERE notifiable_id = ? ORDER BY id DESC LIMIT ? OFFSET ?", [req.user.id, perPage, offset]));
        const path = publicPagePath(req);
        return res.json(paginateList({ data, total, page: pageNo, perPage, path }));
      }
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  function allowPublic(req, res, next) {
    if (req.params.scope === "public") return next("router");
    return requireAuth(req, res, next);
  }

  const teamUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
  const requireTeamManager = requireRole("admin", "moderator", "finance", "help_desk");

  function saveTeamImage(file, prefix) {
    const dir = path.join(process.env.UPLOAD_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "storage"), "doctors-webp");
    fs.mkdirSync(dir, { recursive: true });
    const name = `${prefix}_${Date.now()}.webp`;
    fs.writeFileSync(path.join(dir, name), file.buffer);
    return `https://mediconnect.rw/api/v1/media/${name}`;
  }

  function teamFields(body, files) {
    const payload = { ...(body ?? {}) };
    delete payload.photo;
    delete payload.icon;
    if (payload.joined_at === "") payload.joined_at = null;
    if (files?.photo?.[0]) payload.photo = saveTeamImage(files.photo[0], "team");
    if (files?.icon?.[0]) payload.icon = saveTeamImage(files.icon[0], "team_icon");
    return payload;
  }

  async function teamMember(id) {
    return withTeamPhoto(await presentRow("team_members", await one("SELECT * FROM team_members WHERE id = ?", [id])));
  }

  router.post("/admin/team", requireAuth, requireTeamManager, teamUpload.fields([{ name: "photo", maxCount: 1 }, { name: "icon", maxCount: 1 }]), async (req, res, next) => {
    try {
      const id = await insert("team_members", teamFields(req.body, req.files));
      const member = await teamMember(id);
      res.status(201).json({ message: "Saved.", member, data: member });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/team/:id/photo", requireAuth, requireTeamManager, teamUpload.single("photo"), async (req, res, next) => {
    try {
      if (!req.file) return res.status(422).json({ message: "Photo is required." });
      const photo = saveTeamImage(req.file, `team_${req.params.id}`);
      await update("team_members", req.params.id, { photo });
      const member = await teamMember(req.params.id);
      if (!member) return res.status(404).json({ message: "Member not found." });
      res.json({ message: "Photo uploaded.", photo_url: member.photo_url, member });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/team/:id/icon", requireAuth, requireTeamManager, teamUpload.single("icon"), async (req, res, next) => {
    try {
      if (!req.file) return res.status(422).json({ message: "Icon is required." });
      const icon = saveTeamImage(req.file, `team_icon_${req.params.id}`);
      await update("team_members", req.params.id, { icon });
      const member = await teamMember(req.params.id);
      if (!member) return res.status(404).json({ message: "Member not found." });
      res.json({ message: "Icon uploaded.", icon_url: member.icon_url, member });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/admin/team/:id/toggle-active", requireAuth, requireTeamManager, async (req, res, next) => {
    try {
      const row = await one("SELECT id, is_active FROM team_members WHERE id = ?", [req.params.id]);
      if (!row) return res.status(404).json({ message: "Member not found." });
      const isActive = !(row.is_active === 1 || row.is_active === true);
      await update("team_members", req.params.id, { is_active: isActive ? 1 : 0 });
      res.json({ message: "Updated.", is_active: isActive });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/team/:id", requireAuth, requireTeamManager, teamUpload.fields([{ name: "photo", maxCount: 1 }, { name: "icon", maxCount: 1 }]), async (req, res, next) => {
    try {
      await update("team_members", req.params.id, teamFields(req.body, req.files));
      const member = await teamMember(req.params.id);
      if (!member) return res.status(404).json({ message: "Member not found." });
      res.json({ message: "Updated.", member, data: member });
    } catch (error) {
      next(error);
    }
  });

  const PROFILE_WRITABLE = [
    "specialization", "doctor_degree", "medical_license", "designations",
    "consultation_type", "preferred_language", "bio_en", "bio_fr", "bio_kiny",
    "consultation_fee", "currency", "specialization_fee_id", "sub_specialization",
    "sub_specializations", "years_of_experience", "is_available", "city",
    "instant_consultation",
  ];

  const WORKING_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  function parseDayList(value) {
    const source = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? (() => { try { return JSON.parse(value); } catch { return String(value).split(","); } })()
        : [];
    return [...new Set(source.map((day) => String(day).toLowerCase()).filter((day) => WORKING_DAYS.includes(day)))];
  }

  function kigaliIso(offsetDays = 0) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Kigali",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date()).map((part) => [part.type, part.value]),
    );
    const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }

  async function saveDoctorInsurances(doctorId, insuranceIds) {
    await ensureDoctorSearchFields();
    if (!(await tableExists("doctor_insurances"))) return;
    const ids = [...new Set(insuranceIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    await pool.query("DELETE FROM doctor_insurances WHERE doctor_id = ?", [doctorId]);
    for (const insuranceId of ids) {
      await insert("doctor_insurances", { doctor_id: doctorId, insurance_id: insuranceId });
    }
  }

  async function saveWorkingDays(doctorId, days) {
    if (!(await tableExists("doctor_availability_periods"))) return;
    const clean = parseDayList(days);
    await pool.query(
      "DELETE FROM doctor_availability_periods WHERE doctor_id = ? AND label = 'registration'",
      [doctorId],
    );
    if (!clean.length) return;
    await insert("doctor_availability_periods", {
      doctor_id: doctorId,
      from_date: kigaliIso(0),
      to_date: kigaliIso(365),
      days_of_week: clean,
      start_time: "08:00:00",
      end_time: "17:00:00",
      slot_duration_minutes: 30,
      buffer_minutes: 0,
      type: "online",
      label: "registration",
      is_active: 1,
    });
  }

  async function firstExistingTable(names) {
    for (const name of names) {
      if (await tableExists(name)) return name;
    }
    return null;
  }

  async function rowsForDoctor(doctorId, tables) {
    const table = await firstExistingTable(tables);
    if (!table || !(await hasColumn(table, "doctor_id"))) return [];
    const rows = await q(`SELECT * FROM \`${table}\` WHERE doctor_id = ? ORDER BY id ASC`, [doctorId]).catch(() => []);
    return presentRows(table, rows);
  }

  function fileRef(value) {
    if (!value) return { path: null, url: null };
    const stored = String(value);
    return { path: stored, url: stored.startsWith("http") ? stored : null };
  }

  async function readSocialLinks(doctor) {
    const fromRow = {};
    for (const key of ["facebook", "twitter", "linkedin", "instagram"]) {
      if (doctor?.[key]) fromRow[key] = doctor[key];
    }
    if (Object.keys(fromRow).length) return fromRow;
    const table = await firstExistingTable(["doctor_social_links", "social_links"]);
    if (!table || !(await hasColumn(table, "doctor_id"))) return null;
    const row = await one(`SELECT * FROM \`${table}\` WHERE doctor_id = ? ORDER BY id DESC LIMIT 1`, [doctor.id]).catch(() => null);
    return row ? presentRow(table, row) : null;
  }

  async function doctorProfileFor(req) {
    const { doctorId } = await currentDoctor(req);
    if (!doctorId) return null;
    const row = await one(
      `SELECT d.*, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar, u.gender AS user_gender
       FROM doctors d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
      [doctorId],
    );
    if (!row) return null;
    const doctor = await presentRow("doctors", row);
    doctor.user = { id: row.user_id, name: row.user_name, avatar: row.user_avatar ?? null };
    doctor.educations = await rowsForDoctor(doctorId, ["doctor_educations", "educations"]);
    doctor.experiences = await rowsForDoctor(doctorId, ["doctor_experiences", "experiences"]);
    doctor.qualifications = await rowsForDoctor(doctorId, ["doctor_qualifications", "qualifications"]);
    doctor.availabilities = await rowsForDoctor(doctorId, ["doctor_availabilities"]);
    doctor.hospitals = [];
    doctor.social_links = await readSocialLinks(doctor);
    doctor.documents = {
      degree_document: fileRef(doctor.degree_document),
      medical_license_document: fileRef(doctor.medical_license_document),
      national_id_document: fileRef(doctor.national_id_document),
      signature: fileRef(doctor.signature),
    };
    doctor.gender = row.user_gender ?? null;
    const insuranceRows = await tableExists("doctor_insurances")
      ? await q(
        `SELECT i.id, i.name
         FROM doctor_insurances di
         JOIN insurances i ON i.id = di.insurance_id
         WHERE di.doctor_id = ?
         ORDER BY i.name`,
        [doctorId],
      ).catch(() => [])
      : [];
    doctor.insurance_ids = insuranceRows.map((item) => item.id);
    doctor.insurances = insuranceRows;
    const periods = await tableExists("doctor_availability_periods")
      ? await q(
        "SELECT days_of_week, label, to_date, is_active FROM doctor_availability_periods WHERE doctor_id = ?",
        [doctorId],
      ).catch(() => [])
      : [];
    const today = kigaliIso(0);
    const activePeriods = periods.filter((period) => period.is_active !== 0 && (!period.to_date || String(period.to_date).slice(0, 10) >= today));
    const labeled = activePeriods.filter((period) => period.label === "registration");
    doctor.working_days = parseDayList((labeled.length ? labeled : activePeriods).flatMap((period) => parseDayList(period.days_of_week)));
    if (!Array.isArray(doctor.sub_specializations)) doctor.sub_specializations = [];
    if (doctor.specialization_fee_id && await tableExists("specialization_fees")) {
      doctor.specialization_fee = await presentRow(
        "specialization_fees",
        await one("SELECT * FROM specialization_fees WHERE id = ?", [doctor.specialization_fee_id]).catch(() => null),
      );
    }
    return doctor;
  }

  router.get("/doctor/profile", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctor = await doctorProfileFor(req);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found." });
      res.json({ doctor });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/profile", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found." });
      await ensureDoctorSearchFields();
      const body = req.body ?? {};
      const fields = {};
      for (const key of PROFILE_WRITABLE) {
        if (Object.prototype.hasOwnProperty.call(body, key)) fields[key] = body[key];
      }
      delete fields.license_expires_at;
      delete fields.license_expiry_reminded_for;
      if (fields.instant_consultation != null) {
        fields.instant_consultation = fields.instant_consultation ? 1 : 0;
      }
      if (Object.keys(fields).length) await update("doctors", doctorId, fields);
      if (body.gender && await hasColumn("users", "gender")) {
        await update("users", req.user.id, { gender: String(body.gender).toLowerCase() });
      }
      if (Array.isArray(body.insurance_ids)) await saveDoctorInsurances(doctorId, body.insurance_ids);
      if (body.specialities || body.specialization || body.specialization_fee_ids || body.specialization_fee_id) {
        await saveDoctorBrowseSpecialities(doctorId, body);
      }
      if (Array.isArray(body.working_days)) await saveWorkingDays(doctorId, body.working_days);
      const review = await submitProfileForReview(doctorId);
      const doctor = await doctorProfileFor(req);
      res.json({
        message: review.review_submitted
          ? "Profile saved and sent to an admin for review."
          : "Profile saved.",
        review_submitted: review.review_submitted,
        doctor,
      });
    } catch (error) {
      next(error);
    }
  });

  const collectionUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

  function saveCollectionFile(file, prefix) {
    const dir = process.env.UPLOAD_DIR
      ? path.join(process.env.UPLOAD_DIR, "doctors-webp")
      : path.resolve("storage", "doctors-webp");
    fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".bin";
    const filename = `${prefix}_${Date.now()}${safeExt}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    return `https://mediconnect.rw/api/v1/media/${filename}`;
  }

  function collectionPayload(req) {
    const body = { ...(req.body ?? {}) };
    const file = req.file
      || (Array.isArray(req.files) ? req.files.find((item) => item.fieldname === "certificate_file") : null);
    if (file) {
      const url = saveCollectionFile(file, "qualification");
      body.certificate_file = url;
      body.certificate_url = url;
    }
    if (!String(body.title || "").trim() && (body.certification_title || body.name)) {
      body.title = body.certification_title || body.name;
    }
    if (body.expires_at === "") body.expires_at = null;
    return body;
  }

  function mountDoctorCollection(urlPath, tables, singular) {
    router.get(`/doctor/${urlPath}`, requireAuth, requireRole("doctor"), async (req, res, next) => {
      try {
        const { doctorId } = await currentDoctor(req);
        const rows = await rowsForDoctor(doctorId, tables);
        res.json({ [urlPath]: rows, [`${singular}s`]: rows, data: rows });
      } catch (error) {
        next(error);
      }
    });

    router.post(`/doctor/${urlPath}`, requireAuth, requireRole("doctor"), collectionUpload.any(), async (req, res, next) => {
      try {
        const { doctorId } = await currentDoctor(req);
        const table = await firstExistingTable(tables);
        if (!table || !(await hasColumn(table, "doctor_id"))) {
          return res.status(422).json({ message: "This section cannot be saved yet." });
        }
        const body = collectionPayload(req);
        if (urlPath === "qualifications" && !String(body.title || "").trim()) {
          return res.status(422).json({ message: "Certification title is required." });
        }
        const known = await knownWrite(table, { ...body, doctor_id: doctorId });
        const id = await insert(table, known.payload);
        const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
        res.status(201).json({ message: "Saved.", [singular]: row, data: row });
      } catch (error) {
        next(error);
      }
    });

    router.put(`/doctor/${urlPath}/:id`, requireAuth, requireRole("doctor"), collectionUpload.any(), async (req, res, next) => {
      try {
        const { doctorId } = await currentDoctor(req);
        const table = await firstExistingTable(tables);
        if (!table || !(await hasColumn(table, "doctor_id"))) {
          return res.status(422).json({ message: "This section cannot be saved yet." });
        }
        const existing = await one(`SELECT id FROM \`${table}\` WHERE id = ? AND doctor_id = ?`, [req.params.id, doctorId]);
        if (!existing) return res.status(404).json({ message: "Record not found." });
        const body = collectionPayload(req);
        delete body.doctor_id;
        if (urlPath === "qualifications" && !String(body.title || "").trim()) {
          return res.status(422).json({ message: "Certification title is required." });
        }
        const known = await knownWrite(table, body);
        if (Object.keys(known.payload).length) await update(table, existing.id, known.payload);
        const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [existing.id]));
        res.json({ message: "Updated.", [singular]: row, data: row });
      } catch (error) {
        next(error);
      }
    });

    router.delete(`/doctor/${urlPath}/:id`, requireAuth, requireRole("doctor"), async (req, res, next) => {
      try {
        const { doctorId } = await currentDoctor(req);
        const table = await firstExistingTable(tables);
        if (!table || !(await hasColumn(table, "doctor_id"))) {
          return res.status(422).json({ message: "This section cannot be saved yet." });
        }
        await pool.query(`DELETE FROM \`${table}\` WHERE id = ? AND doctor_id = ?`, [req.params.id, doctorId]);
        res.json({ message: "Deleted." });
      } catch (error) {
        next(error);
      }
    });
  }

  mountDoctorCollection("education", ["doctor_educations", "educations"], "education");
  mountDoctorCollection("experience", ["doctor_experiences", "experiences"], "experience");
  mountDoctorCollection("qualifications", ["doctor_qualifications", "qualifications"], "qualification");

  router.get("/doctor/social-links", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const doctor = await doctorProfileFor(req);
      res.json({ social_links: doctor?.social_links ?? null });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/social-links/check", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const platform = String(req.body?.platform || "");
      const result = await checkSocialLink(platform, req.body?.url);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/social-links", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      if (!doctorId) return res.status(404).json({ message: "Doctor profile not found." });
      const body = req.body ?? {};
      const fields = {};
      const errors = {};
      for (const key of ["facebook", "twitter", "linkedin", "instagram"]) {
        if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
        const value = body[key] || null;
        if (!value) {
          fields[key] = null;
          continue;
        }
        const result = await checkSocialLink(key, value);
        if (!result.ok) errors[key] = [result.code];
        else fields[key] = result.url || value;
      }
      if (Object.keys(errors).length) {
        return res.status(422).json({ message: "Check the social links.", errors });
      }
      const onDoctor = {};
      for (const [key, value] of Object.entries(fields)) {
        if (await hasColumn("doctors", key)) onDoctor[key] = value;
      }
      if (Object.keys(onDoctor).length) await update("doctors", doctorId, onDoctor);
      const table = await firstExistingTable(["doctor_social_links", "social_links"]);
      if (table && await hasColumn(table, "doctor_id")) {
        const existing = await one(`SELECT id FROM \`${table}\` WHERE doctor_id = ? LIMIT 1`, [doctorId]);
        if (existing) await update(table, existing.id, fields);
        else await insert(table, { doctor_id: doctorId, ...fields });
      }
      const doctor = await doctorProfileFor(req);
      res.json({ message: "Saved.", social_links: doctor?.social_links ?? fields });
    } catch (error) {
      next(error);
    }
  });

  router.get("/doctor/instant-consultations/live-session", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await firstExistingTable(["instant_consultation_requests", "instant_consultations"]);
      if (!table || !(await hasColumn(table, "doctor_id"))) return res.json({ has_live_session: false, data: null });
      const row = await one(
        `SELECT * FROM \`${table}\` WHERE doctor_id = ? AND status IN ('in_progress','accepted') ORDER BY id DESC LIMIT 1`,
        [doctorId],
      ).catch(() => null);
      if (!row) return res.json({ has_live_session: false, data: null });
      const presented = await presentRow(table, row);
      const roomName = row.daily_room_name || row.room_name || `instant-${row.id}`;
      const roomUrl = row.daily_room_url || row.room_url || `/consultation/${roomName}`;
      const doctorToken = instantDoctorToken(row, roomName);
      const payload = {
        ...presented,
        has_live_session: true,
        consultation_id: row.id,
        instant_consultation_request_id: row.id,
        room_name: roomName,
        daily_room_name: roomName,
        room_url: roomUrl,
        token: doctorToken,
        doctor_token: doctorToken,
        daily_doctor_token: doctorToken,
      };
      res.json({ ...payload, data: payload });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:scope/profile", allowPublic, async (req, res, next) => {
    try {
      const table = PROFILE_TABLE[req.params.scope];
      if (!table) return next();
      const row = await one(`SELECT * FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [req.user.id]);
      const data = await presentRow(table, row);
      res.json({ data, [req.params.scope]: data, ...(data ?? {}) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/hospital/prescriptions", requireAuth, requireRole("hospital"), async (req, res, next) => {
    try {
      res.json(await listHospitalPrescriptions(req));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:scope/:resource", allowPublic, async (req, res, next) => {
    try {
      if (isDedicatedResource(req.params.resource)) return next();
      const table = await resolveResourceTable(req.params.scope, req.params.resource);
      if (!table) return next();
      if (req.params.scope !== "admin" && req.user.active_role !== req.params.scope) {
        return res.status(403).json({ message: "You do not have access to this area." });
      }
      if (req.params.scope === "admin" && !["admin", "moderator", "finance", "help_desk"].includes(req.user.active_role)) {
        return res.status(403).json({ message: "You do not have access to this area." });
      }
      res.json(await listTable(req, table, req.params.scope));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:scope/:resource/:id", allowPublic, async (req, res, next) => {
    try {
      if (!/^\d+$/.test(String(req.params.id || ""))) return next();
      if (req.params.resource === "profile") {
        const table = PROFILE_TABLE[req.params.scope];
        if (!table) return next();
        if (req.params.scope === "patient") await ensurePatientRow(req.user);
        const row = await one(`SELECT * FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [req.user.id]);
        return res.json({ data: await presentRow(table, row), ...(await presentRow(table, row)) });
      }
      if (isDedicatedResource(req.params.resource)) return next();
      const table = await resolveResourceTable(req.params.scope, req.params.resource);
      if (!table) return next();
      let raw;
      try {
        raw = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      } catch {
        return res.status(403).json({ message: "You do not have access to this record." });
      }
      if (!raw) return res.status(404).json({ message: "Record not found." });
      if (!(await mayReadRow(req.params.scope, table, raw, req.user))) {
        return res.status(403).json({ message: "You do not have access to this record." });
      }
      let row = await presentRow(table, raw);
      if (table === "appointments") row = await decorateAppointments(row);
      row = await nameVisitRows(table, row);
      if (!row) return res.status(404).json({ message: "Record not found." });
      if (["doctors", "hospitals", "pharmacies", "patients", "users"].includes(table)) {
        [row] = await verifierNames([row]);
      }
      if (table === "team_members") {
        const member = withTeamPhoto(row);
        return res.json({ member, data: member, ...member });
      }
      res.json(presentWithoutCallSecrets(req.params.scope, table, { data: row, ...row }, req.user));
    } catch (error) {
      next(error);
    }
  });

  router.post("/:scope/profile", allowPublic, async (req, res, next) => {
    try {
      const table = PROFILE_TABLE[req.params.scope];
      if (!table) return next();
      if (!scopeRoleAllowed(req.user, req.params.scope)) {
        return res.status(403).json({ message: "You do not have access to this area." });
      }
      let id = await loadOwnedId(req.user.id, table);
      if (!id) {
        await createProfile(req.user, req.params.scope);
        id = await loadOwnedId(req.user.id, table);
      }
      if (!id && req.params.scope === "patient") {
        const created = await ensurePatientRow(req.user);
        id = created?.id || null;
      }
      if (!id) return res.status(404).json({ message: "Profile not found." });
      const body = profileFormBody(req.body ?? {}, { doctor: req.params.scope === "doctor" });
      if (req.params.scope === "patient") {
        if (body.full_name && !body.name) body.name = body.full_name;
        if (body.phone) {
          const checked = validateIncomingPhone(body.phone, body.country_code || req.user.country_code || "+250");
          if (!checked.ok) return res.status(422).json({ message: checked.message });
          body.phone = checked.phone;
          body.country_code = checked.country_code;
        }
        if (body.date_of_birth != null && body.date_of_birth !== "") {
          const birth = plausibleDateOfBirth(body.date_of_birth);
          if (!birth.ok) return res.status(422).json({ message: birth.message });
          body.date_of_birth = birth.value;
        }
      }
      let omitted = [];
      if (Object.keys(body).length) {
        const known = await knownWrite(table, body);
        omitted = known.unknown;
        if (Object.keys(known.payload).length) await update(table, id, known.payload);
      }
      if (req.params.scope === "patient") {
        const userPatch = {};
        if (body.phone) userPatch.phone = body.phone;
        if (body.gender) userPatch.gender = body.gender;
        if (body.name) userPatch.name = body.name;
        if (body.country_code) userPatch.country_code = body.country_code;
        if (Object.keys(userPatch).length) {
          const knownUser = await knownWrite("users", userPatch);
          if (Object.keys(knownUser.payload).length) await update("users", req.user.id, knownUser.payload);
        }
      }
      const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
      let sessionUser = null;
      if (req.params.scope === "patient") {
        const freshUser = await one("SELECT * FROM users WHERE id = ?", [req.user.id]);
        await stampPatientProfileCompletion(row, freshUser);
        sessionUser = freshUser ? await toUser(freshUser, "patient") : null;
      }
      res.json({
        message: "Profile saved.",
        data: row,
        [req.params.scope]: row,
        ...(row ?? {}),
        ...(sessionUser ? { user: sessionUser } : {}),
        ...(omitted.length ? { omitted_fields: omitted } : {}),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:scope/:resource", allowPublic, async (req, res, next) => {
    try {
      if (isDedicatedResource(req.params.resource)) return next();
      if (!scopeRoleAllowed(req.user, req.params.scope)) {
        return res.status(403).json({ message: "You do not have access to this area." });
      }
      const table = await resolveResourceTable(req.params.scope, req.params.resource);
      if (!table) return next();
      const prepared = await resolveCreateBody(req.params.scope, table, req.body, req.user);
      if (!prepared.ok) return res.status(prepared.status).json({ message: prepared.message });
      const known = await knownWrite(table, prepared.body);
      const id = await insert(table, known.payload);
      let stored = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
      stored = await afterResourceSaved(table, stored, req);
      res.status(201).json({ message: "Saved.", data: await presentRow(table, stored) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:scope/:resource/:id", allowPublic, updateResource);
  router.patch("/:scope/:resource/:id", allowPublic, updateResource);
  router.post("/:scope/:resource/:id", allowPublic, updateResource);

  router.delete("/:scope/:resource/:id", allowPublic, async (req, res, next) => {
    try {
      if (!/^\d+$/.test(String(req.params.id || ""))) return next();
      if (isDedicatedResource(req.params.resource)) return next();
      if (!scopeRoleAllowed(req.user, req.params.scope)) {
        return res.status(403).json({ message: "You do not have access to this area." });
      }
      const table = await resolveResourceTable(req.params.scope, req.params.resource);
      if (!table) return next();
      let current;
      try {
        current = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      } catch {
        return res.status(403).json({ message: "You do not have access to this record." });
      }
      if (!current) return res.status(404).json({ message: "Record not found." });
      if (!(await mayWriteRow(req.params.scope, table, current, req.user))) {
        return res.status(403).json({ message: "You do not have access to this record." });
      }
      if (await hasColumn(table, "deleted_at")) await update(table, req.params.id, { deleted_at: new Date() });
      else if (await hasColumn(table, "status")) await update(table, req.params.id, { status: "cancelled" });
      else await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (table === "appointments" && current) await releaseSlot(current);
      res.json({ message: "Deleted." });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/doctors/:id/approve", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const doctor = await reviewDoctor(req.params.id, "approve", "", req.user.id);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      const [named] = await verifierNames([await presentRow("doctors", doctor)]);
      res.json({ message: "Doctor approved.", doctor: named });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/doctors/:id/reject", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const doctor = await reviewDoctor(req.params.id, "reject", req.body?.message || req.body?.reason);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      res.json({ message: "Doctor rejected.", doctor: await presentRow("doctors", doctor) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/doctors/:id/request-action", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const doctor = await reviewDoctor(req.params.id, "request", req.body?.message || req.body?.reason);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      res.json({ message: "The doctor was asked to update their profile.", doctor: await presentRow("doctors", doctor) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/admin/doctors/:id/license-expiry", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      const doctor = await setLicenseExpiry(req.params.id, req.body?.license_expires_at ?? req.body?.expires_at);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      res.json({
        message: "License expiry updated.",
        license_expires_at: doctor.license_expires_at,
        doctor: await presentRow("doctors", doctor),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/doctors/:id/license", requireAuth, requireRole("admin"), licenseUpload.single("file"), async (req, res, next) => {
    try {
      const doctor = await one("SELECT id FROM doctors WHERE id = ?", [req.params.id]);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      if (!req.file) return res.status(422).json({ message: "Choose the renewed license file." });
      const url = saveUploadedFile(req.file, `doctor_license_${doctor.id}`);
      await update("doctors", doctor.id, { medical_license_document: url });
      const row = await presentRow("doctors", await one("SELECT * FROM doctors WHERE id = ?", [doctor.id]));
      res.json({ message: "Renewed license saved.", medical_license_document: url, doctor: row });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/manageusers/doctors/:userId/upload-image", requireAuth, requireRole("admin", "moderator"), licenseUpload.any(), async (req, res, next) => {
    try {
      const doctor = await one("SELECT id FROM doctors WHERE user_id = ? ORDER BY id DESC LIMIT 1", [req.params.userId]);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found." });
      const file = (req.files || []).find((item) => item.fieldname === "image") || req.files?.[0];
      if (!file) return res.status(422).json({ message: "Choose a profile photo." });
      const url = saveUploadedFile(file, `doctor_photo_${doctor.id}`);
      await update("doctors", doctor.id, { image: url });
      res.json({ message: "Image uploaded.", image: url });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/manageusers/doctors/:userId/upload-document", requireAuth, requireRole("admin", "moderator"), licenseUpload.any(), async (req, res, next) => {
    try {
      const doctor = await one("SELECT id FROM doctors WHERE user_id = ? ORDER BY id DESC LIMIT 1", [req.params.userId]);
      if (!doctor) return res.status(404).json({ message: "Doctor profile not found." });
      const type = String(req.body?.type || "");
      const allowed = ["degree_document", "medical_license_document", "national_id_document", "cv_document", "signature_image"];
      if (!allowed.includes(type)) return res.status(422).json({ message: "Choose a document type." });
      const file = (req.files || []).find((item) => item.fieldname === "document") || req.files?.[0];
      if (!file) return res.status(422).json({ message: "Choose a file." });
      const url = saveUploadedFile(file, `doctor_${type}_${doctor.id}`);
      await update("doctors", doctor.id, { [type]: url });
      res.json({ message: "Document uploaded.", type, url });
    } catch (error) {
      next(error);
    }
  });

  const MANAGED_PROFILES = {
    patients: "patient",
    doctors: "doctor",
    pharmacies: "pharmacy",
    hospitals: "hospital",
  };

  async function managedProfile(userId, table) {
    const user = await one("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return null;
    const profile = await tableExists(table) && await hasColumn(table, "user_id")
      ? await one(`SELECT * FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [userId]).catch(() => null)
      : null;
    const presentedUser = await presentRow("users", user);
    const presentedProfile = profile ? await presentRow(table, profile) : {};
    const merged = {
      ...presentedProfile,
      id: presentedProfile.id ?? null,
      user_id: user.id,
      name: presentedProfile.name || presentedUser.name || "",
      name_en: presentedProfile.name_en || presentedProfile.name || presentedUser.name || "",
      email: presentedProfile.email || presentedUser.email || "",
      phone: presentedProfile.phone || presentedUser.phone || "",
      gender: presentedProfile.gender || presentedUser.gender || "",
      preferred_language: presentedProfile.preferred_language || presentedUser.preferred_language || "",
      avatar: presentedProfile.avatar || presentedUser.avatar || null,
      user: {
        id: user.id,
        name: presentedUser.name || "",
        email: presentedUser.email || "",
        phone: presentedUser.phone || "",
        avatar: presentedUser.avatar || null,
        gender: presentedUser.gender || "",
        preferred_language: presentedUser.preferred_language || "",
      },
    };
    if (merged.date_of_birth) merged.date_of_birth = String(merged.date_of_birth).slice(0, 10);
    return { user, profile, merged };
  }

  function filledProfilePatch(body) {
    const patch = {};
    for (const [key, value] of Object.entries(body ?? {})) {
      if (["password", "id", "user", "user_id"].includes(key)) continue;
      if (value == null) continue;
      if (typeof value === "string" && value.trim() === "") continue;
      patch[key] = value;
    }
    return patch;
  }

  router.post("/admin/manageusers/:profiles/create-user", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const key = MANAGED_PROFILES[req.params.profiles];
      if (!key) return next();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const name = String(req.body?.name || "").trim();
      const phone = String(req.body?.phone || "").trim();
      const password = String(req.body?.password || "");
      if (!name || !email) return res.status(422).json({ message: "Name and email are required." });
      if (!clientMayClaimEmail(email)) return res.status(422).json({ message: "Choose a different email address." });

      let user = await one("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
      let created = false;
      if (!user) {
        if (password.length < 8) return res.status(422).json({ message: "Password must be at least 8 characters." });
        const known = await knownWrite("users", {
          name,
          email,
          phone: phone || null,
          country_code: req.body?.country_code || "+250",
          gender: req.body?.gender || null,
          password: await hashPassword(password),
          status: "active",
          active_role: key,
          is_verified: 1,
        });
        const id = await insert("users", known.payload);
        user = await one("SELECT * FROM users WHERE id = ?", [id]);
        created = true;
      } else {
        const patch = {
          name: name || user.name,
          phone: phone || user.phone,
          ...(req.body?.country_code ? { country_code: req.body.country_code } : {}),
          ...(req.body?.gender ? { gender: req.body.gender } : {}),
        };
        if (password.length >= 8) patch.password = await hashPassword(password);
        const known = await knownWrite("users", patch);
        if (Object.keys(known.payload).length) await update("users", user.id, known.payload);
        user = await one("SELECT * FROM users WHERE id = ?", [user.id]);
      }
      await ensureRole(user.id, key);
      await createProfile({ ...user, ...req.body, id: user.id }, key);
      res.status(created ? 201 : 200).json({
        message: created ? "Account created." : "Account updated.",
        role: key,
        user: {
          id: user.id,
          name: user.name || name,
          email: user.email || email,
          phone: user.phone || phone,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/manageusers/:profiles/:userId/get-profile", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const key = MANAGED_PROFILES[req.params.profiles];
      const table = req.params.profiles;
      if (!key) return next();
      const found = await managedProfile(req.params.userId, table);
      if (!found) return res.status(404).json({ message: "User not found." });
      const extra = key === "doctor"
        ? {
            sub_specializations: [],
            specializations: await tableExists("specializations")
              ? await q("SELECT id, name FROM specializations ORDER BY name LIMIT 200").catch(() => [])
              : [],
          }
        : {};
      const body = key === "doctor"
        ? presentWithoutCallSecrets("admin", "doctors", found.merged, req.user)
        : found.merged;
      res.json({ [key]: body, data: body, ...extra });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/manageusers/:profiles/:userId/save-profile", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const key = MANAGED_PROFILES[req.params.profiles];
      const table = req.params.profiles;
      if (!key) return next();
      const found = await managedProfile(req.params.userId, table);
      if (!found) return res.status(404).json({ message: "User not found." });
      const patch = filledProfilePatch(req.body);
      const userPatch = {};
      for (const field of ["name", "email", "phone", "gender", "preferred_language"]) {
        if (patch[field] != null) userPatch[field] = patch[field];
      }
      if (userPatch.email && !clientMayClaimEmail(userPatch.email)) {
        return res.status(422).json({ message: "Choose a different email address." });
      }
      if (Object.keys(userPatch).length) await update("users", found.user.id, userPatch);
      if (await tableExists(table)) {
        if (found.profile?.id) await update(table, found.profile.id, patch);
        else if (Object.keys(patch).length) {
          await insert(table, { ...patch, user_id: found.user.id });
        }
      }
      const saved = await managedProfile(req.params.userId, table);
      res.json({ message: "Profile saved.", [key]: saved.merged, data: saved.merged });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/manageusers/patients/:userId/medical", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const found = await managedProfile(req.params.userId, "patients");
      if (!found) return res.status(404).json({ message: "User not found." });
      let medical = null;
      if (found.profile?.id && await tableExists("patient_medical_infos")) {
        medical = await one("SELECT * FROM patient_medical_infos WHERE patient_id = ? ORDER BY id DESC LIMIT 1", [found.profile.id]).catch(() => null);
      } else if (found.profile?.id && await tableExists("medical_infos")) {
        medical = await one("SELECT * FROM medical_infos WHERE patient_id = ? ORDER BY id DESC LIMIT 1", [found.profile.id]).catch(() => null);
      }
      res.json({
        medical_info: medical,
        patient: {
          id: found.profile?.id ?? null,
          full_name: found.merged.name,
          email: found.merged.email,
          blood_type: found.merged.blood_type ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/manageusers/patients/:userId/insurance", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const found = await managedProfile(req.params.userId, "patients");
      if (!found) return res.status(404).json({ message: "User not found." });
      res.json({ insurance: found.merged.insurance ?? null });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/manageusers/patients/:userId/medical", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const found = await managedProfile(req.params.userId, "patients");
      if (!found) return res.status(404).json({ message: "User not found." });
      let patientId = found.profile?.id;
      if (!patientId) {
        const created = await ensurePatientRow(found.user);
        patientId = created?.id || null;
      }
      const medTable = (await tableExists("patient_medical_infos"))
        ? "patient_medical_infos"
        : (await tableExists("medical_infos"))
          ? "medical_infos"
          : null;
      let medical = null;
      if (medTable && patientId) {
        const existing = await one(`SELECT id FROM \`${medTable}\` WHERE patient_id = ? ORDER BY id DESC LIMIT 1`, [patientId]).catch(() => null);
        const known = await knownWrite(medTable, { ...(req.body || {}), patient_id: patientId });
        if (existing && Object.keys(known.payload).length) {
          await update(medTable, existing.id, known.payload);
        } else if (Object.keys(known.payload).length) {
          await insert(medTable, known.payload);
        }
        medical = await one(`SELECT * FROM \`${medTable}\` WHERE patient_id = ? ORDER BY id DESC LIMIT 1`, [patientId]).catch(() => null);
      }
      if (patientId) {
        const knownPatient = await knownWrite("patients", req.body || {});
        if (Object.keys(knownPatient.payload).length) await update("patients", patientId, knownPatient.payload);
      }
      res.json({
        message: "Medical info saved.",
        medical_info: medical || { id: patientId || 0, patient_id: patientId || 0, ...(req.body || {}) },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/manageusers/patients/:userId/insurance", requireAuth, requireRole("admin", "moderator"), async (req, res, next) => {
    try {
      const found = await managedProfile(req.params.userId, "patients");
      if (!found) return res.status(404).json({ message: "User not found." });
      let patientId = found.profile?.id;
      if (!patientId) {
        const created = await ensurePatientRow(found.user);
        patientId = created?.id || null;
      }
      if (patientId) {
        const known = await knownWrite("patients", {
          insurance_id: req.body?.insurance_id,
          insurance_number: req.body?.insurance_number,
        });
        if (Object.keys(known.payload).length) await update("patients", patientId, known.payload);
      }
      const ins = req.body?.insurance_id && await tableExists("insurances")
        ? await one("SELECT * FROM insurances WHERE id = ? LIMIT 1", [req.body.insurance_id]).catch(() => null)
        : null;
      res.json({
        message: "Insurance updated.",
        insurance: ins || {
          id: Number(req.body?.insurance_id || 0),
          name: "",
          code: String(req.body?.insurance_number || ""),
          coverage_percentage: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/manageusers/:profiles/:userId/:mediaField", requireAuth, requireRole("admin", "moderator"), licenseUpload.any(), async (req, res, next) => {
    try {
      const key = MANAGED_PROFILES[req.params.profiles];
      const table = req.params.profiles;
      const field = req.params.mediaField;
      if (!key || !["avatar", "logo", "image", "gallery"].includes(field)) return next();
      const found = await managedProfile(req.params.userId, table);
      if (!found) return res.status(404).json({ message: "User not found." });
      const files = req.files || [];
      if (!files.length) return res.status(422).json({ message: "Choose a file to upload." });
      if (field === "gallery") {
        const uploaded = files.map((file, idx) => ({
          id: Date.now() + idx,
          url: saveUploadedFile(file, `${key}_gallery_${found.user.id}_${idx}`),
          caption: req.body?.[`captions[${idx}]`] || undefined,
        }));
        return res.json({ message: "Gallery uploaded.", images: uploaded });
      }
      const url = saveUploadedFile(files[0], `${key}_${field}_${found.user.id}`);
      if (field === "avatar" && await hasColumn("users", "avatar")) {
        await update("users", found.user.id, { avatar: url });
      }
      if (found.profile?.id) {
        const targetCol = (await hasColumn(table, field)) ? field : ((await hasColumn(table, "image")) ? "image" : null);
        if (targetCol) await update(table, found.profile.id, { [targetCol]: url });
      }
      res.json({ message: "Uploaded.", [field]: url, avatar: url, logo: url, image: url, url });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/wallets/main", requireAuth, requireRole("admin", "moderator", "finance"), async (req, res, next) => {
    try {
      const paid = await one(
        "SELECT COALESCE(SUM(amount), 0) AS total, MAX(paid_at) AS last_paid FROM payments WHERE status = 'paid'",
      ).catch(() => ({ total: 0, last_paid: null }));
      const paidOut = await tableExists("payouts")
        ? await one(
          "SELECT COALESCE(SUM(amount), 0) AS total, MAX(paid_at) AS last_paid FROM payouts WHERE status IN ('completed','paid') AND deleted_at IS NULL",
        ).catch(() => ({ total: 0, last_paid: null }))
        : { total: 0, last_paid: null };
      const balance = Math.max(0, Number(paid?.total || 0) - Number(paidOut?.total || 0));
      res.json({
        wallet: {
          id: 1,
          balance: balance.toFixed(2),
          currency: "RWF",
          last_withdrawn: paidOut?.last_paid || null,
          last_topup: paid?.last_paid || null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/wallets/doctors", requireAuth, requireRole("admin", "moderator", "finance"), async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 10);
      const search = String(req.query.search || "").trim();
      const like = `%${search}%`;
      const earnedParts = [];
      const earnedParams = [];
      if (await tableExists("instant_consultation_requests")) {
        earnedParts.push(
          `SELECT r.doctor_id AS doctor_id, p.amount AS amount, p.paid_at AS paid_at
           FROM payments p
           JOIN instant_consultation_requests r ON r.id = p.payable_id
           WHERE p.status = 'paid' AND p.payable_type IN (?, ?)`,
        );
        earnedParams.push("instant_consultation", "App\\Models\\InstantConsultationRequest");
      }
      if (await tableExists("appointments")) {
        earnedParts.push(
          `SELECT a.doctor_id AS doctor_id, p.amount AS amount, p.paid_at AS paid_at
           FROM payments p
           JOIN appointments a ON a.id = p.payable_id
           WHERE p.status = 'paid' AND p.payable_type IN (?, ?)`,
        );
        earnedParams.push("appointment", "App\\Models\\Appointment");
      }
      if (await tableExists("fitness_certificates")) {
        earnedParts.push(
          `SELECT c.doctor_id AS doctor_id, p.amount AS amount, p.paid_at AS paid_at
           FROM payments p
           JOIN fitness_certificates c ON c.id = p.payable_id
           WHERE p.status = 'paid' AND p.payable_type LIKE '%fitness%'`,
        );
      }
      const earnedSql = earnedParts.length
        ? `LEFT JOIN (
            SELECT doctor_id, SUM(amount) AS earned, MAX(paid_at) AS last_paid
            FROM (${earnedParts.join(" UNION ALL ")}) paid
            WHERE doctor_id IS NOT NULL
            GROUP BY doctor_id
          ) earned ON earned.doctor_id = d.id`
        : "LEFT JOIN (SELECT NULL AS doctor_id, 0 AS earned, NULL AS last_paid) earned ON 1=0";
      const where = `(w.id IS NOT NULL OR COALESCE(earned.earned, 0) > 0)
        AND (? = '' OR u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const whereParams = [search, like, like, like];
      const from = `FROM doctors d
        JOIN users u ON u.id = d.user_id
        LEFT JOIN doctor_wallets w ON w.id = (
          SELECT id FROM doctor_wallets
          WHERE doctor_id = d.id AND deleted_at IS NULL
          ORDER BY id DESC LIMIT 1
        )
        ${earnedSql}`;
      const totalRow = await one(
        `SELECT COUNT(*) AS total ${from} WHERE ${where}`,
        [...earnedParams, ...whereParams],
      );
      const total = Number(totalRow?.total || 0);
      const rows = await q(
        `SELECT d.id AS doctor_id, d.user_id, d.slug, d.specialization, d.currency,
                u.name AS doctor_name, u.email AS doctor_email, u.phone AS doctor_phone,
                w.id AS wallet_id, w.balance AS stored_balance, w.last_withdrawn, w.last_topup,
                w.created_at, w.updated_at,
                COALESCE(earned.earned, 0) AS earned, earned.last_paid
         ${from}
         WHERE ${where}
         ORDER BY (COALESCE(w.balance, 0) + COALESCE(earned.earned, 0)) DESC, d.id DESC
         LIMIT ? OFFSET ?`,
        [...earnedParams, ...whereParams, perPage, offset],
      );
      const data = rows.map((row) => {
        const balance = Number(row.stored_balance || 0) + Number(row.earned || 0);
        return {
          id: row.wallet_id || row.doctor_id,
          doctor_id: row.doctor_id,
          balance: balance.toFixed(2),
          currency: row.currency || "RWF",
          last_withdrawn: row.last_withdrawn || null,
          last_topup: row.last_topup || row.last_paid || null,
          created_at: row.created_at || null,
          updated_at: row.updated_at || null,
          deleted_at: null,
          doctor: {
            id: row.doctor_id,
            user_id: row.user_id,
            slug: row.slug,
            specialization: row.specialization,
            currency: row.currency || "RWF",
            user: {
              id: row.user_id,
              name: row.doctor_name,
              email: row.doctor_email,
              phone: row.doctor_phone || "",
            },
          },
        };
      });
      res.json({
        current_page: page,
        data,
        per_page: perPage,
        total,
        last_page: Math.max(1, Math.ceil(total / perPage) || 1),
        from: total ? offset + 1 : null,
        to: total ? Math.min(offset + data.length, total) : null,
      });
    } catch (error) {
      next(error);
    }
  });

  // ── Self-deploy webhook ───────────────────────────────────────────────────
  // GitHub Actions POSTs here on every push to main.
  // Runs deploy.sh, which reclones main when the shallow checkout cannot be
  // fetched and does not copy or restart unless that update succeeds.
  // The 202 only means the script was started. The workflow then polls
  // /api/v1/health until commit equals the pushed sha.
  router.post("/deploy", (req, res) => {
    // A default written into a public repository is not a secret: anyone reading
    // the source could restart production at will. GitHub Actions supplies
    // DEPLOY_SECRET from a repository secret, so a box without it refuses to
    // self-deploy instead of accepting the published fallback.
    const secret = String(process.env.DEPLOY_SECRET || "").trim();
    if (!secret) {
      console.warn("[deploy] DEPLOY_SECRET is not set, so the self-deploy webhook is disabled.");
      return res.status(503).json({ message: "Deploy webhook is not configured on this server." });
    }
    const header = (req.headers["authorization"] || req.headers["x-deploy-secret"] || "").trim();
    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    // Digest both sides first so the comparison is always the same length and can
    // use a constant-time check instead of a short-circuiting string compare.
    const given = crypto.createHmac("sha256", "deploy-guard").update(token).digest();
    const expected = crypto.createHmac("sha256", "deploy-guard").update(secret).digest();
    if (!crypto.timingSafeEqual(given, expected)) return res.status(401).json({ message: "Unauthorized" });

    const requestedSha = String(req.body?.sha || "").trim().toLowerCase();
    const expectedSha = /^[0-9a-f]{40}$/.test(requestedSha) ? requestedSha : "";
    res.status(202).json({
      message: "Deploy started",
      requested_sha: expectedSha || null,
      running_commit: runningCommit(),
    });

    // Run the deploy script asynchronously — don't block the response.
    // The expected sha is passed through so a clone that is not that commit
    // stops before the tree is copied.
    execFile("bash", ["/opt/mediconnect-node/deploy.sh"], {
      timeout: 120000,
      env: {
        ...process.env,
        ...(expectedSha ? { MEDICONNECT_EXPECTED_SHA: expectedSha } : {}),
      },
    }, (err, stdout, stderr) => {
      const published = String(stdout || "").trim().split(/\s+/).pop() || "";
      if (err) console.error("[deploy] FAILED:", err.message, stderr?.slice(0, 300));
      else console.log("[deploy] published", published || "(no sha)", stdout?.slice(-200));
    });
  });

  registerActions(router, RESOURCES);
}

async function updateResource(req, res, next) {
  try {
    if (!/^\d+$/.test(String(req.params.id || ""))) return next();
    if (isDedicatedResource(req.params.resource)) return next();
    if (!scopeRoleAllowed(req.user, req.params.scope)) {
      return res.status(403).json({ message: "You do not have access to this area." });
    }
    const table = await resolveResourceTable(req.params.scope, req.params.resource);
    if (!table) return next();
    let current;
    try {
      current = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
    } catch {
      return res.status(403).json({ message: "You do not have access to this record." });
    }
    if (!current) return res.status(404).json({ message: "Record not found." });
    if (!(await mayWriteRow(req.params.scope, table, current, req.user))) {
      return res.status(403).json({ message: "You do not have access to this record." });
    }
    const body = visitBodyGuard(
      req.params.scope,
      table,
      stripClientOwners(req.body, { keep: req.params.scope === "admin" }),
    );
    const known = await knownWrite(table, body);
    if (Object.keys(known.payload).length) await update(table, req.params.id, known.payload);
    let stored = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
    stored = await afterResourceSaved(table, stored, req);
    const row = await presentRow(table, stored);
    res.json({ message: "Updated.", data: row, ...(row ?? {}) });
  } catch (error) {
    next(error);
  }
}
