import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE        = "/admin/doctors";
const WALLET_BASE = "/admin/wallets/doctors";
const APPT_BASE   = "/admin/appointments";
const IC_BASE     = "/admin/instant-consultations";
const CERT_BASE   = "/admin/certification-doctors";
const SPEC_BASE   = "/admin/specializations";
const SPEC_FEE_BASE = "/admin/specialization-fees";
const DOC_CONSULT_BASE = "/admin/doctor-consultations";
const QUICK_CONSULT_BASE = "/admin/quick-consultations/doctor";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ApiDoctorUser {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  country_code?: string | null;
  is_verified?: boolean;
  status?: string | null;
  avatar?: string | null;
}

export interface ApiEducation {
  id: number;
  doctor_id?: number;
  degree: string;
  institution: string;
  country?: string | null;
  start_year?: string | number | null;
  end_year?: string | number | null;
  is_active?: boolean;
}

export interface ApiExperience {
  id: number;
  doctor_id?: number;
  job_title: string;
  workplace: string;
  description?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  is_active?: boolean;
}

export interface ApiQualification {
  id: number;
  doctor_id?: number;
  title: string;
  issuing_body?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  certificate_file?: string | null;
  is_active?: boolean;
}

export interface ApiAvailability {
  id: number;
  day: string;
  start_time: string;
  end_time: string;
}

export interface ApiSocialLink {
  id: number;
  platform: string;
  url: string;
}

export interface ApiHospital {
  id: number;
  name: string;
  address?: string | null;
}

export interface ApiWallet {
  id: number;
  doctor_id: number;
  balance: string | number;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiLocalizedName {
  id?: number;
  name?: string | null;
  name_en?: string | null;
  name_fr?: string | null;
  name_kiny?: string | null;
}

export interface ApiDoctor {
  id: number;
  user_id?: number;
  slug?: string | null;
  status: "active" | "pending" | "suspended" | "rejected";
  specialization?: string | ApiLocalizedName | null;
  doctor_degree?: string | null;
  degree_document?: string | null;
  medical_license?: string | null;
  medical_license_document?: string | null;
  national_id_document?: string | null;
  signature?: string | null;
  designations?: string | null;
  bio_en?: string | null;
  bio_fr?: string | null;
  bio_kiny?: string | null;
  consultation_fee?: string | number | null;
  currency?: string | null;
  is_available?: boolean;
  instant_consultation?: boolean;
  bookings_paused?: boolean;
  consultation_type?: "instant" | "booking" | "both" | string | null;
  image?: string | null;
  preferred_language?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  rating_avg?: string | number | null;
  show_homepage?: boolean;
  agreement_status?: string | null;
  verified_at?: string | null;
  registration_fee_paid?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  user: ApiDoctorUser;
  educations?: ApiEducation[];
  experiences?: ApiExperience[];
  qualifications?: ApiQualification[];
  availabilities?: ApiAvailability[];
  social_links?: ApiSocialLink[] | null;
  /** @deprecated use social_links */
  socialLinks?: ApiSocialLink[];
  hospitals?: ApiHospital[];
  pharmacy?: {
    id: number;
    status: string;
    is_active: boolean;
  } | null;
}

export interface PaginatedDoctors {
  current_page: number;
  data: ApiDoctor[];
  per_page: number;
  total: number;
}

export interface GetAdminDoctorsParams {
  status?: string;
  specialization?: string;
  specialization_fee_id?: number;   // ← add
  consultation_type?: string;
  search?: string;
  page?: number;
}

interface DoctorActionResponse {
  message?: string;
  doctor?: ApiDoctor;
  data?: ApiDoctor;
}

function unwrapDoctorAction(response: DoctorActionResponse | ApiDoctor): ApiDoctor {
  const maybeWrapped = response as DoctorActionResponse;
  return maybeWrapped.doctor ?? maybeWrapped.data ?? (response as ApiDoctor);
}

function syncDoctorCaches(
  qc: ReturnType<typeof useQueryClient>,
  doctor: ApiDoctor | undefined,
  fallbackId: number,
) {
  const doctorId = doctor?.id ?? fallbackId;
  if (doctor) qc.setQueryData(doctorKeys.detail(doctorId), doctor);
  qc.invalidateQueries({ queryKey: doctorKeys.all() });
  qc.invalidateQueries({ queryKey: doctorKeys.detail(doctorId) });
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface ApiAppointment {
  id: number;
  status: string;
  type: string;
  booking_type: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  daily_room_url?: string | null;
  patient: { id: number; name: string };
  doctor: { id: number; user: { name: string } };
  hospital: { id: number; name_en: string } | null;
  insurance: unknown | null;
  notes?: unknown[];
  slot?: unknown;
}

export interface PaginatedAppointments {
  current_page: number;
  data: ApiAppointment[];
  per_page: number;
  total: number;
}

export interface GetAppointmentsParams {
  status?: string;
  type?: string;
  booking_type?: string;
  date?: string;
  doctor_id?: number;
  page?: number;
}

// ─── Instant Consultations ────────────────────────────────────────────────────

export interface ApiInstantConsultation {
  id: number;
  active: boolean;
  doctor: {
    id: number;
    user: { name: string; email: string };
  };
  created_at: string;
  deleted_at: string | null;
}

// ─── Certification Doctors ────────────────────────────────────────────────────

export interface ApiCertificationDoctor {
  id: number;
  status: "active" | "inactive";
  is_available: boolean;
  pending_count: number;
  in_review_count: number;
  doctor: {
    id: number;
    user: { name: string; email: string };
  };
  created_at: string;
}

// ─── Specializations ─────────────────────────────────────────────────────────

export interface ApiSpecialization {
  id: number;
  name: string;
  name_fr?: string | null;
  name_kiny?: string | null;
  slug: string;
  description?: string | null;
  created_at?: string;
}

// ─── Specialization Fees ─────────────────────────────────────────────────────

export interface ApiSpecializationFee {
  id: number;
  specialization: string | ApiLocalizedName;
  slug: string;
  online_fee: number;
  in_person_fee: number;
  currency: string;
  is_active: boolean;
  doctor_consultations_count?: number;
  created_at?: string;
}

// ─── Doctor Consultations ─────────────────────────────────────────────────────

export interface ApiDoctorConsultation {
  id: number;
  doctor_id: number;
  primary_specialization: string;
  secondary_specialization: string | null;
  online_fee_override: number | null;
  in_person_fee_override: number | null;
  override_reason: string | null;
  is_active: boolean;
  doctor: {
    id: number;
    user: { id: number; name: string; phone: string };
  };
  specialization_fee: {
    id: number;
    online_fee: number;
    in_person_fee: number;
  };
  override_set_by: unknown | null;
}

// ─── Quick Consultations ──────────────────────────────────────────────────────

export interface ApiQuickConsultation {
  id: number;
  status: "pending" | "confirmed" | "accepted" | "in_progress" | "completed" | "cancelled" | "withdrawn";
  guest_name?: string | null;
  guest_phone?: string | null;
  /** Registered patient (null for guest bookings) */
  user?: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  doctor: {
    id: number;
    user: { id: number; name: string };
  };
  notes?: string | null;
  duration_minutes?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  daily_room_url?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  amount?: number | null;
  currency?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PaginatedQuickConsultations {
  current_page: number;
  data: ApiQuickConsultation[];
  per_page: number;
  total: number;
}

export interface GetQuickConsultationsParams {
  /** doctor id — required; determines the endpoint */
  doctor_id: number;
  status?: "pending" | "confirmed" | "accepted" | "in_progress" | "completed" | "cancelled" | "withdrawn" | "";
  search?: string;
  /** Y-m-d */
  from?: string;
  /** Y-m-d */
  to?: string;
  page?: number;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const doctorKeys = {
  all:                  ()                                => ["admin-doctors"]                       as const,
  list:                 (p: GetAdminDoctorsParams)        => ["admin-doctors", p]                   as const,
  detail:               (id: number | null)               => ["admin-doctor", id]                   as const,
  wallet:               (id: number)                      => ["admin-doctor-wallet", id]             as const,
  appointments:         (p: GetAppointmentsParams)        => ["admin-appointments", p]               as const,
  instantList:          ()                                => ["admin-instant-consultations"]         as const,
  certList:             ()                                => ["admin-certification-doctors"]         as const,
  specializationList:   ()                                => ["admin-specializations"]               as const,
  specFeeList:          ()                                => ["admin-specialization-fees"]           as const,
  doctorConsultList:    ()                                => ["admin-doctor-consultations"]          as const,
  quickConsultations:   (p: GetQuickConsultationsParams)  => ["admin-quick-consultations", p]       as const,
};

// ─── Doctors ──────────────────────────────────────────────────────────────────

export function useGetAdminDoctors(params: GetAdminDoctorsParams = {}) {
  const { status, specialization, specialization_fee_id, consultation_type, search, page = 1 } = params;
  return useQuery<PaginatedDoctors>({
    queryKey: doctorKeys.list({ status, specialization, specialization_fee_id, consultation_type, search, page }),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)                qs.set("status", status);
      if (specialization)        qs.set("specialization", specialization);
      if (specialization_fee_id) qs.set("specialization_fee_id", String(specialization_fee_id)); // ← add
      if (consultation_type)     qs.set("consultation_type", consultation_type);
      if (search)                qs.set("search", search);
      if (page > 1)              qs.set("page", String(page));
      const url = qs.toString() ? `${BASE}?${qs}` : BASE;
      return apiFetch<PaginatedDoctors>(url);
    },
  });
}

export function useGetAdminDoctor(id: number | null) {
  return useQuery<ApiDoctor>({
    queryKey: doctorKeys.detail(id),
    queryFn: () =>
      apiFetch<{ doctor: ApiDoctor }>(`${BASE}/${id}`).then((r) => r.doctor),
    enabled: !!id,
  });
}

export function useApproveDoctor() {
  const qc = useQueryClient();
  return useMutation<ApiDoctor, Error, number>({
    mutationFn: (id) =>
      apiFetch<DoctorActionResponse | ApiDoctor>(`${BASE}/${id}/approve`, { method: "PUT" }).then(unwrapDoctorAction),
    onSuccess: (doctor, id) => syncDoctorCaches(qc, doctor, id),
  });
}

export function useRejectDoctor() {
  const qc = useQueryClient();
  return useMutation<ApiDoctor, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<DoctorActionResponse | ApiDoctor>(`${BASE}/${id}/reject`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then(unwrapDoctorAction),
    onSuccess: (doctor, { id }) => syncDoctorCaches(qc, doctor, id),
  });
}

export function useSuspendDoctor() {
  const qc = useQueryClient();
  return useMutation<ApiDoctor, Error, { id: number; reason?: string }>({
    mutationFn: ({ id, reason }) =>
      apiFetch<DoctorActionResponse | ApiDoctor>(`${BASE}/${id}/suspend`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      }).then(unwrapDoctorAction),
    onSuccess: (doctor, { id }) => syncDoctorCaches(qc, doctor, id),
  });
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export function useGetDoctorWallet(doctorId: number) {
  return useQuery<ApiWallet>({
    queryKey: doctorKeys.wallet(doctorId),
    queryFn: () =>
      apiFetch<{ wallet: ApiWallet } | ApiWallet>(`${WALLET_BASE}/${doctorId}`).then(
        (r) => ("wallet" in r ? r.wallet : r),
      ),
    enabled: !!doctorId,
  });
}

export function useTopupDoctorWallet() {
  const qc = useQueryClient();
  return useMutation<ApiWallet, Error, { id: number; amount: number; note?: string }>({
    mutationFn: ({ id, amount, note }) =>
      apiFetch<{ wallet: ApiWallet } | ApiWallet>(`${WALLET_BASE}/${id}/topup`, {
        method: "POST",
        body: { amount, note },
      }).then((r) => ("wallet" in r ? r.wallet : r)),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: doctorKeys.wallet(id) }),
  });
}

export function useDeductDoctorWallet() {
  const qc = useQueryClient();
  return useMutation<ApiWallet, Error, { id: number; amount: number; note?: string }>({
    mutationFn: ({ id, amount, note }) =>
      apiFetch<{ wallet: ApiWallet } | ApiWallet>(`${WALLET_BASE}/${id}/deduct`, {
        method: "POST",
        body: { amount, note },
      }).then((r) => ("wallet" in r ? r.wallet : r)),
    onSuccess: (_data, { id }) => qc.invalidateQueries({ queryKey: doctorKeys.wallet(id) }),
  });
}

export function useDeleteDoctorWallet() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`${WALLET_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: doctorKeys.wallet(id) }),
  });
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function useGetAppointments(params: GetAppointmentsParams = {}) {
  const { status, type, booking_type, date, doctor_id, page = 1 } = params;
  return useQuery<PaginatedAppointments>({
    queryKey: doctorKeys.appointments(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)       qs.set("status", status);
      if (type)         qs.set("type", type);
      if (booking_type) qs.set("booking_type", booking_type);
      if (date)         qs.set("date", date);
      if (doctor_id)    qs.set("doctor_id", String(doctor_id));
      if (page > 1)     qs.set("page", String(page));
      const url = qs.toString() ? `${APPT_BASE}?${qs}` : APPT_BASE;
      return apiFetch<PaginatedAppointments>(url);
    },
  });
}

export function useGetAppointment(id: number | null) {
  return useQuery<ApiAppointment>({
    queryKey: ["admin-appointment", id],
    queryFn: () =>
      apiFetch<{ appointment: ApiAppointment }>(`${APPT_BASE}/${id}`).then((r) => r.appointment),
    enabled: !!id,
  });
}

// ─── Quick Consultations ──────────────────────────────────────────────────────

export function useGetDoctorQuickConsultations(params: GetQuickConsultationsParams) {
  const { doctor_id, status, search, from, to, page = 1 } = params;
  return useQuery<PaginatedQuickConsultations>({
    queryKey: doctorKeys.quickConsultations(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status)   qs.set("status", status);
      if (search)   qs.set("search", search);
      if (from)     qs.set("from", from);
      if (to)       qs.set("to", to);
      if (page > 1) qs.set("page", String(page));
      const base = `${QUICK_CONSULT_BASE}/${doctor_id}`;
      const url  = qs.toString() ? `${base}?${qs}` : base;
      return apiFetch<PaginatedQuickConsultations>(url);
    },
    enabled: !!doctor_id,
  });
}

// ─── Instant Consultations ────────────────────────────────────────────────────

export function useGetInstantConsultations() {
  return useQuery<ApiInstantConsultation[]>({
    queryKey: doctorKeys.instantList(),
    queryFn: () =>
      apiFetch<{ data: ApiInstantConsultation[] }>(IC_BASE).then((r) => r.data),
  });
}

export function useAddInstantConsultation() {
  const qc = useQueryClient();
  return useMutation<ApiInstantConsultation, Error, { doctor_id: number; active?: boolean }>({
    mutationFn: (body) =>
      apiFetch<{ data: ApiInstantConsultation }>(IC_BASE, { method: "POST", body }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.instantList() }),
  });
}

export function useUpdateInstantConsultation() {
  const qc = useQueryClient();
  return useMutation<ApiInstantConsultation, Error, { id: number; active: boolean }>({
    mutationFn: ({ id, active }) =>
      apiFetch<{ data: ApiInstantConsultation }>(`${IC_BASE}/${id}`, {
        method: "PUT",
        body: { active },
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.instantList() }),
  });
}

export function useRemoveInstantConsultation() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`${IC_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.instantList() }),
  });
}

// ─── Certification Doctors ────────────────────────────────────────────────────

export function useGetCertificationDoctors() {
  return useQuery<ApiCertificationDoctor[]>({
    queryKey: doctorKeys.certList(),
    queryFn: () =>
      apiFetch<{ certification_doctors: ApiCertificationDoctor[] }>(CERT_BASE).then(
        (r) => r.certification_doctors,
      ),
  });
}

export function useAddCertificationDoctor() {
  const qc = useQueryClient();
  return useMutation<ApiCertificationDoctor, Error, { doctor_id: number }>({
    mutationFn: (body) =>
      apiFetch<{ certification_doctor: ApiCertificationDoctor }>(CERT_BASE, {
        method: "POST",
        body,
      }).then((r) => r.certification_doctor),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.certList() }),
  });
}

export function useUpdateCertificationDoctor() {
  const qc = useQueryClient();
  return useMutation<
    ApiCertificationDoctor,
    Error,
    { id: number; status?: string; is_available?: boolean }
  >({
    mutationFn: ({ id, ...body }) =>
      apiFetch<{ certification_doctor: ApiCertificationDoctor }>(`${CERT_BASE}/${id}`, {
        method: "PUT",
        body,
      }).then((r) => r.certification_doctor),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.certList() }),
  });
}

export function useRemoveCertificationDoctor() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`${CERT_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.certList() }),
  });
}

// ─── Specializations ─────────────────────────────────────────────────────────

export function useGetSpecializations() {
  return useQuery<ApiSpecialization[]>({
    queryKey: doctorKeys.specializationList(),
    queryFn: () =>
      apiFetch<{ specializations: ApiSpecialization[] }>(SPEC_BASE).then(
        (r) => r.specializations,
      ),
  });
}

export function useCreateSpecialization() {
  const qc = useQueryClient();
  return useMutation<ApiSpecialization, Error, { name: string; description?: string }>({
    mutationFn: (body) =>
      apiFetch<{ specialization: ApiSpecialization }>(SPEC_BASE, { method: "POST", body }).then(
        (r) => r.specialization,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.specializationList() }),
  });
}

export function useUpdateSpecialization() {
  const qc = useQueryClient();
  return useMutation<ApiSpecialization, Error, { id: number; name?: string; description?: string }>({
    mutationFn: ({ id, ...body }) =>
      apiFetch<{ specialization: ApiSpecialization }>(`${SPEC_BASE}/${id}`, {
        method: "PUT",
        body,
      }).then((r) => r.specialization),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.specializationList() }),
  });
}

export function useDeleteSpecialization() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`${SPEC_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.specializationList() }),
  });
}

// ─── Specialization Fees ─────────────────────────────────────────────────────

export function useGetSpecializationFees() {
  return useQuery<ApiSpecializationFee[]>({
    queryKey: doctorKeys.specFeeList(),
    queryFn: () =>
      apiFetch<{ specialization_fees: ApiSpecializationFee[] }>(SPEC_FEE_BASE).then(
        (r) => r.specialization_fees,
      ),
  });
}

export function useCreateSpecializationFee() {
  const qc = useQueryClient();
  return useMutation<
    ApiSpecializationFee,
    Error,
    { specialization_id: number; online_fee: number; in_person_fee: number; currency?: string; description?: string }
  >({
    mutationFn: (body) =>
      apiFetch<{ fee: ApiSpecializationFee }>(SPEC_FEE_BASE, { method: "POST", body }).then(
        (r) => r.fee,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.specFeeList() }),
  });
}

export function useUpdateSpecializationFee() {
  const qc = useQueryClient();
  return useMutation<
    ApiSpecializationFee,
    Error,
    { id: number; online_fee?: number; in_person_fee?: number; is_active?: boolean }
  >({
    mutationFn: ({ id, ...body }) =>
      apiFetch<{ fee: ApiSpecializationFee }>(`${SPEC_FEE_BASE}/${id}`, {
        method: "PUT",
        body,
      }).then((r) => r.fee),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.specFeeList() }),
  });
}

export function useDeleteSpecializationFee() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch<void>(`${SPEC_FEE_BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.specFeeList() }),
  });
}

// ─── Doctor Consultations ─────────────────────────────────────────────────────

export function useGetDoctorConsultations() {
  return useQuery<ApiDoctorConsultation[]>({
    queryKey: doctorKeys.doctorConsultList(),
    queryFn: () =>
      apiFetch<{ doctor_consultations: ApiDoctorConsultation[] }>(DOC_CONSULT_BASE).then(
        (r) => r.doctor_consultations,
      ),
  });
}

export function useAssignDoctorConsultation() {
  const qc = useQueryClient();
  return useMutation<
    ApiDoctorConsultation,
    Error,
    { doctor_id: number; specialization_fee_id: number; primary_specialization: string; secondary_specialization?: string }
  >({
    mutationFn: (body) =>
      apiFetch<{ consultation: ApiDoctorConsultation }>(DOC_CONSULT_BASE, {
        method: "POST",
        body,
      }).then((r) => r.consultation),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.doctorConsultList() }),
  });
}

export function useUpdateDoctorConsultation() {
  const qc = useQueryClient();
  return useMutation<
    ApiDoctorConsultation,
    Error,
    { doctorId: number; specialization_fee_id?: number; primary_specialization?: string; is_active?: boolean }
  >({
    mutationFn: ({ doctorId, ...body }) =>
      apiFetch<{ consultation: ApiDoctorConsultation }>(`${DOC_CONSULT_BASE}/${doctorId}`, {
        method: "PUT",
        body,
      }).then((r) => r.consultation),
    onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.doctorConsultList() }),
  });
}



// export function useSetDoctorFeeOverride() {
//   const qc = useQueryClient();
//   return useMutation<
//     { message: string; record: ApiDoctorConsultation; resolved_online_fee: number; resolved_in_person_fee: number },
//     Error,
//     {
//       doctorId: number;
//       online_fee_override: number | null;
//       in_person_fee_override: number | null;
//       override_reason: string | null;
//     }
//   >({
//     mutationFn: ({ doctorId, ...body }) =>
//       apiFetch(`${DOC_CONSULT_BASE}/${doctorId}/fee-override`, { method: "PUT", body }),
//     onSuccess: () => qc.invalidateQueries({ queryKey: doctorKeys.doctorConsultList() }),
//   });
// }

// ─── Add / replace in use-admin-doctors.ts ───────────────────────────────────

export interface ApiDoctorConsultationRecord {
  id: number;
  doctor_id: number;
  specialization_id: number | null;
  specialization_fee_id: number;
  online_fee_override: string | number | null;     // API returns "5000.00" string
  in_person_fee_override: string | number | null;  // API returns "10000.00" string
  override_reason: string | null;
  is_active: boolean;
  resolved_online_fee: number;
  resolved_in_person_fee: number;
  created_at?: string | null;
  updated_at?: string | null;
  specialization_fee: {
    id: number;
    specialization_id: number;
    sub_specialization: string;
    sub_specialization_fr?: string | null;
    sub_specialization_kiny?: string | null;
    tier_name?: string | null;
    slug: string;
    online_fee: string | number;     // "3500.00"
    in_person_fee: string | number;  // "5500.00"
    currency: string;
    description?: string | null;
    is_active: boolean;
  };
  specialization: {
    id: number;
    name: string;
    name_fr?: string | null;
    name_kiny?: string | null;
    slug: string;
    description?: string | null;
    icon?: string | null;
    is_active: boolean;
  } | null;
  doctor: {
    id: number;
    user: { id: number; name: string; phone?: string | null; email?: string | null };
  };
}

export interface ApiDoctorConsultationFeesResponse {
  doctor_id: number;
  records: ApiDoctorConsultationRecord[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useGetDoctorConsultationFees(doctorId: number | null) {
  return useQuery<ApiDoctorConsultationFeesResponse>({
    queryKey: ["admin-doctor-consult-fees", doctorId],
    queryFn: () =>
      apiFetch<ApiDoctorConsultationFeesResponse>(`${DOC_CONSULT_BASE}/${doctorId}`),
    enabled: !!doctorId,
    retry: (failureCount, error) => {
      if ((error as { status?: number })?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useUpdateDoctorConsultationFee() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; record: ApiDoctorConsultationRecord },
    Error,
    {
      doctorId: number;
      specialization_fee_id: number;
      is_active?: boolean;
      specialization_id?: number;
    }
  >({
    mutationFn: ({ doctorId, ...body }) =>
      apiFetch(`${DOC_CONSULT_BASE}/${doctorId}`, { method: "PUT", body }),
    onSuccess: (_data, { doctorId }) => {
      qc.invalidateQueries({ queryKey: ["admin-doctor-consult-fees", doctorId] });
    },
  });
}

// Also update useSetDoctorFeeOverride to invalidate the per-doctor query:
export function useSetDoctorFeeOverride() {
  const qc = useQueryClient();
  return useMutation<
    { message: string; record: ApiDoctorConsultationRecord; resolved_online_fee: number; resolved_in_person_fee: number },
    Error,
    {
      doctorId: number;
      online_fee_override: number | null;
      in_person_fee_override: number | null;
      override_reason: string | null;
    }
  >({
    mutationFn: ({ doctorId, ...body }) =>
      apiFetch(`${DOC_CONSULT_BASE}/${doctorId}/fee-override`, { method: "PUT", body }),
    onSuccess: (_data, { doctorId }) => {
      qc.invalidateQueries({ queryKey: ["admin-doctor-consult-fees", doctorId] });
    },
  });
}




// ─── Add to use-admin-doctors.ts ─────────────────────────────────────────────
// New per-doctor availability toggle hooks.
// Add these constants at the top with the other BASE URLs:
//   const DOCTOR_AVAIL_BASE = "/admin/doctors";  // already exists as BASE

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiInstantStatus {
  doctor_id: number;
  instant_consultation: boolean;
  status: string;
}

export interface ApiInstantToggleResponse {
  message: string;
  doctor_id: number;
  instant_consultation: boolean;
}

export interface ApiPausedStatus {
  doctor_id: number;
  bookings_paused: boolean;
  status: string;
}

export interface ApiPausedToggleResponse {
  message: string;
  doctor_id: number;
  bookings_paused: boolean;
}

// ── Query keys (add to doctorKeys) ────────────────────────────────────────────
//   instantStatus: (id: number) => ["admin-doctor-instant-status", id] as const,
//   pausedStatus:  (id: number) => ["admin-doctor-paused-status",  id] as const,

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useGetInstantStatus(doctorId: number) {
  return useQuery<ApiInstantStatus>({
    queryKey: ["admin-doctor-instant-status", doctorId],
    queryFn: () => apiFetch<ApiInstantStatus>(`${BASE}/${doctorId}/instant-status`),
    enabled: !!doctorId,
  });
}

export function useToggleInstant(doctorId: number) {
  const qc = useQueryClient();
  return useMutation<ApiInstantToggleResponse, Error>({
    mutationFn: () =>
      apiFetch<ApiInstantToggleResponse>(`${BASE}/${doctorId}/toggle-instant`, {
        method: "PUT",
      }),
    onSuccess: (data) => {
      // update the status cache directly so no extra round-trip needed
      qc.setQueryData<ApiInstantStatus>(
        ["admin-doctor-instant-status", doctorId],
        (prev) => prev
          ? { ...prev, instant_consultation: data.instant_consultation }
          : undefined,
      );
      // also invalidate the doctor detail so the overview tab stays in sync
      qc.invalidateQueries({ queryKey: ["admin-doctor", doctorId] });
    },
  });
}

export function useGetPausedStatus(doctorId: number) {
  return useQuery<ApiPausedStatus>({
    queryKey: ["admin-doctor-paused-status", doctorId],
    queryFn: () => apiFetch<ApiPausedStatus>(`${BASE}/${doctorId}/paused-status`),
    enabled: !!doctorId,
  });
}

export function useTogglePaused(doctorId: number) {
  const qc = useQueryClient();
  return useMutation<ApiPausedToggleResponse, Error>({
    mutationFn: () =>
      apiFetch<ApiPausedToggleResponse>(`${BASE}/${doctorId}/toggle-paused`, {
        method: "PUT",
      }),
    onSuccess: (data) => {
      qc.setQueryData<ApiPausedStatus>(
        ["admin-doctor-paused-status", doctorId],
        (prev) => prev
          ? { ...prev, bookings_paused: data.bookings_paused }
          : undefined,
      );
      qc.invalidateQueries({ queryKey: ["admin-doctor", doctorId] });
    },
  });
}

