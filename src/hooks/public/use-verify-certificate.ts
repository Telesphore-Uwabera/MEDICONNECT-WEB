// Public certificate verification — no auth required.
// API: GET /public/verify/{certificateNumber}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface VerifiedCertificate {
  certificate_number: string;
  patient_name: string;
  purpose: string;
  decision: string;
  issued_by: string;
  issued_at: string;
  valid_until: string;
  platform: string;
}

export interface VerifyCertificateResponse {
  valid: boolean;
  message: string;
  certificate?: VerifiedCertificate;
}

export const verifyCertificateKeys = {
  detail: (certificateNumber: string) => ["verify-certificate", certificateNumber] as const,
};

export function useVerifyCertificate(certificateNumber: string | undefined) {
  return useQuery<VerifyCertificateResponse>({
    queryKey: verifyCertificateKeys.detail(certificateNumber ?? ""),
    queryFn: () =>
      apiFetch<VerifyCertificateResponse>(
        `/public/verify/${encodeURIComponent(certificateNumber as string)}`,
      ),
    enabled: !!certificateNumber,
    retry: false,
  });
}
