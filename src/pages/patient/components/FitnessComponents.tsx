import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm, UseFormRegister, FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  FileText,
  XCircle,
  Download,
  QrCode,
  ChevronRight,
} from "lucide-react";
import {
  useSaveStep,
  useDownloadCertificate,
  useGetPatientCertificates,
  type CertStatus,
  type Step1Payload,
  type StepAnswersPayload,
} from "@/hooks/patient/use-patient-certificates";
import {
  JOB_TYPE_NONE,
  YES_NO,
  getPurposes,
  getJobTypes,
  getYesNoLabel,
  getFormSteps,
  getVitalsFields,
  getFunctionalFields,
} from "./FitnessConstants";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

export function FormField({
  label,
  error,
  children,
  className = "",
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

export function YesNoField({
  label,
  value,
  onChange,
  warning,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  warning?: boolean;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center justify-between py-2.5 gap-3">
        <span className="text-xs text-foreground leading-snug">{label}</span>
        <div className="flex gap-1.5 shrink-0">
          {YES_NO.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "px-3 py-1 rounded text-[11px] font-medium border transition-all",
                value === opt
                  ? opt === "Yes" && warning
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : opt === "Yes"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-amber-500 text-white border-amber-500"
                  : "bg-transparent text-muted-foreground border-border hover:bg-muted/60",
              )}
            >
              {getYesNoLabel(t, opt)}
            </button>
          ))}
        </div>
      </div>
      {children && <div className="pb-3">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

export function FormSidebar({
  currentStep,
  serverStep,
  visited,
  onSelect,
}: {
  currentStep: number;
  serverStep: number;
  visited: Set<number>;
  onSelect: (i: number) => void;
}) {
  const { t } = useTranslation();
  const FORM_STEPS = getFormSteps(t);
  const pct = Math.round((visited.size / FORM_STEPS.length) * 100);

  return (
    <div className="w-full sm:w-52 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("fitness.sidebar_title")}
            </span>
            <span className="text-[11px] font-bold tabular-nums text-primary">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t("fitness.sidebar_sections_visited", { count: visited.size, total: FORM_STEPS.length })}
          </p>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden">
        {FORM_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = step.apiStep <= serverStep && i !== currentStep;

          return (
            <button
              key={step.id}
              onClick={() => onSelect(i)}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-[6px] text-left transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer",
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all border text-[10px] font-semibold",
                  isActive
                    ? "bg-primary border-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-muted border-border text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              </div>

              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn("text-xs font-medium leading-tight truncate", isActive ? "text-primary" : "")}>
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
                      {t("fitness.sidebar_editing")}
                    </span>
                  )}
                  {isDone && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      {t("fitness.sidebar_done")}
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                  {step.description}
                </p>
                <div className="hidden sm:block h-0.5 rounded-full bg-muted overflow-hidden mt-1.5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isActive ? "bg-primary w-1/2" : isDone ? "bg-primary w-full" : "bg-transparent w-0",
                    )}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden sm:block px-3.5 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {t("fitness.sidebar_hint")}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Purpose
// ─────────────────────────────────────────────────────────────────────────────

interface Step1Fields {
  purpose: string;
  purpose_other?: string;
  job_type: string;
}

export function StepPurpose({
  initialData,
  onSaved,
}: {
  initialData?: Partial<Step1Fields>;
  onSaved: (nextStep: number) => void;
}) {
  const { t } = useTranslation();
  const PURPOSES = getPurposes(t);
  const JOB_TYPES = getJobTypes(t);
  const saveStep = useSaveStep();
  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<Step1Fields>({
      defaultValues: {
        purpose: initialData?.purpose ?? "",
        purpose_other: initialData?.purpose_other ?? "",
        job_type: initialData?.job_type ?? "",
      },
    });

  useEffect(() => {
    register("purpose", { required: t("fitness.purpose_required") });
    register("job_type", { required: t("fitness.job_type_required") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register]);

  const watchedPurpose = watch("purpose");
  const watchedJobType = watch("job_type");
  const highRiskJob = watchedJobType && watchedJobType !== JOB_TYPE_NONE;

  const onSubmit = (data: Step1Fields) => {
    const payload: Step1Payload = {
      purpose: data.purpose,
      purpose_other: data.purpose === "other" ? (data.purpose_other ?? null) : null,
      job_type: data.job_type,
    };
    saveStep.mutate(
      { step: 1, payload },
      {
        onSuccess: () => { toast.success(t("fitness.step1_saved")); onSaved(1); },
        onError: (err) => toast.error(err.message || t("fitness.step1_save_failed")),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label={t("fitness.purpose_select_label")} error={errors.purpose?.message}>
        <Select defaultValue={initialData?.purpose} onValueChange={(v) => setValue("purpose", v, { shouldValidate: true })}>
          <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
            <SelectValue placeholder={t("fitness.purpose_select_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {PURPOSES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {watchedPurpose === "other" && (
        <FormField label={t("fitness.purpose_specify_label")} error={errors.purpose_other?.message}>
          <Input
            {...register("purpose_other", { required: t("fitness.purpose_other_required") })}
            placeholder={t("fitness.purpose_specify_placeholder")}
            className="border-border focus-visible:ring-primary text-xs h-9"
          />
        </FormField>
      )}

      <FormField label={t("fitness.job_type_label")} error={errors.job_type?.message}>
        <Select defaultValue={initialData?.job_type} onValueChange={(v) => setValue("job_type", v, { shouldValidate: true })}>
          <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
            <SelectValue placeholder={t("fitness.job_type_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {JOB_TYPES.map((j) => (
              <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {highRiskJob && (
        <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-amber-400/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("fitness.high_risk_job_pre")} <strong>{t("fitness.high_risk_job_bold")}</strong>. {t("fitness.high_risk_job_post")}
          </p>
        </div>
      )}

      <button type="submit" id="step-submit-btn" className="hidden" />
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Steps 2 & 3 — Yes/No answer lists
// ─────────────────────────────────────────────────────────────────────────────

interface YesNoStepProps {
  apiStep: 2 | 3;
  fields: { label: string; field: string; warning?: boolean }[];
  initialAnswers?: Record<string, string>;
  headerNote?: React.ReactNode;
  fieldExtra?: (
    field: { label: string; field: string; warning?: boolean },
    answers: Record<string, string>,
    setAnswer: (k: string, v: string) => void,
    register: UseFormRegister<FieldValues>,
  ) => React.ReactNode;
  extraFields?: (
    answers: Record<string, string>,
    setAnswer: (k: string, v: string) => void,
    register: UseFormRegister<FieldValues>,
  ) => React.ReactNode;
  onSaved: (nextStep: number) => void;
}

export function YesNoStep({
  apiStep,
  fields,
  initialAnswers = {},
  headerNote,
  fieldExtra,
  extraFields,
  onSaved,
}: YesNoStepProps) {
  const { t } = useTranslation();
  const saveStep = useSaveStep();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const { register } = useForm();

  const setAnswer = (k: string, v: string) => setAnswers((prev) => ({ ...prev, [k]: v }));

  const redFlagSymptoms =
    answers["shortness_breath"] === "Yes" ||
    answers["chest_pain"] === "Yes" ||
    answers["fainting"] === "Yes";

  const handleSave = () => {
    const payload: StepAnswersPayload = { answers };
    saveStep.mutate(
      { step: apiStep, payload },
      {
        onSuccess: () => { toast.success(t("fitness.step_n_saved", { step: apiStep })); onSaved(apiStep); },
        onError: (err) => toast.error(err.message || t("fitness.step_n_save_failed", { step: apiStep })),
      },
    );
  };

  return (
    <div className="space-y-2">
      {headerNote}
      {fields.map((item) => (
        <YesNoField
          key={item.field}
          label={item.label}
          value={answers[item.field] ?? ""}
          onChange={(v) => setAnswer(item.field, v)}
          warning={item.warning}
        >
          {fieldExtra?.(item, answers, setAnswer, register)}
        </YesNoField>
      ))}
      {redFlagSymptoms && apiStep === 2 && (
        <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-destructive/30 bg-destructive/10 mt-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">
            {t("fitness.red_flag_pre")} <strong>{t("fitness.red_flag_bold")}</strong>. {t("fitness.red_flag_post")}
          </p>
        </div>
      )}
      {extraFields?.(answers, setAnswer, register)}
      <button id="step-submit-btn" className="hidden" onClick={handleSave} type="button" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Functional + Vitals
// ─────────────────────────────────────────────────────────────────────────────

interface Step4Fields {
  temperature?: string;
  blood_pressure?: string;
  pulse?: string;
  oxygen_saturation?: string;
  notes?: string;
}

export function StepFunctional({
  initialAnswers = {},
  initialVitals,
  initialNotes,
  onSaved,
}: {
  initialAnswers?: Record<string, string>;
  initialVitals?: Step4Fields;
  initialNotes?: string;
  onSaved: (nextStep: number) => void;
}) {
  const { t } = useTranslation();
  const FUNCTIONAL_FIELDS = getFunctionalFields(t);
  const VITALS_FIELDS = getVitalsFields(t);
  const saveStep = useSaveStep();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const { register, handleSubmit } = useForm<Step4Fields>({
    defaultValues: { ...initialVitals, notes: initialNotes },
  });
  const setAnswer = (k: string, v: string) => setAnswers((prev) => ({ ...prev, [k]: v }));

  const onSubmit = (vitals: Step4Fields) => {
    const payload: StepAnswersPayload = { answers, ...vitals };
    saveStep.mutate(
      { step: 4, payload },
      {
        onSuccess: () => { toast.success(t("fitness.step4_saved")); onSaved(4); },
        onError: (err) => toast.error(err.message || t("fitness.step4_save_failed")),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {t("fitness.functional_ability_title")}
        </p>
        {FUNCTIONAL_FIELDS.map(({ label, field }) => (
          <YesNoField key={field} label={label} value={answers[field] ?? ""} onChange={(v) => setAnswer(field, v)} />
        ))}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          {t("fitness.vitals_title")}
        </p>
        <p className="text-[10px] text-muted-foreground mb-3">
          {t("fitness.vitals_hint")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VITALS_FIELDS.map(({ label, field, placeholder }) => (
            <FormField key={field} label={label}>
              <Input
                {...register(field as keyof Step4Fields)}
                placeholder={placeholder}
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>
          ))}
        </div>
      </div>

      <FormField label={t("fitness.notes_label")}>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder={t("fitness.notes_placeholder")}
          className="w-full rounded-[6px] border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </FormField>

      <button type="submit" id="step-submit-btn" className="hidden" />
    </form>
  );
}


