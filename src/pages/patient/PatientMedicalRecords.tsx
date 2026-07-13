import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Calendar, ClipboardList, Download, FileText, HeartPulse, Loader2, Stethoscope } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { useMyMedicalRecord, useMyVisits, useMyFiles } from "@/hooks/patient/use-patient-medical-record";
import { RecordRows, VisitCards, FileRows, PanelLoading } from "@/pages/doctor/appointments/shared/PatientMedicalPanels";
import { SummaryDetails } from "@/components/consultatioRoom/SummaryDetails";
import {
  useDownloadPatientSummary,
  usePatientAppointmentSummary,
  usePatientInstantSummary,
  type SummaryLookupType,
} from "@/hooks/patient/use-patient-consultation-summary";
import type { PatientVisit } from "@/hooks/doctor/use-doctor-patient-record";

function MedicalInfoContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"visits" | "summaries">("visits");
  const record = useMyMedicalRecord();
  const visits = useMyVisits();
  const files = useMyFiles();
  const visitCount = visits.data?.length ?? 0;
  const fileCount = files.data?.length ?? 0;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[6px] border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <HeartPulse className="h-4 w-4 text-primary" /> {t("pages.patient.mr_my_record")}
              </h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {t("pages.patient.mr_profile_snapshot", "Profile")}
              </span>
            </div>
            <div className="p-5">
              {record.isLoading ? (
                <PanelLoading label={t("consult.record.loading_record")} />
              ) : !record.data ? (
                <p className="text-xs text-muted-foreground">{t("pages.patient.mr_no_record")}</p>
              ) : (
                <RecordRows record={record.data} />
              )}
            </div>
          </section>

          <section className="rounded-[6px] border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" /> {t("pages.patient.mr_files_docs")}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {fileCount}
              </span>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-5">
              {files.isLoading ? (
                <PanelLoading label={t("consult.files.loading")} />
              ) : (
                <FileRows files={files.data ?? []} />
              )}
            </div>
          </section>
        </aside>

        <section className="min-w-0 rounded-[6px] border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <ClipboardList className="h-4 w-4 text-primary" /> {t("pages.patient.mr_records_tabs_title", "Clinical history")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("pages.patient.mr_records_tabs_sub", "Review past visits and saved consultation summaries.")}
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-1 rounded-[6px] border border-border bg-background p-1 lg:w-[420px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("visits")}
                  className={`rounded-[5px] px-3 py-2 text-[12px] font-semibold transition-colors ${activeTab === "visits" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {t("pages.patient.mr_past_visits", "Past Visits")}
                  <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === "visits" ? "bg-primary-foreground/20" : "bg-muted"}`}>{visitCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("summaries")}
                  className={`rounded-[5px] px-3 py-2 text-[12px] font-semibold transition-colors ${activeTab === "summaries" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {t("pages.patient.mr_consultation_summary", "Consultation Summary")}
                </button>
              </div>
            </div>
          </div>

          <div className="p-5">
            {visits.isLoading ? (
              <PanelLoading label={t("consult.visits.loading")} />
            ) : activeTab === "visits" ? (
              <div className="max-h-[calc(100vh-310px)] min-h-[360px] overflow-y-auto pr-1">
                <VisitCards visits={visits.data ?? []} />
              </div>
            ) : (
              <ConsultationSummaryTab visits={visits.data ?? []} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
function visitSource(visit: PatientVisit) {
  const type: SummaryLookupType = String(visit.visit_type).toLowerCase().includes("instant")
    ? "instant_consultation"
    : "appointment";
  const id = Number(visit.source_id ?? visit.id);
  return {
    id: Number.isFinite(id) && id > 0 ? id : null,
    type,
  };
}

function ConsultationSummaryTab({ visits }: { visits: PatientVisit[] }) {
  const { t } = useTranslation();
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const download = useDownloadPatientSummary();

  const summaryVisits = useMemo(
    () => visits.filter((visit) => visitSource(visit).id != null),
    [visits],
  );

  useEffect(() => {
    if (selectedVisitId == null && summaryVisits.length > 0) {
      setSelectedVisitId(summaryVisits[0].id);
    }
  }, [selectedVisitId, summaryVisits]);

  const selectedVisit = summaryVisits.find((visit) => visit.id === selectedVisitId) ?? summaryVisits[0] ?? null;
  const selectedSource = selectedVisit ? visitSource(selectedVisit) : { id: null, type: "appointment" as SummaryLookupType };

  const appointmentSummary = usePatientAppointmentSummary(
    selectedSource.type === "appointment" ? selectedSource.id : null,
    selectedSource.type === "appointment",
  );
  const instantSummary = usePatientInstantSummary(
    selectedSource.type === "instant_consultation" ? selectedSource.id : null,
    selectedSource.type === "instant_consultation",
  );

  const summaryQuery = selectedSource.type === "appointment" ? appointmentSummary : instantSummary;
  const summary = summaryQuery.data?.summary ?? null;

  const downloadSummary = () => {
    if (!selectedSource.id) return;
    const id = summary?.id ?? selectedSource.id;
    download.mutate(
      { id, type: summary?.id ? undefined : selectedSource.type },
      {
        onError: (err) =>
          toast.error(err.message || t("pages.patient.mr_summary_download_failed", "Could not download consultation summary.")),
      },
    );
  };

  if (summaryVisits.length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-border bg-background p-6 text-center">
        <Stethoscope className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
        <p className="text-[12px] text-muted-foreground">
          {t("pages.patient.mr_no_summary_visits", "No consultation summaries are available yet.")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="max-h-[calc(100vh-340px)] min-h-[360px] space-y-2 overflow-y-auto pr-1">
        {summaryVisits.map((visit) => {
          const source = visitSource(visit);
          const active = selectedVisit?.id === visit.id;
          return (
            <button
              key={`${visit.visit_type}-${visit.id}`}
              type="button"
              onClick={() => setSelectedVisitId(visit.id)}
              className={`w-full rounded-[6px] border p-3 text-left transition-colors ${active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {source.type === "appointment"
                    ? t("pages.patient.mr_appointment_summary", "Appointment")
                    : t("pages.patient.mr_instant_summary", "Instant consultation")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {visit.visited_at ? dayjs(visit.visited_at).format("MMM D, YYYY") : "-"}
                </span>
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-foreground">
                {visit.doctor?.user?.name ?? t("pages.patient.mr_unknown_doctor", "Doctor")}
              </p>
              {visit.diagnosis && <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{visit.diagnosis}</p>}
            </button>
          );
        })}
      </div>

      <div className="min-w-0 overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("pages.patient.mr_consultation_summary", "Consultation Summary")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {selectedVisit?.visited_at ? dayjs(selectedVisit.visited_at).format("MMM D, YYYY") : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={downloadSummary}
            disabled={download.isPending || summaryQuery.isLoading || summaryQuery.isError}
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {download.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t("common.download", "Download")}
          </button>
        </div>

        <div className="max-h-[calc(100vh-390px)] min-h-[360px] overflow-y-auto px-5 py-4 [&_.text-sm]:text-[13px] [&_.text-sm]:leading-6 [&_img]:max-w-full [&_img]:rounded-[5px]">
          {summaryQuery.isLoading ? (
            <PanelLoading label={t("pages.patient.mr_summary_loading", "Loading consultation summary...")} />
          ) : summaryQuery.isError || !summary ? (
            <div className="rounded-[6px] border border-dashed border-border p-6 text-center">
              <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
              <p className="text-[12px] text-muted-foreground">
                {t("pages.patient.mr_summary_missing", "No consultation summary was recorded for this visit yet.")}
              </p>
            </div>
          ) : (
            <SummaryDetails summary={summary} />
          )}
        </div>
      </div>
    </div>
  );
}
export default function PatientMedicalRecords() {
  const { t } = useTranslation();

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full w-full">
        <PageHeader
          title={t("pages.patient.mr_title")}
          subtitle={t("pages.patient.mr_sub")}
        />

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          <MedicalInfoContent />
        </div>
      </div>
    </DashboardLayout>
  );
}



