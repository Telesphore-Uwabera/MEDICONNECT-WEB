import crypto from "crypto";
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
  const data = await presentRows(table, await q(`SELECT * FROM \`${table}\` ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]));
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

  router.get("/:scope/profile", requireAuth, async (req, res, next) => {
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

  router.get("/:scope/:resource", requireAuth, async (req, res, next) => {
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

  router.get("/:scope/:resource/:id", requireAuth, async (req, res, next) => {
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
      res.json({ data: row, ...row });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:scope/:resource", requireAuth, async (req, res, next) => {
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

  router.put("/:scope/:resource/:id", requireAuth, updateResource);
  router.patch("/:scope/:resource/:id", requireAuth, updateResource);
  router.post("/:scope/:resource/:id", requireAuth, updateResource);

  router.delete("/:scope/:resource/:id", requireAuth, async (req, res, next) => {
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
