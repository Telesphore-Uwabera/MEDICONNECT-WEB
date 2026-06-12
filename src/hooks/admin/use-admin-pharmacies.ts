import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/admin/pharmacies";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPharmacyUser {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_verified?: boolean;
  status?: string;
}

export interface ApiPharmacy {
  id: number;
  name_en: string;
  name_rw?: string | null;
  status: "active" | "pending" | "suspended" | "rejected";

  // ── Identity ──
  logo?: string | null;
  description_en?: string | null;
  description_rw?: string | null;
  registration_number?: string | null;

  // ── Location ──
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // ── Contact ──
  phone?: string | null;
  email?: string | null;
  website?: string | null;

  // ── Hours ──
  opens_at?: string | null;
  closes_at?: string | null;
  is_open_24h?: boolean;

  // ── Delivery ──
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  delivery_fee?: string | number | null;
  delivery_currency?: string | null;
  delivery_radius_km?: number | null;
  estimated_delivery_minutes?: number | null;

  // ── Flags ──
  is_active?: boolean;
  show_homepage?: boolean;
  registration_fee_paid?: boolean;

  // ── Timestamps ──
  verified_at?: string | null;
  created_at: string;
  updated_at?: string;

  // ── Relations ──
  user: ApiPharmacyUser;
  workingHours?: unknown[];
  images?: unknown[];
  socialLinks?: unknown[];
}

export interface PaginatedPharmacies {
  current_page: number;
  data: ApiPharmacy[];
  per_page: number;
  total: number;
  last_page: number;
}

export interface GetAdminPharmaciesParams {
  status?: string;
  city?: string;
  search?: string;
  page?: number;
}

interface PharmacyActionResponse {
  message: string;
  pharmacy: ApiPharmacy;
}

// ─── useGetAdminPharmacies  →  GET /admin/pharmacies ─────────────────────────

export function useGetAdminPharmacies(params: GetAdminPharmaciesParams = {}) {
  const { status, city, search, page = 1 } = params;

  return useQuery<PaginatedPharmacies>({
    queryKey: ["admin-pharmacies", { status, city, search, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)   qs.set("status", status);
      if (city)     qs.set("city", city);
      if (search)   qs.set("search", search);
      if (page > 1) qs.set("page", String(page));

      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<PaginatedPharmacies>(url);
    },
  });
}

// ─── useGetAdminPharmacy  →  GET /admin/pharmacies/{id} ──────────────────────

export function useGetAdminPharmacy(id: number | null) {
  return useQuery<ApiPharmacy>({
    queryKey: ["admin-pharmacy", id],
    queryFn: () =>
      apiFetch<{ pharmacy: ApiPharmacy }>(`${BASE}/${id}`).then(
        (res) => res.pharmacy,
      ),
    enabled: !!id,
  });
}

// ─── useApprovePharmacy  →  PUT /admin/pharmacies/{id}/approve ───────────────

export function useApprovePharmacy() {
  const qc = useQueryClient();

  return useMutation<ApiPharmacy, Error, number>({
    mutationFn: (id) =>
      apiFetch<PharmacyActionResponse>(`${BASE}/${id}/approve`, {
        method: "PUT",
      }).then((res) => res.pharmacy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pharmacies"] });
    },
  });
}

// ─── useRejectPharmacy  →  PUT /admin/pharmacies/{id}/reject ─────────────────

export function useRejectPharmacy() {
  const qc = useQueryClient();

  return useMutation<ApiPharmacy, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<PharmacyActionResponse>(`${BASE}/${id}/reject`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then((res) => res.pharmacy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pharmacies"] });
    },
  });
}

// ─── useSuspendPharmacy  →  PUT /admin/pharmacies/{id}/suspend ───────────────

export function useSuspendPharmacy() {
  const qc = useQueryClient();

  return useMutation<ApiPharmacy, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<PharmacyActionResponse>(`${BASE}/${id}/suspend`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then((res) => res.pharmacy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pharmacies"] });
    },
  });
}
