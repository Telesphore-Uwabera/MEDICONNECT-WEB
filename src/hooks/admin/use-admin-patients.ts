import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/patients";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPatientInsurance {
  id: number;
  name: string;
  code?: string;
  logo?: string | null;
  type?: string;
  coverage_percentage?: string | number;
}

export interface ApiPatientMedicalInfo {
  id?: number;
  patient_id?: number;
  allergies?: string[];
  chronic_conditions?: string[];
  current_medications?: string[];
  previous_surgeries?: string[];
  family_history?: string[];
  smoking_status?: string | null;
  alcohol_use?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiPatient {
  id: number;
  name: string;
  email: string;
  phone: string;
  country_code?: string | null;
  avatar?: string | null;
  status: "active" | "pending" | "suspended" | "rejected";
  is_verified?: boolean;
  preferred_language?: string | null;
  phone_verified_at?: string | null;
  email_verified_at?: string | null;
  roles?: { name: string }[];
 patient?: {
  id: number;
  user_id?: number;
  date_of_birth?: string | null;
  gender?: string | null;
  national_id?: string | null;
  blood_type?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  insurance_id?: number | null;
  insurance_number?: string | null;
  insurance?: ApiPatientInsurance | null;
  medical_info?: ApiPatientMedicalInfo | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
} | null;
  created_at: string;
   updated_at?: string;
}

export interface PaginatedPatients {
  current_page: number;
  data: ApiPatient[];
  per_page: number;
  total: number;
}

export interface GetAdminPatientsParams {
  status?: string;
  search?: string;
  page?: number;
}

interface PatientActionResponse {
  message: string;
  patient: ApiPatient;
}

// ─── useGetAdminPatients  →  GET /admin/patients ─────────────────────────────

export function useGetAdminPatients(params: GetAdminPatientsParams = {}) {
  const { status, search, page = 1 } = params;

  return useQuery<PaginatedPatients>({
    queryKey: ["admin-patients", { status, search, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)   qs.set("status", status);
      if (search)   qs.set("search", search);
      if (page > 1) qs.set("page", String(page));

      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<PaginatedPatients>(url);
    },
  });
}

// ─── useGetAdminPatient  →  GET /admin/patients/{id} ─────────────────────────
// The list endpoint above already nests most fields, but not the medical
// record (allergies, conditions, medications, ...) or the resolved insurance
// record - those only come back on the single-patient detail route.

export function useGetAdminPatient(id: number | null) {
  return useQuery<ApiPatient>({
    queryKey: ["admin-patient", id],
    queryFn: () =>
      apiFetch<{ patient: ApiPatient }>(`${BASE}/${id}`).then((r) => r.patient),
    enabled: !!id,
  });
}

// ─── useSuspendPatient  →  PUT /admin/patients/{id}/suspend ──────────────────

export function useSuspendPatient() {
  const qc = useQueryClient();

  return useMutation<ApiPatient, Error, number | { id: number; reason?: string }>({
    mutationFn: (input) => {
      const id = typeof input === "number" ? input : input.id;
      const reason = typeof input === "number" ? undefined : input.reason;
      return apiFetch<PatientActionResponse>(`${BASE}/${id}/suspend`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then((res) => res.patient);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
  });
}

// ─── useActivatePatient  →  PUT /admin/patients/{id}/activate ────────────────

export function useActivatePatient() {
  const qc = useQueryClient();

  return useMutation<ApiPatient, Error, number>({
    mutationFn: (id) =>
      apiFetch<PatientActionResponse>(`${BASE}/${id}/activate`, {
        method: "PUT",
      }).then((res) => res.patient),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
  });
}

