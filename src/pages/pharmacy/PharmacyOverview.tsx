import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Star,
  Pill,
  Activity,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Order {
  id: string;
  patient: string;
  items: number;
  total: string;
  status: "pending" | "processing" | "delivered" | "cancelled";
  time: string;
  avatar: string;
}

interface InventoryAlert {
  name: string;
  stock: number;
  threshold: number;
  category: string;
  level: "critical" | "low" | "ok";
}

interface TopProduct {
  name: string;
  category: string;
  sales: number;
  revenue: string;
  trend: "up" | "down";
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
const RECENT_ORDERS: Order[] = [
  {
    id: "ORD-4821",
    patient: "Alice Uwimana",
    items: 3,
    total: "RWF 12,400",
    status: "delivered",
    time: "2 min ago",
    avatar: "AU",
  },
  {
    id: "ORD-4820",
    patient: "Jean-Pierre Habimana",
    items: 1,
    total: "RWF 4,800",
    status: "processing",
    time: "18 min ago",
    avatar: "JH",
  },
  {
    id: "ORD-4819",
    patient: "Diane Mutesi",
    items: 5,
    total: "RWF 27,500",
    status: "pending",
    time: "34 min ago",
    avatar: "DM",
  },
  {
    id: "ORD-4818",
    patient: "Patrick Niyonzima",
    items: 2,
    total: "RWF 9,200",
    status: "delivered",
    time: "1 hr ago",
    avatar: "PN",
  },
  {
    id: "ORD-4817",
    patient: "Esperance Iradukunda",
    items: 4,
    total: "RWF 18,700",
    status: "cancelled",
    time: "2 hr ago",
    avatar: "EI",
  },
];

const INVENTORY_ALERTS: InventoryAlert[] = [
  {
    name: "Amoxicillin 500mg",
    stock: 12,
    threshold: 50,
    category: "Antibiotics",
    level: "critical",
  },
  {
    name: "Paracetamol 1g",
    stock: 28,
    threshold: 100,
    category: "Analgesics",
    level: "low",
  },
  {
    name: "Metformin 850mg",
    stock: 35,
    threshold: 80,
    category: "Antidiabetics",
    level: "low",
  },
  {
    name: "Artemether-Lumefantrine",
    stock: 8,
    threshold: 40,
    category: "Antimalarials",
    level: "critical",
  },
  {
    name: "ORS Sachets",
    stock: 44,
    threshold: 60,
    category: "Rehydration",
    level: "low",
  },
];

const TOP_PRODUCTS: TopProduct[] = [
  {
    name: "Paracetamol 500mg",
    category: "Analgesics",
    sales: 312,
    revenue: "RWF 748K",
    trend: "up",
  },
  {
    name: "Artemether-Lumefantrine",
    category: "Antimalarials",
    sales: 204,
    revenue: "RWF 612K",
    trend: "up",
  },
  {
    name: "Amoxicillin 250mg",
    category: "Antibiotics",
    sales: 187,
    revenue: "RWF 486K",
    trend: "down",
  },
  {
    name: "ORS Sachets",
    category: "Rehydration",
    sales: 165,
    revenue: "RWF 198K",
    trend: "up",
  },
];

const WEEKLY_BARS = [
  { day: "Mon", value: 65 },
  { day: "Tue", value: 88 },
  { day: "Wed", value: 72 },
  { day: "Thu", value: 95 },
  { day: "Fri", value: 110 },
  { day: "Sat", value: 84 },
  { day: "Sun", value: 42 },
];

const MAX_BAR = Math.max(...WEEKLY_BARS.map((b) => b.value));

// ─────────────────────────────────────────────────────────────────────────────
// Status / alert config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  Order["status"],
  { label: string; dot: string; badge: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-amber-400",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
  },
  processing: {
    label: "Processing",
    dot: "bg-blue-400",
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/40",
  },
  delivered: {
    label: "Delivered",
    dot: "bg-emerald-400",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-400",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40",
  },
};

const ALERT_LEVEL_CONFIG: Record<
  InventoryAlert["level"],
  { bar: string; badge: string; label: string }
> = {
  critical: {
    bar: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40",
    label: "Critical",
  },
  low: {
    bar: "bg-amber-400",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
    label: "Low",
  },
  ok: {
    bar: "bg-emerald-400",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
    label: "OK",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/15 flex items-center justify-center text-primary">
            <Icon size={13} />
          </div>
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        {action && (
          <div className="text-[11px] text-muted-foreground">{action}</div>
        )}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard sub-components
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyChart() {
  return (
    <Section
      title="Weekly Orders"
      icon={Activity}
      action={
        <span className="flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline">
          This week <ChevronRight size={11} />
        </span>
      }
    >
      <div className="px-4 py-4">
        <div className="flex items-end gap-2 h-36">
          {WEEKLY_BARS.map((bar) => {
            const heightPct = Math.round((bar.value / MAX_BAR) * 100);
            const isToday = bar.day === "Fri";
            return (
              <div
                key={bar.day}
                className="flex-1 flex flex-col items-center gap-1.5 group/bar"
              >
                <span className="text-[10px] font-semibold text-foreground opacity-0 group-hover/bar:opacity-100 transition-opacity tabular-nums">
                  {bar.value}
                </span>
                <div className="w-full flex-1 flex items-end rounded-sm overflow-hidden bg-muted/60">
                  <div
                    className={cn(
                      "w-full rounded-sm transition-all duration-300",
                      isToday
                        ? "bg-primary"
                        : "bg-primary/30 group-hover/bar:bg-primary/60",
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isToday ? "text-primary font-bold" : "text-muted-foreground",
                  )}
                >
                  {bar.day}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Peak day", value: "Friday" },
            { label: "Total orders", value: "556" },
            { label: "Avg / day", value: "79.4" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-sm font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function RecentOrders() {
  return (
    <Section
      title="Recent Orders"
      icon={ShoppingBag}
      action={
        <span className="flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline">
          View all <ChevronRight size={11} />
        </span>
      }
    >
      <div className="divide-y divide-border">
        {RECENT_ORDERS.map((order) => {
          const cfg = STATUS_CONFIG[order.status];
          return (
            <div
              key={order.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
                {order.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {order.patient}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {order.id} · {order.items} item{order.items > 1 ? "s" : ""}
                </p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold rounded-full px-2 py-0.5 border hidden sm:inline-flex items-center gap-1",
                  cfg.badge,
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-foreground">
                  {order.total}
                </p>
                <p className="text-[10px] text-muted-foreground">{order.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function InventoryAlerts() {
  return (
    <Section
      title="Inventory Alerts"
      icon={AlertTriangle}
      action={
        <span className="flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline">
          Manage <ChevronRight size={11} />
        </span>
      }
    >
      <div className="divide-y divide-border">
        {INVENTORY_ALERTS.map((item) => {
          const cfg = ALERT_LEVEL_CONFIG[item.level];
          const pct = Math.round((item.stock / item.threshold) * 100);
          return (
            <div
              key={item.name}
              className="px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-semibold text-foreground">
                    {item.stock}
                    <span className="text-muted-foreground font-normal">
                      /{item.threshold}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold rounded-full px-2 py-0.5 border",
                      cfg.badge,
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", cfg.bar)}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function TopProducts() {
  return (
    <Section
      title="Top Products"
      icon={Star}
      action={
        <span className="flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline">
          Full report <ChevronRight size={11} />
        </span>
      }
    >
      <div className="divide-y divide-border">
        {TOP_PRODUCTS.map((product, idx) => (
          <div
            key={product.name}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
          >
            <span
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                idx === 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {idx + 1}
            </span>
            <div className="w-7 h-7 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Pill size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {product.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {product.category}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <p className="text-xs font-semibold text-foreground">
                  {product.revenue}
                </p>
                {product.trend === "up" ? (
                  <TrendingUp size={11} className="text-emerald-500" />
                ) : (
                  <TrendingDown size={11} className="text-red-400" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {product.sales} sales
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function QuickActions() {
  const actions = [
    { label: "New Order", icon: ShoppingBag, variant: "primary" as const },
    { label: "Add Stock", icon: Package, variant: "outline" as const },
    { label: "View Reports", icon: TrendingUp, variant: "outline" as const },
    { label: "Deliveries", icon: Truck, variant: "outline" as const },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {actions.map(({ label, icon: Icon, variant }) => (
        <button
          key={label}
          className={cn(
            "flex items-center gap-2 rounded-sm border px-3 py-2.5 text-xs font-semibold transition-all hover:shadow-sm active:scale-[0.98]",
            variant === "primary"
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

function StatusBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <CheckCircle2 size={13} />
        <span className="text-[11px] font-semibold">Pharmacy is open</span>
      </div>
      <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">·</span>
      <div className="flex items-center gap-1 text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
        <Clock size={11} />
        <span>Closes at 6:00 PM</span>
      </div>
      <div className="ml-auto flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
        <Zap size={11} />
        <span>3 orders in queue</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
function PharmacyDashboard() {
  const { t } = useTranslation();

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.overview_title")}
          subtitle={t("pages.pharmacy.overview_sub")}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Live status */}
          <StatusBanner />

          {/* Quick actions */}
          <QuickActions />

          {/* KPI stats — your StatCard, with semantic accent per metric */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Total Orders"
              value="1,284"
              icon={ShoppingBag}
              accent="primary"
            />
            <StatCard
              label="Revenue"
              value="RWF 4.2M"
              icon={TrendingUp}
              accent="success"
            />
            <StatCard
              label="Active Customers"
              value="342"
              icon={Users}
              accent="info"
            />
            <StatCard
              label="Deliveries"
              value="89"
              icon={Truck}
              accent="info"
            />
            <StatCard
              label="Low Stock Items"
              value="7"
              icon={AlertTriangle}
              accent="warning"
            />
            <StatCard
              label="Avg. Order Value"
              value="RWF 3,270"
              icon={Activity}
              accent="primary"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <WeeklyChart />
            <TopProducts />
          </div>

          {/* Orders + Inventory row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RecentOrders />
            <InventoryAlerts />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PharmacyDashboard;
