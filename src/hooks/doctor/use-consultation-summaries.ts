// Doctor consultation summaries (post-call SOAP note).
// API: /api/v1/doctor/consultation-summaries
//
// A summary belongs to EITHER a scheduled appointment (appointment_id) or an
// instant consultation (instant_consultation_id) — never both — plus patient_id.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { downloadAuthedFile } from "@/lib/download-file";

const BASE = "/doctor/consultation-summaries";

/** Resolve a summary by its own id, or by appointment / instant-consultation id. */
export type SummaryLookupType = "appointment" | "instant_consultation";

/* ─────────────────────────────────────────────
   Section shapes (all fields optional client-side)
───────────────────────────────────────────── */

export interface ChiefComplaint {
  main_complaint?: string;
  duration_value?: number | null;
  duration_unit?: string | null; // hours | days | weeks | months
}

export interface HistoryOfPresentIllness {
  onset?: string | null;     // sudden | gradual
  location?: string | null;
  severity?: number | null;  // 1–10
}

/** system → list of selected symptom slugs, e.g. { respiratory: ["cough"] } */
export type ReviewOfSystems = Record<string, string[]>;

export interface RedFlagScreening {
  alert_triggered?: boolean;
  [flag: string]: boolean | undefined;
}

export interface ClinicalAssessment {
  primary_diagnosis?: string | null;
  severity_classification?: string | null; // mild | moderate | severe
}

export interface ManagementPlan {
  medications_prescribed?: string[];
  followup_plan?: string | null;
}

export interface SummaryPatient {
  id: number;
  name: string;
  email?: string;
}

export interface ConsultationSummary {
  id: number;
  appointment_id: number | null;
  instant_consultation_id: number | null;
  patient_id: number;
  doctor_id?: number;
  chief_complaint?: ChiefComplaint | null;
  history_of_present_illness?: HistoryOfPresentIllness | null;
  review_of_systems?: ReviewOfSystems | null;
  past_medical_history?: unknown;
  past_surgical_history?: unknown;
  medication_history?: unknown;
  allergy_history?: unknown;
  family_history?: unknown;
  social_history?: unknown;
  womens_health_history?: unknown;
  pediatric_history?: unknown;
  physical_examination?: unknown;
  attachments?: unknown;
  red_flag_screening?: RedFlagScreening | null;
  clinical_assessment?: ClinicalAssessment | null;
  management_plan?: ManagementPlan | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  patient?: SummaryPatient;
}

/** One row per patient: the patient's summaries, grouped together. */
export interface PatientSummaryGroup {
  patient: SummaryPatient;
  summaries_count: number;
  summaries: ConsultationSummary[];
}

/* ─────────────────────────────────────────────
   Payloads
───────────────────────────────────────────── */

export interface CreateSummaryPayload {
  appointment_id?: number | null;
  instant_consultation_id?: number | null;
  patient_id: number;
  chief_complaint?: ChiefComplaint;
  history_of_present_illness?: HistoryOfPresentIllness;
  review_of_systems?: ReviewOfSystems;
  red_flag_screening?: RedFlagScreening;
  clinical_assessment?: ClinicalAssessment;
  management_plan?: ManagementPlan;
}

/** Send only the fields you want to change. */
export type UpdateSummaryPayload = Partial<
  Omit<CreateSummaryPayload, "appointment_id" | "instant_consultation_id" | "patient_id">
>;

export interface SummaryListParams {
  appointment_id?: number;
  instant_consultation_id?: number;
  patient_id?: number;
}

export interface SummaryListStats {
  total_patients: number;
  total_summaries: number;
  via_appointment: number;
  via_instant_consultation: number;
}

export interface SummaryListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface SummaryListResponse {
  data: PatientSummaryGroup[];
  stats?: SummaryListStats;
  meta?: SummaryListMeta;
}

/* ─────────────────────────────────────────────
   Query keys
───────────────────────────────────────────── */

export const summaryKeys = {
  all: () => ["consultation-summaries"] as const,
  list: (params?: SummaryListParams) => ["consultation-summaries", "list", params] as const,
  detail: (id: number) => ["consultation-summaries", "detail", id] as const,
};

/* ─────────────────────────────────────────────
   GET /doctor/consultation-summaries
───────────────────────────────────────────── */

export function useConsultationSummaries(params?: SummaryListParams) {
  return useQuery({
    queryKey: summaryKeys.list(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.appointment_id != null) qs.set("appointment_id", String(params.appointment_id));
      if (params?.instant_consultation_id != null)
        qs.set("instant_consultation_id", String(params.instant_consultation_id));
      if (params?.patient_id != null) qs.set("patient_id", String(params.patient_id));
      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<SummaryListResponse>(url);
    },
  });
}

/* ─────────────────────────────────────────────
   GET /doctor/consultation-summaries/:id
───────────────────────────────────────────── */

export function useConsultationSummary(id: number | null) { 
  return useQuery({
    queryKey: summaryKeys.detail(id ?? -1),
    queryFn: () => apiFetch<{ summary: ConsultationSummary }>(`${BASE}/${id}`),
    enabled: id != null,
  });
}

/* ─────────────────────────────────────────────
   POST /doctor/consultation-summaries
───────────────────────────────────────────── */

export function useCreateConsultationSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSummaryPayload) =>
      apiFetch<{ message: string; summary: ConsultationSummary }>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: summaryKeys.all() }),
  });
}

/* ─────────────────────────────────────────────
   PUT /doctor/consultation-summaries/:id
───────────────────────────────────────────── */

export function useUpdateConsultationSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSummaryPayload }) =>
      apiFetch<{ message: string; summary: ConsultationSummary }>(`${BASE}/${id}`, {
        method: "PUT",
        body: payload,
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: summaryKeys.detail(id) });
      qc.invalidateQueries({ queryKey: summaryKeys.all() });
    },
  });
}

/* ─────────────────────────────────────────────
   DELETE /doctor/consultation-summaries/:id
───────────────────────────────────────────── */

export function useDeleteConsultationSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: summaryKeys.all() }),
  });
}

/* ─────────────────────────────────────────────
   GET /doctor/consultation-summaries/{id}/download-pdf
   id = summary id, or appointment/instant id with ?type=
───────────────────────────────────────────── */

export function useDownloadConsultationSummary() {
  return useMutation<void, Error, { id: number; type?: SummaryLookupType }>({
    mutationFn: ({ id, type }) => {
      const qs = type ? `?type=${type}` : "";
      return downloadAuthedFile(
        `${BASE}/${id}/download-pdf${qs}`,
        `consultation-summary-${id}.pdf`,
      );
    },
  });
}
