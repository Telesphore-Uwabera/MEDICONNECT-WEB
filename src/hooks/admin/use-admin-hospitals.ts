import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/admin/hospitals";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiHospitalUser {
  id:                 number;
  name:               string;
  phone?:             string;
  email?:             string;
  country_code?:      string;
  is_verified?:       boolean;
  status?:            string;
  preferred_language?: string;
  created_at?:        string;
}

export interface WorkingDay {
  id:           number;
  hospital_id:  number;
  day_of_week:  string;
  open_time:    string | null;
  close_time:   string | null;
  is_closed:    boolean;
  max_patients: number | null;
  is_active:    boolean;
  created_at:   string;
  updated_at:   string;
}

export interface ApiHospitalDepartment {
  id:       number;
  name_en:  string;
  icon?:    string;
  services?: {
    id:        number;
    name_en:   string;
    price:     string;
    is_active: boolean;
  }[];
}

export interface ApiHospital {
  id:                     number;
  user_id:                number;
  slug:                   string;
  registration_number?:   string;
  name_en:                string;
  name_fr?:               string | null;
  name_kiny?:             string | null;
  description_en?:        string | null;
  type:                   "private" | "public" | "ngo" | "hospital" | string;
  address?:               string;
  city?:                  string;
  province?:              string;
  country?:               string;
  latitude?:              string;
  longitude?:             string;
  phone?:                 string;
  email?:                 string;
  website?:               string;
  image?:                 string | null;
  logo?:                  string | null;
  opens_at?:              string;
  closes_at?:             string;
  is_open_24h?:           boolean;
  status:                 "active" | "pending" | "suspended" | "rejected";
  registration_fee_paid?: number;
  is_active?:             boolean;
  is_accepting_bookings?:  number | boolean;
  show_homepage?:         boolean;
  agreement_status?:      string;
  verified_at?:           string | null;
  created_at:             string;
  updated_at?:            string;
  deleted_at?:            string | null;
  doctors_count:          number;
  departments_count:      number;
  services_count:         number;
  user:                   ApiHospitalUser;
  departments?:           ApiHospitalDepartment[];
  working_days?:          WorkingDay[];
  images?:                unknown[];
}

export interface PaginatedHospitals {
  current_page: number;
  data:         ApiHospital[];
  per_page:     number;
  total:        number;
}

export interface GetAdminHospitalsParams {
  status?: string;
  type?:   string;
  search?: string;
  page?:   number;
}

interface HospitalActionResponse {
  message:  string;
  hospital: ApiHospital;
}

// ─── Service Booking types ────────────────────────────────────────────────────

export interface ServiceBookingPatient {
  id:     number;
  name:   string;
  phone?: string;
  email?: string;
  avatar?: string | null;
}

export interface ServiceBookingDoctor {
  id:            number;
  name?:         string;
  specialization?: string;
}

export interface ServiceBooking {
  id:              number;
  patient:         ServiceBookingPatient;
  doctor?:         ServiceBookingDoctor | null;
  service_name?:   string;
  department_name?: string;
  preferred_date?: string | null;
  status:          "pending" | "accepted" | "rejected" | "completed" | "cancelled" | string;
  payment_status?: "paid" | "unpaid" | "refunded" | string | null;
  payment_method?: string | null;
  amount?:         string | number | null;
  notes?:          string | null;
  created_at:      string;
  updated_at?:     string;
}

export interface PaginatedServiceBookings {
  data:         ServiceBooking[];
  current_page: number;
  per_page:     number;
  total:        number;
}

export interface GetServiceBookingsParams {
  hospital_id:      number;
  status?:          string;
  payment_status?:  string;
  payment_method?:  string;
  doctor_id?:       number;
  preferred_date?:  string;
  search?:          string;
  from?:            string;
  to?:              string;
  page?:            number;
}

// ─── useGetAdminHospitals  →  GET /admin/hospitals ───────────────────────────

export function useGetAdminHospitals(params: GetAdminHospitalsParams = {}) {
  const { status, type, search, page = 1 } = params;

  return useQuery<PaginatedHospitals>({
    queryKey: ["admin-hospitals", { status, type, search, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)   qs.set("status", status);
      if (type)     qs.set("type",   type);
      if (search)   qs.set("search", search);
      if (page > 1) qs.set("page",   String(page));

      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<PaginatedHospitals>(url);
    },
  });
}

// ─── useGetAdminHospital  →  GET /admin/hospitals/{id} ───────────────────────

export function useGetAdminHospital(id: number | null) {
  return useQuery<ApiHospital>({
    queryKey: ["admin-hospital", id],
    queryFn:  () =>
      apiFetch<{ hospital: ApiHospital }>(`${BASE}/${id}`).then((r) => r.hospital),
    enabled: !!id,
  });
}

// ─── useGetHospitalServiceBookings  →  GET /admin/service-bookings/hospital/{id} ──

export function useGetHospitalServiceBookings(params: GetServiceBookingsParams) {
  const { hospital_id, page = 1, ...filters } = params;

  return useQuery<PaginatedServiceBookings>({
    queryKey: ["hospital-service-bookings", hospital_id, { ...filters, page }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (filters.status)         qs.set("status",          filters.status);
      if (filters.payment_status) qs.set("payment_status",  filters.payment_status);
      if (filters.payment_method) qs.set("payment_method",  filters.payment_method);
      if (filters.doctor_id)      qs.set("doctor_id",       String(filters.doctor_id));
      if (filters.preferred_date) qs.set("preferred_date",  filters.preferred_date);
      if (filters.search)         qs.set("search",          filters.search);
      if (filters.from)           qs.set("from",            filters.from);
      if (filters.to)             qs.set("to",              filters.to);
      if (page > 1)               qs.set("page",            String(page));

      const url = `/admin/service-bookings/hospital/${hospital_id}${qs.toString() ? `?${qs}` : ""}`;
      return apiFetch<PaginatedServiceBookings>(url);
    },
    enabled: !!hospital_id,
  });
}

// ─── useApproveHospital  →  PUT /admin/hospitals/{id}/approve ────────────────

export function useApproveHospital() {
  const qc = useQueryClient();

  return useMutation<ApiHospital, Error, number>({
    mutationFn: (id) =>
      apiFetch<HospitalActionResponse>(`${BASE}/${id}/approve`, { method: "PUT" }).then((r) => r.hospital),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-hospitals"] }),
  });
}

// ─── useRejectHospital  →  PUT /admin/hospitals/{id}/reject ──────────────────

export function useRejectHospital() {
  const qc = useQueryClient();

  return useMutation<ApiHospital, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<HospitalActionResponse>(`${BASE}/${id}/reject`, {
        method: "PUT",
        body:   reason ? { reason } : undefined,
      }).then((r) => r.hospital),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-hospitals"] }),
  });
}

// ─── useSuspendHospital  →  PUT /admin/hospitals/{id}/suspend ────────────────

export function useSuspendHospital() {
  const qc = useQueryClient();

  return useMutation<ApiHospital, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<HospitalActionResponse>(`${BASE}/${id}/suspend`, {
        method: "PUT",
        body:   reason ? { reason } : undefined,
      }).then((r) => r.hospital),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-hospitals"] }),
  });
}
