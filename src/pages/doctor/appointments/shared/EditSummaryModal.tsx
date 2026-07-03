// Edit an existing consultation summary (PUT /doctor/consultation-summaries/:id).
// Seeded from the summary; saves all SOAP sections in one update.

import { useMemo, useState, type ReactNode } from "react";
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
  useUpdateConsultationSummary,
  type ConsultationSummary,
  type ReviewOfSystems,
  type RedFlagScreening,
  type UpdateSummaryPayload,
} from "@/hooks/doctor/use-consultation-summaries";
import { getErrMsg } from "./helpers";

interface Props {
  summary: ConsultationSummary;
  onClose: () => void;
  onSaved?: () => void;
}

const inputCls =
  "w-full h-9 px-3 rounded-[5px] border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors";
const labelCls =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

const DURATION_UNITS = ["hours", "days", "weeks", "months"];

const SYSTEMS: Array<{ key: string; label: string; symptoms: string[] }> = [
  { key: "general", label: "General", symptoms: ["fever", "fatigue", "weight_loss", "chills", "night_sweats"] },
  { key: "respiratory", label: "Respiratory", symptoms: ["cough", "shortness_of_breath", "wheezing", "sputum", "chest_tightness"] },
  { key: "cardiovascular", label: "Cardiovascular", symptoms: ["chest_pain", "palpitations", "edema", "syncope"] },
  { key: "gastrointestinal", label: "Gastrointestinal", symptoms: ["nausea", "vomiting", "diarrhea", "abdominal_pain", "constipation"] },
  { key: "neurological", label: "Neurological", symptoms: ["headache", "dizziness", "numbness", "weakness", "seizure"] },
];

const RED_FLAGS: Array<{ key: string; label: string }> = [
  { key: "severe_chest_pain", label: "Severe chest pain" },
  { key: "severe_breathing", label: "Severe breathing difficulty" },
  { key: "severe_bleeding", label: "Severe / uncontrolled bleeding" },
  { key: "loss_of_consciousness", label: "Loss of consciousness" },
  { key: "stroke_signs", label: "Signs of stroke (face/arm/speech)" },
  { key: "suicidal_ideation", label: "Suicidal ideation" },
];

const pretty = (s: string) => s.replace(/_/g, " ");
const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

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

export function EditSummaryModal({ summary, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const cc = summary.chief_complaint ?? {};
  const hpi = summary.history_of_present_illness ?? {};
  const ca = summary.clinical_assessment ?? {};
  const mp = summary.management_plan ?? {};
  const seedFlags: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(summary.red_flag_screening ?? {})) {
    if (k !== "alert_triggered") seedFlags[k] = !!v;
  }

  // Chief complaint
  const [mainComplaint, setMainComplaint] = useState(cc.main_complaint ?? "");
  const [durationValue, setDurationValue] = useState(
    cc.duration_value != null ? String(cc.duration_value) : "",
  );
  const [durationUnit, setDurationUnit] = useState(cc.duration_unit ?? "days");

  // HPI
  const [onset, setOnset] = useState(hpi.onset ?? "");
  const [location, setLocation] = useState(hpi.location ?? "");
  const [severity, setSeverity] = useState(hpi.severity ?? 0);

  // ROS
  const [ros, setRos] = useState<ReviewOfSystems>(() => {
    const seeded: ReviewOfSystems = {};
    for (const [sys, list] of Object.entries(summary.review_of_systems ?? {})) {
      seeded[sys] = Array.isArray(list) ? list : [];
    }
    return seeded;
  });
  const [customSystems, setCustomSystems] = useState<Array<{ key: string; label: string }>>(() => {
    const presetKeys = new Set(SYSTEMS.map((s) => s.key));
    return Object.keys(summary.review_of_systems ?? {})
      .filter((k) => !presetKeys.has(k))
      .map((k) => ({ key: k, label: pretty(k) }));
  });
  const [symInput, setSymInput] = useState<Record<string, string>>({});
  const [newSystem, setNewSystem] = useState("");

  // Red flags
  const [redFlags, setRedFlags] = useState<Record<string, boolean>>(seedFlags);

  // Assessment + plan
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState(ca.primary_diagnosis ?? "");
  const [severityClass, setSeverityClass] = useState(ca.severity_classification ?? "");
  const [followup, setFollowup] = useState(mp.followup_plan ?? "");

  const updateRx = useUpdateConsultationSummary();
  const saving = updateRx.isPending;

  const alertTriggered = useMemo(
    () => RED_FLAGS.some((f) => redFlags[f.key]) || customRedActive(redFlags),
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

  const allSystems: Array<{ key: string; label: string; preset: string[] }> = [
    ...SYSTEMS.map((s) => ({ key: s.key, label: t(s.labelKey), preset: s.symptoms })),
    ...customSystems.map((s) => ({ key: s.key, label: s.label, preset: [] as string[] })),
  ];

  const addCustomSymptom = (systemKey: string) => {
    const slug = slugify(symInput[systemKey] ?? "");
    if (!slug) return;
    setRos((prev) => {
      const cur = prev[systemKey] ?? [];
      return cur.includes(slug) ? prev : { ...prev, [systemKey]: [...cur, slug] };
    });
    setSymInput((prev) => ({ ...prev, [systemKey]: "" }));
  };
  const addCustomSystem = () => {
    const label = newSystem.trim();
    const key = slugify(label);
    if (!key || allSystems.some((s) => s.key === key)) {
      setNewSystem("");
      return;
    }
    setCustomSystems((prev) => [...prev, { key, label }]);
    setNewSystem("");
  };

  const canSave = hasRichTextContent(mainComplaint) && !saving;

  const handleSave = () => {
    if (!hasRichTextContent(mainComplaint)) {
      toast.error(t("pages.doctor.chief_complaint_required"));
      return;
    }

    const rosClean: ReviewOfSystems = {};
    for (const [sys, list] of Object.entries(ros)) {
      if (list.length) rosClean[sys] = list;
    }
    const redFlagPayload: RedFlagScreening = { ...redFlags, alert_triggered: alertTriggered };

    const payload: UpdateSummaryPayload = {
      chief_complaint: {
        main_complaint: prepareRichTextForSave(mainComplaint),
        ...(durationValue ? { duration_value: Number(durationValue) } : {}),
        ...(durationValue ? { duration_unit: durationUnit } : {}),
      },
      history_of_present_illness: {
        ...(onset ? { onset } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(severity > 0 ? { severity } : {}),
      },
      review_of_systems: rosClean,
      red_flag_screening: redFlagPayload,
      clinical_assessment: {
        ...(primaryDiagnosis.trim() ? { primary_diagnosis: primaryDiagnosis.trim() } : {}),
        ...(severityClass ? { severity_classification: severityClass } : {}),
      },
      management_plan: {
        ...(hasRichTextContent(followup) ? { followup_plan: prepareRichTextForSave(followup) } : {}),
      },
    };

    updateRx.mutate(
      { id: summary.id, payload },
      {
        onSuccess: () => {
          toast.success(t("pages.doctor.summary_updated"));
          onSaved?.();
          onClose();
        },
        onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary_update_failed"))),
      },
    );
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
              <h2 className="text-[13px] font-semibold text-foreground">{t("pages.doctor.edit_consultation_summary")}</h2>
              <p className="text-[10px] text-muted-foreground truncate">{t("pages.doctor.summary_number", { id: summary.id })}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("pages.doctor.close")}
            className="h-7 w-7 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Chief complaint */}
          <section className="space-y-3">
            <SectionHeader icon={<Stethoscope className="h-3.5 w-3.5" />} title={t("pages.doctor.chief_complaint")} hint={t("pages.doctor.required")} />
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.main_complaint_required")}</label>
              <RichTextarea
                value={mainComplaint}
                onChange={setMainComplaint}
                placeholder={t("pages.doctor.main_complaint_placeholder")}
                minHeight={80}
                editorClassName="text-[12px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>{t("pages.doctor.duration")}</label>
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
                <label className={labelCls}>{t("pages.doctor.unit")}</label>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className={cn(inputCls, "appearance-none")}
                >
                  {DURATION_UNITS.map((u) => (
                    <option key={u} value={u}>{t(`pages.doctor.duration_unit_${u}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* HPI */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<Activity className="h-3.5 w-3.5" />} title={t("pages.doctor.history_present_illness")} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>{t("pages.doctor.onset")}</label>
                <select
                  value={onset}
                  onChange={(e) => setOnset(e.target.value)}
                  className={cn(inputCls, "appearance-none")}
                >
                  <option value="">—</option>
                  <option value="sudden">{t("pages.doctor.sudden")}</option>
                  <option value="gradual">{t("pages.doctor.gradual")}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>{t("pages.doctor.location")}</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("pages.doctor.location_placeholder")}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>
                {t("pages.doctor.severity")} {severity > 0 ? `- ${severity}/10` : `- ${t("pages.doctor.not_set")}`}
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

          {/* ROS */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<ClipboardList className="h-3.5 w-3.5" />} title={t("pages.doctor.review_of_systems")} hint={t("pages.doctor.review_systems_hint")} />
            <div className="space-y-3">
              {allSystems.map((sys) => {
                const symptoms = uniq([...sys.preset, ...(ros[sys.key] ?? [])]);
                return (
                  <div key={sys.key} className="space-y-1.5">
                    <p className={labelCls}>{sys.label}</p>
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
                            {t(`pages.doctor.symptom_${sym}`)}
                          </button>
                        );
                      })}
                      <span className="inline-flex items-center gap-1">
                        <input
                          value={symInput[sys.key] ?? ""}
                          onChange={(e) => setSymInput((prev) => ({ ...prev, [sys.key]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomSymptom(sys.key);
                            }
                          }}
                          placeholder={t("pages.doctor.add_symptom")}
                          className="h-7 w-28 px-2 rounded-full border border-dashed border-border bg-background text-[11px] text-foreground outline-none focus:border-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => addCustomSymptom(sys.key)}
                          aria-label={t("pages.doctor.add_symptom_to", { system: sys.label })}
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
                placeholder={t("pages.doctor.add_system_placeholder")}
                className={cn(inputCls, "h-8")}
              />
              <button
                type="button"
                onClick={addCustomSystem}
                className="h-8 px-3 rounded-[5px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> {t("pages.doctor.system")}
              </button>
            </div>
          </section>

          {/* Red flags */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<ShieldAlert className="h-3.5 w-3.5" />} title={t("pages.doctor.red_flag_screening")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RED_FLAGS.map((f) => (
                <label
                  key={f.key}
                  className={cn(
                    "flex items-center gap-2 rounded-[5px] border px-2.5 py-2 cursor-pointer transition-colors",
                    redFlags[f.key] ? "border-destructive/40 bg-destructive/5" : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!redFlags[f.key]}
                    onChange={() => toggleFlag(f.key)}
                    className="h-3.5 w-3.5 accent-destructive"
                  />
                  <span className="text-[11px] font-medium text-foreground">{t(f.labelKey)}</span>
                </label>
              ))}
            </div>
            {alertTriggered && (
              <div className="flex items-center gap-2 rounded-[5px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {t("pages.doctor.red_flag_present_desc")}
              </div>
            )}
          </section>

          {/* Assessment */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<Stethoscope className="h-3.5 w-3.5" />} title={t("pages.doctor.clinical_assessment")} />
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.primary_diagnosis")}</label>
              <input
                value={primaryDiagnosis}
                onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                placeholder={t("pages.doctor.primary_diagnosis_placeholder")}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.severity_classification")}</label>
              <select
                value={severityClass}
                onChange={(e) => setSeverityClass(e.target.value)}
                className={cn(inputCls, "appearance-none")}
              >
                <option value="">—</option>
                <option value="mild">{t("pages.doctor.mild")}</option>
                <option value="moderate">{t("pages.doctor.moderate")}</option>
                <option value="severe">{t("pages.doctor.severe")}</option>
              </select>
            </div>
          </section>

          {/* Management plan */}
          <section className="space-y-3 border-t border-border pt-5">
            <SectionHeader icon={<Pill className="h-3.5 w-3.5" />} title={t("pages.doctor.management_plan")} hint={t("pages.doctor.medications_managed_prescriptions")} />
            <div className="space-y-1.5">
              <label className={labelCls}>{t("pages.doctor.follow_up_plan")}</label>
              <RichTextarea
                value={followup}
                onChange={setFollowup}
                placeholder={t("pages.doctor.follow_up_placeholder")}
                minHeight={80}
                editorClassName="text-[12px]"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/20 shrink-0">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-[5px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="h-9 px-4 rounded-[5px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("pages.doctor.save_changes")}
          </button>
        </div>
      </div>
    </div>
  );
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function customRedActive(flags: Record<string, boolean>): boolean {
  return Object.entries(flags).some(([k, v]) => v && k !== "alert_triggered");
}
