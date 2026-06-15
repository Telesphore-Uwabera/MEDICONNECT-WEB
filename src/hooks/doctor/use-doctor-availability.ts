import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface Hospital {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface RecurringAvailability {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  type: "online" | "in_person";
  hospital: Hospital | null;
}

export interface AvailabilityPeriod {
  id: number;
  from_date: string;
  to_date: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  type: "online" | "in_person";
  hospital: Hospital | null;
  label?: string;
}

export interface AvailabilityResponse {
  recurring_availability: RecurringAvailability[];
  availability_periods: AvailabilityPeriod[];
}

export interface Slot {
  id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  type: "online" | "in_person";
  status: "available" | "booked" | "blocked" | "reserved";
}

export interface SlotsResponse {
  slots: Record<string, Slot[]>;
  total: number;
  doctor: {
    instant_consultation: boolean;
    bookings_paused: boolean;
  };
}

export type SlotStatus = "available" | "booked" | "blocked" | "reserved";

/* ─────────────────────────────────────────────
   Query Keys
───────────────────────────────────────────── */

export const availabilityKeys = {
  all: ["availability"] as const,
  slots: (params?: Record<string, string>) =>
    ["slots", params ?? {}] as const,
};

/* ─────────────────────────────────────────────
   2.1  GET /availability
───────────────────────────────────────────── */

export function useGetAvailability() {
  return useQuery({
    queryKey: availabilityKeys.all,
    queryFn: () => apiFetch<AvailabilityResponse>("/doctor/availability"),
  });
}

/* ─────────────────────────────────────────────
   2.2  POST /availability  — Create Recurring
───────────────────────────────────────────── */

export interface CreateRecurringPayload {
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_minutes?: number;
  type: "online" | "in_person";
  hospital_id: number | null;
}

export function useCreateRecurringAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecurringPayload) =>
      apiFetch<{ message: string; slot: RecurringAvailability }>(
        "/doctor/availability",
        { method: "POST", body: payload }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/* ─────────────────────────────────────────────
   2.3  PUT /availability/{id}  — Update Recurring
───────────────────────────────────────────── */

export interface UpdateRecurringPayload {
  start_time?: string;
  end_time?: string;
  slot_duration_minutes?: number;
  buffer_minutes?: number;
}

export function useUpdateRecurringAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateRecurringPayload;
    }) =>
      apiFetch<{ message: string; slot: RecurringAvailability; slots_generated: number }>(
        `/doctor/availability/${id}`,
        { method: "PUT", body: payload }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/* ─────────────────────────────────────────────
   2.4  DELETE /availability/{id}
───────────────────────────────────────────── */

export function useDeleteRecurringAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/doctor/availability/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
    },
  });
}

/* ─────────────────────────────────────────────
   2.5  POST /availability/periods  — Create Period
───────────────────────────────────────────── */

export interface CreatePeriodPayload {
  from_date: string;
  to_date: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  type: "online" | "in_person";
  hospital_id?: number | null;
  label?: string;
}

// use-doctor-availability.ts
export function useCreateAvailabilityPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePeriodPayload) =>
      apiFetch<{
        message: string;
        saved: {
          day: string;
          from_date: string;
          to_date: string;
          slots_generated: number;
          note: string;
        }[];
        skipped_days: string[];
      }>("/doctor/availability/periods", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   2.6  PUT /availability/periods/{id}
───────────────────────────────────────────── */

export interface UpdatePeriodPayload {
  to_date?: string;
  start_time?: string;
  end_time?: string;
  label?: string;
}

export function useUpdateAvailabilityPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdatePeriodPayload;
    }) =>
      apiFetch<{
        message: string;
        period: AvailabilityPeriod;
        available_dates: string[];
      }>(`/doctor/availability/periods/${id}`, { method: "PUT", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   2.7  DELETE /availability/periods/{id}
───────────────────────────────────────────── */

export function useDeleteAvailabilityPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/doctor/availability/periods/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   2.8  DELETE /availability/all  — Reset whole schedule
───────────────────────────────────────────── */

export function useDeleteAllSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/doctor/availability/all", {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: availabilityKeys.all });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   3.1  GET /slots
───────────────────────────────────────────── */

export interface GetSlotsParams {
  date?: string;
  from?: string;
  to?: string;
  status?: SlotStatus;
  type?: "online" | "in_person";
}

export function useGetSlots(params?: GetSlotsParams) {
  const query = new URLSearchParams(
    Object.entries(params ?? {}).filter(([, v]) => Boolean(v)) as [string, string][]
  ).toString();

  return useQuery({
    queryKey: availabilityKeys.slots(params as Record<string, string>),
    queryFn: () =>
      apiFetch<SlotsResponse>(`/doctor/slots`),
    enabled: true,
  });
}

/* ─────────────────────────────────────────────
   3.2  PATCH /slots/{id}  — Update Single Slot
───────────────────────────────────────────── */

export function useUpdateSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: Exclude<SlotStatus, "booked">;
    }) =>
      apiFetch<{ message: string; slot: Slot }>(`/doctor/slots/${id}`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   3.3  POST /slots/bulk  — Bulk Update by Date
───────────────────────────────────────────── */

export function useBulkUpdateSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      date,
      status,
    }: {
      date: string;
      status: Exclude<SlotStatus, "booked">;
    }) =>
      apiFetch<{ message: string; updated: number }>("/doctor/slots/bulk", {
        method: "POST",
        body: { date, status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   3.4  POST /slots/generate  — Generate Manually
───────────────────────────────────────────── */

export function useGenerateSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      source,
      source_id,
    }: {
      source: "availability" | "period";
      source_id: number;
    }) =>
      apiFetch<{ message: string; slots_generated: number }>("/doctor/slots/generate", {
        method: "POST",
        body: { source, source_id },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   4.1  PATCH /toggle/instant
───────────────────────────────────────────── */

export function useToggleInstantConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string; instant_consultation: boolean }>(
        "/doctor/toggle/instant",
        { method: "PATCH" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

/* ─────────────────────────────────────────────
   4.2  PATCH /toggle/pause
───────────────────────────────────────────── */

export function useTogglePauseBookings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string; bookings_paused: boolean }>(
        "/doctor/toggle/pause",
        { method: "PATCH" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
