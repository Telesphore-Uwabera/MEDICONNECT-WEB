/**
 * usePrescriptionRequests.ts
 *
 * Covers every endpoint from the Prescription Requests API spec:
 *
 *  32. GET  /prescription-requests              → useGetPrescriptionRequests(params)
 *  33. GET  /prescription-requests/:id          → useGetPrescriptionRequest(id)
 *  34. POST /prescription-requests/:id/review   → useReviewPrescription()
 *  35. POST /prescription-requests/:id/approve  → useApprovePrescription()
 *  36. POST /prescription-requests/:id/reject   → useRejectPrescription()
 *  37. POST /prescription-requests/:id/fulfill  → useFulfillPrescription()
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Shared query-key factory ─────────────────────────────────────────────────

export const prescriptionKeys = {
  all: ["prescription-requests"] as const,
  lists: () => [...prescriptionKeys.all, "list"] as const,
  list: (params: ListPrescriptionParams) =>
    [...prescriptionKeys.lists(), params] as const,
  details: () => [...prescriptionKeys.all, "detail"] as const,
  detail: (id: number) => [...prescriptionKeys.details(), id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrescriptionStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "fulfilled";

/** A user record (patient or doctor.user) */
export interface UserRecord {
  id: number;
  name: string;
  phone?: string | null;
  country_code?: string | null;
  email?: string | null;
  avatar?: string | null;
  [key: string]: unknown;
}

/** The doctor profile embedded in a prescription */
export interface PrescriptionDoctor {
  id: number;
  user_id: number;
  specialization?: string | null;
  doctor_degree?: string | null;
  medical_license?: string | null;
  designations?: string | null;
  user: UserRecord;
  [key: string]: unknown;
}

/** A single medicine line inside a prescription */
export interface PrescriptionItem {
  id: number;
  prescription_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** The prescription document attached to a request */
export interface PrescriptionDocument {
  id: number;
  appointment_id?: number | null;
  patient_id: number;
  doctor_id: number;
  prescription_number?: string | null;
  pdf_url?: string | null;
  qr_code?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  valid_until?: string | null;
  status?: string | null;
  is_signed?: boolean;
  signed_at?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  /** Embedded patient record */
  patient: UserRecord;
  /** Embedded doctor profile (with nested user) */
  doctor?: PrescriptionDoctor | null;
  /** Medicine line items */
  items: PrescriptionItem[];
}

/** The reviewer (pharmacy staff) who actioned the request */
export interface PrescriptionReviewer {
  id: number;
  name: string;
  [key: string]: unknown;
}

/**
 * A prescription REQUEST — the top-level object returned by
 * GET /pharmacy/prescription-requests
 */
export interface PrescriptionRequest {
  id: number;
  prescription_id: number;
  pharmacy_id: number;
  delivery_type: "pickup" | "delivery";
  delivery_address?: string | null;
  status: PrescriptionStatus;
  notes?: string | null;
  is_active?: boolean;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  /** Full prescription document with patient, doctor, and items */
  prescription?: PrescriptionDocument | null;
  /** Staff member who reviewed/actioned this request */
  reviewer?: PrescriptionReviewer | null;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface PaginatedPrescriptionRequests {
  current_page: number;
  data: PrescriptionRequest[];
  first_page_url?: string;
  from?: number;
  last_page?: number;
  last_page_url?: string;
  next_page_url?: string | null;
  prev_page_url?: string | null;
  per_page?: number;
  to?: number;
  total?: number;
}

export interface SinglePrescriptionRequestResponse {
  data: PrescriptionRequest;
}

export interface PrescriptionActionResponse {
  message: string;
  data?: PrescriptionRequest;
}

// ─── 32. List Prescription Requests — GET /prescription-requests ──────────────

export interface ListPrescriptionParams {
  status?: PrescriptionStatus;
}

export function useGetPrescriptionRequests(
  params: ListPrescriptionParams = {},
) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  const queryString = qs.toString();

  return useQuery<PaginatedPrescriptionRequests>({
    queryKey: prescriptionKeys.list(params),
    queryFn: () =>
      apiFetch<PaginatedPrescriptionRequests>(
        `/pharmacy/prescription-requests${queryString ? `?${queryString}` : ""}`,
      ),
  });
}

// ─── 33. Get Single Prescription Request — GET /prescription-requests/:id ─────

export function useGetPrescriptionRequest(id: number | undefined) {
  return useQuery<PrescriptionRequest>({
    queryKey: prescriptionKeys.detail(id!),
    queryFn: async () => {
      const res = await apiFetch<SinglePrescriptionRequestResponse>(
        `/pharmacy/prescription-requests/${id}`,
      );
      return res.data;
    },
    enabled: id !== undefined && id > 0,
  });
}

// ─── 34. Mark as Reviewing — POST /prescription-requests/:id/review ──────────

export function useReviewPrescription() {
  const qc = useQueryClient();
  return useMutation<PrescriptionActionResponse, Error, number>({
    mutationFn: (id) =>
      apiFetch<PrescriptionActionResponse>(
        `/pharmacy/prescription-requests/${id}/review`,
        { method: "POST" },
      ),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    },
  });
}

// ─── 35. Approve Prescription — POST /prescription-requests/:id/approve ───────

export function useApprovePrescription() {
  const qc = useQueryClient();
  return useMutation<PrescriptionActionResponse, Error, number>({
    mutationFn: (id) =>
      apiFetch<PrescriptionActionResponse>(
        `/pharmacy/prescription-requests/${id}/approve`,
        { method: "POST" },
      ),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    },
  });
}

// ─── 36. Reject Prescription — POST /prescription-requests/:id/reject ─────────

export interface RejectPrescriptionPayload {
  id: number;
  reason: string;
}

export function useRejectPrescription() {
  const qc = useQueryClient();
  return useMutation<PrescriptionActionResponse, Error, RejectPrescriptionPayload>({
    mutationFn: ({ id, reason }) =>
      apiFetch<PrescriptionActionResponse>(
        `/pharmacy/prescription-requests/${id}/reject`,
        { method: "POST", body: { reason } },
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    },
  });
}

// ─── 37. Mark as Fulfilled — POST /prescription-requests/:id/fulfill ──────────

export function useFulfillPrescription() {
  const qc = useQueryClient();
  return useMutation<PrescriptionActionResponse, Error, number>({
    mutationFn: (id) =>
      apiFetch<PrescriptionActionResponse>(
        `/pharmacy/prescription-requests/${id}/fulfill`,
        { method: "POST" },
      ),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    },
  });
}
