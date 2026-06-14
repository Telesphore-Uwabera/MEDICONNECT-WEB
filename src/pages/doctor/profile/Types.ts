// ─────────────────────────────────────────────────────────────────────────────
// Shared types for Doctor Profile step components
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonalInfo {
  specialization: string;
  doctor_degree: string;
  medical_license: string;
  designations: string;
  bio_en: string;
  bio_fr: string;
  bio_kiny: string;
  consultation_fee: number;
  currency: string;
  consultation_type: string;
  preferred_language: string;
}

export interface SpecializationsInfo {
  primary: string;                    // specialization name
  specialization_fee_id: number | null;
  years_of_experience: number;
  // Add these for display after save
  fee_name?: string;                  // e.g. "sub -test namw"
  tier_name?: string;                 // e.g. "senior"
  online_fee?: number;
  in_person_fee?: number;
  fee_currency?: string;
}

export interface EducationEntry {
  id: string;
  apiId?: number;
  degree: string;
  institution: string;
  country: string;
  start_year: number;
  end_year: number;
}

export interface ExperienceEntry {
  id: string;
  apiId?: number;
  job_title: string;
  workplace: string;
  country: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
}

export interface QualificationEntry {
  id: string;
  apiId?: number;
  title: string;
  issuing_body: string;
  issued_at: string;
  expires_at: string;
  certificate_file?: File | null;
}

export interface DocumentsInfo {
  profile_image?: File | null;
  degree_document?: File | null;
  license_document?: File | null;
  national_id_document?: File | null;
  existing?: {
    degree_document_url: string | null;
    medical_license_document_url: string | null;
    national_id_document_url: string | null;
  };
}

export interface SocialLinksInfo {
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
  website: string;
  youtube: string;
  researchgate: string;
  orcid: string;
}

export interface DoctorProfileData {
  personal: PersonalInfo;
  specializations: SpecializationsInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  qualifications: QualificationEntry[];
  documents: DocumentsInfo;
  linksSection: SocialLinksInfo;
}

export type StepSaveState = "idle" | "saving" | "saved" | "error" | "dirty";
export type StepSaveStates = Record<string, StepSaveState>;

// Mutation response shapes
export interface EducationMutationResponse {
  education?: { id?: number };
}
export interface ExperienceMutationResponse {
  experience?: { id?: number };
}
export interface QualificationMutationResponse {
  qualification?: { id?: number };
}
