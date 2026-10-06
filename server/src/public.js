import crypto from "crypto";
import { countWhere, hasColumn, insert, laravelPage, one, pageArgs, presentRow, presentRows, q, tableExists } from "./db.js";
import { broadcast } from "./realtime.js";

function pathOf(req) {
  return `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`;
}

export function teamPhotoUrl(photo) {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo) || photo.startsWith("/")) return photo;
  if (!/\.(webp|jpe?g|png|gif|bmp|tiff?)$/i.test(String(photo))) return null;
  return `/minio/mediconnect-avatars/${String(photo).replace(/^\/+/, "")}`;
}

export function withTeamPhoto(member) {
  if (!member) return member;
  return {
    ...member,
    photo_url: member.photo_url || teamPhotoUrl(member.photo),
    icon_url: member.icon_url || teamPhotoUrl(member.icon),
  };
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
      const specialtyName = String(req.query.specialization || "").trim();
      const subName = String(req.query.sub_specialization || "").trim();
      const feeId = Number(req.query.specialization_fee_id);
      if (specialtyName || subName || (Number.isFinite(feeId) && feeId > 0)) {
        const clauses = [];
        if (Number.isFinite(feeId) && feeId > 0) {
          clauses.push("d.specialization_fee_id = ?");
          params.push(feeId);
        }
        for (const name of [...new Set([specialtyName, subName].filter(Boolean))]) {
          const like = `%${name}%`;
          clauses.push("(d.specialization = ? OR d.specialization LIKE ?)");
          params.push(name, like);
          clauses.push(`EXISTS (
            SELECT 1 FROM specialization_fees sf
            WHERE sf.id = d.specialization_fee_id
              AND (
                sf.sub_specialization = ? OR sf.sub_specialization LIKE ?
                OR sf.sub_specialization_fr = ? OR sf.sub_specialization_fr LIKE ?
                OR sf.sub_specialization_kiny = ? OR sf.sub_specialization_kiny LIKE ?
                OR sf.slug = ?
              )
          )`);
          params.push(name, like, name, like, name, like, name);
          clauses.push(`EXISTS (
            SELECT 1 FROM doctor_specialization ds
            JOIN specializations s ON s.id = ds.specialization_id
            WHERE ds.doctor_id = d.id AND (s.name = ? OR s.name LIKE ? OR s.slug = ?)
          )`);
          params.push(name, like, name);
        }
        if (clauses.length) filters.push(`(${clauses.join(" OR ")})`);
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

  router.get("/public/doctors/:slug/slots", async (req, res, next) => {
    try {
      const doctor = await one(
        `SELECT d.id, d.slug, u.name AS user_name
         FROM doctors d LEFT JOIN users u ON u.id = d.user_id
         WHERE d.slug = ? OR d.id = ? LIMIT 1`,
        [req.params.slug, req.params.slug],
      );
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      const params = [doctor.id];
      let sql = "SELECT * FROM appointment_slots WHERE doctor_id = ?";
      if (req.query.date) {
        sql += " AND slot_date = ?";
        params.push(String(req.query.date).slice(0, 10));
      }
      sql += " ORDER BY slot_date, start_time LIMIT 500";
      const rows = await presentRows("appointment_slots", await q(sql, params).catch(() => []));
      const grouped = {};
      for (const row of rows) {
        const key = String(row.slot_date || "").slice(0, 10);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      }
      res.json({
        doctor: { id: doctor.id, name: doctor.user_name, slug: doctor.slug },
        slots: grouped,
        dates: Object.keys(grouped),
        total: rows.length,
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
        for (const column of ["name", "name_en", "name_fr", "name_kiny", "address"]) {
          if (await hasColumn("hospitals", column)) {
            parts.push(`h.${column} LIKE ?`);
            params.push(like);
          }
        }
        const departmentColumns = [];
        for (const column of ["name_en", "name_fr", "name_kiny", "name"]) {
          if (await hasColumn("hospital_departments", column)) departmentColumns.push(column);
        }
        if (departmentColumns.length) {
          parts.push(`EXISTS (SELECT 1 FROM hospital_departments hd WHERE hd.hospital_id = h.id AND (${departmentColumns.map((column) => `hd.${column} LIKE ?`).join(" OR ")}))`);
          departmentColumns.forEach(() => params.push(like));
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
      const data = (await presentRows("team_members", await q(`SELECT * FROM team_members ${where} ORDER BY \`order\` ASC, id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(async () => q(`SELECT * FROM team_members ${where} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset])))).map(withTeamPhoto);
      res.json(laravelPage({ data, total, page, perPage, path: pathOf(req) }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/team/:id", async (req, res, next) => {
    try {
      const member = withTeamPhoto(await presentRow("team_members", await one("SELECT * FROM team_members WHERE id = ?", [req.params.id])));
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
      const totals = await one("SELECT COUNT(*) AS total FROM pharmacies");
      const medicines = await one("SELECT COUNT(*) AS total FROM medicines").catch(() => ({ total: 0 }));
      const active = await one("SELECT COUNT(*) AS total FROM medicines WHERE is_active = 1").catch(() => medicines);
      const rows = await q("SELECT * FROM pharmacies ORDER BY id DESC LIMIT 50").catch(() => []);
      res.json({
        summary: {
          total_pharmacies: Number(totals?.total ?? 0),
          total_medicines: Number(medicines?.total ?? 0),
          active_medicines: Number(active?.total ?? 0),
        },
        pharmacies: rows.map((row) => ({
          id: row.id,
          name: row.name_en || row.name || row.slug || "Pharmacy",
          slug: row.slug || String(row.id),
          total_medicines: 0,
          active_medicines: 0,
        })),
      });
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
        where += " AND m.name LIKE ?";
        const like = `%${req.query.q || req.query.search}%`;
        params.push(like);
      }
      const total = await countWhere("pharmacy_medicines m", where, params);
      const rows = await q(
        `SELECT m.*
         FROM pharmacy_medicines m
         ${where}
         ORDER BY m.id DESC
         LIMIT ? OFFSET ?`,
        [...params, all ? Math.max(perPage, 500) : perPage, all ? 0 : offset],
      );
      const data = rows.map((row) => ({ ...row, pharmacy: null }));
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

  router.get("/public/instant-consultations/:token/status", async (req, res, next) => {
    try {
      const table = (await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : "instant_consultations";
      const row = await one(
        `SELECT * FROM \`${table}\` WHERE guest_token = ? OR id = ? ORDER BY id DESC LIMIT 1`,
        [req.params.token, req.params.token],
      ).catch(() => null);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      res.json({
        id: row.id,
        status: row.status || "pending",
        payment_status: row.payment_status || null,
        queue_position: Number(row.queue_position || 1),
        people_ahead: Number(row.people_ahead || 0),
        room_url: row.daily_room_url || row.room_url || null,
        daily_guest_token: row.daily_guest_token || null,
        amount: Number(row.amount || 0),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/instant-consultations/pay/:id", async (req, res, next) => {
    try {
      const table = (await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : "instant_consultations";
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      const paymentUuid = crypto.randomUUID();
      const amount = Number(row.amount || row.fee || 0);
      if (await tableExists("payments")) {
        await insert("payments", {
          amount,
          currency: row.currency || "RWF",
          status: "pending",
          uuid: paymentUuid,
          payment_uuid: paymentUuid,
          payable_id: row.id,
          payable_type: "instant_consultation",
        });
      }
      res.json({
        message: "Payment started.",
        invoice_number: row.invoice_number || `MC-${row.id}`,
        public_key: process.env.PAYMENT_PUBLIC_KEY || "",
        amount,
        currency: row.currency || "RWF",
        payment_uuid: paymentUuid,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/payments/check-invoice/:invoice", async (req, res, next) => {
    try {
      const invoice = decodeURIComponent(req.params.invoice);
      const payment = await one(
        "SELECT * FROM payments WHERE invoice_number = ? OR uuid = ? OR payment_uuid = ? OR id = ? ORDER BY id DESC LIMIT 1",
        [invoice, invoice, invoice, invoice],
      ).catch(() => null);
      res.json({ status: payment?.status || "pending", payment: payment ? await presentRow("payments", payment) : null });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/medicines/pharmacy/:slug", async (req, res, next) => {
    try {
      const pharmacy = await one("SELECT id FROM pharmacies WHERE slug = ? OR id = ? LIMIT 1", [req.params.slug, req.params.slug]);
      if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found." });
      const rows = await presentRows("pharmacy_medicines", await q(
        "SELECT * FROM pharmacy_medicines WHERE pharmacy_id = ? ORDER BY name LIMIT 200",
        [pharmacy.id],
      ).catch(() => []));
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/medicines/availability", async (req, res, next) => {
    try {
      const medicine = await one("SELECT * FROM pharmacy_medicines WHERE id = ? LIMIT 1", [req.query.medicine_id]).catch(() => null);
      res.json({ available: Boolean(medicine && Number(medicine.quantity ?? medicine.stock ?? 1) > 0), medicine });
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/dropdowns/specialization-fees", "/public/specialization-fees"], async (req, res, next) => {
    try {
      const params = [];
      let where = "WHERE 1=1";
      if (req.query.specialization_id) {
        where += " AND (specialization_id = ? OR id = ?)";
        params.push(req.query.specialization_id, req.query.specialization_id);
      }
      if (req.query.search) {
        where += " AND (sub_specialization LIKE ? OR sub_specialization_fr LIKE ? OR sub_specialization_kiny LIKE ?)";
        const like = `%${req.query.search}%`;
        params.push(like, like, like);
      }
      const rows = await presentRows("specialization_fees", await q(`SELECT * FROM specialization_fees ${where} ORDER BY id LIMIT 200`, params).catch(() => []));
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/legal-documents/:type", async (req, res, next) => {
    try {
      const row = await one(
        "SELECT * FROM legal_documents WHERE type = ? OR slug = ? OR id = ? ORDER BY id DESC LIMIT 1",
        [req.params.type, req.params.type, req.params.type],
      ).catch(() => null);
      if (!row) return res.status(404).json({ message: "Document not found." });
      res.json(await presentRow("legal_documents", row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/page-setup/terms/:type", async (req, res, next) => {
    try {
      const row = await one(
        "SELECT * FROM legal_documents WHERE type = ? OR slug = ? ORDER BY id DESC LIMIT 1",
        [req.params.type, req.params.type],
      ).catch(() => null);
      res.json({
        title: row?.title || row?.title_en || req.params.type,
        content: row?.content || row?.content_en || row?.body || "",
        data: row ? await presentRow("legal_documents", row) : null,
      });
    } catch (error) {
      next(error);
    }
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
