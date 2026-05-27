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

export const patientProfileService = {
  // ── Profile ────────────────────────────────────────
  getProfile: () =>
    apiFetch<{ patient: PatientProfile }>(BASE).then((r) => r.patient),

  upsertProfile: (payload: UpdateProfilePayload) =>
    apiFetch<{ message: string; patient: PatientProfile }>(BASE, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((r) => r.patient),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return apiFetch<{ message: string; avatar: string }>(`${BASE}/avatar`, {
      method: "POST",
      body: form,
      // No Content-Type header — browser sets it automatically with boundary for FormData
    }).then((r) => r.avatar);
  },

  // ── Medical info ───────────────────────────────────
  getMedicalInfo: () =>
    apiFetch<{
      medical_info: MedicalInfo;
      patient: FullPatientProfile;
    }>(`${BASE}/medical`),

  saveMedicalInfo: (payload: UpdateMedicalPayload) =>
    apiFetch<{
      message: string;
      medical_info: MedicalInfo;
    }>(`${BASE}/medical`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((r) => r.medical_info),

  // ── Insurance ──────────────────────────────────────
  getInsurance: () =>
    apiFetch<{ insurance: Insurance }>(`${BASE}/insurance`).then(
      (r) => r.insurance
    ),

  updateInsurance: (payload: UpdateInsurancePayload) =>
    apiFetch<{
      message: string;
      insurance: Insurance;
    }>(`${BASE}/insurance`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((r) => r.insurance),
};
