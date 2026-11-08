import { hasColumn, one, pageArgs, paginateList, q, tableExists } from "./db.js";
import { consultationAmount } from "./public.js";
import {
  ageSeconds,
  canJoinInstant,
  canPayInstant,
  ownsInstant,
  placeInQueue,
} from "./instant-visit.js";

const SECRET_KEYS = [
  "guest_token",
  "daily_guest_token",
  "daily_doctor_token",
  "token",
  "password",
];

async function instantTable() {
  if (await tableExists("instant_consultation_requests")) return "instant_consultation_requests";
  if (await tableExists("instant_consultations")) return "instant_consultations";
  return null;
}

async function ownerIdentity(user) {
  const profiles = await tableExists("patients")
    ? await q("SELECT id FROM patients WHERE user_id = ?", [user.id]).catch(() => [])
    : [];
  return {
    userId: user.id,
    patientIds: [...new Set([Number(user.id), ...profiles.map((profile) => Number(profile.id))].filter((id) => id > 0))],
    email: user.email,
    phone: user.phone,
  };
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

function countsOf(rows) {
  const counts = { total: rows.length, pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const row of rows) {
    const bucket = statusBucket(row.status);
    if (bucket !== "other") counts[bucket] += 1;
  }
  return counts;
}

async function shapeOwnedInstant(table, row) {
  const doctor = row.doctor_id
    ? await one(
      "SELECT u.name AS name FROM doctors d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ? LIMIT 1",
      [row.doctor_id],
    ).catch(() => null)
    : null;
  const peers = await q(
    `SELECT id, doctor_id, status, created_at FROM \`${table}\`
     WHERE ${row.doctor_id == null ? "doctor_id IS NULL" : "doctor_id = ?"}
       AND status IN ('pending','queued','waiting','payment_pending','confirmed','accepted','in_progress')
     ORDER BY id ASC LIMIT 100`,
    row.doctor_id == null ? [] : [row.doctor_id],
  ).catch(() => []);
  const place = placeInQueue(row, peers.length ? peers : [row]);
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
  if (!table || !user?.id) return { ...empty, counts: countsOf([]), open: [] };
  const identity = await ownerIdentity(user);
  const clauses = [];
  const params = [];
  if (await hasColumn(table, "user_id")) {
    clauses.push("user_id = ?");
    params.push(user.id);
  }
  const patientIds = [...new Set([Number(user.id), ...identity.patientIds.map(Number)].filter((id) => id > 0))];
  if (patientIds.length && await hasColumn(table, "patient_id")) {
    clauses.push(`patient_id IN (${patientIds.map(() => "?").join(",")})`);
    params.push(...patientIds);
  }
  if (user.email && await hasColumn(table, "guest_email")) {
    clauses.push("guest_email = ?");
    params.push(user.email);
  }
  if (user.phone && await hasColumn(table, "guest_phone")) {
    clauses.push("guest_phone = ?");
    params.push(user.phone);
  }
  if (!clauses.length) return { ...empty, counts: countsOf([]), open: [] };
  const candidates = await q(
    `SELECT * FROM \`${table}\` WHERE ${clauses.join(" OR ")} ORDER BY id DESC LIMIT 200`,
    params,
  ).catch(() => []);
  candidates.sort((a, b) => Number(b.id) - Number(a.id));
  let owned = [];
  for (const row of candidates.filter((item) => ownsInstant(item, identity))) {
    owned.push(await shapeOwnedInstant(table, row));
  }
  const counts = countsOf(owned);
  const open = owned.filter((row) => row.can_pay || row.can_join);
  const requested = String(query.status || "").toLowerCase();
  const from = dayOf(query.date_from);
  const to = dayOf(query.date_to);
  const listed = owned.filter((row) => {
    if (requested && requested !== "all" && statusBucket(row.status) !== requested) return false;
    if (!from && !to) return true;
    const day = dayOf(row.created_at);
    if (!day) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  const { page, perPage, offset } = pageArgs({ query });
  const pageRows = listed.slice(offset, offset + perPage).map((row) => {
    const copy = { ...row };
    for (const key of SECRET_KEYS) delete copy[key];
    return copy;
  });
  return {
    ...paginateList({
      data: pageRows,
      total: listed.length,
      page,
      perPage,
      path: "/api/v1/patient/instant-consultations",
    }),
    counts,
    open: open.map((row) => {
      const copy = { ...row };
      for (const key of SECRET_KEYS) delete copy[key];
      return copy;
    }),
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
