import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/patient/reviews";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewDoctor {
  id: number;
  name: string;           // from doctor.user.name
  specialization: string;
  designations: string;
  avatar: string | null;  // from doctor.user.avatar
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

// Raw shape from the API — we normalise it into Review above
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

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

export const reviewKeys = {
  all: ["patient-reviews"] as const,
  list: (status?: ReviewStatus) =>
    status
      ? [...reviewKeys.all, "list", status]
      : [...reviewKeys.all, "list"],
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. List my reviews   GET /patient/reviews
// ─────────────────────────────────────────────────────────────────────────────

export function useGetMyReviews(status?: ReviewStatus) {
  return useQuery<Review[]>({
    queryKey: reviewKeys.list(status),
    queryFn: async () => {
      const url = status ? `${BASE}?status=${status}` : BASE;
      const res = (await apiFetch(url)) as ReviewsResponse;
      return (res.reviews ?? []).map(normaliseReview);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Update review (pending only)   PUT /patient/reviews/:id
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string | null;
  is_anonymous?: boolean;
}

// Shape returned by PUT — no doctor relation included
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
        body: JSON.stringify(payload),
      })) as UpdateReviewResponse;

      // PUT response has no doctor — pull it from the existing cache
      const cached: Review[] = queryClient.getQueryData(reviewKeys.list()) ?? [];
      const existing = cached.find((r) => r.id === id);

      const merged: Review = {
        ...(existing ?? ({} as Review)),
        ...res.review,
        // keep the doctor from cache; API doesn't return it on update
        doctor: existing?.doctor ?? ({ name: "Unknown", specialization: "", designations: "", avatar: null, id: 0 } as Review["doctor"]),
      };

      return { review: merged, message: res.message };
    },
    onSuccess: ({ review }) => {
      // Optimistically update the list cache so the UI reflects the change immediately
      queryClient.setQueryData<Review[]>(reviewKeys.list(), (old = []) =>
        old.map((r) => (r.id === id ? review : r)),
      );
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Delete review (pending only)   DELETE /patient/reviews/:id
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_DISPLAY: Record<
  ReviewStatus,
  { label: string; colorClass: string; dotClass: string }
> = {
  pending: {
    label: "Pending",
    colorClass: "bg-amber-500/15 text-amber-700 border-amber-400/30",
    dotClass: "bg-amber-500",
  },
  approved: {
    label: "Approved",
    colorClass: "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
    dotClass: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    colorClass: "bg-destructive/15 text-destructive border-destructive/25",
    dotClass: "bg-destructive",
  },
};