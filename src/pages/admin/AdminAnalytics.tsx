import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Users, Calendar, Activity, DollarSign, AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useGetAdminDashboard } from "@/hooks/admin/use-admin-overview";

const AdminAnalytics = () => {
  const { t, i18n } = useTranslation();
  const { data: response, isLoading, isError, error, refetch, isFetching } = useGetAdminDashboard({}, { live: true });
  const dashboard = response?.data;
  const currency = dashboard?.payments.currency || "RWF";
  const totalRevenue = Number(dashboard?.payments.total_revenue ?? 0) || 0;
  const revenueToday = Number(dashboard?.payments.revenue_today ?? 0) || 0;

  const roleData = [
    { name: t("admin.roles.doctor"), value: dashboard?.users.doctors ?? 0, color: "hsl(172 76% 36%)" },
    { name: t("admin.roles.hospital"), value: dashboard?.users.hospitals ?? 0, color: "hsl(168 76% 50%)" },
    { name: t("admin.roles.pharmacy"), value: dashboard?.users.pharmacies ?? 0, color: "hsl(199 89% 48%)" },
    { name: t("admin.roles.patient"), value: dashboard?.users.patients ?? 0, color: "hsl(215 35% 45%)" },
  ];
  const appointmentData = [
    { name: t("admin.analytics.appointments_total"), value: dashboard?.appointments.total ?? 0 },
    { name: t("admin.analytics.appointments_today"), value: dashboard?.appointments.today ?? 0 },
    { name: t("admin.analytics.appointments_pending"), value: dashboard?.appointments.pending ?? 0 },
  ];
  const revenueData = [
    { name: t("admin.analytics.revenue_total"), value: totalRevenue },
    { name: t("admin.analytics.revenue_today"), value: revenueToday },
  ];
  const formatMoney = (amount: number) =>
    `${currency} ${new Intl.NumberFormat(i18n.language).format(amount)}`;

  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("admin.analytics.title")} subtitle={t("admin.analytics.subtitle")} />
      <div className="p-8 space-y-8">
        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-[6px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error instanceof Error ? error.message : t("common.error")}</span>
            <button onClick={() => refetch()} disabled={isFetching} className="font-semibold underline underline-offset-2 disabled:opacity-50">
              {t("common.retry")}
            </button>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label={t("admin.analytics.total_users")} value={isError ? "—" : isLoading ? "…" : dashboard?.users.total ?? 0} icon={Users} />
          <StatCard label={t("admin.analytics.appointments")} value={isError ? "—" : isLoading ? "…" : dashboard?.appointments.total ?? 0} icon={Calendar} accent="info" />
          <StatCard label={t("admin.analytics.active_consultations")} value={isError ? "—" : isLoading ? "…" : dashboard?.quick_consultations.active ?? 0} icon={Activity} accent="success" />
          <StatCard label={t("admin.analytics.revenue")} value={isError ? "—" : isLoading ? "…" : formatMoney(totalRevenue)} icon={DollarSign} accent="warning" />
        </div>

        {!isError && dashboard && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("admin.analytics.role_distribution")}</CardTitle></CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                    {roleData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.analytics.operational_summary")}</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">{t("admin.analytics.revenue_summary")}</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>
        )}
        {isLoading && <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>}
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
