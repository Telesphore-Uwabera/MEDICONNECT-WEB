// Admin — "manage users" role-specific create + profile endpoints.
// Base: /admin/manageusers
//
// Distinct from use-admin-users.ts (account-level list/suspend/delete/etc).
// This module covers: creating a user with a role, and reading/writing that
// role's profile (doctor/patient/pharmacy/hospital), plus their file uploads.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/manageusers";

export type ManagedRole = "doctor" | "patient" | "pharmacy" | "hospital";

const ROLE_PLURAL: Record<ManagedRole, string> = {
  doctor: "doctors",
  patient: "patients",
  pharmacy: "pharmacies",
  hospital: "hospitals",
};

const roleBase = (role: ManagedRole) => `${BASE}/${ROLE_PLURAL[role]}`;

/* ─────────────────────────────────────────────────────────────────────────
   Shared — create a user (any role)
   POST /admin/manageusers/{role}s/create-user
   201 the first time, 200 (upsert) if the same identity already exists.
───────────────────────────────────────────────────────────────────────── */

export interface CreateManagedUserPayload {
  name: string;
  phone: string;
  country_code: string;
  email: string;
  password: string;
  gender?: string;
  role: ManagedRole;
}

export interface CreateManagedUserResponse {
  message: string;
  role: ManagedRole;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export function useCreateManagedUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateManagedUserPayload) =>
      apiFetch<CreateManagedUserResponse>(`${roleBase(payload.role)}/create-user`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Doctor profile
───────────────────────────────────────────────────────────────────────── */

export interface SaveDoctorProfilePayload {
  specialization?: string;
  specialization_fee_id?: number;
  sub_specializations?: { id: number }[];
  doctor_degree?: string;
  medical_license?: string;
  designations?: string;
  bio_en?: string;
  bio_fr?: string;
  bio_kiny?: string;
  preferred_language?: string;
  seo_title?: string;
  seo_description?: string;
  is_available?: boolean;
  status?: string;
  other?: string;
}

export interface DoctorProfile {
  id: number;
  user_id: number;
  specialization?: string;
  consultation_fee?: number;
  consultation_type?: string;
  status?: string;
  is_active?: boolean;
  slug?: string;
  image?: string | null;
  documents?: {
    degree_document?: { path: string | null; url: string | null };
    medical_license_document?: { path: string | null; url: string | null };
    national_id_document?: { path: string | null; url: string | null };
    cv_document?: { path: string | null; url: string | null };
  };
  [key: string]: unknown;
}

export interface SaveDoctorProfileResponse {
  message: string;
  doctor: DoctorProfile;
}

export interface GetDoctorProfileResponse {
  doctor: DoctorProfile;
  sub_specializations: { id: number; name: string }[];
  specializations: { id: number; name: string }[];
}

export function useSaveDoctorProfile(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveDoctorProfilePayload) =>
      apiFetch<SaveDoctorProfileResponse>(`${roleBase("doctor")}/${userId}/save-profile`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-doctor-profile", userId] }),
  });
}

export function useGetDoctorProfile(userId: number | null) {
  return useQuery({
    queryKey: ["admin-manage-doctor-profile", userId],
    queryFn: () => apiFetch<GetDoctorProfileResponse>(`${roleBase("doctor")}/${userId}/get-profile`),
    enabled: userId != null,
  });
}

export interface UploadImageResponse {
  message: string;
  image: string;
}

export function useUploadDoctorImage(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return apiFetch<UploadImageResponse>(`${roleBase("doctor")}/${userId}/upload-image`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-doctor-profile", userId] }),
  });
}

export type DoctorDocumentType =
  | "degree_document"
  | "medical_license_document"
  | "national_id_document"
  | "cv_document";

export interface UploadDocumentResponse {
  message: string;
  type: DoctorDocumentType;
  url: string;
}

export function useUploadDoctorDocument(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, file }: { type: DoctorDocumentType; file: File }) => {
      const form = new FormData();
      form.append("type", type);
      form.append("document", file);
      return apiFetch<UploadDocumentResponse>(`${roleBase("doctor")}/${userId}/upload-document`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-doctor-profile", userId] }),
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Patient profile
───────────────────────────────────────────────────────────────────────── */

export interface SavePatientProfilePayload {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  address?: string;
  city?: string;
  province?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  preferred_language?: string;
}

export interface PatientProfile {
  id: number;
  user_id: number;
  gender?: string;
  blood_type?: string;
  country?: string;
  avatar?: string | null;
  insurance?: unknown;
  medicalInfo?: unknown;
  user?: { id: number; name: string; avatar?: string | null; preferred_language?: string };
  [key: string]: unknown;
}

export interface SavePatientProfileResponse {
  message: string;
  patient: PatientProfile;
}

export function useSavePatientProfile(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePatientProfilePayload) =>
      apiFetch<SavePatientProfileResponse>(`${roleBase("patient")}/${userId}/save-profile`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-patient-profile", userId] }),
  });
}

export function useGetPatientProfile(userId: number | null) {
  return useQuery({
    queryKey: ["admin-manage-patient-profile", userId],
    queryFn: () => apiFetch<{ patient: PatientProfile }>(`${roleBase("patient")}/${userId}/get-profile`),
    enabled: userId != null,
  });
}

export interface UploadAvatarResponse {
  message: string;
  avatar: string;
}

export function useUploadPatientAvatar(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      return apiFetch<UploadAvatarResponse>(`${roleBase("patient")}/${userId}/avatar`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-patient-profile", userId] }),
  });
}

export interface PatientMedicalInfo {
  id: number;
  patient_id: number;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  previous_surgeries?: string[];
  family_history?: string[];
  smoking_status?: string;
  alcohol_use?: string;
  notes?: string;
}

export interface GetPatientMedicalResponse {
  medical_info: PatientMedicalInfo | null;
  patient: {
    id: number;
    full_name: string;
    email: string;
    blood_type?: string;
    insurance?: unknown;
  };
}

export function useGetPatientMedicalInfo(userId: number | null) {
  return useQuery({
    queryKey: ["admin-manage-patient-medical", userId],
    queryFn: () => apiFetch<GetPatientMedicalResponse>(`${roleBase("patient")}/${userId}/medical`),
    enabled: userId != null,
  });
}

export interface SavePatientMedicalPayload {
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  previous_surgeries?: string[];
  family_history?: string[];
  smoking_status?: string;
  alcohol_use?: string;
  notes?: string;
}

export interface SavePatientMedicalResponse {
  message: string;
  medical_info: PatientMedicalInfo;
}

export function useSavePatientMedicalInfo(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePatientMedicalPayload) =>
      apiFetch<SavePatientMedicalResponse>(`${roleBase("patient")}/${userId}/medical`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-patient-medical", userId] }),
  });
}

export interface PatientInsurance {
  id: number;
  name: string;
  code: string;
  coverage_percentage: number;
}

export function useGetPatientInsurance(userId: number | null) {
  return useQuery({
    queryKey: ["admin-manage-patient-insurance", userId],
    queryFn: () =>
      apiFetch<{ insurance: PatientInsurance } | { message: string }>(
        `${roleBase("patient")}/${userId}/insurance`,
      ),
    enabled: userId != null,
    retry: false,
  });
}

export interface UpdatePatientInsurancePayload {
  insurance_id: number;
  insurance_number: string;
}

export interface UpdatePatientInsuranceResponse {
  message: string;
  insurance: PatientInsurance;
}

export function useUpdatePatientInsurance(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePatientInsurancePayload) =>
      apiFetch<UpdatePatientInsuranceResponse>(`${roleBase("patient")}/${userId}/insurance`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-patient-insurance", userId] }),
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Pharmacy profile
───────────────────────────────────────────────────────────────────────── */

export interface SavePharmacyProfilePayload {
  name_en?: string;
  name_fr?: string;
  description_en?: string;
  registration_number?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  opens_at?: string;
  closes_at?: string;
  is_open_24h?: boolean;
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  delivery_fee?: number;
  delivery_currency?: string;
  delivery_radius_km?: number;
  estimated_delivery_minutes?: number;
  status?: string;
}

export interface PharmacyProfile {
  id: number;
  user_id: number;
  name_en?: string;
  slug?: string;
  status?: string;
  is_active?: boolean;
  logo?: string | null;
  image?: string | null;
  workingHours?: unknown[];
  images?: unknown[];
  socialLinks?: unknown;
  [key: string]: unknown;
}

export interface SavePharmacyProfileResponse {
  message: string;
  pharmacy: PharmacyProfile;
}

export function useSavePharmacyProfile(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePharmacyProfilePayload) =>
      apiFetch<SavePharmacyProfileResponse>(`${roleBase("pharmacy")}/${userId}/save-profile`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-pharmacy-profile", userId] }),
  });
}

export function useGetPharmacyProfile(userId: number | null) {
  return useQuery({
    queryKey: ["admin-manage-pharmacy-profile", userId],
    queryFn: () =>
      apiFetch<{ pharmacy: PharmacyProfile }>(`${roleBase("pharmacy")}/${userId}/get-profile`),
    enabled: userId != null,
  });
}

export function useUploadPharmacyLogo(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("logo", file);
      return apiFetch<{ message: string; logo: string }>(`${roleBase("pharmacy")}/${userId}/logo`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-pharmacy-profile", userId] }),
  });
}

export function useUploadPharmacyImage(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return apiFetch<{ message: string; image: string }>(`${roleBase("pharmacy")}/${userId}/image`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-pharmacy-profile", userId] }),
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Hospital profile
───────────────────────────────────────────────────────────────────────── */

export interface SaveHospitalProfilePayload {
  name_en?: string;
  name_fr?: string;
  description_en?: string;
  type?: string;
  registration_number?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  email?: string;
  website?: string;
  opens_at?: string;
  closes_at?: string;
  is_open_24h?: boolean;
  seo_title?: string;
  seo_description?: string;
  status?: string;
}

export interface HospitalProfile {
  id: number;
  user_id: number;
  name_en?: string;
  type?: string;
  status?: string;
  is_active?: boolean;
  logo?: string | null;
  image?: string | null;
  departments?: unknown[];
  services?: unknown[];
  workingDays?: unknown[];
  doctors?: unknown[];
  [key: string]: unknown;
}

export interface SaveHospitalProfileResponse {
  message: string;
  hospital: HospitalProfile;
}

export function useSaveHospitalProfile(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveHospitalProfilePayload) =>
      apiFetch<SaveHospitalProfileResponse>(`${roleBase("hospital")}/${userId}/save-profile`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-hospital-profile", userId] }),
  });
}

export function useGetHospitalProfile(userId: number | null) {
  return useQuery({
    queryKey: ["admin-manage-hospital-profile", userId],
    queryFn: () =>
      apiFetch<{ hospital: HospitalProfile }>(`${roleBase("hospital")}/${userId}/get-profile`),
    enabled: userId != null,
  });
}

export function useUploadHospitalLogo(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("logo", file);
      return apiFetch<{ message: string; logo: string }>(`${roleBase("hospital")}/${userId}/logo`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-hospital-profile", userId] }),
  });
}

export function useUploadHospitalImage(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return apiFetch<{ message: string; image: string }>(`${roleBase("hospital")}/${userId}/image`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-hospital-profile", userId] }),
  });
}

export interface HospitalGalleryImage {
  id: number;
  url: string;
  caption?: string;
}

export interface UploadHospitalGalleryResponse {
  message: string;
  images: HospitalGalleryImage[];
}

export function useUploadHospitalGallery(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { file: File; caption?: string }[]) => {
      const form = new FormData();
      items.forEach((item, i) => {
        form.append(`images[${i}]`, item.file);
        if (item.caption) form.append(`captions[${i}]`, item.caption);
      });
      return apiFetch<UploadHospitalGalleryResponse>(`${roleBase("hospital")}/${userId}/gallery`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-manage-hospital-profile", userId] }),
  });
}
