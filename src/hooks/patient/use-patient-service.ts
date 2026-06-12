import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/patient/service-bookings";

// ─── API Types ──────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export interface ApiBookingHospital {
  id: number;
  name_en: string;
  slug: string;
  type: string;
  city: string;
  address: string;
  image: string | null;
  logo: string | null;
  phone: string | null;
}

export interface ApiBookingService {
  id: number;
  name_en: string;
  name_fr: string | null;
  name_kiny: string | null;
  description_en: string | null;
  price: string | null;
  currency: string | null;
}

export interface ApiBookingDepartment {
  id: number;
  name_en: string;
  name_fr: string | null;
  icon: string | null;
}

export interface ApiServiceBooking {
  id: number;
  booked_by: string;
  preferred_date: string;   // "2026-06-01"
  preferred_time: string;   // "09:00:00"
  status: BookingStatus;
  notes: string | null;
  price: string | null;
  currency: string | null;
  insurance_covered: string | null;
  patient_pays: string | null;
  payment_status: string | null;
  payment_method: string | null;
  rejection_reason: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  doctor_id: number | null;
  insurance_id: number | null;
  hospital: ApiBookingHospital;
  service: ApiBookingService;
  department: ApiBookingDepartment;
}

export interface ApiServiceBookingListResponse {
  data: ApiServiceBooking[];
  current_page: number;
  per_page: number;
  total: number;
  last_page?: number;
}

export interface ApiSingleBookingResponse {
  booking: ApiServiceBooking;
}

// ─── Filter / Mutation Params ───────────────────────────────────────────────────

export interface ServiceBookingSearchParams {
  status?: BookingStatus;
  page?: number;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────────

export const bookingKeys = {
  all: ["patient-service-bookings"] as const,
  list: (params: ServiceBookingSearchParams) =>
    ["patient-service-bookings", params] as const,
  detail: (id: number) => ["patient-service-booking", id] as const,
};

// ─── GET /patient/service-bookings ──────────────────────────────────────────────

export function useGetPatientServiceBookings(
  params: ServiceBookingSearchParams = {},
) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);
  if (params.page && params.page > 1)
    searchParams.set("page", String(params.page));

  const queryString = searchParams.toString();
  const url = queryString ? `${BASE}?${queryString}` : BASE;

  return useQuery<ApiServiceBookingListResponse>({
    queryKey: bookingKeys.list(params),
    queryFn: () =>
      apiFetch(url).then((res) => res as ApiServiceBookingListResponse),
    staleTime: 30_000,
  });
}

// ─── GET /patient/service-bookings/:id ──────────────────────────────────────────

export function useGetPatientServiceBooking(id: number | null) {
  return useQuery<ApiSingleBookingResponse>({
    queryKey: bookingKeys.detail(id!),
    queryFn: () =>
      apiFetch(`${BASE}/${id}`).then(
        (res) => res as ApiSingleBookingResponse,
      ),
    enabled: id != null,
    staleTime: 30_000,
  });
}

// ─── DELETE /patient/service-bookings/:id ───────────────────────────────────────

export function useCancelPatientServiceBooking() {
  const queryClient = useQueryClient();
  return useMutation<
    { message: string },
    { message: string; current_status?: string },
    number
  >({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }) as Promise<{
        message: string;
      }>,
    onSuccess: (_data, id) => {
      // Invalidate list + remove detail cache for this id
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      queryClient.removeQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
}
