import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiSpecialization {
  id: number;
  name: string;
  name_fr?: string | null;
  name_kiny?: string | null;
  slug: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  doctors_count?: number;
  created_at?: string;
}

export interface ApiSpecializationFee {
  id: number;
  /** Can be null for orphaned/legacy fees not linked to a specialization */
  specialization_id: number | null;
  slug: string;
  sub_specialization?: string | null;
  sub_specialization_fr?: string | null;
  sub_specialization_kiny?: string | null;
  tier_name?: string | null;
  online_fee: number;
  in_person_fee: number;
  currency: string;
  description?: string | null;
  is_active: boolean;
  doctor_specialization_fees_count?: number;
  /** Populated by the API when specialization_id is set */
  specialization_model?: {
    id: number;
    name: string;
    name_fr?: string | null;
    name_kiny?: string | null;
  } | null;
  created_at?: string;
}

export interface SpecializationListParams {
  search?: string;
  is_active?: boolean;
  page?: number;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface SpecializationListResponse {
  data: ApiSpecialization[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const SPEC_KEY = ["specializations"] as const;
const FEES_KEY = ["specialization-fees"] as const;

// ─── Specializations ──────────────────────────────────────────────────────────

/** GET /admin/specializations */
export function useGetSpecializations(params?: SpecializationListParams) {
  const query = new URLSearchParams();
  if (params?.search)                  query.set("search",    params.search);
  if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params?.page)                    query.set("page",      String(params.page));

  const qs = query.toString();

  return useQuery({
    queryKey: [...SPEC_KEY, params],
    queryFn: () =>
      apiFetch<SpecializationListResponse>(
        `/admin/specializations${qs ? `?${qs}` : ""}`
      ),
  });
}

/** POST /admin/specializations */
export function useCreateSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      name_fr?: string;
      name_kiny?: string;
      description?: string;
      icon?: string;
    }) =>
      apiFetch<{ message: string; specialization: ApiSpecialization }>(
        "/admin/specializations",
        { method: "POST", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPEC_KEY }),
  });
}

/** PUT /admin/specializations/:id */
export function useUpdateSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      name?: string;
      name_fr?: string;
      name_kiny?: string;
      description?: string;
      icon?: string;
      is_active?: boolean;
    }) =>
      apiFetch<{ message: string; specialization: ApiSpecialization }>(
        `/admin/specializations/${id}`,
        { method: "PUT", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPEC_KEY }),
  });
}

/** DELETE /admin/specializations/:id */
export function useDeleteSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/admin/specializations/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SPEC_KEY });
      qc.invalidateQueries({ queryKey: FEES_KEY });
    },
  });
}

// ─── Specialization Fees (Sub-specializations) ────────────────────────────────

/** GET /admin/specialization-fees */
export function useGetSpecializationFees() {
  return useQuery({
    queryKey: FEES_KEY,
    queryFn: () =>
      apiFetch<{ specialization_fees: ApiSpecializationFee[] }>(
        "/admin/specialization-fees"
      ).then((res) => res.specialization_fees),
  });
}

/** POST /admin/specialization-fees */
export function useCreateSpecializationFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      specialization_id: number;
      sub_specialization: string;
      sub_specialization_fr?: string;
      sub_specialization_kiny?: string;
      tier_name: string;
      online_fee: number;
      in_person_fee: number;
      currency?: string;
      description?: string;
    }) =>
      apiFetch<{ message: string; fee: ApiSpecializationFee }>(
        "/admin/specialization-fees",
        { method: "POST", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEES_KEY }),
  });
}

/** PUT /admin/specialization-fees/:id */
export function useUpdateSpecializationFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      online_fee?: number;
      in_person_fee?: number;
      is_active?: boolean;
      tier_name?: string;
      description?: string;
    }) =>
      apiFetch<{ message: string; fee: ApiSpecializationFee }>(
        `/admin/specialization-fees/${id}`,
        { method: "PUT", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEES_KEY }),
  });
}

/** DELETE /admin/specialization-fees/:id */
export function useDeleteSpecializationFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/admin/specialization-fees/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEES_KEY }),
  });
}
