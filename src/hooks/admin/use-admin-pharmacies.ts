import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/pharmacies";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPharmacyUser {
  id: number;
  name: string;
}

export interface ApiPharmacy {
  id: number;
  name_en: string;
  status: "active" | "pending" | "suspended" | "rejected";
  city?: string | null;
  is_active?: boolean;
  verified_at?: string | null;
  user: ApiPharmacyUser;
  workingHours?: unknown[];
  images?: unknown[];
  socialLinks?: unknown[];
  created_at: string;
}

export interface PaginatedPharmacies {
  current_page: number;
  data: ApiPharmacy[];
  per_page: number;
  total: number;
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
