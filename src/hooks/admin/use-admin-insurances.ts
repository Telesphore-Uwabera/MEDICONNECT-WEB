import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/insurances";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiInsurance {
  id: number;
  name: string;
  logo: string | null;
  code?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  country?: string;
  type?: string;
  is_active?: boolean;
  coverage_percentage?: string;
  created_at: string;
}

export interface InsurancesResponse {
  insurances: ApiInsurance[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGetAdminInsurances() {
  return useQuery<InsurancesResponse>({
    queryKey: ["admin-insurances"],
    queryFn: () => apiFetch(BASE),
  });
}

export function useCreateInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string }) =>
      apiFetch(BASE, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-insurances"] }),
  });
}

export function useUpdateInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-insurances"] }),
  });
}

export function useUploadInsuranceLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const form = new FormData();
      form.append("logo", file);
      return apiFetch(`${BASE}/${id}/logo`, { method: "POST", body: form });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-insurances"] }),
  });
}

export function useDeleteInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-insurances"] }),
  });
}
