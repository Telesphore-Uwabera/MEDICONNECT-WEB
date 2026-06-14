import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FilePlus2,
  ClipboardList,
  Check,
  Loader2,
  XCircle,
} from "lucide-react";

import {
  useGetPatientCertificates,
  useGetCurrentRequest,
  useGetStepData,
  useSubmitCertificate,
  useWithdrawCertificate,
  isSubmitPaymentRequired,
  type SubmitPaymentRequired,
} from "@/hooks/patient/use-patient-certificates";

import {
  FormSidebar,
  StepPurpose,
  YesNoStep,
  StepFunctional,
  FormField,
} from "./components/FitnessComponents";

import { FORM_STEPS, SYMPTOM_FIELDS, HISTORY_FIELDS } from "./components/FitnessConstants";
import PaymentPanel from "./components/Paymentpanel";
import CertificateCard from "./components/CertificateCard";

// ─────────────────────────────────────────────────────────────────────────────
// RequestForm — orchestrates steps + submit + payment
// ─────────────────────────────────────────────────────────────────────────────

type RequestPhase = "form" | "payment" | "submitted";

function RequestForm({ onSubmit: onDone }: { onSubmit: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [isSaving, setIsSaving] = useState(false);
  const [requestPhase, setRequestPhase] = useState<RequestPhase>("form");
  const [pendingPayment, setPendingPayment] = useState<SubmitPaymentRequired | null>(null);
  const [isRefreshingInvoice, setIsRefreshingInvoice] = useState(false);

  const { data: requestData, isLoading: requestLoading } = useGetCurrentRequest();
  const serverCurrentStep = requestData?.certificate?.current_step ?? 0;

  const { data: stepData, isLoading: stepLoading } = useGetStepData(
    FORM_STEPS[currentStep].apiStep,
    !requestLoading,
  );

  const submitMutation = useSubmitCertificate();

  useEffect(() => {
    if (serverCurrentStep > 0) {
      const newVisited = new Set<number>();
      FORM_STEPS.forEach((s, i) => {
        if (s.apiStep <= serverCurrentStep) newVisited.add(i);
      });
      setVisited(newVisited);
      const nextIncomplete = FORM_STEPS.findIndex((s) => s.apiStep > serverCurrentStep);
      if (nextIncomplete !== -1) setCurrentStep(nextIncomplete);
    }
  }, [serverCurrentStep]);

  const isLast = currentStep === FORM_STEPS.length - 1;

  const goTo = (i: number) => {
    setVisited((v) => new Set([...v, i]));
    setCurrentStep(i);
  };

  const handleStepSaved = useCallback(
    (_savedApiStep: number) => {
      setIsSaving(false);
      if (isLast) {
        submitMutation.mutate(undefined, {
          onSuccess: (res) => {
            if (isSubmitPaymentRequired(res)) {
              setPendingPayment(res);
              setRequestPhase("payment");
            } else {
              setRequestPhase("submitted");
              setTimeout(() => onDone(), 1200);
            }
          },
          onError: (err) => toast.error(err.message || "Submission failed"),
        });
      } else {
        goTo(currentStep + 1);
      }
    },
    [currentStep, isLast, submitMutation, onDone],
  );

  const handleNext = () => {
    setIsSaving(true);
    document.getElementById("step-submit-btn")?.click();
  };

  const handlePaymentConfirmed = useCallback(() => {
    setPendingPayment(null);
    setRequestPhase("submitted");
    setTimeout(() => onDone(), 1200);
  }, [onDone]);

  const handleRefreshInvoice = useCallback(async () => {
    setIsRefreshingInvoice(true);
    try {
      const res = await submitMutation.mutateAsync();
      if (isSubmitPaymentRequired(res)) {
        setPendingPayment(res);
      } else {
        setPendingPayment(null);
        setRequestPhase("submitted");
        setTimeout(() => onDone(), 1200);
      }
    } finally {
      setIsRefreshingInvoice(false);
    }
  }, [submitMutation, onDone]);

  const handlePayInitiate = useCallback(async () => {
    const res = await submitMutation.mutateAsync();
    if (isSubmitPaymentRequired(res)) {
      setPendingPayment(res);
      return { public_key: res.public_key, invoice_number: res.invoice_number };
    }
    setPendingPayment(null);
    setRequestPhase("submitted");
    setTimeout(() => onDone(), 1200);
    throw new Error("Request already submitted.");
  }, [submitMutation, onDone]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (requestLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs">Loading your request…</p>
        </div>
      </div>
    );
  }

  // ── Payment gate ─────────────────────────────────────────────────────────
  if (requestPhase === "payment" && pendingPayment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <PaymentPanel
            title="Complete payment to submit"
            description="Your request is ready. Pay the submission fee to send it to a doctor for review."
            paymentInfo={pendingPayment}
            onPaymentConfirmed={handlePaymentConfirmed}
            onRefreshInvoice={handleRefreshInvoice}
            isRefreshingInvoice={isRefreshingInvoice}
            onPayInitiate={handlePayInitiate}
            onCancel={() => setRequestPhase("form")}
            cancelLabel="← Back to form"
          />
        </div>
      </div>
    );
  }

  // ── Submitted success ────────────────────────────────────────────────────
  if (requestPhase === "submitted") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <Check className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-foreground">Request submitted!</p>
          <p className="text-xs text-muted-foreground">A doctor will review your request shortly.</p>
        </div>
      </div>
    );
  }

  // ── Multi-step form ──────────────────────────────────────────────────────
  const step = FORM_STEPS[currentStep];

  const savedAnswerMap: Record<string, string> = {};
  if (stepData?.answers) {
    stepData.answers.forEach((a) => { savedAnswerMap[a.field] = a.value; });
  }

  const stepContent = () => {
    if (stepLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (step.id) {
      case "purpose":
        return (
          <StepPurpose
            key={currentStep}
            initialData={{
              purpose: stepData?.purpose,
              purpose_other: stepData?.purpose_other ?? undefined,
              job_type: stepData?.job_type,
            }}
            onSaved={handleStepSaved}
          />
        );

      case "symptoms":
        return (
          <YesNoStep
            key={currentStep}
            apiStep={2}
            initialAnswers={savedAnswerMap}
            headerNote={
              <p className="text-xs text-muted-foreground mb-3">
                Answer honestly about symptoms in the <strong>past 72 hours</strong>.
              </p>
            }
            fields={SYMPTOM_FIELDS}
            onSaved={handleStepSaved}
          />
        );

      case "history":
        return (
          <YesNoStep
            key={currentStep}
            apiStep={3}
            initialAnswers={savedAnswerMap}
            fields={HISTORY_FIELDS}
            extraFields={(answers, setAnswer, register) => (
              <div className="mt-3 space-y-3">
                {answers["chronic_illness"] === "Yes" && (
                  <FormField label="Please specify condition(s)">
                    <Input
                      {...register("chronic_illness_detail")}
                      placeholder="e.g. Hypertension, Diabetes Type 2"
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
                {answers["chronic_medication"] === "Yes" && (
                  <FormField label="Please list medications">
                    <Input
                      {...register("medication_detail")}
                      placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
                {answers["allergies"] === "Yes" && (
                  <FormField label="Please specify allergies">
                    <Input
                      {...register("allergy_detail")}
                      placeholder="e.g. Penicillin, Peanuts"
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
              </div>
            )}
            onSaved={handleStepSaved}
          />
        );

      case "functional":
        return (
          <StepFunctional
            key={currentStep}
            initialAnswers={savedAnswerMap}
            initialVitals={stepData?.vitals}
            initialNotes={stepData?.notes}
            onSaved={handleStepSaved}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row flex-1 min-h-0">
      <FormSidebar
        currentStep={currentStep}
        serverStep={serverCurrentStep}
        visited={visited}
        onSelect={goTo}
      />

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {step.label}
          </span>
          {requestData?.certificate && (
            <Badge
              variant="outline"
              className="ml-1 text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary"
            >
              Draft saved
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {FORM_STEPS.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {stepContent()}
        </div>

        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? goTo(currentStep - 1) : undefined}
            disabled={currentStep === 0}
            className="border-border text-xs"
          >
            ← Back
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Step {currentStep + 1} of {FORM_STEPS.length}
          </span>
          <Button
            onClick={handleNext}
            disabled={isSaving || submitMutation.isPending}
            className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 min-w-[110px]"
          >
            {(isSaving || submitMutation.isPending) && (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            )}
            {isLast ? "Submit request" : "Save & Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SentCertificates
// ─────────────────────────────────────────────────────────────────────────────

function SentCertificates() {
  const { data, isLoading } = useGetPatientCertificates();
  const withdrawMutation = useWithdrawCertificate();

  const certs = data?.certificates ?? [];
  const hasDraftOrPending = certs.some((c) => c.status === "draft" || c.status === "pending");

  const handleWithdraw = () => {
    if (!confirm("Withdraw your current request? This cannot be undone.")) return;
    withdrawMutation.mutate(undefined, {
      onSuccess: () => toast.success("Request withdrawn."),
      onError: (err) => toast.error(err.message || "Could not withdraw request."),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-[13px] font-medium text-foreground/70">No certificates yet</p>
        <p className="text-[11px] text-muted-foreground max-w-[260px]">
          Submit a request and a doctor will review it shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5 space-y-3">
      {hasDraftOrPending && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px]">
          <p className="text-muted-foreground">You have an active request in progress.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
            className="h-7 text-[11px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/5"
          >
            {withdrawMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Withdraw
          </Button>
        </div>
      )}

      <div className="space-y-3 overflow-y-auto">
        {certs.map((cert) => (
          <CertificateCard key={cert.id} cert={cert} />
        ))}
      </div>
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

  const { data: certsData } = useGetPatientCertificates();
  const certCount = certsData?.certificates?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "request", label: "New Request", icon: FilePlus2 },
    { id: "certificates", label: "My Certificates", icon: ClipboardList, badge: certCount },
  ];

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.fitness_certificates.title", "Fitness Certificates")}
          subtitle={t(
            "pages.patient.fitness_certificates.subtitle",
            "Request and manage your medical fitness certificates",
          )}
        />

        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col min-h-[560px]">
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
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">
                      {tab.id === "request" ? "Request" : "Certificates"}
                    </span>
                    {tab.badge !== undefined && tab.badge > 0 && (
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

            <div className="flex flex-col flex-1 min-h-0">
              {activeTab === "request" ? (
                <RequestForm onSubmit={() => setActiveTab("certificates")} />
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
