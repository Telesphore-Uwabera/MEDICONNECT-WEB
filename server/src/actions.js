import fs from "fs";
import path from "path";
import multer from "multer";
import { hasColumn, insert, one, pool, presentRow, presentRows, q, tableExists, update } from "./db.js";
import { hashPassword, loadOwnedId, roleNames } from "./auth.js";
import { recordVerifier } from "./verification.js";
import { hospitalDashboard, pharmacyDashboard } from "./org-dashboard.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const STATUS_ACTIONS = {
  suspend: "suspended",
  activate: "active",
  approve: "approved",
  reject: "rejected",
  complete: "completed",
  accept: "accepted",
  receive: "received",
  cancel: "cancelled",
  revoke: "revoked",
  confirm: "confirmed",
  "confirm-identity": "confirmed",
  sign: "signed",
  place: "placed",
  submit: "submitted",
  withdraw: "pending",
  pause: "paused",
  resume: "active",
};

const FILE_COLUMNS = {
  photo: "photo",
  image: "image",
  avatar: "avatar",
  logo: "logo",
  icon: "icon",
  signature: "signature_image",
};

function segments(req) {
  return req.path.split("/").filter(Boolean);
}

function tableFor(name, RESOURCES) {
  if (!name) return null;
  return RESOURCES[name] || name.replace(/-/g, "_");
}

function saveUpload(file, prefix) {
  const dir = process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, "doctors-webp")
    : path.resolve("storage", "doctors-webp");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${prefix}_${Date.now()}.webp`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `https://mediconnect.rw/api/v1/media/${filename}`;
}

function emptyDashboard(query) {
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
    external_sync: { applicable: false, provider_name: "", last_sync_at: "", last_sync_status: "pending", items_synced: 0, items_failed: 0, next_sync_due: "" },
  };
}

async function applyStatus(table, id, action, body = {}, adminUserId = null) {
  if (action === "toggle-active" && await hasColumn(table, "is_active")) {
    const row = await one(`SELECT is_active FROM \`${table}\` WHERE id = ?`, [id]);
    if (!row) return false;
    await update(table, id, { is_active: row.is_active ? 0 : 1 });
    return true;
  }
  if (action === "read" && await hasColumn(table, "read_at")) {
    await update(table, id, { read_at: new Date() });
    return true;
  }
  if (table === "pharmacy_orders") {
    const pharmacyStatus = { accept: "confirmed", reject: "cancelled", complete: "dispensed" };
    if (pharmacyStatus[action]) {
      await update(table, id, {
        status: pharmacyStatus[action],
        ...(action === "reject" ? { rejection_reason: body.reason || null } : {}),
      });
      return true;
    }
  }
  if (table === "doctors" && ["approve", "reject", "request-action"].includes(action)) {
    const { reviewDoctor } = await import("./doctor-review.js");
    const reviewed = await reviewDoctor(
      id,
      action === "request-action" ? "request" : action,
      body.reason || body.message || "",
      adminUserId,
    );
    return Boolean(reviewed);
  }
  const status = STATUS_ACTIONS[action];
  if (!status || !(await hasColumn(table, "status"))) return false;
  await update(table, id, { status });
  if (["approve", "activate"].includes(action)) {
    await recordVerifier(table, id, adminUserId).catch(() => null);
  }
  return true;
}

async function shapeOrder(order) {
  if (!order) return null;
  const items = await q("SELECT * FROM pharmacy_order_items WHERE order_id = ?", [order.id]);
  const shaped = [];
  for (const item of items) {
    const medicine = await one("SELECT * FROM pharmacy_medicines WHERE id = ?", [item.medicine_id]).catch(() => null);
    shaped.push({
      id: item.id,
      order_id: item.order_id,
      medicine_id: item.medicine_id,
      quantity: Number(item.quantity),
      unit_price: String(item.unit_price),
      subtotal: String(item.total_price),
      medicine: {
        id: medicine?.id || item.medicine_id,
        name: medicine?.name || item.medicine_name || "Medicine",
        generic_name: medicine?.generic_name,
        price: String(medicine?.price ?? item.unit_price),
        currency: medicine?.currency,
        unit: medicine?.unit,
      },
    });
  }
  const total = shaped.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const presented = await presentRow("pharmacy_orders", order);
  return { ...presented, total_amount: String(total), items: shaped };
}

async function findDraft(patientId, pharmacyId) {
  return one(
    "SELECT * FROM pharmacy_orders WHERE patient_id = ? AND pharmacy_id = ? AND status = 'draft' ORDER BY id DESC LIMIT 1",
    [patientId, pharmacyId],
  );
}

async function handlePharmacyOrders(req, res, parts) {
  const patientId = await loadOwnedId(req.user.id, "patients");
  if (!patientId) return res.status(403).json({ message: "A patient profile is required." });

  if (req.method === "GET" && parts[2] === "draft") {
    const order = await findDraft(patientId, req.query.pharmacy_id);
    return res.json({ order: await shapeOrder(order) });
  }

  if (req.method === "POST" && parts[2] === "items") {
    const pharmacyId = req.body?.pharmacy_id;
    const medicine = await one("SELECT * FROM pharmacy_medicines WHERE id = ? AND pharmacy_id = ?", [req.body?.medicine_id, pharmacyId]);
    if (!medicine) return res.status(404).json({ message: "Medicine not found." });
    let order = await findDraft(patientId, pharmacyId);
    if (!order) {
      const id = await insert("pharmacy_orders", {
        pharmacy_id: pharmacyId,
        patient_id: patientId,
        order_number: `MC${Date.now()}`,
        status: "draft",
        source: "patient",
        total_amount: 0,
        currency: medicine.currency || "RWF",
        delivery_type: req.body?.delivery_type || "pickup",
      });
      order = await one("SELECT * FROM pharmacy_orders WHERE id = ?", [id]);
    }
    const quantity = Number(req.body?.quantity || 1);
    const unitPrice = Number(medicine.price || 0);
    await insert("pharmacy_order_items", {
      order_id: order.id,
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      quantity,
      unit_price: unitPrice,
      total_price: unitPrice * quantity,
    });
    const total = await one("SELECT COALESCE(SUM(total_price), 0) AS total FROM pharmacy_order_items WHERE order_id = ?", [order.id]);
    await update("pharmacy_orders", order.id, { total_amount: total.total, delivery_type: req.body?.delivery_type || order.delivery_type });
    return res.json({ message: "Item added.", order: await shapeOrder(await one("SELECT * FROM pharmacy_orders WHERE id = ?", [order.id])) });
  }

  const orderId = parts[2];
  const action = parts[3];
  const order = /^\d+$/.test(String(orderId))
    ? await one("SELECT * FROM pharmacy_orders WHERE id = ? AND patient_id = ?", [orderId, patientId])
    : null;
  if (!order) return res.status(404).json({ message: "Order not found." });

  if (action === "items" && parts[4]) {
    const item = await one("SELECT * FROM pharmacy_order_items WHERE id = ? AND order_id = ?", [parts[4], order.id]);
    if (!item) return res.status(404).json({ message: "Item not found." });
    if (req.method === "DELETE") await pool.query("DELETE FROM pharmacy_order_items WHERE id = ?", [item.id]);
    else {
      const quantity = Number(req.body?.quantity || 1);
      await update("pharmacy_order_items", item.id, { quantity, total_price: Number(item.unit_price) * quantity });
    }
    const total = await one("SELECT COALESCE(SUM(total_price), 0) AS total FROM pharmacy_order_items WHERE order_id = ?", [order.id]);
    await update("pharmacy_orders", order.id, { total_amount: total?.total || 0 });
    return res.json({ message: "Order updated.", order: await shapeOrder(await one("SELECT * FROM pharmacy_orders WHERE id = ?", [order.id])) });
  }

  if (req.method === "POST" && action === "place") {
    await update("pharmacy_orders", order.id, {
      status: "pending",
      delivery_type: req.body?.delivery_type || order.delivery_type,
      delivery_address: req.body?.delivery_address || order.delivery_address,
    });
    return res.json({ message: "Order placed.", order: await shapeOrder(await one("SELECT * FROM pharmacy_orders WHERE id = ?", [order.id])) });
  }

  return res.status(404).json({ message: "Order action was not found." });
}

const EXTRA_STATUS = {
  decline: "declined",
  fulfill: "fulfilled",
  review: "reviewing",
  issue: "issued",
  "send-to-pharmacy": "sent_to_pharmacy",
  "running-late": "running_late",
  "ready-next": "confirmed",
  restore: "active",
  "set-current": "current",
};

const NESTED_TABLES = {
  "pharmacy/inventory/medicines": ["pharmacy_medicines", "medicines"],
  "pharmacy/inventory/categories": ["pharmacy_medicine_categories", "medicine_categories"],
  "pharmacy/inventory/stock-requests": ["pharmacy_stock_requests", "stock_requests"],
  "pharmacy/inventory/external/providers": ["pharmacy_external_providers", "external_inventory_providers"],
  "pharmacy/prescription-requests": ["pharmacy_prescription_requests", "prescription_requests", "prescriptions"],
  "pharmacy/working-hours": ["pharmacy_working_hours"],
  "pharmacy/closures": ["pharmacy_closures"],
  "hospital/working-hours": ["hospital_working_hours"],
  "hospital/closures": ["hospital_closures"],
  "doctor/instant-consultations": ["instant_consultation_requests", "instant_consultations"],
  "patient/instant-consultations": ["instant_consultation_requests", "instant_consultations"],
  "patient/quick": ["appointments"],
  "patient/records/appointments": ["appointments"],
  "patient/records/instant-consultations": ["instant_consultation_requests", "instant_consultations"],
  "admin/specialization-fees": ["specialization_fees"],
  "admin/specializations": ["specializations"],
  "admin/doctor-consultations": ["doctors"],
  "admin/roles": ["roles"],
  "admin/permissions": ["permissions"],
  "doctor/wallet/withdrawals": ["doctor_withdrawals", "withdrawals"],
  "doctor/certificates": ["fitness_certificates"],
  "patient/certificates": ["fitness_certificates"],
  "doctor/consultation-summaries": ["consultation_summaries"],
  "doctor/service-bookings": ["service_bookings"],
  "patient/service-bookings": ["service_bookings"],
  "patient/my-visits": ["appointments"],
  "patient/my-files": ["patient_files", "medical_files"],
};

const PROFILE_TABLES = { patient: "patients", doctor: "doctors", hospital: "hospitals", pharmacy: "pharmacies" };

async function firstTable(names) {
  for (const name of names) {
    if (name && await tableExists(name)) return name;
  }
  return null;
}

function parseParts(parts) {
  const ids = [];
  let action = null;
  const staticParts = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (/^\d+$/.test(parts[i])) {
      ids.push(parts[i]);
      if (parts[i + 1] && !/^\d+$/.test(parts[i + 1])) {
        action = parts[i + 1];
        i += 1;
      }
    } else staticParts.push(parts[i]);
  }
  return { key: staticParts.join("/"), ids, action };
}

async function tableFromKey(key) {
  if (NESTED_TABLES[key]) return firstTable(NESTED_TABLES[key]);
  const last = key.split("/").pop();
  return firstTable([last?.replace(/-/g, "_")]);
}

async function ownedExtra(scope, userId, table) {
  const extra = {};
  const ownerTable = PROFILE_TABLES[scope];
  const ownerId = ownerTable ? await loadOwnedId(userId, ownerTable) : null;
  const ownerCol = `${scope}_id`;
  if (ownerId && await hasColumn(table, ownerCol)) {
    // appointments.patient_id references users.id, not the patients profile id.
    extra[ownerCol] = table === "appointments" && scope === "patient" ? userId : ownerId;
  }
  if (await hasColumn(table, "user_id")) extra.user_id = userId;
  return extra;
}

async function fillGap(req, res, parts) {
  if (!parts.length || parts[0] === "public") return false;

  if (req.method === "GET" && parts.length === 2 && parts[1] === "dashboard") {
    if (parts[0] === "pharmacy") {
      res.json(await pharmacyDashboard(req));
      return true;
    }
    if (parts[0] === "hospital") {
      res.json(await hospitalDashboard(req));
      return true;
    }
    res.json({
      stats: { total: 0, pending: 0, completed: 0, cancelled: 0 },
      appointments: [],
      data: [],
    });
    return true;
  }

  if (req.method === "GET" && parts[0] === "settings" && !parts[1]) {
    const row = await one("SELECT * FROM users WHERE id = ?", [req.user.id]);
    const roles = await roleNames(req.user.id);
    const payload = {
      id: row?.id,
      name: row?.name ?? "",
      email: row?.email ?? "",
      phone: row?.phone ?? null,
      country_code: row?.country_code ?? null,
      preferred_language: row?.preferred_language || "en",
      avatar: row?.avatar ?? null,
      roles: roles.length ? roles : [req.user.role].filter(Boolean),
      is_verified: Boolean(row?.is_verified || row?.email_verified_at || row?.phone_verified_at),
      email_verified_at: row?.email_verified_at ?? null,
      phone_verified_at: row?.phone_verified_at ?? null,
      created_at: row?.created_at ?? null,
      updated_at: row?.updated_at ?? null,
    };
    res.json({ ...payload, data: payload });
    return true;
  }

  if (req.method === "GET" && parts[0] === "hospital" && parts[1] === "status" && !parts[2]) {
    const hospitalId = await loadOwnedId(req.user.id, "hospitals");
    const row = hospitalId ? await one("SELECT * FROM hospitals WHERE id = ?", [hospitalId]) : null;
    res.json({
      is_active: row?.is_active !== 0 && row?.is_active !== false,
      is_accepting_bookings: row?.is_accepting_bookings !== 0 && row?.is_accepting_bookings !== false,
    });
    return true;
  }

  if (req.method === "GET" && parts[0] === "hospital" && parts[1] === "images") {
    res.json({ images: [], data: [] });
    return true;
  }

  if (req.method === "GET" && parts[0] === "patient" && parts[1] === "my-record") {
    res.json({ record: null });
    return true;
  }

  if (req.method === "GET" && parts[0] === "patient" && parts[1] === "my-files") {
    res.json({ data: [], files: [] });
    return true;
  }

  if (req.method === "GET" && parts[0] === "patient" && parts[1] === "certificates" && parts[2] === "request") {
    res.json({ certificate: null });
    return true;
  }

  if (req.method === "GET" && parts[0] === "admin" && parts[1] === "settings" && parts[2] === "public") {
    res.json({ settings: {} });
    return true;
  }

  if (req.method === "GET" && parts[0] === "admin" && parts[1] === "settings" && parts[2] === "audit-logs") {
    res.json({ data: [], current_page: 1, per_page: 15, total: 0 });
    return true;
  }

  if (req.method === "GET" && parts[0] === "admin" && parts[1] === "settings" && parts[2]) {
    res.json({ group: parts[2], settings: {} });
    return true;
  }

  if (parts[0] === "doctor" && parts[1] === "wallet" && parts[2] === "withdraw" && req.method === "POST") {
    const table = await firstTable(["doctor_withdrawals", "withdrawals"]);
    if (!table) return res.status(422).json({ message: "Withdrawals are not available yet." }) || true;
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    const id = await insert(table, {
      doctor_id: doctorId,
      user_id: req.user.id,
      amount: req.body?.amount,
      currency: req.body?.currency || "RWF",
      status: "pending",
    });
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    res.status(201).json({ message: "Withdrawal requested.", withdrawal: row, data: row });
    return true;
  }

  if (parts[0] === "doctor" && parts[1] === "wallet" && parts[2] === "cancel-withdrawal" && parts[3]) {
    const table = await firstTable(["doctor_withdrawals", "withdrawals"]);
    if (!table) return res.status(422).json({ message: "Withdrawals are not available yet." }) || true;
    if (await hasColumn(table, "status")) await update(table, parts[3], { status: "cancelled" });
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [parts[3]]));
    res.json({ message: "Withdrawal cancelled.", withdrawal: row, data: row });
    return true;
  }

  if (parts[2] === "reset" && parts[1] === "working-hours" && req.method === "DELETE") {
    const table = await firstTable(parts[0] === "pharmacy" ? ["pharmacy_working_hours"] : ["hospital_working_hours"]);
    const ownerCol = parts[0] === "pharmacy" ? "pharmacy_id" : "hospital_id";
    const ownerId = await loadOwnedId(req.user.id, parts[0] === "pharmacy" ? "pharmacies" : "hospitals");
    if (table && ownerId && await hasColumn(table, ownerCol)) {
      await pool.query(`DELETE FROM \`${table}\` WHERE \`${ownerCol}\` = ?`, [ownerId]);
    }
    res.json({ message: "Working hours reset." });
    return true;
  }

  if (parts[1] === "closures" && parts[2] === "check-date") {
    res.json({ closed: false, closure: null });
    return true;
  }

  if (parts[0] === "pharmacy" && parts[1] === "inventory" && parts[2] === "mode") {
    res.json({ mode: req.body?.mode || "internal", inventory_mode: req.body?.mode || "internal" });
    return true;
  }

  if (parts[0] === "settings") {
    if (req.method === "GET" && !parts[1]) return false;
    if (parts[1] === "password" && req.body?.password) {
      await update("users", req.user.id, { password: await hashPassword(req.body.password) });
      res.json({ message: "Password updated." });
      return true;
    }
    if (parts[1] === "profile") {
      const body = { ...(req.body ?? {}) };
      delete body.password;
      await update("users", req.user.id, body);
      res.json({ message: "Profile updated." });
      return true;
    }
    res.json({ message: parts[2] === "request" ? "Code sent." : "Saved." });
    return true;
  }

  if (parts[1] === "profile" && parts[2]) {
    const table = PROFILE_TABLES[parts[0]];
    if (!table) return false;
    const id = await loadOwnedId(req.user.id, table);
    const file = req.files?.[0];
    if (file && id) {
      const url = saveUpload(file, `${parts[0]}_${parts[2]}`);
      const requested = parts[2] === "documents" ? (req.body?.type || "document") : parts[2] === "avatar" ? "avatar" : parts[2];
      const column = FILE_COLUMNS[requested] || requested;
      if (parts[0] === "doctor" && column === "medical_license_document") {
        const current = await one("SELECT medical_license_document FROM doctors WHERE id = ?", [id]);
        if (current?.medical_license_document) {
          res.status(403).json({
            message: "A renewed medical license can only be uploaded by an admin.",
          });
          return true;
        }
      }
      if (await hasColumn(table, column)) await update(table, id, { [column]: url });
      else if (column !== "signature_image" && await hasColumn(table, "image")) await update(table, id, { image: url });
      res.json({ message: "Saved.", image: url, logo: url, signature: url, avatar: url, url });
      return true;
    }
    if (id && ["POST", "PUT", "PATCH"].includes(req.method)) {
      const body = { ...(req.body ?? {}) };
      delete body.password;
      if (parts[0] === "doctor") {
        delete body.license_expires_at;
        delete body.license_expiry_reminded_for;
      }
      await update(table, id, body);
      const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
      res.json({
        message: "Saved.",
        [parts[2]]: row,
        medical_info: row,
        insurance: row,
        data: row,
        [parts[0]]: row,
      });
      return true;
    }
    if (req.method === "GET") {
      const row = id ? await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id])) : null;
      res.json({ [parts[2]]: row, data: row, [parts[0]]: row });
      return true;
    }
  }

  const parsed = parseParts(parts);
  const table = await tableFromKey(parsed.key);
  if (!table) return false;
  const id = parsed.ids[0];
  const action = parsed.action;

  if (action === "join" && id) {
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    res.json({
      message: "Join ready.",
      data: row,
      room_url: row?.daily_room_url || row?.room_url || null,
      room_name: row?.daily_room_name || row?.room_name || null,
      token: row?.daily_doctor_token || row?.daily_guest_token || row?.token || null,
      can_join: Boolean(row?.daily_room_name || row?.room_name || row?.daily_room_url || row?.room_url),
    });
    return true;
  }

  if (action === "notes" && id) {
    if (await hasColumn(table, "notes")) await update(table, id, { notes: req.body?.notes ?? req.body?.note ?? "" });
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    res.json({ message: "Notes saved.", data: row, ...(row ?? {}) });
    return true;
  }

  if (action === "reschedule" && id) {
    await update(table, id, req.body ?? {});
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    res.json({ message: "Rescheduled.", data: row, ...(row ?? {}) });
    return true;
  }

  const status = action ? (EXTRA_STATUS[action] || STATUS_ACTIONS[action]) : null;
  if (action && id && status && await hasColumn(table, "status")) {
    const isInstantTable = ["instant_consultation_requests", "instant_consultations"].includes(table);
    if (isInstantTable && action === "accept" && await hasColumn(table, "doctor_id")) {
      const target = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]).catch(() => null);
      const doctorId = target?.doctor_id || (await loadOwnedId(req.user.id, "doctors"));
      if (doctorId) {
        const busy = await one(
          `SELECT id FROM \`${table}\` WHERE doctor_id = ? AND id <> ? AND status IN ('accepted','in_progress') ORDER BY id DESC LIMIT 1`,
          [doctorId, id],
        ).catch(() => null);
        if (busy) {
          res.status(409).json({
            message: "Finish your current instant consultation before accepting another. Other patients will wait in the queue. Bookings remain available.",
            active_instant_id: busy.id,
          });
          return true;
        }
      }
    }
    await update(table, id, { status });
    const stamp = {};
    if (status === "completed" && await hasColumn(table, "completed_at")) stamp.completed_at = new Date();
    if (status === "completed" && await hasColumn(table, "ended_at")) stamp.ended_at = new Date();
    if (status === "cancelled" && await hasColumn(table, "cancelled_at")) stamp.cancelled_at = new Date();
    if (status === "accepted" && await hasColumn(table, "accepted_at")) stamp.accepted_at = new Date();
    if (status === "confirmed" && await hasColumn(table, "confirmed_at")) stamp.confirmed_at = new Date();
    if (Object.keys(stamp).length) await update(table, id, stamp);
    if (["approve", "activate"].includes(action)) {
      await recordVerifier(table, id, req.user?.id).catch(() => null);
    }
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    res.json({ message: "Updated.", data: row, ...(row ?? {}) });
    return true;
  }

  if (!id && req.method === "GET") {
    const extra = await ownedExtra(parts[0], req.user.id, table);
    const column = Object.keys(extra)[0];
    const rows = await presentRows(table, await q(
      column ? `SELECT * FROM \`${table}\` WHERE \`${column}\` = ? ORDER BY id DESC LIMIT 50` : `SELECT * FROM \`${table}\` ORDER BY id DESC LIMIT 50`,
      column ? [extra[column]] : [],
    ).catch(() => []));
    res.json({ data: rows, current_page: 1, last_page: 1, per_page: 50, total: rows.length });
    return true;
  }

  if (!id && req.method === "POST") {
    const extra = await ownedExtra(parts[0], req.user.id, table);
    const newId = await insert(table, { ...(req.body ?? {}), ...extra });
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [newId]));
    res.status(201).json({ message: "Saved.", data: row, ...(row ?? {}) });
    return true;
  }

  if (id && req.method === "DELETE") {
    await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    res.json({ message: "Deleted." });
    return true;
  }

  if (id && ["PUT", "PATCH", "POST"].includes(req.method)) {
    await update(table, id, req.body ?? {});
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    res.json({ message: "Updated.", data: row, ...(row ?? {}) });
    return true;
  }

  if (id && req.method === "GET") {
    const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
    if (!row) {
      res.status(404).json({ message: "Record not found." });
      return true;
    }
    res.json({ data: row, ...row });
    return true;
  }

  return false;
}

export function registerActions(router, RESOURCES) {
  router.use(upload.any(), async (req, res, next) => {
    try {
      const parts = segments(req);
      if (!req.user) return res.status(401).json({ message: "Unauthenticated." });
      if (parts[0] === "patient" && parts[1] === "pharmacy-orders") {
        return handlePharmacyOrders(req, res, parts);
      }
      if (req.method === "GET" && parts[0] === "pharmacy" && parts[1] === "dashboard") {
        return res.json(emptyDashboard(req.query));
      }
      if (parts[0] === "notifications" && parts[1] === "unread-count") {
        const total = await one(
          "SELECT COUNT(*) AS total FROM notifications WHERE notifiable_id = ? AND read_at IS NULL",
          [req.user?.id || 0],
        ).catch(() => ({ total: 0 }));
        return res.json({ unread_count: Number(total?.total ?? 0), count: Number(total?.total ?? 0) });
      }
      if (parts[0] === "notifications" && parts[1] === "read-all") {
        await pool.query(
          "UPDATE notifications SET read_at = NOW() WHERE notifiable_id = ? AND read_at IS NULL",
          [req.user?.id || 0],
        ).catch(() => {});
        return res.json({ message: "Notifications marked as read." });
      }
      if (req.method === "DELETE" && parts.length === 1 && parts[0] === "notifications") {
        await pool.query("DELETE FROM notifications WHERE notifiable_id = ?", [req.user?.id || 0]).catch(() => {});
        return res.json({ message: "Notifications cleared." });
      }

      const idIndex = parts.findIndex((part) => /^\d+$/.test(part));
      if (idIndex < 1) {
        if (await fillGap(req, res, parts)) return;
        return next();
      }
      const action = parts[idIndex + 1];
      const resource = parts[idIndex - 1];
      const table = tableFor(resource, RESOURCES);
      const id = parts[idIndex];
      if (!table || !(await tableExists(table))) {
        if (await fillGap(req, res, parts)) return;
        return next();
      }

      if (req.method === "GET" && !action) {
        const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
        if (!row) return res.status(404).json({ message: "Record not found." });
        return res.json({ data: row, ...row });
      }
      if (!action) {
        if (await fillGap(req, res, parts)) return;
        return next();
      }

      const file = req.files?.[0];
      const column = FILE_COLUMNS[action];
      if (file && column && await hasColumn(table, column)) {
        const url = saveUpload(file, `${resource}_${id}`);
        await update(table, id, { [column]: url });
        const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
        return res.json({ message: "Image saved.", [column]: url, photo_url: url, image: url, avatar: url, logo: url, data: row });
      }

      if (await applyStatus(table, id, action, req.body, req.user?.id)) {
        if (table === "pharmacy_orders") {
          const order = await shapeOrder(await one("SELECT * FROM pharmacy_orders WHERE id = ?", [id]));
          return res.json({ message: "Updated.", order, data: order });
        }
        const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
        return res.json({ message: "Updated.", data: row, ...(row ?? {}) });
      }

      if (req.method === "GET") {
        const rows = await q(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]).catch(() => []);
        return res.json({ data: await presentRow(table, rows[0]), items: [] });
      }
      if (await fillGap(req, res, parts)) return;
      return next();
    } catch (error) {
      next(error);
    }
  });
}
