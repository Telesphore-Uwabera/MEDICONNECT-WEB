import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/doctor/referrals";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReferralStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export interface ReferralPatient {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
}

export interface ReferralDoctor {
  id: number;
  name: string;
  specialization?: string;
  image?: string | null;
}

export interface Referral {
  id: number;
  status: ReferralStatus;
  reason: string;
  notes?: string | null;
  urgency?: "low" | "medium" | "high" | "emergency";
  referred_at: string;
  updated_at?: string;
  patient: ReferralPatient;
  referring_doctor?: ReferralDoctor;
  referred_to_doctor?: ReferralDoctor;
  appointment_id?: number | null;
}

export interface ReferralsListResponse {
  referrals: Referral[];
  total?: number;
  page?: number;
}

export interface ReferralDetailResponse {
  referral: Referral;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const referralKeys = {
  all: ["doctor-referrals"] as const,
  list: (status?: ReferralStatus | "all") =>
    ["doctor-referrals", "list", status ?? "all"] as const,
  detail: (id: number) => ["doctor-referrals", "detail", id] as const,
};

// ─── 1. List referrals (with optional status filter) ─────────────────────────

export function useGetDoctorReferrals(status?: ReferralStatus | "all") {
  const params = status && status !== "all" ? `?status=${status}` : "";
  return useQuery<ReferralsListResponse>({
    queryKey: referralKeys.list(status),
    queryFn: () => apiFetch(`${BASE}${params}`),
    staleTime: 30_000,
  });
}

// ─── 2. Get single referral ───────────────────────────────────────────────────

export function useGetReferral(id: number | null) {
  return useQuery<ReferralDetailResponse>({
    queryKey: referralKeys.detail(id!),
    queryFn: () => apiFetch(`${BASE}/${id}`),
    enabled: id != null && id > 0,
    staleTime: 30_000,
  });
}

// ─── 3. Cancel referral ───────────────────────────────────────────────────────

export function useCancelReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // Invalidate all referral list queries regardless of status filter
      qc.invalidateQueries({ queryKey: referralKeys.all });
    },
  });
}
