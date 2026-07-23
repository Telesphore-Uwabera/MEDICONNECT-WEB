import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type RefundStatus = "pending" | "approved" | "rejected" | "completed" | string | null;

export interface RefundPayment {
  uuid?: string;
  invoice_number?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  paid_at?: string | null;
  [key: string]: unknown;
}

export interface PatientRefund {
  id: number;
  uuid: string;
  status?: RefundStatus;
  reason: string;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  payment?: RefundPayment | null;
  admin?: {
    id?: number;
    name?: string | null;
    email?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface PatientRefundsResponse {
  current_page?: number;
  data?: PatientRefund[] | PatientRefundsResponse | Record<string, PatientRefund>;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface CreateRefundPayload {
  /** At least one of payment_uuid / invoice_number is required. */
  payment_uuid?: string;
  invoice_number?: string;
  reason: string;
}

/** Identify a refund by its own uuid, its payment's invoice_number, or both. */
export interface RefundLookupParams {
  uuid?: string | null;
  invoiceNumber?: string | null;
}

function hasRefundLookupParams(params: RefundLookupParams | null | undefined): boolean {
  return !!params && (!!params.uuid?.trim() || !!params.invoiceNumber?.trim());
}

function buildRefundUrl(base: string, params: RefundLookupParams | null | undefined): string {
  const uuid = params?.uuid?.trim();
  const invoiceNumber = params?.invoiceNumber?.trim();

  const path = uuid ? `${base}/${encodeURIComponent(uuid)}` : base;
  const qs = new URLSearchParams();
  if (invoiceNumber) qs.set("invoice_number", invoiceNumber);
  return qs.toString() ? `${path}?${qs}` : path;
}

const refundsKey = (status?: string) => ["patient-refunds", status ?? "all"] as const;
const refundKey = (params: RefundLookupParams | null | undefined) =>
  ["patient-refund", params?.uuid ?? "", params?.invoiceNumber ?? ""] as const;

export function getRefundsFromResponse(response?: PatientRefundsResponse | PatientRefund[]) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && typeof response.data === "object") {
    const nested = response.data as PatientRefundsResponse | Record<string, PatientRefund>;
    if (Array.isArray((nested as PatientRefundsResponse).data)) {
      return (nested as PatientRefundsResponse).data as PatientRefund[];
    }
    return Object.values(nested).filter(
      (value): value is PatientRefund =>
        !!value && typeof value === "object" && "status" in value,
    );
  }
  return [];
}

export function getRefundsTotal(response?: PatientRefundsResponse | PatientRefund[]) {
  if (!response) return 0;
  if (Array.isArray(response)) return response.length;
  if (typeof response.total === "number") return response.total;
  if (response.data && !Array.isArray(response.data) && typeof response.data === "object") {
    const nested = response.data as PatientRefundsResponse;
    if (typeof nested.total === "number") return nested.total;
  }
  return getRefundsFromResponse(response).length;
}

export function usePatientRefunds(status?: string) {
  return useQuery<PatientRefundsResponse>({
    queryKey: refundsKey(status),
    queryFn: () => {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      return apiFetch(`/patient/refunds${query}`);
    },
  });
}

export function useCreatePatientRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["patient-refund-create"],
    mutationFn: (payload: CreateRefundPayload) =>
      apiFetch<{ message: string; data: PatientRefund }>("/patient/refunds", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-refunds"] });
    },
  });
}

// ─── GET /patient/refunds/{uuid?}?invoice_number=... ─────────────────────────

export function usePatientRefund(params: RefundLookupParams | null) {
  return useQuery<{ message?: string; data: PatientRefund }>({
    queryKey: refundKey(params),
    queryFn: () =>
      apiFetch<{ message?: string; data: PatientRefund }>(buildRefundUrl("/patient/refunds", params)),
    enabled: hasRefundLookupParams(params),
    retry: false,
  });
}
