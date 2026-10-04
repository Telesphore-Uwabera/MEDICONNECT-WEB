import fs from "fs";
import path from "path";
import multer from "multer";
import { loadOwnedId } from "./auth.js";
import { hasColumn, insert, one, pool, presentRow, q, tableExists, update } from "./db.js";

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

async function applyStatus(table, id, action, body = {}) {
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
  const status = STATUS_ACTIONS[action];
  if (!status || !(await hasColumn(table, "status"))) return false;
  await update(table, id, { status });
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
      if (idIndex < 1) return next();
      const action = parts[idIndex + 1];
      const resource = parts[idIndex - 1];
      const table = tableFor(resource, RESOURCES);
      const id = parts[idIndex];
      if (!table || !(await tableExists(table))) return next();

      if (req.method === "GET" && !action) {
        const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
        if (!row) return res.status(404).json({ message: "Record not found." });
        return res.json({ data: row, ...row });
      }
      if (!action) return next();

      const file = req.files?.[0];
      const column = FILE_COLUMNS[action];
      if (file && column && await hasColumn(table, column)) {
        const url = saveUpload(file, `${resource}_${id}`);
        await update(table, id, { [column]: url });
        const row = await presentRow(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]));
        return res.json({ message: "Image saved.", [column]: url, photo_url: url, image: url, avatar: url, logo: url, data: row });
      }

      if (await applyStatus(table, id, action, req.body)) {
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
      return next();
    } catch (error) {
      next(error);
    }
  });
}
