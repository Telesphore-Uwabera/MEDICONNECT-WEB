// Admin — a patient's appointments + instant consultations, each with a
// read-only consultation summary viewer.

import { useState } from "react";
import {
  Loader2, AlertCircle, X, ClipboardList, Video, CalendarClock,
  FileText, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SummaryDetails } from "@/components/consultatioRoom/SummaryDetails";
import {
  useAdminPatientAppointments,
  useAdminPatientInstantConsultations,
  useAdminPatientAppointmentSummary,
  useAdminPatientInstantSummary,
  type AdminPatientVisit,
} from "@/hooks/admin/use-admin-patient-consultations";

type SummaryTarget = { kind: "appointment" | "instant"; id: number } | null;

function fmtDate(v: AdminPatientVisit): string {
  const raw = v.appointment_date || v.created_at;
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return String(raw);
  }
}

function statusTone(status?: string): string {
  switch (status) {
    case "completed": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-800/60";
    case "cancelled": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/25 dark:text-red-400 dark:border-red-800/60";
    case "in_progress": return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/25 dark:text-violet-400 dark:border-violet-800/60";
    case "confirmed": return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/25 dark:text-sky-400 dark:border-sky-800/60";
    default: return "bg-secondary/70 text-muted-foreground border-border/40";
  }
}

function VisitRow({
  visit,
  icon,
  onView,
}: {
  visit: AdminPatientVisit;
  icon: React.ReactNode;
  onView: () => void;
}) {
  const doctorName = visit.doctor?.user?.name || visit.doctor?.designations || "—";
  return (
    <button
      onClick={onView}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] border border-border/40 bg-card/60 hover:border-primary/30 hover:bg-accent/20 transition-all text-left"
    >
      <span className="h-7 w-7 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium text-foreground truncate">
          {doctorName}
          {visit.doctor?.specialization ? (
            <span className="text-muted-foreground/50"> · {visit.doctor.specialization}</span>
          ) : null}
        </p>
        <p className="text-[10px] text-muted-foreground/50">
          #{visit.id} · {fmtDate(visit)}
        </p>
      </div>
      {visit.status && (
        <span className={cn("text-[9px] px-2 py-0.5 rounded-full border font-medium capitalize", statusTone(visit.status))}>
          {String(visit.status).replace(/_/g, " ")}
        </span>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
    </button>
  );
}

function ListSection({
  title,
  loading,
  error,
  items,
  icon,
  onView,
}: {
  title: string;
  loading: boolean;
  error: boolean;
  items: AdminPatientVisit[];
  icon: React.ReactNode;
  onView: (id: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary/40">{title}</span>
        <div className="flex-1 h-px bg-primary/10" />
        {!loading && !error && <span className="text-[9px] text-muted-foreground/40">{items.length}</span>}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-6 justify-center text-[11px] text-muted-foreground/50">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 justify-center text-[11px] text-destructive/70">
          <AlertCircle className="w-3.5 h-3.5" /> Couldn’t load.
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-muted-foreground/35">None yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((v) => (
            <VisitRow key={v.id} visit={v} icon={icon} onView={() => onView(v.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PatientConsultationsTab({ patientId }: { patientId: number }) {
  const appts = useAdminPatientAppointments(patientId);
  const instants = useAdminPatientInstantConsultations(patientId);
  const [target, setTarget] = useState<SummaryTarget>(null);

  return (
    <div className="space-y-6">
      <ListSection
        title="Appointments"
        loading={appts.isLoading}
        error={appts.isError}
        items={appts.data?.data ?? []}
        icon={<CalendarClock className="w-3.5 h-3.5" />}
        onView={(id) => setTarget({ kind: "appointment", id })}
      />
      <ListSection
        title="Instant consultations"
        loading={instants.isLoading}
        error={instants.isError}
        items={instants.data?.data ?? []}
        icon={<Video className="w-3.5 h-3.5" />}
        onView={(id) => setTarget({ kind: "instant", id })}
      />

      {target && (
        <AdminSummaryModal
          patientId={patientId}
          target={target}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Summary modal ────────────────────────────────────────────────────────────

function AdminSummaryModal({
  patientId,
  target,
  onClose,
}: {
  patientId: number;
  target: { kind: "appointment" | "instant"; id: number };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-[6px] border border-border bg-card shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">Consultation summary</p>
              <p className="text-[11px] text-muted-foreground leading-tight capitalize">
                {target.kind} #{target.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SummaryBody patientId={patientId} target={target} />
        </div>
      </div>
    </div>
  );
}

function SummaryBody({
  patientId,
  target,
}: {
  patientId: number;
  target: { kind: "appointment" | "instant"; id: number };
}) {
  const apptSummary = useAdminPatientAppointmentSummary(
    patientId,
    target.id,
    target.kind === "appointment",
  );
  const instantSummary = useAdminPatientInstantSummary(
    patientId,
    target.id,
    target.kind === "instant",
  );
  const q = target.kind === "appointment" ? apptSummary : instantSummary;

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading summary…
      </div>
    );
  }
  if (q.isError || !q.data?.summary) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No consultation summary was recorded for this {target.kind}.
      </p>
    );
  }
  return <SummaryDetails summary={q.data.summary} />;
}

export default PatientConsultationsTab;
