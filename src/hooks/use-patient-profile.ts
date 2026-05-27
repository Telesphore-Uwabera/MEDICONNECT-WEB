// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { patientProfileService } from "@/services/patient-profile.service";
// import type {
//   UpdateProfilePayload,
//   UpdateMedicalPayload,
//   UpdateInsurancePayload,
// } from "@/types/patient-profile";

// const KEYS = {
//   profile: ["patient", "profile"],
//   medical: ["patient", "profile", "medical"],
//   insurance: ["patient", "profile", "insurance"],
// };

// // ── Get profile ───────────────────────────────────────
// export const usePatientProfile = () =>
//   useQuery({
//     queryKey: KEYS.profile,
//     queryFn: patientProfileService.getProfile,
//     retry: (count, err: any) => {
//       // don't retry on 404 (profile not created yet)
//       if (err?.response?.status === 404) return false;
//       return count < 1;
//     },
//   });

// // ── Create / update profile ───────────────────────────
// export const useUpsertProfile = () => {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: (payload: UpdateProfilePayload) =>
//       patientProfileService.upsertProfile(payload),
//     onSuccess: (data) => {
//       qc.setQueryData(KEYS.profile, data);
//     },
//   });
// };

// // ── Upload avatar ─────────────────────────────────────
// export const useUploadAvatar = () => {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: (file: File) => patientProfileService.uploadAvatar(file),
//     onSuccess: (avatarUrl) => {
//       qc.setQueryData(KEYS.profile, (old: any) => {
//         if (!old) return old;
//         return { ...old, user: { ...old.user, avatar: avatarUrl } };
//       });
//     },
//   });
// };

// // ── Get medical info ──────────────────────────────────
// export const usePatientMedical = () =>
//   useQuery({
//     queryKey: KEYS.medical,
//     queryFn: patientProfileService.getMedicalInfo,
//     retry: (count, err: any) => {
//       if (err?.response?.status === 404) return false;
//       return count < 1;
//     },
//   });

// // ── Save medical info ─────────────────────────────────
// export const useSaveMedicalInfo = () => {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: (payload: UpdateMedicalPayload) =>
//       patientProfileService.saveMedicalInfo(payload),
//     onSuccess: (data) => {
//       qc.setQueryData(KEYS.medical, (old: any) =>
//         old ? { ...old, medical_info: data } : old
//       );
//     },
//   });
// };

// // ── Get insurance ─────────────────────────────────────
// export const usePatientInsurance = () =>
//   useQuery({
//     queryKey: KEYS.insurance,
//     queryFn: patientProfileService.getInsurance,
//     retry: (count, err: any) => {
//       if (err?.response?.status === 404) return false;
//       return count < 1;
//     },
//   });

// // ── Update insurance ──────────────────────────────────
// export const useUpdateInsurance = () => {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: (payload: UpdateInsurancePayload) =>
//       patientProfileService.updateInsurance(payload),
//     onSuccess: (data) => {
//       qc.setQueryData(KEYS.insurance, data);
//       qc.invalidateQueries({ queryKey: KEYS.profile });
//     },
//   });
// };

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  PatientProfile,
  FullPatientProfile,
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
  patient: FullPatientProfile;
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
        body: JSON.stringify(payload),
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
      // No Content-Type header — browser sets it automatically with boundary for FormData
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
        body: JSON.stringify(payload),
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
        body: JSON.stringify(payload),
      }).then((r) => r.insurance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-insurance"] });
    },
  });
}
