/** Fields a signed-out visitor may see for a doctor, hospital, or pharmacy. */
const PRIVATE_KEY = /email|phone|password|token|licen[cs]e|national[_-]?id|signature|degree[_-]?doc|cv[_-]?doc|id[_-]?doc|user_id|remember|secret|address|date_of_birth|\bdob\b/i;

export function isPrivateStoragePath(urlPath) {
  let text = String(urlPath || "");
  try { text = decodeURIComponent(text); } catch { /* keep the raw path */ }
  return PRIVATE_KEY.test(text);
}

function text(value) {
  if (value == null || value === "") return null;
  return value;
}

function flag(value) {
  if (value == null || value === "") return null;
  return Boolean(Number(value));
}

export function publicDoctor(row) {
  if (!row) return null;
  const photo = text(row.image || row.photo || row.avatar || row.user_avatar);
  const hospitals = (Array.isArray(row.hospitals) ? row.hospitals : [])
    .map((hospital) => ({
      name: text(hospital?.name || hospital?.name_en),
      city: text(hospital?.city),
    }))
    .filter((hospital) => hospital.name || hospital.city);
  return {
    id: row.id ?? null,
    slug: text(row.slug),
    name: text(row.name || row.user_name || row.name_en),
    photo,
    avatar: photo,
    image: photo,
    specialization: text(row.specialization),
    experience_years: row.experience_years ?? row.years_of_experience ?? null,
    languages: text(row.languages || row.preferred_language),
    preferred_language: text(row.preferred_language),
    bio: text(row.bio || row.bio_en),
    bio_en: text(row.bio_en),
    bio_fr: text(row.bio_fr),
    bio_kiny: text(row.bio_kiny),
    consultation_fee: row.consultation_fee ?? null,
    currency: text(row.currency),
    specialization_fee: row.specialization_fee ?? row.online_fee ?? null,
    rating: row.rating ?? row.rating_avg ?? row.average_rating ?? null,
    rating_avg: row.rating_avg ?? row.rating ?? row.average_rating ?? null,
    review_count: row.review_count ?? row.reviews_count ?? null,
    specializations: (Array.isArray(row.specializations) ? row.specializations : [])
      .map((item) => (typeof item === "string" ? { name: item } : { name: item?.name || null }))
      .filter((item) => item.name),
    sub_specializations: (Array.isArray(row.sub_specializations) ? row.sub_specializations : [])
      .map((item) => ({ name: typeof item === "string" ? item : (item?.name || item?.sub_specialization || null) }))
      .filter((item) => item.name),
    instant_consultation: flag(row.instant_consultation),
    is_available: flag(row.is_available),
    bookings_paused: flag(row.bookings_paused),
    consultation_type: text(row.consultation_type),
    city: text(row.city),
    hospital_name: text(row.hospital_name || hospitals[0]?.name),
    hospitals,
  };
}

function hours(rows) {
  return (Array.isArray(rows) ? rows : []).map((hour) => ({
    day: hour.day || hour.day_of_week || null,
    open_time: hour.open_time || null,
    close_time: hour.close_time || null,
    is_closed: Boolean(hour.is_closed),
  }));
}

export function publicHospital(row) {
  if (!row) return null;
  const name = text(row.name || row.name_en);
  return {
    id: row.id ?? null,
    slug: text(row.slug),
    name,
    name_en: text(row.name_en || row.name),
    name_fr: text(row.name_fr),
    name_kiny: text(row.name_kiny),
    logo: text(row.logo || row.image || row.photo),
    image: text(row.image || row.logo || row.photo),
    photo: text(row.photo || row.logo || row.image),
    city: text(row.city),
    type: text(row.type),
    rating: row.rating ?? null,
    review_count: row.review_count ?? row.reviews_count ?? null,
    doctors_count: row.doctors_count ?? null,
    departments_count: row.departments_count ?? null,
    departments: (Array.isArray(row.departments) ? row.departments : []).map((department) => ({
      id: department.id ?? null,
      name: text(department.name_en || department.name),
    })),
    working_hours: hours(row.working_hours),
  };
}

export function publicPharmacy(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    slug: text(row.slug),
    name: text(row.name || row.name_en),
    logo: text(row.logo || row.image || row.photo),
    image: text(row.image || row.logo || row.photo),
    photo: text(row.photo || row.logo || row.image),
    city: text(row.city),
    is_verified: flag(row.is_verified),
    is_open_24h: flag(row.is_open_24h),
    offers_delivery: flag(row.offers_delivery),
    offers_pickup: flag(row.offers_pickup),
    rating: row.rating ?? null,
    review_count: row.review_count ?? row.reviews_count ?? null,
    working_hours: hours(row.working_hours),
  };
}

export function publicSlot(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    doctor_id: row.doctor_id ?? null,
    slot_date: row.slot_date || row.date || null,
    start_time: row.start_time || null,
    end_time: row.end_time || null,
    status: text(row.status),
    is_active: flag(row.is_active),
  };
}

const CALL_SECRET_KEYS = [
  "guest_token",
  "daily_guest_token",
  "daily_doctor_token",
  "daily_token",
  "call_token",
  "room_token",
];

/** Drop video and guest access tokens from a list or detail payload. */
export function stripCallSecrets(value) {
  if (Array.isArray(value)) return value.map(stripCallSecrets);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (CALL_SECRET_KEYS.includes(key)) continue;
    out[key] = key === "data" ? stripCallSecrets(item) : item;
  }
  return out;
}

const PRIVATE_NAMES = [
  "email", "user_email", "phone", "user_phone", "password", "medical_license",
  "medical_license_document", "licence_number", "license_number", "degree_document",
  "national_id", "national_id_document", "signature", "signature_image", "cv_document",
  "user", "user_id",
];

export function containsPrivateKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsPrivateKey);
  return Object.keys(value).some((key) => PRIVATE_NAMES.includes(key) || containsPrivateKey(value[key]));
}
