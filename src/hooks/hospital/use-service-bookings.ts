import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Bases ────────────────────────────────────────────────────────────────────

const HOSPITAL_BASE = "/hospital/service-bookings";
const PATIENT_BASE = "/service-bookings";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "pending" | "refunded";

export interface BookingPatient {
  id: number;
  name: string;
  phone?: string;
}

export interface BookingService {
  id: number;
  name_en: string;
  name_fr?: string | null;
  name_kiny?: string | null;
  code?: string | null;
  duration_minutes?: string | null;
}

export interface BookingDepartment {
  id: number;
  name_en: string;
  floor?: string | null;
  room_number?: string | null;
  phone?: string | null;
}

/** Shape returned in the hospital paginated list */
export interface ServiceBookingSummary {
  id: number;
  status: BookingStatus;
  preferred_date: string; // ISO datetime or date string
  preferred_time?: string | null;
  price: number;
  patient_pays: number;
  currency: string;
  payment_status: PaymentStatus;
  patient: BookingPatient;
  service: BookingService;
  department: BookingDepartment;
}

/** Full booking returned by GET /{id} and action endpoints */
export interface ServiceBookingDetail extends ServiceBookingSummary {
  notes: string | null;
  rejection_reason: string | null;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface ServiceBookingsPage {
  current_page: number;
  data: ServiceBookingSummary[];
  per_page: number;
  total: number;
}

export interface ServiceBookingFilters {
  status?: BookingStatus;
  department_id?: number;
  hospital_service_id?: number;
  doctor_id?: number;
  patient_id?: number;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
}

// ─── Accept response ──────────────────────────────────────────────────────────

export interface AcceptBookingResponse {
  message: string;
  booking: ServiceBookingDetail;
  invoice_number: string | null;
  public_key: string | null;
  amount: number;
}

// ─── Patient types ────────────────────────────────────────────────────────────

export interface PatientBookingSummary {
  id: number;
  preferred_date: string;
  preferred_time: string | null;
  status: BookingStatus;
  notes: string | null;
  patient: BookingPatient;
  service: BookingService;
  department: BookingDepartment;
}

// Fixed: was an empty interface (ESLint @typescript-eslint/no-empty-object-type)
// Now correctly extends PatientBookingSummary with additional detail fields
export type PatientBookingDetail = PatientBookingSummary & {
  rejection_reason?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
};

export interface PatientBookingsPage {
  current_page: number;
  data: PatientBookingSummary[];
  per_page: number;
  total: number;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const serviceBookingKeys = {
  hospital: {
    all: ["hospital-service-bookings"] as const,
    list: (filters?: ServiceBookingFilters) =>
      ["hospital-service-bookings", "list", filters ?? {}] as const,
    detail: (id: number) =>
      ["hospital-service-bookings", "detail", id] as const,
  },
  patient: {
    all: ["patient-service-bookings"] as const,
    list: (status?: BookingStatus) =>
      ["patient-service-bookings", "list", status ?? "all"] as const,
    detail: (id: number) =>
      ["patient-service-bookings", "detail", id] as const,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a preferred_date value that may arrive as a full ISO datetime
 * (e.g. "2026-06-09T22:00:00.000000Z") or a plain date ("2026-06-09").
 * Returns a plain YYYY-MM-DD string safe to pass to parseISO / format.
 */
export function normaliseDateString(raw: string): string {
  if (raw.includes("T")) return raw.split("T")[0];
  return raw;
}

// ─── Hospital hooks ───────────────────────────────────────────────────────────

/**
 * GET /hospital/service-bookings
 * Optional filters — pass undefined to fetch all.
 */
export function useGetServiceBookings(filters?: ServiceBookingFilters) {
  return useQuery({
    queryKey: serviceBookingKeys.hospital.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.department_id != null)
        params.set("department_id", String(filters.department_id));
      if (filters?.hospital_service_id != null)
        params.set("hospital_service_id", String(filters.hospital_service_id));
      if (filters?.doctor_id != null) params.set("doctor_id", String(filters.doctor_id));
      if (filters?.patient_id != null) params.set("patient_id", String(filters.patient_id));
      if (filters?.payment_status) params.set("payment_status", filters.payment_status);
      if (filters?.date_from) params.set("date_from", filters.date_from);
      if (filters?.date_to) params.set("date_to", filters.date_to);
      const qs = params.toString();
      const url = qs ? `${HOSPITAL_BASE}?${qs}` : HOSPITAL_BASE;
      return apiFetch<ServiceBookingsPage>(url);
    },
  });
}

/**
 * GET /hospital/service-bookings/{id}
 * Returns: { booking: ServiceBookingDetail }
 * 404 → { message: "Booking not found." }
 */
export function useGetServiceBooking(id: number | null) {
  return useQuery({
    queryKey: serviceBookingKeys.hospital.detail(id!),
    queryFn: () =>
      apiFetch<{ booking: ServiceBookingDetail }>(`${HOSPITAL_BASE}/${id}`).then(
        (r) => r.booking,
      ),
    enabled: id !== null,
    retry: (failureCount, error) => {
      // Don't retry on 404
      if (error instanceof Error && error.message.includes("404")) return false;
      return failureCount < 2;
    },
  });
}

/**
 * POST /hospital/service-bookings/{id}/accept
 * Body: { notes?: string }  (notes optional)
 * 200 → AcceptBookingResponse
 * 422 → { message: string, current_status: string }
 *
 * Side-effects:
 *  - Triggers a payment request to the patient (24-hour expiry if unpaid)
 *  - invoice_number / public_key are null when patient has no phone or fee is 0
 */
export function useAcceptServiceBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      apiFetch<AcceptBookingResponse>(`${HOSPITAL_BASE}/${id}/accept`, {
        method: "POST",
        body: notes ? { notes } : {},
      }),
    onSuccess: (data, { id }) => {
      // Update the detail cache immediately so the drawer reflects accepted state
      qc.setQueryData(serviceBookingKeys.hospital.detail(id), data.booking);
      // Invalidate the list so the card status updates
      qc.invalidateQueries({ queryKey: serviceBookingKeys.hospital.all });
    },
  });
}

/**
 * POST /hospital/service-bookings/{id}/reject
 * Body: { rejection_reason: string }  (required)
 * 200 → { message: string }
 * 422 → { message: string, current_status: string }
 */
export function useRejectServiceBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      rejection_reason,
    }: {
      id: number;
      rejection_reason: string;
    }) =>
      apiFetch<{ message: string }>(`${HOSPITAL_BASE}/${id}/reject`, {
        method: "POST",
        body: { rejection_reason },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: serviceBookingKeys.hospital.all });
      qc.invalidateQueries({ queryKey: serviceBookingKeys.hospital.detail(id) });
    },
  });
}

/**
 * POST /hospital/service-bookings/{id}/complete
 * No payload.
 * Only works on accepted bookings where payment_status === "paid".
 * 200 → { message: string }
 * 422 → { message: string }  (not paid, or wrong status)
 */
export function useCompleteServiceBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`${HOSPITAL_BASE}/${id}/complete`, {
        method: "POST",
        body: {},
      }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: serviceBookingKeys.hospital.all });
      qc.invalidateQueries({ queryKey: serviceBookingKeys.hospital.detail(id) });
    },
  });
}

// ─── Patient hooks ────────────────────────────────────────────────────────────

/**
 * GET /service-bookings
 */
export function useGetPatientBookings(status?: BookingStatus) {
  return useQuery({
    queryKey: serviceBookingKeys.patient.list(status),
    queryFn: () => {
      const url = status ? `${PATIENT_BASE}?status=${status}` : PATIENT_BASE;
      return apiFetch<PatientBookingsPage>(url);
    },
  });
}

/**
 * GET /service-bookings/{id}
 */
export function useGetPatientBooking(id: number | null) {
  return useQuery({
    queryKey: serviceBookingKeys.patient.detail(id!),
    queryFn: () =>
      apiFetch<{ booking: PatientBookingDetail }>(`${PATIENT_BASE}/${id}`).then(
        (r) => r.booking,
      ),
    enabled: id !== null,
  });
}
