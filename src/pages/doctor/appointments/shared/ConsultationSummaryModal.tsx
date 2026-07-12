import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  X, Loader2, AlertTriangle, Stethoscope, ClipboardList,
  Activity, ShieldAlert, Pill, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RichTextarea,
  hasRichTextContent,
  prepareRichTextForSave,
} from "@/components/ui/rich-textarea";
import {
  useConsultationSummaries,
  useConsultationSummary,
  useCreateConsultationSummary,
  useUpdateConsultationSummary,
  type CreateSummaryPayload,
  type UpdateSummaryPayload,
  type ReviewOfSystems,
  type RedFlagScreening,
} from "@/hooks/doctor/use-consultation-summaries";
import { getErrMsg } from "./helpers";

interface Props {
  /** Provide ONE of these. */
  appointmentId?: number | null;
  instantConsultationId?: number | null;
  patientId: number | null;
  patientName?: string;
  defaultComplaint?: string;
  defaultDiagnosis?: string;
  /** Cancel completion entirely. */
  onClose: () => void;
  /** Summary saved — continue the completion flow. */
  onSaved: () => void;
}

const inputCls =
  "w-full h-9 px-3 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors";
const labelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

const DURATION_UNITS = ["hours", "days", "weeks", "months"] as const;

type DurationUnit = (typeof DURATION_UNITS)[number];

const isDurationUnit = (value: unknown): value is DurationUnit =>
  typeof value === "string" && DURATION_UNITS.includes(value as DurationUnit);

const SYSTEMS: Array<{ key: string; label: string; symptoms: string[] }> = [
  { key: "general", label: "General", symptoms: ["fever", "fatigue", "weight_loss", "chills", "night_sweats"] },
  { key: "respiratory", label: "Respiratory", symptoms: ["cough", "shortness_of_breath", "wheezing", "sputum", "chest_tightness"] },
  { key: "cardiovascular", label: "Cardiovascular", symptoms: ["chest_pain", "palpitations", "edema", "syncope"] },
  { key: "gastrointestinal", label: "Gastrointestinal", symptoms: ["nausea", "vomiting", "diarrhea", "abdominal_pain", "constipation"] },
  { key: "neurological", label: "Neurological", symptoms: ["headache", "dizziness", "numbness", "weakness", "seizure"] },
];

const RED_FLAGS: Array<{ key: string; label: string }> = [
  { key: "severe_chest_pain", label: "Severe chest pain" },
  { key: "severe_breathing", label: "Breathing difficulty" },
  { key: "severe_bleeding", label: "uncontrolled bleeding" },
  { key: "loss_of_consciousness", label: "Loss of consciousness" },
  { key: "stroke_signs", label: "Signs of stroke (face/arm/speech)" },
  { key: "suicidal_ideation", label: "Suicidal ideation" },
];

const pretty = (s: string) => s.replace(/_/g, " ");

function SectionHeader({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-[5px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-foreground leading-tight">{title}</p>
        {hint && <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>}
      </div>
    </div>
  );
}

export function ConsultationSummaryModal({
  appointmentId,
  instantConsultationId,
  patientId,
  patientName,
  defaultComplaint,
  defaultDiagnosis,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  // Chief complaint
  const [mainComplaint, setMainComplaint] = useState(defaultComplaint ?? "");
  const [durationValue, setDurationValue] = useState<string>("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");

  // History of present illness
  const [onset, setOnset] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState(0); // 0 = not set

  // Review of systems — `ros` holds selected symptoms per system.
  const [ros, setRos] = useState<ReviewOfSystems>({});
  // Doctor-added systems + symptoms (dynamic), on top of the presets above.
  const [customSystems, setCustomSystems] = useState<Array<{ key: string; label: string }>>([]);
  const [customSymptoms, setCustomSymptoms] = useState<Record<string, string[]>>({});
  const [symInput, setSymInput] = useState<Record<string, string>>({});
  const [newSystem, setNewSystem] = useState("");

  // Red-flag screening
  const [redFlags, setRedFlags] = useState<Record<string, boolean>>({});

  // Clinical assessment
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState(defaultDiagnosis ?? "");
  const [severityClass, setSeverityClass] = useState("");

  // Management plan (follow-up only — medications are captured in the
  // prescription step that runs right after this summary).
  const [followup, setFollowup] = useState("");

  const createRx = useCreateConsultationSummary();
  const updateRx = useUpdateConsultationSummary();
  const saving = createRx.isPending || updateRx.isPending;

  // ── Existing-summary lookup ─────────────────────────────────────────────
  // A summary may already exist for this appointment/instant-consultation
  // (doctor closed this step earlier and reopened it, flow re-triggered,
  // etc). Load it instead of blindly creating a duplicate.
  const hasConsultationRef = appointmentId != null || instantConsultationId != null;
  const { data: existingList, isFetching: isLookingUp } = useConsultationSummaries(
    {
      appointment_id: appointmentId ?? undefined,
      instant_consultation_id: instantConsultationId ?? undefined,
    },
    { enabled: hasConsultationRef },
  );

  const existingSummaryId = useMemo(() => {
    const groups = existingList?.data ?? [];
    const all = groups.flatMap((g) => g.summaries);
    const match = all.find(
      (s) =>
        (appointmentId != null && s.appointment_id === appointmentId) ||
        (instantConsultationId != null && s.instant_consultation_id === instantConsultationId),
    );
    return match?.id ?? null;
  }, [existingList, appointmentId, instantConsultationId]);

  const { data: existingDetail, isFetching: isLoadingDetail } = useConsultationSummary(existingSummaryId);
  const [prefilled, setPrefilled] = useState(false);
  const isResolvingExisting = hasConsultationRef && (isLookingUp || (existingSummaryId != null && isLoadingDetail && !prefilled));

  // Pre-fill the form once the existing record (if any) has loaded.
  useEffect(() => {
    const summary = existingDetail?.summary;
    if (!summary || prefilled) return;

    setMainComplaint(summary.chief_complaint?.main_complaint ?? "");
    setDurationValue(
      summary.chief_complaint?.duration_value != null ? String(summary.chief_complaint.duration_value) : "",
    );
    const savedDurationUnit = summary.chief_complaint?.duration_unit;
    setDurationUnit(isDurationUnit(savedDurationUnit) ? savedDurationUnit : "days");

    setOnset(summary.history_of_present_illness?.onset ?? "");
    setLocation(summary.history_of_present_illness?.location ?? "");
    setSeverity(summary.history_of_present_illness?.severity ?? 0);

    const rosData = summary.review_of_systems ?? {};
    setRos(rosData);
    // Any system/symptom not in the built-in presets is rendered as a
    // "custom" chip so previously-saved data still shows up ticked.
    const extraSystems: Array<{ key: string; label: string }> = [];
    const extraSymptoms: Record<string, string[]> = {};
    for (const [sysKey, symptoms] of Object.entries(rosData)) {
      const preset = SYSTEMS.find((s) => s.key === sysKey);
      if (!preset) extraSystems.push({ key: sysKey, label: pretty(sysKey) });
      const presetSymptoms = preset?.symptoms ?? [];
      const unknown = (symptoms ?? []).filter((sym) => !presetSymptoms.includes(sym));
      if (unknown.length) extraSymptoms[sysKey] = unknown;
    }
    setCustomSystems(extraSystems);
    setCustomSymptoms(extraSymptoms);

    const savedFlags = summary.red_flag_screening ?? {};
    const flags = Object.fromEntries(
      Object.entries(savedFlags).filter(([key]) => key !== "alert_triggered"),
    ) as Record<string, boolean>;
    setRedFlags(flags);

    setPrimaryDiagnosis(summary.clinical_assessment?.primary_diagnosis ?? "");
    setSeverityClass(summary.clinical_assessment?.severity_classification ?? "");
    setFollowup(summary.management_plan?.followup_plan ?? "");

    setPrefilled(true);
  }, [existingDetail, prefilled]);

  const alertTriggered = useMemo(
    () => RED_FLAGS.some((f) => redFlags[f.key]),
    [redFlags],
  );

  const toggleSymptom = (system: string, symptom: string) =>
    setRos((prev) => {
      const cur = prev[system] ?? [];
      const next = cur.includes(symptom) ? cur.filter((s) => s !== symptom) : [...cur, symptom];
      return { ...prev, [system]: next };
    });

  const toggleFlag = (key: string) =>
    setRedFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Dynamic review-of-systems ──────────────────────────────────────────────
  const slugify = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  // All systems shown = presets + doctor-added ones.
  const allSystems: Array<{ key: string; label: string; preset: string[] }> = [
    ...SYSTEMS.map((s) => ({ key: s.key, label: s.label, preset: s.symptoms })),
    ...customSystems.map((s) => ({ key: s.key, label: s.label, preset: [] as string[] })),
  ];

  const addCustomSymptom = (systemKey: string) => {
    const raw = (symInput[systemKey] ?? "").trim();
    const slug = slugify(raw);
    if (!slug) return;
    setCustomSymptoms((prev) => {
      const cur = prev[systemKey] ?? [];
      return cur.includes(slug) ? prev : { ...prev, [systemKey]: [...cur, slug] };
    });
    // select it immediately
    setRos((prev) => {
      const cur = prev[systemKey] ?? [];
      return cur.includes(slug) ? prev : { ...prev, [systemKey]: [...cur, slug] };
    });
    setSymInput((prev) => ({ ...prev, [systemKey]: "" }));
  };

  const addCustomSystem = () => {
    const label = newSystem.trim();
    const key = slugify(label);
    if (!key) return;
    if (allSystems.some((s) => s.key === key)) {
      setNewSystem("");
      return;
    }
    setCustomSystems((prev) => [...prev, { key, label }]);
    setNewSystem("");
  };

  const canSave =
    hasRichTextContent(mainComplaint) && patientId != null && !saving && !isResolvingExisting;

  const handleSave = () => {
    if (patientId == null) {
      toast.error("Missing patient — cannot save the summary.");
      return;
    }
    if (!hasRichTextContent(mainComplaint)) {
      toast.error(t("pages.doctor.summary.enter_chief_complaint"));
      return;
    }

    // Only include ROS systems that have selected symptoms.
    const rosClean: ReviewOfSystems = {};
    for (const [sys, list] of Object.entries(ros)) {
      if (list.length) rosClean[sys] = list;
    }

    const redFlagPayload: RedFlagScreening = {
      ...redFlags,
      alert_triggered: alertTriggered,
    };

    const chiefComplaint = {
      main_complaint: prepareRichTextForSave(mainComplaint),
      ...(durationValue ? { duration_value: Number(durationValue) } : {}),
      ...(durationValue ? { duration_unit: durationUnit } : {}),
    };

    const hpi =
      onset || location.trim() || severity > 0
        ? {
            ...(onset ? { onset } : {}),
            ...(location.trim() ? { location: location.trim() } : {}),
            ...(severity > 0 ? { severity } : {}),
          }
        : undefined;

    const hasAssessment = Boolean(primaryDiagnosis.trim() || severityClass);
    const hasPlan = hasRichTextContent(followup);
    const clinicalAssessment = hasAssessment
      ? {
          ...(primaryDiagnosis.trim() ? { primary_diagnosis: primaryDiagnosis.trim() } : {}),
          ...(severityClass ? { severity_classification: severityClass } : {}),
        }
      : undefined;
    const managementPlan = hasPlan
      ? { followup_plan: prepareRichTextForSave(followup) }
      : undefined;

    // A summary already exists for this consultation — update it in one
    // request instead of creating a duplicate.
    if (existingSummaryId != null) {
      const updatePayload: UpdateSummaryPayload = {
        chief_complaint: chiefComplaint,
        ...(hpi ? { history_of_present_illness: hpi } : {}),
        ...(Object.keys(rosClean).length ? { review_of_systems: rosClean } : {}),
        red_flag_screening: redFlagPayload,
        ...(clinicalAssessment ? { clinical_assessment: clinicalAssessment } : {}),
        ...(managementPlan ? { management_plan: managementPlan } : {}),
      };
      updateRx.mutate(
        { id: existingSummaryId, payload: updatePayload },
        {
          onSuccess: () => {
            toast.success(t("pages.doctor.summary.updated"));
            onSaved();
          },
          onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary.update_failed"))),
        },
      );
      return;
    }

    const createPayload: CreateSummaryPayload = {
      patient_id: patientId,
      appointment_id: appointmentId ?? null,
      instant_consultation_id: instantConsultationId ?? null,
      chief_complaint: chiefComplaint,
      ...(hpi ? { history_of_present_illness: hpi } : {}),
      ...(Object.keys(rosClean).length ? { review_of_systems: rosClean } : {}),
      red_flag_screening: redFlagPayload,
    };

    createRx.mutate(createPayload, {
      onSuccess: (res) => {
        const id = res.summary?.id;
        if (id != null && (hasAssessment || hasPlan)) {
          updateRx.mutate(
            {
              id,
              payload: {
                ...(clinicalAssessment ? { clinical_assessment: clinicalAssessment } : {}),
                ...(managementPlan ? { management_plan: managementPlan } : {}),
              },
            },
            {
              onSuccess: () => {
                toast.success(t("pages.doctor.summary.saved"));
                onSaved();
              },
              onError: (err) =>
                toast.error(getErrMsg(err, t("pages.doctor.summary.assessment_plan_failed"))),
            },
          );
        } else {
          toast.success(t("pages.doctor.summary.saved"));
          onSaved();
        }
      },
      onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary.save_failed"))),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[6px] bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                {t("pages.doctor.summary.title")}
                {existingSummaryId != null && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">
                    {t("pages.doctor.summary.editing_existing")}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-muted-foreground truncate">
                {patientName || "Patient"} · required before completing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("pages.doctor.summary.close")}
            className="h-7 w-7 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {isResolvingExisting && (
            <div className="flex items-center gap-2 rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              Checking for an existing summary for this consultation…
            </div>
          )}
          {/* Chief complaint */}
          <section className="space-y-3">
            <SectionHeader icon={<Stethoscope className="h-3.5 w-3.5" />} title={t("pages.doctor.summary.chief_complaint")} hint={t("pages.doctor.summary.required")} />
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.summary.main_complaint")} *</label>
              <RichTextarea
                value={mainComplaint}
                onChange={setMainComplaint}
                placeholder={t("pages.doctor.summary.main_complaint_placeholder")}
                minHeight={80}
                editorClassName="text-[12px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>{t("pages.doctor.summary.duration")}</label>
                <input
                  type="number"
                  min={0}
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  placeholder="3"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>{t("pages.doctor.summary.unit")}</label>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                  className={cn(inputCls, "appearance-none")}
                >
                  {DURATION_UNITS.map((u) => (
                    <option key={u} value={u}>{t(`pages.doctor.summary.duration_${u}`, u)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* History of present illness */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<Activity className="h-3.5 w-3.5" />} title={t("pages.doctor.summary.hpi")} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>{t("pages.doctor.summary.onset")}</label>
                <select
                  value={onset}
                  onChange={(e) => setOnset(e.target.value)}
                  className={cn(inputCls, "appearance-none")}
                >
                  <option value="">—</option>
                  <option value="sudden">{t("pages.doctor.summary.sudden")}</option>
                  <option value="gradual">{t("pages.doctor.summary.gradual")}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>{t("pages.doctor.summary.location")}</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("pages.doctor.summary.location_placeholder")}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>
                Severity {severity > 0 ? `· ${severity}/10` : "· not set"}
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </section>

          {/* Review of systems — presets + doctor-added systems/symptoms */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<ClipboardList className="h-3.5 w-3.5" />} title="Review of systems" hint="Tick reported symptoms — add your own with +" />
            <div className="space-y-3">
              {allSystems.map((sys) => {
                const symptoms = [...sys.preset, ...(customSymptoms[sys.key] ?? [])];
                return (
                  <div key={sys.key} className="space-y-1.5">
                    <p className={labelCls}>{t(`pages.doctor.summary.system_${sys.key}`, sys.label)}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {symptoms.map((sym) => {
                        const active = (ros[sys.key] ?? []).includes(sym);
                        return (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => toggleSymptom(sys.key, sym)}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                              active
                                ? "bg-primary/10 border-primary/40 text-primary"
                                : "border-border text-muted-foreground hover:bg-muted/50",
                            )}
                          >
                            {pretty(sym)}
                          </button>
                        );
                      })}
                      {/* add a custom symptom to this system */}
                      <span className="inline-flex items-center gap-1">
                        <input
                          value={symInput[sys.key] ?? ""}
                          onChange={(e) =>
                            setSymInput((prev) => ({ ...prev, [sys.key]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomSymptom(sys.key);
                            }
                          }}
                          placeholder={t("pages.doctor.summary.add_symptom")}
                          className="h-7 w-28 px-2 rounded-full border border-dashed border-border bg-background text-[11px] text-foreground outline-none focus:border-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => addCustomSymptom(sys.key)}
                          aria-label={t("pages.doctor.summary.add_symptom_to", { system: sys.label })}
                          className="h-6 w-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* add a whole new system */}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newSystem}
                onChange={(e) => setNewSystem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSystem();
                  }
                }}
                placeholder={t("pages.doctor.summary.add_system_placeholder")}
                className={cn(inputCls, "h-8")}
              />
              <button
                type="button"
                onClick={addCustomSystem}
                className="h-8 px-3 rounded-[5px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> {t("pages.doctor.summary.system")}
              </button>
            </div>
          </section>

          {/* Red-flag screening */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<ShieldAlert className="h-3.5 w-3.5" />} title={t("pages.doctor.summary.red_flags")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RED_FLAGS.map((f) => (
                <label
                  key={f.key}
                  className={cn(
                    "flex items-center gap-2 rounded-[5px] border px-2.5 py-2 cursor-pointer transition-colors",
                    redFlags[f.key]
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!redFlags[f.key]}
                    onChange={() => toggleFlag(f.key)}
                    className="h-3.5 w-3.5 accent-destructive"
                  />
                  <span className="text-[11px] font-medium text-foreground">{t(`pages.doctor.summary.red_flag_${f.key}`, f.label)}</span>
                </label>
              ))}
            </div>
            {alertTriggered && (
              <div className="flex items-center gap-2 rounded-[5px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Red flag present — escalation / in-person care may be required.
              </div>
            )}
          </section>

          {/* Clinical assessment */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<Stethoscope className="h-3.5 w-3.5" />} title={t("pages.doctor.summary.clinical_assessment")} />
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.summary.primary_diagnosis")}</label>
              <input
                value={primaryDiagnosis}
                onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                placeholder={t("pages.doctor.summary.primary_diagnosis_placeholder")}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.summary.severity_classification")}</label>
              <select
                value={severityClass}
                onChange={(e) => setSeverityClass(e.target.value)}
                className={cn(inputCls, "appearance-none")}
              >
                <option value="">—</option>
                <option value="mild">{t("pages.doctor.summary.mild")}</option>
                <option value="moderate">{t("pages.doctor.summary.moderate")}</option>
                <option value="severe">{t("pages.doctor.summary.severe")}</option>
              </select>
            </div>
          </section>

          {/* Management plan — follow-up only; medications are issued in the
              prescription step that opens right after this summary. */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader
              icon={<Pill className="h-3.5 w-3.5" />}
              title={t("pages.doctor.summary.management_plan")}
              hint={t("pages.doctor.summary.management_hint")}
            />
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.summary.followup_plan")}</label>
              <RichTextarea
                value={followup}
                onChange={setFollowup}
                placeholder={t("pages.doctor.summary.followup_placeholder")}
                minHeight={80}
                editorClassName="text-[12px]"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border bg-muted/20 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {existingSummaryId != null ? t("pages.doctor.summary.updating_existing") : t("pages.doctor.summary.saving_records")}
          </span>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="h-9 px-4 rounded-[5px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {(saving || isResolvingExisting) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("pages.doctor.summary.save_continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
