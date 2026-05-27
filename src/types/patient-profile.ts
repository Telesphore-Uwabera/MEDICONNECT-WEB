export interface PatientUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  country_code: string;
  avatar: string | null;
  preferred_language: string;
}

export interface Insurance {
  id: number;
  name: string;
  code: string;
  logo: string | null;
  type?: string;
  coverage_percentage: string;
  insurance_number?: string;
}

export interface MedicalInfo {
  id?: number;
  patient_id?: number;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
  previous_surgeries: string[];
  family_history: string[];
  smoking_status: string;
  alcohol_use: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientProfile {
  id: number;
  user: PatientUser;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  address: string;
  city: string;
  province: string;
  country: string;
  insurance: Insurance | null;
  medical_info: MedicalInfo | null;
}

export interface FullPatientProfile {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  country_code: string;
  avatar: string | null;
  preferred_language: string;
  date_of_birth: string;
  age: number;
  gender: string;
  national_id: string;
  blood_type: string;
  address: string;
  city: string;
  province: string;
  country: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  insurance_number: string | null;
  insurance: Insurance | null;
}

// ── Payloads ──────────────────────────────────────────
export interface UpdateProfilePayload {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  national_id?: string;
  blood_type?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  preferred_language?: string;
}

export interface UpdateMedicalPayload {
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  previous_surgeries?: string[];
  family_history?: string[];
  smoking_status?: string;
  alcohol_use?: string;
  notes?: string;
}

export interface UpdateInsurancePayload {
  insurance_id: number;
  insurance_number: string;
}
