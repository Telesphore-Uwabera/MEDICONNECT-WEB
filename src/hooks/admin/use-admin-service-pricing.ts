import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPricingItem {
  key: string;
  value: number;
  currency: string;
  updated_at: string;
  name?: string;
  description?: string;
  is_paid?: boolean;
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
    queryFn: async () => {
      const res = await apiFetch<Record<string, unknown>>(BASE);
      // The API returns a paginated list of service_pricing rows
      // ({ data: [{ service_key, price, ... }] }); older builds returned
      // { pricing: [{ key, value, ... }] }. Support both.
      const rows = Array.isArray(res?.pricing)
        ? (res.pricing as Record<string, unknown>[])
        : Array.isArray(res?.data)
          ? (res.data as Record<string, unknown>[])
          : [];
      return {
        pricing: rows.map((row) => ({
          key: String(row.service_key ?? row.key ?? ""),
          value: Number(row.price ?? row.value ?? 0),
          currency: String(row.currency ?? "RWF"),
          updated_at: String(row.updated_at ?? ""),
          name: row.name == null ? undefined : String(row.name),
          description: row.description == null ? undefined : String(row.description),
          is_paid: row.is_paid == null ? undefined : Boolean(row.is_paid),
        })),
      };
    },
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
