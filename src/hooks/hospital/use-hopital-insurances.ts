import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Insurance from the global catalogue (/public/insurances) */
export interface PublicInsurance {
  id: number;
  name: string;
  code: string;
  logo: string | null;
  type: "public" | "private";
  default_percent: string | null;
}

/** Insurance already linked to this hospital */
export interface HospitalInsurance {
  id: number; // hospital_insurance link id (used in PUT / DELETE)
  insurance_id: number;
  name: string;
  code: string;
  logo: string | null;
  type: string;
  coverage_type: "full" | "partial";
  covered_percent: number | null;
  default_percent: string;
  effective_coverage: number;
  max_amount_covered: number | null;
  currency: string;
  notes: string | null;
}

/** POST /insurances body */
export interface LinkInsurancePayload {
  insurance_id: number;
  coverage_type: "full" | "partial";
  covered_percent?: number | null;
  max_amount_covered?: number | null;
  currency?: string;
  notes?: string | null;
}

/** PUT /insurances/{id} body — all fields optional */
export interface UpdateCoveragePayload {
  coverage_type?: "full" | "partial";
  covered_percent?: number | null;
  max_amount_covered?: number | null;
  currency?: string;
  notes?: string | null;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

const BASE = "/hospital/insurances";

export const insuranceKeys = {
  all: ["hospital-insurances"] as const,
  list: () => [...insuranceKeys.all, "list"] as const,
  detail: (id: number) => [...insuranceKeys.all, "detail", id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * GET /public/insurances
 * Full global catalogue — used in the "Link insurance" picker.
 * Cached for 5 minutes because it rarely changes.
 */
export function useGetPublicInsurances() {
  return useQuery({
    queryKey: ["public-insurances"],
    queryFn: () =>
      apiFetch<{ insurances: PublicInsurance[] }>("/public/insurances").then(
        (r) => r.insurances,
      ),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * GET /hospital/insurances
 * Insurances already linked to this hospital.
 */
export function useGetInsurances() {
  return useQuery({
    queryKey: insuranceKeys.list(),
    queryFn: () =>
      apiFetch<{ insurances: HospitalInsurance[] }>(BASE).then(
        (r) => r.insurances,
      ),
  });
}

/**
 * GET /hospital/insurances/{id}
 */
export function useGetInsurance(id: number | null) {
  return useQuery({
    queryKey: insuranceKeys.detail(id!),
    queryFn: () =>
      apiFetch<{ insurance: HospitalInsurance }>(`${BASE}/${id}`).then(
        (r) => r.insurance,
      ),
    enabled: id !== null,
  });
}

/**
 * POST /hospital/insurances
 * Links a global insurance to the hospital with coverage settings.
 */
export function useLinkInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LinkInsurancePayload) =>
      apiFetch<{ message: string; hospital_insurance: HospitalInsurance }>(
        BASE,
        { method: "POST", body: payload },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: insuranceKeys.all }),
  });
}

/**
 * PUT /hospital/insurances/{id}
 * Updates coverage settings for an already-linked insurance.
 */
export function useUpdateCoverage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateCoveragePayload;
    }) =>
      apiFetch<{ message: string; hospital_insurance: HospitalInsurance }>(
        `${BASE}/${id}`,
        { method: "PUT", body: payload },
      ),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: insuranceKeys.all });
      qc.invalidateQueries({ queryKey: insuranceKeys.detail(id) });
    },
  });
}

/**
 * POST /hospital/insurances/{id}/logo  (multipart/form-data)
 */
export function useUploadInsuranceLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const form = new FormData();
      form.append("logo", file);
      return apiFetch<{ message: string; insurance: HospitalInsurance }>(
        `${BASE}/${id}/logo`,
        { method: "POST", body: form },
      );
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: insuranceKeys.all });
      qc.invalidateQueries({ queryKey: insuranceKeys.detail(id) });
    },
  });
}

/**
 * DELETE /hospital/insurances/{id}
 * Unlinks an insurance from the hospital.
 */
export function useDeleteInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: insuranceKeys.all }),
  });
}
