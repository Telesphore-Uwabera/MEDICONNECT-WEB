/**
 * usePharmacyOrders.ts
 *
 * Covers every endpoint from the Orders API spec:
 *
 *  38. GET  /orders                   → useGetOrders(params)
 *  39. GET  /orders/:id               → useGetOrder(id)
 *  40. POST /orders/:id/accept        → useAcceptOrder()
 *  41. POST /orders/:id/reject        → useRejectOrder()
 *  42. POST /orders/:id/complete      → useCompleteOrder()
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Shared query-key factory ─────────────────────────────────────────────────
// Centralised so any invalidation is consistent across hooks.

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params: ListOrdersParams) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "accepted" | "completed" | "rejected";
export type OrderSource = "internal" | "external";

export interface OrderItem {
  medicine_name: string;
  quantity: number;
  unit_price: string;   // decimal string e.g. "1200.00"
  total_price: string;
}

export interface OrderPatient {
  id: number;
  name: string;
  phone?: string;
  [key: string]: unknown;
}

export interface Order {
  id: number;
  pharmacy_id: number;
  order_number: string;   // e.g. "ORD-ABC123"
  status: OrderStatus;
  source: OrderSource;
  total_amount: string;   // decimal string
  currency: string;       // e.g. "RWF"
  delivery_type: string;  // "delivery" | "pickup"
  delivery_address?: string;
  created_at?: string;
  updated_at?: string;
  patient: OrderPatient;
  items: OrderItem[];
  receipt_url?: string | null;
  invoice_url?: string | null;
  pdf_url?: string | null;
  receipt?: { url?: string | null } | null;
  invoice?: { url?: string | null } | null;
  payment?: {
    receipt_url?: string | null;
    invoice_url?: string | null;
    [key: string]: unknown;
  } | null;
}

export interface PaginatedOrders {
  data: Order[];
  meta?: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
  links?: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
}

export interface SingleOrderResponse {
  order: Order;
}

export interface OrderActionResponse {
  message: string;
  order: Order;
}

// ─── 38. List Orders — GET /orders ───────────────────────────────────────────
//
// Supported query params:
//   ?status=pending | accepted | completed | rejected
//   ?source=internal | external
//
// Both are optional. When omitted the API returns all orders.

export interface ListOrdersParams {
  status?: OrderStatus;
  source?: OrderSource;
}

export function useGetOrders(params: ListOrdersParams = {}) {
  // Build query string only for params that are actually set
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.source) qs.set("source", params.source);
  const queryString = qs.toString();

  return useQuery<PaginatedOrders>({
    queryKey: orderKeys.list(params),
    queryFn: () =>
      apiFetch<PaginatedOrders>(
        `/pharmacy/orders${queryString ? `?${queryString}` : ""}`,
      ),
  });
}

// ─── 39. Get Single Order — GET /orders/:id ───────────────────────────────────
//
// Returns full order detail including patient object and items array.
// Pass `enabled: false` to skip fetching (e.g. when id is undefined).

export function useGetOrder(id: number | undefined) {
  return useQuery<Order>({
    queryKey: orderKeys.detail(id!),
    queryFn: async () => {
      const res = await apiFetch<SingleOrderResponse>(`/pharmacy/orders/${id}`);
      return res.order;
    },
    enabled: id !== undefined && id > 0,
  });
}

// ─── 40. Accept Order — POST /orders/:id/accept ───────────────────────────────
//
// No request body required.
// On success → invalidates both the list and the specific detail cache.

export function useAcceptOrder() {
  const qc = useQueryClient();

  return useMutation<OrderActionResponse, Error, number>({
    mutationFn: (id: number) =>
      apiFetch<OrderActionResponse>(`/pharmacy/orders/${id}/accept`, {
        method: "POST",
      }),
    onSuccess: (_data, id) => {
      // Refresh the orders list (all param combinations)
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      // Also refresh the individual order detail if it was cached
      qc.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}

// ─── 41. Reject Order — POST /orders/:id/reject ───────────────────────────────
//
// Requires body: { reason: string }
// On success → invalidates list + detail.

export interface RejectOrderPayload {
  id: number;
  reason: string;
}

export function useRejectOrder() {
  const qc = useQueryClient();

  return useMutation<OrderActionResponse, Error, RejectOrderPayload>({
    mutationFn: ({ id, reason }: RejectOrderPayload) =>
      apiFetch<OrderActionResponse>(`/pharmacy/orders/${id}/reject`, {
        method: "POST",
        // apiFetch accepts body as unknown and JSON.stringify's it internally.
        // It also sets Content-Type: application/json automatically for plain objects.
        body: { reason },
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}

// ─── 42. Complete Order — POST /orders/:id/complete ───────────────────────────
//
// No request body required.
// Internal orders: stock is auto-deducted by the API.
// External orders: no stock deduction (handled by partner).
// On success → invalidates list + detail.

export function useCompleteOrder() {
  const qc = useQueryClient();

  return useMutation<OrderActionResponse, Error, number>({
    mutationFn: (id: number) =>
      apiFetch<OrderActionResponse>(`/pharmacy/orders/${id}/complete`, {
        method: "POST",
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: orderKeys.lists() });
      qc.invalidateQueries({ queryKey: orderKeys.detail(id) });
    },
  });
}


