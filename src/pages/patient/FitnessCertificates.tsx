import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
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
import {
  FilePlus2,
  ClipboardList,
  User,
  Briefcase,
  Activity,
  Phone,
  Check,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  QrCode,
  ShieldCheck,
  ChevronRight,
  FileText,
  XCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CertificateRequest {
  purpose: string;
  other_purpose?: string;
  job_type: string;
  fever: string;
  headache: string;
  shortness_of_breath: string;
  chest_pain: string;
  palpitations: string;
  cough: string;
  vomiting: string;
  fatigue: string;
  visual_disturbances: string;
  fainting: string;
  chronic_illness: string;
  chronic_illness_detail?: string;
  recent_hospitalization: string;
  recent_surgery: string;
  psychiatric: string;
  allergies: string;
  allergy_detail?: string;
  chronic_medication: string;
  medication_detail?: string;
  disability: string;
  walk_ok: string;
  climb_ok: string;
  lift_ok: string;
  sleep_ok: string;
  appetite_ok: string;
  temperature?: string;
  blood_pressure?: string;
  pulse?: string;
  oxygen_saturation?: string;
  notes?: string;
}

type CertStatus = "pending" | "approved" | "rejected" | "in_review";

interface IssuedCertificate {
  id: string;
  cert_number: string;
  purpose: string;
  requested_at: string;
  status: CertStatus;
  decision?: string;
  doctor?: string;
  valid_until?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PURPOSES = [
  "General fitness",
  "School/work fitness",
  "Return to work after illness",
  "Fitness for travel",
  "Other",
];

const JOB_TYPES = [
  "None of the above",
  "Heavy physical labor",
  "Driving/operating machinery",
  "Armed forces/security",
  "Mining/construction",
  "Work requiring chest X-ray",
];

const YES_NO = ["Yes", "No"];

const FORM_STEPS = [
  {
    id: "purpose",
    label: "Purpose",
    icon: FileText,
    description: "Certificate type & job",
    fields: ["purpose", "job_type"] as (keyof CertificateRequest)[],
  },
  {
    id: "symptoms",
    label: "Symptoms",
    icon: Activity,
    description: "Current health symptoms",
    fields: [
      "fever",
      "headache",
      "shortness_of_breath",
      "chest_pain",
      "palpitations",
      "cough",
      "vomiting",
      "fatigue",
      "visual_disturbances",
      "fainting",
    ] as (keyof CertificateRequest)[],
  },
  {
    id: "history",
    label: "Medical History",
    icon: ClipboardList,
    description: "Past illnesses & conditions",
    fields: [
      "chronic_illness",
      "recent_hospitalization",
      "recent_surgery",
      "psychiatric",
      "allergies",
      "chronic_medication",
      "disability",
    ] as (keyof CertificateRequest)[],
  },
  {
    id: "functional",
    label: "Functional",
    icon: User,
    description: "Daily ability & vitals",
    fields: [
      "walk_ok",
      "climb_ok",
      "lift_ok",
      "sleep_ok",
      "appetite_ok",
    ] as (keyof CertificateRequest)[],
  },
];

const MOCK_CERTIFICATES: IssuedCertificate[] = [
  {
    id: "1",
    cert_number: "MC-2025-00412",
    purpose: "School/work fitness",
    requested_at: "2025-05-02T10:30:00",
    status: "approved",
    doctor: "Dr. A. Nzeyimana",
    decision: "Fit",
    valid_until: "2026-05-02",
  },
  {
    id: "2",
    cert_number: "MC-2025-00387",
    purpose: "Return to work after illness",
    requested_at: "2025-04-15T09:00:00",
    status: "rejected",
    doctor: "Dr. G. Mukamana",
    decision: "Needs physical examination",
  },
  {
    id: "3",
    cert_number: "MC-2025-00501",
    purpose: "Fitness for travel",
    requested_at: "2025-05-10T14:20:00",
    status: "pending",
  },
  {
    id: "4",
    cert_number: "MC-2025-00490",
    purpose: "General fitness",
    requested_at: "2025-05-08T08:00:00",
    status: "in_review",
    doctor: "Dr. E. Habimana",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const STATUS_META: Record<
  CertStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-500/15 text-amber-600 border-amber-400/30",
    icon: Clock,
  },
  in_review: {
    label: "In Review",
    color: "bg-blue-500/15 text-blue-600 border-blue-400/30",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
    icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected",
    color: "bg-destructive/15 text-destructive border-destructive/25",
    icon: XCircle,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function FormField({
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

function YesNoField({
  label,
  value,
  onChange,
  warning,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-3">
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
                    : "bg-muted text-foreground border-border"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — fully responsive (mirrors PharmacyProfile UnifiedSidebar pattern)
// ─────────────────────────────────────────────────────────────────────────────
function FormSidebar({
  currentStep,
  visited,
  onSelect,
}: {
  currentStep: number;
  visited: Set<number>;
  onSelect: (i: number) => void;
}) {
  const visitedCount = visited.size;
  const pct = Math.round((visitedCount / FORM_STEPS.length) * 100);

  return (
    <div className="w-full sm:w-52 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
      {/* Progress header */}
      <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Certificate request
            </span>
            <span className="text-[11px] font-bold tabular-nums text-primary">
              {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {visitedCount} of {FORM_STEPS.length} sections visited
          </p>
        </div>
      </div>

      {/* Step nav — horizontal scroll on mobile, vertical on sm+ */}
      <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto">
        {FORM_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = visited.has(i) && i !== currentStep;

          return (
            <button
              key={step.id}
              onClick={() => onSelect(i)}
              className={cn(
                "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-md text-left transition-all duration-150",
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
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>

              {/* Labels — hidden on mobile, visible sm+ */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium leading-tight truncate",
                      isActive ? "text-primary" : "",
                    )}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
                      editing
                    </span>
                  )}
                  {isDone && (
                    <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
                      done
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
                      isActive
                        ? "bg-primary w-1/2"
                        : isDone
                          ? "bg-primary w-full"
                          : "bg-transparent w-0",
                    )}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint — hidden on mobile */}
      <div className="hidden sm:block px-3.5 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Jump between sections freely — no order needed.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Form
// ─────────────────────────────────────────────────────────────────────────────
function RequestForm({ onSubmit }: { onSubmit: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [formData] = useState<Partial<CertificateRequest>>({});
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CertificateRequest>({ defaultValues: formData });

  const watchedPurpose = watch("purpose");
  const watchedJobType = watch("job_type");

  const step = FORM_STEPS[currentStep];
  const isLast = currentStep === FORM_STEPS.length - 1;

  const goTo = (i: number) => {
    setVisited((v) => new Set([...v, i]));
    setCurrentStep(i);
  };

  const goNext = () => {
    if (isLast) {
      handleSubmit(() => {
        setSubmitted(true);
        setTimeout(() => onSubmit(), 1200);
      })();
    } else {
      goTo(currentStep + 1);
    }
  };

  const setYesNo = (field: keyof CertificateRequest) => (v: string) =>
    setValue(field, v);

  const yesNoWatch = (field: keyof CertificateRequest) =>
    watch(field) as string;

  const highRiskJob = watchedJobType && watchedJobType !== "None of the above";

  const redFlagSymptoms =
    yesNoWatch("chest_pain") === "Yes" ||
    yesNoWatch("shortness_of_breath") === "Yes" ||
    yesNoWatch("fainting") === "Yes";

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mx-auto">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Request submitted!
          </p>
          <p className="text-xs text-muted-foreground">
            A doctor will review your request shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row flex-1 min-h-0">
      <FormSidebar
        currentStep={currentStep}
        visited={visited}
        onSelect={goTo}
      />

      <div className="flex flex-col flex-1 min-h-0">
        {/* Section label bar */}
        <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {step.label}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {FORM_STEPS.length}
          </span>
        </div>

        {/* Body */}
        <div key={currentStep} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* ── Purpose ── */}
          {step.id === "purpose" && (
            <div className="space-y-4">
              <FormField
                label="Certificate purpose"
                error={errors.purpose?.message}
              >
                <Select
                  defaultValue={formData.purpose}
                  onValueChange={(v) => setValue("purpose", v)}
                >
                  <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {watchedPurpose === "Other" && (
                <FormField
                  label="Please specify"
                  error={errors.other_purpose?.message}
                >
                  <Input
                    {...register("other_purpose", { required: "Required" })}
                    placeholder="Describe the purpose"
                    className="border-border focus-visible:ring-primary text-xs h-9"
                  />
                </FormField>
              )}

              <FormField
                label="Job / activity type"
                error={errors.job_type?.message}
              >
                <Select
                  defaultValue={formData.job_type}
                  onValueChange={(v) => setValue("job_type", v)}
                >
                  <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((j) => (
                      <SelectItem key={j} value={j}>
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {highRiskJob && (
                <div className="flex items-start gap-2.5 p-3 rounded-md border border-amber-400/40 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This job type typically requires an{" "}
                    <strong>in-person physical examination</strong>. Your
                    request will be reviewed and you may be referred.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Symptoms ── */}
          {step.id === "symptoms" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                Answer honestly about symptoms in the{" "}
                <strong>past 72 hours</strong>.
              </p>
              {[
                { label: "Any fever in the past 72 hours?", field: "fever" },
                {
                  label: "Any current headache or dizziness?",
                  field: "headache",
                },
                {
                  label: "Any shortness of breath?",
                  field: "shortness_of_breath",
                  warning: true,
                },
                {
                  label: "Any chest pain?",
                  field: "chest_pain",
                  warning: true,
                },
                { label: "Any palpitations?", field: "palpitations" },
                { label: "Any cough?", field: "cough" },
                { label: "Any vomiting or diarrhea?", field: "vomiting" },
                { label: "Any body weakness or fatigue?", field: "fatigue" },
                {
                  label: "Any visual disturbances?",
                  field: "visual_disturbances",
                },
                {
                  label: "Any recent fainting episodes?",
                  field: "fainting",
                  warning: true,
                },
              ].map(({ label, field, warning }) => (
                <YesNoField
                  key={field}
                  label={label}
                  value={yesNoWatch(field as keyof CertificateRequest)}
                  onChange={setYesNo(field as keyof CertificateRequest)}
                  warning={warning}
                />
              ))}
              {redFlagSymptoms && (
                <div className="flex items-start gap-2.5 p-3 rounded-md border border-destructive/30 bg-destructive/10 mt-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    You have reported a <strong>red flag symptom</strong>. A
                    physical examination may be required. You can still submit
                    and a doctor will decide.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Medical History ── */}
          {step.id === "history" && (
            <div className="space-y-2">
              {[
                {
                  label:
                    "Any chronic illnesses? (HTN, diabetes, asthma, epilepsy, heart disease)",
                  field: "chronic_illness",
                },
                {
                  label: "Any hospitalization in the last 3 months?",
                  field: "recent_hospitalization",
                },
                {
                  label: "Any surgery in the last 6 months?",
                  field: "recent_surgery",
                },
                { label: "Any psychiatric conditions?", field: "psychiatric" },
                {
                  label: "Any known allergies (drug/food)?",
                  field: "allergies",
                },
                {
                  label: "Any chronic medication currently used?",
                  field: "chronic_medication",
                },
                {
                  label: "Any disability or mobility limitations?",
                  field: "disability",
                },
              ].map(({ label, field }) => (
                <YesNoField
                  key={field}
                  label={label}
                  value={yesNoWatch(field as keyof CertificateRequest)}
                  onChange={setYesNo(field as keyof CertificateRequest)}
                />
              ))}
              {yesNoWatch("chronic_illness") === "Yes" && (
                <FormField label="Please specify condition(s)" className="mt-3">
                  <Input
                    {...register("chronic_illness_detail")}
                    placeholder="e.g. Hypertension, Diabetes Type 2"
                    className="border-border focus-visible:ring-primary text-xs h-9"
                  />
                </FormField>
              )}
              {yesNoWatch("chronic_medication") === "Yes" && (
                <FormField label="Please list medications" className="mt-3">
                  <Input
                    {...register("medication_detail")}
                    placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                    className="border-border focus-visible:ring-primary text-xs h-9"
                  />
                </FormField>
              )}
              {yesNoWatch("allergies") === "Yes" && (
                <FormField label="Please specify allergies" className="mt-3">
                  <Input
                    {...register("allergy_detail")}
                    placeholder="e.g. Penicillin, Peanuts"
                    className="border-border focus-visible:ring-primary text-xs h-9"
                  />
                </FormField>
              )}
            </div>
          )}

          {/* ── Functional ── */}
          {step.id === "functional" && (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Daily functional ability
                </p>
                {[
                  {
                    label: "Can you walk without difficulty?",
                    field: "walk_ok",
                  },
                  { label: "Can you climb stairs?", field: "climb_ok" },
                  {
                    label: "Can you lift light objects without pain?",
                    field: "lift_ok",
                  },
                  { label: "Do you sleep well?", field: "sleep_ok" },
                  {
                    label: "Do you have a normal appetite?",
                    field: "appetite_ok",
                  },
                ].map(({ label, field }) => (
                  <YesNoField
                    key={field}
                    label={label}
                    value={yesNoWatch(field as keyof CertificateRequest)}
                    onChange={setYesNo(field as keyof CertificateRequest)}
                  />
                ))}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Vitals (optional — if home devices available)
                </p>
                <p className="text-[10px] text-muted-foreground mb-3">
                  If you have a thermometer, BP cuff, or pulse oximeter, enter
                  readings below.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: "Temperature (°C)",
                      field: "temperature",
                      placeholder: "e.g. 36.6",
                    },
                    {
                      label: "Blood pressure",
                      field: "blood_pressure",
                      placeholder: "e.g. 120/80",
                    },
                    {
                      label: "Pulse (bpm)",
                      field: "pulse",
                      placeholder: "e.g. 72",
                    },
                    {
                      label: "O₂ saturation (%)",
                      field: "oxygen_saturation",
                      placeholder: "e.g. 98",
                    },
                  ].map(({ label, field, placeholder }) => (
                    <FormField key={field} label={label}>
                      <Input
                        {...register(field as keyof CertificateRequest)}
                        placeholder={placeholder}
                        className="border-border focus-visible:ring-primary text-xs h-9"
                      />
                    </FormField>
                  ))}
                </div>
              </div>

              <FormField label="Additional notes for the doctor (optional)">
                <textarea
                  {...register("notes")}
                  rows={3}
                  placeholder="Any other relevant information.."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
          <Button
            variant="outline"
            onClick={() =>
              currentStep > 0 ? goTo(currentStep - 1) : undefined
            }
            disabled={currentStep === 0}
            className="border-border text-xs"
          >
            ← Back
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Step {currentStep + 1} of {FORM_STEPS.length}
          </span>
          <Button
            onClick={goNext}
            className="text-primary-foreground text-xs bg-primary hover:bg-primary/90"
          >
            {isLast ? "Submit request" : "Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sent Certificates List
// ─────────────────────────────────────────────────────────────────────────────
function SentCertificates() {
  const [certs] = useState<IssuedCertificate[]>(MOCK_CERTIFICATES);

  if (certs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="text-center space-y-2">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">
            No certificates yet
          </p>
          <p className="text-xs text-muted-foreground">
            Submit a request to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
      {certs.map((cert) => {
        const meta = STATUS_META[cert.status];
        const StatusIcon = meta.icon;

        return (
          <div
            key={cert.id}
            className="rounded-lg border border-border bg-card p-3 sm:p-4 flex items-start gap-3 sm:gap-4 group hover:border-primary/30 transition-colors"
          >
            {/* Icon — hidden on very small screens, shown sm+ */}
            <div className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center bg-primary/10 border border-primary/20 shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground">
                  {cert.purpose}
                </span>
                <Badge
                  className={cn(
                    "text-[10px] font-medium rounded-full px-2.5 py-0.5 border flex items-center gap-1",
                    meta.color,
                  )}
                >
                  <StatusIcon className="h-2.5 w-2.5" />
                  {meta.label}
                </Badge>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap">
                <span className="text-[11px] font-mono text-muted-foreground">
                  {cert.cert_number}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {fmtDate(cert.requested_at)}
                </span>
                {cert.doctor && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    · {cert.doctor}
                  </span>
                )}
              </div>

              {/* Doctor on mobile — own line */}
              {cert.doctor && (
                <p className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
                  {cert.doctor}
                </p>
              )}

              {cert.decision && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Decision:
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      cert.status === "approved"
                        ? "text-emerald-600"
                        : "text-destructive",
                    )}
                  >
                    {cert.decision}
                  </span>
                  {cert.valid_until && (
                    <span className="text-[10px] text-muted-foreground">
                      · Valid until {fmtDate(cert.valid_until)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {cert.status === "approved" && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-border text-muted-foreground hover:text-foreground"
                    title="View certificate"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-border text-muted-foreground hover:text-foreground hidden sm:flex"
                    title="Download PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
type Tab = "request" | "certificates";

const PatientFitnessCertificates = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("request");
  const [certCount, setCertCount] = useState(MOCK_CERTIFICATES.length);

  const handleRequestSubmit = () => {
    setCertCount((c) => c + 1);
    setActiveTab("certificates");
  };

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: "request", label: "New Request", icon: FilePlus2 },
    {
      id: "certificates",
      label: "My Certificates",
      icon: ClipboardList,
      badge: certCount,
    },
  ];

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t(
            "pages.patient.fitness_certificates.title",
            "Fitness Certificates",
          )}
          subtitle={t(
            "pages.patient.fitness_certificates.subtitle",
            "Request and manage your medical fitness certificates",
          )}
        />

        {/* Matches PharmacyProfile: px-3 py-4 sm:px-6 sm:py-8 */}
        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col min-h-[560px]">
            {/* Tab bar */}
            <div className="flex items-center border-b border-border bg-muted/30 px-3 sm:px-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-medium border-b-2 transition-all duration-150 -mb-px",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {/* Full label on sm+, short label on mobile */}
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">
                      {tab.id === "request" ? "Request" : "Certificates"}
                    </span>
                    {tab.badge !== undefined && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex flex-col flex-1 min-h-0">
              {activeTab === "request" ? (
                <RequestForm onSubmit={handleRequestSubmit} />
              ) : (
                <SentCertificates />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientFitnessCertificates;