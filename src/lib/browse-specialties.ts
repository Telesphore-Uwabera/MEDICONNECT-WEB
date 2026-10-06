export interface BrowseSpecialty {
  key: string;
  label: string;
  subSpecializationName?: string;
  specializationName?: string;
  alsoMatch?: string;
  feeId?: number;
  slug: string;
}

/** Same specialties shown under “Browse by specialty” on the public site. */
export const BROWSE_SPECIALTIES: BrowseSpecialty[] = [
  {
    key: "internal-medicine",
    label: "Internal medicine",
    subSpecializationName: "Internal Medicine",
    feeId: 2,
    slug: "internal-medicine-standard",
  },
  {
    key: "pediatrics",
    label: "Pediatrics",
    subSpecializationName: "Pediatrics",
    feeId: 4,
    slug: "pediatrics-standard",
  },
  {
    key: "gynecology-and-obstetrics",
    label: "Gynecology and obstetrics",
    subSpecializationName: "Obstetrics & Gynecology",
    feeId: 5,
    slug: "obstetrics-gynecology-standard",
  },
  {
    key: "general-surgery",
    label: "General Surgery",
    subSpecializationName: "Surgery",
    feeId: 3,
    slug: "surgery-standard",
  },
  {
    key: "stomatology-dental-surgery",
    label: "Stomatology/dental surgery",
    subSpecializationName: "Stomatology/dental surgery",
    alsoMatch: "Dental",
    slug: "stomatology-dental-surgery",
  },
  {
    key: "dermatology",
    label: "Dermatology",
    subSpecializationName: "Dermatology",
    feeId: 12,
    slug: "dermatology-standard",
  },
  {
    key: "ophthalmology",
    label: "Ophthalmology",
    subSpecializationName: "Ophthalmology",
    feeId: 10,
    slug: "ophthalmology-standard",
  },
  {
    key: "general-medicine-consultations",
    label: "General Medicine Consultations",
    specializationName: "General Practitioner",
    feeId: 1,
    slug: "general-practitioner-standard",
  },
  {
    key: "orthopedics",
    label: "Orthopedics",
    subSpecializationName: "Orthopedics",
    feeId: 9,
    slug: "orthopedics-standard",
  },
  {
    key: "mental-counseling",
    label: "Mental Counseling",
    subSpecializationName: "Mental Counseling",
    alsoMatch: "Psychiatry",
    feeId: 7,
    slug: "mental-counseling",
  },
];

export function browseSpecialtyValue(item: BrowseSpecialty) {
  return item.feeId != null ? `fee:${item.feeId}` : `key:${item.key}`;
}

export function findBrowseSpecialty(value: string) {
  return BROWSE_SPECIALTIES.find((item) => browseSpecialtyValue(item) === value) ?? null;
}

export function matchBrowseSpecialty(input: {
  specialization_fee_id?: number | null;
  primary?: string | null;
  sub_specialization?: string | null;
}) {
  if (input.specialization_fee_id) {
    const byFee = BROWSE_SPECIALTIES.find((item) => item.feeId === input.specialization_fee_id);
    if (byFee) return byFee;
  }
  const name = (input.primary || input.sub_specialization || "").trim().toLowerCase();
  if (!name) return null;
  return BROWSE_SPECIALTIES.find((item) => {
    const candidates = [item.label, item.subSpecializationName, item.specializationName, item.alsoMatch]
      .filter(Boolean)
      .map((entry) => String(entry).trim().toLowerCase());
    return candidates.includes(name);
  }) ?? null;
}
