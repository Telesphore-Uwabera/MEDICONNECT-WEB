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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { appointments, patientFlowData } from "@/lib/mock-data";
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

// ─── Mock extras ─────────────────────────────────────────────────────────────

const completionData = [
  { day: "Mon", rate: 88 },
  { day: "Tue", rate: 92 },
  { day: "Wed", rate: 78 },
  { day: "Thu", rate: 95 },
  { day: "Fri", rate: 85 },
  { day: "Sat", rate: 70 },
  { day: "Sun", rate: 60 },
];

const recentReviews = [
  {
    name: "Sarah K",
    rating: 5,
    comment: "Very thorough and caring",
    time: "2h ago",
  },
  {
    name: "John M",
    rating: 4,
    comment: "Professional and prompt",
    time: "5h ago",
  },
  {
    name: "Amina T",
    rating: 5,
    comment: "Excellent consultation",
    time: "1d ago",
  },
];

const quickStats = [
  {
    label: "Completed",
    value: 4,
    icon: CheckCircle2,
    color: "text-success bg-success/10",
  },
  {
    label: "Pending",
    value: 2,
    icon: Clock,
    color: "text-warning bg-warning/10",
  },
  {
    label: "Cancelled",
    value: 1,
    icon: XCircle,
    color: "text-destructive bg-destructive/10",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const DoctorOverview = () => {
  const { t } = useTranslation();
  const [instant, setInstant] = useState(true);

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* ── Instant toggle + today quick stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {/* Instant toggle */}
              <div
                className={cn(
                  "sm:col-span-1 rounded-md border p-3 shadow-soft flex flex-col justify-between gap-3",
                  instant
                    ? "bg-success/5 border-success/20"
                    : "bg-card border-border/70",
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "h-7 w-7 rounded flex items-center justify-center",
                      instant
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {instant ? (
                      <Zap className="h-3.5 w-3.5" />
                    ) : (
                      <ZapOff className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <Switch
                    checked={instant}
                    onCheckedChange={setInstant}
                    className="data-[state=checked]:bg-success scale-90"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">
                    {t("pages.doctor.instant_title")}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5",
                      instant ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {instant
                      ? t("pages.doctor.instant_visible")
                      : t("pages.doctor.instant_hidden")}
                  </p>
                </div>
              </div>

              {/* Today quick stats */}
              {quickStats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="rounded-md border border-border/70 bg-card p-3 shadow-soft flex items-center gap-3"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded flex items-center justify-center flex-shrink-0",
                        s.color,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[18px] font-bold text-foreground tabular-nums leading-none">
                        {s.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Today · {s.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label={t("pages.doctor.stat_today")}
                value={6}
                icon={Calendar}
                accent="primary"
              />
              <StatCard
                label={t("pages.doctor.stat_week")}
                value={42}
                icon={Users}
                accent="info"
              />
              <StatCard
                label={t("pages.doctor.stat_rx")}
                value={18}
                icon={FileText}
                accent="success"
              />
              <StatCard
                label={t("pages.doctor.stat_instant")}
                value={9}
                icon={Activity}
                accent="warning"
              />
            </div>

            {/* ── Main grid ── */}
            <div className="grid lg:grid-cols-3 gap-3">
              {/* Patient flow chart */}
              <div className="lg:col-span-2 rounded-md border border-border/70 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-foreground">
                    {t("pages.doctor.patient_flow")}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                      Patients
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-info inline-block" />
                      Consults
                    </span>
                  </div>
                </div>
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
              </div>

              {/* Today schedule */}
              <div className="rounded-md border border-border/70 bg-card p-4 shadow-soft flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-foreground">
                    {t("pages.doctor.today_schedule")}
                  </h3>
                  <span className="text-[9px] text-primary font-medium cursor-pointer hover:underline">
                    View all
                  </span>
                </div>
                <div className="space-y-1.5 flex-1">
                  {appointments.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 px-2.5 py-2 rounded bg-secondary/40 border border-border/30 hover:bg-secondary/70 transition-colors duration-150 group"
                    >
                      <span className="text-[10px] font-mono font-bold tabular-nums text-primary w-9 flex-shrink-0">
                        {a.time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-foreground truncate">
                          {t("pages.doctor.patient")} · {a.specialty}
                        </p>
                        <p className="text-[9px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                          {a.type === "video" ? (
                            <Video className="h-2.5 w-2.5" />
                          ) : (
                            <MapPin className="h-2.5 w-2.5" />
                          )}
                          {a.type}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bottom row ── */}
            <div className="grid lg:grid-cols-3 gap-3">
              {/* Completion rate bar chart */}
              <div className="rounded-md border border-border/70 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[11px] font-semibold text-foreground">
                    Appointment Completion
                  </h3>
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-success">
                    <TrendingUp className="h-3 w-3" />
                    +4%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Weekly completion rate
                </p>
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
                              : entry.rate >= 75
                                ? "hsl(var(--primary))"
                                : "hsl(var(--warning))"
                          }
                          fillOpacity={0.85}
                        />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Rating & reviews */}
              <div className="rounded-md border border-border/70 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-foreground">
                    Recent Reviews
                  </h3>
                  <div className="flex items-center gap-1 bg-warning/10 px-2 py-0.5 rounded">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="text-[11px] font-bold text-foreground">
                      4.8
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {recentReviews.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded bg-secondary/30 border border-border/20"
                    >
                      <div className="h-6 w-6 rounded bg-primary-soft text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                        {r.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-semibold text-foreground">
                            {r.name}
                          </p>
                          <span className="text-[9px] text-muted-foreground flex-shrink-0">
                            {r.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star
                              key={j}
                              className={cn(
                                "h-2.5 w-2.5",
                                j < r.rating
                                  ? "fill-warning text-warning"
                                  : "text-border",
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                          {r.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue summary */}
              <div className="rounded-md border border-border/70 bg-card p-4 shadow-soft flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold text-foreground">
                    Revenue This Month
                  </h3>
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-success">
                    <TrendingUp className="h-3 w-3" />
                    +12%
                  </span>
                </div>

                <div>
                  <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">
                    $3,240
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    vs $2,890 last month
                  </p>
                </div>

                <div className="space-y-2 mt-auto">
                  {[
                    {
                      label: "Video consults",
                      value: "$1,980",
                      count: "22",
                      pct: 61,
                    },
                    {
                      label: "In-person visits",
                      value: "$1,260",
                      count: "14",
                      pct: 39,
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">
                          {row.label}
                        </span>
                        <span className="text-[10px] font-semibold text-foreground">
                          {row.value}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Avg per consultation
                  </span>
                  <span className="text-[11px] font-bold text-foreground">
                    $89
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
