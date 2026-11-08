import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { listFrom } from "@/lib/list-payload";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiSpeciality {
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

export interface ApiSpecialityFee {
  id: number;
  /** Can be null for orphaned/legacy fees not linked to a speciality */
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
  doctor_speciality_fees_count?: number;
  /** Populated by the API when speciality_id is set */
  speciality_model?: {
    id: number;
    name: string;
    name_fr?: string | null;
    name_kiny?: string | null;
  } | null;
  created_at?: string;
}

export interface SpecialityListParams {
  search?: string;
  is_active?: boolean;
  page?: number;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface SpecialityListResponse {
  data: ApiSpeciality[];
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

// ─── Specialities ──────────────────────────────────────────────────────────

/** GET /admin/specialities */
export function useGetSpecialities(params?: SpecialityListParams) {
  const query = new URLSearchParams();
  if (params?.search)                  query.set("search",    params.search);
  if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params?.page)                    query.set("page",      String(params.page));

  const qs = query.toString();

  return useQuery({
    queryKey: [...SPEC_KEY, params],
    queryFn: () =>
      apiFetch<SpecialityListResponse>(
        `/admin/specializations${qs ? `?${qs}` : ""}`
      ),
  });
}

/** POST /admin/specialities */
export function useCreateSpeciality() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      name_fr?: string;
      name_kiny?: string;
      description?: string;
      icon?: string;
    }) =>
      apiFetch<{ message: string; specialization: ApiSpeciality }>(
        "/admin/specializations",
        { method: "POST", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPEC_KEY }),
  });
}

/** PUT /admin/specialities/:id */
export function useUpdateSpeciality() {
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
      apiFetch<{ message: string; specialization: ApiSpeciality }>(
        `/admin/specializations/${id}`,
        { method: "PUT", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPEC_KEY }),
  });
}

/** DELETE /admin/specialities/:id */
export function useDeleteSpeciality() {
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

// ─── Speciality Fees (Sub-specialities) ────────────────────────────────

/** GET /admin/speciality-fees */
export function useGetSpecialityFees() {
  return useQuery({
    queryKey: FEES_KEY,
    queryFn: () =>
      apiFetch<unknown>("/admin/specialization-fees?per_page=100").then((res) =>
        listFrom<ApiSpecialityFee>(res, "specialization_fees"),
      ),
  });
}

/** POST /admin/speciality-fees */
export function useCreateSpecialityFee() {
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
      apiFetch<{ message: string; fee: ApiSpecialityFee }>(
        "/admin/specialization-fees",
        { method: "POST", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEES_KEY }),
  });
}

/** PUT /admin/speciality-fees/:id */
export function useUpdateSpecialityFee() {
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
      apiFetch<{ message: string; fee: ApiSpecialityFee }>(
        `/admin/specialization-fees/${id}`,
        { method: "PUT", body: payload }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEES_KEY }),
  });
}

/** DELETE /admin/speciality-fees/:id */
export function useDeleteSpecialityFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/admin/specialization-fees/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEES_KEY }),
  });
}
