/** Kigali is UTC+2 and has no daylight saving. Shift a stored UTC timestamp onto that day. */
export function kigaliDaySql(column) {
  return `DATE(DATE_ADD(\`${column}\`, INTERVAL 2 HOUR))`;
}

export function kigaliTodaySql() {
  return "DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR))";
}

/** A dashboard window measured on the Kigali day, not the database server's day. */
export function kigaliPeriodSql(column, period) {
  const day = kigaliDaySql(column);
  const today = kigaliTodaySql();
  if (period === "today" || period === "day") return `${day} = ${today}`;
  if (period === "week") return `${day} >= DATE_SUB(${today}, INTERVAL 6 DAY)`;
  if (period === "year") return `${day} >= DATE_SUB(${today}, INTERVAL 364 DAY)`;
  return `${day} >= DATE_SUB(${today}, INTERVAL 29 DAY)`;
}

export function kigaliPreviousSql(column, period) {
  const day = kigaliDaySql(column);
  const today = kigaliTodaySql();
  if (period === "today" || period === "day") return `${day} = DATE_SUB(${today}, INTERVAL 1 DAY)`;
  if (period === "week") return `${day} >= DATE_SUB(${today}, INTERVAL 13 DAY) AND ${day} < DATE_SUB(${today}, INTERVAL 6 DAY)`;
  if (period === "year") return `${day} >= DATE_SUB(${today}, INTERVAL 729 DAY) AND ${day} < DATE_SUB(${today}, INTERVAL 364 DAY)`;
  return `${day} >= DATE_SUB(${today}, INTERVAL 59 DAY) AND ${day} < DATE_SUB(${today}, INTERVAL 29 DAY)`;
}

/** History list paging. history_page wins over page, and the default page is the latest 100. */
export function historyPageArgs(query = {}) {
  const page = Math.max(1, Number(query.history_page ?? query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.history_per_page ?? query.limit) || 100));
  return { page, limit, offset: (page - 1) * limit };
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
