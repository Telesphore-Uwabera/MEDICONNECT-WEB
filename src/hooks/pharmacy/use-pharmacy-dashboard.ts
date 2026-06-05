import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/pharmacy/dashboard";

// ─── Filter params ────────────────────────────────────────────────────────────

export type DashboardPeriod = "today" | "week" | "month" | "year" | "custom";
export type ChartGroup = "day" | "week" | "month";

export interface DashboardParams {
  period?: DashboardPeriod;
  start_date?: string;
  end_date?: string;
  chart_group?: ChartGroup;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface FiltersApplied {
  period: string;
  from: string;
  to: string;
  chart_group: string;
}

export interface TodayOrders {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  rejected: number;
  cancelled: number;
}

export interface TodayPrescriptions {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface TodayStockAlerts {
  low_stock: number;
  out_of_stock: number;
}

export interface Today {
  orders: TodayOrders;
  prescriptions: TodayPrescriptions;
  stock_alerts: TodayStockAlerts;
}

export interface PeriodOrders {
  total: number;
  completed: number;
  rejected: number;
  cancelled: number;
  pending: number;
  delivery_count: number;
  pickup_count: number;
  internal_orders: number;
  external_orders: number;
  unique_customers: number;
}

export interface PeriodPrescriptions {
  total: number;
  approved: number;
  rejected: number;
  fulfilled: number;
  pending: number;
}

export interface PeriodStockRequests {
  total: number;
  received: number;
  pending: number;
  rejected: number;
}

export interface PeriodStats {
  orders: PeriodOrders;
  prescriptions: PeriodPrescriptions;
  stock_requests: PeriodStockRequests;
}

export interface RevenueBreakdown {
  delivery: number;
  pickup: number;
  internal: number;
  external: number;
}

export interface Revenue {
  total: number;
  previous_period_total: number;
  change_percent: number;
  order_count: number;
  avg_order_value: number;
  breakdown: RevenueBreakdown;
}

export interface OrdersChartPoint {
  label: string;
  total: number;
  completed: number;
  rejected: number;
  cancelled: number;
  revenue: number;
}

export interface InventorySummary {
  source: string;
  total_medicines: number;
  active_medicines: number;
  inactive_medicines: number;
  prescription_required: number;
  total_units_in_stock: number;
  out_of_stock: number;
  low_stock: number;
  healthy_stock: number;
  expiring_in_30_days: number;
}

export interface LowStockItem {
  medicine_id: number;
  medicine_name: string;
  unit: string;
  quantity: number;
  threshold: number;
}

export interface OutOfStockItem {
  medicine_id: number;
  medicine_name: string;
  unit: string;
}

export interface ExpiringSoonItem {
  medicine_id: number;
  medicine_name: string;
  unit: string;
  quantity: number;
  expiry_date: string;
  days_left: number;
}

export interface StockAlerts {
  source: string;
  low_stock: LowStockItem[];
  out_of_stock: OutOfStockItem[];
  expiring_soon: ExpiringSoonItem[];
}

export interface AwaitingPrescription {
  id: number;
  patient_name: string;
  status: string;
  submitted: string;
}

export interface PrescriptionsSummary {
  total: number;
  pending: number;
  reviewing: number;
  approved: number;
  rejected: number;
  fulfilled: number;
  awaiting_action: AwaitingPrescription[];
}

export interface PendingStockRequest {
  id: number;
  medicine_name: string;
  requested_quantity: number;
  submitted: string;
}

export interface StockRequestsSummary {
  total: number;
  pending: number;
  approved: number;
  received: number;
  rejected: number;
  pending_list: PendingStockRequest[];
}

export interface TopMedicine {
  medicine_id: number;
  medicine_name: string;
  total_sold: number;
  total_revenue: number;
  order_count: number;
}

export interface ExternalSync {
  applicable: boolean;
  provider_name: string;
  last_sync_at: string;
  last_sync_status: "success" | "failed" | "pending";
  items_synced: number;
  items_failed: number;
  next_sync_due: string;
}

export interface PharmacyDashboardData {
  filters_applied: FiltersApplied;
  inventory_mode: string;
  today: Today;
  period_stats: PeriodStats;
  revenue: Revenue;
  orders_chart: OrdersChartPoint[];
  inventory: InventorySummary;
  stock_alerts: StockAlerts;
  prescriptions: PrescriptionsSummary;
  stock_requests: StockRequestsSummary;
  top_medicines: TopMedicine[];
  external_sync: ExternalSync;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGetPharmacyDashboard(params: DashboardParams = {}) {
  return useQuery({
    queryKey: ["pharmacy-dashboard", params],
    queryFn: async (): Promise<PharmacyDashboardData> => {
      const qs = new URLSearchParams();
      const period = params.period ?? "month";
      qs.set("period", period);
      if (period === "custom") {
        if (params.start_date) qs.set("start_date", params.start_date);
        if (params.end_date)   qs.set("end_date",   params.end_date);
      }
      if (params.chart_group) qs.set("chart_group", params.chart_group);
      return apiFetch<PharmacyDashboardData>(`${BASE}?${qs}`);
    },
    staleTime: 60_000,
  });
}
