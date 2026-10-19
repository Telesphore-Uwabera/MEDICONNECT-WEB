import type { CareOrderType } from "@/hooks/doctor/use-care-orders";

export const CLINICAL_CATALOG: Record<CareOrderType, { label: string; items: string[]; needsFacility?: boolean; needsPharmacy?: boolean }> = {
  lab: {
    label: "Laboratory tests",
    needsFacility: true,
    items: [
      "Full blood count (FBC)",
      "Malaria RDT / smear",
      "Blood glucose",
      "HIV test",
      "Hepatitis B",
      "Urinalysis",
      "Stool analysis",
      "Liver function tests",
      "Kidney function tests",
      "Lipid profile",
      "CRP / ESR",
      "Pregnancy test",
      "Blood grouping / rhesus",
      "Other lab test",
    ],
  },
  imaging: {
    label: "Imaging & ECG",
    needsFacility: true,
    items: [
      "Chest X-ray",
      "Limb / bone X-ray",
      "Abdominal ultrasound",
      "Obstetric ultrasound",
      "ECG",
      "Echocardiogram",
      "CT scan",
      "MRI",
      "Other imaging",
    ],
  },
  procedure: {
    label: "Procedures",
    needsFacility: true,
    items: [
      "Wound dressing",
      "Suturing",
      "Incision and drainage",
      "Injection / IV medication",
      "Catheterisation",
      "Minor surgery",
      "Other procedure",
    ],
  },
  nursing: {
    label: "Nursing care",
    needsFacility: true,
    items: ["Vital signs monitoring", "Wound care", "Injections", "Observation", "Other nursing care"],
  },
  admission: {
    label: "Admission / observation",
    needsFacility: true,
    items: ["Day observation", "Inpatient admission", "Emergency unit", "Maternity admission"],
  },
  follow_up: {
    label: "Follow-up",
    items: ["Online follow-up", "In-person review in 3 days", "In-person review in 7 days", "In-person review in 14 days", "As needed"],
  },
  rehab: {
    label: "Physiotherapy / rehab",
    needsFacility: true,
    items: ["Physiotherapy", "Occupational therapy", "Speech therapy", "Other rehab"],
  },
  vaccination: {
    label: "Vaccination",
    needsFacility: true,
    items: ["Routine immunisation", "Tetanus", "Hepatitis B", "COVID / influenza", "Other vaccine"],
  },
  home_care: {
    label: "Home / community care",
    items: ["Home visit", "Community health follow-up", "Palliative support"],
  },
  pharmacy_packet: {
    label: "Pharmacy medicine packet",
    needsPharmacy: true,
    items: [
      "Dispense prescribed medicines",
      "Counsel on side effects",
      "Check allergies before dispensing",
      "Review current medicines for interactions",
      "Home delivery if available",
    ],
  },
  facility_packet: {
    label: "Clinic / hospital packet",
    needsFacility: true,
    items: ["Share consult summary", "Share allergies and current medicines", "Share requested investigations"],
  },
};

export const HOSPITAL_PROTOCOL = [
  "Confirm patient identity against the MediConnect patient ID",
  "Read the doctor’s message and what the patient reported in the consult",
  "Complete only the tests or procedures listed on this packet",
  "Record results on this same packet and send them back to the referring doctor",
  "Do not send the patient to a pharmacy until the referring doctor reviews the results",
];

export const PHARMACY_PROTOCOL = [
  "Confirm patient identity against the MediConnect patient ID",
  "Check allergies and current medicines before dispensing",
  "Dispense only what the doctor wrote on this packet / prescription",
  "Counsel on dose, duration and side effects",
  "Mark the packet as dispensed in MediConnect when complete",
];
