import crypto from "crypto";
import { countWhere, hasColumn, insert, laravelPage, one, pageArgs, presentRow, presentRows, q } from "./db.js";
import { broadcast } from "./realtime.js";

function pathOf(req) {
  return `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
}

async function whereActive(table, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  const parts = [];
  if (await hasColumn(table, "deleted_at")) parts.push(`${prefix}deleted_at IS NULL`);
  if (await hasColumn(table, "status")) parts.push(`(${prefix}status = 'active' OR ${prefix}status IS NULL OR ${prefix}status = 'approved')`);
  if (await hasColumn(table, "is_active")) parts.push(`(${prefix}is_active = 1 OR ${prefix}is_active IS NULL)`);
  return parts.length ? parts.join(" AND ") : "1=1";
}

async function attachDoctorRelations(doctors) {
  if (!doctors.length) return [];
  const ids = doctors.map((doctor) => doctor.id);
  const marks = ids.map(() => "?").join(",");
  const specs = await q(
    `SELECT ds.doctor_id, s.id, s.name
     FROM doctor_specialization ds
     JOIN specializations s ON s.id = ds.specialization_id
     WHERE ds.doctor_id IN (${marks})`,
    ids,
  ).catch(() => []);
  const hospitals = await q(
    `SELECT hd.doctor_id, h.id, COALESCE(h.name_en, h.name) AS name, h.city, h.address
     FROM hospital_doctors hd
     JOIN hospitals h ON h.id = hd.hospital_id
     WHERE hd.doctor_id IN (${marks})`,
    ids,
  ).catch(() => []);
  return doctors.map((doctor) => ({
    ...doctor,
    name: doctor.name || doctor.user_name,
    email: doctor.email || doctor.user_email,
    user: { id: doctor.user_id, name: doctor.user_name, avatar: doctor.user_avatar ?? null },
    specializations: specs.filter((row) => row.doctor_id === doctor.id).map(({ id, name }) => ({ id, name })),
    hospitals: hospitals.filter((row) => row.doctor_id === doctor.id).map(({ id, name, city, address }) => ({ id, name, city, address })),
    sub_specializations: Array.isArray(doctor.sub_specializations) ? doctor.sub_specializations : [],
  }));
}

async function doctorStats(whereSql, params) {
  const total = await countWhere("doctors d JOIN users u ON u.id = d.user_id", whereSql, params);
  const online = await countWhere(
    "doctors d JOIN users u ON u.id = d.user_id",
    `${whereSql} AND (d.consultation_type IN ('online','both') OR d.is_available = 1)`,
    params,
  ).catch(() => total);
  const instant = await countWhere(
    "doctors d JOIN users u ON u.id = d.user_id",
    `${whereSql} AND d.instant_consultation = 1`,
    params,
  ).catch(() => 0);
  return { total, online, instant, available_today: 0 };
}

export function publicRoutes(router) {
  router.get("/public/doctors/available-doctors", async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 15);
      const filters = ["(" + (await whereActive("doctors", "d")) + ")"];
      const params = [];
      if (req.query.q) {
        filters.push("(u.name LIKE ? OR d.specialization LIKE ? OR d.city LIKE ? OR d.slug LIKE ?)");
        const like = `%${req.query.q}%`;
        params.push(like, like, like, like);
      }
      if (req.query.specialization) {
        filters.push("(d.specialization = ? OR EXISTS (SELECT 1 FROM doctor_specialization ds JOIN specializations s ON s.id = ds.specialization_id WHERE ds.doctor_id = d.id AND (s.slug = ? OR s.name = ?)))");
        params.push(req.query.specialization, req.query.specialization, req.query.specialization);
      }
      if (req.query.type) {
        filters.push("d.consultation_type = ?");
        params.push(req.query.type);
      }
      if (req.query.language) {
        filters.push("d.preferred_language = ?");
        params.push(req.query.language);
      }
      if (req.query.city) {
        filters.push("d.city = ?");
        params.push(req.query.city);
      }
      if (req.query.gender && (await hasColumn("users", "gender"))) {
        filters.push("u.gender = ?");
        params.push(req.query.gender);
      }
      if (req.query.hospital_id) {
        filters.push("EXISTS (SELECT 1 FROM hospital_doctors hd WHERE hd.doctor_id = d.id AND hd.hospital_id = ?)");
        params.push(req.query.hospital_id);
      }
      if (req.query.instant === "true") {
        filters.push("d.instant_consultation = 1");
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const total = await countWhere("doctors d JOIN users u ON u.id = d.user_id", where, params);
      const rows = await q(
        `SELECT d.*, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar
         FROM doctors d JOIN users u ON u.id = d.user_id
         ${where}
         ORDER BY d.is_featured DESC, d.id DESC
         LIMIT ? OFFSET ?`,
        [...params, perPage, offset],
      );
      const shaped = await presentRows("doctors", rows);
      const data = await attachDoctorRelations(shaped);
      const stats = await doctorStats(where, params);
      res.json({ ...laravelPage({ data, total, page, perPage, path: pathOf(req) }), stats });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/doctors/:slug/availability", async (req, res, next) => {
    try {
      const doctor = await one("SELECT * FROM doctors WHERE slug = ? LIMIT 1", [req.params.slug]);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      const recurring = await q("SELECT * FROM doctor_availabilities WHERE doctor_id = ?", [doctor.id]).catch(() => []);
      const periods = await q("SELECT * FROM doctor_availability_periods WHERE doctor_id = ?", [doctor.id]).catch(() => []);
      const slots = await q(
        "SELECT * FROM appointment_slots WHERE doctor_id = ? AND slot_date = CURDATE()",
        [doctor.id],
      ).catch(() => []);
      res.json({
        recurring_availability: await presentRows("doctor_availabilities", recurring),
        availability_periods: await presentRows("doctor_availability_periods", periods),
        slots_for_date: await presentRows("appointment_slots", slots),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/doctors/:slug", async (req, res, next) => {
    try {
      const rows = await q(
        `SELECT d.*, u.name AS user_name, u.email AS user_email, u.avatar AS user_avatar
         FROM doctors d JOIN users u ON u.id = d.user_id
         WHERE d.slug = ? LIMIT 1`,
        [req.params.slug],
      );
      if (!rows.length) return res.status(404).json({ message: "Doctor not found." });
      const [doctor] = await attachDoctorRelations(await presentRows("doctors", rows));
      res.json({ data: doctor, ...doctor });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/hospitals", async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 12);
      const filters = [await whereActive("hospitals", "h")];
      const params = [];
      if (req.query.q) {
        const like = `%${req.query.q}%`;
        const parts = ["h.city LIKE ?", "h.slug LIKE ?"];
        params.push(like, like);
        if (await hasColumn("hospitals", "name")) {
          parts.push("h.name LIKE ?");
          params.push(like);
        }
        if (await hasColumn("hospitals", "name_en")) {
          parts.push("h.name_en LIKE ?");
          params.push(like);
        }
        filters.push(`(${parts.join(" OR ")})`);
      }
      if (req.query.city) {
        filters.push("h.city = ?");
        params.push(req.query.city);
      }
      if (req.query.type) {
        filters.push("h.type = ?");
        params.push(req.query.type);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const total = await countWhere("hospitals h", where, params);
      const rows = await presentRows("hospitals", await q(`SELECT h.* FROM hospitals h ${where} ORDER BY h.id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]));
      const data = await Promise.all(rows.map(async (hospital) => {
        const departments = await q("SELECT id, name_en, icon FROM hospital_departments WHERE hospital_id = ?", [hospital.id]).catch(() => []);
        const insurances = await q(
          `SELECT i.id, i.name, i.code, i.logo FROM hospital_insurances hi JOIN insurances i ON i.id = hi.insurance_id WHERE hi.hospital_id = ?`,
          [hospital.id],
        ).catch(() => []);
        const hours = await q("SELECT * FROM hospital_working_hours WHERE hospital_id = ?", [hospital.id]).catch(() => []);
        const doctorsCount = await one("SELECT COUNT(*) AS total FROM hospital_doctors WHERE hospital_id = ?", [hospital.id]).catch(() => ({ total: 0 }));
        return {
          ...hospital,
          name_en: hospital.name_en || hospital.name,
          doctors_count: Number(doctorsCount?.total ?? 0),
          departments_count: departments.length,
          departments,
          insurances,
          working_hours: hours.map((hour) => ({
            day: hour.day || hour.day_of_week,
            open_time: hour.open_time,
            close_time: hour.close_time,
            is_closed: Boolean(hour.is_closed),
          })),
        };
      }));
      res.json(laravelPage({ data, total, page, perPage, path: pathOf(req) }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/hospitals/:slug", async (req, res, next) => {
    try {
      const row = await one("SELECT * FROM hospitals WHERE slug = ? OR id = ? LIMIT 1", [req.params.slug, req.params.slug]);
      if (!row) return res.status(404).json({ message: "Hospital not found." });
      res.json({ data: await presentRow("hospitals", row) });
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/pharmacies", "/public/pharmacies/nearby"], async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 12);
      const filters = [await whereActive("pharmacies", "p")];
      const params = [];
      if (req.query.q) {
        filters.push("(p.name LIKE ? OR p.city LIKE ? OR p.slug LIKE ?)");
        const like = `%${req.query.q}%`;
        params.push(like, like, like);
      }
      if (req.query.city) {
        filters.push("p.city = ?");
        params.push(req.query.city);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const total = await countWhere("pharmacies p", where, params);
      const rows = await presentRows("pharmacies", await q(`SELECT p.* FROM pharmacies p ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]));
      const data = await Promise.all(rows.map(async (pharmacy) => ({
        ...pharmacy,
        working_hours: await q("SELECT * FROM pharmacy_working_hours WHERE pharmacy_id = ?", [pharmacy.id]).catch(() => []),
        social_links: null,
        distance_km: null,
      })));
      const last = Math.max(1, Math.ceil(total / perPage) || 1);
      res.json({
        status: "success",
        data,
        meta: { current_page: page, last_page: last, per_page: perPage, total },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/pharmacies/:slug", async (req, res, next) => {
    try {
      const row = await one("SELECT * FROM pharmacies WHERE slug = ? LIMIT 1", [req.params.slug]);
      if (!row) return res.status(404).json({ message: "Pharmacy not found." });
      const pharmacy = await presentRow("pharmacies", row);
      pharmacy.working_hours = await q("SELECT * FROM pharmacy_working_hours WHERE pharmacy_id = ?", [pharmacy.id]).catch(() => []);
      res.json({ status: "success", data: pharmacy });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/services", async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 20);
      const params = [];
      let where = "WHERE 1=1";
      if (await hasColumn("services", "is_active")) where += " AND (is_active = 1 OR is_active IS NULL)";
      if (req.query.search) {
        where += " AND (title_en LIKE ? OR title_fr LIKE ? OR title_kiny LIKE ?)";
        const like = `%${req.query.search}%`;
        params.push(like, like, like);
      }
      const total = await countWhere("services", where, params);
      const data = await presentRows("services", await q(`SELECT * FROM services ${where} ORDER BY \`order\` ASC, id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(async () => q(`SELECT * FROM services ${where} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset])));
      res.json(laravelPage({ data, total, page, perPage, path: pathOf(req) }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/services/:id", async (req, res, next) => {
    try {
      const service = await presentRow("services", await one("SELECT * FROM services WHERE id = ?", [req.params.id]));
      if (!service) return res.status(404).json({ message: "Service not found." });
      res.json({ service });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/team", async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 20);
      const params = [];
      let where = "WHERE 1=1";
      if (await hasColumn("team_members", "is_active")) where += " AND (is_active = 1 OR is_active IS NULL)";
      if (req.query.search) {
        where += " AND name LIKE ?";
        params.push(`%${req.query.search}%`);
      }
      const total = await countWhere("team_members", where, params);
      const data = await presentRows("team_members", await q(`SELECT * FROM team_members ${where} ORDER BY \`order\` ASC, id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(async () => q(`SELECT * FROM team_members ${where} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset])));
      res.json(laravelPage({ data, total, page, perPage, path: pathOf(req) }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/team/:id", async (req, res, next) => {
    try {
      const member = await presentRow("team_members", await one("SELECT * FROM team_members WHERE id = ?", [req.params.id]));
      if (!member) return res.status(404).json({ message: "Team member not found." });
      res.json({ member });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/settings", async (req, res, next) => {
    try {
      const rows = await q("SELECT * FROM system_settings").catch(() => []);
      const settings = { general: {}, video: {}, security: {} };
      for (const row of rows) {
        const key = row.key || row.name || row.setting_key;
        if (!key) continue;
        const group = settings[row.group] ? row.group : "general";
        let value = row.value ?? row.setting_value;
        if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
          try { value = JSON.parse(value); } catch { /* keep string */ }
        }
        settings[group][key] = value;
      }
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/stats/login-stats", async (req, res, next) => {
    try {
      const users = await one("SELECT COUNT(*) AS total FROM users");
      res.json({ users_served: Number(users?.total ?? 0), recovery_rate: 0 });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/stats/pharmacies", async (req, res, next) => {
    try {
      const pharmacies = await one("SELECT COUNT(*) AS total FROM pharmacies");
      const orders = await one("SELECT COUNT(*) AS total FROM pharmacy_orders").catch(() => ({ total: 0 }));
      res.json({ total: Number(pharmacies?.total ?? 0), orders: Number(orders?.total ?? 0) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/help-center", async (req, res, next) => {
    try {
      const params = [];
      let where = "WHERE 1=1";
      if (await hasColumn("help_center_links", "is_active")) where += " AND (is_active = 1 OR is_active IS NULL)";
      if (req.query.category) {
        where += " AND category = ?";
        params.push(req.query.category);
      }
      const links = await presentRows("help_center_links", await q(`SELECT * FROM help_center_links ${where} ORDER BY \`order\` ASC, id ASC`, params).catch(async () => q(`SELECT * FROM help_center_links ${where} ORDER BY id ASC`, params)));
      res.json({ links });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/insurances", async (req, res, next) => {
    try {
      const insurances = await presentRows("insurances", await q("SELECT * FROM insurances ORDER BY name ASC"));
      res.json({ insurances, data: insurances });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/dropdowns/specializations", async (req, res, next) => {
    try {
      const params = [];
      let where = "";
      if (req.query.search) {
        where = "WHERE name LIKE ? OR slug LIKE ?";
        params.push(`%${req.query.search}%`, `%${req.query.search}%`);
      }
      const rows = await presentRows("specializations", await q(`SELECT * FROM specializations ${where} ORDER BY name ASC`, params));
      res.json(rows.map((row) => ({ ...row, doctorCount: undefined })));
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/specialization-fees", "/public/dropdowns/specialization-fees"], async (req, res, next) => {
    try {
      const params = [];
      const filters = [];
      if (req.query.specialization_id) {
        filters.push("specialization_id = ?");
        params.push(req.query.specialization_id);
      }
      if (req.query.search) {
        filters.push("(sub_specialization LIKE ? OR tier_name LIKE ? OR slug LIKE ?)");
        const like = `%${req.query.search}%`;
        params.push(like, like, like);
      }
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      res.json(await presentRows("specialization_fees", await q(`SELECT * FROM specialization_fees ${where} ORDER BY id ASC`, params)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/dropdowns/specialization-sub-types/:slug", async (req, res, next) => {
    try {
      const specialization = await one("SELECT id, name, slug FROM specializations WHERE slug = ? LIMIT 1", [req.params.slug]);
      const rows = await q(
        "SELECT * FROM specialization_sub_types WHERE slug = ? OR specialization_id = ? ORDER BY name ASC",
        [req.params.slug, specialization?.id ?? 0],
      ).catch(() => []);
      res.json({
        specialization: specialization ?? { id: 0, name: req.params.slug, slug: req.params.slug },
        sub_types: await presentRows("specialization_sub_types", rows),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/medicines", "/public/medicines/all"], async (req, res, next) => {
    try {
      const all = req.path.endsWith("/all");
      const { page, perPage, offset } = pageArgs(req, all ? 500 : 20);
      const params = [];
      let where = "WHERE 1=1";
      if (req.query.q || req.query.search) {
        where += " AND (m.name LIKE ? OR m.generic_name LIKE ?)";
        const like = `%${req.query.q || req.query.search}%`;
        params.push(like, like);
      }
      const total = await countWhere("pharmacy_medicines m", where, params);
      const rows = await q(
        `SELECT m.*, p.id AS pharmacy_id, p.slug AS pharmacy_slug, p.name AS pharmacy_name
         FROM pharmacy_medicines m
         LEFT JOIN pharmacies p ON p.id = m.pharmacy_id
         ${where}
         ORDER BY m.name ASC
         LIMIT ? OFFSET ?`,
        [...params, all ? Math.max(perPage, 500) : perPage, all ? 0 : offset],
      );
      const data = rows.map((row) => ({
        ...row,
        pharmacy: row.pharmacy_id ? { id: row.pharmacy_id, slug: row.pharmacy_slug, name: row.pharmacy_name } : null,
      }));
      if (all) return res.json(data);
      const last = Math.max(1, Math.ceil(total / perPage) || 1);
      res.json({ status: "success", data, meta: { current_page: page, last_page: last, per_page: perPage, total } });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/payments/:uuid/status", async (req, res, next) => {
    try {
      const payment = await one(
        "SELECT * FROM payments WHERE uuid = ? OR payment_uuid = ? OR id = ? LIMIT 1",
        [req.params.uuid, req.params.uuid, req.params.uuid],
      );
      if (!payment) return res.status(404).json({ message: "Payment not found." });
      res.json({ status: payment.status, payment: await presentRow("payments", payment) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/contact", async (req, res) => {
    res.json({ message: "Message received." });
  });

  router.post(["/public/instant-consultations/request", "/public/instant-consultations/request-any"], async (req, res, next) => {
    try {
      const id = await insert("instant_consultation_requests", {
        ...req.body,
        guest_name: req.body?.name || req.body?.guest_name,
        guest_email: req.body?.email || req.body?.guest_email,
        status: "pending",
      });
      const request = await presentRow("instant_consultation_requests", await one("SELECT * FROM instant_consultation_requests WHERE id = ?", [id]));
      res.status(201).json({ message: "Request received.", data: request, id });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/consultations/signal", (req, res) => {
    const room = req.body?.room;
    if (room) {
      broadcast(`consultation.${room}`, "webrtc.signal", req.body);
    }
    res.json({ message: "Signal sent." });
  });

  router.get("/health", async (_req, res) => {
    const row = await one("SELECT COUNT(*) AS users FROM users");
    res.json({
      status: true,
      service: "mediconnect-node",
      database: process.env.DB_DATABASE || "mediconnect",
      users: Number(row?.users ?? 0),
    });
  });
}

export function paymentUuid() {
  return crypto.randomUUID();
}
