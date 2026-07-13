import { useState, useMemo, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  Package,
  TrendingUp,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronLeft,
  Star,
  Pill,
  Activity,
  Zap,
  RefreshCw,
  Loader2,
  AlertCircle,
  PackageX,
  Timer,
  FlaskConical,
  ClipboardList,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  useGetPharmacyDashboard,
  type DashboardPeriod,
  type ChartGroup,
  type OrdersChartPoint,
  type LowStockItem,
  type OutOfStockItem,
  type ExpiringSoonItem,
} from "@/hooks/pharmacy/use-pharmacy-dashboard";
import { Link } from "react-router-dom";
import { t } from "i18next";
// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRWF(n: number): string {
  if (n >= 1_000_000) return `RWF ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `RWF ${(n / 1_000).toFixed(0)}K`;
  return `RWF ${n.toLocaleString()}`;
}

function fmtNum(n: number): string {
  return n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
}

function changeSign(pct: number) {
  if (pct > 0) return { icon: ArrowUpRight, cls: "text-emerald-600 dark:text-emerald-400", label: `+${pct.toFixed(1)}%` };
  if (pct < 0) return { icon: ArrowDownRight, cls: "text-red-500", label: `${pct.toFixed(1)}%` };
  return { icon: ArrowUpRight, cls: "text-muted-foreground", label: "0%" };
}

// ─── Skeleton atoms ───────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-muted", className)} />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBox className="h-3 w-32" />
        <SkeletonBox className="h-2.5 w-20" />
      </div>
      <SkeletonBox className="h-5 w-16 rounded-full" />
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────

const PERIODS: { value: DashboardPeriod; labelKey: string }[] = [
  { value: "today", labelKey: "pages.pharmacy.period_today" },
  { value: "week", labelKey: "pages.pharmacy.period_week" },
  { value: "month", labelKey: "pages.pharmacy.period_month" },
  { value: "year", labelKey: "pages.pharmacy.period_year" },
  { value: "custom", labelKey: "pages.pharmacy.period_custom" },
];

const CHART_GROUPS: { value: ChartGroup; labelKey: string }[] = [
  { value: "day", labelKey: "pages.pharmacy.group_day" },
  { value: "week", labelKey: "pages.pharmacy.group_week" },
  { value: "month", labelKey: "pages.pharmacy.group_month" },
];

function PeriodBar({
  period, chartGroup, onPeriod, onChartGroup, dateRange, onDateRange, isFetching,
}: {
  period: DashboardPeriod;
  chartGroup: ChartGroup;
  onPeriod: (p: DashboardPeriod) => void;
  onChartGroup: (g: ChartGroup) => void;
  dateRange: { from: string; to: string };
  onDateRange: (r: { from: string; to: string }) => void;
  isFetching: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period pills */}
      <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card shadow-sm">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriod(p.value)}
            className={cn(
              "px-3 py-1.5 text-[11px] font-medium transition-all duration-150 border-r border-border/60 last:border-r-0",
              period === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {period === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRange({ ...dateRange, from: e.target.value })}
            className="px-2 py-1.5 text-[11px] border border-border/60 rounded-[6px] bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
          <span className="text-[10px] text-muted-foreground">→</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRange({ ...dateRange, to: e.target.value })}
            className="px-2 py-1.5 text-[11px] border border-border/60 rounded-[6px] bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          />
        </div>
      )}

      {/* Fetching indicator */}
      {isFetching && <Loader2 size={13} className="animate-spin text-primary" />}

      {/* Chart group */}
      <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card shadow-sm ml-auto">
        <span className="px-2 py-1.5 text-[10px] text-muted-foreground/70 font-medium border-r border-border/60 bg-muted/30">
          {t("pages.pharmacy.group")}
        </span>
        {CHART_GROUPS.map((g) => (
          <button
            key={g.value}
            onClick={() => onChartGroup(g.value)}
            className={cn(
              "px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150 border-r border-border/60 last:border-r-0",
              chartGroup === g.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
          >
            {t(g.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, icon: Icon, action, children, className = "",
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[6px] border border-border bg-card shadow-sm overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] bg-primary/15 flex items-center justify-center text-primary">
            <Icon size={13} />
          </div>
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {action && <div className="text-[11px] text-muted-foreground">{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Orders chart ─────────────────────────────────────────────────────────────

function OrdersChart({ data, loading }: { data: OrdersChartPoint[]; loading: boolean }) {
  const { t } = useTranslation();
  const maxTotal = useMemo(() => Math.max(...data.map((d) => d.total), 1), [data]);
  const visible = data.length > 14 ? data.slice(-14) : data;

  return (
    <Section title={t("pages.pharmacy.orders_chart")} icon={BarChart3}
      action={
        loading
          ? <Loader2 size={11} className="animate-spin text-primary" />
          : <span className="font-mono text-[10px]">{t("pages.pharmacy.data_points", { count: data.length })}</span>
      }
    >
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-end gap-1.5 h-36">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-1 animate-pulse bg-muted rounded-[6px]" style={{ height: `${30 + (i % 5) * 15}%` }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-[11px] text-muted-foreground">
            {t("pages.pharmacy.no_data_period")}
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1 h-36">
              {visible.map((pt, i) => {
                const hPct = Math.max(4, Math.round((pt.total / maxTotal) * 100));
                const shortLabel = pt.label.replace(/,\s*\d{4}$/, "");
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar min-w-0">
                    <span className="text-[9px] font-semibold text-foreground opacity-0 group-hover/bar:opacity-100 transition-opacity tabular-nums">
                      {pt.total}
                    </span>
                    <div className="w-full flex-1 flex items-end rounded-[6px] overflow-hidden bg-muted/60">
                      <div
                        className="w-full rounded-[6px] transition-all duration-300 bg-primary/35 group-hover/bar:bg-primary"
                        style={{ height: `${hPct}%` }}
                      />
                    </div>
                    {visible.length <= 10 && (
                      <span className="text-[9px] text-muted-foreground truncate w-full text-center">{shortLabel}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
              {[
                { label: t("pages.pharmacy.total_orders"), value: fmtNum(data.reduce((s, d) => s + d.total, 0)) },
                { label: t("pages.pharmacy.completed"), value: fmtNum(data.reduce((s, d) => s + d.completed, 0)) },
                { label: t("pages.pharmacy.total_revenue"), value: fmtRWF(data.reduce((s, d) => s + d.revenue, 0)) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-sm font-bold text-foreground">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Section>
  );
}

// ─── Stock alerts ─────────────────────────────────────────────────────────────

function StockAlertsSection({
  lowStock, outOfStock, expiringSoon, loading,
}: {
  lowStock: LowStockItem[];
  outOfStock: OutOfStockItem[];
  expiringSoon: ExpiringSoonItem[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"low" | "out" | "expiring">("low");

  const tabs = [
    { id: "low" as const, label: t("pages.pharmacy.low_stock"), count: lowStock.length, icon: AlertTriangle },
    { id: "out" as const, label: t("pages.pharmacy.out_of_stock"), count: outOfStock.length, icon: PackageX },
    { id: "expiring" as const, label: t("pages.pharmacy.expiring"), count: expiringSoon.length, icon: Timer },
  ];

  return (
    <Section title={t("pages.pharmacy.stock_alerts")} icon={AlertTriangle}
      action={<Link to={'/pharmacy/restock-requests'} className="flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline">{t("pages.pharmacy.manage")} <ChevronRight size={11} /></Link>}
    >
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-all duration-150",
              tab === t.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
            )}
          >
            <t.icon size={11} />
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border max-h-64 overflow-y-auto">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : tab === "low" ? (
          lowStock.length === 0
            ? <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">{t("pages.pharmacy.no_low_stock_items")}</div>
            : lowStock.map((item) => {
              const pct = Math.min(Math.round((item.quantity / item.threshold) * 100), 100);
              return (
                <div key={item.medicine_id} className="px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.medicine_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{item.unit}</p>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                      {item.quantity}<span className="text-muted-foreground font-normal">/{item.threshold}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
        ) : tab === "out" ? (
          outOfStock.length === 0
            ? <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">{t("pages.pharmacy.no_out_of_stock_items")}</div>
            : outOfStock.map((item) => (
              <div key={item.medicine_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="w-7 h-7 rounded-[6px] bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-900">
                  <PackageX size={12} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.medicine_name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{item.unit}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
                  {t("pages.pharmacy.out_of_stock")}
                </span>
              </div>
            ))
        ) : (
          expiringSoon.length === 0
            ? <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">{t("pages.pharmacy.no_items_expiring_soon")}</div>
            : expiringSoon.map((item) => (
              <div key={item.medicine_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="w-7 h-7 rounded-[6px] bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-900">
                  <Timer size={12} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{item.medicine_name}</p>
                  <p className="text-[10px] text-muted-foreground">{t("pages.pharmacy.qty_expires", { quantity: item.quantity, date: item.expiry_date })}</p>
                </div>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  item.days_left <= 7
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                    : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
                )}>
                  {t("pages.pharmacy.days_left", { count: item.days_left })}
                </span>
              </div>
            ))
        )}
      </div>
    </Section>
  );
}

// ─── Top medicines ────────────────────────────────────────────────────────────

function TopMedicines({ medicines, loading }: {
  medicines: { medicine_id: number; medicine_name: string; total_sold: number; total_revenue: number; order_count: number }[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Section title={t("pages.pharmacy.top_medicines")} icon={Star}
      action={<Link to={'/pharmacy/inventory'} className="flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline">{t("pages.pharmacy.full_report")} <ChevronRight size={11} /></Link>}
    >
      <div className="divide-y divide-border">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          : medicines.length === 0
            ? <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">{t("pages.pharmacy.no_data_period")}</div>
            : medicines.slice(0, 6).map((m, idx) => (
              <div key={m.medicine_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                  idx === 0
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
                )}>
                  {idx + 1}
                </span>
                <div className="w-7 h-7 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                  <Pill size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{m.medicine_name}</p>
                  <p className="text-[10px] text-muted-foreground">{t("pages.pharmacy.orders_count", { count: m.order_count })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-foreground">{fmtRWF(m.total_revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{t("pages.pharmacy.units_count", { count: m.total_sold })}</p>
                </div>
              </div>
            ))
        }
      </div>
    </Section>
  );
}

// ─── {t("pages.pharmacy.prescriptions")} ────────────────────────────────────────────────────────────

function Awaiting({ items, counts, loading }: {
  items: { id: number; patient_name: string; status: string; submitted: string }[];
  counts: { pending: number; reviewing: number };
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Section title={t("pages.pharmacy.prescriptions")} icon={ClipboardList}
      action={<span className="flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline">{t("pages.pharmacy.view_all")} <ChevronRight size={11} /></span>}
    >
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
        {[
          { label: t("pages.pharmacy.pending"), value: counts.pending, cls: "text-amber-600 dark:text-amber-400" },
          { label: t("pages.pharmacy.reviewing"), value: counts.reviewing, cls: "text-blue-600 dark:text-blue-400" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-card px-4 py-2.5 text-center">
            {loading
              ? <SkeletonBox className="h-5 w-10 mx-auto mb-1" />
              : <p className={cn("text-base font-bold", cls)}>{value}</p>
            }
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="divide-y divide-border max-h-56 overflow-y-auto">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
          : items.length === 0
            ? <div className="px-4 py-6 text-center text-[11px] text-muted-foreground">{t("pages.pharmacy.no_pending_prescriptions")}</div>
            : items.map((rx) => (
              <div key={rx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                  {rx.patient_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{rx.patient_name}</p>
                  <p className="text-[10px] text-muted-foreground">{rx.submitted}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 capitalize">
                  {rx.status}
                </span>
              </div>
            ))
        }
      </div>
    </Section>
  );
}

// ─── Revenue breakdown ────────────────────────────────────────────────────────

function RevenueBreakdownCard({ revenue, loading }: {
  revenue: {
    total: number; previous_period_total: number; change_percent: number;
    avg_order_value: number;
    breakdown: { delivery: number; pickup: number; internal: number; external: number };
  } | undefined;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const change = revenue ? changeSign(revenue.change_percent) : null;
  return (
    <Section title={t("pages.pharmacy.revenue_breakdown")} icon={TrendingUp}>
      {loading ? (
        <div className="p-4 space-y-3">
          <SkeletonBox className="h-8 w-32" />
          <SkeletonBox className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <SkeletonBox className="h-3 w-20" />
                <SkeletonBox className="h-3 w-16" />
              </div>
              <SkeletonBox className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : revenue ? (
        <div className="p-4 space-y-3">
          <div>
              <p className=" leading-none font-bold text-foreground text-sm">{fmtRWF(revenue.total)}</p>
            {change && (
              <div className={cn("flex items-center gap-1 text-[11px] font-medium mt-0.5", change.cls)}>
                <change.icon size={12} />
                {t("pages.pharmacy.vs_previous_period", { change: change.label })}
              </div>
            )}
          </div>
          <div className="space-y-2 pt-1">
            {([["Delivery", revenue.breakdown.delivery], ["Pickup", revenue.breakdown.pickup], ["Internal", revenue.breakdown.internal], ["External", revenue.breakdown.external]] as [string, number][]).map(([label, value]) => {
              const pct = revenue.total > 0 ? Math.round((value / revenue.total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{fmtRWF(value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
            {t("pages.pharmacy.avg_order_value")}: <span className="font-semibold text-foreground">{fmtRWF(revenue.avg_order_value)}</span>
          </p>
        </div>
      ) : null}
    </Section>
  );
}

// ─── Status banner ────────────────────────────────────────────────────────────

function StatusBanner({
  todayOrders, loading,
}: { todayOrders: { total: number; pending: number; completed: number } | undefined; loading: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <CheckCircle2 size={13} />
        <span className="text-[11px] font-semibold">{t("pages.pharmacy.pharmacy_open")}</span>
      </div>
      <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">·</span>
      <div className="flex items-center gap-1 text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
        <Clock size={11} />
        <span>{t("pages.pharmacy.closes_at", { time: "6:00 PM" })}</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {loading
          ? <SkeletonBox className="h-4 w-28" />
          : todayOrders && (
            <>
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                <Zap size={11} />
                {t("pages.pharmacy.in_queue", { count: todayOrders.pending })}
              </span>
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">·</span>
              <span className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                {t("pages.pharmacy.completed_today", { count: todayOrders.completed })}
              </span>
            </>
          )
        }
      </div>
    </div>
  );
}

// ─── External sync banner ─────────────────────────────────────────────────────

function ExternalSyncBanner({ sync }: {
  sync: { applicable: boolean; provider_name: string; last_sync_status: string; last_sync_at: string; items_synced: number; items_failed: number } | undefined;
}) {
  const { t } = useTranslation();
  if (!sync?.applicable) return null;
  const ok = sync.last_sync_status === "success";
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-3 rounded-[6px] border px-4 py-2.5 text-[11px]",
      ok
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30"
        : "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30",
    )}>
      <RefreshCw size={13} className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"} />
      <span className={cn("font-semibold", ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
        {sync.provider_name}
      </span>
      <span className="text-muted-foreground hidden sm:inline">·</span>
      <span className="text-muted-foreground hidden sm:inline">
        {t("pages.pharmacy.last_sync")}: <span className="font-medium text-foreground">{sync.last_sync_at}</span>
      </span>
      <span className="text-muted-foreground hidden sm:inline">·</span>
      <span className="text-muted-foreground">
        {t("pages.pharmacy.synced_count", { count: sync.items_synced })}
        {sync.items_failed > 0 && (
          <span className="text-red-600 dark:text-red-400 ml-1 font-medium">· {sync.items_failed} failed</span>
        )}
      </span>
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {([
        { label: t("pages.pharmacy.new_order"), icon: ShoppingBag, primary: true },
        { label: t("pages.pharmacy.add_stock"), icon: Package, primary: false },
        { label: t("pages.pharmacy.view_reports"), icon: TrendingUp, primary: false },
        { label: t("pages.pharmacy.deliveries"), icon: Truck, primary: false },
      ] as const).map(({ label, icon: Icon, primary }) => (
        <button
          key={label}
          className={cn(
            "flex items-center gap-2 rounded-[6px] border px-3 py-2.5 text-xs font-semibold transition-all hover:shadow-sm active:scale-[0.98]",
            primary
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              : "bg-card text-foreground border-border hover:bg-muted",
          )}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function PharmacyDashboard() {
  const { t, i18n } = useTranslation();

  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [chartGroup, setChartGroup] = useState<ChartGroup>("day");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "prescriptions">("overview");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!tabsRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    };
    handleScroll();
    window.addEventListener("resize", handleScroll);
    tabsRef.current?.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("resize", handleScroll);
      tabsRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollBy = (offset: number) => {
    tabsRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  const params = useMemo(() => ({
    period,
    chart_group: chartGroup,
    ...(period === "custom" ? { start_date: dateRange.from, end_date: dateRange.to } : {}),
  }), [period, chartGroup, dateRange]);

  const { data, isLoading, isError, error, isFetching } = useGetPharmacyDashboard(params);

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.overview_title")}
          subtitle={t("pages.pharmacy.overview_sub")}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Period / chart-group controls */}
          <PeriodBar
            period={period}
            chartGroup={chartGroup}
            onPeriod={setPeriod}
            onChartGroup={setChartGroup}
            dateRange={dateRange}
            onDateRange={setDateRange}
            isFetching={isFetching && !isLoading}
          />

          {isError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-14 h-14 rounded-[6px] bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-[12px] font-semibold text-foreground">{t("pages.pharmacy.failed_load_dashboard")}</p>
              <p className="text-[11px] text-muted-foreground/70">{(error as any)?.message ?? t("pages.pharmacy.something_went_wrong")}</p>
            </div>
          ) : (
            <>
              {/* Live status */}
              <StatusBanner todayOrders={data?.today.orders} loading={isLoading} />

              {/* External sync banner (only renders if applicable) */}
              {data?.external_sync && <ExternalSyncBanner sync={data.external_sync} />}


              {/* ── Scrollable Tabs ── */}
              <div className="relative flex items-center border-b border-border/60 mb-2">
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 flex items-center transition-opacity duration-300",
                    showLeftScroll ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  )}
                >
                  <button
                    onClick={() => scrollBy(-200)}
                    className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                <div
                  ref={tabsRef}
                  className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-px [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full relative z-0"
                >
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={cn(
                      "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                      activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                    )}
                  >
                    {t("pages.pharmacy.overview_orders")}
                  </button>
                  <button
                    onClick={() => setActiveTab("inventory")}
                    className={cn(
                      "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                      activeTab === "inventory" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                    )}
                  >
                    {t("pages.pharmacy.inventory_title")}
                  </button>
                  <button
                    onClick={() => setActiveTab("prescriptions")}
                    className={cn(
                      "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                      activeTab === "prescriptions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                    )}
                  >
                    {t("pages.pharmacy.prescriptions")}
                  </button>
                </div>

                <div
                  className={cn(
                    "absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 flex items-center justify-end transition-opacity duration-300",
                    showRightScroll ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  )}
                >
                  <button
                    onClick={() => scrollBy(200)}
                    className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border/50 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* KPI cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {isLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-[6px] border border-border bg-card p-4 animate-pulse space-y-2">
                          <SkeletonBox className="h-3 w-20" />
                          <SkeletonBox className="h-7 w-16" />
                        </div>
                      ))
                      : data && (
                        <>
                          <StatCard label={t("pages.pharmacy.total_orders")} value={fmtNum(data.period_stats.orders.total)} icon={ShoppingBag} accent="primary" />
                          <StatCard label={t("pages.pharmacy.revenue")} value={fmtRWF(data.revenue.total)} icon={TrendingUp} accent="success" />
                          <StatCard label={t("pages.pharmacy.customers")} value={fmtNum(data.period_stats.orders.unique_customers)} icon={Users} accent="info" />
                          <StatCard label={t("pages.pharmacy.deliveries")} value={fmtNum(data.period_stats.orders.delivery_count)} icon={Truck} accent="info" />
                          <StatCard label={t("pages.pharmacy.stock_alerts")} value={String(data.inventory.low_stock + data.inventory.out_of_stock)} icon={AlertTriangle} accent="warning" />
                          <StatCard label={t("pages.pharmacy.avg_order")} value={fmtRWF(data.revenue.avg_order_value)} icon={Activity} accent="primary" />
                        </>
                      )
                    }
                  </div>

                  {/* Today's 4 quick counters */}
                  {!isLoading && data && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: t("pages.pharmacy.today_pending_orders"), value: data.today.orders.pending, bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900", cls: "text-amber-600 dark:text-amber-400" },
                        { label: t("pages.pharmacy.today_completed_orders"), value: data.today.orders.completed, bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900", cls: "text-emerald-600 dark:text-emerald-400" },
                        { label: t("pages.pharmacy.today_pending_rx"), value: data.today.prescriptions.pending, bg: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900", cls: "text-sky-600 dark:text-sky-400" },
                        { label: t("pages.pharmacy.out_of_stock"), value: data.today.stock_alerts.out_of_stock, bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900", cls: "text-red-600 dark:text-red-400" },
                      ].map(({ label, value, bg, cls }) => (
                        <div key={label} className={cn("rounded-[6px] border px-4 py-3", bg)}>
                          <p className={cn("text-xl font-bold", cls)}>{value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chart + Revenue */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <OrdersChart data={data?.orders_chart ?? []} loading={isLoading} />
                    </div>
                    <RevenueBreakdownCard revenue={data?.revenue} loading={isLoading} />
                  </div>
                </div>
              )}

              {/* INVENTORY TAB */}
              {activeTab === "inventory" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Top medicines + Stock alerts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <TopMedicines medicines={data?.top_medicines ?? []} loading={isLoading} />
                    <StockAlertsSection
                      lowStock={data?.stock_alerts.low_stock ?? []}
                      outOfStock={data?.stock_alerts.out_of_stock ?? []}
                      expiringSoon={data?.stock_alerts.expiring_soon ?? []}
                      loading={isLoading}
                    />
                  </div>

                  {/* {t("pages.pharmacy.inventory_title")} summary strip */}
                  {/* {t("pages.pharmacy.inventory_title")} summary strip */}
                  {!isLoading && data && (
                    <div className="rounded-[6px] border border-border bg-card overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                        <div className="w-6 h-6 rounded-[6px] bg-primary/15 flex items-center justify-center text-primary">
                          <FlaskConical size={13} />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{t("pages.pharmacy.inventory_summary")}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground capitalize">
                          {t("pages.pharmacy.source")}: {data.inventory.source}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px bg-border">
                        {[
                          { label: t("pages.pharmacy.total_medicines"), value: data.inventory.total_medicines },
                          { label: t("pages.pharmacy.active"), value: data.inventory.active_medicines },
                          { label: t("pages.pharmacy.inactive"), value: data.inventory.inactive_medicines },
                          { label: t("pages.pharmacy.rx_required"), value: data.inventory.prescription_required },
                          { label: t("pages.pharmacy.units_in_stock"), value: fmtNum(data.inventory.total_units_in_stock) },
                          { label: t("pages.pharmacy.healthy_stock"), value: data.inventory.healthy_stock },
                          { label: t("pages.pharmacy.low_stock"), value: data.inventory.low_stock },
                          { label: t("pages.pharmacy.expiring_30d"), value: data.inventory.expiring_in_30_days },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-card px-3 py-3 text-center">
                            <p className="text-sm font-bold text-foreground">{value}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PRESCRIPTIONS TAB */}
              {activeTab === "prescriptions" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Awaiting 
                    items={data?.prescriptions.awaiting_action ?? []}
                    counts={{ pending: data?.prescriptions.pending ?? 0, reviewing: data?.prescriptions.reviewing ?? 0 }}
                    loading={isLoading}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PharmacyDashboard;
