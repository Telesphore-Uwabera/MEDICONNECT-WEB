import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/doctor-consultations";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiDoctorUser {
  id: number;
  name: string;
  phone: string;
}

export interface ApiDoctorConsultationDoctor {
  id: number;
  user: ApiDoctorUser;
}

export interface ApiSpecializationFee {
  id: number;
  online_fee: number;
  in_person_fee: number;
}

export interface ApiDoctorConsultation {
  id: number;
  doctor_id: number;
  primary_specialization: string | null;
  secondary_specialization: string | null;
  online_fee_override: number | null;
  in_person_fee_override: number | null;
  override_reason: string | null;
  is_active: boolean;
  doctor: ApiDoctorConsultationDoctor;
  specialization_fee: ApiSpecializationFee | null;
  override_set_by: number | null;
}

export interface GetDoctorConsultationsResponse {
  doctor_consultations: ApiDoctorConsultation[];
}

export interface AssignDoctorPayload {
  doctor_id: number;
  specialization_fee_id: number;
  primary_specialization: string;
  secondary_specialization?: string;
}

export interface AssignDoctorResponse {
  message: string;
  consultation: {
    id: number;
    doctor_id: number;
    specialization_fee_id: number;
    primary_specialization: string;
    is_active: boolean;
  };
}

export interface UpdateConsultationPayload {
  doctor_id: number; // used as path param
  specialization_fee_id?: number;
  primary_specialization?: string;
  secondary_specialization?: string;
  is_active?: boolean;
}

export interface UpdateConsultationResponse {
  message: string;
  consultation: {
    doctor_id: number;
    specialization_fee_id: number;
    primary_specialization: string;
    is_active: boolean;
  };
}

export interface FeeOverridePayload {
  doctor_id: number; // used as path param
  online_fee_override: number | null;
  in_person_fee_override: number | null;
  override_reason: string | null;
}

export interface FeeOverrideResponse {
  message: string;
  consultation: {
    doctor_id: number;
    online_fee_override: number | null;
    in_person_fee_override: number | null;
    override_reason: string | null;
  };
  resolved_online_fee: number;
  resolved_in_person_fee: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/* GET /admin/doctor-consultations */
export function useGetDoctorConsultations() {
  return useQuery<GetDoctorConsultationsResponse>({
    queryKey: ["doctor-consultations"],
    queryFn: () => apiFetch(BASE),
  });
}

/* POST /admin/doctor-consultations */
export function useAssignDoctorConsultation() {
  const qc = useQueryClient();
  return useMutation<AssignDoctorResponse, Error, AssignDoctorPayload>({
    mutationFn: (payload) =>
      apiFetch(BASE, { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-consultations"] }),
  });
}

/* PUT /admin/doctor-consultations/{doctorId} */
export function useUpdateDoctorConsultation() {
  const qc = useQueryClient();
  return useMutation<UpdateConsultationResponse, Error, UpdateConsultationPayload>({
    mutationFn: ({ doctor_id, ...body }) =>
      apiFetch(`${BASE}/${doctor_id}`, { method: "PUT", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-consultations"] }),
  });
}

/* PUT /admin/doctor-consultations/{doctorId}/fee-override */
export function useSetFeeOverride() {
  const qc = useQueryClient();
  return useMutation<FeeOverrideResponse, Error, FeeOverridePayload>({
    mutationFn: ({ doctor_id, ...body }) =>
      apiFetch(`${BASE}/${doctor_id}/fee-override`, { method: "PUT", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctor-consultations"] }),
  });
}
