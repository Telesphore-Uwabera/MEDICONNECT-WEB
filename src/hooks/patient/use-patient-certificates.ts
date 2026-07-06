import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/patient/certificates";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CertStatus = "draft" | "pending" | "in_review" | "approved" | "rejected" | "issued" | "withdrawn" | "expired";

export interface Doctor {
  id: number;
  name: string;
  avatar?: string;
  pending_load?: number;
}

export interface CertificateAnswer {
  field?: string;
  value?: string;
  // Real shape returned by the API for certificate.answers[]
  id?: number;
  certificate_id?: number;
  step?: number;
  question_id?: number;
  question_key?: string;
  answer?: string;
  boolean_answer?: boolean;
  triggered_red_flag?: boolean;
  created_at?: string;
  updated_at?: string;
  question?: {
    id: number;
    section: string;
    question_key: string;
    question_en: string;
    question_fr?: string;
    question_kiny?: string;
    answer_type: string;
    options?: string[] | null;
    is_red_flag: boolean;
    is_required: boolean;
    warning_if_yes?: string | null;
    sort_order: number;
    is_active: boolean;
  };
}

export interface Certificate {
  id: number;
  certificate_number: string;
  status: CertStatus;
  current_step?: number;
  purpose: string;
  purpose_other?: string | null;
  job_type?: string;
  has_red_flags: boolean;
  decision?: string | null;
  valid_until?: string | null;
  doctor_notes?: string | null;
  doctor?: Doctor | null;
  answers?: CertificateAnswer[];
  created_at: string;

  // Extended fields present on the patient certificates list response
  appointment_id?: number | null;
  patient_id?: number;
  doctor_id?: number | null;
  qr_code?: string | null;
  pdf_url?: string | null;
  patient_full_name?: string;
  patient_national_id?: string | null;
  patient_contact?: string;
  identity_verified_via_video?: boolean;
  requires_inperson?: boolean;
  temperature?: string | null;
  blood_pressure?: string | null;
  pulse?: string | null;
  oxygen_saturation?: string | null;
  vitals_available?: boolean;
  patient_notes?: string | null;
  consent_given?: boolean;
  initial_fee_paid?: number;
  actual_fee_paid?: number;
  is_signed?: boolean;
  signed_at?: string | null;
  updated_at?: string;

  // Video identity-verification (confirmation) session, set once the doctor
  // starts it via POST /doctor/certificates/{id}/confirmation-session.
  confirmation_session?: unknown;
  confirmation_requested_at?: string | null;

  // Job context flags
  job_heavy_labor?: boolean;
  job_driving_machinery?: boolean;
  job_armed_forces?: boolean;
  job_mining_construction?: boolean;
  job_requires_xray?: boolean;
  job_none_of_above?: boolean;

  // Red flag breakdown
  red_flag_chest_pain?: boolean;
  red_flag_shortness_of_breath?: boolean;
  red_flag_syncope?: boolean;
  red_flag_severe_headache?: boolean;
  red_flag_neurological?: boolean;
  red_flag_weight_loss?: boolean;
  red_flag_cardiac_history?: boolean;
  red_flag_recent_surgery?: boolean;
  red_flag_seizure?: boolean;
  red_flag_pregnancy_complications?: boolean;
}

export interface StepDataResponse {
  certificate_id: number;
  current_step: number;
  step: number;
  answers?: CertificateAnswer[];
  // Step 1
  purpose?: string;
  purpose_other?: string | null;
  job_type?: string;
  // Step 4
  vitals?: {
    temperature?: string;
    blood_pressure?: string;
    pulse?: string;
    oxygen_saturation?: string;
  };
  notes?: string;
}

// Step payloads
export interface Step1Payload {
  purpose: string;
  purpose_other?: string | null;
  job_type: string;
}

export interface StepAnswersPayload {
  answers: Record<string, string>;
  // Step 4 extras
  temperature?: string;
  blood_pressure?: string;
  pulse?: string;
  oxygen_saturation?: string;
  notes?: string;
}

export type SaveStepPayload = Step1Payload | StepAnswersPayload;

export interface SaveStepResponse {
  message: string;
  certificate: Certificate;
  current_step: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit — two possible responses:
//   1. Unpaid  → invoice_number, public_key, amount, currency, payment_uuid
//   2. Already submitted → message only
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitPaymentRequired {
  message: string;
  invoice_number: string;
  public_key: string;
  amount: number;
  currency: string;
  payment_uuid: string;
}

export interface SubmitAlreadyDone {
  message: string;
  certificate?: Certificate;
}

export type SubmitResponse = SubmitPaymentRequired | SubmitAlreadyDone;

// ─────────────────────────────────────────────────────────────────────────────
// Download — two possible responses:
//   1. Unpaid  → invoice_number, public_key, amount, currency, payment_uuid
//   2. Already paid → url, expires_in
// ─────────────────────────────────────────────────────────────────────────────

export interface DownloadPaymentRequired {
  message: string;
  invoice_number: string;
  public_key: string;
  amount: number;
  currency: string;
  payment_uuid: string;
}

export interface DownloadReady {
  url: string;
  expires_in: number;
}

export type DownloadResponse = DownloadPaymentRequired | DownloadReady;

// ─────────────────────────────────────────────────────────────────────────────
// Payment status polling
// GET /public/payments/{payment_uuid}/status  (no auth)
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentPollStatus = "initiated" | "pending" | "paid" | "failed" | string;

export interface PaymentStatusResponse {
  status: PaymentPollStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// API error shape
// Backend returns: { message, success: false, errors?: [{ code, detail }] }
// apiFetch should throw an Error augmented with `errors` and `status` so
// callers (e.g. PaymentPanel) can detect codes like
// BAD_INVOICES_PAYMENT_EXPIRED.
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiErrorDetail {
  code: string;
  detail: string;
}

export interface ApiError extends Error {
  status: number;
  success?: false;
  errors?: ApiErrorDetail[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Other types
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailableDoctorsResponse {
  doctors: Doctor[];
}

export interface CertificatesListResponse {
  certificates: Certificate[];
}

export interface WithdrawResponse {
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────────

export function isSubmitPaymentRequired(r: SubmitResponse): r is SubmitPaymentRequired {
  return "payment_uuid" in r;
}

export function isDownloadPaymentRequired(r: DownloadResponse): r is DownloadPaymentRequired {
  return "payment_uuid" in r;
}

export function isDownloadReady(r: DownloadResponse): r is DownloadReady {
  return "url" in r;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const certKeys = {
  all: ["patient-certificates"] as const,
  list: (status?: string) => [...certKeys.all, "list", status] as const,
  single: (id: number) => [...certKeys.all, "single", id] as const,
  request: () => [...certKeys.all, "request"] as const,
  step: (step: number) => [...certKeys.all, "step", step] as const,
  doctors: () => [...certKeys.all, "available-doctors"] as const,
  paymentStatus: (uuid: string) => [...certKeys.all, "payment-status", uuid] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /patient/certificates/available-doctors
// ─────────────────────────────────────────────────────────────────────────────

export function useGetAvailableDoctors() {
  return useQuery<AvailableDoctorsResponse>({
    queryKey: certKeys.doctors(),
    queryFn: () => apiFetch(`${BASE}/available-doctors`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /patient/certificates  (list)
// ─────────────────────────────────────────────────────────────────────────────

export function useGetPatientCertificates(
  status?: string,
  options?: { refetchInterval?: number | false },
) {
  return useQuery<CertificatesListResponse>({
    queryKey: certKeys.list(status),
    queryFn: () => apiFetch(status ? `${BASE}?status=${status}` : BASE),
    refetchInterval: options?.refetchInterval,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /patient/certificates/{id}
// ─────────────────────────────────────────────────────────────────────────────

export function useGetCertificate(id: number | null) {
  return useQuery<{ certificate: Certificate }>({
    queryKey: certKeys.single(id!),
    queryFn: () => apiFetch(`${BASE}/${id}`),
    enabled: id !== null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /patient/certificates/request  (current draft)
// ─────────────────────────────────────────────────────────────────────────────

export function useGetCurrentRequest() {
  return useQuery<{ certificate: Certificate }>({
    queryKey: certKeys.request(),
    queryFn: () => apiFetch(`${BASE}/request`),
    retry: (failureCount, error) => {
      if ((error as ApiError).status === 404) return false;
      return failureCount < 2;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /patient/certificates/request/step/{step}
// ─────────────────────────────────────────────────────────────────────────────

export function useGetStepData(step: number, enabled = true) {
  return useQuery<StepDataResponse>({
    queryKey: certKeys.step(step),
    queryFn: () => apiFetch(`${BASE}/request/step/${step}`),
    enabled,
    retry: (failureCount, error) => {
      if ((error as ApiError).status === 404) return false;
      return failureCount < 2;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /patient/certificates/step/{step}
// ─────────────────────────────────────────────────────────────────────────────

export function useSaveStep() {
  const qc = useQueryClient();
  return useMutation<SaveStepResponse, ApiError, { step: number; payload: SaveStepPayload }>({
    mutationFn: ({ step, payload }) =>
      apiFetch(`${BASE}/step/${step}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: certKeys.request() });
      qc.invalidateQueries({ queryKey: certKeys.step(data.current_step) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /patient/certificates/submit
// Returns either payment-required info or an already-done message.
// Caller must check isSubmitPaymentRequired(response) to branch.
//
// Also usable as a "refresh invoice" / "pay initiate" call: calling
// mutateAsync() again re-hits the backend, which (per backend contract)
// should return a fresh invoice_number/payment_uuid if the previous one
// expired, or throw BAD_INVOICES_PAYMENT_EXPIRED if it cannot refresh yet.
// ─────────────────────────────────────────────────────────────────────────────

export function useSubmitCertificate() {
  const qc = useQueryClient();
  return useMutation<SubmitResponse, ApiError, void>({
    mutationFn: () => apiFetch(`${BASE}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: certKeys.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /public/payments/{payment_uuid}/status
// No auth required. Poll every 3 s; stop when paid/failed.
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentStatus(paymentUuid: string | null, enabled = true) {
  return useQuery<PaymentStatusResponse>({
    queryKey: certKeys.paymentStatus(paymentUuid ?? ""),
    queryFn: () => apiFetch(`/public/payments/${paymentUuid}/status`),
    enabled: !!paymentUuid && enabled,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === "paid" || s === "failed") return false;
      return 3_000;
    },
    staleTime: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /patient/certificates/{id}/download
// Returns either payment-required info or a signed PDF URL.
// Caller must check isDownloadReady(response) to branch.
//
// Also usable as a "refresh invoice" / "pay initiate" call for downloads.
// ─────────────────────────────────────────────────────────────────────────────

export function useDownloadCertificate() {
  return useMutation<DownloadResponse, ApiError, number>({
    mutationFn: (id) => apiFetch(`${BASE}/${id}/download`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Join the doctor-initiated video identity-verification session.
//
// The doctor starts it via POST /doctor/certificates/{id}/confirmation-session.
// The patient then joins the SAME room. The exact patient endpoint/method isn't
// confirmed yet — adjust the URL/method below once the backend is known. We read
// the token defensively (patient_token | token | doctor_token) so it works with
// whatever shape the backend returns.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfirmationSessionJoin {
  message?: string;
  room_url?: string;
  room_name?: string;
  join_url?: string;
  token?: string;
  patient_token?: string;
  doctor_token?: string;
  ice_servers?: unknown[];
}

export function useJoinConfirmationSession(id: number) {
  return useMutation<ConfirmationSessionJoin, ApiError, void>({
    // ⚠️ Best-guess endpoint — confirm with the backend.
    mutationFn: () => apiFetch(`${BASE}/${id}/confirmation-session`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /patient/certificates/withdraw
// ─────────────────────────────────────────────────────────────────────────────

export function useWithdrawCertificate() {
  const qc = useQueryClient();
  return useMutation<WithdrawResponse, ApiError, void>({
    mutationFn: () => apiFetch(`${BASE}/withdraw`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: certKeys.all });
    },
  });
}
