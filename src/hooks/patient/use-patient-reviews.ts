import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// Base matches the actual API: /api/v1/reviews (no /patient/ prefix)
const BASE = "/patient/reviews";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewDoctor {
  id: number;
  name: string;
  specialization: string;
  designations: string;
  avatar: string | null;
}

export interface Review {
  id: number;
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  status: ReviewStatus;
  rejection_reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  doctor: ReviewDoctor;
}

// Raw shape from the API — normalised into Review above
interface RawDoctor {
  id: number;
  specialization: string;
  designations: string;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
}

interface RawReview {
  id: number;
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  status: ReviewStatus;
  rejection_reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  doctor: RawDoctor;
}

interface ReviewsResponse {
  reviews: RawReview[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Review list query params  (matches API optional query params)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReviewListParams {
  status?: ReviewStatus;
  rating?: number;
  doctor_id?: number;
  from_date?: string;
  to_date?: string;
  sort_by?: "created_at" | "rating";
  sort_order?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalise raw API doctor → flat ReviewDoctor
// ─────────────────────────────────────────────────────────────────────────────

function normaliseReview(raw: RawReview): Review {
  return {
    ...raw,
    doctor: {
      id: raw.doctor.id,
      name: raw.doctor.user?.name ?? "Unknown",
      specialization: raw.doctor.specialization,
      designations: raw.doctor.designations,
      avatar: raw.doctor.user?.avatar ?? null,
    },
  };
}

function buildReviewUrl(params: ReviewListParams = {}): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.rating) sp.set("rating", String(params.rating));
  if (params.doctor_id) sp.set("doctor_id", String(params.doctor_id));
  if (params.from_date) sp.set("from_date", params.from_date);
  if (params.to_date) sp.set("to_date", params.to_date);
  if (params.sort_by) sp.set("sort_by", params.sort_by);
  if (params.sort_order) sp.set("sort_order", params.sort_order);
  if (params.per_page) sp.set("per_page", String(params.per_page));
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const reviewKeys = {
  all: ["patient-reviews"] as const,
  list: (params?: ReviewListParams) =>
    params
      ? ([...reviewKeys.all, "list", params] as const)
      : ([...reviewKeys.all, "list"] as const),
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. List my reviews   GET /reviews
// ─────────────────────────────────────────────────────────────────────────────

export function useGetMyReviews(params: ReviewListParams = {}) {
  return useQuery<Review[]>({
    queryKey: reviewKeys.list(params),
    queryFn: async () => {
      const res = (await apiFetch(buildReviewUrl(params))) as ReviewsResponse;
      return (res.reviews ?? []).map(normaliseReview);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Submit review   POST /reviews
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitReviewPayload {
  appointment_id: number;
  rating: number;
  comment?: string | null;
  is_anonymous?: boolean;
}

interface SubmitReviewResponse {
  message: string;
  review: Omit<RawReview, "doctor"> & {
    // POST response has minimal review fields per the API spec
    id: number;
    appointment_id: number;
    patient_id: number;
    doctor_id: number;
    rating: number;
    comment: string | null;
    is_anonymous: boolean;
    status: ReviewStatus;
  };
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, SubmitReviewPayload>({
    mutationFn: async (payload) => {
      const res = (await apiFetch(BASE, {
        method: "POST",
        body: {
          appointment_id: payload.appointment_id,
          rating: payload.rating,
          comment: payload.comment ?? null,
          is_anonymous: payload.is_anonymous ?? false,
        },
      })) as SubmitReviewResponse;
      return { message: res.message };
    },
    onSuccess: () => {
      // Invalidate so the list re-fetches with the new review
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      // Also invalidate appointments so can_review reflects the change
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Update review (pending only)   PUT /reviews/:id
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string | null;
  is_anonymous?: boolean;
}

interface UpdateReviewResponse {
  message: string;
  review: Omit<RawReview, "doctor">;
}

export function useUpdateReview(id: number) {
  const queryClient = useQueryClient();

  return useMutation<{ review: Review; message: string }, Error, UpdateReviewPayload>({
    mutationFn: async (payload) => {
      const res = (await apiFetch(`${BASE}/${id}`, {
        method: "PUT",
        body: payload,
      })) as UpdateReviewResponse;

      // PUT response has no doctor — pull it from the existing list cache
      const cached: Review[] = queryClient.getQueryData(reviewKeys.list()) ?? [];
      const existing = cached.find((r) => r.id === id);

      const merged: Review = {
        ...(existing ?? ({} as Review)),
        ...res.review,
        doctor: existing?.doctor ?? {
          id: 0,
          name: "Unknown",
          specialization: "",
          designations: "",
          avatar: null,
        },
      };

      return { review: merged, message: res.message };
    },
    onSuccess: ({ review }) => {
      // Update the list cache immediately so the UI reflects the change
      queryClient.setQueryData<Review[]>(reviewKeys.list(), (old = []) =>
        old.map((r) => (r.id === id ? review : r)),
      );
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Delete review (pending only)   DELETE /reviews/:id
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      // Invalidate appointments so can_review becomes true again if applicable
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_DISPLAY: Record<
  ReviewStatus,
  { colorClass: string; dotClass: string }
> = {
  pending: {
    colorClass: "bg-amber-500/15 text-amber-700 border-amber-400/30",
    dotClass: "bg-amber-500",
  },
  approved: {
    colorClass: "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
    dotClass: "bg-emerald-500",
  },
  rejected: {
    colorClass: "bg-destructive/15 text-destructive border-destructive/25",
    dotClass: "bg-destructive",
  },
};

// Translated status label — pass the active `t` from useTranslation so labels
// follow language switches (never bake t() into module constants).
export const getReviewStatusLabel = (
  t: (key: string) => string,
  status: ReviewStatus,
): string => {
  const map: Record<ReviewStatus, string> = {
    pending: t("pages.patient.status_pending"),
    approved: t("pages.patient.rev_approved"),
    rejected: t("pages.patient.rev_rejected"),
  };
  return map[status];
};
