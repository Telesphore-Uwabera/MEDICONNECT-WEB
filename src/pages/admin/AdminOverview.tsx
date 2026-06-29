import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import {
  Users,
  UserCheck,
  Activity,
  ShieldAlert,
  ArrowRight,
  Stethoscope,
  Hospital,
  Pill,
  User,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Search,
  CalendarDays,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import {
  useGetAdminDashboard,
  type AdminDashboardFilters,
} from "@/hooks/admin/use-admin-overview";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const roleIcon = {
  doctors: Stethoscope,
  hospitals: Hospital,
  pharmacies: Pill,
  patients: User,
} as const;

const roleColor = {
  doctors: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  hospitals: "bg-primary/10 text-primary",
  pharmacies: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  patients: "bg-warning/10 text-warning",
} as const;

const roleBarColor = {
  doctors: "bg-blue-500",
  hospitals: "bg-primary",
  pharmacies: "bg-violet-500",
  patients: "bg-warning",
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = false,
  loading = false,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card p-3.5 flex items-center gap-3 shadow-sm">
      <div className={cn("w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0", accent ? "bg-primary/10" : "bg-muted")}>
        <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest truncate">{label}</p>
        {loading ? (
          <div className="h-7 w-16 rounded bg-muted animate-pulse mt-0.5" />
        ) : (
          <p className={cn("text-sm font-bold tabular-nums leading-tight", accent ? "text-primary" : "text-foreground")}>{value}</p>
        )}
        {sub && !loading && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {href && linkLabel && (
        <Link to={href}>
          <button className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline">
            {linkLabel} <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </Link>
      )}
    </div>
  );
}

function MiniBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className="h-1 rounded-full bg-muted overflow-hidden flex-1">
      <div
        className={cn("h-full rounded-full transition-all duration-500", className ?? "bg-primary")}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("rounded bg-muted animate-pulse", className)} />;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-[6px] border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 flex items-center gap-2 text-[11px] text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  onChange,
}: {
  filters: AdminDashboardFilters;
  onChange: (f: AdminDashboardFilters) => void;
}) {
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="flex items-end justify-between flex-wrap gap-3 rounded-[6px] border border-border bg-card px-3.5 py-3 shadow-sm w-full">
      {/* Left: filter inputs */}
      <div className="flex items-end flex-wrap gap-3 flex-1 min-w-0">

        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Name, phone, invoice…"
              value={filters.q ?? ""}
              onChange={(e) => onChange({ ...filters, q: e.target.value || undefined })}
              className="pl-6 pr-3 h-8 text-[11px] rounded-[6px] border border-border bg-muted/40 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full"
            />
          </div>
        </div>

        {/* Exact date */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Exact date
          </label>
          <div className="relative">
            <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="date"
              value={filters.date ?? ""}
              onChange={(e) =>
                onChange({ ...filters, date: e.target.value || undefined, date_from: undefined, date_to: undefined })
              }
              className="pl-6 pr-3 h-8 text-[11px] rounded-[6px] border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full"
            />
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-1 flex-[2] min-w-0">
          <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Date range
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filters.date_from ?? ""}
              onChange={(e) =>
                onChange({ ...filters, date_from: e.target.value || undefined, date: undefined })
              }
              className="px-2 h-8 text-[11px] rounded-[6px] border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">→</span>
            <input
              type="date"
              value={filters.date_to ?? ""}
              onChange={(e) =>
                onChange({ ...filters, date_to: e.target.value || undefined, date: undefined })
              }
              className="px-2 h-8 text-[11px] rounded-[6px] border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full"
            />
          </div>
        </div>

      </div>

      {/* Right: clear button */}
      <button
        onClick={() => onChange({})}
        disabled={!hasFilters}
        className={cn(
          "flex items-center gap-1 h-8 px-2.5 rounded-[6px] border text-[10px] font-medium transition-all",
          hasFilters
            ? "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
            : "border-transparent text-muted-foreground/30 cursor-not-allowed",
        )}
      >
        <XCircle className="h-3 w-3" />
        Clear filters
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminOverview = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<AdminDashboardFilters>({});

  const { data: response, isLoading, isError } = useGetAdminDashboard(filters);
  const data = response?.data;

  // Derived values — safe-fallback to 0 while loading
  const users = data?.users;
  const appointments = data?.appointments;
  const payments = data?.payments;
  const certificates = data?.certificates;
  const consultations = data?.quick_consultations;

  const totalUsers = users?.total || 1;

  const approvalRate = users
    ? Math.round(((users.patients + users.doctors + users.pharmacies) / totalUsers) * 100)
    : 0;

  const roleEntries = users
    ? ([
      { key: "patients", count: users.patients },
      { key: "doctors", count: users.doctors },
      { key: "pharmacies", count: users.pharmacies },
    ] as const).map(({ key, count }) => ({
      key,
      count,
      pct: Math.round((count / totalUsers) * 100),
    }))
    : [];

  const rxTotal = payments ? parseInt(payments.total_revenue, 10) || 0 : 0;
  const rxToday = payments ? parseInt(payments.revenue_today, 10) || 0 : 0;
  const currency = payments?.currency ?? "RWF";
  const dispenseRate = rxTotal > 0 ? Math.round((rxToday / rxTotal) * 100) : 0;

  // Certificate totals
  const certTotal = certificates ? (certificates.approved + certificates.pending) : 0;
  const certApprovalRate = certTotal > 0
    ? Math.round((certificates!.approved / certTotal) * 100)
    : 0;

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("admin.overview.title")}
        subtitle={t("admin.overview.subtitle")}
      />

      <div className="p-5 space-y-5">

        {/* ── Filters ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FilterBar filters={filters} onChange={setFilters} />
          {isLoading && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </div>
          )}
        </div>

        {isError && <ErrorBanner message="Failed to load dashboard data. Please try again." />}

        {/* ── Row 1: KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label={t("admin.overview.total_users")}
            value={users?.total ?? 0}
            icon={Users}
            sub={`${approvalRate}% approval rate`}
            accent
            loading={isLoading}
          />
          <KpiCard
            label="Pending appointments"
            value={appointments?.pending ?? 0}
            icon={UserCheck}
            sub={appointments ? `${appointments.today} today` : undefined}
            loading={isLoading}
          />
          <KpiCard
            label={t("admin.overview.active_users")}
            value={consultations?.active ?? 0}
            icon={Activity}
            sub="Active consultations"
            loading={isLoading}
          />
          <KpiCard
            label="Open certificates"
            value={certificates?.pending ?? 0}
            icon={ShieldAlert}
            sub="Awaiting approval"
            loading={isLoading}
          />
        </div>

        {/* ── Row 2: Role breakdown + Appointments + Certificates ── */}
        <div className="grid lg:grid-cols-3 gap-3">

          {/* Role breakdown */}
          <div className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Users by role" href="/admin/users" linkLabel="Manage" />
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {roleEntries.map(({ key, count, pct }) => {
                  const Icon = roleIcon[key];
                  return (
                    <div key={key} className="rounded-[6px] border border-border bg-muted/30 p-2.5">
                      <div className={cn("w-7 h-7 rounded-[6px] flex items-center justify-center mb-2", roleColor[key])}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm font-bold tabular-nums text-foreground leading-none">{count}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 capitalize">
                        {t(`admin.roles.${key.slice(0, -1)}`) /* patients→patient etc */}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <MiniBar pct={pct} className={roleBarColor[key]} />
                        <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total users summary */}
            {!isLoading && users && (
              <div className="rounded-[6px] border border-border bg-muted/40 px-2.5 py-2 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Total registered</p>
                  <p className="text-sm font-bold text-foreground tabular-nums leading-tight">{users.total}</p>
                </div>
                <div className="relative w-10 h-10">
                  <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${approvalRate * 0.879} 87.9`}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-700"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Appointments" href="/admin/appointments" linkLabel="View all" />
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-14" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "Total", value: appointments?.total ?? 0, icon: ClipboardList, color: "text-foreground bg-muted" },
                  { label: "Today", value: appointments?.today ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10" },
                  { label: "Pending", value: appointments?.pending ?? 0, icon: Clock, color: "text-warning bg-warning/10" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-[6px] border border-border bg-muted/30 p-2.5 flex items-center gap-3">
                    <div className={cn("w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0", color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold tabular-nums text-foreground leading-none">{value.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificates */}
          <div className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Certificates" />
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => <SkeletonBlock key={i} className="h-14" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Approved", value: certificates?.approved ?? 0, icon: CheckCircle2, color: "text-success bg-success/10" },
                    { label: "Pending", value: certificates?.pending ?? 0, icon: Clock, color: "text-warning bg-warning/10" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-[6px] border border-border bg-muted/30 p-2.5">
                      <div className={cn("w-6 h-6 rounded-[6px] flex items-center justify-center mb-1.5", color)}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <p className="text-sm font-bold tabular-nums text-foreground leading-none">{value.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Approval rate</span>
                    <span className="text-[10px] font-semibold text-foreground">{certApprovalRate}%</span>
                  </div>
                  <MiniBar pct={certApprovalRate} className="bg-success" />
                </div>

                {/* Active consultations callout */}
                <div className="mt-3 rounded-[6px] border border-border bg-muted/40 px-2.5 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Active consultations</p>
                    <p className="text-sm font-bold text-foreground tabular-nums leading-tight">
                      {consultations?.active ?? 0}
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-primary/40" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Row 3: Revenue ── */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Revenue" />
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-12" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total revenue", value: `${currency} ${Number(payments?.total_revenue ?? 0).toLocaleString()}`, icon: ClipboardList, color: "text-foreground bg-muted" },
                    { label: "Today's revenue", value: `${currency} ${Number(payments?.revenue_today ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-primary bg-primary/10" },
                    { label: "Pending payments", value: payments?.pending_count ?? 0, icon: Clock, color: "text-warning bg-warning/10" },
                    { label: "Currency", value: currency, icon: XCircle, color: "text-muted-foreground bg-muted" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-[6px] border border-border bg-muted/30 p-2.5">
                      <div className={cn("w-6 h-6 rounded-[6px] flex items-center justify-center mb-1.5", color)}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <p className="text-[13px] font-bold tabular-nums text-foreground leading-none break-all">{String(value)}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Today vs total</span>
                    <span className="text-[10px] font-semibold text-foreground">{dispenseRate}%</span>
                  </div>
                  <MiniBar pct={dispenseRate} className="bg-primary" />
                </div>
              </>
            )}
          </div>

          {/* Quick actions — span remaining 2 cols */}
          <div className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm lg:col-span-2">
            <SectionHeader title="Quick actions" />
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Manage users", href: "/admin/users", icon: Users },
                { label: "Pending approvals", href: "/admin/approvals", icon: UserCheck },
                { label: "Flagged accounts", href: "/admin/flags", icon: ShieldAlert },
                { label: "System reports", href: "/admin/reports", icon: BarChart3 },
                { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
              ].map(({ label, href, icon: Icon }) => (
                <Link key={href} to={href}>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-border bg-muted/40 hover:border-primary/40 hover:bg-primary/5 text-[11px] font-medium text-foreground transition-all">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    {label}
                  </button>
                </Link>
              ))}
            </div>

            {/* Applied filters summary */}
            {response?.filters_applied && Object.values(response.filters_applied).some(Boolean) && (
              <div className="mt-3 rounded-[6px] border border-primary/20 bg-primary/5 px-2.5 py-2">
                <p className="text-[10px] text-primary font-medium mb-1">Filters active</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(response.filters_applied).map(([k, v]) =>
                    v ? (
                      <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-[6px] bg-primary/10 text-primary border border-primary/20">
                        {k}: {v}
                      </span>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminOverview;
