import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { adminStats, useAdminUsers } from "@/lib/admin-store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const roleIcon = {
  doctor: Stethoscope,
  hospital: Hospital,
  pharmacy: Pill,
  patient: User,
} as const;

const roleColor = {
  doctor:   "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  hospital: "bg-primary/10 text-primary",
  pharmacy: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  patient:  "bg-warning/10 text-warning",
} as const;

const statusStyle = {
  active:   { bg: "bg-success/10 text-success border-success/20",   dot: "bg-success" },
  pending:  { bg: "bg-warning/10 text-warning border-warning/20",   dot: "bg-warning" },
  rejected: { bg: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  inactive: { bg: "bg-muted text-muted-foreground border-border",   dot: "bg-muted-foreground/40" },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = false,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-3.5 flex items-center gap-3 shadow-sm">
      <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center shrink-0", accent ? "bg-primary/10" : "bg-muted")}>
        <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest truncate">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums leading-tight", accent ? "text-primary" : "text-foreground")}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
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

/** Mini bar — percentage fill */
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

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminOverview = () => {
  const { t } = useTranslation();
  const users = useAdminUsers();
  const stats = adminStats();

  const recent = [...users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const total = stats.total || 1;

  // Status distribution
  const statusCounts = users.reduce(
    (acc, u) => { acc[u.status as keyof typeof acc] = (acc[u.status as keyof typeof acc] ?? 0) + 1; return acc; },
    { active: 0, pending: 0, rejected: 0, inactive: 0 } as Record<string, number>,
  );

  // Role distribution with percentages
  const roleEntries = (Object.keys(stats.byRole) as Array<keyof typeof stats.byRole>).map((r) => ({
    role: r,
    count: stats.byRole[r],
    pct: Math.round((stats.byRole[r] / total) * 100),
  }));

  // Mock activity trend (last 7 days) — replace with real data
  const activityData = [42, 58, 51, 73, 65, 88, 76];
  const activityMax = Math.max(...activityData);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Approval rate
  const approvalRate = total > 0
    ? Math.round(((statusCounts.active ?? 0) / total) * 100)
    : 0;

  // Prescriptions mock — replace with real store
  const rxStats = { total: 1240, pending: 87, dispensed: 948, expired: 45 };

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("admin.overview.title")}
        subtitle={t("admin.overview.subtitle")}
      />

      <div className="p-5 space-y-5">

        {/* ── Row 1: KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label={t("admin.overview.total_users")}
            value={stats.total}
            icon={Users}
            sub={`${approvalRate}% approval rate`}
            accent
          />
          <KpiCard
            label={t("admin.overview.pending_approvals")}
            value={stats.pending}
            icon={UserCheck}
            sub="Awaiting review"
          />
          <KpiCard
            label={t("admin.overview.active_users")}
            value={stats.active}
            icon={Activity}
            sub={`of ${stats.total} total`}
          />
          <KpiCard
            label={t("admin.overview.open_flags")}
            value={stats.openFlags}
            icon={ShieldAlert}
            sub="Needs attention"
          />
        </div>

        {/* ── Row 2: Role breakdown + Activity chart + Status distribution ── */}
        <div className="grid lg:grid-cols-3 gap-3">

          {/* Role breakdown */}
          <div className="rounded-sm border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Users by role" href="/admin/users" linkLabel="Manage" />
            <div className="grid grid-cols-2 gap-2 mb-4">
              {roleEntries.map(({ role, count, pct }) => {
                const Icon = roleIcon[role];
                return (
                  <div key={role} className="rounded-sm border border-border bg-muted/30 p-2.5">
                    <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center mb-2", roleColor[role])}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[18px] font-bold tabular-nums text-foreground leading-none">{count}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 capitalize">{t(`admin.roles.${role}`)}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <MiniBar pct={pct} className={
                        role === "doctor" ? "bg-blue-500" :
                        role === "hospital" ? "bg-primary" :
                        role === "pharmacy" ? "bg-violet-500" : "bg-warning"
                      } />
                      <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity chart (7-day logins) */}
          <div className="rounded-sm border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Logins — last 7 days" />
            <div className="flex items-end gap-1.5 h-24 mt-1">
              {activityData.map((v, i) => {
                const h = Math.round((v / activityMax) * 100);
                const isToday = i === activityData.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{v}</span>
                    <div
                      className={cn(
                        "w-full rounded-sm transition-all duration-500",
                        isToday ? "bg-primary" : "bg-primary/30",
                      )}
                      style={{ height: `${h}%`, minHeight: 4 }}
                    />
                    <span className={cn("text-[9px]", isToday ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {days[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-1.5 rounded-sm border border-border bg-muted/40 px-2.5 py-1.5">
              <TrendingUp className="h-3 w-3 text-success shrink-0" />
              <span className="text-[10px] text-foreground font-medium">+14% vs last week</span>
            </div>
          </div>

          {/* Status distribution */}
          <div className="rounded-sm border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Account status" />
            <div className="space-y-2">
              {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => {
                const pct = Math.round((count / total) * 100);
                const style = statusStyle[status as keyof typeof statusStyle] ?? statusStyle.inactive;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
                    <span className="text-[11px] text-foreground capitalize flex-1">{status}</span>
                    <MiniBar pct={pct} className={
                      status === "active" ? "bg-success" :
                      status === "pending" ? "bg-warning" :
                      status === "rejected" ? "bg-destructive" : "bg-muted-foreground/40"
                    } />
                    <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Approval rate ring-like display */}
            <div className="mt-3 rounded-sm border border-border bg-muted/40 px-2.5 py-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Approval rate</p>
                <p className="text-[18px] font-bold text-foreground tabular-nums leading-tight">{approvalRate}%</p>
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
          </div>
        </div>

        {/* ── Row 3: Prescriptions + Recent signups ── */}
        <div className="grid lg:grid-cols-3 gap-3">

          {/* Prescription analytics */}
          <div className="rounded-sm border border-border bg-card p-3.5 shadow-sm">
            <SectionHeader title="Prescriptions" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total issued", value: rxStats.total, icon: ClipboardList, color: "text-foreground bg-muted" },
                { label: "Pending",      value: rxStats.pending, icon: Clock,         color: "text-warning bg-warning/10" },
                { label: "Dispensed",    value: rxStats.dispensed, icon: CheckCircle2, color: "text-success bg-success/10" },
                { label: "Expired",      value: rxStats.expired, icon: XCircle,       color: "text-destructive bg-destructive/10" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-sm border border-border bg-muted/30 p-2.5">
                  <div className={cn("w-6 h-6 rounded-sm flex items-center justify-center mb-1.5", color)}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <p className="text-[16px] font-bold tabular-nums text-foreground leading-none">{value.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Dispense rate bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Dispense rate</span>
                <span className="text-[10px] font-semibold text-foreground">
                  {Math.round((rxStats.dispensed / rxStats.total) * 100)}%
                </span>
              </div>
              <MiniBar pct={Math.round((rxStats.dispensed / rxStats.total) * 100)} className="bg-success" />
            </div>
          </div>

          {/* Recent signups */}
          <div className="rounded-sm border border-border bg-card p-3.5 shadow-sm lg:col-span-2">
            <SectionHeader title="Recent signups" href="/admin/approvals" linkLabel="View all" />
            <ul className="divide-y divide-border">
              {recent.map((u) => {
                const Icon = roleIcon[u.role as keyof typeof roleIcon] ?? User;
                const style = statusStyle[u.status as keyof typeof statusStyle] ?? statusStyle.inactive;
                return (
                  <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    {/* Role icon */}
                    <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center shrink-0", roleColor[u.role as keyof typeof roleColor] ?? "bg-muted text-muted-foreground")}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {t(`admin.roles.${u.role}`)} · {u.email}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border shrink-0",
                      style.bg,
                    )}>
                      <span className={cn("w-1 h-1 rounded-full", style.dot)} />
                      {t(`admin.status.${u.status}`)}
                    </span>

                    {/* Quick action */}
                    {u.status === "pending" && (
                      <Link to={`/admin/approvals?id=${u.id}`}>
                        <button className="text-[10px] font-medium text-primary hover:underline shrink-0">
                          Review
                        </button>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ── Row 4: Quick actions ── */}
        <div className="rounded-sm border border-border bg-card p-3.5 shadow-sm">
          <SectionHeader title="Quick actions" />
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Manage users",     href: "/admin/users",     icon: Users },
              { label: "Pending approvals", href: "/admin/approvals", icon: UserCheck },
              { label: "Flagged accounts",  href: "/admin/flags",     icon: ShieldAlert },
              { label: "System reports",    href: "/admin/reports",   icon: BarChart3 },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} to={href}>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border bg-muted/40 hover:border-primary/40 hover:bg-primary/5 text-[11px] font-medium text-foreground transition-all">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  {label}
                </button>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminOverview;
