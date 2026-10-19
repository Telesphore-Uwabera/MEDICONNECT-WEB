import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, FileText, FolderOpen, HeartPulse, Pill, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TablePager, paginateRows, tablePageCount } from "@/components/TablePager";
import { Badge } from "@/components/ui/badge";
import { useMyFiles, useMyVisits } from "@/hooks/patient/use-patient-medical-record";
import { useGetPatientPrescriptions } from "@/hooks/patient/use-patient-prescriptions";
import { useGetPatientCertificates } from "@/hooks/patient/use-patient-certificates";
import { listFrom } from "@/lib/list-payload";
import { formatDateOnly } from "@/lib/date";

type HubRow = {
  id: string;
  kind: "visit" | "prescription" | "certificate" | "file";
  title: string;
  detail: string;
  date?: string | null;
  href: string;
};

export default function PatientDocuments() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const visits = useMyVisits();
  const files = useMyFiles();
  const prescriptions = useGetPatientPrescriptions();
  const certificates = useGetPatientCertificates();

  const visitRows = visits.data ?? [];
  const fileRows = files.data ?? [];
  const rxRows = listFrom(prescriptions.data, "prescriptions");
  const certRows = listFrom(certificates.data, "certificates");

  const rows = useMemo<HubRow[]>(() => {
    const items: HubRow[] = [
      ...visitRows.map((visit) => ({
        id: `visit-${visit.id}`,
        kind: "visit" as const,
        title: visit.diagnosis || visit.chief_complaint || t("pages.patient.documents_visit"),
        detail: visit.visit_type || t("pages.patient.mr_title"),
        date: visit.visited_at,
        href: "/patient/medical-records",
      })),
      ...rxRows.map((rx) => ({
        id: `rx-${rx.id}`,
        kind: "prescription" as const,
        title: rx.prescription_number || t("pages.patient.documents_prescription"),
        detail: rx.diagnosis || rx.status || "",
        date: rx.created_at,
        href: "/patient/prescriptions",
      })),
      ...certRows.map((cert) => ({
        id: `cert-${cert.id}`,
        kind: "certificate" as const,
        title: cert.certificate_number || cert.purpose || t("pages.patient.documents_certificate"),
        detail: cert.status,
        date: cert.created_at,
        href: "/patient/fitness-certificates",
      })),
      ...fileRows.map((file) => ({
        id: `file-${file.id}`,
        kind: "file" as const,
        title: file.title || t("pages.patient.documents_file"),
        detail: file.file_type || "",
        date: file.created_at,
        href: "/patient/medical-records",
      })),
    ];
    return items.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  }, [certRows, fileRows, rxRows, t, visitRows]);

  const paged = paginateRows(rows, page);
  const lastPage = tablePageCount(rows.length);

  return (
    <DashboardLayout role="patient">
      <div className="flex h-full w-full flex-col">
        <PageHeader
          title={t("pages.patient.documents_title")}
          subtitle={t("pages.patient.documents_sub")}
        />
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t("pages.patient.documents_visits")} value={visitRows.length} icon={ClipboardList} />
            <StatCard label={t("sidebar.prescriptions")} value={rxRows.length} icon={Pill} accent="info" />
            <StatCard label={t("sidebar.fitnessCertificates")} value={certRows.length} icon={ShieldCheck} accent="success" />
            <StatCard label={t("pages.patient.mr_files_docs")} value={fileRows.length} icon={FolderOpen} accent="warning" />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { to: "/patient/medical-records", label: t("sidebar.medicalRecords"), icon: HeartPulse },
              { to: "/patient/prescriptions", label: t("sidebar.prescriptions"), icon: Pill },
              { to: "/patient/fitness-certificates", label: t("sidebar.fitnessCertificates"), icon: ShieldCheck },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-border/70 bg-card px-3 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            ))}
          </div>

          <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
            <div className="border-b border-border/60 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                {t("pages.patient.documents_history")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("pages.patient.documents_history_sub")}</p>
            </div>
            {visits.isLoading || prescriptions.isLoading || certificates.isLoading || files.isLoading ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.patient.documents_loading")}</p>
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.patient.documents_empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{t("pages.patient.documents_col_item")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.patient.documents_col_type")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.patient.documents_col_date")}</th>
                      <th className="px-5 py-3 font-semibold">{t("pages.patient.documents_col_open")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row) => (
                      <tr key={row.id} className="border-t border-border/50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{row.title}</p>
                          <p className="text-xs text-muted-foreground">{row.detail}</p>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant="secondary" className="rounded-[6px] capitalize">
                            {t(`pages.patient.documents_kind_${row.kind}`)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{row.date ? formatDateOnly(row.date) : "—"}</td>
                        <td className="px-5 py-3">
                          <Link to={row.href} className="text-xs font-semibold text-primary hover:underline">
                            {t("pages.patient.view_all")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePager
                  page={page}
                  lastPage={lastPage}
                  total={rows.length}
                  onPageChange={setPage}
                  className="border-t border-border/60 px-5 py-3"
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
