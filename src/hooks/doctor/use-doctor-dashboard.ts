import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  doctorInstantStatusKey,
  writeDoctorInstantStatus,
  type DoctorInstantStatus,
} from "@/hooks/doctor/use-doctor-availability";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Period = "today" | "week" | "month" | "year" | "custom";
export type ChartGroup = "day" | "week" | "month";
export type AppointmentType = "all" | "online" | "in_person" | "instant";

export interface DashboardFilters {
  period: Period;
  start_date?: string;
  end_date?: string;
  appointment_type?: AppointmentType;
  search?: string;
  chart_group?: ChartGroup;
}

export interface DashboardData {
  filters_applied: {
    period: string;
    from: string;
    to: string;
    appointment_type: string;
    status: string;
    search: string | null;
    chart_group: string;
  };
  today: {
    total: number;
    completed: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    waiting?: number;
    instant_queue: number;
  };
  period_stats: {
    unique_patients: number;
    total_appointments: number;
    completed: number;
    cancelled: number;
    pending: number;
    online_count: number;
    in_person_count: number;
    avg_duration_minutes: number;
    instant_total: number;
    instant_completed: number;
    prescriptions_issued: number;
  };
  revenue: {
    total: number;
    previous_period_total: number;
    change_percent: number | null;
    appointment_count: number;
    avg_per_appointment: number;
    breakdown: {
      online: { total: number; count: number };
      in_person: { total: number; count: number };
      instant: { total: number; session_count: number };
    };
  };
  patient_flow: Array<{
    label: string;
    patients: number;
    appointments: number;
    completed: number;
    consultations: number;
  }>;
  completion_rate: Array<{
    label: string;
    total: number;
    completed: number;
    rate: number;
  }>;
  instant: {
    total: number;
    completed: number;
    declined: number;
    pending: number;
    current_queue: number;
    avg_duration_min: number;
  };
  prescriptions: {
    total: number;
    issued: number;
    draft: number;
    signed: number;
  };
  reviews: {
    all_time_avg: number | null;
    period: {
      total: number;
      avg_rating: number | null;
      five_star: number;
      four_star: number;
      three_star: number;
      low_star: number;
    };
    recent: Array<{
      id: number;
      patient_name: string;
      rating: number;
      comment: string;
      created_at: string;
    }>;
  };
}

interface ToggleStatusResponse {
  instant_consultation: boolean;
  bookings_paused: boolean;
}

interface ToggleInstantResponse {
  message: string;
  instant_consultation: boolean;
}

interface TogglePauseResponse {
  message: string;
  bookings_paused: boolean;
}

// ─── Query key factory ────────────────────────────────────────────────────────

export const doctorDashboardKeys = {
  all: ["doctor-dashboard"] as const,
  stats: (filters: DashboardFilters) =>
    [...doctorDashboardKeys.all, "stats", filters] as const,
  status: () => doctorInstantStatusKey,
};

// ─── Query string builder ─────────────────────────────────────────────────────

function buildQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.period === "custom") {
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
  }
  if (filters.appointment_type && filters.appointment_type !== "all") {
    params.set("appointment_type", filters.appointment_type);
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.chart_group) params.set("chart_group", filters.chart_group);
  return params.toString();
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useDoctorDashboard(
  initialFilters: DashboardFilters = { period: "week", chart_group: "day" },
) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);

  // ── Dashboard stats query ────────────────────────────────────────────────

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: doctorDashboardKeys.stats(filters),
    queryFn: () =>
      apiFetch<DashboardData>(`/doctor/dashboard?${buildQuery(filters)}`),
  });

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load dashboard"
    : null;

  const updateFilters = useCallback((partial: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const refresh = useCallback(() => refetch(), [refetch]);

  // ── Toggle status query (seeds real on/off state on mount) ───────────────

  const { data: statusData } = useQuery({
    queryKey: doctorInstantStatusKey,
    queryFn: () =>
      apiFetch<DoctorInstantStatus>("/doctor/toggle/mystatus"),
    staleTime: 0,
  });

  // ── Toggle: Instant Consultation ─────────────────────────────────────────

  const instantMutation = useMutation({
    mutationFn: (enabled?: boolean) =>
      apiFetch<ToggleInstantResponse>("/doctor/toggle/instant", {
        method: "PATCH",
        body: enabled === undefined ? {} : { instant_consultation: enabled },
      }),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: doctorInstantStatusKey });
      const previous = queryClient.getQueryData<DoctorInstantStatus>(doctorInstantStatusKey);
      const next = typeof enabled === "boolean" ? enabled : !(previous?.instant_consultation);
      writeDoctorInstantStatus(queryClient, { instant_consultation: next });
      return { previous };
    },
    onSuccess: (res) => {
      writeDoctorInstantStatus(queryClient, {
        instant_consultation: res.instant_consultation,
      });
    },
    onError: (err: unknown, _enabled, context) => {
      if (context?.previous) queryClient.setQueryData(doctorInstantStatusKey, context.previous);
      const message = err instanceof Error ? err.message : "Failed to toggle instant consultation";
      console.error("Toggle instant consultation failed:", err);
      toast.error(message);
    },
  });

  // ── Toggle: Pause Bookings ────────────────────────────────────────────────

  const pauseMutation = useMutation({
    mutationFn: () =>
      apiFetch<TogglePauseResponse>("/doctor/toggle/pause", {
        method: "PATCH",
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: doctorInstantStatusKey });
      const previous = queryClient.getQueryData<DoctorInstantStatus>(doctorInstantStatusKey);
      writeDoctorInstantStatus(queryClient, { bookings_paused: !(previous?.bookings_paused) });
      return { previous };
    },
    onSuccess: (res) => {
      writeDoctorInstantStatus(queryClient, { bookings_paused: res.bookings_paused });
    },
    onError: (err, _value, context) => {
      if (context?.previous) queryClient.setQueryData(doctorInstantStatusKey, context.previous);
      console.error("Toggle pause bookings failed:", err);
    },
  });

  // Both screens read this cache. A toggle writes it immediately, then the
  // server response replaces that optimistic value. A stale mutation result
  // must not keep the dashboard on "visible" after the availability page
  // (or a refetch) says the switch is off.
  const instantKnown = statusData != null;

  return {
    // ── Data ──────────────────────────────────────────────────────────────
    data,
    loading,
    error,

    // ── Filters ───────────────────────────────────────────────────────────
    filters,
    updateFilters,
    refresh,

    // ── Toggle state ──────────────────────────────────────────────────────
    instantKnown,
    toggleState: {
      instant_consultation: Boolean(statusData?.instant_consultation),
      bookings_paused: Boolean(statusData?.bookings_paused),
    },
    toggleLoading: {
      instant_consultation: instantMutation.isPending,
      bookings_paused: pauseMutation.isPending,
    },

    // ── Toggle actions ────────────────────────────────────────────────────
    toggleInstantConsultation: (enabled?: boolean) => instantMutation.mutate(enabled),
    togglePauseBookings: () => pauseMutation.mutate(),
  };
}
