import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/patients";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPatient {
  id: number;
  name: string;
  email: string;
  phone: string;
  country_code?: string | null;
  avatar?: string | null;
  status: "active" | "pending" | "suspended" | "rejected";
  is_verified?: boolean;
  preferred_language?: string | null;
  phone_verified_at?: string | null;
  email_verified_at?: string | null;
  roles?: { name: string }[];
  patient?: {
    id: number;
    date_of_birth?: string | null;
  } | null;
  created_at: string;
}

export interface PaginatedPatients {
  current_page: number;
  data: ApiPatient[];
  per_page: number;
  total: number;
}

export interface GetAdminPatientsParams {
  status?: string;
  search?: string;
  page?: number;
}

interface PatientActionResponse {
  message: string;
  patient: ApiPatient;
}

// ─── useGetAdminPatients  →  GET /admin/patients ─────────────────────────────

export function useGetAdminPatients(params: GetAdminPatientsParams = {}) {
  const { status, search, page = 1 } = params;

  return useQuery<PaginatedPatients>({
    queryKey: ["admin-patients", { status, search, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)   qs.set("status", status);
      if (search)   qs.set("search", search);
      if (page > 1) qs.set("page", String(page));

      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<PaginatedPatients>(url);
    },
  });
}

// ─── useSuspendPatient  →  PUT /admin/patients/{id}/suspend ──────────────────

export function useSuspendPatient() {
  const qc = useQueryClient();

  return useMutation<ApiPatient, Error, number>({
    mutationFn: (id) =>
      apiFetch<PatientActionResponse>(`${BASE}/${id}/suspend`, {
        method: "PUT",
      }).then((res) => res.patient),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
  });
}

// ─── useActivatePatient  →  PUT /admin/patients/{id}/activate ────────────────

export function useActivatePatient() {
  const qc = useQueryClient();

  return useMutation<ApiPatient, Error, number>({
    mutationFn: (id) =>
      apiFetch<PatientActionResponse>(`${BASE}/${id}/activate`, {
        method: "PUT",
      }).then((res) => res.patient),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
  });
}
