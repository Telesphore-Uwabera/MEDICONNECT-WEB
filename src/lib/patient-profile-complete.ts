/** Matches the guest address the API mints. A typed @mediconnect.local address is not exempt. */
export function isServerGuestAccount(email: string | null | undefined) {
  return /^guest-\d+@mediconnect\.local$/i.test(String(email || "").trim());
}

/** Fields the patient profile form treats as required before the account can be used. */
export const REQUIRED_PROFILE_FIELDS = [
  "date_of_birth",
  "gender",
  "national_id",
  "blood_type",
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
