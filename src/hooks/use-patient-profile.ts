import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";
import type {
  PatientProfile,
  MedicalInfo,
  Insurance,
  UpdateProfilePayload,
  UpdateMedicalPayload,
  UpdateInsurancePayload,
} from "@/types/patient-profile";

const BASE = "/patient/profile";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface ProfileResponse {
  patient: PatientProfile;
}

interface UpsertProfileResponse {
  message: string;
  patient: PatientProfile;
}

interface AvatarResponse {
  message: string;
  avatar: string;
}

interface MedicalInfoResponse {
  medical_info: MedicalInfo;
  patient: PatientProfile; // ← was FullPatientProfile; API actually returns PatientProfile (with nested user)
}

interface SaveMedicalInfoResponse {
  message: string;
  medical_info: MedicalInfo;
}

interface InsuranceResponse {
  insurance: Insurance;
}

interface UpdateInsuranceResponse {
  message: string;
  insurance: Insurance;
}

/* ─────────────────────────────────────────────
   useGetProfile  →  GET /patient/profile
───────────────────────────────────────────── */

export function useGetProfile() {
  return useQuery({
    queryKey: ["patient-profile"],
    queryFn: () =>
      apiFetch<ProfileResponse>(BASE).then((r) => r.patient),
  });
}

/* ─────────────────────────────────────────────
   useUpsertProfile  →  POST /patient/profile
───────────────────────────────────────────── */

export function useUpsertProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      apiFetch<UpsertProfileResponse>(BASE, {
        method: "POST",
        body: payload,
      }).then((r) => r.patient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });
}

/* ─────────────────────────────────────────────
   useUploadAvatar  →  POST /patient/profile/avatar
───────────────────────────────────────────── */

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      return apiFetch<AvatarResponse>(`${BASE}/avatar`, {
        method: "POST",
        body: form,
      }).then((r) => r.avatar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });
}

/* ─────────────────────────────────────────────
   useGetMedicalInfo  →  GET /patient/profile/medical
───────────────────────────────────────────── */

export function useGetMedicalInfo() {
  return useQuery({
    queryKey: ["patient-medical-info"],
    queryFn: () =>
      apiFetch<MedicalInfoResponse>(`${BASE}/medical`),
  });
}

/* ─────────────────────────────────────────────
   useSaveMedicalInfo  →  POST /patient/profile/medical
───────────────────────────────────────────── */

export function useSaveMedicalInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMedicalPayload) =>
      apiFetch<SaveMedicalInfoResponse>(`${BASE}/medical`, {
        method: "POST",
        body: payload,
      }).then((r) => r.medical_info),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-medical-info"] });
    },
  });
}

/* ─────────────────────────────────────────────
   useGetInsurance  →  GET /patient/profile/insurance
───────────────────────────────────────────── */

export function useGetInsurance() {
  return useQuery({
    queryKey: ["patient-insurance"],
    queryFn: () =>
      apiFetch<InsuranceResponse>(`${BASE}/insurance`).then((r) => r.insurance),
  });
}

/* ─────────────────────────────────────────────
   useUpdateInsurance  →  POST /patient/profile/insurance
───────────────────────────────────────────── */

export function useUpdateInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInsurancePayload) =>
      apiFetch<UpdateInsuranceResponse>(`${BASE}/insurance`, {
        method: "POST",
        body: payload,
      }).then((r) => r.insurance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-insurance"] });
    },
  });
}
