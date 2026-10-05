import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { registerActions } from "./actions.js";
import { withTeamPhoto } from "./public.js";
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
  if (table === "team_members") data = data.map(withTeamPhoto);
  const path = `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
  return laravelPage({ data, total, page, perPage, path });
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
  profile: null,
};

export function appRoutes(router) {
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

  router.post("/auth/forgot-password", async (req, res) => {
    res.json({ message: "If that account exists, a reset code has been stored." });
  });

  router.post("/auth/reset-password", async (req, res, next) => {
    try {
      const row = await findUserByLogin(req.body ?? {});
      if (!row) return res.status(422).json({ message: "Account not found." });
      const otp = await one(
        "SELECT id FROM otps WHERE code = ? AND (email = ? OR phone = ?) ORDER BY id DESC LIMIT 1",
        [req.body?.otp, req.body?.email ?? "", req.body?.phone ?? ""],
      );
      if (!otp) return res.status(422).json({ message: "That code is not valid." });
      if (req.body?.password !== req.body?.password_confirmation) {
        return res.status(422).json({ message: "Password confirmation does not match." });
      }
      await update("users", row.id, { password: await hashPassword(req.body.password) });
      await pool.query("DELETE FROM otps WHERE id = ?", [otp.id]);
      res.json({ message: "Password updated." });
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
      res.json({ message: "Verification code created." });
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
      const patientId = await loadOwnedId(req.user.id, "patients");
      const groups = await countStatus("appointments", "patient_id", patientId);
      const byStatus = Object.fromEntries(groups.map((row) => [row.status, Number(row.total)]));
      const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
      dashboard.today = {
        total,
        completed: byStatus.completed ?? 0,
        pending: byStatus.pending ?? 0,
        confirmed: byStatus.confirmed ?? 0,
        cancelled: byStatus.cancelled ?? 0,
        instant_active: 0,
      };
      dashboard.period_stats.total_appointments = total;
      dashboard.period_stats.completed = byStatus.completed ?? 0;
      dashboard.period_stats.cancelled = byStatus.cancelled ?? 0;
      dashboard.period_stats.pending = byStatus.pending ?? 0;
      const prescriptions = await one("SELECT COUNT(*) AS total FROM prescriptions WHERE patient_id = ?", [patientId]).catch(() => ({ total: 0 }));
      dashboard.prescriptions.total = Number(prescriptions?.total ?? 0);
      dashboard.prescriptions.active = dashboard.prescriptions.total;
      dashboard.period_stats.prescriptions_received = dashboard.prescriptions.total;
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
      const revenueTotal = await sumAmount(`${window.sql} AND ${completedSql}`, window.params);
      const previousTotal = await sumAmount(`${previous.sql} AND ${completedSql}`, previous.params);
      const revenueCount = await count(`SELECT COUNT(*) AS total FROM appointments WHERE ${owned} AND ${window.sql} AND ${completedSql}`, [doctorId, ...window.params]);
      const onlineRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${completedSql} AND \`${typeColumn}\` NOT LIKE '%person%' AND \`${typeColumn}\` NOT LIKE '%instant%'`, window.params) : revenueTotal;
      const inPersonRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${completedSql} AND (\`${typeColumn}\` LIKE '%person%' OR \`${typeColumn}\` LIKE '%clinic%')`, window.params) : 0;
      const instantRevenue = typeColumn ? await sumAmount(`${window.sql} AND ${completedSql} AND \`${typeColumn}\` LIKE '%instant%'`, window.params) : 0;
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
         LEFT JOIN patients p ON p.id = r.patient_id
         LEFT JOIN users u ON u.id = p.user_id
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

  router.get("/doctor/instant-consultations/queue", requireAuth, requireRole("doctor"), async (req, res, next) => {
    try {
      const { doctorId, doctor } = await currentDoctor(req);
      const table = (await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : (await tableExists("instant_consultations")) ? "instant_consultations" : null;
      let queue = [];
      let seenToday = 0;
      let resolved = 0;
      if (table) {
        const owner = (await hasColumn(table, "doctor_id")) ? "(doctor_id = ? OR doctor_id IS NULL)" : "1=1";
        const params = owner.includes("?") ? [doctorId] : [];
        const rows = await q(
          `SELECT * FROM \`${table}\` WHERE ${owner} AND status IN ('pending','queued','waiting','confirmed') ORDER BY id ASC LIMIT 50`,
          params,
        ).catch(() => []);
        queue = rows.map((row, index) => ({
          id: row.id,
          guest_phone: row.guest_phone || row.phone || "",
          description: row.description || row.reason || null,
          status: row.status || "pending",
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
          in_queue: queue.length,
          seen_today: seenToday,
          avg_duration: "0 min",
          resolved,
          is_online: Boolean(Number(doctor?.instant_consultation ?? 0)),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/patient/appointments/:id/pay", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      const appointment = await one("SELECT * FROM appointments WHERE id = ?", [req.params.id]);
      if (!appointment) return res.status(404).json({ message: "Appointment not found." });
      const paymentUuid = crypto.randomUUID();
      await insert("payments", {
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        amount: appointment.amount || appointment.fee || appointment.consultation_fee || 0,
        currency: appointment.currency || "RWF",
        status: "pending",
        uuid: paymentUuid,
        payment_uuid: paymentUuid,
      });
      res.json({
        message: "Payment started.",
        invoice_number: `MC-${appointment.id}`,
        public_key: process.env.PAYMENT_PUBLIC_KEY || "",
        amount: Number(appointment.amount || appointment.fee || appointment.consultation_fee || 0),
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
      res.json({
        message: "Session ready.",
        room_url: `/consultation/${room}`,
        room_name: room,
        token: req.headers.authorization?.slice(7) || "",
        join_url: `/consultation/${room}`,
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
          `SELECT r.id, r.name FROM model_has_roles m JOIN roles r ON r.id = m.role_id WHERE m.model_id = ?`,
          [user.id],
        );
        return { ...user, roles };
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

  router.get("/:scope/profile", allowPublic, async (req, res, next) => {
    try {
      const table = PROFILE_TABLE[req.params.scope];
      if (!table) return next();
      const row = await one(`SELECT * FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [req.user.id]);
      const data = await presentRow(table, row);
      res.json({ data, ...(data ?? {}) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:scope/:resource", allowPublic, async (req, res, next) => {
    try {
      const table = RESOURCES[req.params.resource];
      if (!table || !(await tableExists(table))) return next();
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
      const table = RESOURCES[req.params.resource];
      if (!table || !(await tableExists(table))) return next();
      const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]));
      if (!row) return res.status(404).json({ message: "Record not found." });
      if (table === "team_members") {
        const member = withTeamPhoto(row);
        return res.json({ member, data: member, ...member });
      }
      res.json({ data: row, ...row });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:scope/:resource", allowPublic, async (req, res, next) => {
    try {
      const table = RESOURCES[req.params.resource];
      if (!table || !(await tableExists(table))) return next();
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
      const table = RESOURCES[req.params.resource];
      if (!table || !(await tableExists(table))) return next();
      if (await hasColumn(table, "deleted_at")) await update(table, req.params.id, { deleted_at: new Date() });
      else if (await hasColumn(table, "status")) await update(table, req.params.id, { status: "cancelled" });
      else await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      res.json({ message: "Deleted." });
    } catch (error) {
      next(error);
    }
  });

  registerActions(router, RESOURCES);
}

async function updateResource(req, res, next) {
  try {
    const table = RESOURCES[req.params.resource];
    if (!table || !(await tableExists(table))) return next();
    const body = { ...(req.body ?? {}) };
    delete body.password;
    await update(table, req.params.id, body);
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]));
    res.json({ message: "Updated.", data: row, ...(row ?? {}) });
  } catch (error) {
    next(error);
  }
}
