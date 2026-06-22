import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/patient/appointments";

export type ApiAppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";
export type ApiAppointmentType = "online" | "in_person";

export interface ApiAppointment {
  id: number;
  type: ApiAppointmentType;
  status: ApiAppointmentStatus;
  booking_type: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  consultation_fee: string;
  insurance_covered: string;
  patient_pays: string;
  currency: string;
  payment_status: string;
  daily_room_url: string | null;
  can_review: boolean;
  doctor: {
    id: number;
    designations: string;
    specialization: string;
    image: string | null;
    doctor_degree: string;
    user: {
      id: number;
      name: string;
      avatar: string | null;
    };
  } | null;
  hospital: {
    id: number;
    name_en: string;
    address: string;
    city: string;
  } | null;
  insurance: {
    id: number;
    name: string;
    logo: string | null;
    coverage_percentage: string;
  } | null;
  notes: string | null;
}

export interface ApiAppointmentListResponse {
  current_page: number;
  data: ApiAppointment[];
  per_page: number;
  total: number;
  last_page: number;
  next_page_url: string | null;
  prev_page_url: string | null;
}

export interface AppointmentFilterParams {
  status?: ApiAppointmentStatus | "all";
  type?: ApiAppointmentType | "all";
  date_from?: string;
  date_to?: string;
  date?: string;
  page?: number;
}

export function useGetPatientAppointments(
  params: AppointmentFilterParams = {},
) {
  const searchParams = new URLSearchParams();

  if (params.status && params.status !== "all")
    searchParams.set("status", params.status);
  if (params.type && params.type !== "all")
    searchParams.set("type", params.type);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  if (params.date) searchParams.set("date", params.date);
  if (params.page && params.page > 1)
    searchParams.set("page", String(params.page));

  const qs = searchParams.toString();
  const url = qs ? `${BASE}?${qs}` : BASE;

  return useQuery<ApiAppointmentListResponse>({
    queryKey: ["patient-appointments", params],
    queryFn: () => apiFetch(url),
    staleTime: 30_000,
  });
}

export function useGetPatientAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ["patient-appointment", appointmentId],
    queryFn: () => apiFetch(`${BASE}/${appointmentId}`),
    enabled: !!appointmentId,
  });
}

export function useGetPatientQuickAppointments(
  params: AppointmentFilterParams = {},
) {
  const searchParams = new URLSearchParams();

  if (params.status && params.status !== "all")
    searchParams.set("status", params.status);
  if (params.type && params.type !== "all")
    searchParams.set("type", params.type);
  if (params.date_from) searchParams.set("date_from", params.date_from);
  if (params.date_to) searchParams.set("date_to", params.date_to);
  if (params.date) searchParams.set("date", params.date);
  if (params.page && params.page > 1)
    searchParams.set("page", String(params.page));

  const qs = searchParams.toString();
  const url = qs ? `/patient/quick?${qs}` : "/patient/quick";

  return useQuery<ApiAppointmentListResponse>({
    queryKey: ["patient-quick-appointments", params],
    queryFn: () => apiFetch(url),
    staleTime: 30_000,
  });
}
