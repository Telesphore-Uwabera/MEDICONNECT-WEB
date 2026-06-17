import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, type ApiError } from "@/lib/api";

const BASE = "/doctor/service-bookings";

export type ServiceBookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

// Defensive shape — the API resource keys may vary slightly.
export interface ServiceBooking {
  id: number;
  status: ServiceBookingStatus | string;
  preferred_date: string;
  preferred_time: string;
  notes?: string | null;
  created_at?: string;
  hospital?: { id?: number; name_en?: string; name?: string; city?: string | null } | null;
  hospital_service?: { id?: number; name_en?: string; name?: string } | null;
  service?: { id?: number; name_en?: string; name?: string } | null;
  department?: { id?: number; name_en?: string; name?: string } | null;
  patient?: { id?: number; name?: string; phone?: string } | null;
  user?: { id?: number; name?: string; phone?: string } | null;
  [k: string]: any;
}

export interface ServiceBookingFilters {
  status?: ServiceBookingStatus;
  hospital_id?: number;
  date?: string; // Y-m-d
}

export interface ServiceBookingAvailabilityParams {
  hospital_id: number;
  hospital_service_id: number;
  preferred_date: string; // Y-m-d
  preferred_time: string; // H:i
}

export interface CreateServiceBookingPayload {
  patient_id: number;
  hospital_id: number;
  hospital_service_id: number;
  department_id?: number;
  preferred_date: string; // Y-m-d
  preferred_time: string; // H:i
  notes?: string;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
}

/**
 * GET /doctor/service-bookings/availability
 * 200 → available; 422 → unavailable (the reason is the error message).
 */
export async function checkServiceBookingAvailability(
  params: ServiceBookingAvailabilityParams,
): Promise<AvailabilityResult> {
  const qs = new URLSearchParams({
    hospital_id: String(params.hospital_id),
    hospital_service_id: String(params.hospital_service_id),
    preferred_date: params.preferred_date,
    preferred_time: params.preferred_time,
  }).toString();

  try {
    await apiFetch(`${BASE}/availability?${qs}`);
    return { available: true };
  } catch (err) {
    const e = err as ApiError;
    if (e?.status === 422) return { available: false, reason: e.message };
    throw err; // network/other errors bubble up
  }
}

/**
 * POST /doctor/service-bookings
 * Runs an availability check first (422 if unavailable) and returns 409 if the
 * patient already has a pending/accepted booking for the same service + date.
 */
export function useCreateServiceBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServiceBookingPayload) =>
      apiFetch<{ message?: string; data?: unknown }>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-service-bookings"] }),
  });
}

/** GET /doctor/service-bookings — the doctor's physical bookings, with filters. */
export function useDoctorServiceBookings(filters: ServiceBookingFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.hospital_id != null) qs.set("hospital_id", String(filters.hospital_id));
  if (filters.date) qs.set("date", filters.date);
  const query = qs.toString();

  return useQuery({
    queryKey: ["doctor-service-bookings", filters],
    queryFn: async () => {
      const res = await apiFetch<{ data?: ServiceBooking[] } | ServiceBooking[]>(
        `${BASE}${query ? `?${query}` : ""}`,
      );
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });
}

/** GET /doctor/service-bookings/:id — full detail for one booking. */
export function useDoctorServiceBooking(id: number | null) {
  return useQuery({
    queryKey: ["doctor-service-booking", id],
    enabled: id != null,
    queryFn: async () => {
      const res = await apiFetch<{ data?: ServiceBooking } | ServiceBooking>(`${BASE}/${id}`);
      return ((res as any)?.data ?? res) as ServiceBooking;
    },
  });
}

/** DELETE /doctor/service-bookings/:id — 422 if it can't be cancelled. */
export function useCancelServiceBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-service-bookings"] }),
  });
}
