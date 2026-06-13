import { useEffect, useState, type ReactNode } from "react";
import {
  X, Loader2, FileText, ClipboardList, Stethoscope, Upload, ExternalLink,
  CalendarClock, HeartPulse, AlertCircle,
} from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  usePatientMedicalRecord,
  useUpdatePatientMedicalRecord,
  usePatientVisits,
  usePatientFiles,
  useUploadPatientFile,
  type MedicalRecordUpdate,
  type FileType,
} from "@/hooks/doctor/use-doctor-patient-record";
import type { ApiError } from "@/lib/Api";
import { t } from "i18next";

interface Props {
  patientId: number | null;
  patientName?: string;
  /** Consultation id, linked to uploaded files. */
  sourceId?: number;
  /** Cancel completion entirely. */
  onClose: () => void;
  /** Record saved — continue to the booking step. */
  onSaved: () => void;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const FILE_TYPES: FileType[] = ["lab_result", "scan", "report", "prescription", "other"];

const RECORD_FIELDS: Array<{ key: keyof MedicalRecordUpdate; label: string }> = [
  { key: "chronic_conditions", label: t("consult.record.chronic_conditions") },
  { key: "known_allergies", label: t("consult.record.known_allergies") },
  { key: "current_medications", label: t("consult.record.current_medications") },
  { key: "family_history", label: t("consult.record.family_history") },
  { key: "surgical_history", label: t("consult.record.surgical_history") },
  { key: "disabilities", label: t("consult.record.disabilities") },
];

const inputCls =
  "w-full h-9 px-3 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors";
const taCls =
  "w-full px-3 py-2 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors resize-none";
const label = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

export function MedicalRecordModal({ patientId, patientName, sourceId, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<"record" | "visits" | "files">("record");
  const [form, setForm] = useState<MedicalRecordUpdate>({});
  const [loadedFor, setLoadedFor] = useState<number | null>(null);

  const { data: record, isLoading: loadingRecord } = usePatientMedicalRecord(patientId);
  const updateRecord = useUpdatePatientMedicalRecord(patientId);
  const { data: visits = [], isLoading: loadingVisits } = usePatientVisits(patientId);
  const { data: files = [], isLoading: loadingFiles } = usePatientFiles(patientId);
  const uploadFile = useUploadPatientFile(patientId);

  // Seed the form once the record loads.
  useEffect(() => {
    if (record && loadedFor !== patientId) {
      setForm({
        blood_type: record.blood_type ?? "",
        chronic_conditions: record.chronic_conditions ?? "",
        known_allergies: record.known_allergies ?? "",
        current_medications: record.current_medications ?? "",
        family_history: record.family_history ?? "",
        surgical_history: record.surgical_history ?? "",
        disabilities: record.disabilities ?? "",
      });
      setLoadedFor(patientId);
    }
  }, [record, patientId, loadedFor]);

  const set = (key: keyof MedicalRecordUpdate, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSaveContinue = () => {
    const payload: MedicalRecordUpdate = {
      blood_type: form.blood_type || null,
      chronic_conditions: form.chronic_conditions?.trim() || null,
      known_allergies: form.known_allergies?.trim() || null,
      current_medications: form.current_medications?.trim() || null,
      family_history: form.family_history?.trim() || null,
      surgical_history: form.surgical_history?.trim() || null,
      disabilities: form.disabilities?.trim() || null,
    };
    updateRecord.mutate(payload, {
      onSuccess: () => {
        toast.success(t("consult.record.saved"));
        onSaved();
      },
      onError: (err) => {
        const e = err as ApiError;
        toast.error(e?.message || t("consult.record.failed"));
      },
    });
  };

  // ── File upload form ──────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>("lab_result");
  const [fileTitle, setFileTitle] = useState("");
  const [fileNotes, setFileNotes] = useState("");

  const handleUpload = () => {
    if (!file || !fileTitle.trim()) {
      toast.error(t("consult.record.choose_file_title"));
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("file_type", fileType);
    fd.append("title", fileTitle.trim());
    if (fileNotes.trim()) fd.append("notes", fileNotes.trim());
    fd.append("visit_type", "instant_consultation");
    if (sourceId != null) fd.append("source_id", String(sourceId));

    uploadFile.mutate(fd, {
      onSuccess: () => {
        toast.success(t("consult.record.file_uploaded"));
        setFile(null);
        setFileTitle("");
        setFileNotes("");
      },
      onError: (err) => {
        const e = err as ApiError;
        toast.error(e?.message || t("consult.record.failed"));
      },
    });
  };

  const TABS: Array<{ id: typeof tab; label: string; icon: ReactNode }> = [
    { id: "record", label: t("consult.record.title"), icon: <ClipboardList className="h-3.5 w-3.5" /> },
    { id: "visits", label: t("consult.record.visits"), icon: <Stethoscope className="h-3.5 w-3.5" /> },
    { id: "files", label: t("consult.record.files"), icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-[8px] bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
              <HeartPulse className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-foreground">{t("consult.record.title")}</h2>
              <p className="text-[10px] text-muted-foreground truncate">
                {patientName || "Patient"} · {t("consult.record.required_before_completing")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-7 w-7 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 border-b border-border bg-card shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
              {t.id === "files" && files.length > 0 && (
                <span className="text-[9px] text-muted-foreground">({files.length})</span>
              )}
              {t.id === "visits" && visits.length > 0 && (
                <span className="text-[9px] text-muted-foreground">({visits.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ── Record ── */}
          {tab === "record" && (
            <div className="space-y-4">
              {loadingRecord && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("consult.record.loading")}
                </div>
              )}
              <div className="space-y-1.5">
                <label className={label}>{t("consult.record.blood_type")}</label>
                <select
                  value={form.blood_type ?? ""}
                  onChange={(e) => set("blood_type", e.target.value)}
                  className={cn(inputCls, "appearance-none")}
                >
                  <option value="">{t("consult.record.unknown")}</option>
                  {BLOOD_TYPES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              {RECORD_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className={label}>{f.label}</label>
                  <textarea
                    value={(form[f.key] as string) ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={2}
                    placeholder="—"
                    className={taCls}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Visits ── */}
          {tab === "visits" && (
            <div className="space-y-3">
              {loadingVisits && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("consult.record.loading")}
                </div>
              )}
              {!loadingVisits && visits.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-8">{t("consult.record.no_visits")}</p>
              )}
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
                  {v.chief_complaint && <p className="text-[11px] text-foreground"><span className="text-muted-foreground">{t("consult.visits.complaint")} :</span> {v.chief_complaint}</p>}
                  {v.diagnosis && <p className="text-[11px] text-foreground"><span className="text-muted-foreground">{t("consult.visits.diagnosis")} :</span> {v.diagnosis}</p>}
                  {v.treatment_plan && <p className="text-[11px] text-foreground"><span className="text-muted-foreground">{t("consult.visits.plan")} :</span> {v.treatment_plan}</p>}
                  {(v.blood_pressure || v.temperature || v.pulse_rate) && (
                    <p className="text-[10px] text-muted-foreground">
                      {[v.blood_pressure && `BP ${v.blood_pressure}`, v.temperature && `Temp ${v.temperature}`, v.pulse_rate && `Pulse ${v.pulse_rate}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {v.doctor?.user?.name && (
                    <p className="text-[10px] text-muted-foreground/70">— {v.doctor.user.name}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Files ── */}
          {tab === "files" && (
            <div className="space-y-4">
              {/* Upload */}
              <div className="rounded-[6px] border border-dashed border-border p-3 space-y-2">
                <p className={cn(label, "flex items-center gap-1.5")}><Upload className="h-3 w-3" /> {t("consult.record.upload_file")}</p>
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
                  <input value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} placeholder={t("consult.record.title")} className={inputCls} />
                </div>
                <input value={fileNotes} onChange={(e) => setFileNotes(e.target.value)} placeholder={t("consult.record.notes")} className={inputCls} />
                <button
                  onClick={handleUpload}
                  disabled={uploadFile.isPending}
                  className="h-8 px-3 rounded-[5px] bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadFile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {t("consult.record.upload")}
                </button>
              </div>

              {/* List */}
              {loadingFiles && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("consult.record.loading_files")}
                </div>
              )}
              {!loadingFiles && files.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">{t("consult.record.no_files")}</p>
              )}
              {files.map((f) => (
                <div key={f.id} className="rounded-[6px] border border-border bg-background p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{f.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {String(f.file_type).replace(/_/g, " ")}
                      {f.created_at ? ` · ${dayjs(f.created_at).format("MMM D, YYYY")}` : ""}
                    </p>
                    {f.notes && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{f.notes}</p>}
                  </div>
                  {f.file_url && (
                    <a
                      href={f.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-2.5 rounded-[5px] border border-border text-[10px] font-medium text-primary hover:bg-muted transition-colors flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" /> {t("consult.record.open")}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-muted/20 shrink-0">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {t("consult.record.saving_record")}
          </span>
          <button
            onClick={handleSaveContinue}
            disabled={updateRecord.isPending || loadingRecord}
            className="h-9 px-4 rounded-[5px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {updateRecord.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("consult.record.save_continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
