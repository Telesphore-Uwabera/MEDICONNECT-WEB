import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface PatientPaymentData {
  status: string;
  amount?: number | string | null;
  currency?: string | null;
  invoice_number?: string | null;
  paid_at?: string | null;
  [key: string]: unknown;
}

interface PatientPaymentResponse {
  status: boolean;
  message?: string;
  data: PatientPaymentData;
}

/** Identify a payment by its uuid, its invoice_number, or both. At least one is required. */
export interface PaymentLookupParams {
  uuid?: string | null;
  invoiceNumber?: string | null;
}

function hasLookupParams(params: PaymentLookupParams | null | undefined): boolean {
  return !!params && (!!params.uuid?.trim() || !!params.invoiceNumber?.trim());
}

/** Build `/patient/payments/{uuid?}?invoice_number=...` (or the `verify` variant). */
function buildPaymentUrl(base: string, params: PaymentLookupParams | null | undefined): string {
  const uuid = params?.uuid?.trim();
  const invoiceNumber = params?.invoiceNumber?.trim();

  const path = uuid ? `${base}/${encodeURIComponent(uuid)}` : base;
  const qs = new URLSearchParams();
  if (invoiceNumber) qs.set("invoice_number", invoiceNumber);
  return qs.toString() ? `${path}?${qs}` : path;
}

const paymentKey = (params: PaymentLookupParams | null | undefined) =>
  ["patient-payment", params?.uuid ?? "", params?.invoiceNumber ?? ""] as const;

// ─── GET /patient/payments/{uuid?}?invoice_number=... ────────────────────────

export function usePatientPaymentStatus(params: PaymentLookupParams | null) {
  return useQuery({
    queryKey: paymentKey(params),
    queryFn: () =>
      apiFetch<PatientPaymentResponse>(buildPaymentUrl("/patient/payments", params)),
    enabled: hasLookupParams(params),
    retry: false,
  });
}

// ─── POST /patient/payments/verify/{uuid?}?invoice_number=... ───────────────

export function useVerifyPatientPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["patient-payment-verify"],
    mutationFn: (params: PaymentLookupParams) =>
      apiFetch<PatientPaymentResponse>(
        buildPaymentUrl("/patient/payments/verify", params),
        { method: "POST" },
      ),
    onSuccess: (response, params) => {
      queryClient.setQueryData(paymentKey(params), response);
    },
  });
}
