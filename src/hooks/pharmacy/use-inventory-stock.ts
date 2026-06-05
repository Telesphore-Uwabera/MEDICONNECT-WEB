import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/pharmacy/inventory/stock-requests";

/* ── Types ──────────────────────────────────────────────────────────── */

export type StockRequestStatus =
  | "pending"
  | "approved"
  | "received"
  | "rejected";

export interface Medicine {
  id: number;
  name: string;
  generic_name?: string;
  category?: { id: number; name: string };
  [key: string]: unknown;
}

export interface StockRequest {
  id: number;
  pharmacy_id: number;
  medicine_id: number;
  requested_quantity: number;
  received_quantity?: number;
  notes?: string;
  status: StockRequestStatus;
  batch_number?: string;
  expiry_date?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
  medicine?: Medicine;
  requester?: { id: number; name: string; email: string };
}

export interface PaginatedStockRequests {
  data: StockRequest[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CreateStockRequestPayload {
  medicine_id: number;
  requested_quantity: number;
  notes?: string;
}

export interface ReceiveStockPayload {
  received_quantity?: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface RejectStockRequestPayload {
  reason: string;
}

/* ─────────────────────────────────────────────────────────────────────
   26. List Stock Requests  GET /inventory/stock-requests
       ?status=pending | approved | received | rejected
───────────────────────────────────────────────────────────────────── */
export function useGetStockRequests(status?: StockRequestStatus) {
  const query = status ? `?status=${status}` : "";
  return useQuery<PaginatedStockRequests>({
    queryKey: ["stock-requests", status ?? "all"],
    queryFn: () =>
      apiFetch<PaginatedStockRequests>(`${BASE}${query}`).then((res) => {
        console.log("Stock requests fetched:", res);
        return res;
      }),
  });
}

/* ─────────────────────────────────────────────────────────────────────
   27. Create Stock Request  POST /inventory/stock-requests
───────────────────────────────────────────────────────────────────── */
export function useCreateStockRequest() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; stock_request: StockRequest },
    Error,
    CreateStockRequestPayload
  >({
    mutationFn: (payload) =>
      apiFetch(`${BASE}`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-requests"] });
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────
   28. Approve Stock Request  POST /inventory/stock-requests/{id}/approve
───────────────────────────────────────────────────────────────────── */
export function useApproveStockRequest() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; stock_request: StockRequest },
    Error,
    number
  >({
    mutationFn: (id) =>
      apiFetch(`${BASE}/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-requests"] });
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────
   29. Receive Stock  POST /inventory/stock-requests/{id}/receive
───────────────────────────────────────────────────────────────────── */
export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; stock_request: StockRequest },
    Error,
    { id: number; payload?: ReceiveStockPayload }
  >({
    mutationFn: ({ id, payload }) =>
      apiFetch(`${BASE}/${id}/receive`, { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-requests"] });
      qc.invalidateQueries({ queryKey: ["inventory-stock"] });
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────
   30. Reject Stock Request  POST /inventory/stock-requests/{id}/reject
───────────────────────────────────────────────────────────────────── */
export function useRejectStockRequest() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; stock_request: StockRequest },
    Error,
    { id: number; reason: string }
  >({
    mutationFn: ({ id, reason }) =>
      apiFetch(`${BASE}/${id}/reject`, { method: "POST", body: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-requests"] });
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────
   31. Delete Stock Request  DELETE /inventory/stock-requests/{id}
       Only pending requests can be deleted.
───────────────────────────────────────────────────────────────────── */
export function useDeleteStockRequest() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, number>({
    mutationFn: (id) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-requests"] });
    },
  });
}
