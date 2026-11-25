/** Matches the guest address the API mints. A typed @mediconnect.local address is not exempt. */
export function isServerGuestAccount(email: string | null | undefined) {
  return /^guest-\d+@mediconnect\.local$/i.test(String(email || "").trim());
}

const APPOINTMENT_PROFILE_FLAG = "appointment_profile_required";

/** Set after a guest books and pays for a scheduled appointment. */
export function requireAppointmentProfile() {
  try { localStorage.setItem(APPOINTMENT_PROFILE_FLAG, "1"); } catch { /* ignore */ }
}

export function clearAppointmentProfileRequirement() {
  try { localStorage.removeItem(APPOINTMENT_PROFILE_FLAG); } catch { /* ignore */ }
}

export function appointmentProfileRequired() {
  try { return localStorage.getItem(APPOINTMENT_PROFILE_FLAG) === "1"; } catch { return false; }
}

/** Fields the patient profile form treats as required before the account can be used. */
export const REQUIRED_PROFILE_FIELDS = [
  "date_of_birth",
  "gender",
  "national_id",
  "address",
  "city",
  "province",
  "country",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_phone",
] as const;

function filled(value: unknown, field: string) {
  const text = String(value ?? "").trim();
  if (!text || text.startsWith("0000-00-00")) return false;
  if (field === "date_of_birth") return !Number.isNaN(new Date(text).getTime());
  return true;
}

export function isPatientRecordComplete(profile: object | null | undefined) {
  if (!profile) return false;
  const record = profile as Record<string, unknown>;
  return REQUIRED_PROFILE_FIELDS.every((field) => filled(record[field], field));
}
