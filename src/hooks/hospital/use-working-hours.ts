import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface WorkingHour {
  id: number;
  day_of_week:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  open_time: string | null;  // "HH:mm" or null
  close_time: string | null; // "HH:mm" or null
  is_closed: boolean;
  max_patients: number | null;
  is_active: boolean;
}

export interface WorkingHourInput {
  day_of_week: WorkingHour["day_of_week"];
  open_time?: string | null;
  close_time?: string | null;
  is_closed: boolean;
  max_patients?: number;
}

export interface WorkingHourPatch {
  open_time?: string | null;
  close_time?: string | null;
  is_closed?: boolean;
  max_patients?: number;
}

export interface Closure {
  id: number;
  from_date: string;  // "YYYY-MM-DD"
  to_date: string;    // "YYYY-MM-DD"
  reason: string | null;
  is_active: boolean;
}

export interface ClosureInput {
  from_date: string;
  to_date: string;
  reason?: string;
}

export interface ClosurePatch {
  from_date?: string;
  to_date?: string;
  reason?: string;
}

export interface CheckDateResult {
  date: string;
  is_closed: boolean;
  reason: string | null;
}

export interface HospitalStatus {
  is_active: boolean;
  is_accepting_bookings: boolean;
}

/* ─────────────────────────────────────────────
   Query keys
───────────────────────────────────────────── */

export const workingHoursKeys = {
  all: ["working-hours"] as const,
};

export const closuresKeys = {
  all: ["closures"] as const,
};

export const hospitalStatusKeys = {
  all: ["hospital-status"] as const,
};

/* ─────────────────────────────────────────────
   Working Hours — GET /hospital/working-hours
───────────────────────────────────────────── */

export function useGetWorkingHours() {
  return useQuery({
    queryKey: workingHoursKeys.all,
    queryFn: () =>
      apiFetch<{ working_hours: WorkingHour[] }>("/hospital/working-hours"),
    select: (data) => data.working_hours,
  });
}

/* ─────────────────────────────────────────────
   Working Hours — POST /hospital/working-hours
   Upserts one or more days at once.
───────────────────────────────────────────── */

export function useSetWorkingHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hours: WorkingHourInput[]) =>
      apiFetch<{ message: string; working_hours: WorkingHour[] }>(
        "/hospital/working-hours",
        { method: "POST", body: { hours } }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: workingHoursKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Working Hours — PUT /hospital/working-hours/{id}
   Optimistically updates the cached list so the
   toggle feels instant; rolls back on error.
───────────────────────────────────────────── */

export function useUpdateWorkingHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: WorkingHourPatch }) =>
      apiFetch<{ message: string; hour: WorkingHour }>(
        `/hospital/working-hours/${id}`,
        { method: "PUT", body: patch }
      ),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: workingHoursKeys.all });
      const previous = qc.getQueryData<{ working_hours: WorkingHour[] }>(
        workingHoursKeys.all
      );
      qc.setQueryData<{ working_hours: WorkingHour[] }>(
        workingHoursKeys.all,
        (old) =>
          old
            ? {
                working_hours: old.working_hours.map((h) =>
                  h.id === id ? { ...h, ...patch } : h
                ),
              }
            : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(workingHoursKeys.all, ctx.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: workingHoursKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Working Hours — DELETE /hospital/working-hours/{id}
───────────────────────────────────────────── */

export function useDeleteWorkingHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/hospital/working-hours/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workingHoursKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Working Hours — DELETE /hospital/working-hours/reset
───────────────────────────────────────────── */

export function useResetWorkingHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>("/hospital/working-hours/reset", {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workingHoursKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Hospital Status — GET /hospital/status
   Used to seed the two toggle switches on load.
   Adjust the endpoint path if your API differs.
───────────────────────────────────────────── */

export function useGetHospitalStatus() {
  return useQuery({
    queryKey: hospitalStatusKeys.all,
    queryFn: () => apiFetch<HospitalStatus>("/hospital/status"),
  });
}

/* ─────────────────────────────────────────────
   Toggle — PATCH /hospital/toggle/active
   Flips is_active (visible in search vs hidden).
   Optimistically updates the status cache.
───────────────────────────────────────────── */

export function useToggleHospitalActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string; is_active: boolean }>("/hospital/toggle/active", {
        method: "PATCH",
      }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: hospitalStatusKeys.all });
      const previous = qc.getQueryData<HospitalStatus>(hospitalStatusKeys.all);
      qc.setQueryData<HospitalStatus>(hospitalStatusKeys.all, (old) =>
        old ? { ...old, is_active: !old.is_active } : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(hospitalStatusKeys.all, ctx.previous);
      }
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: hospitalStatusKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Toggle — PATCH /toggle/accepting
   Flips is_accepting_bookings (visible but paused).
   Optimistically updates the status cache.
───────────────────────────────────────────── */

export function useToggleAcceptingBookings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string; is_accepting_bookings: boolean }>(
        "/hospital/toggle/accepting",
        { method: "PATCH" }
      ),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: hospitalStatusKeys.all });
      const previous = qc.getQueryData<HospitalStatus>(hospitalStatusKeys.all);
      qc.setQueryData<HospitalStatus>(hospitalStatusKeys.all, (old) =>
        old
          ? { ...old, is_accepting_bookings: !old.is_accepting_bookings }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(hospitalStatusKeys.all, ctx.previous);
      }
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: hospitalStatusKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Closures — GET /hospital/closures
───────────────────────────────────────────── */

export function useGetClosures() {
  return useQuery({
    queryKey: closuresKeys.all,
    queryFn: () => apiFetch<{ closures: Closure[] }>("/hospital/closures"),
    select: (data) => data.closures,
  });
}

/* ─────────────────────────────────────────────
   Closures — POST /hospital/closures
───────────────────────────────────────────── */

export function useCreateClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClosureInput) =>
      apiFetch<{ message: string; closure: Closure }>("/hospital/closures", {
        method: "POST",
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: closuresKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Closures — PUT /hospital/closures/{id}
───────────────────────────────────────────── */

export function useUpdateClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ClosurePatch }) =>
      apiFetch<{ message: string; closure: Closure }>(
        `/hospital/closures/${id}`,
        { method: "PUT", body: patch }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: closuresKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Closures — DELETE /hospital/closures/{id}
───────────────────────────────────────────── */

export function useDeleteClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`/hospital/closures/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: closuresKeys.all }),
  });
}

/* ─────────────────────────────────────────────
   Closures — POST /hospital/closures/check-date
───────────────────────────────────────────── */

export function useCheckClosureDate() {
  return useMutation({
    mutationFn: (date: string) =>
      apiFetch<CheckDateResult>("/hospital/closures/check-date", {
        method: "POST",
        body: { date },
      }),
  });
}
