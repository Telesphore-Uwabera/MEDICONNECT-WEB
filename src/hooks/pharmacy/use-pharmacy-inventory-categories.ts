import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/pharmacy/inventory/categories";
const QK = ["inventory-categories"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  pharmacy_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  medicines_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /inventory/categories
// ─────────────────────────────────────────────────────────────────────────────
export function useGetInventoryCategories() {
  return useQuery({
    queryKey: QK,
    queryFn: () =>
      apiFetch<{ categories: Category[] }>(BASE).then((r) => r.categories),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /inventory/categories
// ─────────────────────────────────────────────────────────────────────────────
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      apiFetch<{ message: string; category: Category }>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /inventory/categories/{id}
// ─────────────────────────────────────────────────────────────────────────────
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCategoryPayload }) =>
      apiFetch<{ message: string; category: Category }>(`${BASE}/${id}`, {
        method: "PUT",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /inventory/categories/{id}
// ─────────────────────────────────────────────────────────────────────────────
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
    },
  });
}
