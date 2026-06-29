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

export interface ApiAppointmentSummary {
  id?: number;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  treatment_plan?: string | null;
  recommendations?: string | null;
  additional_notes?: string | null;
  blood_pressure?: string | null;
  temperature?: string | null;
  pulse_rate?: string | null;
  weight?: string | null;
  height?: string | null;
  needs_follow_up?: boolean;
  follow_up_date?: string | null;
  follow_up_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface ApiAppointmentPrescriptionItem {
  id?: number;
  medicine_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number | string;
  instructions?: string | null;
}

export interface ApiAppointmentPrescription {
  id: number;
  prescription_number?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  valid_until?: string | null;
  status?: string | null;
  is_signed?: boolean;
  signed_at?: string | null;
  issued_at?: string | null;
  pdf_url?: string | null;
  items?: ApiAppointmentPrescriptionItem[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiAppointment {
  id: number;
  status: string;               // confirmed | pending | in_progress | cancelled | completed | no_show
  type: string;                 // online | in_person
  booking_type: string;         // scheduled | walk_in
  appointment_date: string;     // ISO timestamp
  appointment_time: string;     // ISO timestamp
  started_at?: string | null;
  ended_at?: string | null;
  completed_at?: string | null;
  duration_minutes?: number | string | null;
  patient: ApiAppointmentPatient;
  doctor: ApiAppointmentDoctor;
  hospital: ApiHospital | null; // null for online appointments
  insurance: ApiInsurance | null;
  notes?: ApiAppointmentNote[] | ApiAppointmentSummary | null;
  summary?: ApiAppointmentSummary | null;
  consultation_summary?: ApiAppointmentSummary | null;
  prescription?: ApiAppointmentPrescription | null;
  prescriptions?: ApiAppointmentPrescription[];
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
