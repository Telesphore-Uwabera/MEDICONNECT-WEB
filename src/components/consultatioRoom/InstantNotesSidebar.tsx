import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, FileText, X, Check, Loader2, User } from "lucide-react";
import {
  useSaveInstantNotes,
  useAddNotes,
  useUpdateNotes,
  useGetAppointment,
} from "@/hooks/doctor/use-doctor-appointment";
import {
  summaryFieldText,
  useConsultationSummaries,
  useCreateConsultationSummary,
  useUpdateConsultationSummary,
  type ConsultationSummary,
} from "@/hooks/doctor/use-consultation-summaries";
import { usePatientMedicalRecord } from "@/hooks/doctor/use-doctor-patient-record";
import { useDebounce } from "@/hooks/use-debounce";
import type { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  chartToAppointmentNotes,
  chartToInstantNotesText,
  chartToSummaryFields,
  emptyCallChart,
  parseCallChart,
  parseIdentityFromHtml,
  parseProofsFromHtml,
  parseVitalsFromExamination,
  readCallChart,
  resolvedPatientId,
  writeCallChart,
  type CallChart,
  type PatientIdentity,
} from "@/lib/call-note-form";

interface Props {
  onClose: () => void;
  consultationId?: number;
  instantConsultationId?: number | null;
  patientId?: number | null;
  patientName?: string;
  patientPhone?: string;
  mode?: "instant" | "appointment";
  variant?: "call" | "page";
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  dark,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  dark?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className={cn("text-[10px] font-semibold uppercase tracking-wide", dark ? "text-white/55" : "text-muted-foreground")}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-[6px] border px-2.5 py-1.5 text-[12px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/40",
          dark
            ? "border-white/15 bg-white/[0.07] text-white placeholder:text-white/35"
            : "border-border bg-background text-foreground placeholder:text-muted-foreground/50",
        )}
      />
    </label>
  );
}

function MiniInput({
  label,
  value,
  onChange,
  placeholder,
  dark,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  dark?: boolean;
  type?: string;
}) {
  return (
    <label className="block space-y-1 min-w-0">
      <span className={cn("text-[9px]", dark ? "text-white/50" : "text-muted-foreground")}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-[6px] border px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40",
          dark
            ? "border-white/15 bg-white/[0.07] text-white placeholder:text-white/35"
            : "border-border bg-background text-foreground placeholder:text-muted-foreground/50",
        )}
      />
    </label>
  );
}

function summaryRows(payload: unknown): ConsultationSummary[] {
  const data = (payload as { data?: unknown })?.data;
  if (Array.isArray(data) && data.every((item) => Array.isArray((item as { summaries?: unknown }).summaries))) {
    return (data as Array<{ summaries?: ConsultationSummary[] }>).flatMap((item) => item.summaries ?? []);
  }
  if (Array.isArray(data)) return data as ConsultationSummary[];
  return [];
}

export function InstantNotesSidebar({
  onClose,
  consultationId,
  instantConsultationId,
  patientId,
  patientName,
  patientPhone,
  mode = "instant",
  variant = "call",
}: Props) {
  const { t } = useTranslation();
  const dark = variant === "call";
  const isAppointment = mode === "appointment";
  const summaryInstantId = instantConsultationId ?? (!isAppointment ? consultationId : undefined);

  const saveInstant = useSaveInstantNotes();
  const addApptNotes = useAddNotes();
  const updateApptNotes = useUpdateNotes();
  const createSummary = useCreateConsultationSummary();
  const updateSummary = useUpdateConsultationSummary();
  const { data: apptData } = useGetAppointment(isAppointment ? (consultationId ?? 0) : 0);
  const { data: existingList } = useConsultationSummaries(
    isAppointment
      ? { appointment_id: consultationId }
      : { instant_consultation_id: summaryInstantId },
    { enabled: (isAppointment ? consultationId : summaryInstantId) != null },
  );

  const [chart, setChart] = useState<CallChart>(() => readCallChart(consultationId, mode));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [identityOpen, setIdentityOpen] = useState(() => {
    const initial = readCallChart(consultationId, mode);
    return !initial.identity.full_name.trim() || !initial.identity.phone.trim();
  });

  const notesExistRef = useRef(false);
  const summaryIdRef = useRef<number | null>(null);
  const creatingSummaryRef = useRef(false);
  const dirtyRef = useRef(false);

  const effectivePatientId = resolvedPatientId(chart, patientId ?? apptData?.appointment?.patient?.id ?? null);
  const { data: medicalRecord } = usePatientMedicalRecord(effectivePatientId);

  useEffect(() => {
    setChart(readCallChart(consultationId, mode));
    setSaveStatus("idle");
    notesExistRef.current = false;
    summaryIdRef.current = null;
    creatingSummaryRef.current = false;
    dirtyRef.current = false;
  }, [consultationId, mode]);

  useEffect(() => {
    const match = summaryRows(existingList).find((row) =>
      isAppointment
        ? row.appointment_id === consultationId
        : row.instant_consultation_id === summaryInstantId || row.instant_consultation_id === consultationId,
    );
    if (match?.id) summaryIdRef.current = match.id;
  }, [existingList, consultationId, isAppointment, summaryInstantId]);

  useEffect(() => {
    if (dirtyRef.current) return;
    const appt = apptData?.appointment;
    const match = summaryRows(existingList).find((row) =>
      isAppointment
        ? row.appointment_id === consultationId
        : row.instant_consultation_id === summaryInstantId || row.instant_consultation_id === consultationId,
    );
    setChart((prev) => {
      const next = { ...prev, identity: { ...prev.identity }, proofs: prev.proofs ?? [] };
      const fill = (key: keyof PatientIdentity, value?: string | number | null) => {
        if (!String(next.identity[key] ?? "").trim() && value != null && String(value).trim()) {
          next.identity[key] = String(value);
        }
      };
      fill("patient_id", patientId ?? appt?.patient?.id);
      fill("full_name", patientName || appt?.patient?.name || match?.patient?.name);
      fill("phone", patientPhone || appt?.patient?.phone);
      fill("national_id", (appt?.patient as { national_id?: string } | undefined)?.national_id);
      if (match) {
        if (!next.chief_complaint.trim()) next.chief_complaint = summaryFieldText(match.chief_complaint, "main_complaint");
        if (!next.medication_history.trim()) next.medication_history = summaryFieldText(match.medication_history);
        if (!next.allergy_history.trim()) next.allergy_history = summaryFieldText(match.allergy_history);
        if (!next.clinical_assessment.trim()) next.clinical_assessment = summaryFieldText(match.clinical_assessment, "primary_diagnosis");
        if (!next.management_plan.trim()) next.management_plan = summaryFieldText(match.management_plan, "followup_plan");
        if (!next.blood_pressure.trim() && !next.temperature.trim() && !next.pulse_rate.trim()) {
          Object.assign(next, parseVitalsFromExamination(summaryFieldText(match.physical_examination)));
        }
        const fromAttach = parseIdentityFromHtml(summaryFieldText(match.attachments));
        (Object.keys(fromAttach) as Array<keyof PatientIdentity>).forEach((key) => fill(key, fromAttach[key]));
        if (!next.proofs?.length) next.proofs = parseProofsFromHtml(summaryFieldText(match.attachments));
      }
      if (appt?.notes) {
        if (!next.chief_complaint.trim()) next.chief_complaint = appt.notes.chief_complaint ?? "";
        if (!next.clinical_assessment.trim()) next.clinical_assessment = appt.notes.diagnosis ?? "";
        if (!next.management_plan.trim()) next.management_plan = appt.notes.treatment_plan ?? "";
        if (!next.blood_pressure.trim()) next.blood_pressure = appt.notes.blood_pressure ?? "";
        if (!next.temperature.trim()) next.temperature = appt.notes.temperature ?? "";
        if (!next.pulse_rate.trim()) next.pulse_rate = appt.notes.pulse_rate ?? "";
        if (appt.notes) notesExistRef.current = true;
      }
      if (medicalRecord) {
        if (!next.allergy_history.trim()) next.allergy_history = medicalRecord.known_allergies ?? "";
        if (!next.medication_history.trim()) next.medication_history = medicalRecord.current_medications ?? "";
      }
      return next;
    });
  }, [apptData, existingList, isAppointment, consultationId, summaryInstantId, patientId, patientName, patientPhone, medicalRecord]);

  const snapshot = JSON.stringify(chart);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const debouncedSnapshot = useDebounce(snapshot, 1500);
  const missingOfficialId = resolvedPatientId(parseCallChart(debouncedSnapshot), effectivePatientId) == null;

  const persistChart = useCallback(async (raw: string) => {
    if (!dirtyRef.current) return;
    if (consultationId == null) return;
    const next = parseCallChart(raw);
    const stored = readCallChart(consultationId, mode);
    if (stored.proofs?.length) next.proofs = stored.proofs;
    writeCallChart(consultationId, mode, next);
    setSaveStatus("saving");

    const fields = chartToSummaryFields(next);
    const pid = resolvedPatientId(next, patientId ?? apptData?.appointment?.patient?.id ?? null);

    try {
      if (isAppointment) {
        const payload = chartToAppointmentNotes(next);
        try {
          if (notesExistRef.current) {
            await updateApptNotes.mutateAsync({ id: consultationId, payload });
          } else {
            await addApptNotes.mutateAsync({ id: consultationId, payload });
            notesExistRef.current = true;
          }
        } catch (err) {
          if ((err as ApiError)?.status === 409) {
            notesExistRef.current = true;
            await updateApptNotes.mutateAsync({ id: consultationId, payload });
          } else throw err;
        }
      } else {
        await saveInstant.mutateAsync({ id: consultationId, notes: chartToInstantNotesText(next) });
      }

      const summaryLink = isAppointment
        ? { appointment_id: consultationId }
        : { instant_consultation_id: summaryInstantId ?? consultationId };

      if (summaryIdRef.current != null) {
        await updateSummary.mutateAsync({ id: summaryIdRef.current, payload: fields });
      } else if (!creatingSummaryRef.current) {
        creatingSummaryRef.current = true;
        const res = await createSummary.mutateAsync({
          ...summaryLink,
          ...(pid != null ? { patient_id: pid } : {}),
          ...fields,
        });
        summaryIdRef.current = res.summary?.id ?? null;
        creatingSummaryRef.current = false;
      }

      if (snapshotRef.current === raw) dirtyRef.current = false;
      setSavedAt(new Date());
      setSaveStatus("saved");
    } catch {
      creatingSummaryRef.current = false;
      setSaveStatus("error");
    }
  }, [
    addApptNotes,
    apptData?.appointment?.patient?.id,
    consultationId,
    createSummary,
    isAppointment,
    mode,
    patientId,
    saveInstant,
    summaryInstantId,
    updateApptNotes,
    updateSummary,
  ]);

  useEffect(() => {
    void persistChart(debouncedSnapshot);
  }, [debouncedSnapshot, persistChart]);

  const patch = (partial: Partial<CallChart>) => {
    dirtyRef.current = true;
    setChart((prev) => ({ ...prev, ...partial }));
  };
  const patchIdentity = (partial: Partial<PatientIdentity>) => {
    dirtyRef.current = true;
    setChart((prev) => ({ ...prev, identity: { ...prev.identity, ...partial } }));
  };

  const identityHint = useMemo(() => {
    const name = chart.identity.full_name.trim() || patientName || t("consult.notes.patient");
    const bits = [name];
    if (chart.identity.phone.trim()) bits.push(chart.identity.phone.trim());
    if (chart.identity.national_id.trim()) bits.push(chart.identity.national_id.trim());
    return bits.join(" · ");
  }, [chart.identity, patientName, t]);

  return (
    <div className={cn("flex h-full flex-col", dark ? "bg-transparent text-white" : "bg-card text-foreground")}>
      <div className={cn("flex items-center justify-between px-3 py-2.5 shrink-0 border-b", dark ? "border-white/10" : "border-border")}>
        <div className="flex items-center gap-2 min-w-0">
          <FileText className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-emerald-300" : "text-primary")} />
          <span className="text-[12px] font-semibold">{t("consult.bookings.patient_file", "Patient file")}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close notes"
          className={cn(
            "h-6 w-6 rounded-[6px] flex items-center justify-center shrink-0",
            dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className={cn("px-3 pt-2 text-[10px] leading-snug shrink-0", dark ? "text-white/50" : "text-muted-foreground")}>
        {t("consult.notes.form_hint")}
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-3">
        <div className={cn("rounded-[8px] border", dark ? "border-white/10 bg-white/[0.04]" : "border-border bg-muted/30")}>
          <button
            type="button"
            onClick={() => setIdentityOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <User className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-white/70" : "text-primary")} />
              <span className="text-[11px] font-semibold truncate">{identityHint}</span>
            </span>
            {identityOpen ? <ChevronUp className="h-3.5 w-3.5 opacity-60" /> : <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
          </button>
          {identityOpen && (
            <div className="px-2.5 pb-2.5 grid grid-cols-2 gap-1.5">
              <div className="col-span-2">
                <MiniInput dark={dark} label={t("consult.notes.full_name")} value={chart.identity.full_name} onChange={(full_name) => patchIdentity({ full_name })} placeholder={t("consult.notes.ph_full_name")} />
              </div>
              <MiniInput dark={dark} label={t("consult.notes.phone")} value={chart.identity.phone} onChange={(phone) => patchIdentity({ phone })} placeholder={t("consult.notes.ph_phone")} />
              <MiniInput dark={dark} label={t("consult.notes.national_id")} value={chart.identity.national_id} onChange={(national_id) => patchIdentity({ national_id })} placeholder={t("consult.notes.ph_national_id")} />
              <MiniInput dark={dark} type="date" label={t("consult.notes.dob")} value={chart.identity.date_of_birth} onChange={(date_of_birth) => patchIdentity({ date_of_birth })} />
              <MiniInput dark={dark} label={t("consult.notes.gender")} value={chart.identity.gender} onChange={(gender) => patchIdentity({ gender })} placeholder={t("consult.notes.ph_gender")} />
              <div className="col-span-2">
                <MiniInput dark={dark} label={t("consult.notes.address")} value={chart.identity.address} onChange={(address) => patchIdentity({ address })} placeholder={t("consult.notes.ph_address")} />
              </div>
              <div className="col-span-2">
                <MiniInput dark={dark} label={t("consult.notes.patient_id")} value={chart.identity.patient_id} onChange={(patient_id) => patchIdentity({ patient_id })} placeholder={t("consult.notes.ph_patient_id")} />
              </div>
              {missingOfficialId && (
                <p className={cn("col-span-2 text-[10px] leading-snug", dark ? "text-amber-200/90" : "text-amber-700")}>
                  {t("consult.notes.patient_id_needed")}
                </p>
              )}
            </div>
          )}
        </div>

        <Field dark={dark} label={t("consult.notes.tpl_chief_complaint")} value={chart.chief_complaint} onChange={(chief_complaint) => patch({ chief_complaint })} placeholder={t("consult.notes.ph_chief_complaint")} rows={2} />
        <Field dark={dark} label={t("consult.notes.tpl_current_medications")} value={chart.medication_history} onChange={(medication_history) => patch({ medication_history })} placeholder={t("consult.notes.ph_medications")} rows={2} />
        <Field dark={dark} label={t("consult.notes.tpl_allergies")} value={chart.allergy_history} onChange={(allergy_history) => patch({ allergy_history })} placeholder={t("consult.notes.ph_allergies")} rows={2} />
        <Field dark={dark} label={t("consult.notes.tpl_assessment")} value={chart.clinical_assessment} onChange={(clinical_assessment) => patch({ clinical_assessment })} placeholder={t("consult.notes.ph_assessment")} rows={2} />
        <Field dark={dark} label={t("consult.notes.tpl_plan")} value={chart.management_plan} onChange={(management_plan) => patch({ management_plan })} placeholder={t("consult.notes.ph_plan")} rows={2} />

        <div className="space-y-1">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", dark ? "text-white/55" : "text-muted-foreground")}>
            {t("consult.notes.vitals")}
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <MiniInput dark={dark} label={t("consult.notes.bp")} value={chart.blood_pressure} onChange={(blood_pressure) => patch({ blood_pressure })} placeholder={t("consult.notes.ph_bp")} />
            <MiniInput dark={dark} label={t("consult.notes.temp")} value={chart.temperature} onChange={(temperature) => patch({ temperature })} placeholder={t("consult.notes.ph_temp")} />
            <MiniInput dark={dark} label={t("consult.notes.pulse")} value={chart.pulse_rate} onChange={(pulse_rate) => patch({ pulse_rate })} placeholder={t("consult.notes.ph_pulse")} />
          </div>
        </div>
      </div>

      <div className={cn("px-3 py-2 border-t shrink-0 flex items-center justify-between gap-2", dark ? "border-white/10" : "border-border/60")}>
        <div className={cn("flex min-w-0 items-center gap-1.5 text-[9px]", dark ? "text-white/55" : "text-muted-foreground")}>
          {saveStatus === "saving" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> {t("consult.notes.saving")}
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className={cn("w-3 h-3 shrink-0", dark ? "text-emerald-400" : "text-emerald-500")} />
              <span className="truncate">
                {t("consult.notes.saved_to_summary", "Saved to consultation summary")}
                {savedAt ? ` · ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
            </>
          )}
          {saveStatus === "error" && <span className="text-red-400">{t("consult.notes.save_failed")}</span>}
          {saveStatus === "idle" && <span>{t("consult.notes.autosaved")}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              dirtyRef.current = true;
              void persistChart(JSON.stringify(chart));
            }}
            className={cn("text-[10px] font-semibold", dark ? "text-emerald-300 hover:text-emerald-200" : "text-primary hover:text-primary/80")}
          >
            {t("consult.notes.save_now", "Save")}
          </button>
          <button
            onClick={() => {
              dirtyRef.current = true;
              setChart(emptyCallChart());
            }}
            className={cn("text-[10px] transition-colors", dark ? "text-white/50 hover:text-red-300" : "text-muted-foreground hover:text-red-500")}
          >
            {t("consult.notes.clear")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { readCallChart as readCallNoteForm } from "@/lib/call-note-form";
