export interface BrowseSpeciality {
  key: string;
  label: string;
  subSpecialityName?: string;
  specialityName?: string;
  alsoMatch?: string;
  feeId?: number;
  slug: string;
}

/** Same specialities shown under “Browse by speciality” on the public site. */
export const BROWSE_SPECIALITIES: BrowseSpeciality[] = [
  {
    key: "internal-medicine",
    label: "Internal medicine",
    subSpecialityName: "Internal Medicine",
    feeId: 2,
    slug: "internal-medicine-standard",
  },
  {
    key: "pediatrics",
    label: "Pediatrics",
    subSpecialityName: "Pediatrics",
    feeId: 4,
    slug: "pediatrics-standard",
  },
  {
    key: "gynecology-and-obstetrics",
    label: "Gynecology and obstetrics",
    subSpecialityName: "Obstetrics & Gynecology",
    feeId: 5,
    slug: "obstetrics-gynecology-standard",
  },
  {
    key: "general-surgery",
    label: "General Surgery",
    subSpecialityName: "Surgery",
    feeId: 3,
    slug: "surgery-standard",
  },
  {
    key: "stomatology-dental-surgery",
    label: "Stomatology/dental surgery",
    subSpecialityName: "Stomatology/dental surgery",
    alsoMatch: "Dental",
    slug: "stomatology-dental-surgery",
  },
  {
    key: "dermatology",
    label: "Dermatology",
    subSpecialityName: "Dermatology",
    feeId: 12,
    slug: "dermatology-standard",
  },
  {
    key: "ophthalmology",
    label: "Ophthalmology",
    subSpecialityName: "Ophthalmology",
    feeId: 10,
    slug: "ophthalmology-standard",
  },
  {
    key: "general-medicine-consultations",
    label: "General Medicine Consultations",
    specialityName: "General Practitioner",
    feeId: 1,
    slug: "general-practitioner-standard",
  },
  {
    key: "sports-medicine",
    label: "Sports Medicine",
    subSpecialityName: "Sports Medicine",
    feeId: 31,
    slug: "sports-medicine-standard",
  },
  {
    key: "orthopedics",
    label: "Orthopedics",
    subSpecialityName: "Orthopedics",
    feeId: 9,
    slug: "orthopedics-standard",
  },
  {
    key: "mental-counseling",
    label: "Mental Counseling",
    subSpecialityName: "Mental Counseling",
    alsoMatch: "Psychiatry",
    feeId: 7,
    slug: "mental-counseling",
  },
];

export function browseSpecialityValue(item: BrowseSpeciality) {
  return item.feeId != null ? `fee:${item.feeId}` : `key:${item.key}`;
}

export function findBrowseSpeciality(value: string) {
  return BROWSE_SPECIALITIES.find((item) => browseSpecialityValue(item) === value) ?? null;
}

export function browseValueForLabel(label: string) {
  const name = label.trim().toLowerCase();
  const match = BROWSE_SPECIALITIES.find((item) => {
    const names = [item.label, item.subSpecialityName, item.specialityName, item.alsoMatch]
      .filter(Boolean)
      .map((entry) => String(entry).trim().toLowerCase());
    return names.includes(name);
  });
  return match ? browseSpecialityValue(match) : null;
}

export function landingSpecialityLabels(input: {
  specialization?: string | { name?: string | null; name_en?: string | null } | null;
  specialization_fee_id?: number | null;
  specialization_fee_ids?: Array<number | null> | null;
  sub_specializations?: Array<{ name?: string | null; sub_type?: string | null; sub_specialization?: string | null }>;
}) {
  const rawParts: string[] = [];
  const specialization = input.specialization;
  if (specialization && typeof specialization === "object") {
    rawParts.push(String(specialization.name_en || specialization.name || ""));
  } else if (specialization) {
    rawParts.push(String(specialization));
  }
  for (const item of input.sub_specializations || []) {
    rawParts.push(String(item.name || item.sub_type || item.sub_specialization || ""));
  }
  const labels: string[] = [];
  const add = (value?: string | null) => {
    const text = String(value || "").trim();
    if (!text || labels.some((item) => item.toLowerCase() === text.toLowerCase())) return;
    labels.push(text);
  };
  for (const part of rawParts.flatMap((value) => value.split(","))) {
    const match = matchBrowseSpeciality({ primary: part, sub_specialization: part });
    add(match?.label || part);
  }
  for (const feeId of [input.specialization_fee_id, ...(input.specialization_fee_ids || [])]) {
    const match = BROWSE_SPECIALITIES.find((item) => item.feeId === Number(feeId));
    if (match) add(match.label);
  }
  return labels.filter(Boolean);
}

export function matchBrowseSpeciality(input: {
  specialization_fee_id?: number | null;
  primary?: string | null;
  sub_specialization?: string | null;
}) {
  if (input.specialization_fee_id) {
    const byFee = BROWSE_SPECIALITIES.find((item) => item.feeId === input.specialization_fee_id);
    if (byFee) return byFee;
  }
  const name = (input.primary || input.sub_specialization || "").trim().toLowerCase();
  if (!name) return null;
  return BROWSE_SPECIALITIES.find((item) => {
    const candidates = [item.label, item.subSpecialityName, item.specialityName, item.alsoMatch]
      .filter(Boolean)
      .map((entry) => String(entry).trim().toLowerCase());
    return candidates.includes(name);
  }) ?? null;
}
