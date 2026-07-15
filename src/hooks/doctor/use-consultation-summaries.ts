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
export type SummaryDownloadType = "summary" | SummaryLookupType;

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

export type SummaryTextField = string | null;

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
  chief_complaint?: SummaryTextField | ChiefComplaint;
  history_of_present_illness?: SummaryTextField | HistoryOfPresentIllness;
  review_of_systems?: SummaryTextField | ReviewOfSystems;
  past_medical_history?: SummaryTextField;
  past_surgical_history?: SummaryTextField;
  medication_history?: SummaryTextField;
  allergy_history?: SummaryTextField;
  family_history?: SummaryTextField;
  social_history?: SummaryTextField;
  womens_health_history?: SummaryTextField;
  pediatric_history?: SummaryTextField;
  physical_examination?: SummaryTextField;
  attachments?: SummaryTextField;
  red_flag_screening?: string[] | RedFlagScreening | null;
  clinical_assessment?: SummaryTextField | ClinicalAssessment;
  management_plan?: SummaryTextField | ManagementPlan;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  patient?: SummaryPatient;
  appointment?: unknown;
  instantConsultation?: unknown;
  instant_consultation?: unknown;
}

/** One row per patient: the patient's summaries, grouped together. */
export interface PatientSummaryGroup {
  patient: SummaryPatient;
  summaries_count: number;
  summaries: ConsultationSummary[];
}

export function summaryFieldText(value: unknown, legacyKey?: string): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.length ? "<p>" + value.join(", ") + "</p>" : "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (legacyKey && typeof record[legacyKey] === "string") return record[legacyKey] as string;
    return Object.entries(record)
      .filter(([, item]) => item != null && item !== "" && !(Array.isArray(item) && item.length === 0))
      .map(([key, item]) => {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
        const display = Array.isArray(item) ? item.join(", ") : String(item);
        return "<p><strong>" + label + ":</strong> " + display + "</p>";
      })
      .join("");
  }
  return String(value);
}

export function summaryRedFlagList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([key, active]) => key !== "alert_triggered" && Boolean(active))
    .map(([key]) => key);
}

export function summaryHasRedFlagAlert(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Boolean(record.alert_triggered) || summaryRedFlagList(record).length > 0;
}
/* ─────────────────────────────────────────────
   Payloads
───────────────────────────────────────────── */

export interface CreateSummaryPayload {
  appointment_id?: number | null;
  instant_consultation_id?: number | null;
  patient_id: number;
  chief_complaint?: string | null;
  history_of_present_illness?: string | null;
  review_of_systems?: string | null;
  past_medical_history?: string | null;
  past_surgical_history?: string | null;
  medication_history?: string | null;
  allergy_history?: string | null;
  family_history?: string | null;
  social_history?: string | null;
  womens_health_history?: string | null;
  pediatric_history?: string | null;
  physical_examination?: string | null;
  attachments?: string | null;
  clinical_assessment?: string | null;
  management_plan?: string | null;
  red_flag_screening?: string[];
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

export function useConsultationSummaries(
  params?: SummaryListParams,
  options?: { enabled?: boolean },
) {
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
    enabled: options?.enabled,
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
  return useMutation<void, Error, { id: number; type?: SummaryDownloadType; filename?: string }>({
    mutationFn: ({ id, type, filename }) => {
      const qs = type ? `?type=${type}` : "";
      return downloadAuthedFile(
        `${BASE}/${id}/download-pdf${qs}`,
        filename ?? `consultation-summary-${type ?? "summary"}-${id}.pdf`,
      );
    },
  });
}
