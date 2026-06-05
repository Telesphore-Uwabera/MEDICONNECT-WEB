import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/admin/appointments";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiAppointmentPatient {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
}

export interface ApiAppointmentDoctor {
  id: number;
  user: {
    name: string;
    avatar?: string;
    email?: string;
  };
}

export interface ApiHospital {
  id: number;
  name_en: string;
  name_fr?: string;
}

export interface ApiInsurance {
  id: number;
  name: string;
  policy_number?: string;
}

export interface ApiSlot {
  id: number;
  start_time?: string;
  end_time?: string;
}

export interface ApiAppointmentNote {
  id: number;
  content: string;
  created_at: string;
}

export interface ApiAppointment {
  id: number;
  status: string;               // confirmed | pending | in_progress | cancelled | completed | no_show
  type: string;                 // online | in_person
  booking_type: string;         // scheduled | walk_in
  appointment_date: string;     // ISO timestamp
  appointment_time: string;     // ISO timestamp
  patient: ApiAppointmentPatient;
  doctor: ApiAppointmentDoctor;
  hospital: ApiHospital | null; // null for online appointments
  insurance: ApiInsurance | null;
  notes?: ApiAppointmentNote[];
  slot?: ApiSlot;
}

export interface AppointmentsResponse {
  current_page: number;
  data: ApiAppointment[];
  per_page: number;
  total: number;
}

export interface GetAdminAppointmentsParams {
  status?: string;
  type?: string;
  booking_type?: string;
  date?: string;
  doctor_id?: number;
  page?: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGetAdminAppointments(params: GetAdminAppointmentsParams = {}) {
  const query = new URLSearchParams();
  if (params.status)       query.set("status", params.status);
  if (params.type)         query.set("type", params.type);
  if (params.booking_type) query.set("booking_type", params.booking_type);
  if (params.date)         query.set("date", params.date);
  if (params.doctor_id)    query.set("doctor_id", String(params.doctor_id));
  if (params.page && params.page > 1) query.set("page", String(params.page));

  const qs = query.toString();

  return useQuery<AppointmentsResponse>({
    queryKey: ["admin-appointments", params],
    queryFn: () => apiFetch(`${BASE}${qs ? `?${qs}` : ""}`),
  });
}

export function useGetAdminAppointment(id: number | null) {
  return useQuery<{ appointment: ApiAppointment }>({
    queryKey: ["admin-appointment", id],
    queryFn: () => apiFetch(`${BASE}/${id}`),
    enabled: !!id,
  });
}
