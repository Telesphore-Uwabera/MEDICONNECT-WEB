import { useMutation } from "@tanstack/react-query";
import { apiFetch, type ApiError } from "@/lib/Api";

const BASE = "/doctor/service-bookings";

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
  return useMutation({
    mutationFn: (payload: CreateServiceBookingPayload) =>
      apiFetch<{ message?: string; data?: unknown }>(BASE, {
        method: "POST",
        body: payload,
      }),
  });
}
