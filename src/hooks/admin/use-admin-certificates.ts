import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface AdminCertificateRow {
  id: number;
  certificate_number: string;
  status: string;
  purpose: string | null;
  patient_full_name: string | null;
  doctor?: { id: number; name: string } | null;
  fee_amount?: number;
  fee_paid?: boolean;
  payment_status?: string | null;
  invoice_number?: string | null;
  paid_at?: string | null;
  created_at?: string;
  signed_at?: string | null;
  valid_until?: string | null;
  qr_code?: string | null;
}

export interface AdminCertificatesSummary {
  awaiting_payment: number;
  pending: number;
  issued: number;
  rejected: number;
  paid_revenue: number;
  fee: number;
  currency: string;
}

export function useGetAdminCertificates(status?: string, search?: string) {
  return useQuery<{ certificates: AdminCertificateRow[]; summary: AdminCertificatesSummary }>({
    queryKey: ["admin-certificates", status, search],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status && status !== "all") qs.set("status", status);
      if (search) qs.set("q", search);
      const suffix = qs.toString() ? `?${qs}` : "";
      return apiFetch(`/admin/certificates${suffix}`);
    },
    refetchInterval: 15_000,
  });
}
