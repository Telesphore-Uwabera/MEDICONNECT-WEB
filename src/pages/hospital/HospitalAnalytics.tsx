import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { cn } from "@/lib/utils";
import {
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ── Types ──────────────────────────────────────────────────────── */

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

/* ── API response shape interfaces ─────────────────────────────── */

interface BookingStatusCounts {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  rejected: number;
  cancelled: number;
  unique_patients?: number;
  unique_services?: number;
}

interface AppointmentStatusCounts {
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

interface TodaySnapshot {
  service_bookings: BookingStatusCounts;
  appointments: AppointmentStatusCounts;
}

interface RevenueStats {
  gross: number;
  insurance_covered: number;
  patient_paid: number;
  avg_booking_value: number;
  booking_count: number;
  change_percent: number | null;
}

interface BookingsChartPoint {
  label: string;
  total: number;
  completed: number;
  pending: number;
  revenue?: number;
}

interface DailyAppointmentPoint {
  date: string;
  total: number;
  completed: number;
}

interface UpcomingAppointment {
  id: number;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
}

interface Department {
  id: number;
  name: string;
  period_bookings: number;
}

interface TopService {
  service_id: number;
  service_name: string;
  booking_count: number;
  revenue: number;
}

interface ServicesStats {
  total: number;
  active: number;
  inactive: number;
  available: number;
  insurance_covered: number;
  requires_appointment: number;
  requires_referral: number;
  top_services: TopService[];
}

interface TopDoctor {
  doctor_id: number;
  doctor_name: string;
  appointment_count: number;
  avg_duration_min: number;
}

interface DoctorsStats {
  total: number;
  active: number;
  inactive: number;
  top_doctors: TopDoctor[];
}

interface RecentReview {
  id: number;
  doctor_name: string;
  rating: number;
  comment: string;
  time: string;
}

interface ReviewsStats {
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

interface HospitalDashboardData {
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

/* ── Hook ───────────────────────────────────────────────────────── */

const BASE = "/hospital/dashboard";

export function useGetHospitalStats(params: HospitalDashboardParams = {}) {
  const query = new URLSearchParams();
  if (params.period) query.set("period", params.period);
  if (params.start_date) query.set("start_date", params.start_date);
  if (params.end_date) query.set("end_date", params.end_date);
  if (params.chart_group) query.set("chart_group", params.chart_group);
  if (params.department_id)
    query.set("department_id", String(params.department_id));
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  const qs = query.toString();
  const url = qs ? `${BASE}?${qs}` : BASE;
  return useQuery<HospitalDashboardData>({
    queryKey: ["hospital-stats", params],
    queryFn: () => apiFetch(url),
  });
}

/* ── Helpers ────────────────────────────────────────────────────── */

const DEPT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary-glow))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(var(--success))",
  pending: "hsl(var(--warning))",
  accepted: "hsl(var(--info))",
  rejected: "hsl(var(--destructive))",
  cancelled: "hsl(var(--muted-foreground))",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/50 ${className}`} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] font-semibold text-foreground mb-3">
      {children}
    </h3>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[6px] border border-border/70 bg-card p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground capitalize">{label}</span>
      <span
        className="font-semibold tabular-nums"
        style={{ color: color ?? "hsl(var(--foreground))" }}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function MiniBar({
  value,
  total,
  color,
}: {
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-1 w-full rounded-full bg-muted/40 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/* ── Derived data types (for local chart arrays) ─────────────────── */

interface DeptPieSlice {
  name: string;
  value: number;
  color: string;
}

interface StatusSlice {
  name: string;
  value: number;
  fill: string;
}

interface StarRow {
  label: string;
  value: number;
}

/* ── Component ───────────────────────────────────────────────────── */

const HospitalAnalytics = () => {
  const { t } = useTranslation();
  const { data = {}, isLoading } = useGetHospitalStats({ period: "month" });

  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "clinical" | "reviews">("overview");
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

  /* ── Aliases ── */
  const today = data?.today;
  const periodSB = data?.period_stats?.service_bookings;
  const periodAppts = data?.period_stats?.appointments;
  const revenue = data?.revenue;
  const bookingsChart: BookingsChartPoint[] = data?.bookings_chart ?? [];
  const dailyAppts: DailyAppointmentPoint[] =
    data?.appointments?.daily_breakdown ?? [];
  const upcoming: UpcomingAppointment[] = data?.appointments?.upcoming ?? [];
  const departments: Department[] = data?.departments ?? [];
  const services = data?.services;
  const doctors = data?.doctors;
  const reviews = data?.reviews;

  /* ── Derived ── */
  const grossRevenue = revenue?.gross ?? 0;
  const changePercent = revenue?.change_percent ?? null;
  const avgRating = reviews?.avg_rating ?? null;

  const deptPieData: DeptPieSlice[] = departments.map((d, i) => ({
    name: d.name,
    value: d.period_bookings,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const bookingStatusData: StatusSlice[] = periodSB
    ? [
      {
        name: "Completed",
        value: periodSB.completed,
        fill: STATUS_COLORS.completed,
      },
      {
        name: "Pending",
        value: periodSB.pending,
        fill: STATUS_COLORS.pending,
      },
      {
        name: "Accepted",
        value: periodSB.accepted,
        fill: STATUS_COLORS.accepted,
      },
      {
        name: "Rejected",
        value: periodSB.rejected,
        fill: STATUS_COLORS.rejected,
      },
      {
        name: "Cancelled",
        value: periodSB.cancelled,
        fill: STATUS_COLORS.cancelled,
      },
    ]
    : [];

  const starBreakdown: StarRow[] = reviews
    ? [
      { label: "5★", value: reviews.five_star ?? 0 },
      { label: "4★", value: reviews.four_star ?? 0 },
      { label: "3★", value: reviews.three_star ?? 0 },
      { label: "1-2★", value: reviews.low_star ?? 0 },
    ]
    : [];
  const totalReviewsCount = starBreakdown.reduce((s, r) => s + r.value, 0);

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.analytics_title")}
          subtitle={t("pages.hospital.analytics_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
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
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("clinical")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "clinical" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Clinical & Operations
                </button>
                <button
                  onClick={() => setActiveTab("financial")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "financial" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Financials
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={cn(
                    "px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap shrink-0",
                    activeTab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                  )}
                >
                  Reviews
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
                {/* ── TOP STAT STRIP ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))
                  ) : (
                    <>
                      <StatCard
                        label={t("pages.hospital.stat_patients")}
                        value={(periodSB?.unique_patients ?? 0).toLocaleString()}
                        icon={Users}
                        accent="primary"
                      />
                      <StatCard
                        label={t("pages.hospital.stat_consultations")}
                        value={(periodAppts?.completed ?? 0).toLocaleString()}
                        icon={Activity}
                        accent="info"
                      />
                      <StatCard
                        label={t("pages.hospital.stat_revenue")}
                        value={`RWF${(grossRevenue / 1000).toFixed(0)}k`}
                        icon={CreditCard}
                        accent="success"
                      />
                      <StatCard
                        label={t("pages.hospital.stat_satisfaction")}
                        value={avgRating != null ? avgRating.toFixed(2) : "—"}
                        icon={TrendingUp}
                        accent="warning"
                      />
                    </>
                  )}
                </div>

                {/* ── TODAY SNAPSHOT ── */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <SectionTitle>
                      {t("pages.hospital.today_bookings")}
                    </SectionTitle>
                    {isLoading ? (
                      <Skeleton className="h-28" />
                    ) : (
                      <div className="space-y-1.5">
                        <StatusRow
                          label="Total"
                          value={today?.service_bookings?.total ?? 0}
                        />
                        <StatusRow
                          label="Pending"
                          value={today?.service_bookings?.pending ?? 0}
                          color={STATUS_COLORS.pending}
                        />
                        <StatusRow
                          label="Accepted"
                          value={today?.service_bookings?.accepted ?? 0}
                          color={STATUS_COLORS.accepted}
                        />
                        <StatusRow
                          label="Completed"
                          value={today?.service_bookings?.completed ?? 0}
                          color={STATUS_COLORS.completed}
                        />
                        <StatusRow
                          label="Rejected"
                          value={today?.service_bookings?.rejected ?? 0}
                          color={STATUS_COLORS.rejected}
                        />
                        <StatusRow
                          label="Cancelled"
                          value={today?.service_bookings?.cancelled ?? 0}
                          color={STATUS_COLORS.cancelled}
                        />
                      </div>
                    )}
                  </Card>

                  <Card>
                    <SectionTitle>
                      {t("pages.hospital.today_appointments")}
                    </SectionTitle>
                    {isLoading ? (
                      <Skeleton className="h-28" />
                    ) : (
                      <div className="space-y-1.5">
                        <StatusRow
                          label="Total"
                          value={today?.appointments?.total ?? 0}
                        />
                        <StatusRow
                          label="Completed"
                          value={today?.appointments?.completed ?? 0}
                          color={STATUS_COLORS.completed}
                        />
                        <StatusRow
                          label="Confirmed"
                          value={today?.appointments?.confirmed ?? 0}
                          color={STATUS_COLORS.accepted}
                        />
                        <StatusRow
                          label="Pending"
                          value={today?.appointments?.pending ?? 0}
                          color={STATUS_COLORS.pending}
                        />
                        <StatusRow
                          label="Cancelled"
                          value={today?.appointments?.cancelled ?? 0}
                          color={STATUS_COLORS.cancelled}
                        />
                      </div>
                    )}
                  </Card>
                </div>

                {/* ── PERIOD STATS — 4 info cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))
                  ) : (
                    <>
                      <Card className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Total Bookings
                        </span>
                        <span className="text-2xl font-bold tabular-nums text-foreground">
                          {(periodSB?.total ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {periodSB?.unique_services ?? 0} services ·{" "}
                          {periodSB?.unique_patients ?? 0} patients
                        </span>
                      </Card>
                      <Card className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Appointments
                        </span>
                        <span className="text-2xl font-bold tabular-nums text-foreground">
                          {(periodAppts?.total ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {periodAppts?.online_count ?? 0} online ·{" "}
                          {periodAppts?.in_person_count ?? 0} in-person
                        </span>
                      </Card>
                      <Card className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Avg Duration
                        </span>
                        <span className="text-2xl font-bold tabular-nums text-foreground">
                          {periodAppts?.avg_duration_minutes ?? 0}
                          <span className="text-sm font-normal ml-1">min</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {periodAppts?.unique_doctors ?? 0} doctors ·{" "}
                          {periodAppts?.unique_patients ?? 0} patients
                        </span>
                      </Card>
                      <Card className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Avg Booking Value
                        </span>
                        <span className="text-xl font-bold tabular-nums text-foreground">
                          RWF{(revenue?.avg_booking_value ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {revenue?.booking_count ?? 0} paid bookings
                        </span>
                      </Card>
                    </>
                  )}
                </div>

                {/* ── BOOKINGS CHART + DEPT PIE ── */}
                <div className="grid lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-2">
                    <SectionTitle>{t("pages.hospital.patient_flow")}</SectionTitle>
                    {isLoading ? (
                      <Skeleton className="h-[240px]" />
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={bookingsChart}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) =>
                              String(v).split(",")[0] ?? v
                            }
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "6px 10px",
                            }}
                          />
                          <Bar
                            dataKey="total"
                            name="Total"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="completed"
                            name="Completed"
                            fill={STATUS_COLORS.completed}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="pending"
                            name="Pending"
                            fill={STATUS_COLORS.pending}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  <Card>
                    <SectionTitle>{t("pages.hospital.by_department")}</SectionTitle>
                    {isLoading ? (
                      <Skeleton className="h-[180px]" />
                    ) : deptPieData.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground pt-2">
                        {t("pages.common.no_data")}
                      </p>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie
                              data={deptPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={38}
                              outerRadius={62}
                              paddingAngle={3}
                            >
                              {deptPieData.map((d, i) => (
                                <Cell key={i} fill={d.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 6,
                                fontSize: 11,
                                padding: "6px 10px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-2 space-y-2">
                          {departments.map((d, i) => (
                            <div key={d.id} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                      background:
                                        DEPT_COLORS[i % DEPT_COLORS.length],
                                    }}
                                  />
                                  {d.name}
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  {d.period_bookings}
                                </span>
                              </div>
                              <MiniBar
                                value={d.period_bookings}
                                total={periodSB?.total ?? 1}
                                color={DEPT_COLORS[i % DEPT_COLORS.length]}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                </div>

                {/* ── BOOKING STATUS BREAKDOWN ── */}
                <Card>
                  <SectionTitle>Booking Status Breakdown (Period)</SectionTitle>
                  {isLoading ? (
                    <Skeleton className="h-[160px]" />
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-4 items-center">
                      <div className="space-y-2">
                        {bookingStatusData.map((s) => (
                          <div key={s.name} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                {s.name}
                              </span>
                              <span
                                className="font-semibold tabular-nums"
                                style={{ color: s.fill }}
                              >
                                {s.value.toLocaleString()}
                              </span>
                            </div>
                            <MiniBar
                              value={s.value}
                              total={periodSB?.total ?? 1}
                              color={s.fill}
                            />
                          </div>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={bookingStatusData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                          >
                            {bookingStatusData.map((s, i) => (
                              <Cell key={i} fill={s.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "6px 10px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

              </div>
            )}

            {/* FINANCIAL TAB */}
            {activeTab === "financial" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* ── REVENUE ── */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <SectionTitle>Revenue</SectionTitle>
                    {changePercent != null && !isLoading && (
                      <span className="text-[11px] text-muted-foreground">
                        {changePercent >= 0 ? "▲" : "▼"}{" "}
                        <span
                          className={
                            changePercent >= 0 ? "text-success" : "text-destructive"
                          }
                        >
                          {Math.abs(changePercent).toFixed(1)}%
                        </span>{" "}
                        vs prev period
                      </span>
                    )}
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-[200px]" />
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {(
                          [
                            { label: "Gross", value: revenue?.gross ?? 0 },
                            {
                              label: "Insurance Covered",
                              value: revenue?.insurance_covered ?? 0,
                            },
                            {
                              label: "Patient Paid",
                              value: revenue?.patient_paid ?? 0,
                            },
                          ] as const
                        ).map((r) => (
                          <div
                            key={r.label}
                            className="rounded border border-border/50 p-2"
                          >
                            <p className="text-[10px] text-muted-foreground">
                              {r.label}
                            </p>
                            <p className="text-sm font-bold tabular-nums text-foreground">
                              ${r.value.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={bookingsChart}>
                          <defs>
                            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="0%"
                                stopColor="hsl(var(--success))"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="100%"
                                stopColor="hsl(var(--success))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="label"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) =>
                              String(v).split(",")[0] ?? v
                            }
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "6px 10px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="hsl(var(--success))"
                            strokeWidth={2}
                            fill="url(#rev)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </Card>

              </div>
            )}

            {/* CLINICAL TAB */}
            {activeTab === "clinical" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* ── APPOINTMENTS DAILY + UPCOMING ── */}
                <div className="grid lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-2">
                    <SectionTitle>Daily Appointments</SectionTitle>
                    {isLoading ? (
                      <Skeleton className="h-[200px]" />
                    ) : dailyAppts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        {t("pages.common.no_data")}
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={dailyAppts}>
                          <defs>
                            <linearGradient id="appt" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="0%"
                                stopColor="hsl(var(--info))"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="100%"
                                stopColor="hsl(var(--info))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) => {
                              const d = new Date(v);
                              return isNaN(d.getTime())
                                ? v
                                : d.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                });
                            }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={28}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "6px 10px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            name="Total"
                            stroke="hsl(var(--info))"
                            strokeWidth={2}
                            fill="url(#appt)"
                          />
                          <Area
                            type="monotone"
                            dataKey="completed"
                            name="Completed"
                            stroke={STATUS_COLORS.completed}
                            strokeWidth={1.5}
                            fill="none"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  <Card>
                    <SectionTitle>Upcoming Appointments</SectionTitle>
                    {isLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-12" />
                        ))}
                      </div>
                    ) : upcoming.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        {t("pages.common.no_data")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {upcoming.map((a) => (
                          <div
                            key={a.id}
                            className="rounded border border-border/40 p-2 space-y-0.5"
                          >
                            <p className="text-[11px] font-medium text-foreground">
                              {a.patient_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {a.doctor_name}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(a.appointment_date).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" },
                                )}{" "}
                                · {String(a.appointment_time).slice(0, 5)}
                              </span>
                              <span className="text-[9px] capitalize px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {a.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* ── SERVICES + DOCTORS ── */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <SectionTitle>Services</SectionTitle>
                    {isLoading ? (
                      <Skeleton className="h-28" />
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {(
                            [
                              { label: "Total", value: services?.total ?? 0 },
                              { label: "Active", value: services?.active ?? 0 },
                              {
                                label: "Inactive",
                                value: services?.inactive ?? 0,
                              },
                            ] as const
                          ).map((s) => (
                            <div
                              key={s.label}
                              className="text-center rounded border border-border/40 p-2"
                            >
                              <p className="text-lg font-bold tabular-nums text-foreground">
                                {s.value}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {s.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <StatusRow
                            label="Available"
                            value={services?.available ?? 0}
                          />
                          <StatusRow
                            label="Insurance Covered"
                            value={services?.insurance_covered ?? 0}
                            color="hsl(var(--success))"
                          />
                          <StatusRow
                            label="Requires Appointment"
                            value={services?.requires_appointment ?? 0}
                            color="hsl(var(--info))"
                          />
                          <StatusRow
                            label="Requires Referral"
                            value={services?.requires_referral ?? 0}
                            color="hsl(var(--warning))"
                          />
                        </div>
                        {(services?.top_services ?? []).length > 0 && (
                          <>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-2">
                              Top Services
                            </p>
                            <div className="space-y-1.5">
                              {services!.top_services.map((s) => (
                                <div
                                  key={s.service_id}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="text-muted-foreground truncate max-w-[55%]">
                                    {s.service_name}
                                  </span>
                                  <span className="flex gap-2 shrink-0">
                                    <span className="tabular-nums font-semibold text-foreground">
                                      {s.booking_count} bk
                                    </span>
                                    <span className="tabular-nums text-success font-mono">
                                      ${(s.revenue / 1000).toFixed(0)}k
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </Card>

                  <Card>
                    <SectionTitle>Doctors</SectionTitle>
                    {isLoading ? (
                      <Skeleton className="h-28" />
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {(
                            [
                              { label: "Total", value: doctors?.total ?? 0 },
                              { label: "Active", value: doctors?.active ?? 0 },
                              {
                                label: "Inactive",
                                value: doctors?.inactive ?? 0,
                              },
                            ] as const
                          ).map((d) => (
                            <div
                              key={d.label}
                              className="text-center rounded border border-border/40 p-2"
                            >
                              <p className="text-lg font-bold tabular-nums text-foreground">
                                {d.value}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {d.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        {(doctors?.top_doctors ?? []).length > 0 ? (
                          <>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                              Top Doctors
                            </p>
                            <div className="space-y-1.5">
                              {doctors!.top_doctors.map((d) => (
                                <div
                                  key={d.doctor_id}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="text-muted-foreground truncate max-w-[55%]">
                                    {d.doctor_name}
                                  </span>
                                  <span className="flex gap-2 shrink-0">
                                    <span className="tabular-nums font-semibold text-foreground">
                                      {d.appointment_count} appts
                                    </span>
                                    <span className="tabular-nums text-muted-foreground">
                                      {d.avg_duration_min}min avg
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            {t("pages.common.no_data")}
                          </p>
                        )}
                      </>
                    )}
                  </Card>
                </div>

              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* ── REVIEWS ── */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <SectionTitle>Reviews</SectionTitle>
                    {avgRating != null && !isLoading && (
                      <span className="flex items-center gap-1 text-[11px] text-warning font-semibold">
                        <Star className="w-3 h-3 fill-warning text-warning" />
                        {avgRating.toFixed(1)}
                        <span className="text-muted-foreground font-normal">
                          / 5 ({reviews?.total ?? 0} total)
                        </span>
                      </span>
                    )}
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-24" />
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          {(
                            [
                              {
                                label: "Approved",
                                value: reviews?.approved ?? 0,
                                color: "text-success",
                              },
                              {
                                label: "Pending",
                                value: reviews?.pending ?? 0,
                                color: "text-warning",
                              },
                              {
                                label: "Rejected",
                                value: reviews?.rejected ?? 0,
                                color: "text-destructive",
                              },
                              {
                                label: "Total",
                                value: reviews?.total ?? 0,
                                color: "text-foreground",
                              },
                            ] as const
                          ).map((r) => (
                            <div
                              key={r.label}
                              className="text-center rounded border border-border/40 p-1.5"
                            >
                              <p
                                className={`text-base font-bold tabular-nums ${r.color}`}
                              >
                                {r.value}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                {r.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        {starBreakdown.map((s) => (
                          <div key={s.label} className="space-y-0.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                {s.label}
                              </span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {s.value}
                              </span>
                            </div>
                            <MiniBar
                              value={s.value}
                              total={totalReviewsCount || 1}
                              color="hsl(var(--warning))"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        {(reviews?.recent ?? []).length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            {t("pages.common.no_data")}
                          </p>
                        ) : (
                          (reviews?.recent ?? []).map((r) => (
                            <div key={r.id} className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-foreground">
                                  {r.doctor_name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {r.time}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-2.5 h-2.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`}
                                  />
                                ))}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {r.comment}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default HospitalAnalytics;
