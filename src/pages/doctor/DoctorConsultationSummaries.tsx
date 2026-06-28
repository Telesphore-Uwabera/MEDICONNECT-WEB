// Doctor — Consultation Summaries management page.
// Lists every consultation summary with view (expand), edit and delete.

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  ClipboardList, Loader2, AlertCircle, ChevronDown, Pencil, Trash2,
  AlertTriangle, Stethoscope, Video, CalendarClock, Search, X, Download, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import { openSummaryDocument } from "@/lib/summary-document";
import {
  useConsultationSummaries,
  useDeleteConsultationSummary,
  type ConsultationSummary,
} from "@/hooks/doctor/use-consultation-summaries";
import { EditSummaryModal } from "./appointments/shared/EditSummaryModal";
import { getErrMsg } from "./appointments/shared/helpers";

const pretty = (s: string) => s.replace(/_/g, " ");

function patientLabel(s: ConsultationSummary): string {
  const name = (s as unknown as { patient?: { name?: string; user?: { name?: string } } }).patient;
  return name?.name || name?.user?.name || `Patient #${s.patient_id}`;
}

export default function DoctorConsultationSummaries() {
  const { data, isLoading, isError, refetch } = useConsultationSummaries();
  const deleteRx = useDeleteConsultationSummary();

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<ConsultationSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConsultationSummary | null>(null);

  const summaries = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter((s) => {
      const hay = [
        patientLabel(s),
        s.chief_complaint?.main_complaint ?? "",
        s.clinical_assessment?.primary_diagnosis ?? "",
        `#${s.id}`,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [summaries, search]);

  const doDelete = (s: ConsultationSummary) => {
    deleteRx.mutate(s.id, {
      onSuccess: () => {
        toast.success("Summary deleted.");
        setConfirmDelete(null);
        if (expanded === s.id) setExpanded(null);
      },
      onError: (err) => toast.error(getErrMsg(err, "Failed to delete the summary.")),
    });
  };

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title="Consultation Summaries"
          subtitle="Clinical notes captured after appointments and instant consultations"
        />

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient, complaint, diagnosis…"
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

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading summaries…
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
              <p className="text-[12px] text-muted-foreground">Couldn’t load consultation summaries.</p>
              <button
                onClick={() => refetch()}
                className="h-8 px-3 rounded-[5px] border border-border text-[12px] font-medium hover:bg-muted"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="h-14 w-14 rounded-[8px] bg-muted/50 border border-border flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">
                {search ? "No summaries match your search" : "No consultation summaries yet"}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-[320px]">
                Summaries appear here after you complete an appointment or instant consultation.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((s) => (
                <SummaryCard
                  key={s.id}
                  summary={s}
                  expanded={expanded === s.id}
                  onToggle={() => setExpanded((cur) => (cur === s.id ? null : s.id))}
                  onEdit={() => setEditing(s)}
                  onDelete={() => setConfirmDelete(s)}
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
                <p className="text-[13px] font-semibold text-foreground">Delete this summary?</p>
                <p className="text-[11px] text-muted-foreground">
                  Summary #{confirmDelete.id} · {patientLabel(confirmDelete)}. This can’t be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-9 px-4 rounded-[5px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete(confirmDelete)}
                disabled={deleteRx.isPending}
                className="h-9 px-4 rounded-[5px] bg-destructive text-destructive-foreground text-[12px] font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteRx.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────────── */

function SummaryCard({
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
  const isInstant = s.instant_consultation_id != null;
  const alert = s.red_flag_screening?.alert_triggered;
  const diagnosis = s.clinical_assessment?.primary_diagnosis;
  const ros = s.review_of_systems ?? {};
  const activeFlags = Object.entries(s.red_flag_screening ?? {}).filter(
    ([k, v]) => v && k !== "alert_triggered",
  );

  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      {/* Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="flex-1 flex items-center gap-3 min-w-0 text-left">
          <div className="h-8 w-8 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground truncate">{patientLabel(s)}</p>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium",
                isInstant ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-600",
              )}>
                {isInstant ? <Video className="h-2.5 w-2.5" /> : <CalendarClock className="h-2.5 w-2.5" />}
                {isInstant ? "Instant" : "Appointment"}
              </span>
              {alert && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-medium text-destructive">
                  <AlertTriangle className="h-2.5 w-2.5" /> Red flag
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              #{s.id}
              {s.created_at ? ` · ${dayjs(s.created_at).format("MMM D, YYYY · HH:mm")}` : ""}
              {diagnosis ? ` · ${diagnosis}` : ""}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => openSummaryDocument(s)}
            aria-label="View document"
            title="View document"
            className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openSummaryDocument(s, true)}
            aria-label="Download PDF"
            title="Download / Print PDF"
            className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            aria-label="Edit summary"
            className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete summary"
            className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            aria-label="Toggle details"
            className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Details */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
          <Field label="Chief complaint">
            {s.chief_complaint?.main_complaint ? (
              <RichTextRenderer value={s.chief_complaint.main_complaint} className="text-[12px] text-foreground" />
            ) : (
              <Muted />
            )}
            {(s.chief_complaint?.duration_value != null) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Duration: {s.chief_complaint.duration_value} {s.chief_complaint.duration_unit ?? ""}
              </p>
            )}
          </Field>

          {s.history_of_present_illness && (
            <Field label="History of present illness">
              <p className="text-[12px] text-foreground">
                {[
                  s.history_of_present_illness.onset && `Onset: ${s.history_of_present_illness.onset}`,
                  s.history_of_present_illness.location && `Location: ${s.history_of_present_illness.location}`,
                  s.history_of_present_illness.severity != null && `Severity: ${s.history_of_present_illness.severity}/10`,
                ].filter(Boolean).join(" · ") || <Muted />}
              </p>
            </Field>
          )}

          {Object.keys(ros).length > 0 && (
            <Field label="Review of systems">
              <div className="space-y-1.5">
                {Object.entries(ros).map(([sys, list]) =>
                  (list ?? []).length ? (
                    <div key={sys} className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">
                        {pretty(sys)}:
                      </span>
                      {(list ?? []).map((sym) => (
                        <span key={sym} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {pretty(sym)}
                        </span>
                      ))}
                    </div>
                  ) : null,
                )}
              </div>
            </Field>
          )}

          {activeFlags.length > 0 && (
            <Field label="Red flags">
              <div className="flex flex-wrap gap-1.5">
                {activeFlags.map(([k]) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    <AlertTriangle className="h-2.5 w-2.5" /> {pretty(k)}
                  </span>
                ))}
              </div>
            </Field>
          )}

          {(s.clinical_assessment?.primary_diagnosis || s.clinical_assessment?.severity_classification) && (
            <Field label="Clinical assessment">
              <p className="text-[12px] text-foreground flex items-center gap-2">
                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                {s.clinical_assessment?.primary_diagnosis || "—"}
                {s.clinical_assessment?.severity_classification && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                    {s.clinical_assessment.severity_classification}
                  </span>
                )}
              </p>
            </Field>
          )}

          {s.management_plan?.followup_plan && (
            <Field label="Follow-up plan">
              <RichTextRenderer value={s.management_plan.followup_plan} className="text-[12px] text-foreground" />
            </Field>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => openSummaryDocument(s)}
              className="h-8 px-3 rounded-[5px] border border-border text-[11px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Eye className="h-3 w-3" /> View
            </button>
            <button
              onClick={() => openSummaryDocument(s, true)}
              className="h-8 px-3 rounded-[5px] border border-border text-[11px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3 w-3" /> PDF
            </button>
            <button
              onClick={onEdit}
              className="h-8 px-3 rounded-[5px] border border-border text-[11px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="h-8 px-3 rounded-[5px] border border-destructive/30 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
