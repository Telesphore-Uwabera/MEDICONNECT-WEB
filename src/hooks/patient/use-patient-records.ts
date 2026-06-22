import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ApiDoctor } from "../doctor/use-doctor-appointments";

export interface RecordNote {
  id: number;
  content: string;
}

export interface RecordFile {
  id: number;
  title: string;
  file_type: string;
  notes?: string;
  url: string;
  uploaded_at: string;
}

export interface RecordVisitHistory {
  id: number;
  diagnosis: string;
  visit_date: string;
}

export interface RecordInstantConsultation {
  id: number;
  status: string;
  created_at: string;
  notes?: RecordNote[];
  files?: RecordFile[];
  visit_history?: RecordVisitHistory;
}

export interface RecordAppointment {
  id: number;
  status: string;
  doctor?: { user: { name: string } };
  hospital?: { name_en: string };
  notes?: RecordNote[];
  files?: RecordFile[];
  visit_history?: RecordVisitHistory;
}

export interface RecordListResponse<T> {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  data: T[];
}

export interface InstantConsultationSummaryResponse {
  session: {
    id: number;
    status: string;
    created_at: string;
  };
  notes: RecordNote[];
  files: RecordFile[];
  visit_history: RecordVisitHistory | null;
}

export interface AppointmentSummaryResponse {
  appointment: {
    id: number;
    status: string;
    doctor?: { user: { name: string } };
    hospital?: { name_en: string };
  };
  notes: RecordNote[];
  files: RecordFile[];
  visit_history: RecordVisitHistory | null;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useGetPatientRecordsInstant(page: number = 1) {
  return useQuery({
    queryKey: ["patient-records-instant", page],
    queryFn: () =>
      apiFetch<RecordListResponse<RecordInstantConsultation>>(
        `/patient/records/instant-consultations?instants_page=${page}`
      ),
  });
}

export function useGetPatientRecordsInstantSummary(id: number | string) {
  return useQuery({
    queryKey: ["patient-records-instant-summary", id],
    queryFn: () =>
      apiFetch<InstantConsultationSummaryResponse>(
        `/patient/records/instant-consultations/${id}`
      ),
    enabled: !!id,
  });
}

export function useGetPatientRecordsAppointments(page: number = 1) {
  return useQuery({
    queryKey: ["patient-records-appointments", page],
    queryFn: () =>
      apiFetch<RecordListResponse<RecordAppointment>>(
        `/patient/records/appointments?appointments_page=${page}`
      ),
  });
}

export function useGetPatientRecordsAppointmentSummary(id: number | string) {
  return useQuery({
    queryKey: ["patient-records-appointment-summary", id],
    queryFn: () =>
      apiFetch<AppointmentSummaryResponse>(
        `/patient/records/appointments/${id}`
      ),
    enabled: !!id,
  });
}
