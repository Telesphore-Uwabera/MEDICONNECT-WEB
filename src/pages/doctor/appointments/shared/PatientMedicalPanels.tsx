import { useState } from "react";
import { Loader2, CalendarClock, Upload, ExternalLink } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import {
  usePatientMedicalRecord,
  usePatientVisits,
  usePatientFiles,
  useUploadPatientFile,
  type FileType,
  type MedicalRecord,
  type PatientVisit,
  type PatientFile,
} from "@/hooks/doctor/use-doctor-patient-record";
import type { ApiError } from "@/lib/api";
import { t } from "i18next";

const FILE_TYPES: FileType[] = ["lab_result", "scan", "report", "prescription", "other"];

const inputCls =
  "w-full h-9 px-3 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors";

export function PanelLoading({ label }: { label: string }) {
  return (
    <div className="space-y-4 py-2 animate-pulse w-full">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
        <Loader2 className="h-3 w-3 animate-spin" /> {label}
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-1/4 bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-1/3 bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-1/5 bg-muted rounded" />
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
    </div>
  );
}
export function PanelEmpty({ label }: { label: string }) {
  return <p className="text-[11px] text-muted-foreground text-center py-6">{label}</p>;
}

// ── Presentational (data passed in — reused by doctor + patient views) ─────────

export function RecordRows({ record }: { record?: MedicalRecord | null }) {
  const rows: Array<[string, string | null | undefined]> = [
    [t("consult.record.blood_type"), record?.blood_type],
    [t("consult.record.chronic_conditions"), record?.chronic_conditions],
    [t("consult.record.known_allergies"), record?.known_allergies],
    [t("consult.record.current_medications"), record?.current_medications],
    [t("consult.record.family_history"), record?.family_history],
    [t("consult.record.surgical_history"), record?.surgical_history],
    [t("consult.record.disabilities"), record?.disabilities],
  ];
  return (
    <div className="space-y-3">
      {rows.map(([label, val]) => (
        <div key={label} className="space-y-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
          {val ? (
            <RichTextRenderer value={val} className="text-[12px] text-foreground" />
          ) : (
            <p className="text-[12px] text-foreground">—</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function VisitCards({ visits }: { visits: PatientVisit[] }) {
  if (visits.length === 0) return <PanelEmpty label={t("consult.visits.empty")} />;
  return (
    <div className="space-y-3">
      {visits.map((v) => (
        <div key={v.id} className="rounded-[6px] border border-border bg-background p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              {String(v.visit_type).replace(/_/g, " ")}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {v.visited_at ? dayjs(v.visited_at).format("MMM D, YYYY") : "—"}
            </span>
          </div>
          {v.chief_complaint && <div className="text-[11px] text-foreground"><span className="text-muted-foreground">{t("consult.visits.complaint")} :</span> <RichTextRenderer value={v.chief_complaint} className="inline text-[11px] text-foreground" /></div>}
          {v.diagnosis && <div className="text-[11px] text-foreground"><span className="text-muted-foreground">{t("consult.visits.diagnosis")} :</span> <RichTextRenderer value={v.diagnosis} className="inline text-[11px] text-foreground" /></div>}
          {v.treatment_plan && <div className="text-[11px] text-foreground"><span className="text-muted-foreground">{t("consult.visits.plan")} :</span> <RichTextRenderer value={v.treatment_plan} className="inline text-[11px] text-foreground" /></div>}
          {v.recommendations && <div className="text-[11px] text-foreground"><span className="text-muted-foreground">{t("consult.visits.advice")} :</span> <RichTextRenderer value={v.recommendations} className="inline text-[11px] text-foreground" /></div>}
          {(v.blood_pressure || v.temperature || v.pulse_rate) && (
            <p className="text-[10px] text-muted-foreground">
              {[v.blood_pressure && `BP ${v.blood_pressure}`, v.temperature && `Temp ${v.temperature}`, v.pulse_rate && `Pulse ${v.pulse_rate}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {v.needs_follow_up && v.follow_up_date && (
            <p className="text-[10px] text-amber-600">{t("consult.visits.follow_up")}: {dayjs(v.follow_up_date).format("MMM D, YYYY")}{v.follow_up_notes ? ` — ${v.follow_up_notes}` : ""}</p>
          )}
          {v.doctor?.user?.name && <p className="text-[10px] text-muted-foreground/70">— {v.doctor.user.name}</p>}
        </div>
      ))}
    </div>
  );
}

export function FileRows({ files }: { files: PatientFile[] }) {
  if (files.length === 0) return <PanelEmpty label={t("consult.files.empty")} />;
  return (
    <div className="space-y-3">
      {files.map((f) => (
        <div key={f.id} className="rounded-[6px] border border-border bg-background p-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">{f.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {String(f.file_type).replace(/_/g, " ")}
              {f.created_at ? ` · ${dayjs(f.created_at).format("MMM D, YYYY")}` : ""}
            </p>
            {f.notes && <RichTextRenderer value={f.notes} className="mt-0.5 text-[10px] text-muted-foreground/80" />}
          </div>
          {f.file_url && (
            <a
              href={f.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-2.5 rounded-[5px] border border-border text-[10px] font-medium text-primary hover:bg-muted transition-colors flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="h-3 w-3" /> {t("consult.files.open")}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Doctor containers (fetch by patientId) ─────────────────────────────────────

export function MedicalRecordView({ patientId }: { patientId: number | null }) {
  const { data: record, isLoading } = usePatientMedicalRecord(patientId);
  if (isLoading) return <PanelLoading label={t("consult.record.loading_record")} />;
  return <RecordRows record={record} />;
}

export function PatientVisitsList({ patientId }: { patientId: number | null }) {
  const { data: visits = [], isLoading } = usePatientVisits(patientId);
  if (isLoading) return <PanelLoading label={t("consult.visits.loading")} />;
  return <VisitCards visits={visits} />;
}

export function PatientFilesPanel({
  patientId,
  sourceId,
  canUpload = false,
}: {
  patientId: number | null;
  sourceId?: number;
  canUpload?: boolean;
}) {
  const { data: files = [], isLoading } = usePatientFiles(patientId);
  const uploadFile = useUploadPatientFile(patientId);

  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>("lab_result");
  const [fileTitle, setFileTitle] = useState("");
  const [fileNotes, setFileNotes] = useState("");

  const handleUpload = () => {
    if (!file || !fileTitle.trim()) {
      toast.error(t("consult.files.choose_error"));
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("file_type", fileType);
    fd.append("title", fileTitle.trim());
    if (fileNotes.trim()) fd.append("notes", fileNotes.trim());
    if (sourceId != null) fd.append("source_id", String(sourceId));

    uploadFile.mutate(fd, {
      onSuccess: () => {
        toast.success(t("consult.files.uploaded"));
        setFile(null);
        setFileTitle("");
        setFileNotes("");
      },
      onError: (err) => toast.error((err as ApiError)?.message || t("consult.files.upload_failed")),
    });
  };

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="rounded-[6px] border border-dashed border-border p-3 space-y-2">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
            <Upload className="h-3 w-3" /> {t("consult.files.upload_title")}
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-[11px] text-muted-foreground file:mr-3 file:h-7 file:px-3 file:rounded-[5px] file:border-0 file:bg-primary file:text-primary-foreground file:text-[11px] file:font-medium hover:file:bg-primary/90"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={fileType} onChange={(e) => setFileType(e.target.value as FileType)} className={cn(inputCls, "appearance-none")}>
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} placeholder={t("consult.files.title_field")} className={inputCls} />
          </div>
          <input value={fileNotes} onChange={(e) => setFileNotes(e.target.value)} placeholder={t("consult.files.notes_optional")} className={inputCls} />
          <button
            onClick={handleUpload}
            disabled={uploadFile.isPending}
            className="h-8 px-3 rounded-[5px] bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {uploadFile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {t("consult.files.upload")}
          </button>
        </div>
      )}

      {isLoading ? <PanelLoading label={t("consult.files.loading")} /> : <FileRows files={files} />}
    </div>
  );
}
