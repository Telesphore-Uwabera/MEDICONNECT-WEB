import { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Activity,
  FileText,
  Pill,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  ChevronDown,
  BarChart2,
  Filter,
  Stethoscope,
  ShieldCheck,
  Star,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useGetPatientStats } from "@/hooks/patient/use-patient-dashboard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityChartPoint {
  label: string;
  doctors_seen: number;
  appointments: number;
  completed: number;
  online: number;
  in_person: number;
  spent: number;
}

interface PatientDashboardResponse {
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
    instant_active: number;
  };
  period_stats: {
    unique_doctors: number;
    unique_hospitals: number;
    total_appointments: number;
    completed: number;
    cancelled: number;
    pending: number;
    online_count: number;
    in_person_count: number;
    avg_duration_minutes: number;
    instant_total: number;
    instant_completed: number;
    prescriptions_received: number;
    service_bookings_total: number;
    certificates_issued: number;
  };
  spending: {
    total: number;
    previous_period_total: number;
    change_percent: number | null;
    total_insurance_saved: number;
    breakdown: {
      appointments: {
        total: number;
        online: number;
        in_person: number;
        count: number;
        avg_per_appointment: number;
      };
      service_bookings: {
        total: number;
        booking_count: number;
      };
    };
  };
  activity_chart: ActivityChartPoint[];
  instant: {
    total: number;
    completed: number;
    declined: number;
    pending: number;
    active_now: number;
    avg_duration_min: number;
  };
  prescriptions: {
    total: number;
    issued: number;
    draft: number;
    signed: number;
    active: number;
    expiring_soon: number;
    recent: unknown[];
  };
  certificates: {
    total: number;
    issued: number;
    pending: number;
    rejected: number;
    signed: number;
    had_red_flags: number;
    required_inperson: number;
    expiring_soon: number;
  };
  service_bookings: {
    total: number;
    completed: number;
    pending: number;
    accepted: number;
    rejected: number;
    cancelled: number;
    recent: unknown[];
  };
  reviews: {
    total: number;
    avg_rating: number | null;
    approved: number;
    pending: number;
    rejected: number;
    five_star: number;
    four_star: number;
    three_star: number;
    low_star: number;
    pending_review: number;
    recent: unknown[];
  };
  medical_profile: {
    complete: boolean;
    allergies_count: number;
    conditions_count: number;
    medications_count: number;
    surgeries_count: number;
    smoking_status: string;
    alcohol_use: string;
    has_family_history: boolean;
  };
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "year" | "custom";
type AppointmentType = "all" | "online" | "in_person";
type StatusFilter = "all" | "completed" | "pending" | "cancelled";
type ChartGroup = "day" | "week" | "month";

interface Filters {
  period: Period;
  start_date?: string;
  end_date?: string;
  appointment_type: AppointmentType;
  status: StatusFilter;
  chart_group: ChartGroup;
  search: string;
}

// ─── Label Maps ───────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
  custom: "Custom Range",
};

const TYPE_LABELS: Record<AppointmentType, string> = {
  all: "All Types",
  online: "Online",
  in_person: "In-Person",
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All Statuses",
  completed: "Completed",
  pending: "Pending",
  cancelled: "Cancelled",
};

const GROUP_LABELS: Record<ChartGroup, string> = {
  day: "By Day",
  week: "By Week",
  month: "By Month",
};

const DEFAULT_FILTERS: Filters = {
  period: "month",
  appointment_type: "all",
  status: "all",
  chart_group: "day",
  search: "",
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: "primary" | "success" | "warning" | "danger" | "info" | "violet";
  sub?: string;
  loading?: boolean;
}

const accentMap: Record<KpiCardProps["accent"], string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  violet: "bg-violet-500/10 text-violet-500 border-violet-500/20",
};

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  loading,
}: KpiCardProps) {
  return (
    <div className="rounded-md border border-border/70 bg-card p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide leading-none">
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-md border flex items-center justify-center flex-shrink-0",
            accentMap[accent],
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-16 rounded bg-muted animate-pulse" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-foreground leading-none">
            {value}
          </span>
          {sub && (
            <span className="text-xs text-muted-foreground mb-0.5 leading-none">
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/60 bg-card shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1.5">
        {String(label ?? "")}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PatientStats = ({ activeTab }: { activeTab: string }) => {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  // Pass filters to hook — query reruns whenever filters change
  const { data: rawData, isLoading, isFetching } = useGetPatientStats(filters);
  const data = rawData as PatientDashboardResponse | undefined;

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  // Debounced search — fires 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        set("search", searchInput);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput("");
  };

  const hasActiveFilters =
    filters.appointment_type !== "all" ||
    filters.status !== "all" ||
    !!filters.search;

  const ps = data?.period_stats;
  const today = data?.today;
  const spending = data?.spending;
  const prescriptions = data?.prescriptions;
  const certificates = data?.certificates;
  const instant = data?.instant;
  const reviews = data?.reviews;
  const medProfile = data?.medical_profile;
  const chartData = data?.activity_chart ?? [];

  const completionRate = useMemo(() => {
    if (!ps?.total_appointments) return 0;
    return Math.round((ps.completed / ps.total_appointments) * 100);
  }, [ps]);

  if (!["overview", "clinical", "financial"].includes(activeTab)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ── */}
      <div className="rounded-md border border-border/70 bg-card shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-2">
                <Filter className="w-4 h-4" />
                Filters
              </div>

              {/* Period */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs rounded-md border-border/60 gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {PERIOD_LABELS[filters.period]}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="text-xs">
                  {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                    <DropdownMenuItem
                      key={p}
                      className={cn(
                        "text-xs",
                        filters.period === p && "text-primary font-semibold",
                      )}
                      onSelect={() => set("period", p)}
                    >
                      {PERIOD_LABELS[p]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Custom date range */}
              {filters.period === "custom" && (
                <>
                  <Input
                    type="date"
                    className="h-8 text-xs rounded-md w-32"
                    value={filters.start_date ?? ""}
                    onChange={(e) => set("start_date", e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input
                    type="date"
                    className="h-8 text-xs rounded-md w-32"
                    value={filters.end_date ?? ""}
                    onChange={(e) => set("end_date", e.target.value)}
                  />
                </>
              )}

              {/* Appointment Type */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs rounded-md border-border/60 gap-1.5",
                      filters.appointment_type !== "all" &&
                        "border-primary/40 text-primary bg-primary/5",
                    )}
                  >
                    {TYPE_LABELS[filters.appointment_type]}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(Object.keys(TYPE_LABELS) as AppointmentType[]).map((t) => (
                    <DropdownMenuItem
                      key={t}
                      className={cn(
                        "text-xs",
                        filters.appointment_type === t &&
                          "text-primary font-semibold",
                      )}
                      onSelect={() => set("appointment_type", t)}
                    >
                      {TYPE_LABELS[t]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs rounded-md border-border/60 gap-1.5",
                      filters.status !== "all" &&
                        "border-primary/40 text-primary bg-primary/5",
                    )}
                  >
                    {STATUS_LABELS[filters.status]}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
                    <DropdownMenuItem
                      key={s}
                      className={cn(
                        "text-xs",
                        filters.status === s && "text-primary font-semibold",
                      )}
                      onSelect={() => set("status", s)}
                    >
                      {STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Chart Group */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs rounded-md border-border/60 gap-1.5"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    {GROUP_LABELS[filters.chart_group]}
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {(Object.keys(GROUP_LABELS) as ChartGroup[]).map((g) => (
                    <DropdownMenuItem
                      key={g}
                      className={cn(
                        "text-xs",
                        filters.chart_group === g &&
                          "text-primary font-semibold",
                      )}
                      onSelect={() => set("chart_group", g)}
                    >
                      {GROUP_LABELS[g]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search doctor, hospital…"
                    className={cn(
                      "h-8 pl-8 pr-3 text-xs rounded-md w-48 transition-colors",
                      filters.search && "border-primary/40 bg-primary/5",
                    )}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") set("search", searchInput);
                    }}
                  />
                  {searchInput && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchInput("");
                        set("search", "");
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  className="h-8 px-4 text-xs rounded-md"
                  onClick={() => set("search", searchInput)}
                >
                  Search
                </Button>
              </div>

              {isFetching && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Active Filter Pills */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                <span className="text-xs text-muted-foreground font-medium mr-1">
                  Active:
                </span>

                {filters.appointment_type !== "all" && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-6 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => set("appointment_type", "all")}
                  >
                    {TYPE_LABELS[filters.appointment_type]}
                    <XCircle className="w-3 h-3" />
                  </Badge>
                )}

                {filters.status !== "all" && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-6 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => set("status", "all")}
                  >
                    {STATUS_LABELS[filters.status]}
                    <XCircle className="w-3 h-3" />
                  </Badge>
                )}

                {filters.search && (
                  <Badge
                    variant="secondary"
                    className="text-xs h-6 px-2.5 gap-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => {
                      set("search", "");
                      setSearchInput("");
                    }}
                  >
                    &ldquo;{filters.search}&rdquo;
                    <XCircle className="w-3 h-3" />
                  </Badge>
                )}

                <button
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-2 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ── Tab Content ── */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* ── Today's Snapshot ── */}
              <div>
            <SectionLabel>Today</SectionLabel>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
              <KpiCard
                label="Total"
                value={today?.total ?? 0}
                icon={Calendar}
                accent="primary"
                loading={isLoading}
              />
              <KpiCard
                label="Completed"
                value={today?.completed ?? 0}
                icon={CheckCircle2}
                accent="success"
                loading={isLoading}
              />
              <KpiCard
                label="Pending"
                value={today?.pending ?? 0}
                icon={Clock}
                accent="warning"
                loading={isLoading}
              />
              <KpiCard
                label="Confirmed"
                value={today?.confirmed ?? 0}
                icon={CheckCircle2}
                accent="info"
                loading={isLoading}
              />
              <KpiCard
                label="Cancelled"
                value={today?.cancelled ?? 0}
                icon={XCircle}
                accent="danger"
                loading={isLoading}
              />
              <KpiCard
                label="Instant Active"
                value={today?.instant_active ?? 0}
                icon={Zap}
                accent="violet"
                loading={isLoading}
              />
            </div>
          </div>

          {/* ── Period Stats ── */}
          <div>
            <SectionLabel>
              Period —{" "}
              {filters.period === "custom" &&
              filters.start_date &&
              filters.end_date
                ? `${filters.start_date} → ${filters.end_date}`
                : data?.filters_applied?.from
                  ? `${data.filters_applied.from} → ${data.filters_applied.to}`
                  : PERIOD_LABELS[filters.period]}
            </SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 mb-1.5">
              <KpiCard
                label="Total Appointments"
                value={ps?.total_appointments ?? 0}
                icon={Calendar}
                accent="primary"
                loading={isLoading}
              />
              <KpiCard
                label="Completed"
                value={ps?.completed ?? 0}
                icon={CheckCircle2}
                accent="success"
                loading={isLoading}
              />
              <KpiCard
                label="Pending"
                value={ps?.pending ?? 0}
                icon={Clock}
                accent="warning"
                loading={isLoading}
              />
              <KpiCard
                label="Cancelled"
                value={ps?.cancelled ?? 0}
                icon={XCircle}
                accent="danger"
                loading={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <KpiCard
                label="Online Visits"
                value={ps?.online_count ?? 0}
                icon={Activity}
                accent="info"
                loading={isLoading}
              />
              <KpiCard
                label="In-Person"
                value={ps?.in_person_count ?? 0}
                icon={Users}
                accent="primary"
                loading={isLoading}
              />
              <KpiCard
                label="Unique Doctors"
                value={ps?.unique_doctors ?? 0}
                icon={Stethoscope}
                accent="violet"
                loading={isLoading}
              />
              <KpiCard
                label="Completion Rate"
                value={`${completionRate}%`}
                icon={TrendingUp}
                accent={completionRate >= 70 ? "success" : "warning"}
                loading={isLoading}
              />
            </div>
          </div>

          {/* ── Activity Chart ── */}
          <div className="rounded-[16px] border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Appointment Activity
                </h2>
                <p className="text-xs font-medium text-muted-foreground/70 mt-1">
                  {PERIOD_LABELS[filters.period]} · Grouped{" "}
                  {GROUP_LABELS[filters.chart_group].toLowerCase()}
                  {filters.appointment_type !== "all" &&
                    ` · ${TYPE_LABELS[filters.appointment_type]}`}
                  {filters.status !== "all" &&
                    ` · ${STATUS_LABELS[filters.status]}`}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-[8px] border border-border/60 p-1 bg-background/50">
                {(["area", "bar"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-[6px] font-bold transition-colors capitalize",
                      chartType === t
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
                  <BarChart2 className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-xs font-medium text-muted-foreground">
                    No chart data for this period
                  </p>
                </div>
              ) : chartType === "area" ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="gCompleted"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.4}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      formatter={(val) => (
                        <span
                          style={{
                            color: "hsl(var(--muted-foreground))",
                            textTransform: "capitalize",
                            fontWeight: 600,
                          }}
                        >
                          {val}
                        </span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="appointments"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#gTotal)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#gCompleted)"
                    />
                    <Area
                      type="monotone"
                      dataKey="online"
                      stroke="#0ea5e9"
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray="4 4"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                    barSize={8}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.4}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      formatter={(val) => (
                        <span
                          style={{
                            color: "hsl(var(--muted-foreground))",
                            textTransform: "capitalize",
                            fontWeight: 600,
                          }}
                        >
                          {val}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="appointments"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="completed"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="online"
                      fill="#0ea5e9"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="in_person"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* ── Spending ── */}
              <div>
                <SectionLabel>Spending</SectionLabel>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <KpiCard
                    label="Total Spent"
                    value={`RWF${spending?.total ?? 0}`}
                    icon={TrendingUp}
                    accent="primary"
                    loading={isLoading}
                    sub={
                      spending?.change_percent != null
                        ? `${spending.change_percent > 0 ? "+" : ""}${spending.change_percent}% vs prev`
                        : undefined
                    }
                  />
                  <KpiCard
                    label="Insurance Saved"
                    value={`RWF${spending?.total_insurance_saved ?? 0}`}
                    icon={ShieldCheck}
                    accent="success"
                    loading={isLoading}
                  />
                  <KpiCard
                    label="Avg / Appointment"
                    value={`RWF${spending?.breakdown.appointments.avg_per_appointment ?? 0}`}
                    icon={BarChart2}
                    accent="info"
                    loading={isLoading}
                  />
                  <KpiCard
                    label="Service Bookings"
                    value={spending?.breakdown.service_bookings.booking_count ?? 0}
                    icon={FileText}
                    accent="violet"
                    loading={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "clinical" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* ── Instant / Prescriptions / Certificates ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
                {/* Instant Consults */}
                <div className="rounded-[12px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    Instant Consults
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Total", val: instant?.total ?? 0 },
                      { label: "Completed", val: instant?.completed ?? 0 },
                      { label: "Pending", val: instant?.pending ?? 0 },
                      { label: "Declined", val: instant?.declined ?? 0 },
                      { label: "Active Now", val: instant?.active_now ?? 0 },
                      {
                        label: "Avg Duration",
                        val: `${instant?.avg_duration_min ?? 0}m`,
                      },
                    ].map(({ label, val }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-1 border-b border-border/40 pb-2"
                      >
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className="font-bold text-foreground text-sm">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prescriptions */}
                <div className="rounded-[12px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-emerald-500/10">
                      <Pill className="w-4 h-4 text-emerald-500" />
                    </div>
                    Prescriptions
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Total", val: prescriptions?.total ?? 0 },
                      { label: "Active", val: prescriptions?.active ?? 0 },
                      { label: "Issued", val: prescriptions?.issued ?? 0 },
                      { label: "Signed", val: prescriptions?.signed ?? 0 },
                      { label: "Draft", val: prescriptions?.draft ?? 0 },
                      {
                        label: "Expiring Soon",
                        val: prescriptions?.expiring_soon ?? 0,
                      },
                    ].map(({ label, val }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-1 border-b border-border/40 pb-2"
                      >
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span
                          className={cn(
                            "font-bold text-foreground text-sm",
                            label === "Expiring Soon" &&
                              (val as number) > 0 &&
                              "text-amber-500",
                          )}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certificates */}
                <div className="rounded-[12px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-sky-500/10">
                      <FileText className="w-4 h-4 text-sky-500" />
                    </div>
                    Certificates
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Total", val: certificates?.total ?? 0 },
                      { label: "Issued", val: certificates?.issued ?? 0 },
                      { label: "Pending", val: certificates?.pending ?? 0 },
                      { label: "Signed", val: certificates?.signed ?? 0 },
                      { label: "Red Flags", val: certificates?.had_red_flags ?? 0 },
                      {
                        label: "Req. In-Person",
                        val: certificates?.required_inperson ?? 0,
                      },
                    ].map(({ label, val }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-1 border-b border-border/40 pb-2"
                      >
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span
                          className={cn(
                            "font-bold text-foreground text-sm",
                            label === "Red Flags" &&
                              (val as number) > 0 &&
                              "text-rose-500",
                          )}
                        >
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* ── Reviews & Medical Profile ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                {/* Reviews */}
                <div className="rounded-[12px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-400/10">
                      <Star className="w-4 h-4 text-amber-400" />
                    </div>
                    Reviews
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Total", val: reviews?.total ?? 0 },
                      {
                        label: "Avg Rating",
                        val:
                          reviews?.avg_rating != null
                            ? reviews.avg_rating.toFixed(1)
                            : "—",
                      },
                      { label: "5 Star", val: reviews?.five_star ?? 0 },
                      { label: "4 Star", val: reviews?.four_star ?? 0 },
                      { label: "3 Star", val: reviews?.three_star ?? 0 },
                      {
                        label: "Pending Review",
                        val: reviews?.pending_review ?? 0,
                      },
                    ].map(({ label, val }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-1 border-b border-border/40 pb-2"
                      >
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className="font-bold text-foreground text-sm">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medical Profile */}
                <div className="rounded-[12px] border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-sky-500/10">
                      <Stethoscope className="w-4 h-4 text-sky-500" />
                    </div>
                    Medical Profile
                    {medProfile?.complete && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/10 rounded-[4px]"
                      >
                        Complete
                      </Badge>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Allergies", val: medProfile?.allergies_count ?? 0 },
                      {
                        label: "Conditions",
                        val: medProfile?.conditions_count ?? 0,
                      },
                      {
                        label: "Medications",
                        val: medProfile?.medications_count ?? 0,
                      },
                      { label: "Surgeries", val: medProfile?.surgeries_count ?? 0 },
                      { label: "Smoking", val: medProfile?.smoking_status ?? "—" },
                      { label: "Alcohol", val: medProfile?.alcohol_use ?? "—" },
                    ].map(({ label, val }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-1 border-b border-border/40 pb-2"
                      >
                        <span className="text-muted-foreground font-medium">{label}</span>
                        <span className="font-bold text-foreground text-sm capitalize">
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                  {medProfile?.has_family_history && (
                    <div className="mt-4 p-2.5 rounded-md border border-amber-500/20 bg-amber-500/10 flex items-center gap-2 text-xs font-medium text-amber-600">
                      <AlertTriangle className="w-4 h-4" /> Has family history recorded
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
  );
};

export default PatientStats;
