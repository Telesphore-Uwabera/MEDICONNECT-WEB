import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/pharmacy/inventory/medicines";
const QK = ["inventory-medicines"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MedicineUnit =
  | "tablet"
  | "capsule"
  | "syrup"
  | "injection"
  | "cream"
  | "drops"
  | "sachet"
  | "other";

export interface MedicineStock {
  quantity: number;
  low_stock_threshold: number;
  batch_number: string | null;
  expiry_date: string | null;
}

export interface MedicineCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface Medicine {
  id: number;
  pharmacy_id: number;
  category_id: number | null;
  name: string;
  generic_name: string | null;
  description: string | null;
  price: string; // decimal string from API e.g. "1200.00"
  currency: string;
  unit: MedicineUnit;
  requires_prescription: boolean;
  barcode: string | null;
  is_active: boolean;
  category: MedicineCategory | null;
  stock: MedicineStock | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedMedicines {
  data: Medicine[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ListMedicinesParams {
  category_id?: number;
  search?: string;
  low_stock?: true;
}

export interface CreateMedicinePayload {
  // required
  name: string;
  price: number;
  unit: MedicineUnit;
  // optional
  generic_name?: string;
  category_id?: number;
  description?: string;
  currency?: string;
  requires_prescription?: boolean;
  barcode?: string;
  initial_quantity?: number;
  low_stock_threshold?: number;
  batch_number?: string;
  expiry_date?: string;
}

export type UpdateMedicinePayload = Partial<
  Omit<
    CreateMedicinePayload,
    "initial_quantity" | "low_stock_threshold" | "batch_number" | "expiry_date"
  >
>;

// ─────────────────────────────────────────────────────────────────────────────
// 17. List Medicines  GET /inventory/medicines
//     ?category_id=  ?search=  ?low_stock=true
// ─────────────────────────────────────────────────────────────────────────────
export function useGetInventoryMedicines(params?: ListMedicinesParams) {
  const qs = new URLSearchParams();
  if (params?.category_id) qs.set("category_id", String(params.category_id));
  if (params?.search)      qs.set("search", params.search);
  if (params?.low_stock)   qs.set("low_stock", "true");
  const query = qs.toString() ? `?${qs}` : "";

  return useQuery<PaginatedMedicines>({
    queryKey: [...QK, params ?? {}],
    queryFn: () => apiFetch<PaginatedMedicines>(`${BASE}${query}`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 18. Get Single Medicine  GET /inventory/medicines/{id}
// ─────────────────────────────────────────────────────────────────────────────
export function useGetMedicine(id: number | null) {
  return useQuery<Medicine>({
    queryKey: [...QK, id],
    enabled: id != null,
    queryFn: () =>
      apiFetch<{ medicine: Medicine }>(`${BASE}/${id}`).then((r) => r.medicine),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 19. Add Medicine  POST /inventory/medicines
// ─────────────────────────────────────────────────────────────────────────────
export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation<{ message: string; medicine: Medicine }, Error, CreateMedicinePayload>({
    mutationFn: (payload) =>
      apiFetch(`${BASE}`, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 20. Update Medicine  PUT /inventory/medicines/{id}
// ─────────────────────────────────────────────────────────────────────────────
export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; medicine: Medicine },
    Error,
    { id: number; payload: UpdateMedicinePayload }
  >({
    mutationFn: ({ id, payload }) =>
      apiFetch(`${BASE}/${id}`, { method: "PUT", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 21. Delete Medicine  DELETE /inventory/medicines/{id}
// ─────────────────────────────────────────────────────────────────────────────
export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, number>({
    mutationFn: (id) => apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
}
