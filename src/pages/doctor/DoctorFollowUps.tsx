import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, FileText, Stethoscope } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TablePager, paginateRows, tablePageCount } from "@/components/TablePager";
import { Badge } from "@/components/ui/badge";
import { useGetPrescriptions } from "@/hooks/doctor/use-doctor-prescriptions";
import {
  summaryFieldText,
  useConsultationSummaries,
  type ConsultationSummary,
} from "@/hooks/doctor/use-consultation-summaries";
import { useGetAppointments } from "@/hooks/doctor/use-doctor-appointment";
import { formatDateOnly } from "@/lib/date";

type FollowRow = {
  id: string;
  title: string;
  patient: string;
  reason: string;
  href: string;
  date?: string | null;
};

function followupText(summary: ConsultationSummary) {
  const plan = summary.management_plan;
  if (plan && typeof plan === "object" && "followup_plan" in plan) {
    return String((plan as { followup_plan?: string | null }).followup_plan || "");
  }
  return summaryFieldText(plan);
}

export default function DoctorFollowUps() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const unsigned = useGetPrescriptions({ is_signed: false, per_page: 50, page: 1 });
  const drafts = useGetPrescriptions({ status: "draft", per_page: 50, page: 1 });
  const summaries = useConsultationSummaries();
  const pending = useGetAppointments({ status: "pending", per_page: 50, page: 1 });

  const unsignedRows = unsigned.data?.data ?? [];
  const draftRows = drafts.data?.data ?? [];
  const pendingRows = pending.data?.data ?? [];
  const summaryGroups = summaries.data?.data ?? [];

  const incompleteSummaries = useMemo(
    () =>
      summaryGroups.flatMap((group) =>
        (group.summaries ?? []).filter((summary) => !followupText(summary).trim()),
      ),
    [summaryGroups],
  );

  const rows = useMemo<FollowRow[]>(() => {
    const seen = new Set<number>();
    const rx = [...unsignedRows, ...draftRows].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return [
      ...rx.map((item) => ({
        id: `rx-${item.id}`,
        title: item.prescription_number || t("sidebar.prescriptions"),
        patient: item.patient?.name || "—",
        reason: item.is_signed ? t("pages.doctor.followup_draft_rx") : t("pages.doctor.followup_unsigned_rx"),
        href: "/doctor/prescriptions",
        date: item.created_at,
      })),
      ...incompleteSummaries.map((summary) => ({
        id: `sum-${summary.id}`,
        title: t("pages.doctor.followup_missing_plan"),
        patient: summary.patient?.name || "—",
        reason: t("pages.doctor.follow_up_plan"),
        href: "/doctor/consultation-summaries",
        date: summary.updated_at || summary.created_at,
      })),
      ...pendingRows.map((appt) => ({
        id: `apt-${appt.id}`,
        title: t("pages.doctor.followup_pending_appt"),
        patient: appt.patient?.name || "—",
        reason: appt.status,
        href: "/doctor/appointments",
        date: appt.appointment_date,
      })),
    ].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  }, [draftRows, incompleteSummaries, pendingRows, t, unsignedRows]);

  const paged = paginateRows(rows, page);
  const lastPage = tablePageCount(rows.length);

  return (
    <DashboardLayout role="doctor">
      <div className="flex h-full w-full flex-col">
        <PageHeader title={t("pages.doctor.followups_title")} subtitle={t("pages.doctor.followups_sub")} />
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t("pages.doctor.followup_unsigned_rx")} value={unsignedRows.length} icon={FileText} accent="warning" />
            <StatCard label={t("pages.doctor.followup_missing_plan")} value={incompleteSummaries.length} icon={Stethoscope} />
            <StatCard label={t("pages.doctor.followup_pending_appt")} value={pendingRows.length} icon={ClipboardList} accent="info" />
          </div>

          <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
            {unsigned.isLoading || summaries.isLoading || pending.isLoading ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.doctor.loading")}</p>
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.doctor.followups_empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.consult_col_patient")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.consult_col_complaint")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.consult_col_date")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.doctor.consult_col_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row) => (
                      <tr key={row.id} className="border-t border-border/50">
                        <td className="px-5 py-3 font-medium">{row.patient}</td>
                        <td className="px-5 py-3">
                          <p>{row.title}</p>
                          <Badge variant="secondary" className="mt-1 rounded-[6px]">{row.reason}</Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{row.date ? formatDateOnly(row.date) : "—"}</td>
                        <td className="px-5 py-3">
                          <Link to={row.href} className="text-xs font-semibold text-primary hover:underline">
                            {t("pages.doctor.view")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePager page={page} lastPage={lastPage} total={rows.length} onPageChange={setPage} className="border-t border-border/60 px-5 py-3" />
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
