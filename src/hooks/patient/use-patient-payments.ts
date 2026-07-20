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

const paymentKey = (uuid: string) => ["patient-payment", uuid] as const;

export function usePatientPaymentStatus(uuid: string | null) {
  return useQuery({
    queryKey: paymentKey(uuid ?? ""),
    queryFn: () =>
      apiFetch<PatientPaymentResponse>(
        `/patient/payments/${encodeURIComponent(uuid ?? "")}`,
      ),
    enabled: !!uuid,
    retry: false,
  });
}

export function useVerifyPatientPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["patient-payment-verify"],
    mutationFn: (uuid: string) =>
      apiFetch<PatientPaymentResponse>(
        `/patient/payments/${encodeURIComponent(uuid)}/verify`,
        { method: "POST" },
      ),
    onSuccess: (response, uuid) => {
      queryClient.setQueryData(paymentKey(uuid), response);
    },
  });
}
