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
  preferred_date: string; // "2026-06-01"
  preferred_time: string; // "09:00:00"
  status: BookingStatus;
  notes: string | null;
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

// ─── Filter Params ──────────────────────────────────────────────────────────────

export interface ServiceBookingSearchParams {
  status?: BookingStatus;
  page?: number;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────────

/* GET /patient/service-bookings */
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
    queryKey: ["patient-service-bookings", params],
    queryFn: () =>
      apiFetch(url).then((res) => res as ApiServiceBookingListResponse),
    staleTime: 30_000,
  });
}

/* GET /patient/service-bookings/:id */
export function useGetPatientServiceBooking(id: number | null) {
  return useQuery<ApiSingleBookingResponse>({
    queryKey: ["patient-service-booking", id],
    queryFn: () =>
      apiFetch(`${BASE}/${id}`).then((res) => res as ApiSingleBookingResponse),
    enabled: id != null,
  });
}

/* DELETE /patient/service-bookings/:id */
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-service-bookings"] });
    },
  });
}
