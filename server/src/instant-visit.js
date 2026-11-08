/** Instant-visit rules that do not touch the database. */

export const OPEN_INSTANT_STATUSES = [
  "pending",
  "queued",
  "waiting",
  "payment_pending",
  "confirmed",
  "accepted",
  "in_progress",
];

export const UNPAID_OPEN_STATUSES = ["pending", "queued", "waiting", "payment_pending"];

export const JOINABLE_STATUSES = ["accepted", "in_progress"];

export const UNPAID_LIMIT_SEC = 15 * 60;

const PAID = new Set(["paid", "completed", "success", "successful"]);

export function ageSeconds(value, now = new Date()) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text);
  const iso = hasZone ? text : `${text.replace(" ", "T")}Z`;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor((now.getTime() - ms) / 1000));
}

export function isPaidStatus(row) {
  const payment = String(row?.payment_status || "").toLowerCase();
  if (PAID.has(payment)) return true;
  return String(row?.status || "").toLowerCase() === "confirmed";
}

export function isUnpaidOpen(row, now = new Date()) {
  const status = String(row?.status || "").toLowerCase();
  if (!UNPAID_OPEN_STATUSES.includes(status) || isPaidStatus(row)) return false;
  const age = ageSeconds(row?.created_at, now);
  if (age == null) return true;
  return age < UNPAID_LIMIT_SEC;
}

/**
 * Fair place among this request's own doctor queue.
 * Unassigned ("any doctor") rows are a separate pool and do not push a named doctor back.
 * Earlier created_at, then lower id, is ahead. Missing people_ahead must not mean "you are next".
 */
export function placeInQueue(request, peers = [], now = new Date()) {
  const doctorId = request?.doctor_id == null || request.doctor_id === "" ? null : Number(request.doctor_id);
  const open = peers.filter((row) => {
    const status = String(row?.status || "").toLowerCase();
    if (!OPEN_INSTANT_STATUSES.includes(status)) return false;
    const rowDoctor = row?.doctor_id == null || row.doctor_id === "" ? null : Number(row.doctor_id);
    return rowDoctor === doctorId;
  });
  const sorted = open.slice().sort((a, b) => {
    const aa = ageSeconds(a.created_at, now);
    const bb = ageSeconds(b.created_at, now);
    const aMs = aa == null ? Number.MAX_SAFE_INTEGER : -aa;
    const bMs = bb == null ? Number.MAX_SAFE_INTEGER : -bb;
    if (aMs !== bMs) return aMs - bMs;
    return Number(a.id) - Number(b.id);
  });
  let index = sorted.findIndex((row) => Number(row.id) === Number(request?.id));
  if (index < 0) {
    sorted.push(request);
    sorted.sort((a, b) => Number(a.id) - Number(b.id));
    index = sorted.findIndex((row) => Number(row.id) === Number(request?.id));
  }
  const queuePosition = index + 1;
  const peopleAhead = Math.max(0, queuePosition - 1);
  return {
    queue_position: queuePosition,
    people_ahead: peopleAhead,
    you_are_next: queuePosition === 1,
  };
}

export function ownsInstant(row, identity) {
  if (!row || !identity) return false;
  const userId = Number(identity.userId || 0);
  const patientIds = new Set((identity.patientIds || []).map(Number).filter((id) => id > 0));
  if (userId && Number(row.user_id) === userId) return true;
  if (patientIds.size && patientIds.has(Number(row.patient_id))) return true;
  const email = String(identity.email || "").trim().toLowerCase();
  const rowEmail = String(row.guest_email || row.email || "").trim().toLowerCase();
  if (email && rowEmail && email === rowEmail) return true;
  const phone = String(identity.phone || "").replace(/\D/g, "");
  const rowPhone = String(row.guest_phone || row.phone || "").replace(/\D/g, "");
  if (phone.length >= 8 && rowPhone.length >= 8 && (phone === rowPhone || phone.endsWith(rowPhone) || rowPhone.endsWith(phone))) {
    return true;
  }
  return false;
}

export function canPayInstant(row) {
  const status = String(row?.status || "").toLowerCase();
  if (!UNPAID_OPEN_STATUSES.includes(status) || isPaidStatus(row)) return false;
  return !JOINABLE_STATUSES.includes(status);
}

export function canJoinInstant(row) {
  return JOINABLE_STATUSES.includes(String(row?.status || "").toLowerCase());
}

/** Browser copy: never treat a missing ahead-count as "next" when the position is already past 1. */
export function queueLabel(position, ahead) {
  const queuePosition = Math.max(1, Number(position) || 1);
  const peopleAhead = ahead == null || ahead === "" ? Math.max(0, queuePosition - 1) : Math.max(0, Number(ahead) || 0);
  return {
    queue_position: queuePosition,
    people_ahead: peopleAhead,
    you_are_next: queuePosition === 1 && peopleAhead === 0,
  };
}
