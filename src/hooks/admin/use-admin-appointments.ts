import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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
    queryFn: async () => {
      const page = await apiFetch<AppointmentsResponse>(`${BASE}${qs ? `?${qs}` : ""}`);
      const rows = (page.data ?? []) as Array<ApiAppointment & {
        patient_id?: number;
        doctor_id?: number;
        guest_name?: string | null;
        patient?: ApiAppointmentPatient | null;
        doctor?: ApiAppointmentDoctor | null;
      }>;
      const missingPatients = [...new Set(rows.filter((row) => !row.patient?.name && row.patient_id).map((row) => row.patient_id as number))];
      const missingDoctors = [...new Set(rows.filter((row) => !row.doctor?.user?.name && row.doctor_id).map((row) => row.doctor_id as number))];
      const read = async (path: string) => {
        try {
          const body = await apiFetch<Record<string, any>>(path);
          return (body.patient || body.doctor || body.user || body.data || body) as Record<string, any> | null;
        } catch {
          return null;
        }
      };
      const withUserName = async (path: string) => {
        const record = await read(path);
        if (!record) return null;
        if (!record.user?.name && !record.name && record.user_id) {
          const user = await read(`/admin/users/${record.user_id}`);
          if (user?.name) {
            record.name = record.name || user.name;
            record.email = record.email || user.email;
            record.avatar = record.avatar || user.avatar;
            record.user = { ...(record.user || {}), name: user.name, email: user.email, avatar: user.avatar };
          }
        }
        return record;
      };
      const [patients, doctors] = await Promise.all([
        Promise.all(missingPatients.map(async (id) => [id, await withUserName(`/admin/users/${id}`)] as const)),
        Promise.all(missingDoctors.map(async (id) => [id, await withUserName(`/admin/doctors/${id}`)] as const)),
      ]);
      const patientById = new Map(patients);
      const doctorById = new Map(doctors);
      return {
        ...page,
        data: rows.map((row) => {
          const patientRow = row.patient?.name ? row.patient : patientById.get(row.patient_id ?? -1);
          const doctorRow = row.doctor?.user?.name ? row.doctor : doctorById.get(row.doctor_id ?? -1);
          const patient = patientRow as { id?: number; name?: string; email?: string; avatar?: string; user?: { name?: string; email?: string; avatar?: string } } | null;
          const doctor = doctorRow as { id?: number; name?: string; user?: { name?: string; email?: string; avatar?: string } } | null;
          return {
            ...row,
            patient: {
              id: patient?.id ?? row.patient_id ?? 0,
              name: patient?.name || patient?.user?.name || row.guest_name || "Patient",
              email: patient?.email || patient?.user?.email,
              avatar: patient?.avatar || patient?.user?.avatar,
            },
            doctor: {
              id: doctor?.id ?? row.doctor_id ?? 0,
              user: {
                name: doctor?.user?.name || doctor?.name || "Doctor",
                email: doctor?.user?.email,
                avatar: doctor?.user?.avatar,
              },
            },
          };
        }),
      };
    },
  });
}

export function useGetAdminAppointment(id: number | null) {
  return useQuery<{ appointment: ApiAppointment }>({
    queryKey: ["admin-appointment", id],
    queryFn: () => apiFetch(`${BASE}/${id}`),
    enabled: !!id,
  });
}
