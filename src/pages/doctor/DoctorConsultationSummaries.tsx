// Doctor — Consultation Summaries management page.
// Summaries are grouped by patient: each patient row expands to reveal their
// individual summaries, and each summary can expand further to show full detail.

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ClipboardList, Loader2, AlertCircle, ChevronDown, Pencil, Trash2,
  AlertTriangle, Stethoscope, Video, CalendarClock, Search, X, Download, Eye, User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import { openSummaryDocument } from "@/lib/summary-document";
import { usePublicSettings } from "@/hooks/use-public-settings";
import {
  useConsultationSummaries,
  useDeleteConsultationSummary,
  useDownloadConsultationSummary,
  summaryFieldText,
  summaryHasRedFlagAlert,
  summaryRedFlagList,
  type ConsultationSummary,
  type PatientSummaryGroup,
} from "@/hooks/doctor/use-consultation-summaries";
import { EditSummaryModal } from "./appointments/shared/EditSummaryModal";
import { getErrMsg } from "./appointments/shared/helpers";

const pretty = (s: string) => s.replace(/_/g, " ");

function patientLabel(
  group: PatientSummaryGroup,
  t?: (key: string, options?: Record<string, unknown>) => string,
): string {
  return group.patient?.name || (t ? t("pages.doctor.patient_number", { id: group.patient?.id }) : `Patient #${group.patient?.id}`);
}

export default function DoctorConsultationSummaries() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useConsultationSummaries();
  const deleteRx = useDeleteConsultationSummary();

  const [search, setSearch] = useState("");
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<number | null>(null);
  const [editing, setEditing] = useState<ConsultationSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConsultationSummary | null>(null);

  const groups = data?.data ?? [];
  const stats = data?.stats;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => {
        const summaries = group.summaries.filter((s) => {
          const hay = [
            patientLabel(group, t),
            summaryFieldText(s.chief_complaint, "main_complaint"),
            summaryFieldText(s.clinical_assessment, "primary_diagnosis"),
            `#${s.id}`,
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
        return { ...group, summaries, summaries_count: summaries.length };
      })
      .filter((group) => group.summaries.length > 0);
  }, [groups, search, t]);

  const doDelete = (s: ConsultationSummary) => {
    deleteRx.mutate(s.id, {
      onSuccess: () => {
        toast.success(t("pages.doctor.summary_deleted"));
        setConfirmDelete(null);
        if (expandedSummary === s.id) setExpandedSummary(null);
        refetch();
      },
      onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary_delete_failed"))),
    });
  };

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.consultation_summaries_title")}
          subtitle={t("pages.doctor.consultation_summaries_subtitle")}
        />

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Search */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative max-w-md flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("pages.doctor.search_patient_complaint_diagnosis")}
                className="w-full h-9 rounded-[6px] border border-border bg-background pl-8 pr-8 text-[12px] outline-none focus:border-primary/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {stats && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{t("pages.doctor.total_patients", { count: stats.total_patients })}</span>
                <span>{t("pages.doctor.total_summaries", { count: stats.total_summaries })}</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("pages.doctor.loading_summaries")}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
              <p className="text-[12px] text-muted-foreground">{t("pages.doctor.summaries_load_failed")}</p>
              <button
                onClick={() => refetch()}
                className="h-8 px-3 rounded-[5px] border border-border text-[12px] font-medium hover:bg-muted"
              >
                {t("pages.doctor.retry")}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="h-14 w-14 rounded-[8px] bg-muted/50 border border-border flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">
                {search ? t("pages.doctor.no_summaries_match") : t("pages.doctor.no_summaries_yet")}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-[320px]">
                {t("pages.doctor.summaries_empty_desc")}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((group) => (
                <PatientGroupCard
                  key={group.patient.id}
                  group={group}
                  expanded={expandedPatient === group.patient.id}
                  onToggle={() =>
                    setExpandedPatient((cur) => (cur === group.patient.id ? null : group.patient.id))
                  }
                  expandedSummary={expandedSummary}
                  onToggleSummary={(id) => setExpandedSummary((cur) => (cur === id ? null : id))}
                  onEdit={setEditing}
                  onDelete={setConfirmDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditSummaryModal
          summary={editing}
          onClose={() => setEditing(null)}
          onSaved={() => refetch()}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[6px] bg-card border border-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-[6px] bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{t("pages.doctor.delete_summary_title")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("pages.doctor.delete_summary_desc", {
                    id: confirmDelete.id,
                    patient: confirmDelete.patient?.name ?? t("pages.doctor.patient_number", { id: confirmDelete.patient_id }),
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-4 rounded-[5px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => doDelete(confirmDelete)}
                disabled={deleteRx.isPending}
                className="h-9 px-4 rounded-[5px] bg-destructive text-destructive-foreground text-[12px] font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteRx.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("pages.doctor.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── Patient group ────────────────────────────────────────────────────────── */

function PatientGroupCard({
  group,
  expanded,
  onToggle,
  expandedSummary,
  onToggleSummary,
  onEdit,
  onDelete,
}: {
  group: PatientSummaryGroup;
  expanded: boolean;
  onToggle: () => void;
  expandedSummary: number | null;
  onToggleSummary: (id: number) => void;
  onEdit: (summary: ConsultationSummary) => void;
  onDelete: (summary: ConsultationSummary) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden hover:bg-muted hover:text-foreground">
      {/* Patient row */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="h-8 w-8 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground truncate">{patientLabel(group, t)}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t("pages.doctor.summaries_count", { count: group.summaries_count })}
            </span>
          </div>
          {group.patient?.email && (
            <p className="text-[11px] text-muted-foreground truncate">{group.patient.email}</p>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>

      {/* Summaries for this patient */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {group.summaries.map((summary) => (
            <SummaryRow
              key={summary.id}
              summary={summary}
              expanded={expandedSummary === summary.id}
              onToggle={() => onToggleSummary(summary.id)}
              onEdit={() => onEdit(summary)}
              onDelete={() => onDelete(summary)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual summary ──────────────────────────────────────────────────── */

function SummaryRow({
  summary: s,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  summary: ConsultationSummary;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { data: publicSettings } = usePublicSettings();
  const isInstant = s.instant_consultation_id != null;
  const alert = summaryHasRedFlagAlert(s.red_flag_screening);
  const activeFlags = summaryRedFlagList(s.red_flag_screening);
  const chiefComplaint = summaryFieldText(s.chief_complaint, "main_complaint");
  const hpi = summaryFieldText(s.history_of_present_illness);
  const reviewOfSystems = summaryFieldText(s.review_of_systems);
  const pastMedicalHistory = summaryFieldText(s.past_medical_history);
  const medicationHistory = summaryFieldText(s.medication_history);
  const allergyHistory = summaryFieldText(s.allergy_history);
  const clinicalAssessment = summaryFieldText(s.clinical_assessment, "primary_diagnosis");
  const managementPlan = summaryFieldText(s.management_plan, "followup_plan");
  const downloadSummary = useDownloadConsultationSummary();
  const isDownloading = downloadSummary.isPending && downloadSummary.variables?.id === s.id;
  const handleDownloadPdf = () => {
    downloadSummary.mutate(
      { id: s.id, type: "summary", filename: `consultation-summary-${s.id}.pdf` },
      {
        onError: (err) =>
          toast.error(
            getErrMsg(
              err,
              t("pages.doctor.summary_pdf_download_failed", "Could not download the consultation summary PDF."),
            ),
          ),
      },
    );
  };
  return (
    <div className="bg-background/40 hover:bg-muted hover:text-foreground">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex-1 flex items-center hover:bg-muted hover:text-foreground gap-2 min-w-0 text-left">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium shrink-0",
            isInstant ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-600",
          )}>
            {isInstant ? <Video className="h-2.5 w-2.5" /> : <CalendarClock className="h-2.5 w-2.5" />}
            {isInstant ? t("pages.doctor.instant") : t("pages.doctor.appointment")}
          </span>
          {alert && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-medium text-destructive shrink-0">
              <AlertTriangle className="h-2.5 w-2.5" /> {t("pages.doctor.red_flag")}
            </span>
          )}
          <p className="text-[12px] text-muted-foreground truncate mt-4">
            {chiefComplaint ? (
              <RichTextRenderer value={chiefComplaint} className="inline text-[12px] text-muted-foreground" />
            ) : (
              <Muted />
            )}
          </p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => openSummaryDocument(s, false, publicSettings)} aria-label={t("pages.doctor.view_document")} title={t("pages.doctor.view_document")} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground transition-colors">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDownloadPdf} disabled={isDownloading} aria-label={t("pages.doctor.download_pdf")} title={t("pages.doctor.download_pdf")} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50">
            {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onEdit} aria-label={t("pages.doctor.edit_summary")} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} aria-label={t("pages.doctor.delete_summary")} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onToggle} aria-label={t("pages.doctor.toggle_details")} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
          <RichField label={t("pages.doctor.chief_complaint")} value={chiefComplaint} />
          <RichField label={t("pages.doctor.history_present_illness")} value={hpi} />
          <RichField label={t("pages.doctor.review_of_systems")} value={reviewOfSystems} />
          <RichField label={t("pages.doctor.summary.past_medical_history", "Past medical history")} value={pastMedicalHistory} />
          <RichField label={t("pages.doctor.summary.medication_history", "Medication history")} value={medicationHistory} />
          <RichField label={t("pages.doctor.summary.allergy_history", "Allergy history")} value={allergyHistory} />

          {activeFlags.length > 0 && (
            <Field label={t("pages.doctor.red_flags")}>
              <div className="flex flex-wrap gap-1.5">
                {activeFlags.map((flag) => (
                  <span key={flag} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    <AlertTriangle className="h-2.5 w-2.5" /> {pretty(flag)}
                  </span>
                ))}
              </div>
            </Field>
          )}

          {clinicalAssessment && (
            <Field label={t("pages.doctor.clinical_assessment")}>
              <div className="flex items-start gap-2">
                <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <RichTextRenderer value={clinicalAssessment} className="text-[12px] text-foreground" />
              </div>
            </Field>
          )}

          <RichField label={t("pages.doctor.follow_up_plan")} value={managementPlan} />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => openSummaryDocument(s, false, publicSettings)} className="h-8 px-3 rounded-[5px] border border-border text-[11px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5">
              <Eye className="h-3 w-3" /> {t("pages.doctor.view")}
            </button>
            <button onClick={handleDownloadPdf} disabled={isDownloading} className="h-8 px-3 rounded-[5px] border border-border text-[11px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-50">
              {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} {t("pages.doctor.pdf")}
            </button>
            <button onClick={onEdit} className="h-8 px-3 rounded-[5px] bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
              <Pencil className="h-3 w-3" /> {t("pages.doctor.edit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RichField({ label, value }: { label: string; value: string }) {
  return value ? (
    <Field label={label}>
      <RichTextRenderer value={value} className="text-[12px] text-foreground" />
    </Field>
  ) : null;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Muted() {
  return <span className="text-[12px] text-muted-foreground/60">—</span>;
}
