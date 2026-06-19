import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiSlot {
  id: number;
  slot_date: string;
  start_time: string; // "11:00:00"
  end_time: string; // "11:30:00"
  duration_minutes: number;
  type: "online" | "in_person";
  hospital_id: number | null;
  status: "available" | "booked";
  booked_by_me: boolean;
}

export interface SlotsResponse {
  doctor: { id: number; name: string; slug: string };
  slots: Record<string, ApiSlot[]>; // keyed by "yyyy-MM-dd"
  total: number;
  dates: string[];
}

export interface BookAppointmentPayload {
  doctor_id: number;
  type: "online" | "in_person";
  appointment_date: string; // "yyyy-MM-dd"
  appointment_time: string; // "HH:mm"
  insurance_id?: number;
}

export interface BookAppointmentResponse {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  [key: string]: unknown;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches all available slot dates for a doctor (no date filter).
 * Used to populate the calendar with available dates.
 * GET /patient/doctors/{slug}/slots
 */

export function useGetSlots(doctorSlug: string, enabled = true) {
  return useQuery<SlotsResponse>({
    queryKey: ["doctor-slots", doctorSlug],
    queryFn: () =>
      apiFetch<SlotsResponse>(`/public/doctors/${doctorSlug}/slots`),
    enabled: !!doctorSlug && enabled,
    staleTime: 60_000, // 1 min
  });
}

// get doctor by slug {{stag_url}}/public/doctors/{{slug}}
export function useGetDoctorBySlug(slug: string) {
  return useQuery({
    queryKey: ["doctor", slug],
    queryFn: () => apiFetch(`/public/doctors/${slug}`),
    enabled: !!slug,
  });
}

/**
 * Fetches slots for a specific date.
 * Called reactively whenever the user picks a date in the calendar.
 * GET /patient/doctors/{slug}/slots?date=yyyy-MM-dd
 */

export function useGetSlotsByDate(
  doctorSlug: string,
  date: string | null,
  enabled = true,
) {
  return useQuery<SlotsResponse>({
    queryKey: ["doctor-slots", doctorSlug, date],
    queryFn: () =>
      apiFetch<SlotsResponse>(
        `/public/doctors/${doctorSlug}/slots?date=${date}`,
      ),
    enabled: !!doctorSlug && !!date && enabled,
    staleTime: 30_000,
  });
}

/**
 * Books an appointment.
 * POST /patient/appointments
 */

export function useBookAppointment() {
  return useMutation<BookAppointmentResponse, Error, BookAppointmentPayload>({
    mutationFn: (payload) =>
      apiFetch<BookAppointmentResponse>("/patient/appointments", {
        method: "POST",
        body: payload,
      }),
  });
}

/**
 * Initiates payment for a scheduled appointment.
 * POST /patient/appointments/{id}/pay
 */
export interface PayAppointmentResponse {
  message: string;
  invoice_number: string;
  public_key: string;
  amount: number;
  currency: string;
  payment_uuid: string;
}

export function usePayAppointment() {
  return useMutation<PayAppointmentResponse, Error, number>({
    mutationFn: (appointmentId) =>
      apiFetch<PayAppointmentResponse>(`/patient/appointments/${appointmentId}/pay`, {
        method: "POST",
      }),
  });
}
