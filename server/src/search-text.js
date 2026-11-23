/** Search helpers that do not touch the database. */

/** Same order for every page of a session. A missing seed falls back to the 10-minute window. */
export function doctorOrderKey(query = {}, now = Date.now()) {
  const seed = String(query?.seed || "").trim();
  if (/^[A-Za-z0-9_-]{8,80}$/.test(seed)) return seed;
  return String(Math.floor(now / (10 * 60 * 1000)));
}

/** A live instant consult with no activity for two hours after it started is stale. */
export function freshInstantSql(columns = []) {
  const present = new Set(columns);
  const start = ["started_at", "accepted_at", "created_at"].find((name) => present.has(name));
  if (!start) return "1=1";
  const activity = ["updated_at", start].filter((name) => present.has(name));
  const activityExpr = activity.length > 1
    ? `COALESCE(${activity.map((name) => `\`${name}\``).join(", ")})`
    : `\`${activity[0]}\``;
  return `(
    \`${start}\` IS NULL
    OR \`${start}\` >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)
    OR ${activityExpr} >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)
  )`;
}

const LANGUAGE_GROUPS = {
  en: ["en", "english"],
  fr: ["fr", "french", "francais"],
  rw: ["rw", "kin", "kiny", "kinyarwanda", "ikinyarwanda"],
};

const LANGUAGE_ALIASES = {
  en: "en",
  english: "en",
  fr: "fr",
  french: "fr",
  francais: "fr",
  français: "fr",
  rw: "rw",
  kin: "rw",
  kiny: "rw",
  kinyarwanda: "rw",
  ikinyarwanda: "rw",
};

/** Stored doctor languages use several spellings for the same language. */
export function languageFilterValues(input) {
  const language = String(input || "").trim().toLowerCase();
  if (!language) return [];
  const key = LANGUAGE_ALIASES[language];
  return key ? [...LANGUAGE_GROUPS[key]] : [language];
}

export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function likeContains(value) {
  return `%${escapeLike(String(value).trim())}%`;
}

/** SQL fragment. The bound value should come from likeContains. */
export function containsLike(expression) {
  return `${expression} LIKE ? ESCAPE '\\\\'`;
}

function coordinate(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const aLat = coordinate(lat1);
  const aLon = coordinate(lon1);
  const bLat = coordinate(lat2);
  const bLon = coordinate(lon2);
  if ([aLat, aLon, bLat, bLon].some((value) => value == null)) return null;
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 1000) / 1000;
}

/** Places with coordinates come first, nearest first. Missing coordinates stay at the end. */
export function sortByDistance(rows, lat, lng) {
  const originLat = coordinate(lat);
  const originLng = coordinate(lng);
  if (originLat == null || originLng == null) return rows;
  return [...(rows || [])]
    .map((row) => ({
      ...row,
      distance_km: distanceKm(originLat, originLng, row?.latitude, row?.longitude),
    }))
    .sort((left, right) => {
      if (left.distance_km == null && right.distance_km == null) return Number(right.id || 0) - Number(left.id || 0);
      if (left.distance_km == null) return 1;
      if (right.distance_km == null) return -1;
      return left.distance_km - right.distance_km || Number(right.id || 0) - Number(left.id || 0);
    });
}

const PAID = new Set(["paid", "completed", "success", "successful"]);

/**
 * Revenue follows payment status. A delivered or dispensed order is not revenue
 * unless its payment status says it was paid. When the column is absent, only
 * an explicit paid status counts.
 */
export function countsAsPaidRevenue(row) {
  if (!row || typeof row !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(row, "payment_status")) {
    return PAID.has(String(row.payment_status || "").trim().toLowerCase());
  }
  return ["paid", "success", "successful"].includes(String(row.status || "").trim().toLowerCase());
}

/** A hospital dashboard counts appointments booked at that hospital, not every visit of a linked doctor. */
export function hospitalAppointmentFilter(hospitalId) {
  return { sql: "hospital_id = ?", params: [Number(hospitalId) || 0] };
}

/** Fields a public medicine list may return. Internal cost and supplier data stay off. */
export function publicMedicine(row) {
  if (!row) return null;
  const quantity = Number(row.quantity ?? row.stock ?? 0);
  const inStock = Number.isFinite(quantity) && quantity > 0;
  const pharmacy = row.pharmacy_name || row.pharmacy_slug || row.pharmacy_id
    ? {
        id: row.pharmacy_id ?? null,
        name: row.pharmacy_name || null,
        slug: row.pharmacy_slug || null,
        city: row.pharmacy_city || null,
      }
    : null;
  return {
    id: row.id ?? null,
    name: row.name || row.name_en || null,
    generic_name: row.generic_name || null,
    dosage: row.dosage || row.strength || null,
    form: row.form || row.dosage_form || null,
    unit: row.unit || null,
    category: row.category || null,
    price: row.price ?? row.selling_price ?? null,
    currency: row.currency || "RWF",
    requires_prescription: Boolean(row.requires_prescription || row.prescription_required),
    quantity: Number.isFinite(quantity) ? quantity : 0,
    in_stock: inStock,
    is_available: inStock && row.is_active !== 0 && row.is_active !== false,
    pharmacy_id: row.pharmacy_id ?? null,
    pharmacy,
  };
}
