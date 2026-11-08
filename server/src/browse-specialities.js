/** Keep in step with src/lib/browse-specialities.ts — the home-page speciality list. */
export const BROWSE_SPECIALITIES = [
  { key: "internal-medicine", label: "Internal medicine", feeId: 2 },
  { key: "pediatrics", label: "Pediatrics", feeId: 4 },
  { key: "gynecology-and-obstetrics", label: "Gynecology and obstetrics", feeId: 5 },
  { key: "general-surgery", label: "General Surgery", feeId: 3 },
  { key: "stomatology-dental-surgery", label: "Stomatology/dental surgery", alsoMatch: "Dental" },
  { key: "dermatology", label: "Dermatology", feeId: 12 },
  { key: "ophthalmology", label: "Ophthalmology", feeId: 10 },
  { key: "general-medicine-consultations", label: "General Medicine Consultations", feeId: 1 },
  { key: "sports-medicine", label: "Sports Medicine", feeId: 31 },
  { key: "orthopedics", label: "Orthopedics", feeId: 9 },
  { key: "mental-counseling", label: "Mental Counseling", alsoMatch: "Psychiatry", feeId: 7 },
];

function namesOf(body) {
  const raw = []
    .concat(body?.specialities || [])
    .concat(body?.speciality || [])
    .concat(body?.specialization ? String(body.specialization).split(",") : []);
  return raw.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
}

export function selectedBrowseSpecialities(body = {}) {
  const wanted = new Set(namesOf(body));
  const feeIds = []
    .concat(body.specialization_fee_ids || [])
    .concat(body.specialization_fee_id || [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  const chosen = BROWSE_SPECIALITIES.filter((item) => {
    const aliases = [item.label, item.key, item.alsoMatch].filter(Boolean).map((value) => value.toLowerCase());
    return (item.feeId && feeIds.includes(item.feeId)) || aliases.some((alias) => wanted.has(alias));
  });
  const seen = new Set();
  return chosen.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}
