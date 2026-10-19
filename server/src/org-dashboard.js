import { hasColumn, one, q, tableExists } from "./db.js";
import { loadOwnedId } from "./auth.js";

function ranges(query) {
  const period = String(query?.period || "all");
  const start = String(query?.start_date || "").slice(0, 10);
  const end = String(query?.end_date || "").slice(0, 10);
  if (period === "all") {
    return {
      current: { sql: "1=1", params: [] },
      previous: { sql: "1=0", params: [] },
    };
  }
  if (period === "today" || period === "day") {
    return {
      current: { sql: "DATE({col}) = CURDATE()", params: [] },
      previous: { sql: "DATE({col}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)", params: [] },
    };
  }
  if (period === "week") {
    return {
      current: { sql: "{col} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)", params: [] },
      previous: { sql: "{col} >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND {col} < DATE_SUB(CURDATE(), INTERVAL 6 DAY)", params: [] },
    };
  }
  if (period === "year") {
    return {
      current: { sql: "{col} >= DATE_SUB(CURDATE(), INTERVAL 364 DAY)", params: [] },
      previous: { sql: "{col} >= DATE_SUB(CURDATE(), INTERVAL 729 DAY) AND {col} < DATE_SUB(CURDATE(), INTERVAL 364 DAY)", params: [] },
    };
  }
  if (period === "custom" && start && end) {
    return {
      current: { sql: "DATE({col}) BETWEEN ? AND ?", params: [start, end] },
      previous: { sql: "1=0", params: [] },
    };
  }
  return {
    current: { sql: "{col} >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)", params: [] },
    previous: { sql: "{col} >= DATE_SUB(CURDATE(), INTERVAL 59 DAY) AND {col} < DATE_SUB(CURDATE(), INTERVAL 29 DAY)", params: [] },
  };
}

function dated(fragment, column) {
  return {
    sql: fragment.sql.replaceAll("{col}", `\`${column}\``),
    params: fragment.params,
  };
}

function tally(rows) {
  const by = Object.fromEntries((rows || []).map((row) => [String(row.status || ""), Number(row.total || 0)]));
  const total = Object.values(by).reduce((sum, value) => sum + value, 0);
  return { by, total };
}

function pick(by, names) {
  return names.reduce((sum, name) => sum + (by[name] || 0), 0);
}

async function grouped(table, whereSql, params) {
  if (!(await tableExists(table)) || !(await hasColumn(table, "status"))) return [];
  return q(
    `SELECT status, COUNT(*) AS total FROM \`${table}\` WHERE ${whereSql} GROUP BY status`,
    params,
  ).catch(() => []);
}

async function userNames(ids) {
  const clean = [...new Set((ids || []).map(Number).filter((id) => id > 0))];
  if (!clean.length || !(await tableExists("users"))) return new Map();
  const rows = await q(
    `SELECT id, name FROM users WHERE id IN (${clean.map(() => "?").join(",")})`,
    clean,
  ).catch(() => []);
  return new Map(rows.map((row) => [Number(row.id), row.name]));
}

async function hospitalDoctorIds(hospitalId) {
  const ids = new Set();
  if (await tableExists("hospital_doctors")) {
    const rows = await q("SELECT doctor_id FROM hospital_doctors WHERE hospital_id = ?", [hospitalId]).catch(() => []);
    for (const row of rows) ids.add(Number(row.doctor_id));
  }
  if (await tableExists("doctors") && await hasColumn("doctors", "hospital_id")) {
    const rows = await q("SELECT id FROM doctors WHERE hospital_id = ?", [hospitalId]).catch(() => []);
    for (const row of rows) ids.add(Number(row.id));
  }
  return [...ids].filter((id) => id > 0);
}

async function appointmentScope(hospitalId, doctorIds) {
  const parts = [];
  const params = [];
  if (await hasColumn("appointments", "hospital_id")) {
    parts.push("hospital_id = ?");
    params.push(hospitalId);
  }
  if (doctorIds.length) {
    parts.push(`doctor_id IN (${doctorIds.map(() => "?").join(",")})`);
    params.push(...doctorIds);
  }
  if (!parts.length) return null;
  return { sql: `(${parts.join(" OR ")})`, params };
}

export async function pharmacyDashboard(req) {
  const base = emptyPharmacy(req.query);
  const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
  if (!pharmacyId) return base;
  const window = ranges(req.query || {});
  const orderDate = (await hasColumn("pharmacy_orders", "created_at")) ? "created_at" : null;

  if (await tableExists("pharmacy_orders") && await hasColumn("pharmacy_orders", "pharmacy_id")) {
    const current = orderDate ? dated(window.current, orderDate) : { sql: "1=1", params: [] };
    const previous = orderDate ? dated(window.previous, orderDate) : { sql: "1=0", params: [] };
    const today = orderDate ? dated({ sql: "DATE({col}) = CURDATE()", params: [] }, orderDate) : current;
    const orders = tally(await grouped("pharmacy_orders", `pharmacy_id = ? AND ${current.sql}`, [pharmacyId, ...current.params]));
    const todayOrders = tally(await grouped("pharmacy_orders", `pharmacy_id = ? AND ${today.sql}`, [pharmacyId, ...today.params]));
    const done = ["completed", "dispensed", "paid", "delivered"];
    base.today.orders = {
      total: todayOrders.total,
      pending: pick(todayOrders.by, ["pending", "draft", "placed"]),
      accepted: pick(todayOrders.by, ["accepted", "confirmed", "preparing"]),
      completed: pick(todayOrders.by, done),
      rejected: pick(todayOrders.by, ["rejected"]),
      cancelled: pick(todayOrders.by, ["cancelled", "canceled"]),
    };
    const delivery = await one(
      `SELECT
         SUM(CASE WHEN delivery_type = 'delivery' THEN 1 ELSE 0 END) AS delivery_count,
         SUM(CASE WHEN delivery_type = 'pickup' OR delivery_type IS NULL THEN 1 ELSE 0 END) AS pickup_count,
         COUNT(DISTINCT patient_id) AS customers
       FROM pharmacy_orders WHERE pharmacy_id = ? AND ${current.sql}`,
      [pharmacyId, ...current.params],
    ).catch(() => null);
    base.period_stats.orders = {
      total: orders.total,
      completed: pick(orders.by, done),
      rejected: pick(orders.by, ["rejected"]),
      cancelled: pick(orders.by, ["cancelled", "canceled"]),
      pending: pick(orders.by, ["pending", "draft", "placed", "accepted", "confirmed"]),
      delivery_count: Number(delivery?.delivery_count || 0),
      pickup_count: Number(delivery?.pickup_count || 0),
      internal_orders: orders.total,
      external_orders: 0,
      unique_customers: Number(delivery?.customers || 0),
    };
    const money = await one(
      `SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS total_count
       FROM pharmacy_orders
       WHERE pharmacy_id = ? AND status IN ('completed','dispensed','paid','delivered') AND ${current.sql}`,
      [pharmacyId, ...current.params],
    ).catch(() => ({ total: 0, total_count: 0 }));
    const previousMoney = await one(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM pharmacy_orders
       WHERE pharmacy_id = ? AND status IN ('completed','dispensed','paid','delivered') AND ${previous.sql}`,
      [pharmacyId, ...previous.params],
    ).catch(() => ({ total: 0 }));
    const revenue = Number(money?.total || 0);
    const previousRevenue = Number(previousMoney?.total || 0);
    const count = Number(money?.total_count || 0);
    base.revenue = {
      total: revenue,
      previous_period_total: previousRevenue,
      change_percent: previousRevenue > 0 ? Math.round(((revenue - previousRevenue) / previousRevenue) * 1000) / 10 : (revenue > 0 ? 100 : 0),
      order_count: count,
      avg_order_value: count > 0 ? Math.round(revenue / count) : 0,
      breakdown: {
        delivery: Number(delivery?.delivery_count || 0) && orders.total ? Math.round(revenue * (Number(delivery.delivery_count) / orders.total)) : 0,
        pickup: 0,
        internal: revenue,
        external: 0,
      },
    };
    base.revenue.breakdown.pickup = Math.max(0, revenue - base.revenue.breakdown.delivery);
    if (orderDate) {
      base.orders_chart = (await q(
        `SELECT DATE(\`${orderDate}\`) AS label,
                COUNT(*) AS total,
                SUM(CASE WHEN status IN ('completed','dispensed','paid','delivered') THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN status IN ('cancelled','canceled') THEN 1 ELSE 0 END) AS cancelled,
                COALESCE(SUM(CASE WHEN status IN ('completed','dispensed','paid','delivered') THEN total_amount ELSE 0 END), 0) AS revenue
         FROM pharmacy_orders
         WHERE pharmacy_id = ? AND ${current.sql}
         GROUP BY DATE(\`${orderDate}\`)
         ORDER BY label`,
        [pharmacyId, ...current.params],
      ).catch(() => [])).map((row) => ({
        label: String(row.label).slice(0, 10),
        total: Number(row.total || 0),
        completed: Number(row.completed || 0),
        rejected: Number(row.rejected || 0),
        cancelled: Number(row.cancelled || 0),
        revenue: Number(row.revenue || 0),
      }));
    }
    base.top_medicines = (await q(
      `SELECT i.medicine_id, COALESCE(i.medicine_name, m.name, 'Medicine') AS medicine_name,
              SUM(i.quantity) AS total_sold, COALESCE(SUM(i.total_price), 0) AS total_revenue, COUNT(DISTINCT i.order_id) AS order_count
       FROM pharmacy_order_items i
       JOIN pharmacy_orders o ON o.id = i.order_id
       LEFT JOIN pharmacy_medicines m ON m.id = i.medicine_id
       WHERE o.pharmacy_id = ? AND ${current.sql.replaceAll(`\`${orderDate}\``, "o.`" + orderDate + "`")}
       GROUP BY i.medicine_id, medicine_name
       ORDER BY total_sold DESC
       LIMIT 5`,
      [pharmacyId, ...current.params],
    ).catch(() => [])).map((row) => ({
      medicine_id: Number(row.medicine_id || 0),
      medicine_name: row.medicine_name,
      total_sold: Number(row.total_sold || 0),
      total_revenue: Number(row.total_revenue || 0),
      order_count: Number(row.order_count || 0),
    }));
  }

  if (await tableExists("pharmacy_medicines") && await hasColumn("pharmacy_medicines", "pharmacy_id")) {
    const medicines = await q("SELECT * FROM pharmacy_medicines WHERE pharmacy_id = ? LIMIT 500", [pharmacyId]).catch(() => []);
    const now = Date.now();
    const low = [];
    const out = [];
    const expiring = [];
    let units = 0;
    let active = 0;
    let prescriptionRequired = 0;
    for (const medicine of medicines) {
      const quantity = Number(medicine.quantity ?? medicine.stock ?? 0);
      const threshold = Number(medicine.low_stock_threshold ?? 5);
      const inactive = medicine.is_active === 0 || medicine.is_active === false || medicine.status === "inactive";
      if (!inactive) active += 1;
      if (medicine.prescription_required) prescriptionRequired += 1;
      units += quantity;
      const item = { medicine_id: medicine.id, medicine_name: medicine.name || "Medicine", unit: medicine.unit || "" };
      if (quantity <= 0) out.push(item);
      else if (quantity <= threshold) low.push({ ...item, quantity, threshold });
      if (medicine.expiry_date) {
        const expiry = new Date(medicine.expiry_date);
        const days = Math.ceil((expiry.getTime() - now) / 86400000);
        if (!Number.isNaN(days) && days >= 0 && days <= 30) {
          expiring.push({ ...item, quantity, expiry_date: String(medicine.expiry_date).slice(0, 10), days_left: days });
        }
      }
    }
    base.inventory = {
      source: "internal",
      total_medicines: medicines.length,
      active_medicines: active,
      inactive_medicines: Math.max(0, medicines.length - active),
      prescription_required: prescriptionRequired,
      total_units_in_stock: units,
      out_of_stock: out.length,
      low_stock: low.length,
      healthy_stock: Math.max(0, medicines.length - out.length - low.length),
      expiring_in_30_days: expiring.length,
    };
    base.stock_alerts = { source: "internal", low_stock: low.slice(0, 8), out_of_stock: out.slice(0, 8), expiring_soon: expiring.slice(0, 8) };
    base.today.stock_alerts = { low_stock: low.length, out_of_stock: out.length };
  }

  const rxTable = (await tableExists("pharmacy_prescription_requests"))
    ? "pharmacy_prescription_requests"
    : ((await tableExists("prescriptions") && await hasColumn("prescriptions", "pharmacy_id")) ? "prescriptions" : null);
  if (rxTable && await hasColumn(rxTable, "pharmacy_id")) {
    const rx = tally(await grouped(rxTable, "pharmacy_id = ?", [pharmacyId]));
    const waiting = await q(
      `SELECT * FROM \`${rxTable}\` WHERE pharmacy_id = ? AND status IN ('pending','reviewing','approved') ORDER BY id DESC LIMIT 6`,
      [pharmacyId],
    ).catch(() => []);
    const patientIds = waiting.map((row) => row.patient_id);
    const patientNames = await userNames(patientIds);
    const doctorIds = waiting.map((row) => Number(row.doctor_id)).filter((id) => id > 0);
    const doctorNames = new Map();
    if (doctorIds.length && await tableExists("doctors") && await tableExists("users")) {
      const doctorRows = await q(
        `SELECT d.id, u.name FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id IN (${doctorIds.map(() => "?").join(",")})`,
        doctorIds,
      ).catch(() => []);
      for (const row of doctorRows) doctorNames.set(Number(row.id), row.name);
    }
    if (await tableExists("prescriptions") && rxTable !== "prescriptions" && await hasColumn("prescriptions", "pharmacy_id")) {
      const extra = tally(await grouped("prescriptions", "pharmacy_id = ?", [pharmacyId]));
      rx.total += extra.total;
      for (const [status, total] of Object.entries(extra.by)) rx.by[status] = (rx.by[status] || 0) + total;
    }
    base.prescriptions = {
      total: rx.total,
      pending: pick(rx.by, ["pending"]),
      reviewing: pick(rx.by, ["reviewing"]),
      approved: pick(rx.by, ["approved"]),
      rejected: pick(rx.by, ["rejected"]),
      fulfilled: pick(rx.by, ["fulfilled", "completed", "dispensed"]),
      awaiting_action: waiting.map((row) => ({
        id: row.id,
        patient_name: row.patient_name || patientNames.get(Number(row.patient_id)) || "Patient",
        doctor_name: row.doctor_name || doctorNames.get(Number(row.doctor_id)) || "",
        status: row.status || "pending",
        submitted: String(row.created_at || "").slice(0, 16).replace("T", " "),
      })),
    };
    base.today.prescriptions = {
      total: rx.total,
      pending: base.prescriptions.pending,
      approved: base.prescriptions.approved,
      rejected: base.prescriptions.rejected,
    };
    base.period_stats.prescriptions = {
      total: rx.total,
      approved: base.prescriptions.approved,
      rejected: base.prescriptions.rejected,
      fulfilled: base.prescriptions.fulfilled,
      pending: base.prescriptions.pending + base.prescriptions.reviewing,
    };
  }

  if (await tableExists("pharmacy_stock_requests") && await hasColumn("pharmacy_stock_requests", "pharmacy_id")) {
    const stock = tally(await grouped("pharmacy_stock_requests", "pharmacy_id = ?", [pharmacyId]));
    const pending = await q(
      `SELECT r.*, m.name AS medicine_name
       FROM pharmacy_stock_requests r
       LEFT JOIN pharmacy_medicines m ON m.id = r.medicine_id
       WHERE r.pharmacy_id = ? AND r.status = 'pending'
       ORDER BY r.id DESC LIMIT 6`,
      [pharmacyId],
    ).catch(() => []);
    base.stock_requests = {
      total: stock.total,
      pending: pick(stock.by, ["pending"]),
      approved: pick(stock.by, ["approved"]),
      received: pick(stock.by, ["received", "completed"]),
      rejected: pick(stock.by, ["rejected"]),
      pending_list: pending.map((row) => ({
        id: row.id,
        medicine_name: row.medicine_name || "Medicine",
        requested_quantity: Number(row.requested_quantity || 0),
        submitted: String(row.created_at || "").slice(0, 16).replace("T", " "),
      })),
    };
    base.period_stats.stock_requests = {
      total: stock.total,
      received: base.stock_requests.received,
      pending: base.stock_requests.pending,
      rejected: base.stock_requests.rejected,
    };
  }

  base.external_sync = {
    applicable: false,
    provider_name: "MediConnect",
    last_sync_at: "",
    last_sync_status: "success",
    items_synced: base.inventory.total_medicines,
    items_failed: 0,
    next_sync_due: "",
  };
  base.care_links = {
    doctor_prescriptions: base.prescriptions.total,
    patient_orders: base.period_stats.orders.total,
    unique_patients: base.period_stats.orders.unique_customers,
    awaiting_rx: base.prescriptions.pending + base.prescriptions.reviewing,
  };
  return { status: true, data: base, ...base };
}

export async function hospitalDashboard(req) {
  const hospitalId = await loadOwnedId(req.user.id, "hospitals");
  const window = ranges(req.query || {});
  const empty = emptyHospital();
  if (!hospitalId) return empty;

  const doctorIds = await hospitalDoctorIds(hospitalId);
  const apptScope = await appointmentScope(hospitalId, doctorIds);

  let bookings = { by: {}, total: 0 };
  let todayBookings = { by: {}, total: 0 };
  if (await tableExists("service_bookings") && await hasColumn("service_bookings", "hospital_id")) {
    const dateColumn = (await hasColumn("service_bookings", "preferred_date")) ? "preferred_date" : "created_at";
    const current = dated(window.current, dateColumn);
    const today = dated({ sql: "DATE({col}) = CURDATE()", params: [] }, dateColumn);
    bookings = tally(await grouped("service_bookings", `hospital_id = ? AND ${current.sql}`, [hospitalId, ...current.params]));
    todayBookings = tally(await grouped("service_bookings", `hospital_id = ? AND ${today.sql}`, [hospitalId, ...today.params]));
    const moneyColumn = (await hasColumn("service_bookings", "patient_pays"))
      ? "patient_pays"
      : ((await hasColumn("service_bookings", "price")) ? "price" : null);
    const gross = moneyColumn
      ? Number((await one(
        `SELECT COALESCE(SUM(\`${moneyColumn}\`), 0) AS total, COUNT(*) AS total_count
         FROM service_bookings
         WHERE hospital_id = ? AND status IN ('accepted','completed','confirmed') AND ${current.sql}`,
        [hospitalId, ...current.params],
      ).catch(() => ({ total: 0, total_count: 0 })))?.total || 0)
      : 0;
    const count = pick(bookings.by, ["accepted", "completed", "confirmed"]) || bookings.total;
    empty.revenue = {
      gross,
      insurance_covered: 0,
      patient_paid: gross,
      avg_booking_value: count > 0 ? Math.round(gross / count) : 0,
      booking_count: count,
      change_percent: null,
    };
    empty.bookings_chart = (await q(
      `SELECT DATE(\`${dateColumn}\`) AS label, COUNT(*) AS total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM service_bookings WHERE hospital_id = ? AND ${current.sql}
       GROUP BY DATE(\`${dateColumn}\`) ORDER BY label`,
      [hospitalId, ...current.params],
    ).catch(() => [])).map((row) => ({
      label: String(row.label).slice(0, 10),
      total: Number(row.total || 0),
      completed: Number(row.completed || 0),
      pending: Number(row.pending || 0),
      revenue: 0,
    }));
  }

  const bookingCounts = (source) => ({
    total: source.total,
    pending: pick(source.by, ["pending"]),
    accepted: pick(source.by, ["accepted", "confirmed"]),
    completed: pick(source.by, ["completed"]),
    rejected: pick(source.by, ["rejected"]),
    cancelled: pick(source.by, ["cancelled", "canceled"]),
  });

  let appointments = { by: {}, total: 0 };
  let todayAppointments = { by: {}, total: 0 };
  let uniquePatients = 0;
  if (apptScope && await tableExists("appointments")) {
    const dateColumn = (await hasColumn("appointments", "appointment_date")) ? "appointment_date" : "created_at";
    const current = dated(window.current, dateColumn);
    const today = dated({ sql: "DATE({col}) = CURDATE()", params: [] }, dateColumn);
    appointments = tally(await grouped("appointments", `${apptScope.sql} AND ${current.sql}`, [...apptScope.params, ...current.params]));
    todayAppointments = tally(await grouped("appointments", `${apptScope.sql} AND ${today.sql}`, [...apptScope.params, ...today.params]));
    if (await hasColumn("appointments", "patient_id")) {
      uniquePatients = Number((await one(
        `SELECT COUNT(DISTINCT patient_id) AS total FROM appointments WHERE ${apptScope.sql} AND ${current.sql}`,
        [...apptScope.params, ...current.params],
      ).catch(() => ({ total: 0 })))?.total || 0);
    }
    const upcoming = await q(
      `SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time, a.type
       FROM appointments a
       WHERE ${apptScope.sql}
         AND (a.appointment_date >= CURDATE() OR a.appointment_date IS NULL)
         AND a.status IN ('pending','confirmed','accepted')
       ORDER BY a.appointment_date, a.appointment_time
       LIMIT 8`,
      apptScope.params,
    ).catch(() => []);
    const people = await userNames(upcoming.map((row) => row.patient_id));
    const doctorMarks = doctorIds.length ? doctorIds.map(() => "?").join(",") : "0";
    const doctorUsers = doctorIds.length
      ? await q(
        `SELECT d.id, u.name FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id IN (${doctorMarks})`,
        doctorIds,
      ).catch(() => [])
      : [];
    const doctorNames = new Map(doctorUsers.map((row) => [Number(row.id), row.name]));
    empty.appointments = {
      daily_breakdown: (await q(
        `SELECT DATE(\`${dateColumn}\`) AS date, COUNT(*) AS total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
         FROM appointments WHERE ${apptScope.sql} AND ${current.sql}
         GROUP BY DATE(\`${dateColumn}\`) ORDER BY date`,
        [...apptScope.params, ...current.params],
      ).catch(() => [])).map((row) => ({
        date: String(row.date).slice(0, 10),
        total: Number(row.total || 0),
        completed: Number(row.completed || 0),
      })),
      upcoming: upcoming.map((row) => ({
        id: row.id,
        patient_name: people.get(Number(row.patient_id)) || "Patient",
        doctor_name: doctorNames.get(Number(row.doctor_id)) || "Doctor",
        appointment_date: String(row.appointment_date || "").slice(0, 10),
        appointment_time: String(row.appointment_time || "").slice(0, 5),
        type: row.type || "in_person",
      })),
    };
  }

  empty.today = {
    service_bookings: bookingCounts(todayBookings),
    appointments: {
      total: todayAppointments.total,
      completed: pick(todayAppointments.by, ["completed"]),
      confirmed: pick(todayAppointments.by, ["confirmed", "accepted"]),
      pending: pick(todayAppointments.by, ["pending"]),
      cancelled: pick(todayAppointments.by, ["cancelled", "canceled"]),
    },
  };
  empty.period_stats = {
    service_bookings: bookingCounts(bookings),
    appointments: {
      total: appointments.total,
      completed: pick(appointments.by, ["completed"]),
      confirmed: pick(appointments.by, ["confirmed", "accepted"]),
      pending: pick(appointments.by, ["pending"]),
      cancelled: pick(appointments.by, ["cancelled", "canceled"]),
      unique_doctors: doctorIds.length,
      unique_patients: uniquePatients,
    },
  };
  if (await tableExists("service_bookings") && await hasColumn("service_bookings", "hospital_id") && await hasColumn("service_bookings", "patient_id")) {
    const bookingPatients = Number((await one(
      "SELECT COUNT(DISTINCT patient_id) AS total FROM service_bookings WHERE hospital_id = ?",
      [hospitalId],
    ).catch(() => ({ total: 0 })))?.total || 0);
    empty.period_stats.service_bookings.unique_patients = bookingPatients;
    if (!uniquePatients) uniquePatients = bookingPatients;
    empty.period_stats.appointments.unique_patients = uniquePatients;
  }

  let referrals = 0;
  if (await tableExists("referrals")) {
    const clauses = [];
    const params = [];
    if (await hasColumn("referrals", "hospital_id")) {
      clauses.push("hospital_id = ?");
      params.push(hospitalId);
    }
    if (await hasColumn("referrals", "referred_hospital_id")) {
      clauses.push("referred_hospital_id = ?");
      params.push(hospitalId);
    }
    if (doctorIds.length && await hasColumn("referrals", "referred_to_doctor_id")) {
      clauses.push(`referred_to_doctor_id IN (${doctorIds.map(() => "?").join(",")})`);
      params.push(...doctorIds);
    }
    if (clauses.length) {
      referrals = Number((await one(
        `SELECT COUNT(*) AS total FROM referrals WHERE ${clauses.join(" OR ")}`,
        params,
      ).catch(() => ({ total: 0 })))?.total || 0);
    }
  }

  let prescriptions = 0;
  if (doctorIds.length && await tableExists("prescriptions") && await hasColumn("prescriptions", "doctor_id")) {
    prescriptions = Number((await one(
      `SELECT COUNT(*) AS total FROM prescriptions WHERE doctor_id IN (${doctorIds.map(() => "?").join(",")})`,
      doctorIds,
    ).catch(() => ({ total: 0 })))?.total || 0);
  }

  if (await tableExists("reviews")) {
    let reviewWhere = "";
    const reviewParams = [];
    if (await hasColumn("reviews", "hospital_id")) {
      reviewWhere = "hospital_id = ?";
      reviewParams.push(hospitalId);
    } else if (await hasColumn("reviews", "facility_id")) {
      reviewWhere = "facility_id = ?";
      reviewParams.push(hospitalId);
    }
    if (reviewWhere) {
      const summary = await one(
        `SELECT COUNT(*) AS total, AVG(rating) AS avg_rating,
                SUM(CASE WHEN rating >= 4.5 THEN 1 ELSE 0 END) AS five_star,
                SUM(CASE WHEN rating >= 3.5 AND rating < 4.5 THEN 1 ELSE 0 END) AS four_star,
                SUM(CASE WHEN rating >= 2.5 AND rating < 3.5 THEN 1 ELSE 0 END) AS three_star,
                SUM(CASE WHEN rating < 2.5 THEN 1 ELSE 0 END) AS low_star
         FROM reviews WHERE ${reviewWhere}`,
        reviewParams,
      ).catch(() => null);
      empty.reviews = {
        ...empty.reviews,
        total: Number(summary?.total || 0),
        avg_rating: summary?.avg_rating == null ? null : Math.round(Number(summary.avg_rating) * 10) / 10,
        five_star: Number(summary?.five_star || 0),
        four_star: Number(summary?.four_star || 0),
        three_star: Number(summary?.three_star || 0),
        low_star: Number(summary?.low_star || 0),
      };
    }
  }

  if (await tableExists("hospital_departments")) {
    empty.departments = (await q(
      "SELECT id, name_en AS name FROM hospital_departments WHERE hospital_id = ? ORDER BY name_en LIMIT 20",
      [hospitalId],
    ).catch(() => [])).map((row) => ({ id: row.id, name: row.name || "Department", period_bookings: 0 }));
  }
  if (await tableExists("hospital_services")) {
    const services = await q("SELECT * FROM hospital_services WHERE hospital_id = ? LIMIT 200", [hospitalId]).catch(() => []);
    const active = services.filter((row) => row.is_active !== 0 && row.status !== "inactive").length;
    empty.services = {
      total: services.length,
      active,
      inactive: Math.max(0, services.length - active),
      available: active,
      insurance_covered: services.filter((row) => row.insurance_covered || row.accepts_insurance).length,
      requires_appointment: services.filter((row) => row.requires_appointment).length,
      requires_referral: services.filter((row) => row.requires_referral).length,
      top_services: services.slice(0, 5).map((row) => ({
        service_id: row.id,
        service_name: row.name_en || row.name || "Service",
        booking_count: 0,
        revenue: Number(row.price || 0),
      })),
    };
  }
  empty.doctors = {
    total: doctorIds.length,
    active: doctorIds.length,
    inactive: 0,
    top_doctors: (empty.appointments?.upcoming || []).reduce((list, row) => {
      const found = list.find((item) => item.doctor_name === row.doctor_name);
      if (found) found.appointment_count += 1;
      else list.push({ doctor_id: 0, doctor_name: row.doctor_name, appointment_count: 1, avg_duration_min: 0 });
      return list;
    }, []).slice(0, 5),
  };
  empty.care_links = {
    patient_bookings: empty.period_stats.service_bookings.total,
    doctor_visits: empty.period_stats.appointments.total,
    affiliated_doctors: doctorIds.length,
    unique_patients: uniquePatients,
    referrals,
    prescriptions,
  };
  return { status: true, data: empty, ...empty };
}

function emptyPharmacy(query = {}) {
  const zeroOrders = { total: 0, pending: 0, accepted: 0, completed: 0, rejected: 0, cancelled: 0 };
  return {
    filters_applied: {
      period: query.period || "month",
      from: query.start_date || "",
      to: query.end_date || "",
      chart_group: query.chart_group || "day",
    },
    inventory_mode: "internal",
    today: {
      orders: zeroOrders,
      prescriptions: { total: 0, pending: 0, approved: 0, rejected: 0 },
      stock_alerts: { low_stock: 0, out_of_stock: 0 },
    },
    period_stats: {
      orders: { ...zeroOrders, delivery_count: 0, pickup_count: 0, internal_orders: 0, external_orders: 0, unique_customers: 0 },
      prescriptions: { total: 0, approved: 0, rejected: 0, fulfilled: 0, pending: 0 },
      stock_requests: { total: 0, received: 0, pending: 0, rejected: 0 },
    },
    revenue: { total: 0, previous_period_total: 0, change_percent: 0, order_count: 0, avg_order_value: 0, breakdown: { delivery: 0, pickup: 0, internal: 0, external: 0 } },
    orders_chart: [],
    inventory: { source: "internal", total_medicines: 0, active_medicines: 0, inactive_medicines: 0, prescription_required: 0, total_units_in_stock: 0, out_of_stock: 0, low_stock: 0, healthy_stock: 0, expiring_in_30_days: 0 },
    stock_alerts: { source: "internal", low_stock: [], out_of_stock: [], expiring_soon: [] },
    prescriptions: { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0, fulfilled: 0, awaiting_action: [] },
    stock_requests: { total: 0, pending: 0, approved: 0, received: 0, rejected: 0, pending_list: [] },
    top_medicines: [],
    external_sync: { applicable: false, provider_name: "MediConnect", last_sync_at: "", last_sync_status: "success", items_synced: 0, items_failed: 0, next_sync_due: "" },
    care_links: { doctor_prescriptions: 0, patient_orders: 0, unique_patients: 0, awaiting_rx: 0 },
  };
}

function emptyHospital() {
  const bookings = { total: 0, pending: 0, accepted: 0, completed: 0, rejected: 0, cancelled: 0 };
  const appointments = { total: 0, completed: 0, confirmed: 0, pending: 0, cancelled: 0 };
  return {
    today: { service_bookings: bookings, appointments },
    period_stats: { service_bookings: bookings, appointments },
    revenue: { gross: 0, insurance_covered: 0, patient_paid: 0, avg_booking_value: 0, booking_count: 0, change_percent: null },
    bookings_chart: [],
    appointments: { daily_breakdown: [], upcoming: [] },
    departments: [],
    services: { total: 0, active: 0, inactive: 0, available: 0, insurance_covered: 0, requires_appointment: 0, requires_referral: 0, top_services: [] },
    doctors: { total: 0, active: 0, inactive: 0, top_doctors: [] },
    reviews: { avg_rating: null, total: 0, approved: 0, pending: 0, rejected: 0, five_star: 0, four_star: 0, three_star: 0, low_star: 0, recent: [] },
    care_links: { patient_bookings: 0, doctor_visits: 0, affiliated_doctors: 0, unique_patients: 0, referrals: 0, prescriptions: 0 },
  };
}
