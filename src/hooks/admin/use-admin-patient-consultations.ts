// Admin — a patient's appointments / instant consultations and their summaries.
//   GET /admin/patients/{patientId}/appointments
//   GET /admin/patients/{patientId}/appointments/{id}/summary
//   GET /admin/patients/{patientId}/instant-consultations
//   GET /admin/patients/{patientId}/instant-consultations/{id}/summary

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ConsultationSummary } from "@/hooks/doctor/use-consultation-summaries";

export type { ConsultationSummary };

/** Loose shape — admin list rows vary; we read defensively. */
export interface AdminPatientVisit {
  id: number;
  status?: string;
  booking_type?: string;
  type?: string;
  appointment_date?: string;
  appointment_time?: string;
  created_at?: string;
  doctor?: {
    id?: number;
    specialization?: string;
    designations?: string;
    user?: { name?: string } | null;
  } | null;
  [key: string]: unknown;
}

interface ListResponse {
  data: AdminPatientVisit[];
}
interface SummaryResponse {
  summary: ConsultationSummary;
}

export function useAdminPatientAppointments(patientId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["admin-patient-appointments", patientId],
    queryFn: () => apiFetch<ListResponse>(`/admin/patients/${patientId}/appointments`),
    enabled: enabled && patientId != null,
  });
}

export function useAdminPatientInstantConsultations(patientId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["admin-patient-instant-consultations", patientId],
    queryFn: () =>
      apiFetch<ListResponse>(`/admin/patients/${patientId}/instant-consultations`),
    enabled: enabled && patientId != null,
  });
}

export function useAdminPatientAppointmentSummary(
  patientId: number | null,
  appointmentId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin-patient-appointment-summary", patientId, appointmentId],
    queryFn: () =>
      apiFetch<SummaryResponse>(
        `/admin/patients/${patientId}/appointments/${appointmentId}/summary`,
      ),
    enabled: enabled && patientId != null && appointmentId != null,
    retry: false,
  });
}

export function useAdminPatientInstantSummary(
  patientId: number | null,
  instantId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin-patient-instant-summary", patientId, instantId],
    queryFn: () =>
      apiFetch<SummaryResponse>(
        `/admin/patients/${patientId}/instant-consultations/${instantId}/summary`,
      ),
    enabled: enabled && patientId != null && instantId != null,
    retry: false,
  });
}
