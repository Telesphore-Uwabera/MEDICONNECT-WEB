import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { registerActions } from "./actions.js";
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
import { attachAppointmentRoutes, decorateAppointments } from "./appointments.js";
import { attachChatRoutes } from "./chat.js";
import { verifierNames } from "./verification.js";
import { withTeamPhoto } from "./public.js";
import { checkSocialLink } from "./social-links.js";
import {
  countWhere,
  hasColumn,
  insert,
  laravelPage,
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
  ensureRole,
  findUserByLogin,
  hashPassword,
  issueToken,
  loadOwnedId,
  requireAuth,
  requireRole,
  setActiveRole,
  toUser,
  verifyPassword,
} from "./auth.js";
import { sendMail, buildOtpEmail, buildWelcomeEmail, buildEmailHtml, emailP, emailBtn } from "./mail.js";

const PROFILE_TABLE = {
  patient: "patients",
  doctor: "doctors",
  hospital: "hospitals",
  pharmacy: "pharmacies",
};

function slugify(value) {
  const base = String(value || "user").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "user";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

async function createProfile(user, role) {
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
    status: "pending",
  };
  try {
    await insert(table, payload);
  } catch (error) {
    console.error(`Could not create ${role} profile`, error.message);
  }
}

async function ownedFilter(req, table, scope) {
  if (scope === "admin" || scope === "notifications") return { sql: "1=1", params: [] };
  const profile = PROFILE_TABLE[scope];
  const ownerId = profile ? await loadOwnedId(req.user.id, profile) : null;
  if (table === "appointments" && scope === "patient") {
    return { sql: "(`patient_id` = ? OR `patient_id` = ?)", params: [req.user.id, ownerId ?? 0] };
  }
  if (await hasColumn(table, `${scope}_id`)) {
    return { sql: `\`${scope}_id\` = ?`, params: [ownerId ?? 0] };
  }
  if (await hasColumn(table, "user_id")) return { sql: "`user_id` = ?", params: [req.user.id] };
  return { sql: "1=1", params: [] };
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
    if (cols.length) {
      filters.push(`(${cols.map((name) => `\`${name}\` LIKE ?`).join(" OR ")})`);
      cols.forEach(() => params.push(`%${term}%`));
    }
  }
  const where = `WHERE ${filters.join(" AND ")}`;
  const total = await countWhere(table, where, params);
  let data = await presentRows(table, await q(`SELECT * FROM \`${table}\` ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]));
  if (table === "appointments") data = await decorateAppointments(data);
  if (["doctors", "hospitals", "pharmacies", "patients", "users"].includes(table)) {
    data = await verifierNames(data);
  }
  if (table === "team_members") data = data.map(withTeamPhoto);
  const path = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
  return laravelPage({ data, total, page, perPage, path });
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

async function deleteByReference(table, id) {
  const [links] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = ?
       AND REFERENCED_COLUMN_NAME = 'id'`,
    [table],
  );
  for (const link of links) {
    await pool.query(`DELETE FROM \`${link.TABLE_NAME}\` WHERE \`${link.COLUMN_NAME}\` = ?`, [id]);
  }
}

async function deleteUser(id) {
  const profiles = ["doctors", "patients", "hospitals", "pharmacies"];
  await pool.query("SET FOREIGN_KEY_CHECKS=0");
  try {
    for (const table of profiles) {
      if (!(await tableExists(table)) || !(await hasColumn(table, "user_id"))) continue;
      const rows = await q(`SELECT id FROM \`${table}\` WHERE user_id = ?`, [id]);
      for (const row of rows) await deleteByReference(table, row.id);
      await pool.query(`DELETE FROM \`${table}\` WHERE user_id = ?`, [id]);
    }
    await deleteByReference("users", id);
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
  } finally {
    await pool.query("SET FOREIGN_KEY_CHECKS=1");
  }
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
      instant_completed: 0, prescriptions_received: 0, service_bookings_total: 0, certificates_issued: 0,
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
      const startTime = clock(minute);
      const existing = await one(
        "SELECT id FROM appointment_slots WHERE doctor_id = ? AND slot_date = ? AND start_time = ? LIMIT 1",
        [doctorId, date, startTime],
      ).catch(() => null);
      if (existing) continue;
      await insert("appointment_slots", {
        doctor_id: doctorId,
        hospital_id: period.hospital_id ?? null,
        doctor_availability_period_id: period.id,
        availability_period_id: period.id,
        period_id: period.id,
        slot_date: date,
        start_time: startTime,
        end_time: clock(minute + duration),
        duration_minutes: duration,
        type: period.type || "online",
        status: "available",
      });
      created += 1;
    }
  }
  return created;
}

const licenseUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const DOCTOR_PROFILE_PREFIXES = [
  "/doctor/profile",
  "/doctor/education",
  "/doctor/experience",
  "/doctor/qualifications",
  "/doctor/social-links",
];
const DOCTOR_SCHEDULE_PREFIXES = ["/doctor/availability", "/doctor/slots"];

export function appRoutes(router) {
  attachAppointmentRoutes(router, { requireAuth, requireRole });
  attachChatRoutes(router, { requireAuth });
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
      if (!row || !(await verifyPassword(req.body?.password, row.password))) {
        return res.status(401).json({ message: "Incorrect password." });
      }
      if (row.status === "suspended") return res.status(403).json({ message: "This account is suspended." });
      const user = await toUser(row);
      const token = await issueToken(row.id, user.active_role);
      res.json({ message: "Signed in.", token, user });
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
      if (body.password !== body.password_confirmation) {
        return res.status(422).json({ message: "Password confirmation does not match.", errors: { password: ["Password confirmation does not match."] } });
      }
      const existing = await one("SELECT id FROM users WHERE email = ? LIMIT 1", [body.email]);
      if (existing) return res.status(422).json({ message: "Email is already registered.", errors: { email: ["Email is already registered."] } });
      const role = ["patient", "doctor", "hospital", "pharmacy"].includes(body.role) ? body.role : "patient";
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
      await createProfile(created, role);

      // Send welcome email (best-effort — never block the response)
      if (created?.email) {
        const html = buildWelcomeEmail({ name: created.name, role });
        sendMail({
          to: created.email,
          subject: "Welcome to MediConnect!",
          text: `Hi ${created.name || "there"},\n\nYour MediConnect account has been created. Sign in at https://mediconnect.rw/auth to get started.\n\nThe MediConnect Team`,
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
      await pool.query("DELETE FROM personal_access_tokens WHERE id = ?", [req.auth.token.id]);
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
      const row = await findUserByLogin(req.body ?? {});
      // Always return the same message so we don't leak whether the account exists.
      if (!row) return res.json({ message: "If that account exists, a reset code has been sent." });

      const code = String(Math.floor(100000 + Math.random() * 900000));
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
        const html = buildOtpEmail({ code, type: "password_reset", recipientName: row.name });
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
      const otp = await one(
        "SELECT id, expires_at FROM otps WHERE code = ? AND (email = ? OR phone = ?) AND type = 'password_reset' ORDER BY id DESC LIMIT 1",
        [req.body?.otp, req.body?.email ?? "", req.body?.phone ?? ""],
      );
      if (!otp) return res.status(422).json({ message: "That code is not valid." });
      // Check expiry
      if (otp.expires_at && new Date(otp.expires_at).getTime() < Date.now()) {
        await pool.query("DELETE FROM otps WHERE id = ?", [otp.id]);
        return res.status(422).json({ message: "That code has expired. Please request a new one." });
      }
      if (req.body?.password !== req.body?.password_confirmation) {
        return res.status(422).json({ message: "Password confirmation does not match." });
      }
      await update("users", row.id, { password: await hashPassword(req.body.password) });
      await pool.query("DELETE FROM otps WHERE id = ?", [otp.id]);

      // Send confirmation email
      if (row.email) {
        sendMail({
          to: row.email,
          subject: "MediConnect — Your password has been changed",
          text: `Hi ${row.name || "there"},\n\nYour MediConnect password was successfully changed.\n\nIf you did not make this change, contact us immediately at admin@mediconnect.rw.\n\nThe MediConnect Team`,
          html: buildEmailHtml({
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
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await insert("otps", {
        email: req.body?.email,
        phone: req.body?.phone,
        country_code: req.body?.country_code,
        code,
        type: req.body?.type || "login",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "),
      });

      // Deliver the code by email when an address was provided
      if (req.body?.email) {
        const typeLabel = req.body?.type === "password_reset" ? "password reset" : "verification";
        const html = buildOtpEmail({ code, type: req.body?.type || "verification", recipientName: req.body?.name });
        await sendMail({
          to: req.body.email,
          subject: `MediConnect — Your ${typeLabel} code`,
          text: `Your MediConnect ${typeLabel} code is: ${code}\n\nThis code expires in 10 minutes.`,
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
      const row = await one(
        "SELECT * FROM otps WHERE code = ? AND (email = ? OR phone = ?) ORDER BY id DESC LIMIT 1",
        [req.body?.code, req.body?.email ?? "", req.body?.phone ?? ""],
      );
      if (!row) return res.status(422).json({ message: "That code is not valid." });
      let user = await findUserByLogin(req.body ?? {});
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

  router.post("/broadcasting/auth", requireAuth, (req, res) => {
    res.json({ auth: `${process.env.REVERB_APP_KEY || "mediconnect-staging-key"}:local` });
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
      await update("users", row.tokenable_id, {
        name: req.body?.name,
        phone: req.body?.phone,
        email: req.body?.email,
        country_code: req.body?.country_code,
        active_role: req.body?.role || "patient",
      });
      if (req.body?.role) await ensureRole(row.tokenable_id, req.body.role);
      res.json({ message: "Guest account saved.", user_id: Number(row.tokenable_id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/patient/dashboard", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const dashboard = emptyDashboard(req.query);
      const userId = req.user.id;
      const profileId = await loadOwnedId(userId, "patients");
      const ids = [...new Set([userId, profileId].filter(Boolean))];
      const marks = ids.map(() => "?").join(",");
      const tally = (rows) => {
        const byStatus = Object.fromEntries(rows.map((row) => [String(row.status || ""), Number(row.total)]));
        const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
        return { byStatus, total };
      };
      const period = String(req.query.period || "month");
      const periodStart = req.query.start_date ? String(req.query.start_date).slice(0, 10) : "";
      const periodEnd = req.query.end_date ? String(req.query.end_date).slice(0, 10) : "";
      const periodFilter = period === "today" || period === "day"
        ? { sql: "AND appointment_date = CURDATE()", params: [] }
        : period === "week"
          ? { sql: "AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)", params: [] }
          : period === "year"
            ? { sql: "AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 364 DAY)", params: [] }
            : period === "custom" && periodStart && periodEnd
              ? { sql: "AND appointment_date BETWEEN ? AND ?", params: [periodStart, periodEnd] }
              : period === "all"
                ? { sql: "", params: [] }
                : { sql: "AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)", params: [] };
      const groups = ids.length
        ? await q(`SELECT status, COUNT(*) AS total FROM appointments WHERE patient_id IN (${marks}) ${periodFilter.sql} GROUP BY status`, [...ids, ...periodFilter.params]).catch(() => [])
        : [];
      const { byStatus, total } = tally(groups);
      const todayGroups = ids.length
        ? await q(`SELECT status, COUNT(*) AS total FROM appointments WHERE patient_id IN (${marks}) AND appointment_date = CURDATE() GROUP BY status`, ids).catch(() => [])
        : [];
      const todayTally = tally(todayGroups);
      const upcoming = ids.length
        ? Number((await one(
          `SELECT COUNT(*) AS total FROM appointments WHERE patient_id IN (${marks}) AND appointment_date >= CURDATE() AND status IN ('pending','confirmed','accepted','in_progress')`,
          ids,
        ).catch(() => ({ total: 0 })))?.total ?? 0)
        : 0;
      const instantTableName = (await tableExists("instant_consultation_requests"))
        ? "instant_consultation_requests"
        : (await tableExists("instant_consultations")) ? "instant_consultations" : null;
      let instantRows = [];
      if (instantTableName && ids.length) {
        const clauses = [`patient_id IN (${marks})`];
        const params = [...ids];
        if (req.user.email && await hasColumn(instantTableName, "guest_email")) {
          clauses.push("guest_email = ?");
          params.push(req.user.email);
        }
        if (await hasColumn(instantTableName, "user_id")) {
          clauses.push("user_id = ?");
          params.push(userId);
        }
        instantRows = await q(
          `SELECT status, COUNT(*) AS total FROM \`${instantTableName}\` WHERE ${clauses.join(" OR ")} GROUP BY status`,
          params,
        ).catch(() => []);
      }
      const instant = tally(instantRows);
      const instantActive = ["accepted", "in_progress", "confirmed"].reduce((sum, status) => sum + (instant.byStatus[status] ?? 0), 0);
      dashboard.today = {
        total: todayTally.total,
        completed: todayTally.byStatus.completed ?? 0,
        pending: todayTally.byStatus.pending ?? 0,
        confirmed: upcoming,
        cancelled: todayTally.byStatus.cancelled ?? 0,
        instant_active: instantActive,
      };
      dashboard.period_stats.total_appointments = total;
      dashboard.period_stats.completed = byStatus.completed ?? 0;
      dashboard.period_stats.cancelled = byStatus.cancelled ?? 0;
      dashboard.period_stats.pending = byStatus.pending ?? 0;
      dashboard.period_stats.online_count = ids.length && await hasColumn("appointments", "type")
        ? Number((await one(`SELECT COUNT(*) AS total FROM appointments WHERE patient_id IN (${marks}) AND type = 'online'`, ids).catch(() => ({ total: 0 })))?.total ?? 0)
        : 0;
      dashboard.period_stats.in_person_count = Math.max(0, total - dashboard.period_stats.online_count);
      dashboard.period_stats.instant_total = instant.total;
      dashboard.period_stats.instant_completed = instant.byStatus.completed ?? 0;
      dashboard.period_stats.unique_doctors = ids.length
        ? Number((await one(`SELECT COUNT(DISTINCT doctor_id) AS total FROM appointments WHERE patient_id IN (${marks}) ${periodFilter.sql}`, [...ids, ...periodFilter.params]).catch(() => ({ total: 0 })))?.total ?? 0)
        : 0;
      if (ids.length && await tableExists("service_bookings")) {
        const bookings = await q(`SELECT status, COUNT(*) AS total FROM service_bookings WHERE patient_id IN (${marks}) GROUP BY status`, ids).catch(() => []);
        const bookingTally = tally(bookings);
        dashboard.service_bookings.total = bookingTally.total;
        dashboard.service_bookings.completed = bookingTally.byStatus.completed ?? 0;
        dashboard.service_bookings.pending = bookingTally.byStatus.pending ?? 0;
        dashboard.service_bookings.accepted = bookingTally.byStatus.accepted ?? 0;
        dashboard.service_bookings.cancelled = bookingTally.byStatus.cancelled ?? 0;
        dashboard.period_stats.service_bookings_total = bookingTally.total;
      }
      if (ids.length && await tableExists("reviews")) {
        const reviewRow = await one(
          `SELECT COUNT(*) AS total, AVG(rating) AS avg_rating FROM reviews WHERE patient_id IN (${marks})`,
          ids,
        ).catch(() => null);
        dashboard.reviews.total = Number(reviewRow?.total ?? 0);
        dashboard.reviews.avg_rating = reviewRow?.avg_rating == null ? null : Math.round(Number(reviewRow.avg_rating) * 10) / 10;
      }
      dashboard.activity_chart = ids.length
        ? (await q(
          `SELECT DATE(appointment_date) AS label,
                  COUNT(*) AS appointments,
                  COUNT(DISTINCT doctor_id) AS doctors_seen,
                  SUM(CASE WHEN status IN ('completed','done') THEN 1 ELSE 0 END) AS completed,
                  SUM(CASE WHEN type = 'online' THEN 1 ELSE 0 END) AS online,
                  SUM(CASE WHEN type <> 'online' OR type IS NULL THEN 1 ELSE 0 END) AS in_person
           FROM appointments
           WHERE patient_id IN (${marks}) ${periodFilter.sql}
           GROUP BY DATE(appointment_date)
           ORDER BY label`,
          [...ids, ...periodFilter.params],
        ).catch(() => [])).map((row) => ({
          label: String(row.label).slice(0, 10),
          doctors_seen: Number(row.doctors_seen ?? 0),
          appointments: Number(row.appointments ?? 0),
          completed: Number(row.completed ?? 0),
          online: Number(row.online ?? 0),
          in_person: Number(row.in_person ?? 0),
          spent: 0,
        }))
        : [];
      dashboard.instant = {
        total: instant.total,
        completed: instant.byStatus.completed ?? 0,
        declined: (instant.byStatus.declined ?? 0) + (instant.byStatus.cancelled ?? 0),
        pending: (instant.byStatus.pending ?? 0) + (instant.byStatus.pendingPayment ?? 0),
        active_now: instantActive,
        avg_duration_min: 0,
      };
      const prescriptions = ids.length
        ? await one(`SELECT COUNT(*) AS total FROM prescriptions WHERE patient_id IN (${marks})`, ids).catch(() => ({ total: 0 }))
        : { total: 0 };
      dashboard.prescriptions.total = Number(prescriptions?.total ?? 0);
      dashboard.prescriptions.active = dashboard.prescriptions.total;
      dashboard.period_stats.prescriptions_received = dashboard.prescriptions.total;
      if (ids.length && await tableExists("payments") && await hasColumn("payments", "amount")) {
        const paid = await one(
          `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM payments WHERE patient_id IN (${marks}) AND status IN ('paid','completed','success','successful')`,
          ids,
        ).catch(() => ({ total: 0, count: 0 }));
        const spent = Number(paid?.total ?? 0);
        const count = Number(paid?.count ?? 0);
        dashboard.spending.total = spent;
        dashboard.spending.breakdown.appointments.total = spent;
        dashboard.spending.breakdown.appointments.count = count;
        dashboard.spending.breakdown.appointments.avg_per_appointment = count > 0 ? Math.round(spent / count) : 0;
      }
      if (ids.length && await tableExists("fitness_certificates")) {
        const certificates = await q(`SELECT status, COUNT(*) AS total FROM fitness_certificates WHERE patient_id IN (${marks}) GROUP BY status`, ids).catch(() => []);
        const certs = tally(certificates);
        dashboard.certificates.total = certs.total;
        dashboard.certificates.issued = (certs.byStatus.issued ?? 0) + (certs.byStatus.approved ?? 0) + (certs.byStatus.signed ?? 0);
        dashboard.certificates.pending = certs.byStatus.pending ?? 0;
        dashboard.period_stats.certificates_issued = dashboard.certificates.issued;
      }
      if (profileId && await tableExists("patient_medical_info")) {
        const info = await one("SELECT * FROM patient_medical_info WHERE patient_id = ? LIMIT 1", [profileId]).catch(() => null);
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
            allergies_count: listCount(info.allergies),
            conditions_count: listCount(info.conditions ?? info.chronic_conditions),
            medications_count: listCount(info.medications),
            surgeries_count: listCount(info.surgeries),
            smoking_status: info.smoking_status ?? null,
          };
        }
      }
      res.json(dashboard);
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
      const id = await insert("doctor_availabilities", { ...req.body, doctor_id: doctorId });
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
      await update("doctor_availability_periods", period.id, req.body);
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
      const slots = {};
      for (const row of rows) {
        const key = String(row.slot_date || "").slice(0, 10);
        if (!key) continue;
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
    const date = `DATE(\`${column}\`)`;
    if (period === "custom" && start && end) return { sql: `${date} BETWEEN ? AND ?`, params: [String(start).slice(0, 10), String(end).slice(0, 10)] };
    if (period === "today" || period === "day") return { sql: `${date} = CURDATE()`, params: [] };
    if (period === "week") return { sql: `${date} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`, params: [] };
    if (period === "year") return { sql: `${date} >= DATE_SUB(CURDATE(), INTERVAL 364 DAY)`, params: [] };
    return { sql: `${date} >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)`, params: [] };
  }

  function previousWhere(column, period) {
    const date = `DATE(\`${column}\`)`;
    if (period === "today" || period === "day") return { sql: `${date} = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`, params: [] };
    if (period === "week") return { sql: `${date} >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND ${date} < DATE_SUB(CURDATE(), INTERVAL 6 DAY)`, params: [] };
    if (period === "year") return { sql: `${date} >= DATE_SUB(CURDATE(), INTERVAL 728 DAY) AND ${date} < DATE_SUB(CURDATE(), INTERVAL 364 DAY)`, params: [] };
    return { sql: `${date} >= DATE_SUB(CURDATE(), INTERVAL 59 DAY) AND ${date} < DATE_SUB(CURDATE(), INTERVAL 29 DAY)`, params: [] };
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
      else if (status === "pending") out.pending += count;
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

  router.get("/doctor/toggle/mystatus", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctor } = await currentDoctor(req);
      res.json({
        instant_consultation: Boolean(Number(doctor?.instant_consultation ?? 0)),
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
    const { doctor } = await currentDoctor(req);
    const current = Boolean(Number(doctor?.instant_consultation ?? 0));
    return setDoctorFlag(req, res, next, "instant_consultation", flagValue(req.body, ["instant_consultation", "enabled", "status"], current));
  });

  router.patch("/doctor/toggle/pause", requireAuth, requireRole("doctor"), async (req, res, next) => {
    const { doctor } = await currentDoctor(req);
    const column = (await hasColumn("doctors", "bookings_paused")) ? "bookings_paused" : "pause_bookings";
    const current = Boolean(Number(doctor?.bookings_paused ?? doctor?.pause_bookings ?? 0));
    return setDoctorFlag(req, res, next, column, flagValue(req.body, ["bookings_paused", "paused", "enabled"], current));
  });

  router.get("/doctor/dashboard", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
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
      const todaySql = dateColumn ? `DATE(\`${dateColumn}\`) = CURDATE()` : "1=0";
      const statuses = await q(
        `SELECT status, COUNT(*) AS total FROM appointments WHERE ${owned} AND ${window.sql} GROUP BY status`,
        [doctorId, ...window.params],
      ).catch(() => []);
      const todayRows = await q(
        `SELECT status, COUNT(*) AS total FROM appointments WHERE ${owned} AND ${todaySql} GROUP BY status`,
        [doctorId],
      ).catch(() => []);
      const periodStats = tallyStatuses(statuses);
      const today = tallyStatuses(todayRows);
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
      let revenueTotal = await sumAmount(`${window.sql} AND ${completedSql}`, window.params);
      const previousTotal = await sumAmount(`${previous.sql} AND ${completedSql}`, previous.params);
      const revenueCount = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${owned} AND ${window.sql} AND ${completedSql}`, [doctorId, ...window.params]);
      const onlineRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${completedSql} AND \`${typeColumn}\` NOT LIKE '%person%' AND \`${typeColumn}\` NOT LIKE '%instant%'`, window.params) : revenueTotal;
      const inPersonRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${completedSql} AND (\`${typeColumn}\` LIKE '%person%' OR \`${typeColumn}\` LIKE '%clinic%')`, window.params) : 0;
      const instantRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${completedSql} AND \`${typeColumn}\` LIKE '%instant%'`, window.params) : 0;
      if (!(revenueTotal > 0) && await tableExists("payments") && await hasColumn("payments", "amount") && await hasColumn("payments", "appointment_id")) {
        const paidPayments = await one(
          `SELECT COALESCE(SUM(p.amount), 0) AS total
           FROM payments p
           INNER JOIN appointments a ON a.id = p.appointment_id
           WHERE a.doctor_id = ? AND p.status IN ('paid','completed','success','successful')`,
          [doctorId],
        ).catch(() => null);
        if (paidPayments) revenueTotal = Number(paidPayments.total ?? 0);
      }
      if (await tableExists("instant_consultation_requests") && await tableExists("payments") && await hasColumn("payments", "payable_id")) {
        const instantPaid = await one(
          `SELECT COALESCE(SUM(p.amount), 0) AS total
           FROM payments p
           INNER JOIN instant_consultation_requests i ON i.id = p.payable_id
           WHERE i.doctor_id = ? AND p.status IN ('paid','completed','success','successful') AND p.payable_type LIKE '%instant%'`,
          [doctorId],
        ).catch(() => null);
        if (instantPaid) revenueTotal += Number(instantPaid.total ?? 0);
      }
      const change = previousTotal > 0 ? Math.round(((revenueTotal - previousTotal) / previousTotal) * 1000) / 10 : null;
      const labelExpr = !dateColumn
        ? "CURDATE()"
        : chartGroup === "month"
          ? `DATE_FORMAT(\`${dateColumn}\`, '%Y-%m-01')`
          : `DATE(\`${dateColumn}\`)`;
      const flow = dateColumn ? await q(
        `SELECT ${labelExpr} AS label, COUNT(*) AS patients, SUM(CASE WHEN status IN ('completed','done','complete') THEN 1 ELSE 0 END) AS completed
         FROM appointments WHERE ${owned} AND ${window.sql} GROUP BY label ORDER BY label`,
        [doctorId, ...window.params],
      ).catch(() => []) : [];
      const prescriptionAlive = (await hasColumn("prescriptions", "deleted_at")) ? "deleted_at IS NULL" : "1=1";
      const prescriptionCount = async (extra = "1=1") => count(
        `SELECT COUNT(*) AS total FROM prescriptions WHERE doctor_id = ? AND ${prescriptionAlive} AND ${extra}`,
        [doctorId],
      );
      const reviewAlive = (await hasColumn("reviews", "deleted_at")) ? "r.deleted_at IS NULL" : "1=1";
      const ratingColumn = await firstColumn("reviews", ["rating", "stars", "score"]);
      const reviewStats = ratingColumn ? await one(
        `SELECT COUNT(*) AS total,
                AVG(\`${ratingColumn}\`) AS avg_rating,
                SUM(CASE WHEN \`${ratingColumn}\` >= 5 THEN 1 ELSE 0 END) AS five_star,
                SUM(CASE WHEN \`${ratingColumn}\` >= 4 AND \`${ratingColumn}\` < 5 THEN 1 ELSE 0 END) AS four_star,
                SUM(CASE WHEN \`${ratingColumn}\` >= 3 AND \`${ratingColumn}\` < 4 THEN 1 ELSE 0 END) AS three_star,
                SUM(CASE WHEN \`${ratingColumn}\` < 3 THEN 1 ELSE 0 END) AS low_star
         FROM reviews r WHERE r.doctor_id = ? AND ${reviewAlive}`,
        [doctorId],
      ).catch(() => null) : null;
      const recentReviews = ratingColumn ? await q(
        `SELECT r.id, r.\`${ratingColumn}\` AS rating, r.comment, r.created_at, u.name AS patient_name
         FROM reviews r
         LEFT JOIN users u ON u.id = r.patient_id
         WHERE r.doctor_id = ? AND ${reviewAlive}
         ORDER BY r.id DESC LIMIT 5`,
        [doctorId],
      ).catch(() => []) : [];
      const instantTable = (await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : (await tableExists("instant_consultations")) ? "instant_consultations" : null;
      const instantOwned = instantTable && (await hasColumn(instantTable, "doctor_id")) ? "doctor_id = ?" : "1=0";
      const instantParams = instantOwned === "1=0" ? [] : [doctorId];
      const instantStatus = async (extra) => instantTable
        ? count(`SELECT COUNT(*) AS total FROM \`${instantTable}\` WHERE ${instantOwned} AND ${extra}`, instantParams)
        : 0;

      res.json({
        filters_applied: {
          period,
          from: req.query.start_date || null,
          to: req.query.end_date || null,
          appointment_type: req.query.appointment_type || "all",
          search: req.query.search || null,
          chart_group: chartGroup,
        },
        today: { ...today, instant_queue: await instantStatus("status IN ('pending','queued','waiting')") },
        period_stats: {
          total_appointments: periodStats.total,
          completed: periodStats.completed,
          cancelled: periodStats.cancelled,
          pending: periodStats.pending,
          confirmed: periodStats.confirmed,
          online_count: onlineCount,
          in_person_count: inPersonCount,
          instant_total: instantCount,
          instant_completed: await instantStatus("status IN ('completed','done')"),
          avg_duration_minutes: 0,
        },
        revenue: {
          total: revenueTotal,
          previous_period_total: previousTotal,
          change_percent: change,
          appointment_count: revenueCount,
          avg_per_appointment: revenueCount > 0 ? Math.round(revenueTotal / revenueCount) : 0,
          breakdown: {
            online: { total: onlineRevenue, count: onlineCount },
            in_person: { total: inPersonRevenue, count: inPersonCount },
            instant: { total: instantRevenue, count: instantCount },
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
          total: await instantStatus("1=1"),
          completed: await instantStatus("status IN ('completed','done')"),
          declined: await instantStatus("status IN ('declined','rejected','cancelled','canceled')"),
          pending: await instantStatus("status IN ('pending','queued','waiting')"),
          current_queue: await instantStatus("status IN ('pending','queued','waiting')"),
          avg_duration_min: 0,
        },
        prescriptions: {
          total: await prescriptionCount(),
          issued: await prescriptionCount("status IN ('issued','signed','completed','active')"),
          draft: await prescriptionCount("status IN ('draft','pending')"),
          signed: await prescriptionCount("status IN ('signed','issued')"),
        },
        reviews: {
          all_time_avg: reviewStats?.avg_rating == null ? null : Math.round(Number(reviewStats.avg_rating) * 10) / 10,
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
      const row = await doctorWalletRow(doctorId, req.user.id);
      res.json({
        wallet: {
          balance: Number(row?.balance ?? row?.available_balance ?? 0),
          currency: row?.currency || "RWF",
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
      const where = `doctor_id = ? AND ${alive} AND status IN ('completed','done','complete','paid')`;
      const summary = await one(
        `SELECT COUNT(*) AS total_appointments, COALESCE(SUM(${amountColumn ? `\`${amountColumn}\`` : "0"}), 0) AS total_earned, MAX(${dateColumn ? `\`${dateColumn}\`` : "NULL"}) AS last_appointment_at FROM appointments WHERE ${where}`,
        [doctorId],
      ).catch(() => null);
      const total = Number(summary?.total_appointments ?? 0);
      const rows = await q(
        `SELECT * FROM appointments WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [doctorId, perPage, offset],
      ).catch(() => []);
      res.json({
        summary: {
          total_appointments: total,
          total_earned: Number(summary?.total_earned ?? 0),
          average_per_appointment: total > 0 ? Math.round(Number(summary.total_earned) / total) : 0,
          last_appointment_at: summary?.last_appointment_at ?? null,
        },
        breakdown: laravelPage({
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
        return res.json(laravelPage({ data: [], total: 0, page, perPage, path: "/api/v1/doctor/wallet/withdrawals" }));
      }
      const column = await firstColumn(table, ["doctor_id", "user_id"]);
      const where = column ? `\`${column}\` = ?` : "1=0";
      const params = column ? [column === "user_id" ? req.user.id : doctorId] : [];
      const total = Number((await one(`SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${where}`, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const rows = await q(`SELECT * FROM \`${table}\` WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(() => []);
      res.json(laravelPage({
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
      const { doctorId, doctor } = await currentDoctor(req);
      const table = await instantTable();
      let queue = [];
      let seenToday = 0;
      let resolved = 0;
      let active = null;
      if (table) {
        const owner = (await hasColumn(table, "doctor_id")) ? "(doctor_id = ? OR doctor_id IS NULL)" : "1=1";
        const params = owner.includes("?") ? [doctorId] : [];
        const rows = await q(
          `SELECT * FROM \`${table}\` WHERE ${owner} AND status IN ('pending','queued','waiting','confirmed','accepted','in_progress','completed') ORDER BY id ASC LIMIT 50`,
          params,
        ).catch(() => []);
        active = await doctorActiveInstant(doctorId);
        queue = rows.map((row, index) => ({
          id: row.id,
          guest_name: row.guest_name || row.patient_name || "",
          guest_phone: row.guest_phone || row.phone || "",
          description: row.description || row.reason || null,
          status: row.status || "pending",
          payment_status: row.payment_status || null,
          queue_position: index + 1,
          waiting_seconds: 0,
          waiting_label: "Waiting",
        }));
        seenToday = Number((await one(
          `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${owner.includes("?") ? "doctor_id = ?" : "1=1"} AND status IN ('completed','done','in_progress') AND DATE(created_at) = CURDATE()`,
          owner.includes("?") ? [doctorId] : [],
        ).catch(() => ({ total: 0 })))?.total ?? 0);
        resolved = Number((await one(
          `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${owner.includes("?") ? "doctor_id = ?" : "1=1"} AND status IN ('completed','done')`,
          owner.includes("?") ? [doctorId] : [],
        ).catch(() => ({ total: 0 })))?.total ?? 0);
      }
      res.json({
        queue,
        stats: {
          in_queue: queue.filter((item) => ["pending", "queued", "waiting", "confirmed"].includes(item.status)).length,
          seen_today: seenToday,
          avg_duration: "0 min",
          resolved,
          is_online: Boolean(Number(doctor?.instant_consultation ?? 0)),
          doctor_busy: Boolean(active),
          active_instant_id: active?.id ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/instant-consultations/:id/accept", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (row.doctor_id && Number(row.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This request belongs to another doctor." });
      }
      if (["expired", "declined", "cancelled", "completed"].includes(String(row.status || ""))) {
        return res.status(422).json({ message: "This request is no longer waiting." });
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
      notifyDoctorReady(updated).catch(() => null);
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

  router.post("/doctor/instant-consultations/:id/decline", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (row.doctor_id && Number(row.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This request belongs to another doctor." });
      }
      await update(table, row.id, { status: "declined" });
      res.json({ message: "Request declined." });
    } catch (error) {
      next(error);
    }
  });

  router.post("/doctor/instant-consultations/:id/join", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (row.doctor_id && Number(row.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This request belongs to another doctor." });
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
      const patch = { status: "in_progress" };
      if (await hasColumn(table, "doctor_id")) patch.doctor_id = doctorId;
      if (await hasColumn(table, "daily_room_name")) patch.daily_room_name = roomName;
      if (await hasColumn(table, "daily_room_url")) patch.daily_room_url = roomUrl;
      if (await hasColumn(table, "daily_doctor_token")) patch.daily_doctor_token = doctorToken;
      await update(table, row.id, patch);
      const updated = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]);
      notifyDoctorReady(updated || row).catch(() => null);
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

  router.post("/doctor/instant-consultations/:id/complete", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const table = await instantTable();
      if (!table) return res.status(404).json({ message: "Instant consultations are not available." });
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
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
      const patch = { status: "completed" };
      if (await hasColumn(table, "completed_at")) patch.completed_at = new Date();
      await update(table, row.id, patch);
      const updated = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]);
      notifyVisitCompleted(updated || row, "instant consultation").catch(() => null);
      res.json({ message: "Session completed.", data: await presentRow(table, updated || row) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/patient/appointments/:id/pay", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      let amount = Number(appointment.amount || appointment.fee || appointment.consultation_fee || 0);
      if (!(amount > 0)) amount = await doctorOnlineFee(appointment.doctor_id);
      if (!(amount > 0)) {
        return res.status(422).json({ message: "This appointment has no payable fee." });
      }
      const paymentUuid = crypto.randomUUID();
      const invoiceNumber = `MC-${appointment.id}-${paymentUuid.slice(0, 8)}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      await insert("payments", {
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        payable_type: "appointment",
        payable_id: appointment.id,
        invoice_number: invoiceNumber,
        transaction_id: paymentUuid,
        idempotency_key: paymentUuid,
        amount,
        currency: appointment.currency || "RWF",
        status: "pending",
        description: `Appointment ${appointment.id}`,
        expires_at: expiresAt,
        uuid: paymentUuid,
        payment_uuid: paymentUuid,
      });
      res.json({
        message: "Payment started.",
        invoice_number: invoiceNumber,
        public_key: process.env.PAYMENT_PUBLIC_KEY || "",
        amount,
        currency: appointment.currency || "RWF",
        payment_uuid: paymentUuid,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/patient/appointments/:id/join", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      const room = `appointment-${appointment.id}`;
      const token = callToken({
        room,
        role: "patient",
        consultationId: appointment.id,
        name: "Patient",
      });
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

  router.post("/doctor/appointments/:id/join", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      if (appointment.doctor_id && Number(appointment.doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ message: "This appointment belongs to another doctor." });
      }
      const room = `appointment-${appointment.id}`;
      const token = callToken({
        room,
        role: "doctor",
        consultationId: appointment.id,
        name: "Doctor",
      });
      if (await hasColumn("appointments", "status") && ["pending", "confirmed", "accepted", "paid"].includes(String(appointment.status || ""))) {
        await update("appointments", appointment.id, { status: "in_progress" });
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

  router.post("/doctor/appointments/:id/complete", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId } = await currentDoctor(req);
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
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
      const patch = { status: "completed" };
      if (await hasColumn("appointments", "completed_at")) patch.completed_at = new Date();
      if (await hasColumn("appointments", "ended_at")) patch.ended_at = new Date();
      await update("appointments", appointment.id, patch);
      const updated = await one("SELECT * FROM appointments WHERE id = ?", [appointment.id]);
      notifyVisitCompleted(updated || appointment, "appointment").catch(() => null);
      res.json({ message: "Appointment completed.", appointment: await presentRow("appointments", updated) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/patient/instant-consultations/ready", requireAuth, async (req, res, next) => {
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
      if (req.user.email && await hasColumn(table, "guest_email")) {
        clauses.push("guest_email = ?");
        params.push(req.user.email);
      }
      if (!clauses.length) return res.json({ data: null });
      const row = await one(
        `SELECT * FROM \`${table}\` WHERE (${clauses.join(" OR ")}) AND status IN ('accepted','in_progress') ORDER BY id DESC LIMIT 1`,
        params,
      ).catch(() => null);
      if (!row) return res.json({ data: null });
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

  router.get("/patient/quick/:id", requireAuth, async (req, res, next) => {
    try {
      const table = (await tableExists("instant_consultation_requests"))
        ? "instant_consultation_requests"
        : "instant_consultations";
      const row = await tableExists(table)
        ? await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]).catch(() => null)
        : null;
      if (!row) return next();
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

  router.post("/patient/appointments/:id/reschedule", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      await update("appointments", req.params.id, {
        appointment_date: req.body?.appointment_date,
        appointment_time: req.body?.appointment_time,
        status: "pending",
      });
      const appointment = await presentRow("appointments", await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]));
      res.json({ message: "Appointment rescheduled.", appointment });
    } catch (error) {
      next(error);
    }
  });

  router.get("/admin/dashboard", requireAuth, requireRole("admin", "moderator", "finance", "help_desk"), async (req, res, next) => {
    try {
      const alive = async (table) => (await hasColumn(table, "deleted_at")) ? "deleted_at IS NULL" : "1=1";
      const count = async (sql, params = []) => Number((await one(sql, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const sum = async (sql, params = []) => Number((await one(sql, params).catch(() => ({ total: 0 })))?.total ?? 0);
      const like = req.query.q ? `%${req.query.q}%` : null;
      const userFilter = like ? " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)" : "";
      const userParams = like ? [like, like, like] : [];
      const roleCount = async (table) => {
        if (!(await tableExists(table))) return 0;
        if (!like || !(await hasColumn(table, "user_id"))) return count(`SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${await alive(table)}`);
        const deleted = (await hasColumn(table, "deleted_at")) ? "t.deleted_at IS NULL" : "1=1";
        return count(
          `SELECT COUNT(*) AS total FROM \`${table}\` t JOIN users u ON u.id = t.user_id WHERE ${deleted} AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`,
          userParams,
        );
      };
      const dateColumn = async (table) => {
        for (const column of ["appointment_date", "scheduled_at", "date", "paid_at", "created_at"]) {
          if (await hasColumn(table, column)) return column;
        }
        return null;
      };
      const dateClause = async (table) => {
        const column = await dateColumn(table);
        if (!column) return { sql: "", params: [] };
        if (req.query.date) return { sql: ` AND DATE(\`${column}\`) = ?`, params: [req.query.date] };
        const params = [];
        let sql = "";
        if (req.query.date_from) { sql += ` AND DATE(\`${column}\`) >= ?`; params.push(req.query.date_from); }
        if (req.query.date_to) { sql += ` AND DATE(\`${column}\`) <= ?`; params.push(req.query.date_to); }
        return { sql, params };
      };

      const appointmentDates = await dateClause("appointments");
      const paymentDates = await dateClause("payments");
      const appointmentAlive = await alive("appointments");
      const patients = await roleCount("patients");
      const doctors = await roleCount("doctors");
      const pharmacies = await roleCount("pharmacies");
      const hospitals = await roleCount("hospitals");
      const users = await count(`SELECT COUNT(*) AS total FROM users WHERE ${await alive("users")}${userFilter}`, userParams);
      const appointmentsTotal = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive}${appointmentDates.sql}`, appointmentDates.params);
      const appointmentsPending = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive} AND status IN ('pending','confirmed')${appointmentDates.sql}`, appointmentDates.params);
      const appointmentDay = await dateColumn("appointments");
      const appointmentsToday = appointmentDay
        ? await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive} AND DATE(\`${appointmentDay}\`) = CURDATE()`)
        : 0;
      const amountColumn = (await hasColumn("payments", "amount")) ? "amount" : (await hasColumn("payments", "total_amount")) ? "total_amount" : null;
      const paid = "status IN ('paid','completed','success','successful')";
      const paymentAlive = await alive("payments");
      const revenue = amountColumn
        ? await sum(`SELECT COALESCE(SUM(\`${amountColumn}\`), 0) AS total FROM payments WHERE ${paymentAlive} AND ${paid}${paymentDates.sql}`, paymentDates.params)
        : 0;
      const paymentDay = await dateColumn("payments");
      const revenueToday = amountColumn && paymentDay
        ? await sum(`SELECT COALESCE(SUM(\`${amountColumn}\`), 0) AS total FROM payments WHERE ${paymentAlive} AND ${paid} AND DATE(\`${paymentDay}\`) = CURDATE()`)
        : 0;
      const pendingPayments = await count(`SELECT COUNT(*) AS total FROM payments WHERE ${paymentAlive} AND status = 'pending'`);
      const certificateAlive = await alive("fitness_certificates");
      const certificatesPending = await count(`SELECT COUNT(*) AS total FROM fitness_certificates WHERE ${certificateAlive} AND status IN ('pending','submitted','review')`);
      const certificatesApproved = await count(`SELECT COUNT(*) AS total FROM fitness_certificates WHERE ${certificateAlive} AND status IN ('approved','issued','signed','completed')`);
      const activeConsultations = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${appointmentAlive} AND status IN ('in_progress','active','ongoing')`);

      res.json({
        status: true,
        data: {
          users: { patients, doctors, pharmacies, hospitals, total: users },
          appointments: { today: appointmentsToday, pending: appointmentsPending, total: appointmentsTotal },
          payments: {
            total_revenue: String(revenue),
            revenue_today: String(revenueToday),
            pending_count: pendingPayments,
            currency: "RWF",
          },
          certificates: { pending: certificatesPending, approved: certificatesApproved },
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
      const page = await listTable(req, "users", "admin");
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

        return { ...user, avatar, roles };
      }));
      if (req.query.role) page.data = page.data.filter((user) => user.roles.some((role) => role.name === req.query.role));
      res.json(page);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/admin/users/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
      await deleteUser(Number(req.params.id));
      res.json({ message: "User deleted." });
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
        const path = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
        return res.json(laravelPage({ data, total, page: pageNo, perPage, path }));
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

  router.post("/admin/team", requireAuth, teamUpload.fields([{ name: "photo", maxCount: 1 }, { name: "icon", maxCount: 1 }]), async (req, res, next) => {
    try {
      const id = await insert("team_members", teamFields(req.body, req.files));
      const member = await teamMember(id);
      res.status(201).json({ message: "Saved.", member, data: member });
    } catch (error) {
      next(error);
    }
  });

  router.post("/admin/team/:id/photo", requireAuth, teamUpload.single("photo"), async (req, res, next) => {
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

  router.post("/admin/team/:id/icon", requireAuth, teamUpload.single("icon"), async (req, res, next) => {
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

  router.patch("/admin/team/:id/toggle-active", requireAuth, async (req, res, next) => {
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

  router.post("/admin/team/:id", requireAuth, teamUpload.fields([{ name: "photo", maxCount: 1 }, { name: "icon", maxCount: 1 }]), async (req, res, next) => {
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
      if (fields.instant_consultation != null) fields.instant_consultation = fields.instant_consultation ? 1 : 0;
      if (Object.keys(fields).length) await update("doctors", doctorId, fields);
      if (body.gender && await hasColumn("users", "gender")) {
        await update("users", req.user.id, { gender: String(body.gender).toLowerCase() });
      }
      if (Array.isArray(body.insurance_ids)) await saveDoctorInsurances(doctorId, body.insurance_ids);
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
        const id = await insert(table, { ...body, doctor_id: doctorId });
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
        await update(table, existing.id, body);
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
      if (!table || !(await hasColumn(table, "doctor_id"))) return res.json({ data: null });
      const row = await one(
        `SELECT * FROM \`${table}\` WHERE doctor_id = ? AND status IN ('in_progress','accepted') ORDER BY id DESC LIMIT 1`,
        [doctorId],
      ).catch(() => null);
      res.json(row ? await presentRow(table, row) : { data: null });
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

  router.get("/:scope/:resource", allowPublic, async (req, res, next) => {
    try {
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
      if (req.params.resource === "profile") {
        const table = PROFILE_TABLE[req.params.scope];
        if (!table) return next();
        const row = await one(`SELECT * FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [req.user.id]);
        return res.json({ data: await presentRow(table, row), ...(await presentRow(table, row)) });
      }
      const table = await resolveResourceTable(req.params.scope, req.params.resource);
      if (!table) return next();
      let row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]));
      if (table === "appointments") row = await decorateAppointments(row);
      if (!row) return res.status(404).json({ message: "Record not found." });
      if (["doctors", "hospitals", "pharmacies", "patients", "users"].includes(table)) {
        [row] = await verifierNames([row]);
      }
      if (table === "team_members") {
        const member = withTeamPhoto(row);
        return res.json({ member, data: member, ...member });
      }
      res.json({ data: row, ...row });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:scope/profile", allowPublic, async (req, res, next) => {
    try {
      const table = PROFILE_TABLE[req.params.scope];
      if (!table) return next();
      let id = await loadOwnedId(req.user.id, table);
      if (!id) {
        await createProfile(req.user, req.params.scope);
        id = await loadOwnedId(req.user.id, table);
      }
      if (!id) return res.status(404).json({ message: "Profile not found." });
      const body = { ...(req.body ?? {}) };
      delete body.password;
      delete body.id;
      await update(table, id, body);
      const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
      res.json({ message: "Profile saved.", data: row, [req.params.scope]: row, ...(row ?? {}) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:scope/:resource", allowPublic, async (req, res, next) => {
    try {
      const table = await resolveResourceTable(req.params.scope, req.params.resource);
      if (!table) return next();
      const owned = await ownedFilter(req, table, req.params.scope);
      const extra = {};
      if (owned.sql.includes("_id")) extra[owned.sql.split("`")[1]] = owned.params[0];
      if (req.body?.password) req.body.password = await hashPassword(req.body.password);
      const id = await insert(table, { ...req.body, ...extra });
      res.status(201).json({ message: "Saved.", data: await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id])) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:scope/:resource/:id", allowPublic, updateResource);
  router.patch("/:scope/:resource/:id", allowPublic, updateResource);
  router.post("/:scope/:resource/:id", allowPublic, updateResource);

  router.delete("/:scope/:resource/:id", allowPublic, async (req, res, next) => {
    try {
      const table = await resolveResourceTable(req.params.scope, req.params.resource);
      if (!table) return next();
      if (await hasColumn(table, "deleted_at")) await update(table, req.params.id, { deleted_at: new Date() });
      else if (await hasColumn(table, "status")) await update(table, req.params.id, { status: "cancelled" });
      else await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
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
      res.json({ [key]: found.merged, data: found.merged, ...extra });
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
      const { page, perPage, offset } = pageArgs(req, 20);
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

  registerActions(router, RESOURCES);
}

async function updateResource(req, res, next) {
  try {
    const table = await resolveResourceTable(req.params.scope, req.params.resource);
    if (!table) return next();
    const body = { ...(req.body ?? {}) };
    delete body.password;
    await update(table, req.params.id, body);
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]));
    res.json({ message: "Updated.", data: row, ...(row ?? {}) });
  } catch (error) {
    next(error);
  }
}
