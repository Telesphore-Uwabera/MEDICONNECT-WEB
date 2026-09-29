import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardData {
  users: {
    patients: number;
    doctors: number;
    pharmacies: number;
    hospitals?: number;
    total: number;
  };
  appointments: {
    today: number;
    pending: number;
    total: number;
  };
  payments: {
    total_revenue: string;
    revenue_today: string;
    pending_count: number;
    currency: string;
  };
  certificates: {
    pending: number;
    approved: number;
  };
  quick_consultations: {
    active: number;
  };
}

export interface AdminDashboardResponse {
  status: boolean;
  data: AdminDashboardData;
  filters_applied: {
    q?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
  };
}

export interface AdminDashboardFilters {
  q?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGetAdminDashboard(
  filters: AdminDashboardFilters = {},
  options: { live?: boolean } = {},
) {
  // Strip empty/undefined values so we don't send ?q=&date= etc.
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
  ) as AdminDashboardFilters;

  const params = new URLSearchParams(cleanFilters as Record<string, string>).toString();
  const url = params ? `/admin/dashboard?${params}` : "/admin/dashboard";

  return useQuery<AdminDashboardResponse>({
    queryKey: ["admin-dashboard", cleanFilters],
    staleTime: options.live ? 0 : undefined,
    refetchOnMount: options.live,
    refetchInterval: options.live ? 30_000 : false,
    queryFn: () =>
      apiFetch(url).then((res) => {
        console.log("admin dashboard fetched:", res);
        return res as AdminDashboardResponse;
      }),
  });
}
