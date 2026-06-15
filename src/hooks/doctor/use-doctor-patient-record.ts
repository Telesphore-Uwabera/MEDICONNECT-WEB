import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const base = (patientId: number | null) => `/doctor/patients/${patientId}`;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MedicalRecord {
  id?: number;
  patient_id?: number;
  blood_type?: string | null;
  chronic_conditions?: string | null;
  known_allergies?: string | null;
  current_medications?: string | null;
  family_history?: string | null;
  surgical_history?: string | null;
  disabilities?: string | null;
  patient?: { id: number; name: string; email?: string };
  created_at?: string;
  updated_at?: string;
}

export type MedicalRecordUpdate = Partial<
  Pick<
    MedicalRecord,
    | "blood_type"
    | "chronic_conditions"
    | "known_allergies"
    | "current_medications"
    | "family_history"
    | "surgical_history"
    | "disabilities"
  >
>;

export type VisitType = "appointment" | "instant_consultation";

export interface PatientVisit {
  id: number;
  patient_id?: number;
  doctor_id?: number;
  visit_type: VisitType | string;
  source_id?: number;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  treatment_plan?: string | null;
  recommendations?: string | null;
  blood_pressure?: string | null;
  temperature?: string | null;
  pulse_rate?: string | null;
  weight?: string | null;
  height?: string | null;
  needs_follow_up?: boolean;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  visited_at?: string;
  doctor?: { id: number; user?: { id: number; name: string } };
}

export type FileType = "lab_result" | "scan" | "report" | "prescription" | "other";

export interface PatientFile {
  id: number;
  patient_id?: number;
  visit_type?: string;
  source_id?: number;
  file_type: FileType | string;
  title: string;
  file_path?: string;
  file_url?: string; // signed URL, valid ~30 min
  notes?: string | null;
  uploaded_by?: { id: number; user?: { id: number; name: string } };
  created_at?: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** GET /doctor/patients/:id/record */
export function usePatientMedicalRecord(patientId: number | null) {
  return useQuery({
    queryKey: ["patient-record", patientId],
    enabled: patientId != null,
    queryFn: async () => {
      const res = await apiFetch<{ record?: MedicalRecord } | MedicalRecord>(`${base(patientId)}/record`);
      return ((res as any)?.record ?? res) as MedicalRecord;
    },
  });
}

/** PUT /doctor/patients/:id/record */
export function useUpdatePatientMedicalRecord(patientId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MedicalRecordUpdate) =>
      apiFetch<{ message: string; record: MedicalRecord }>(`${base(patientId)}/record`, {
        method: "PUT",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-record", patientId] }),
  });
}

/** GET /doctor/patients/:id/visits?visit_type=… */
export function usePatientVisits(patientId: number | null, visitType?: VisitType) {
  return useQuery({
    queryKey: ["patient-visits", patientId, visitType ?? "all"],
    enabled: patientId != null,
    queryFn: async () => {
      const qs = visitType ? `?visit_type=${visitType}` : "";
      const res = await apiFetch<{ data?: PatientVisit[] } | PatientVisit[]>(`${base(patientId)}/visits${qs}`);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });
}

/** GET /doctor/patients/:id/files?file_type=… */
export function usePatientFiles(patientId: number | null, fileType?: FileType) {
  return useQuery({
    queryKey: ["patient-files", patientId, fileType ?? "all"],
    enabled: patientId != null,
    queryFn: async () => {
      const qs = fileType ? `?file_type=${fileType}` : "";
      const res = await apiFetch<{ data?: PatientFile[] } | PatientFile[]>(`${base(patientId)}/files${qs}`);
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });
}

/** POST /doctor/patients/:id/files (multipart/form-data) */
export function useUploadPatientFile(patientId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) =>
      apiFetch<{ message: string; file: PatientFile }>(`${base(patientId)}/files`, {
        method: "POST",
        body: form,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-files", patientId] }),
  });
}
