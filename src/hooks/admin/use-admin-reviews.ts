import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/reviews";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiReview {
  id: number;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  rating: number;
  comment: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  doctor: {
    id: number;
    user: { name: string; email?: string; avatar?: string };
    specialization?: { name: string };
  };
  patient: {
    id: number;
    name: string;
    email?: string;
    avatar?: string;
  };
  appointment?: { id: number; appointment_date: string };
}

export interface ReviewsResponse {
  data: ApiReview[];
  current_page: number;
  per_page: number;
  total: number;
}

export interface ReviewResponse {
  review: ApiReview;
}

export interface ApproveResponse {
  message: string;
  review: ApiReview;
  rating_avg: number;
}

export interface RejectResponse {
  message: string;
  review: ApiReview;
}

export interface ReviewFilters {
  status?: "pending" | "approved" | "rejected";
  doctor_id?: number;
  page?: number;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export function useGetAdminReviews(filters: ReviewFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status)    params.set("status", filters.status);
  if (filters.doctor_id) params.set("doctor_id", String(filters.doctor_id));
  if (filters.page)      params.set("page", String(filters.page));

  const query = params.toString();

  return useQuery<ReviewsResponse>({
    queryKey: ["admin-reviews", filters],
    queryFn: () => apiFetch<ReviewsResponse>(`${BASE}${query ? `?${query}` : ""}`),
  });
}

// ─── Single ───────────────────────────────────────────────────────────────────

export function useGetAdminReview(id: number | null) {
  return useQuery<ReviewResponse>({
    queryKey: ["admin-review", id],
    queryFn: () => apiFetch<ReviewResponse>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation<ApproveResponse, Error, number>({
    mutationFn: (id) => apiFetch<ApproveResponse>(`${BASE}/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export function useRejectReview() {
  const qc = useQueryClient();
  return useMutation<RejectResponse, Error, { id: number; reason: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<RejectResponse>(`${BASE}/${id}/reject`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, number>({
    mutationFn: (id) =>
      apiFetch<{ message: string }>(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });
}
