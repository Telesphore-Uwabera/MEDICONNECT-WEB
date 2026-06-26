import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { fetchDoctorLiveSession, type LiveSessionResponse } from "@/lib/rejoin";

const BASE = "/doctor/appointments";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export type AppointmentApiStatus =
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed";

export type AppointmentApiType = "online" | "in_person";

export interface GetAppointmentsParams {
    status?: AppointmentApiStatus;
    type?: AppointmentApiType;
    date?: string;       // "YYYY-MM-DD"
    today?: boolean;
    upcoming?: boolean;
    page?: number;
}

export interface AppointmentPatient {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    avatar?: string;
}

export interface AppointmentHospital {
    id: number;
    name: string;
    address?: string;
}

export interface AppointmentInsurance {
    id?: number;
    provider?: string;
    policy_number?: string;
}

export interface AppointmentSlot {
    id: number;
    start_time: string;
    end_time: string;
}

export interface AppointmentNotes {
    id?: number;
    chief_complaint?: string;
    diagnosis?: string;
    treatment_plan?: string;
    recommendations?: string;
    additional_notes?: string;
    blood_pressure?: string;
    temperature?: string;
    pulse_rate?: string;
    weight?: string;
    height?: string;
    follow_up_date?: string;
    follow_up_notes?: string;
    needs_follow_up?: boolean;
    is_visible_to_patient?: boolean;
}

export interface Appointment {
    id: number;
    appointment_date: string;
    appointment_time: string;
    status: AppointmentApiStatus;
    type: AppointmentApiType;
    booking_type: "quick" | "scheduled";
    patient: AppointmentPatient;
    hospital: AppointmentHospital;
    insurance?: AppointmentInsurance;
    notes?: AppointmentNotes | null;
    slot?: AppointmentSlot | null;
}

export interface AppointmentsResponse {
    data: Appointment[];
    current_page: number;
    per_page: number;
    total: number;
    stats?: {
        total?: number;
        pending?: number;
        confirmed?: number;
        completed?: number;
        today?: number;
        upcoming?: number;
        total_earned?: string;
    };
}

type RawAppointmentsResponse =
    | AppointmentsResponse
    | {
        stats?: AppointmentsResponse["stats"];
        appointments?: Partial<AppointmentsResponse> & {
            data?: Appointment[];
        };
    };

export interface SingleAppointmentResponse {
    appointment: Appointment;
}

export interface AcceptQuickResponse {
    message: string;
    appointment: Appointment;
    room_url: string;
}

export interface JoinSessionResponse {
    message: string;
    room_url?: string;
    room_name?: string;
    token?: string;
    join_url?: string;
    appointment?: Appointment;
}

export interface NotesPayload {
    chief_complaint?: string;
    diagnosis?: string;
    treatment_plan?: string;
    recommendations?: string;
    additional_notes?: string;
    blood_pressure?: string;
    temperature?: string;
    pulse_rate?: string;
    weight?: string;
    height?: string;
    follow_up_date?: string;
    follow_up_notes?: string;
    needs_follow_up?: boolean;
    is_visible_to_patient?: boolean;
}

export interface NotesResponse {
    message: string;
    notes: AppointmentNotes;
}

export interface CompleteResponse {
    message: string;
    appointment: Appointment;
}

export interface RunningLatePayload {
    delay_minutes: number;
}

export interface RunningLateResponse {
    message: string;
    delay_minutes: number;
    next_appointment: {
        id: number;
        appointment_time: string;
        patient: AppointmentPatient;
    } | null;
}

export interface ReadyNextResponse {
    message: string;
    next_appointment: {
        id: number;
        appointment_time: string;
        patient: AppointmentPatient;
    } | null;
}

/* ─────────────────────────────────────────────
   Query key factory
───────────────────────────────────────────── */

export const appointmentKeys = {
    all: () => ["appointments"] as const,
    list: (params?: GetAppointmentsParams) => ["appointments", "list", params ?? {}] as const,
    detail: (id: number) => ["appointments", "detail", id] as const,
};

/* ─────────────────────────────────────────────
   Helpers — build query string from params
───────────────────────────────────────────── */

function buildQuery(params: GetAppointmentsParams): string {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.type) q.set("type", params.type);
    if (params.date) q.set("date", params.date);
    if (params.today) q.set("today", "true");
    if (params.upcoming) q.set("upcoming", "true");
    if (params.page && params.page > 1) q.set("page", String(params.page));
    const qs = q.toString();
    return qs ? `?${qs}` : "";
}

function normalizeAppointmentsResponse(
    response: RawAppointmentsResponse,
): AppointmentsResponse {
    if (Array.isArray((response as AppointmentsResponse).data)) {
        return response as AppointmentsResponse;
    }

    const nested = (response as Extract<RawAppointmentsResponse, { appointments?: unknown }>).appointments;
    if (nested && Array.isArray(nested.data)) {
        return {
            data: nested.data,
            current_page: nested.current_page ?? 1,
            per_page: nested.per_page ?? nested.data.length,
            total: nested.total ?? nested.data.length,
            stats: (response as { stats?: AppointmentsResponse["stats"] }).stats,
        };
    }

    return {
        data: [],
        current_page: 1,
        per_page: 0,
        total: 0,
        stats: (response as { stats?: AppointmentsResponse["stats"] }).stats,
    };
}

/* ─────────────────────────────────────────────
   9.1  useGetAppointments  →  GET /appointments
───────────────────────────────────────────── */

export function useGetAppointments(
    params: GetAppointmentsParams = {},
    options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
    return useQuery({
        queryKey: appointmentKeys.list(params),
        queryFn: async () => {
            const response = await apiFetch<RawAppointmentsResponse>(`${BASE}${buildQuery(params)}`);
            return normalizeAppointmentsResponse(response);
        },
        enabled: options.enabled ?? true,
        refetchInterval: options.refetchInterval,
    });
}

/* ─────────────────────────────────────────────
   9.2  useGetAppointment  →  GET /appointments/:id
───────────────────────────────────────────── */

export function useGetAppointment(id: number) {
    return useQuery({
        queryKey: appointmentKeys.detail(id),
        queryFn: () =>
            apiFetch<SingleAppointmentResponse>(`${BASE}/${id}`),
        enabled: !!id,
    });
}

/* ─────────────────────────────────────────────
   9.3  useAcceptQuick  →  POST /appointments/:id/accept
───────────────────────────────────────────── */

export function useAcceptQuick() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<AcceptQuickResponse>(`${BASE}/${id}/accept`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: appointmentKeys.all() });
        },
    });
}

/* ─────────────────────────────────────────────
   9.4  useJoinSession  →  POST /appointments/:id/join
───────────────────────────────────────────── */

export function useJoinSession() {
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<JoinSessionResponse>(`${BASE}/${id}/join`, { method: "POST" }),
    });
}

/* ─────────────────────────────────────────────
   9.5  useAddNotes  →  POST /appointments/:id/notes
───────────────────────────────────────────── */

export function useAddNotes() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: NotesPayload }) =>
            apiFetch<NotesResponse>(`${BASE}/${id}/notes`, {
                method: "POST",
                body: payload,
            }),
        onSuccess: (_data, { id }) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
        },
    });
}

/* ─────────────────────────────────────────────
   9.6  useUpdateNotes  →  PUT /appointments/:id/notes
───────────────────────────────────────────── */

export function useUpdateNotes() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: NotesPayload }) =>
            apiFetch<NotesResponse>(`${BASE}/${id}/notes`, {
                method: "PUT",
                body: payload,
            }),
        onSuccess: (_data, { id }) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
        },
    });
}

/* ─────────────────────────────────────────────
   9.7  useCompleteAppointment  →  POST /appointments/:id/complete
───────────────────────────────────────────── */

export function useCompleteAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<CompleteResponse>(`${BASE}/${id}/complete`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: appointmentKeys.all() });
        },
    });
}

/* ─────────────────────────────────────────────
   9.8  useRunningLate  →  POST /appointments/:id/running-late
───────────────────────────────────────────── */

export function useRunningLate() {
    return useMutation({
        mutationFn: ({ id, delay_minutes }: { id: number; delay_minutes: number }) =>
            apiFetch<RunningLateResponse>(`${BASE}/${id}/running-late`, {
                method: "POST",
                body: { delay_minutes },
            }),
    });
}

/* ─────────────────────────────────────────────
   9.9  useReadyNext  →  POST /appointments/:id/ready-next
───────────────────────────────────────────── */

export function useReadyNext() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<ReadyNextResponse>(`${BASE}/${id}/ready-next`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: appointmentKeys.all() });
        },
    });
}

/* ─────────────────────────────────────────────
   Instant Consultations  (section 10)
───────────────────────────────────────────── */

const IC = "/doctor/instant-consultations";

export interface InstantConsultQueueItem {
    id: number;
    guest_phone: string;
    description: string | null;
    status: "pending" | "confirmed" | "accepted" | "in_progress" | "declined" | "withdrawn" | "expired" | "completed";
    queue_position: number;
    waiting_seconds: number;
    waiting_label: string;
}

export interface InstantConsultStats {
    in_queue: number;
    seen_today: number;
    avg_duration: string;
    resolved: number;
    is_online: boolean;
}

export interface InstantConsultQueueResponse {
    queue: InstantConsultQueueItem[];
    stats: InstantConsultStats;
}

export interface InstantAcceptResponse {
    message: string;
    room_url: string;
    room_name: string;
    doctor_token: string;
}

export interface InstantJoinResponse {
    message: string;
    room_url: string;
    room_name: string;
    doctor_token: string;
}

/* 10.1  useGetInstantQueue  →  GET /instant-consultations/queue */

export function useGetInstantQueue(enabled = true) {
    return useQuery({
        queryKey: ["instant-consultations", "queue"],
        queryFn: () =>
            apiFetch<InstantConsultQueueResponse>(`${IC}/queue`),
        refetchInterval: enabled ? 10_000 : false, // poll every 10s while on that tab
        enabled,
    });
}

/* 10.2  useAcceptInstant  →  POST /instant-consultations/:id/accept */

export function useAcceptInstant() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<InstantAcceptResponse>(`${IC}/${id}/accept`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["instant-consultations"] });
        },
    });
}

/* 10.3  useDeclineInstant  →  POST /instant-consultations/:id/decline */

export function useDeclineInstant() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<{ message: string }>(`${IC}/${id}/decline`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["instant-consultations"] });
        },
    });
}

/* 10.4  useJoinInstant  →  POST /instant-consultations/:id/join */

export function useJoinInstant() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<InstantJoinResponse>(`${IC}/${id}/join`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["instant-consultations"] });
        },
    });
}

/* 10.4.5  useSaveInstantNotes  →  PUT /instant-consultations/:id/notes */

export function useSaveInstantNotes() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, notes }: { id: number; notes: string }) =>
            apiFetch<{ message: string }>(`${IC}/${id}/notes`, {
                method: "PUT",
                body: { notes },
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["instant-consultations"] });
        },
    });
}



/* 10.4.6  useDoctorLiveSession  →  GET /doctor/instant-consultations/live-session
   Returns the doctor's in-progress instant consultation (room + token) so they
   can rejoin after navigating away. Resolves to null when there's none. */

export function useDoctorLiveSession(enabled = true) {
    return useQuery<LiveSessionResponse | null>({
        queryKey: ["doctor-instant-live-session"],
        queryFn: () => fetchDoctorLiveSession(),
        enabled,
        refetchOnWindowFocus: false,
        staleTime: 10_000,
    });
}

/* 10.5  useCompleteInstant  →  POST /instant-consultations/:id/complete */

export function useCompleteInstant() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            apiFetch<{ message: string }>(`${IC}/${id}/complete`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["instant-consultations"] });
        },
    });
}
