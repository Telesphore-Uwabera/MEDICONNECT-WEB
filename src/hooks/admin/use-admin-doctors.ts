
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/doctors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiDoctorUser {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface ApiDoctor {
  id: number;
  status: "active" | "pending" | "suspended" | "rejected";
  specialization?: string | null;
  consultation_type?: "online" | "in_person" | "both" | string | null;
  is_active?: boolean;
  user: ApiDoctorUser;
  educations?: unknown[];
  experiences?: unknown[];
  qualifications?: unknown[];
  availabilities?: unknown[];
  socialLinks?: unknown[];
  hospitals?: unknown[];
  created_at: string;
}

export interface PaginatedDoctors {
  current_page: number;
  data: ApiDoctor[];
  per_page: number;
  total: number;
}

export interface GetAdminDoctorsParams {
  status?: string;
  specialization?: string;
  consultation_type?: string;
  search?: string;
  page?: number;
}

interface DoctorActionResponse {
  message: string;
  doctor: ApiDoctor;
}

// ─── useGetAdminDoctors  →  GET /admin/doctors ────────────────────────────────

export function useGetAdminDoctors(params: GetAdminDoctorsParams = {}) {
  const { status, specialization, consultation_type, search, page = 1 } = params;

  return useQuery<PaginatedDoctors>({
    queryKey: ["admin-doctors", { status, specialization, consultation_type, search, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)            qs.set("status", status);
      if (specialization)    qs.set("specialization", specialization);
      if (consultation_type) qs.set("consultation_type", consultation_type);
      if (search)            qs.set("search", search);
      if (page > 1)          qs.set("page", String(page));

      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<PaginatedDoctors>(url);
    },
  });
}

// ─── useGetAdminDoctor  →  GET /admin/doctors/{id} ───────────────────────────

export function useGetAdminDoctor(id: number | null) {
  return useQuery<ApiDoctor>({
    queryKey: ["admin-doctor", id],
    queryFn: () =>
      apiFetch<{ doctor: ApiDoctor }>(`${BASE}/${id}`).then(
        (res) => res.doctor,
      ),
    enabled: !!id,
  });
}

// ─── useApproveDoctor  →  PUT /admin/doctors/{id}/approve ────────────────────

export function useApproveDoctor() {
  const qc = useQueryClient();

  return useMutation<ApiDoctor, Error, number>({
    mutationFn: (id) =>
      apiFetch<DoctorActionResponse>(`${BASE}/${id}/approve`, {
        method: "PUT",
      }).then((res) => res.doctor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
  });
}

// ─── useRejectDoctor  →  PUT /admin/doctors/{id}/reject ──────────────────────

export function useRejectDoctor() {
  const qc = useQueryClient();

  return useMutation<ApiDoctor, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<DoctorActionResponse>(`${BASE}/${id}/reject`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then((res) => res.doctor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
  });
}

// ─── useSuspendDoctor  →  PUT /admin/doctors/{id}/suspend ────────────────────

export function useSuspendDoctor() {
  const qc = useQueryClient();

  return useMutation<ApiDoctor, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<DoctorActionResponse>(`${BASE}/${id}/suspend`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then((res) => res.doctor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
  });
}

