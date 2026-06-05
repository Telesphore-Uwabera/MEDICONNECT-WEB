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

export interface PrescriptionPatient {
  id: number;
  name: string;
  phone?: string;
  [key: string]: unknown;
}

export interface PrescriptionReviewer {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface Prescription {
  id: number;
  pharmacy_id: number;
  patient_id: number;
  prescription_image: string;   // Cloudinary URL
  notes: string | null;
  status: PrescriptionStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at?: string;
  updated_at?: string;
  patient: PrescriptionPatient;
  reviewer: PrescriptionReviewer | null;
  order: unknown | null;        // linked order when fulfilled
}

export interface PaginatedPrescriptions {
  data: Prescription[];
  meta?: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
}

export interface SinglePrescriptionResponse {
  prescription: Prescription;
}

export interface PrescriptionActionResponse {
  message: string;
  prescription: Prescription;
}

// ─── 32. List Prescription Requests — GET /prescription-requests ──────────────
//
// Supported query params:
//   ?status=pending | reviewing | approved | rejected | fulfilled
//
// Omit status to receive all.

export interface ListPrescriptionParams {
  status?: PrescriptionStatus;
}

export function useGetPrescriptionRequests(
  params: ListPrescriptionParams = {},
) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  const queryString = qs.toString();

  return useQuery<PaginatedPrescriptions>({
    queryKey: prescriptionKeys.list(params),
    queryFn: () =>
      apiFetch<PaginatedPrescriptions>(
        `/pharmacy/prescription-requests${queryString ? `?${queryString}` : ""}`,
      ),
  });
}

// ─── 33. Get Single Prescription — GET /prescription-requests/:id ────────────

export function useGetPrescriptionRequest(id: number | undefined) {
  return useQuery<Prescription>({
    queryKey: prescriptionKeys.detail(id!),
    queryFn: async () => {
      const res = await apiFetch<SinglePrescriptionResponse>(
        `/pharmacy/prescription-requests/${id}`,
      );
      return res.prescription;
    },
    enabled: id !== undefined && id > 0,
  });
}

// ─── 34. Mark as Reviewing — POST /prescription-requests/:id/review ──────────
//
// No request body. Moves status from pending → reviewing.

export function useReviewPrescription() {
  const qc = useQueryClient();

  return useMutation<PrescriptionActionResponse, Error, number>({
    mutationFn: (id: number) =>
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
//
// No request body. Moves status → approved.

export function useApprovePrescription() {
  const qc = useQueryClient();

  return useMutation<PrescriptionActionResponse, Error, number>({
    mutationFn: (id: number) =>
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
//
// Requires body: { reason: string }
// apiFetch handles JSON.stringify + Content-Type header automatically.

export interface RejectPrescriptionPayload {
  id: number;
  reason: string;
}

export function useRejectPrescription() {
  const qc = useQueryClient();

  return useMutation<
    PrescriptionActionResponse,
    Error,
    RejectPrescriptionPayload
  >({
    mutationFn: ({ id, reason }) =>
      apiFetch<PrescriptionActionResponse>(
        `/pharmacy/prescription-requests/${id}/reject`,
        {
          method: "POST",
          body: { reason },   // apiFetch stringifies + sets Content-Type
        },
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    },
  });
}

// ─── 37. Mark as Fulfilled — POST /prescription-requests/:id/fulfill ──────────
//
// No request body. Terminal status — no further actions available.

export function useFulfillPrescription() {
  const qc = useQueryClient();

  return useMutation<PrescriptionActionResponse, Error, number>({
    mutationFn: (id: number) =>
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
