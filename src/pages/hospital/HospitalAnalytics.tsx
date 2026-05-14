import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Users, DollarSign, Activity, TrendingUp } from "lucide-react";
import { patientFlowData, revenueData, departmentData } from "@/lib/mock-data";
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

const HospitalAnalytics = () => {
  const { t } = useTranslation();
  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.analytics_title")}
          subtitle={t("pages.hospital.analytics_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Stats strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label={t("pages.hospital.stat_patients")}
                value="894"
                icon={Users}
                accent="primary"
              />
              <StatCard
                label={t("pages.hospital.stat_consultations")}
                value="729"
                icon={Activity}
                accent="info"
              />
              <StatCard
                label={t("pages.hospital.stat_revenue")}
                value="$64k"
                icon={DollarSign}
                accent="success"
              />
              <StatCard
                label={t("pages.hospital.stat_satisfaction")}
                value="4.87"
                icon={TrendingUp}
                accent="warning"
              />
            </div>

            {/* Charts grid */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Patient flow bar chart */}
              <div className="lg:col-span-2 rounded-sm border border-border/70 bg-card p-4 shadow-sm">
                <h3 className="text-[12px] font-semibold text-foreground mb-3">
                  {t("pages.hospital.patient_flow")}
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={patientFlowData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={30}
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
                      dataKey="patients"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="consultations"
                      fill="hsl(var(--primary-glow))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department pie chart */}
              <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm">
                <h3 className="text-[12px] font-semibold text-foreground mb-3">
                  {t("pages.hospital.by_department")}
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {departmentData.map((d, i) => (
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
                <div className="mt-2 space-y-1">
                  {departmentData.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="text-muted-foreground">{d.name}</span>
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">
                        {d.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue area chart */}
            <div className="rounded-sm border border-border/70 bg-card p-4 shadow-sm">
              <h3 className="text-[12px] font-semibold text-foreground mb-3">
                {t("pages.hospital.revenue_6mo")}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={30}
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
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
};

export default HospitalAnalytics;
