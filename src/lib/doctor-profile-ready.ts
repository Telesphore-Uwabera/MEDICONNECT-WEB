export function profileText(value?: string | null) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function doctorProfileReady(doctor?: {
  doctor_degree?: string | null;
  medical_license?: string | null;
  bio_en?: string | null;
  bio_fr?: string | null;
  bio_kiny?: string | null;
} | null) {
  if (!doctor) return false;
  return Boolean(
    profileText(doctor.doctor_degree) &&
    profileText(doctor.medical_license) &&
    profileText(doctor.bio_en) &&
    profileText(doctor.bio_fr) &&
    profileText(doctor.bio_kiny),
  );
}

export function doctorIsApproved(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return true;
  return value === "active" || value === "approved" || value === "verified";
}
