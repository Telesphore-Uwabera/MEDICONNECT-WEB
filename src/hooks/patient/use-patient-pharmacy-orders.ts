import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/patient/pharmacy-orders";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type OrderStatus =
  | "draft"
  | "pending"
  | "accepted"
  | "completed"
  | "cancelled";

export interface OrderItem {
  id: number;
  medicine_name: string;
  quantity: number;
  dosage?: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  address?: string;
  phone?: string;
}

export interface PharmacyOrder {
  id: number;
  status: OrderStatus;
  delivery_type: "pickup" | "home_delivery";
  delivery_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  pharmacy: Pharmacy;
  items: OrderItem[];
  prescription_id?: number;
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

export interface PharmacyOrdersResponse {
  data: PharmacyOrder[];
  meta?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface OrderFilters {
  status?: OrderStatus;
  pharmacy_id?: number;
  from_date?: string;
  to_date?: string;
}

/* ─────────────────────────────────────────────
   useGetPatientPharmacyOrders  →  GET /patient/pharmacy-orders
───────────────────────────────────────────── */

export function useGetPatientPharmacyOrders(filters?: OrderFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.pharmacy_id) params.set("pharmacy_id", String(filters.pharmacy_id));
  if (filters?.from_date) params.set("from_date", filters.from_date);
  if (filters?.to_date) params.set("to_date", filters.to_date);

  const query = params.toString();
  const url = query ? `${BASE}?${query}` : BASE;

  return useQuery<PharmacyOrdersResponse>({
    queryKey: ["patient-pharmacy-orders", filters],
    queryFn: () =>
      apiFetch<PharmacyOrdersResponse>(url).then((res) => {
        console.log("patient pharmacy orders fetched:", res);
        return res;
      }),
  });
}

/* ─────────────────────────────────────────────
   useGetPatientPharmacyOrder  →  GET /patient/pharmacy-orders/:id
───────────────────────────────────────────── */

export function useGetPatientPharmacyOrder(id: number | null) {
  return useQuery<{ data: PharmacyOrder }>({
    queryKey: ["patient-pharmacy-order", id],
    queryFn: () => apiFetch<{ data: PharmacyOrder }>(`${BASE}/${id}`),
    enabled: !!id,
  });
}

/* ─────────────────────────────────────────────
   useCancelPatientPharmacyOrder  →  DELETE /patient/pharmacy-orders/:id
───────────────────────────────────────────── */

export function useCancelPatientPharmacyOrder() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, number>({
    mutationFn: (id) =>
      apiFetch<{ message: string }>(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-pharmacy-orders"] });
    },
  });
}
