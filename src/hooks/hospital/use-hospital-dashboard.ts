import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/hospital/dashboard";

// ─── Filter params ────────────────────────────────────────────────────────────

export type DashboardPeriod = "today" | "week" | "month" | "year" | "custom";
export type ChartGroup = "day" | "week" | "month";
export type BookingStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "rejected"
  | "cancelled"
  | "all";

export interface HospitalDashboardParams {
  period?: DashboardPeriod;
  start_date?: string;
  end_date?: string;
  chart_group?: ChartGroup;
  department_id?: number;
  status?: BookingStatus;
  search?: string;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface BookingStatusCounts {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  rejected: number;
  cancelled: number;
  unique_patients?: number;
  unique_services?: number;
}

export interface AppointmentStatusCounts {
  total: number;
  completed: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  online_count?: number;
  in_person_count?: number;
  avg_duration_minutes?: number;
  unique_doctors?: number;
  unique_patients?: number;
}

export interface TodaySnapshot {
  service_bookings: BookingStatusCounts;
  appointments: AppointmentStatusCounts;
}

export interface RevenueStats {
  gross: number;
  insurance_covered: number;
  patient_paid: number;
  avg_booking_value: number;
  booking_count: number;
  change_percent: number | null;
}

export interface BookingsChartPoint {
  label: string;
  total: number;
  completed: number;
  pending: number;
  revenue?: number;
}

export interface DailyAppointmentPoint {
  date: string;
  total: number;
  completed: number;
}

export interface UpcomingAppointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
}

export interface Department {
  id: number;
  name: string;
  name_en?: string;
  name_fr?: string;
  name_kiny?: string;
  period_bookings: number;
}

export interface TopService {
  service_id: number;
  service_name: string;
  booking_count: number;
  revenue: number;
}

export interface ServicesStats {
  total: number;
  active: number;
  inactive: number;
  available: number;
  insurance_covered: number;
  requires_appointment: number;
  requires_referral: number;
  top_services: TopService[];
}

export interface TopDoctor {
  doctor_id: number;
  doctor_name: string;
  appointment_count: number;
  avg_duration_min: number;
}

export interface DoctorsStats {
  total: number;
  active: number;
  inactive: number;
  top_doctors: TopDoctor[];
}

export interface RecentReview {
  id: number;
  doctor_name: string;
  rating: number;
  comment: string;
  time: string;
}

export interface ReviewsStats {
  avg_rating: number | null;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  five_star: number;
  four_star: number;
  three_star: number;
  low_star: number;
  recent: RecentReview[];
}

export interface HospitalDashboardData {
  today?: TodaySnapshot;
  period_stats?: {
    service_bookings?: BookingStatusCounts;
    appointments?: AppointmentStatusCounts;
  };
  revenue?: RevenueStats;
  bookings_chart?: BookingsChartPoint[];
  appointments?: {
    daily_breakdown?: DailyAppointmentPoint[];
    upcoming?: UpcomingAppointment[];
  };
  departments?: Department[];
  services?: ServicesStats;
  doctors?: DoctorsStats;
  reviews?: ReviewsStats;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGetHospitalDashboard(params: HospitalDashboardParams = {}) {
  const qs = new URLSearchParams();
  if (params.period) qs.set("period", params.period);
  if (params.period === "custom") {
    if (params.start_date) qs.set("start_date", params.start_date);
    if (params.end_date) qs.set("end_date", params.end_date);
  }
  if (params.chart_group) qs.set("chart_group", params.chart_group);
  if (params.department_id) qs.set("department_id", String(params.department_id));
  if (params.status) qs.set("status", params.status);
  if (params.search?.trim()) qs.set("search", params.search.trim());
  const qStr = qs.toString();
  const url = qStr ? `${BASE}?${qStr}` : BASE;

  return useQuery<HospitalDashboardData>({
    queryKey: ["hospital-dashboard", params],
    queryFn: () => apiFetch<HospitalDashboardData>(url),
    staleTime: 60_000,
  });
}

/** @deprecated Use useGetHospitalDashboard instead */
export function useGetHospitalStats() {
  return useQuery({
    queryKey: ["hospital-stats"],
    queryFn: () => apiFetch(BASE),
  });
}
