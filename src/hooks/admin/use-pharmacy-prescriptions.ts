import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrescriptionStatus = "draft" | "issued";

export interface PrescriptionPatient {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface PrescriptionDoctor {
  id: number;
  name: string;
  email?: string | null;
  specialization?: string | null;
}

export interface PrescriptionMedication {
  id: number;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  notes?: string | null;
}

export interface ApiPrescription {
  id: number;
  status: PrescriptionStatus;
  is_signed: boolean;
  is_active: boolean;
  diagnosis?: string | null;
  notes?: string | null;
  valid_until?: string | null;
  created_at: string;
  updated_at: string;
  patient: PrescriptionPatient;
  doctor: PrescriptionDoctor;
  medications?: PrescriptionMedication[];
}

export interface PaginatedPrescriptions {
  current_page: number;
  data: ApiPrescription[];
  per_page: number;
  total: number;
  last_page: number;
}

export interface GetPharmacyPrescriptionsParams {
  /** The pharmacy/doctor id — maps to the route param */
  doctor_id: number;
  status?: PrescriptionStatus;
  is_signed?: boolean;
  is_active?: boolean;
  search?: string;
  diagnosis?: string;
  /** Exact expiry date  Y-m-d */
  valid_until?: string;
  /** Created date range start  Y-m-d */
  from?: string;
  /** Created date range end  Y-m-d */
  to?: string;
  page?: number;
}

// ─── usePharmacyPrescriptions  →  GET /admin/prescriptions/doctor/{id} ───────

export function usePharmacyPrescriptions(params: GetPharmacyPrescriptionsParams) {
  const {
    doctor_id,
    status,
    is_signed,
    is_active,
    search,
    diagnosis,
    valid_until,
    from,
    to,
    page = 1,
  } = params;

  return useQuery<PaginatedPrescriptions>({
    queryKey: [
      "pharmacy-prescriptions",
      doctor_id,
      { status, is_signed, is_active, search, diagnosis, valid_until, from, to, page },
    ],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status      !== undefined) qs.set("status",      status);
      if (is_signed   !== undefined) qs.set("is_signed",   String(is_signed));
      if (is_active   !== undefined) qs.set("is_active",   String(is_active));
      if (search)                    qs.set("search",      search);
      if (diagnosis)                 qs.set("diagnosis",   diagnosis);
      if (valid_until)               qs.set("valid_until", valid_until);
      if (from)                      qs.set("from",        from);
      if (to)                        qs.set("to",          to);
      if (page > 1)                  qs.set("page",        String(page));

      const url = `/admin/prescriptions/doctor/${doctor_id}${qs.toString() ? `?${qs}` : ""}`;
      return apiFetch<PaginatedPrescriptions>(url);
    },
    enabled: !!doctor_id,
  });
}
