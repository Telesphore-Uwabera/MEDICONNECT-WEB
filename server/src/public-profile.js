/** Fields a signed-out visitor may see for a doctor, hospital, or pharmacy. */

function text(value) {
  if (value == null || value === "") return null;
  return value;
}

function flag(value) {
  if (value == null || value === "") return null;
  return Boolean(Number(value));
}

function namedItems(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((item) => {
      if (typeof item === "string") return { id: null, name: text(item) };
      return { id: item?.id ?? null, name: text(item?.name || item?.name_en || item?.sub_specialization) };
    })
    .filter((item) => item.name);
}

function publicEducation(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => ({
      id: item?.id ?? null,
      title: text(item?.title || item?.degree || item?.name),
      institution: text(item?.institution || item?.school),
      year: item?.year ?? item?.end_year ?? null,
    })).filter((item) => item.title || item.institution);
  }
  if (typeof value === "object") {
    return text(value.title || value.degree || value.name || value.institution);
  }
  return null;
}

export function publicDoctor(row) {
  if (!row) return null;
  const photo = text(row.image || row.photo || row.avatar || row.user_avatar || row.user?.avatar);
  const name = text(row.display_name || row.name || row.user_name || row.name_en || row.user?.name);
  const hospitals = (Array.isArray(row.hospitals) ? row.hospitals : [])
    .map((hospital) => ({
      id: hospital?.id ?? null,
      name: text(hospital?.name || hospital?.name_en),
      city: text(hospital?.city),
    }))
    .filter((hospital) => hospital.id || hospital.name || hospital.city);
  const reviews = row.reviews_count ?? row.review_count ?? null;
  return {
    id: row.id ?? null,
    slug: text(row.slug),
    name,
    display_name: name,
    user: { name, avatar: photo },
    photo,
    avatar: photo,
    image: photo,
    specialization: text(row.specialization),
    specialization_id: row.specialization_id ?? null,
    specialization_fee_id: row.specialization_fee_id ?? null,
    experience_years: row.experience_years ?? row.years_of_experience ?? null,
    languages: text(row.languages || row.preferred_language),
    preferred_language: text(row.preferred_language),
    bio: text(row.bio || row.bio_en),
    bio_en: text(row.bio_en),
    bio_fr: text(row.bio_fr),
    bio_kiny: text(row.bio_kiny),
    doctor_degree: text(row.doctor_degree),
    designations: text(row.designations),
    education: publicEducation(row.education),
    consultation_fee: row.consultation_fee ?? null,
    currency: text(row.currency),
    specialization_fee: row.specialization_fee ?? row.online_fee ?? null,
    rating: row.rating ?? row.rating_avg ?? row.average_rating ?? null,
    rating_avg: row.rating_avg ?? row.rating ?? row.average_rating ?? null,
    review_count: reviews,
    reviews_count: reviews,
    specializations: namedItems(row.specializations),
    sub_specializations: namedItems(row.sub_specializations),
    instant_consultation: flag(row.instant_consultation),
    is_available: flag(row.is_available),
    bookings_paused: flag(row.bookings_paused),
    consultation_type: text(row.consultation_type),
    is_verified: Boolean(flag(row.is_verified) || row.verified_at),
    verified_at: row.verified_at ? String(row.verified_at) : null,
    is_featured: flag(row.is_featured),
    show_homepage: flag(row.show_homepage),
    city: text(row.city),
    hospital_name: text(row.hospital_name || hospitals[0]?.name),
    hospitals,
  };
}

function hours(rows) {
  return (Array.isArray(rows) ? rows : []).map((hour) => ({
    day: hour.day || hour.day_of_week || null,
    day_of_week: hour.day_of_week || hour.day || null,
    open_time: hour.open_time || null,
    close_time: hour.close_time || null,
    is_closed: Boolean(hour.is_closed),
    is_active: hour.is_active == null ? null : Boolean(hour.is_active),
  }));
}

function publicInsurances(rows) {
  return (Array.isArray(rows) ? rows : []).map((item) => ({
    id: item?.id ?? null,
    name: text(item?.name || item?.name_en),
    code: text(item?.code),
    logo: text(item?.logo),
  })).filter((item) => item.id || item.name);
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
    address: text(row.address),
    phone: text(row.phone),
    email: text(row.email),
    province: text(row.province),
    country: text(row.country),
    latitude: text(row.latitude),
    longitude: text(row.longitude),
    is_open_24h: flag(row.is_open_24h),
    departments: (Array.isArray(row.departments) ? row.departments : []).map((department) => ({
      id: department.id ?? null,
      name: text(department.name_en || department.name),
      name_en: text(department.name_en || department.name),
      icon: text(department.icon),
    })),
    insurances: publicInsurances(row.insurances || row.accepted_insurances),
    accepted_insurances: publicInsurances(row.insurances || row.accepted_insurances),
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
    address: text(row.address),
    city: text(row.city),
    province: text(row.province),
    phone: text(row.phone),
    email: text(row.email),
    latitude: text(row.latitude),
    longitude: text(row.longitude),
    distance_km: row.distance_km ?? null,
    delivery_fee: row.delivery_fee ?? null,
    delivery_currency: text(row.delivery_currency),
    estimated_delivery_minutes: row.estimated_delivery_minutes ?? null,
    is_verified: flag(row.is_verified),
    is_open_24h: flag(row.is_open_24h),
    offers_delivery: flag(row.offers_delivery),
    offers_pickup: flag(row.offers_pickup),
    rating: row.rating ?? null,
    review_count: row.review_count ?? row.reviews_count ?? null,
    reviews_count: row.reviews_count ?? row.review_count ?? null,
    insurances: publicInsurances(row.insurances || row.accepted_insurances),
    accepted_insurances: publicInsurances(row.insurances || row.accepted_insurances),
    social_links: publicLinks(row.social_links),
    working_hours: hours(row.working_hours),
  };
}

function publicLinks(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {};
  for (const key of ["facebook", "twitter", "instagram", "website", "linkedin"]) {
    if (value[key]) out[key] = text(value[key]);
  }
  return Object.keys(out).length ? out : null;
}

const SLOT_FIELDS = [
  "id", "doctor_id", "hospital_id", "slot_date", "date", "start_time", "end_time",
  "status", "is_active", "type", "consultation_type", "duration_minutes", "duration",
  "slot_duration_minutes", "buffer_minutes", "booked_by_me", "day_of_week", "days_of_week",
  "from_date", "to_date", "start_date", "end_date", "label", "source",
];

export function publicSlot(row) {
  if (!row) return null;
  const out = {};
  for (const key of SLOT_FIELDS) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  out.slot_date = out.slot_date || out.date || null;
  out.start_time = out.start_time || null;
  out.end_time = out.end_time || null;
  out.status = text(out.status);
  if (out.is_active !== undefined) out.is_active = flag(out.is_active);
  if (out.duration_minutes == null && out.slot_duration_minutes != null) out.duration_minutes = out.slot_duration_minutes;
  if (!out.type && out.consultation_type) out.type = out.consultation_type;
  if (row.hospital && typeof row.hospital === "object") {
    out.hospital = {
      id: row.hospital.id ?? null,
      name: text(row.hospital.name || row.hospital.name_en),
    };
  }
  return out;
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

const CALL_SECRET_TABLES = new Set([
  "instant_consultation_requests",
  "instant_consultations",
  "appointments",
]);

/** List and detail reads hide call tokens. The join route is the one place that returns them. */
export function presentWithoutCallSecrets(scope, table, payload) {
  if (scope === "admin" || !CALL_SECRET_TABLES.has(table)) return payload;
  return stripCallSecrets(payload);
}

const PRIVATE_NAMES = [
  "password", "medical_license", "medical_license_document", "licence_number", "license_number",
  "degree_document", "national_id", "national_id_document", "signature", "signature_image",
  "cv_document", "user_id", "user_email", "registration_number",
  ...CALL_SECRET_KEYS,
];

export function containsPrivateKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsPrivateKey);
  return Object.keys(value).some((key) => PRIVATE_NAMES.includes(key) || containsPrivateKey(value[key]));
}
