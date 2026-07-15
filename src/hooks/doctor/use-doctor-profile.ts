import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/doctor";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: number;
  specialization: string;
  doctor_degree: string;
  medical_license: string;
  designations?: string;                          // ← add
  consultation_type: "online" | "in_person" | "both";
  preferred_language: string;
  status: "approved" | "pending" | "rejected";
  is_available: boolean;
  slug: string;
  image: string | null;
  bio_en?: string;
  bio_fr?: string;                                // ← add
  bio_kiny?: string;                              // ← add
  consultation_fee?: string | number;             // ← add
  currency?: string;                              // ← add
  specialization_fee_id?: number | null;          // ← add
  signature?: string | null;
  signature_url?: string | null;
  years_of_experience?: number;                   // ← add
  specialization_fee?: {                          // ← add
    sub_specialization?: string;
    tier_name?: string;
    online_fee?: string | number;
    in_person_fee?: string | number;
    currency?: string;
  };
  /** Specialist sub-types the doctor saved under their sub-specialization.
   *  Field/name shape is read defensively (name / sub_type / sub_specialization). */
  sub_specializations?: Array<{
    id: number;
    name?: string;
    sub_type?: string;
    sub_specialization?: string;
  }>;
  educations: Education[];
  experiences: Experience[];
  qualifications: Qualification[];
  availabilities: Availability[];
  social_links: SocialLinks | null;
  hospitals: Hospital[];
  documents?: {
    degree_document?: { path: string | null; url: string | null };
    medical_license_document?: { path: string | null; url: string | null };
    national_id_document?: { path: string | null; url: string | null };
    signature?: { path: string | null; url: string | null };
  };
}

export interface Education {
  id: number;
  degree: string;
  institution: string;
  country: string;
  start_year: number;
  end_year: number | null;
}

export interface Experience {
  id: number;
  job_title: string;
  workplace: string;
  description?: string | null;
  country: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
}

export interface Qualification {
  id: number;
  title: string;
  issuing_body: string;
  issued_at: string;
  expires_at: string | null;
  certificate_url: string | null;
}

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
}

export interface Availability {
  id: number;
  day: string;
  start_time: string;
  end_time: string;
}

export interface Hospital {
  id: number;
  name: string;
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface UpsertProfilePayload {
  specialization?: string;
  doctor_degree?: string;
  medical_license?: string;
  bio_en?: string;
  consultation_type?: "online" | "in_person" | "both";
  preferred_language?: string;
  is_available?: boolean;
  consultation_fee?: number;
  currency?: string;
  bio_fr?: string;
  bio_kiny?: string;
  // Add these:
  specialization_fee_id?: number | null;
  sub_specialization?: string | null;   // "other" for a custom specialization
  sub_specializations?: { id: number }[]; // specialist sub-types: [{ id }, …]
  years_of_experience?: number;
}

export interface AddEducationPayload {
  degree: string;
  institution: string;
  country: string;
  start_year: number;
  end_year?: number | null;
}

export interface AddExperiencePayload {
  job_title: string;
  workplace: string;
  description?: string | null;
  country: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
}

export interface AddQualificationPayload {
  title: string;
  issuing_body: string;
  issued_at: string;
  expires_at?: string;
  certificate_file?: File;
}

// ─── 1. Profile ───────────────────────────────────────────────────────────────

/** GET /doctor/profile — returns the full profile including educations,
 *  experiences, qualifications and social_links nested inside. */
export function useGetDoctorProfile() {
  return useQuery<{ doctor: DoctorProfile }>({
    queryKey: ["doctor-profile"],
    queryFn: () => apiFetch(`${BASE}/profile`),
  });
}

export function useUpsertDoctorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertProfilePayload) =>
      apiFetch(`${BASE}/profile`, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-profile"] }),
  });
}

export function useUploadProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return apiFetch(`${BASE}/profile/image`, { method: "POST", body: form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-profile"] }),
  });
}

export function useUploadDoctorSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("signature", file);
      return apiFetch<{ message: string; signature: string }>(`${BASE}/profile/signature`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-profile"] }),
  });
}
// Section 5. Education ─────────────────────────────────────────────────────────────

/** GET /doctor/education — fetch saved education list independently.
 *  The profile query already includes this, so prefer useGetDoctorProfile()
 *  unless you need a focused refresh. */
export function useGetEducation() {
  return useQuery<{ educations: Education[] }>({
    queryKey: ["doctor-education"],
    queryFn: () => apiFetch(`${BASE}/education`),
  });
}

export function useAddEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddEducationPayload) =>
      // Payload: { degree, institution, country, start_year, end_year }
      apiFetch(`${BASE}/education`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-education"] });
    },
  });
}

export function useUpdateEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<AddEducationPayload> & { id: number }) =>
      apiFetch(`${BASE}/education/${id}`, { method: "PUT", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-education"] });
    },
  });
}

export function useDeleteEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/education/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-education"] });
    },
  });
}

// ─── 6. Experience ────────────────────────────────────────────────────────────

/** GET /doctor/experience — fetch saved experience list independently. */
export function useGetExperience() {
  return useQuery<{ experiences: Experience[] }>({
    queryKey: ["doctor-experience"],
    queryFn: () => apiFetch(`${BASE}/experience`),
  });
}

export function useAddExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddExperiencePayload) =>
      // Payload: { job_title, workplace, description, country, start_date, end_date, is_current }
      apiFetch(`${BASE}/experience`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-experience"] });
    },
  });
}

export function useUpdateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: Partial<AddExperiencePayload> & { id: number }) =>
      apiFetch(`${BASE}/experience/${id}`, { method: "PUT", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-experience"] });
    },
  });
}

export function useDeleteExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/experience/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-experience"] });
    },
  });
}

// ─── 7. Social Links ──────────────────────────────────────────────────────────

/** GET /doctor/social-links — fetch saved social links independently. */
export function useGetSocialLinks() {
  return useQuery<{ social_links: SocialLinks }>({
    queryKey: ["doctor-social-links"],
    queryFn: () => apiFetch(`${BASE}/social-links`),
  });
}

export function useSetSocialLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SocialLinks) =>
      // Payload: { facebook, twitter, linkedin, instagram }
      apiFetch(`${BASE}/social-links`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-social-links"] });
    },
  });
}

// ─── 8. Qualifications ────────────────────────────────────────────────────────

/** GET /doctor/qualifications — fetch saved qualifications independently. */
export function useGetQualifications() {
  return useQuery<{ qualifications: Qualification[] }>({
    queryKey: ["doctor-qualifications"],
    queryFn: () => apiFetch(`${BASE}/qualifications`),
  });
}

export function useAddQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      certificate_file,
      ...fields
    }: AddQualificationPayload) => {
      // Must be multipart/form-data because of the optional certificate_file.
      // Payload fields: title, issuing_body, issued_at, expires_at, certificate_file
      const form = new FormData();
      form.append("title", fields.title);
      form.append("issuing_body", fields.issuing_body);
      form.append("issued_at", fields.issued_at);
      if (fields.expires_at) form.append("expires_at", fields.expires_at);
      if (certificate_file) form.append("certificate_file", certificate_file);
      return apiFetch(`${BASE}/qualifications`, { method: "POST", body: form });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-qualifications"] });
    },
  });
}

export function useUpdateQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      certificate_file,
      ...fields
    }: Partial<AddQualificationPayload> & { id: number }) => {
      const form = new FormData();
      if (fields.title) form.append("title", fields.title);
      if (fields.issuing_body) form.append("issuing_body", fields.issuing_body);
      if (fields.issued_at) form.append("issued_at", fields.issued_at);
      if (fields.expires_at) form.append("expires_at", fields.expires_at);
      if (certificate_file) form.append("certificate_file", certificate_file);
      return apiFetch(`${BASE}/qualifications/${id}`, {
        method: "PUT",
        body: form,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-qualifications"] });
    },
  });
}

export function useDeleteQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/qualifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profile"] });
      qc.invalidateQueries({ queryKey: ["doctor-qualifications"] });
    },
  });
}

export function useUploadQualificationCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const form = new FormData();
      form.append("certificate_file", file);
      return apiFetch(`${BASE}/qualifications/${id}/certificate`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-qualifications"] }),
  });
}

export function useGetCertificateUrl(id: number) {
  return useQuery<{ url: string; expires_in: string }>({
    queryKey: ["certificate-url", id],
    queryFn: () => apiFetch(`${BASE}/qualifications/${id}/certificate/url`),
    enabled: !!id,
    staleTime: 25 * 60 * 1000,
  });
}


export type DoctorDocumentType =
  | "degree_document"
  | "medical_license_document"
  | "national_id_document";

export function useUploadDoctorDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, file }: { type: DoctorDocumentType; file: File }) => {
      const form = new FormData();
      form.append("type", type);
      form.append("document", file);
      return apiFetch(`${BASE}/profile/documents`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-profile"] }),
  });
}
