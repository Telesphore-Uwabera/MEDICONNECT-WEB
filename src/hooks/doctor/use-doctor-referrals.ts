import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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

export type ReferralTargetType = "doctor" | "hospital" | "pharmacy";

export interface ReferralOrg {
  id: number;
  name: string;
  slug?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
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
  hospital?: ReferralOrg | null;
  pharmacy?: ReferralOrg | null;
  target_type?: ReferralTargetType | "unknown";
  appointment_id?: number | null;
}

export interface CreateReferralPayload {
  patient_id: number;
  appointment_id?: number;
  instant_consultation_id?: number;
  referred_to_doctor_id?: number;
  hospital_id?: number;
  pharmacy_id?: number;
  reason: string;
  notes?: string;
  urgency?: string;
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
    queryFn: async () => {
      const res = await apiFetch<ReferralsListResponse & { data?: Referral[] }>(`${BASE}${params}`);
      const referrals = Array.isArray(res.referrals)
        ? res.referrals
        : Array.isArray(res.data)
          ? res.data
          : [];
      return { referrals, total: res.total ?? referrals.length };
    },
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

export function useCreateReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReferralPayload) =>
      apiFetch<{ message: string; referral: Referral }>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: referralKeys.all });
    },
  });
}
