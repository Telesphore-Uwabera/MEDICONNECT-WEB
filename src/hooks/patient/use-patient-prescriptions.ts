import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/patient/prescriptions";

// ─── API shape (matching actual backend response) ─────────────────────────────

export interface PrescriptionItem {
  id: number;
  prescription_id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionDoctor {
  id: number;
  specialization: string;
  doctor_degree: string;
  image: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export interface PrescriptionAppointment {
  id: number;
  type: "online" | "in_person";
  status: string;
  appointment_date: string;
  hospital_id: number | null;
}

export interface Prescription {
  id: number;
  prescription_number: string;
  pdf_url: string;
  qr_code: string;
  notes: string | null;
  diagnosis: string | null;
  valid_until: string;
  status: PrescriptionApiStatus;
  is_signed: boolean;
  signed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  doctor: PrescriptionDoctor;
  appointment: PrescriptionAppointment;
  items: PrescriptionItem[];
}

export type PrescriptionApiStatus =
  | "issued"
  | "sent_to_pharmacy"
  | "dispensed"
  | "cancelled"
  | "expired"
  | "pending";

// ─── Filter params (maps 1-to-1 to API query params) ─────────────────────────

export interface PrescriptionFilters {
  search?: string;
  status?: PrescriptionApiStatus | "all";
  from?: string; // ISO date string e.g. "2025-01-01"
  to?: string; // ISO date string e.g. "2025-12-31"
  is_signed?: boolean | "all";
  sort?: "date-asc" | "date-desc";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGetPatientPrescriptions(filters: PrescriptionFilters = {}) {
  // Build query string — only include params that have real values
  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.status && filters.status !== "all")
    params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.is_signed !== undefined && filters.is_signed !== "all") {
    params.set("is_signed", String(filters.is_signed));
  }

  const qs = params.toString();
  const url = qs ? `${BASE}?${qs}` : BASE;

  return useQuery({
    queryKey: ["patient-prescriptions", filters],
    queryFn: (): Promise<{ prescriptions: Prescription[] }> =>
      apiFetch(url).then((data) => {
        console.log("Patient prescriptions fetched:", data);
        return data as { prescriptions: Prescription[] };
      }),
    staleTime: 30_000,
  });
}
