import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  Calendar,
  Users,
  FileText,
  Activity,
  Zap,
  ZapOff,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Video,
  MapPin,
  ArrowUpRight,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  useDoctorDashboard,
  type Period,
  type ChartGroup,
} from "@/hooks/doctor/use-doctor-dashboard";

// ─── Period picker options ────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  if (value >= 1000) return `RWF${(value / 1000).toFixed(1)}k`;
  return `RWF${value.toFixed(0)}`;
}

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function shortLabel(label: string) {
  // "May 25, 2026" → "May 25"  |  "2026-01" → "Jan" etc.
  const parts = label.split(",");
  return parts[0] ?? label;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DoctorOverview = () => {
  const { t, i18n } = useTranslation();

  const {
    data,
    loading,
    error,
    filters,
    updateFilters,
    refresh,
    toggleState,
    toggleLoading,
    toggleInstantConsultation,
    togglePauseBookings,
  } = useDoctorDashboard({ period: "week", chart_group: "day" });

  // ── Derived values ──────────────────────────────────────────────────────

  const today = data?.today;
  const period = data?.period_stats;
  const revenue = data?.revenue;
  const reviews = data?.reviews;
  const prescriptions = data?.prescriptions;
  const instantStats = data?.instant;

  const patientFlowData = (data?.patient_flow ?? []).map((d) => ({
    ...d,
    day: shortLabel(d.label),
  }));

  const completionData = (data?.completion_rate ?? []).map((d) => ({
    ...d,
    day: shortLabel(d.label),
  }));

  const revenueChangePct = revenue?.change_percent ?? null;
  const revenueUp = revenueChangePct === null ? null : revenueChangePct >= 0;

  const totalRevenue = revenue?.total ?? 0;
  const onlineRevTotal = revenue?.breakdown.online.total ?? 0;
  const inPersonRevTotal = revenue?.breakdown.in_person.total ?? 0;
  const combinedRev = onlineRevTotal + inPersonRevTotal;
  const onlinePct =
    combinedRev > 0 ? Math.round((onlineRevTotal / combinedRev) * 100) : 61;
  const inPersonPct =
    combinedRev > 0 ? Math.round((inPersonRevTotal / combinedRev) * 100) : 39;

  // ── Quick stats (Today) ─────────────────────────────────────────────────

  const quickStats = [
    {
      label: "Completed",
      value: today?.completed ?? 0,
      icon: CheckCircle2,
      color: "text-success bg-success/10",
    },
    {
      label: "Pending",
      value: (today?.pending ?? 0) + (today?.confirmed ?? 0),
      icon: Clock,
      color: "text-warning bg-warning/10",
    },
    {
      label: "Cancelled",
      value: today?.cancelled ?? 0,
      icon: XCircle,
      color: "text-destructive bg-destructive/10",
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub", { date: new Date().toLocaleDateString(i18n.language, { weekday: "long", month: "long", day: "numeric" }) })}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* ── Toolbar: period picker + chart group + refresh ── */}
            <div className="flex flex-wrap items-center gap-3">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateFilters({ period: opt.value })}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                    filters.period === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/60 text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {opt.label}
                </button>
              ))}

              {/* Chart group (day / week / month) */}
              <div className="ml-auto flex items-center gap-2">
                {(["day", "week", "month"] as ChartGroup[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => updateFilters({ chart_group: g })}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs border transition-colors capitalize",
                      filters.chart_group === g
                        ? "bg-secondary text-foreground border-border"
                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g}
                  </button>
                ))}

                <button
                  onClick={refresh}
                  disabled={loading}
                  className="ml-2 p-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", loading && "animate-spin")}
                  />
                </button>
              </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
              <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* ── Toggles + today quick stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Instant Consultation toggle */}
              <div
                className={cn(
                  "rounded-md border p-4 shadow-soft flex flex-col justify-between gap-4",
                  toggleState.instant_consultation
                    ? "bg-success/5 border-success/20"
                    : "bg-card border-border/70",
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center",
                      toggleState.instant_consultation
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {toggleState.instant_consultation ? (
                      <Zap className="h-4 w-4" />
                    ) : (
                      <ZapOff className="h-4 w-4" />
                    )}
                  </div>
                  <Switch
                    checked={toggleState.instant_consultation}
                    onCheckedChange={toggleInstantConsultation}
                    disabled={toggleLoading["instant_consultation"]}
                    className="data-[state=checked]:bg-success"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("pages.doctor.instant_title")}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      toggleState.instant_consultation
                        ? "text-success"
                        : "text-muted-foreground",
                    )}
                  >
                    {toggleState.instant_consultation
                      ? t("pages.doctor.instant_visible")
                      : t("pages.doctor.instant_hidden")}
                  </p>
                </div>
              </div>

              {/* Pause Bookings toggle */}
              <div
                className={cn(
                  "rounded-md border p-4 shadow-soft flex flex-col justify-between gap-4",
                  toggleState.bookings_paused
                    ? "bg-warning/5 border-warning/20"
                    : "bg-card border-border/70",
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center",
                      toggleState.bookings_paused
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {toggleState.bookings_paused ? (
                      <PauseCircle className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                  </div>
                  <Switch
                    checked={toggleState.bookings_paused}
                    onCheckedChange={togglePauseBookings}
                    disabled={toggleLoading["bookings_paused"]}
                    className="data-[state=checked]:bg-warning"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Pause Bookings
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      toggleState.bookings_paused
                        ? "text-warning"
                        : "text-muted-foreground",
                    )}
                  >
                    {toggleState.bookings_paused
                      ? "No new bookings allowed"
                      : "Accepting bookings"}
                  </p>
                </div>
              </div>

              {/* Today quick stats */}
              {quickStats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-md border border-border/70 bg-card p-4 shadow-soft flex items-center gap-4"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0",
                        s.color,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-2xl font-bold text-foreground tabular-nums leading-none",
                          loading && "opacity-40",
                        )}
                      >
                        {s.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Today · {s.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Stats strip (period) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label={t("pages.doctor.stat_today")}
                value={today?.total ?? 0}
                icon={Calendar}
                accent="primary"
                loading={loading}
              />
              <StatCard
                label="Unique Patients"
                value={period?.unique_patients ?? 0}
                icon={Users}
                accent="info"
                loading={loading}
              />
              <StatCard
                label="Prescriptions"
                value={prescriptions?.issued ?? 0}
                icon={FileText}
                accent="success"
                loading={loading}
              />
              <StatCard
                label="Instant Queue"
                value={instantStats?.current_queue ?? 0}
                icon={Activity}
                accent="warning"
                loading={loading}
              />
            </div>

            {/* ── Main grid ── */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Patient flow chart */}
              <div className="lg:col-span-2 rounded-md border border-border/70 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("pages.doctor.patient_flow")}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                      Patients
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full bg-info inline-block" />
                      Consults
                    </span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                  </div>
                ) : patientFlowData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    No data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={patientFlowData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        width={24}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "5px 8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="patients"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 2.5 }}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="consultations"
                        stroke="hsl(var(--info))"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 3"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Period summary card */}
              <div className="rounded-md border border-border/70 bg-card p-5 shadow-soft flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Period Summary
                </h3>

                {[
                  {
                    label: "Total Appointments",
                    value: period?.total_appointments ?? 0,
                  },
                  { label: "Completed", value: period?.completed ?? 0 },
                  { label: "Pending", value: period?.pending ?? 0 },
                  { label: "Cancelled", value: period?.cancelled ?? 0 },
                  { label: "Online", value: period?.online_count ?? 0 },
                  { label: "In-person", value: period?.in_person_count ?? 0 },
                  {
                    label: "Avg Duration",
                    value: period?.avg_duration_minutes
                      ? `${period.avg_duration_minutes}m`
                      : "—",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <span className="text-xs text-muted-foreground">
                      {row.label}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold text-foreground tabular-nums",
                        loading && "opacity-40",
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}

                {/* Instant stats */}
                {instantStats && (
                  <div className="mt-2 pt-3 border-t border-border/40">
                    <p className="text-sm font-semibold text-foreground mb-3">
                      Instant Consultations
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Total", value: instantStats.total },
                        { label: "Done", value: instantStats.completed },
                        { label: "Queue", value: instantStats.current_queue },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-md bg-secondary/40 px-3 py-2 text-center"
                        >
                          <p
                            className={cn(
                              "text-base font-bold tabular-nums",
                              loading && "opacity-40",
                            )}
                          >
                            {s.value}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Bottom row ── */}
            <div className="grid lg:grid-cols-3 gap-4 mt-1">
              {/* Completion rate bar chart */}
              <div className="rounded-md border border-border/70 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Appointment Completion
                  </h3>
                  {/* Show trend only when we have data */}
                  {completionData.length > 0 &&
                    (() => {
                      const avg =
                        completionData.reduce((s, d) => s + d.rate, 0) /
                        completionData.length;
                      return (
                        <span className="text-xs font-semibold text-muted-foreground">
                          avg {avg.toFixed(0)}%
                        </span>
                      );
                    })()}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Completion rate · {filters.period}
                </p>
                {loading ? (
                  <div className="h-[110px] flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                  </div>
                ) : completionData.length === 0 ? (
                  <div className="h-[110px] flex items-center justify-center text-sm text-muted-foreground">
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={completionData} barSize={18}>
                      <XAxis
                        dataKey="day"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 4,
                          fontSize: 10,
                          padding: "4px 8px",
                        }}
                        formatter={(v: number) => [`${v}%`, "Rate"]}
                      />
                      {completionData.map((entry, i) => (
                        <Bar key={i} dataKey="rate" radius={[3, 3, 0, 0]}>
                          <Cell
                            key={i}
                            fill={
                              entry.rate >= 90
                                ? "hsl(var(--success))"
                                : entry.rate >= 60
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--warning))"
                            }
                            fillOpacity={0.85}
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Rating & reviews */}
              <div className="rounded-md border border-border/70 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Recent Reviews
                  </h3>
                  {reviews?.all_time_avg != null && (
                    <div className="flex items-center gap-1.5 bg-warning/10 px-2.5 py-1 rounded-md">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="text-sm font-bold text-foreground">
                        {reviews.all_time_avg.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {reviews?.recent && reviews.recent.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.recent.map((r, i) => (
                      <div
                        key={r.id ?? i}
                        className="flex items-start gap-3 p-3 rounded-md bg-secondary/30 border border-border/20"
                      >
                        <div className="h-8 w-8 rounded-md bg-primary-soft text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {r.patient_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {r.patient_name}
                            </p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {new Date(r.created_at).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                className={cn(
                                  "h-3 w-3",
                                  j < r.rating
                                    ? "fill-warning text-warning"
                                    : "text-border",
                                )}
                              />
                            ))}
                          </div>
                          {r.comment && (
                            <p className="text-xs text-muted-foreground mt-1.5 truncate">
                              {r.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[100px] gap-2">
                    <Star className="h-6 w-6 text-border" />
                    <p className="text-sm text-muted-foreground">
                      No reviews yet
                    </p>
                    {reviews?.period.avg_rating != null && (
                      <p className="text-xs text-muted-foreground">
                        Period avg: {reviews.period.avg_rating.toFixed(1)}★
                      </p>
                    )}
                  </div>
                )}

                {/* Star breakdown mini-bars */}
                {reviews && reviews.period.total > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                    {[
                      { label: "5★", value: reviews.period.five_star },
                      { label: "4★", value: reviews.period.four_star },
                      { label: "3★", value: reviews.period.three_star },
                      { label: "1-2★", value: reviews.period.low_star },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-8">
                          {row.label}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-warning/70"
                            style={{
                              width: `${(row.value / reviews.period.total) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-4 text-right">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Revenue summary */}
              <div className="rounded-md border border-border/70 bg-card p-5 shadow-soft flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Revenue · {filters.period}
                  </h3>
                  {revenueChangePct !== null && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs font-semibold",
                        revenueUp ? "text-success" : "text-destructive",
                      )}
                    >
                      {revenueUp ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatPct(revenueChangePct)}
                    </span>
                  )}
                </div>

                <div>
                  <p
                    className={cn(
                      "text-3xl font-bold text-foreground tabular-nums leading-none",
                      loading && "opacity-40",
                    )}
                  >
                    {formatCurrency(totalRevenue)}
                  </p>
                  {revenue && revenue.previous_period_total > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      vs {formatCurrency(revenue.previous_period_total)} prev
                      period
                    </p>
                  )}
                </div>

                <div className="space-y-3 mt-auto">
                  {[
                    {
                      label: "Video / Online",
                      value: formatCurrency(onlineRevTotal),
                      count: String(revenue?.breakdown.online.count ?? 0),
                      pct: onlinePct,
                    },
                    {
                      label: "In-person",
                      value: formatCurrency(inPersonRevTotal),
                      count: String(revenue?.breakdown.in_person.count ?? 0),
                      pct: inPersonPct,
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">
                          {row.label}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {row.value}
                          <span className="text-muted-foreground font-normal ml-1">
                            ({row.count})
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Avg per consultation
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold text-foreground",
                      loading && "opacity-40",
                    )}
                  >
                    {formatCurrency(revenue?.avg_per_appointment ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default DoctorOverview;
