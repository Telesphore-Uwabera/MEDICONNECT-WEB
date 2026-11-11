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
const LEGACY_PAID_STATUSES = ["confirmed", "accepted", "in_progress", "completed", "done"];
const FEE_COLUMNS = ["consultation_fee", "patient_pays", "amount_due"];

export const UNPAID_APPOINTMENT_JOIN_MESSAGE = "Pay for this visit and wait for the doctor to confirm it before joining.";
export const UNPAID_INSTANT_JOIN_MESSAGE = "This consultation is not paid yet. The patient must complete payment before you can join.";

export function unpaidJoinMessage(table) {
  return table === "appointments" ? UNPAID_APPOINTMENT_JOIN_MESSAGE : UNPAID_INSTANT_JOIN_MESSAGE;
}

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
  const fee = row?.consultation_fee ?? row?.patient_pays ?? row?.amount_due;
  if (fee != null && fee !== "" && Number(fee) === 0) return true;
  const raw = row?.payment_status;
  const payment = String(raw || "").toLowerCase();
  if (PAID.has(payment)) return true;
  // An explicit unpaid status wins over a visit status. A confirmed or accepted
  // row that never received a verified payment stays out of the queue.
  if (raw != null && String(raw).trim() !== "") return false;
  // Older rows have no payment column. Only the payment callback's confirmed
  // marker, or a visit the doctor already took after that, counts as paid.
  return LEGACY_PAID_STATUSES.includes(String(row?.status || "").toLowerCase());
}

function zeroFeeSql(feeColumns) {
  const present = FEE_COLUMNS.filter((name) => feeColumns.includes(name));
  if (!present.length) return null;
  const chosen = present
    .map((name) => `WHEN \`${name}\` IS NOT NULL AND TRIM(CAST(\`${name}\` AS CHAR)) <> '' THEN \`${name}\` + 0`)
    .join(" ");
  return `(CASE ${chosen} ELSE NULL END = 0)`;
}

/**
 * SQL twin of isPaidStatus for a count that cannot load each row.
 * A stored zero fee is paid even when payment_status says unpaid. An empty
 * fee falls through to a verified payment, then to a legacy visit status.
 * Deployments without a payment column still count an explicit zero fee.
 */
export function paidMarkerSql(feeColumns = FEE_COLUMNS, { paymentColumn = true } = {}) {
  const zero = zeroFeeSql(feeColumns);
  const legacyStatuses = `LOWER(\`status\`) IN (${LEGACY_PAID_STATUSES.map((status) => `'${status}'`).join(",")})`;
  if (!paymentColumn) return zero ? `(${zero} OR ${legacyStatuses})` : legacyStatuses;
  const verified = "LOWER(COALESCE(`payment_status`, '')) IN ('paid','completed','success','successful')";
  const legacy = `((\`payment_status\` IS NULL OR \`payment_status\` = '') AND ${legacyStatuses})`;
  return zero ? `(${zero} OR ${verified} OR ${legacy})` : `(${verified} OR ${legacy})`;
}

/** Paid, still waiting for this doctor. Unassigned requests count only when paid. */
export function countsInInstantQueue(row, doctorId) {
  if (!row || !isPaidStatus(row)) return false;
  const status = String(row.status || "").toLowerCase();
  if (!["confirmed", "pending", "queued", "waiting", "payment_pending"].includes(status)) return false;
  const named = row.doctor_id == null || row.doctor_id === "" ? null : Number(row.doctor_id);
  if (named == null) return true;
  return named === Number(doctorId);
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
    if (!OPEN_INSTANT_STATUSES.includes(status) || !isPaidStatus(row)) return false;
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

function positiveId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Same characters the ownership SQL strips, so list and pay agree. */
export function normPhone(value) {
  let digits = String(value ?? "").replace(/[+\s\-()]/g, "");
  if (!digits) return "";
  if (digits.startsWith("250") && digits.length > 9) digits = digits.slice(3);
  else if (digits.startsWith("0") && digits.length > 9) digits = digits.slice(1);
  return digits.length >= 9 ? digits : "";
}

function normEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  return email || "";
}

function contactField(primary, secondary, normalize) {
  const first = normalize(primary);
  const second = normalize(secondary);
  if (first && second && first !== second) return { value: "", conflict: true };
  return { value: first || second, conflict: false };
}

/**
 * users.id and patients.id are different sequences. A row may name the account
 * (`user_id`) or this account's patient profile (`patient_id` in `patientIds`).
 * `patient_id` equal to the account id is not proof: that integer may be a
 * different patient's profile. Contact is used only when both foreign keys are
 * empty, and email and phone must not disagree.
 *
 * `occupiedUserId` is `patients.user_id` for `patients.id = account id`, or null
 * when no profile has that id. It distinguishes a second copy of the account id
 * from a real collision with someone else's profile.
 */
export function ownsInstant(row, identity) {
  if (!row || !identity) return false;
  const userId = positiveId(identity.userId);
  const profiles = new Set((identity.patientIds || []).map(positiveId).filter(Boolean));
  const rowUser = positiveId(row.user_id);
  const rowPatient = positiveId(row.patient_id);
  const account = !rowUser ? "absent" : rowUser === userId ? "self" : "other";
  let profile = "absent";
  if (rowPatient) {
    if (profiles.has(rowPatient)) profile = "self";
    else if (userId && rowPatient === userId) {
      const occupant = positiveId(identity.occupiedUserId);
      if (occupant && occupant !== userId) profile = "other";
      else profile = "ambiguous";
    } else profile = "other";
  }
  if (account === "other" || profile === "other") return false;
  if (profile === "ambiguous" && account !== "self") return false;
  if (account === "self" || profile === "self") return true;
  const email = contactField(row.guest_email, row.email, normEmail);
  const phone = contactField(row.guest_phone, row.phone, normPhone);
  if (email.conflict || phone.conflict) return false;
  const viewerEmail = normEmail(identity.email);
  const viewerPhone = normPhone(identity.phone);
  const emailMatch = Boolean(viewerEmail && email.value && viewerEmail === email.value);
  const phoneMatch = Boolean(viewerPhone && phone.value && viewerPhone === phone.value);
  if (email.value && phone.value) return emailMatch && phoneMatch;
  if (email.value) return emailMatch;
  if (phone.value) return phoneMatch;
  return false;
}

function phoneSql(column) {
  const digits = ["+", " ", "-", "(", ")"].reduce(
    (expr, ch) => `REPLACE(${expr}, '${ch}', '')`,
    `COALESCE(\`${column}\`, '')`,
  );
  return `CASE WHEN CHAR_LENGTH(${digits}) > 9 AND ${digits} LIKE '250%' THEN SUBSTRING(${digits}, 4) WHEN CHAR_LENGTH(${digits}) > 9 AND ${digits} LIKE '0%' THEN SUBSTRING(${digits}, 2) WHEN CHAR_LENGTH(${digits}) >= 9 THEN ${digits} ELSE '' END`;
}

/**
 * SQL form of ownsInstant. Profile ids never include the account id unless that
 * account's own patient profile uses the same integer.
 */
export function instantOwnedWhere(identity, columns) {
  const present = columns instanceof Set ? columns : new Set(columns || []);
  const userId = positiveId(identity?.userId);
  const profiles = [...new Set((identity?.patientIds || []).map(positiveId).filter(Boolean))];
  const clauses = [];
  const params = [];
  const hasUser = present.has("user_id");
  const hasPatient = present.has("patient_id");
  const occupant = positiveId(identity?.occupiedUserId);
  const legacyCopyAllowed = Boolean(userId) && (!occupant || occupant === userId);
  if (hasUser && userId) {
    const patientOk = [];
    const patientParams = [];
    if (hasPatient) {
      patientOk.push("`patient_id` IS NULL");
      if (profiles.length) {
        patientOk.push(`\`patient_id\` IN (${profiles.map(() => "?").join(",")})`);
        patientParams.push(...profiles);
      }
      if (legacyCopyAllowed && !profiles.includes(userId)) {
        patientOk.push("`patient_id` = ?");
        patientParams.push(userId);
      }
    }
    clauses.push(patientOk.length ? `(\`user_id\` = ? AND (${patientOk.join(" OR ")}))` : "`user_id` = ?");
    params.push(userId, ...patientParams);
  }
  if (hasPatient && profiles.length) {
    const userOk = hasUser ? "(`user_id` IS NULL OR `user_id` = ?)" : "1=1";
    clauses.push(`(\`patient_id\` IN (${profiles.map(() => "?").join(",")}) AND ${userOk})`);
    params.push(...profiles);
    if (hasUser) params.push(userId || 0);
  }
  const emailColumn = present.has("guest_email") ? "guest_email" : present.has("email") ? "email" : null;
  const phoneColumn = present.has("guest_phone") ? "guest_phone" : present.has("phone") ? "phone" : null;
  const viewerEmail = normEmail(identity?.email);
  const viewerPhone = normPhone(identity?.phone);
  if ((emailColumn && viewerEmail) || (phoneColumn && viewerPhone)) {
    const emptyFk = [];
    if (hasUser) emptyFk.push("`user_id` IS NULL");
    if (hasPatient) emptyFk.push("`patient_id` IS NULL");
    const contact = [];
    if (emailColumn && viewerEmail && phoneColumn && viewerPhone) {
      contact.push(`(LOWER(TRIM(\`${emailColumn}\`)) = ? AND (TRIM(COALESCE(\`${phoneColumn}\`, '')) = '' OR ${phoneSql(phoneColumn)} = ?))`);
      params.push(viewerEmail, viewerPhone);
      contact.push(`(${phoneSql(phoneColumn)} = ? AND (TRIM(COALESCE(\`${emailColumn}\`, '')) = '' OR LOWER(TRIM(\`${emailColumn}\`)) = ?))`);
      params.push(viewerPhone, viewerEmail);
    } else if (emailColumn && viewerEmail) {
      contact.push(`(LOWER(TRIM(\`${emailColumn}\`)) = ? AND (${phoneColumn ? `TRIM(COALESCE(\`${phoneColumn}\`, '')) = ''` : "1=1"}))`);
      params.push(viewerEmail);
    } else if (phoneColumn && viewerPhone) {
      contact.push(`(${phoneSql(phoneColumn)} = ? AND (${emailColumn ? `TRIM(COALESCE(\`${emailColumn}\`, '')) = ''` : "1=1"}))`);
      params.push(viewerPhone);
    }
    if (contact.length) {
      const same = [];
      if (present.has("guest_email") && present.has("email")) {
        same.push("(TRIM(COALESCE(`guest_email`, '')) = '' OR TRIM(COALESCE(`email`, '')) = '' OR LOWER(TRIM(`guest_email`)) = LOWER(TRIM(`email`)))");
      }
      if (present.has("guest_phone") && present.has("phone")) {
        same.push(`(TRIM(COALESCE(\`guest_phone\`, '')) = '' OR TRIM(COALESCE(\`phone\`, '')) = '' OR ${phoneSql("guest_phone")} = ${phoneSql("phone")})`);
      }
      clauses.push(`(${emptyFk.length ? `${emptyFk.join(" AND ")} AND ` : ""}(${contact.join(" OR ")})${same.length ? ` AND ${same.join(" AND ")}` : ""})`);
    }
  }
  if (!clauses.length) return { sql: "0", params: [] };
  return { sql: `(${clauses.join(" OR ")})`, params };
}

export function canPayInstant(row) {
  const status = String(row?.status || "").toLowerCase();
  if (!UNPAID_OPEN_STATUSES.includes(status) || isPaidStatus(row)) return false;
  return !JOINABLE_STATUSES.includes(status);
}

const INSTANT_CLOSED = new Set([
  "expired",
  "cancelled",
  "canceled",
  "declined",
  "rejected",
  "no_show",
  "completed",
  "done",
]);

/** A verified IremboPay invoice: status PAID and, when the provider sent one, the same amount. */
export function verifiedPaidAmount(payment, remote) {
  if (String(remote?.paymentStatus || "").toUpperCase() !== "PAID") return false;
  if (remote?.amount == null || remote.amount === "") return true;
  return Number(remote.amount) === Number(payment?.amount);
}

/** Paid instant visits can be joined immediately. A finished or cancelled one cannot. */
export function canJoinInstant(row) {
  if (!row || !isPaidStatus(row)) return false;
  return !INSTANT_CLOSED.has(String(row.status || "").toLowerCase());
}

/**
 * Same rule as placeInQueue: people ahead is the place minus one.
 * A missing ahead count uses that rule. Any other ahead count is not a
 * current value, so the line stays unknown instead of quoting both numbers.
 * Place 1 with nobody ahead is the next case.
 */
export function queueLabel(position, ahead) {
  const parsed = Number(position);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return { state: "unknown", queue_position: null, people_ahead: null, you_are_next: false };
  }
  const queuePosition = Math.floor(parsed);
  const expected = queuePosition - 1;
  if (ahead != null && ahead !== "" && Math.floor(Number(ahead)) !== expected) {
    return { state: "unknown", queue_position: null, people_ahead: null, you_are_next: false };
  }
  return {
    state: queuePosition === 1 ? "next" : "waiting",
    queue_position: queuePosition,
    people_ahead: expected,
    you_are_next: queuePosition === 1,
  };
}
