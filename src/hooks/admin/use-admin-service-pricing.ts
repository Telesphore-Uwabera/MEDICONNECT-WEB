import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPricingItem {
  key: string;
  value: number;
  currency: string;
  updated_at: string;
}

export interface GetServicePricingResponse {
  pricing: ApiPricingItem[];
}

export interface UpdatePricingResponse {
  message: string;
  pricing: { key: string; value: number };
}

export interface BulkUpdatePricingResponse {
  message: string;
  pricing: { key: string; value: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE = "/admin/service-pricing";

// ─── Hooks ────────────────────────────────────────────────────────────────────

/* GET /admin/service-pricing */
export function useGetServicePricing() {
  return useQuery<GetServicePricingResponse>({
    queryKey: ["service-pricing"],
    queryFn: () => apiFetch(BASE),
  });
}

/* PUT /admin/service-pricing/{key} */
export function useUpdateServicePricing() {
  const qc = useQueryClient();
  return useMutation<UpdatePricingResponse, Error, { key: string; value: number }>({
    mutationFn: ({ key, value }) =>
      apiFetch(`${BASE}/${key}`, { method: "PUT", body: { value } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-pricing"] }),
  });
}

/* PUT /admin/service-pricing/bulk */
export function useBulkUpdateServicePricing() {
  const qc = useQueryClient();
  return useMutation<BulkUpdatePricingResponse, Error, Record<string, number>>({
    mutationFn: (prices) =>
      apiFetch(`${BASE}/bulk`, { method: "PUT", body: { prices } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-pricing"] }),
  });
}
