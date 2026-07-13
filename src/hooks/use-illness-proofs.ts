import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface IllnessProofFile {
  id: number;
  illness_proof_id?: number;
  file_path?: string | null;
  url?: string | null;
}

export interface IllnessProof {
  id: number;
  appointment_id?: number | null;
  instant_consultation_id?: number | null;
  patient_id?: number;
  doctor_id?: number;
  text: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  files?: IllnessProofFile[];
}

export interface SubmitIllnessProofPayload {
  appointment_id?: number | null;
  instant_consultation_id?: number | null;
  text: string;
  files: File[];
}

const patientBase = "/patient/illness-proofs";
const doctorBase = "/doctor/illness-proofs";

const unwrapList = (payload: unknown): IllnessProof[] => {
  const data = (payload as any)?.data ?? payload;
  if (Array.isArray(data)) return data as IllnessProof[];
  if (Array.isArray((data as any)?.data)) return (data as any).data as IllnessProof[];
  return [];
};

const unwrapOne = (payload: unknown): IllnessProof => ((payload as any)?.data ?? payload) as IllnessProof;

export const illnessProofKeys = {
  patientList: () => ["patient-illness-proofs"] as const,
  patientDetail: (id: number) => ["patient-illness-proof", id] as const,
  doctorDetail: (id: number) => ["doctor-illness-proof", id] as const,
};

export function usePatientIllnessProofs(enabled = true) {
  return useQuery({
    queryKey: illnessProofKeys.patientList(),
    queryFn: async () => unwrapList(await apiFetch(patientBase)),
    enabled,
  });
}

export function usePatientIllnessProof(id: number | null) {
  return useQuery({
    queryKey: illnessProofKeys.patientDetail(id ?? -1),
    queryFn: async () => unwrapOne(await apiFetch(`${patientBase}/${id}`)),
    enabled: id != null,
  });
}


export function usePatientIllnessProofDetail() {
  return useMutation<IllnessProof, Error, number>({
    mutationFn: async (id) => unwrapOne(await apiFetch(`${patientBase}/${id}`)),
  });
}
export function useDoctorIllnessProof() {
  return useMutation<IllnessProof, Error, number>({
    mutationFn: async (id) => unwrapOne(await apiFetch(`${doctorBase}/${id}`)),
  });
}

export function useSubmitIllnessProof() {
  const qc = useQueryClient();
  return useMutation<IllnessProof, Error, SubmitIllnessProofPayload>({
    mutationFn: async (payload) => {
      const fd = new FormData();
      if (payload.appointment_id != null) fd.append("appointment_id", String(payload.appointment_id));
      if (payload.instant_consultation_id != null) {
        fd.append("instant_consultation_id", String(payload.instant_consultation_id));
      }
      fd.append("text", payload.text);
      payload.files.forEach((file) => fd.append("files[]", file));
      return unwrapOne(await apiFetch(patientBase, { method: "POST", body: fd }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: illnessProofKeys.patientList() }),
  });
}

export function useDeleteIllnessProof() {
  const qc = useQueryClient();
  return useMutation<{ message?: string }, Error, number>({
    mutationFn: (id) => apiFetch(`${patientBase}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: illnessProofKeys.patientList() }),
  });
}

export function proofBelongsToTarget(
  proof: IllnessProof,
  target: { appointmentId?: number | null; instantConsultationId?: number | null },
) {
  if (target.appointmentId != null) return Number(proof.appointment_id) === Number(target.appointmentId);
  if (target.instantConsultationId != null) {
    return Number(proof.instant_consultation_id) === Number(target.instantConsultationId);
  }
  return true;
}

export function resolveProofFileUrl(file: IllnessProofFile) {
  const raw = file.url || file.file_path || "";
  if (!raw) return null;
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  const apiBase = import.meta.env.VITE_APP_BASE_URL ?? "";
  const apiOrigin = apiBase ? new URL(apiBase, window.location.origin).origin : window.location.origin;
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${apiOrigin}${normalized}`;
}
