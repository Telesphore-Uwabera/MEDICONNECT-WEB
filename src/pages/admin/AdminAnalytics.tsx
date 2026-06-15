import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Users, Calendar, FileText, Package } from "lucide-react";
import { adminStats } from "@/lib/admin-store";
import { revenueData } from "@/lib/mock-data";
import { DashboardLayout } from "@/components/DashboardLayout";

const signupTrend = [
  { month: "Nov", signups: 38, appts: 240 },
  { month: "Dec", signups: 45, appts: 280 },
  { month: "Jan", signups: 52, appts: 320 },
  { month: "Feb", signups: 49, appts: 305 },
  { month: "Mar", signups: 71, appts: 410 },
  { month: "Apr", signups: 88, appts: 478 },
];

const AdminAnalytics = () => {
  const { t, i18n } = useTranslation();
  const stats = adminStats();
  const roleData = [
    { name: t("admin.roles.doctor"), value: stats.byRole.doctor, color: "hsl(172 76% 36%)" },
    { name: t("admin.roles.hospital"), value: stats.byRole.hospital, color: "hsl(168 76% 50%)" },
    { name: t("admin.roles.pharmacy"), value: stats.byRole.pharmacy, color: "hsl(199 89% 48%)" },
    { name: t("admin.roles.patient"), value: stats.byRole.patient, color: "hsl(215 35% 45%)" },
  ];

  return (
    <DashboardLayout role="admin">
      <PageHeader title={t("admin.analytics.title")} subtitle={t("admin.analytics.subtitle")} />
      <div className="p-8 space-y-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard label={t("admin.analytics.signups")} value="+88" delta="+24%" trend="up" icon={Users} />
          <StatCard label={t("admin.analytics.appointments")} value="478" delta="+16%" trend="up" icon={Calendar} accent="info" />
          <StatCard label={t("admin.analytics.prescriptions")} value="312" delta="+9%" trend="up" icon={FileText} accent="success" />
          <StatCard label={t("admin.analytics.orders")} value="194" delta="-3%" trend="down" icon={Package} accent="warning" />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">{t("admin.analytics.growth")}</CardTitle></CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signupTrend}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#g1)" />
                  <Area type="monotone" dataKey="appts" stroke="hsl(199 89% 48%)" fill="hsl(199 89% 48% / 0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.analytics.revenue")}</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
