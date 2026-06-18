import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

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
  status: () => [...doctorDashboardKeys.all, "toggle-status"] as const,
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
    queryKey: doctorDashboardKeys.status(),
    queryFn: () =>
      apiFetch<ToggleStatusResponse>("/doctor/toggle/mystatus"),
    staleTime: 30_000,
  });

  // ── Toggle: Instant Consultation ─────────────────────────────────────────

  const instantMutation = useMutation({
    mutationFn: () =>
      apiFetch<ToggleInstantResponse>("/doctor/toggle/instant", {
        method: "PATCH",
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: doctorDashboardKeys.all });
    },
    onSuccess: () => {
      // Re-fetch real status so the cache stays in sync
      queryClient.invalidateQueries({
        queryKey: doctorDashboardKeys.status(),
      });
    },
    onError: (err) => {
      console.error("Toggle instant consultation failed:", err);
    },
  });

  // ── Toggle: Pause Bookings ────────────────────────────────────────────────

  const pauseMutation = useMutation({
    mutationFn: () =>
      apiFetch<TogglePauseResponse>("/doctor/toggle/pause", {
        method: "PATCH",
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: doctorDashboardKeys.all });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: doctorDashboardKeys.status(),
      });
    },
    onError: (err) => {
      console.error("Toggle pause bookings failed:", err);
    },
  });

  // ── Derive toggle state ───────────────────────────────────────────────────
  // Priority: mutation response (just fired) → server status (fetched on mount) → false
  const serverInstant = statusData?.instant_consultation ?? false;
  const serverPaused  = statusData?.bookings_paused      ?? false;

  const instantBase = instantMutation.data?.instant_consultation ?? serverInstant;
  const pausedBase  = pauseMutation.data?.bookings_paused        ?? serverPaused;

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
    toggleState: {
      // While a PATCH is in-flight, flip optimistically; else use real value
      instant_consultation: instantMutation.isPending
        ? !instantBase
        : instantBase,
      bookings_paused: pauseMutation.isPending
        ? !pausedBase
        : pausedBase,
    },
    toggleLoading: {
      instant_consultation: instantMutation.isPending,
      bookings_paused: pauseMutation.isPending,
    },

    // ── Toggle actions ────────────────────────────────────────────────────
    toggleInstantConsultation: () => instantMutation.mutate(),
    togglePauseBookings: () => pauseMutation.mutate(),
  };
}
