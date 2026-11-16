/** Kigali is UTC+2 and has no daylight saving. Shift a stored UTC timestamp onto that day. */
export function kigaliDaySql(column) {
  return `DATE(DATE_ADD(\`${column}\`, INTERVAL 2 HOUR))`;
}

export function kigaliTodaySql() {
  return "DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR))";
}

export function durationMinutes(start, end) {
  const from = start ? new Date(start).getTime() : NaN;
  const to = end ? new Date(end).getTime() : NaN;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return Math.round((to - from) / 60000);
}

export function average(values) {
  const nums = (values || []).filter((value) => value != null && value !== "").map(Number).filter((value) => Number.isFinite(value));
  if (!nums.length) return 0;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

const PAID = new Set(["paid", "completed", "success", "successful"]);
const DONE = new Set(["completed", "done", "accepted", "in_progress", "confirmed"]);

/** A finished visit must not look unpaid when the payment_status column is absent. */
export function displayedPaymentStatus(row) {
  const pay = String(row?.payment_status || "").toLowerCase();
  if (PAID.has(pay)) return "paid";
  if (pay) return pay;
  const fee = [row?.consultation_fee, row?.patient_pays, row?.amount_due, row?.amount]
    .map((value) => (value == null || value === "" ? null : Number(value)))
    .find((value) => value != null && Number.isFinite(value));
  if (fee === 0) return "paid";
  if (DONE.has(String(row?.status || "").toLowerCase())) return "paid";
  return null;
}

export function changePercent(current, previous) {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
