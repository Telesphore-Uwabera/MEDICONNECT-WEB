import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/Api";

const BASE = "/patient/dashboard";

export interface PatientStatsFilters {
  period?: "today" | "week" | "month" | "year" | "custom";
  start_date?: string;
  end_date?: string;
  appointment_type?: "all" | "online" | "in_person";
  status?: "all" | "completed" | "pending" | "cancelled";
  chart_group?: "day" | "week" | "month";
  search?: string;
}

export function useGetPatientStats(filters: PatientStatsFilters = {}) {
  const params = new URLSearchParams();

  if (filters.period) {
    params.set("period", filters.period);
  }

  // Only include date range when period is "custom" and both dates are present
  if (filters.period === "custom") {
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
  }

  // Omit "all" — the API default is already "all"
  if (filters.appointment_type && filters.appointment_type !== "all") {
    params.set("appointment_type", filters.appointment_type);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  if (filters.chart_group) {
    params.set("chart_group", filters.chart_group);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  const queryString = params.toString();
  const url = queryString ? `${BASE}?${queryString}` : BASE;

  return useQuery({
    queryKey: ["patient-stats", filters],
    queryFn: () =>
      apiFetch(url).then((stats) => {
        console.log("Patient stats fetched:", stats);
        return stats;
      }),
  });
}
