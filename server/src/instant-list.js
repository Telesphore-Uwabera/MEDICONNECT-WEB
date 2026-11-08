import { hasColumn, one, pageArgs, paginateList, q, tableExists } from "./db.js";
import { consultationAmount } from "./public.js";
import { loadInstantViewer } from "./visit-rules.js";
import {
  JOINABLE_STATUSES,
  UNPAID_OPEN_STATUSES,
  ageSeconds,
  canJoinInstant,
  canPayInstant,
  instantOwnedWhere,
  ownsInstant,
} from "./instant-visit.js";

async function instantTable() {
  if (await tableExists("instant_consultation_requests")) return "instant_consultation_requests";
  if (await tableExists("instant_consultations")) return "instant_consultations";
  return null;
}

const READ_COLUMNS = [
  "id", "status", "payment_status", "doctor_id", "amount", "currency", "created_at",
  "daily_room_url", "room_url", "daily_room_name", "room_name",
  "user_id", "patient_id", "guest_email", "guest_phone", "email", "phone",
];

const STATUS_VALUES = {
  pending: ["pending", "queued", "waiting", "payment_pending"],
  confirmed: ["confirmed"],
  in_progress: ["accepted", "in_progress"],
  completed: ["completed", "done"],
  cancelled: ["cancelled", "canceled", "declined", "rejected", "expired", "payment_expired"],
};

async function columnSet(table) {
  const present = new Set();
  for (const name of READ_COLUMNS) {
    if (await hasColumn(table, name)) present.add(name);
  }
  return present;
}

function statusBucket(status) {
  const value = String(status || "").toLowerCase();
  if (["pending", "queued", "waiting", "payment_pending"].includes(value)) return "pending";
  if (value === "confirmed") return "confirmed";
  if (["accepted", "in_progress"].includes(value)) return "in_progress";
  if (["completed", "done"].includes(value)) return "completed";
  if (["cancelled", "canceled", "declined", "rejected", "expired", "payment_expired"].includes(value)) return "cancelled";
  return "other";
}

function dayOf(value) {
  const day = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

function countsFromGroups(groups) {
  const counts = { total: 0, pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const group of groups) {
    const count = Number(group.total) || 0;
    counts.total += count;
    const bucket = statusBucket(group.status);
    if (bucket !== "other") counts[bucket] += count;
  }
  return counts;
}

function statusFilter(requested) {
  const value = String(requested || "").toLowerCase();
  if (!value || value === "all") return { sql: "1=1", params: [] };
  const list = STATUS_VALUES[value];
  if (!list) return { sql: "0", params: [] };
  return { sql: `\`status\` IN (${list.map(() => "?").join(",")})`, params: list };
}

function dateFilter(query) {
  const parts = [];
  const params = [];
  const from = dayOf(query.date_from);
  const to = dayOf(query.date_to);
  if (from) {
    parts.push("LEFT(`created_at`, 10) >= ?");
    params.push(from);
  }
  if (to) {
    parts.push("LEFT(`created_at`, 10) <= ?");
    params.push(to);
  }
  return { sql: parts.join(" AND ") || "1=1", params };
}

const OPEN_STATUSES = [...UNPAID_OPEN_STATUSES, ...JOINABLE_STATUSES];

async function queuePlace(table, row) {
  const created = row.created_at ?? null;
  const doctorSql = row.doctor_id == null || row.doctor_id === "" ? "`doctor_id` IS NULL" : "`doctor_id` = ?";
  const doctorParams = row.doctor_id == null || row.doctor_id === "" ? [] : [row.doctor_id];
  const counted = await one(
    `SELECT COUNT(*) AS ahead FROM \`${table}\`
     WHERE ${doctorSql}
       AND \`status\` IN (${OPEN_STATUSES.map(() => "?").join(",")})
       AND (
         (? IS NOT NULL AND \`created_at\` IS NOT NULL AND (\`created_at\` < ? OR (\`created_at\` = ? AND \`id\` <= ?)))
         OR (? IS NULL AND (\`created_at\` IS NOT NULL OR \`id\` <= ?))
       )`,
    [...doctorParams, ...OPEN_STATUSES, created, created, created, row.id, created, row.id],
  );
  const queuePosition = Math.max(1, Number(counted?.ahead) || 1);
  const peopleAhead = Math.max(0, queuePosition - 1);
  return {
    queue_position: queuePosition,
    people_ahead: peopleAhead,
    you_are_next: queuePosition === 1,
  };
}

async function shapeOwnedInstant(table, row) {
  const doctor = row.doctor_id
    ? await one(
      "SELECT u.name AS name FROM doctors d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ? LIMIT 1",
      [row.doctor_id],
    ).catch(() => null)
    : null;
  const place = await queuePlace(table, row);
  const amount = await consultationAmount({ doctor_id: row.doctor_id, amount: row.amount });
  const canJoin = canJoinInstant(row);
  const paymentStatus = row.payment_status || (row.status === "confirmed" ? "paid" : null);
  return {
    id: row.id,
    status: row.status || "pending",
    payment_status: paymentStatus,
    doctor_id: row.doctor_id || null,
    doctor_name: doctor?.name || null,
    amount,
    currency: row.currency || "RWF",
    created_at: row.created_at || null,
    age_seconds: ageSeconds(row.created_at),
    ...place,
    can_pay: canPayInstant({ ...row, payment_status: paymentStatus }) && amount > 0,
    can_join: canJoin,
    room_url: canJoin
      ? (row.daily_room_url || row.room_url || `/consultation/${row.daily_room_name || row.room_name || `instant-${row.id}`}`)
      : null,
  };
}

export async function listOwnedInstantConsultations(user, query = {}) {
  const table = await instantTable();
  const empty = paginateList({ data: [], total: 0, page: 1, perPage: 10, path: "/api/v1/patient/instant-consultations" });
  if (!table || !user?.id) return { ...empty, counts: countsFromGroups([]), open: [] };
  const viewer = await loadInstantViewer(user);
  const columns = await columnSet(table);
  const owned = instantOwnedWhere(viewer, columns);
  const groups = await q(
    `SELECT \`status\`, COUNT(*) AS total FROM \`${table}\` WHERE ${owned.sql} GROUP BY \`status\``,
    owned.params,
  );
  const counts = countsFromGroups(groups);
  const status = statusFilter(query.status);
  const dates = dateFilter(query);
  const where = `${owned.sql} AND ${status.sql} AND ${dates.sql}`;
  const params = [...owned.params, ...status.params, ...dates.params];
  const totalRow = await one(`SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${where}`, params);
  const total = Number(totalRow?.total || 0);
  const { page, perPage, offset } = pageArgs({ query });
  const selected = READ_COLUMNS.filter((name) => columns.has(name)).map((name) => `\`${name}\``).join(", ") || "`id`";
  const pageRows = await q(
    `SELECT ${selected} FROM \`${table}\` WHERE ${where} ORDER BY \`id\` DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  );
  const openRows = await q(
    `SELECT ${selected} FROM \`${table}\` WHERE ${owned.sql} AND \`status\` IN (${OPEN_STATUSES.map(() => "?").join(",")}) ORDER BY \`id\` DESC`,
    [...owned.params, ...OPEN_STATUSES],
  );
  const data = [];
  for (const row of pageRows) {
    if (!ownsInstant(row, viewer)) continue;
    data.push(await shapeOwnedInstant(table, row));
  }
  const open = [];
  for (const row of openRows) {
    if (!ownsInstant(row, viewer)) continue;
    const shaped = await shapeOwnedInstant(table, row);
    if (shaped.can_pay || shaped.can_join) open.push(shaped);
  }
  return {
    ...paginateList({
      data,
      total,
      page,
      perPage,
      path: "/api/v1/patient/instant-consultations",
    }),
    counts,
    open,
  };
}

export function registerPatientInstantList(router, { requireAuth, requireRole }) {
  router.get("/patient/instant-consultations", requireAuth, requireRole("patient"), async (req, res, next) => {
    try {
      res.json(await listOwnedInstantConsultations(req.user, req.query));
    } catch (error) {
      next(error);
    }
  });
}
