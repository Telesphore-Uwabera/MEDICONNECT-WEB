import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/doctor/prescriptions";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type PrescriptionStatus =
  | "draft"
  | "issued"
  | "sent_to_pharmacy"
  | "filled"
  | "cancelled"
  | "active"
  | "pending"
  | "dispensed"
  | "expired"
  | "completed"
  | "rejected"
  | "returned";

export interface PrescriptionItem {
  id?: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export interface Prescription {
  id: number;
  appointment_id?: number;
  prescription_number?: string;
  pdf_url?: string;
  qr_code?: string;
  diagnosis: string;
  notes?: string;
  valid_until?: string;
  status: PrescriptionStatus;
  is_signed?: boolean;
  signed_at?: string;
  issued_at?: string;
  created_at: string;
  updated_at?: string;
  patient?: {
    id: number;
    name: string;
    phone?: string;
    country_code?: string;
    email?: string;
  };
  appointment?: {
    id: number;
    type: "online" | "in_person";
    status: string;
    booking_type: string;
    appointment_date?: string;
    appointment_time?: string;
    duration_minutes?: number | string;
    consultation_fee: string;
    currency: string;
    payment_status: string;
    payment_method?: string;
    payment_reference?: string;
  };
  pharmacy?: {
    id: number;
    name: string;
    address?: string;
  };
  items: PrescriptionItem[];
  delivery_type?: string;
  delivery_notes?: string;
}

/**
 * Shape of the inner paginated object returned by the API:
 *   GET /doctor/prescriptions → { status, data: { current_page, data: [], total, ... } }
 * The hook unwraps the outer `{ status, data }` wrapper so callers receive this directly.
 */
export interface PrescriptionsListResponse {
  data: Prescription[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface PrescriptionListParams {
  /** Full-text search: patient name, diagnosis, prescription number */
  q?: string;
  status?: PrescriptionStatus | "All";
  is_signed?: boolean;
  valid_only?: boolean;
  expired_only?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: "created_at" | "valid_until" | "status" | "patient";
  sort_order?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

export interface CreatePrescriptionPayload {
  appointment_id?: number;
  diagnosis: string;
  notes?: string;
  valid_until?: string;
  items: PrescriptionItem[];
}

export interface AddItemPayload {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export interface SendToPharmacyPayload {
  pharmacy_id: number;
  delivery_type: "pickup" | "home_delivery";
  /** Required when delivery_type is "home_delivery". */
  delivery_address?: string;
  notes?: string;
}

/* ─────────────────────────────────────────────
   Query key factory
───────────────────────────────────────────── */

export const prescriptionKeys = {
  all:    ()                                 => ["doctor-prescriptions"] as const,
  list:   (params?: PrescriptionListParams)  => ["doctor-prescriptions", "list", params] as const,
  detail: (id: number)                       => ["doctor-prescriptions", "detail", id] as const,
};

/* ─────────────────────────────────────────────
   useGetPrescriptions  →  GET /doctor/prescriptions
   
   The API wraps the paginated list in an extra layer:
     { status: true, data: { current_page, data: [], total, ... } }
   We unwrap res.data so the hook consumer sees PrescriptionsListResponse
   directly as `useGetPrescriptions().data`.
───────────────────────────────────────────── */

export function useGetPrescriptions(params?: PrescriptionListParams) {
  return useQuery({
    queryKey: prescriptionKeys.list(params),
    queryFn: async (): Promise<PrescriptionsListResponse> => {
      const qs = new URLSearchParams();

      if (params?.q)                        qs.set("q",            params.q);
      if (params?.status && params.status !== "All")
                                            qs.set("status",       params.status);
      if (params?.is_signed !== undefined)  qs.set("is_signed",    String(params.is_signed));
      if (params?.valid_only)               qs.set("valid_only",   "true");
      if (params?.expired_only)             qs.set("expired_only", "true");
      if (params?.date_from)                qs.set("date_from",    params.date_from);
      if (params?.date_to)                  qs.set("date_to",      params.date_to);
      if (params?.sort_by)                  qs.set("sort_by",      params.sort_by);
      if (params?.sort_order)               qs.set("sort_order",   params.sort_order);
      if (params?.per_page)                 qs.set("per_page",     String(params.per_page));
      if (params?.page)                     qs.set("page",         String(params.page));

      const url = qs.toString() ? `${BASE}?${qs}` : BASE;

      // API shape: { status: true, data: { current_page, data: Prescription[], total } }
      const res = await apiFetch<{ data: PrescriptionsListResponse }>(url);

      // Unwrap the outer envelope — caller gets PrescriptionsListResponse directly
      return res.data;
    },
  });
}

/* ─────────────────────────────────────────────
   useGetPrescription  →  GET /doctor/prescriptions/:id
───────────────────────────────────────────── */

export function useGetPrescription(id: number) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id),
    queryFn:  () => apiFetch<{ prescription: Prescription }>(`${BASE}/${id}`),
    enabled:  !!id,
  });
}

/* ─────────────────────────────────────────────
   useCreatePrescription  →  POST /doctor/prescriptions
───────────────────────────────────────────── */

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePrescriptionPayload) =>
      apiFetch<{ message: string; prescription: Prescription }>(BASE, {
        method: "POST",
        body:   payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.list() });
    },
  });
}

/* ─────────────────────────────────────────────
   useAddItem  →  POST /doctor/prescriptions/:id/items
───────────────────────────────────────────── */

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AddItemPayload }) =>
      apiFetch<{ message: string; item: PrescriptionItem }>(`${BASE}/${id}/items`, {
        method: "POST",
        body:   payload,
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: prescriptionKeys.list() });
    },
  });
}

/* ─────────────────────────────────────────────
   useRemoveItem  →  DELETE /doctor/prescriptions/:id/items/:itemId
───────────────────────────────────────────── */

export function useRemoveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: number; itemId: number }) =>
      apiFetch<{ message: string }>(`${BASE}/${id}/items/${itemId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: prescriptionKeys.list() });
    },
  });
}

/* ─────────────────────────────────────────────
   useIssuePrescription  →  POST /doctor/prescriptions/:id/issue
───────────────────────────────────────────── */

export function useIssuePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string; prescription: Prescription }>(`${BASE}/${id}/issue`, {
        method: "POST",
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: prescriptionKeys.list() });
    },
  });
}

/* ─────────────────────────────────────────────
   useSendToPharmacy  →  POST /doctor/prescriptions/:id/send-to-pharmacy
───────────────────────────────────────────── */

export function useSendToPharmacy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SendToPharmacyPayload }) =>
      apiFetch<{ message: string; prescription: Prescription }>(`${BASE}/${id}/send-to-pharmacy`, {
        method: "POST",
        body:   payload,
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
      qc.invalidateQueries({ queryKey: prescriptionKeys.list() });
    },
  });
}
