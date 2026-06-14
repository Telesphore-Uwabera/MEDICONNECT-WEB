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
  data: ApiInsurance[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface InsurancePayload {
  name: string;
  type?: string;
  code?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  country?: string;
  coverage_percentage?: string;
  is_active?: boolean;
  logo?: File | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a FormData from an InsurancePayload, omitting undefined/null fields. */
function buildFormData(payload: InsurancePayload): FormData {
  const form = new FormData();
  const { logo, is_active, ...rest } = payload;

  (Object.entries(rest) as [string, string | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        form.append(key, value);
      }
    },
  );

  if (is_active !== undefined) {
    form.append("is_active", is_active ? "true" : "false");
  }

  if (logo instanceof File) {
    form.append("logo", logo);
  }

  return form;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGetAdminInsurances(page = 1, search = "") {
  return useQuery<InsurancesResponse>({
    queryKey: ["admin-insurances", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      return apiFetch(`${BASE}?${params.toString()}`);
    },
  });
}

export function useCreateInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InsurancePayload) =>
      apiFetch(BASE, { method: "POST", body: buildFormData(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-insurances"] }),
  });
}

export function useUpdateInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: InsurancePayload & { id: number }) =>
      apiFetch(`${BASE}/${id}`, {
        method: "PUT",
        body: buildFormData(payload),
      }),
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
