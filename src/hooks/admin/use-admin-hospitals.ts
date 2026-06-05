import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/hospitals";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiHospitalUser {
  id: number;
  name: string;
}

export interface ApiHospital {
  id: number;
  name_en: string;
  status: "active" | "pending" | "suspended" | "rejected";
  type: "private" | "public" | "ngo" | string;
  is_active?: boolean;
  verified_at?: string | null;
  doctors_count: number;
  departments_count: number;
  services_count: number;
  user: ApiHospitalUser;
  departments?: unknown[];
  services?: unknown[];
  workingHours?: unknown[];
  images?: unknown[];
  socialLinks?: unknown[];
  insurances?: unknown[];
  doctors?: unknown[];
  created_at: string;
}

export interface PaginatedHospitals {
  current_page: number;
  data: ApiHospital[];
  per_page: number;
  total: number;
}

export interface GetAdminHospitalsParams {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
}

interface HospitalActionResponse {
  message: string;
  hospital: ApiHospital;
}

// ─── useGetAdminHospitals  →  GET /admin/hospitals ───────────────────────────

export function useGetAdminHospitals(params: GetAdminHospitalsParams = {}) {
  const { status, type, search, page = 1 } = params;

  return useQuery<PaginatedHospitals>({
    queryKey: ["admin-hospitals", { status, type, search, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)  qs.set("status", status);
      if (type)    qs.set("type", type);
      if (search)  qs.set("search", search);
      if (page > 1) qs.set("page", String(page));

      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<PaginatedHospitals>(url);
    },
  });
}

// ─── useGetAdminHospital  →  GET /admin/hospitals/{id} ───────────────────────

export function useGetAdminHospital(id: number | null) {
  return useQuery<ApiHospital>({
    queryKey: ["admin-hospital", id],
    queryFn: () =>
      apiFetch<{ hospital: ApiHospital }>(`${BASE}/${id}`).then(
        (res) => res.hospital,
      ),
    enabled: !!id,
  });
}

// ─── useApproveHospital  →  PUT /admin/hospitals/{id}/approve ────────────────

export function useApproveHospital() {
  const qc = useQueryClient();

  return useMutation<ApiHospital, Error, number>({
    mutationFn: (id) =>
      apiFetch<HospitalActionResponse>(`${BASE}/${id}/approve`, {
        method: "PUT",
      }).then((res) => res.hospital),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
    },
  });
}

// ─── useRejectHospital  →  PUT /admin/hospitals/{id}/reject ──────────────────

export function useRejectHospital() {
  const qc = useQueryClient();

  return useMutation<ApiHospital, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<HospitalActionResponse>(`${BASE}/${id}/reject`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then((res) => res.hospital),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
    },
  });
}

// ─── useSuspendHospital  →  PUT /admin/hospitals/{id}/suspend ────────────────

export function useSuspendHospital() {
  const qc = useQueryClient();

  return useMutation<ApiHospital, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<HospitalActionResponse>(`${BASE}/${id}/suspend`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then((res) => res.hospital),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hospitals"] });
    },
  });
}
