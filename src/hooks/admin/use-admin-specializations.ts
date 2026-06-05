import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiSpecialization {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  created_at?: string;
}

export interface ApiSpecializationFee {
  id: number;
  specialization: string;
  slug: string;
  online_fee: number;
  in_person_fee: number;
  currency: string;
  is_active: boolean;
  doctor_consultations_count?: number;
  created_at?: string;
  /** Injected client-side after merging with specializations list */
  specialization_id?: number;
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const SPEC_KEY = ["specializations"] as const;
const FEES_KEY = ["specialization-fees"] as const;

// ─── Specializations ──────────────────────────────────────────────────────────

/** GET /admin/specializations */
export function useGetSpecializations() {
  return useQuery({
    queryKey: SPEC_KEY,
    queryFn: () =>
      apiFetch<{ data: ApiSpecialization[] }>(
        "/admin/specializations"
      ).then((res) => res.data),  // ✅ Correct key
  });
}

/** POST /admin/specializations */
export function useCreateSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      apiFetch<{ specialization: ApiSpecialization }>(
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
      name: string;
      description?: string;
    }) =>
      apiFetch<{ specialization: ApiSpecialization }>(
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

// ─── Specialization Fees ──────────────────────────────────────────────────────

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
