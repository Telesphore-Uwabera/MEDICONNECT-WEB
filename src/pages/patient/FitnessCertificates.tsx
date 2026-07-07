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

import { getFormSteps, getSymptomFields, getHistoryFields } from "./components/FitnessConstants";
import PaymentPanel from "./components/Paymentpanel";
import CertificateCard from "./components/CertificateCard";

// ─────────────────────────────────────────────────────────────────────────────
// RequestForm — orchestrates steps + submit + payment
// ─────────────────────────────────────────────────────────────────────────────

type RequestPhase = "form" | "payment" | "submitted";

function RequestForm({ onSubmit: onDone }: { onSubmit: () => void }) {
  const { t } = useTranslation();
  const FORM_STEPS = getFormSteps(t);
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
          onError: (err) => toast.error(err.message || t("fitness.submission_failed")),
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
      <div className="flex flex-col sm:flex-row flex-1 min-h-0">
        <div className="w-full sm:w-64 border-r border-border/50 bg-card/20 p-4 space-y-3 shrink-0 hidden sm:block">
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-6" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-full bg-muted rounded-[6px] animate-pulse" />
          ))}
        </div>
        <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5 space-y-5">
          <div className="h-5 w-48 bg-muted rounded animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 w-full bg-muted rounded-[6px] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Payment gate ─────────────────────────────────────────────────────────
  if (requestPhase === "payment" && pendingPayment) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm rounded-[6px] border border-border bg-card shadow-sm overflow-hidden">
          <PaymentPanel
            title={t("fitness.payment_title")}
            description={t("fitness.payment_description")}
            paymentInfo={pendingPayment}
            onPaymentConfirmed={handlePaymentConfirmed}
            onRefreshInvoice={handleRefreshInvoice}
            isRefreshingInvoice={isRefreshingInvoice}
            onPayInitiate={handlePayInitiate}
            onCancel={() => setRequestPhase("form")}
            cancelLabel={t("fitness.back_to_form")}
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
          <p className="text-sm font-semibold text-foreground">{t("fitness.submitted_title")}</p>
          <p className="text-xs text-muted-foreground">{t("fitness.submitted_desc")}</p>
        </div>
      </div>
    );
  }

  // ── Multi-step form ──────────────────────────────────────────────────────
  const step = FORM_STEPS[currentStep];

  // Build a { fieldKey: "Yes"/"No"/value } map to prefill the answer steps.
  // The API returns answers in the real shape ({ question_key, answer,
  // boolean_answer }); older/normalized responses use { field, value }. Support
  // both so resuming a pending request actually re-populates the saved answers.
  const savedAnswerMap: Record<string, string> = {};
  if (stepData?.answers) {
    stepData.answers.forEach((a) => {
      const key = a.field ?? a.question_key;
      const val =
        a.value ??
        a.answer ??
        (a.boolean_answer != null ? (a.boolean_answer ? "Yes" : "No") : undefined);
      if (key != null && val != null) savedAnswerMap[key] = val;
    });
  }

  const stepContent = () => {
    if (stepLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 w-full bg-muted rounded-[6px] animate-pulse" />
          ))}
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
                {t("fitness.symptoms_note_pre")} <strong>{t("fitness.symptoms_note_bold")}</strong>{t("fitness.symptoms_note_post")}
              </p>
            }
            fields={getSymptomFields(t)}
            onSaved={handleStepSaved}
          />
        );

      case "history":
        return (
          <YesNoStep
            key={currentStep}
            apiStep={3}
            initialAnswers={savedAnswerMap}
            fields={getHistoryFields(t)}
            extraFields={(answers, setAnswer, register) => (
              <div className="mt-3 space-y-3">
                {answers["chronic_illness"] === "Yes" && (
                  <FormField label={t("fitness.chronic_illness_detail_label")}>
                    <Input
                      {...register("chronic_illness_detail")}
                      placeholder={t("fitness.chronic_illness_detail_placeholder")}
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
                {answers["chronic_medication"] === "Yes" && (
                  <FormField label={t("fitness.medication_detail_label")}>
                    <Input
                      {...register("medication_detail")}
                      placeholder={t("fitness.medication_detail_placeholder")}
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
                {answers["allergies"] === "Yes" && (
                  <FormField label={t("fitness.allergy_detail_label")}>
                    <Input
                      {...register("allergy_detail")}
                      placeholder={t("fitness.allergy_detail_placeholder")}
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
              {requestData.certificate.status === "draft"
                ? t("fitness.draft_saved_badge")
                : t("fitness.updating_badge", { number: requestData.certificate.certificate_number })}
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">
            {t("fitness.step_of", { current: currentStep + 1, total: FORM_STEPS.length })}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Make it explicit that we're continuing/updating an existing request
              (the same one in the backend), not starting a brand-new certificate. */}
          {requestData?.certificate &&
            requestData.certificate.status !== "approved" &&
            requestData.certificate.status !== "rejected" && (
              <div className="flex items-start gap-2 rounded-[6px] border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                <FilePlus2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p>
                  {t("fitness.continuing_pre")}{" "}
                  <span className="font-semibold text-foreground">
                    {requestData.certificate.status}
                  </span>{" "}
                  {t("fitness.continuing_request_word")}{" "}
                  <span className="font-semibold text-foreground">
                    {requestData.certificate.certificate_number}
                  </span>
                  . {t("fitness.continuing_post")}
                </p>
              </div>
            )}
          {stepContent()}
        </div>

        <div className="flex items-center justify-between px-4 sm:px-5 py-4 bg-muted/30 border-t border-border/40">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? goTo(currentStep - 1) : undefined}
            disabled={currentStep === 0}
            className="border-border/60 text-xs font-bold h-8 px-3 rounded-[6px] hover:bg-muted/50"
          >
            {t("fitness.back_button")}
          </Button>
          <span className="text-xs font-medium text-muted-foreground/80">
            {t("fitness.step_of", { current: currentStep + 1, total: FORM_STEPS.length })}
          </span>
          <Button
            onClick={handleNext}
            disabled={isSaving || submitMutation.isPending}
            className="text-primary-foreground text-xs font-bold bg-primary hover:bg-primary/90 min-w-[110px] h-8 px-3 rounded-[6px] shadow-sm hover:shadow"
          >
            {(isSaving || submitMutation.isPending) && (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            )}
            {isLast ? t("fitness.submit_request") : t("fitness.save_and_next")}
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
  const { t } = useTranslation();
  const { data, isLoading } = useGetPatientCertificates();
  const withdrawMutation = useWithdrawCertificate();

  const certs = data?.certificates ?? []; 
  const hasDraftOrPending = certs.some((c) => c.status === "draft" || c.status === "pending");

  const handleWithdraw = () => {
    if (!confirm(t("fitness.withdraw_confirm"))) return;
    withdrawMutation.mutate(undefined, {
      onSuccess: () => toast.success(t("fitness.withdraw_success")),
      onError: (err) => toast.error(err.message || t("fitness.withdraw_failed")),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5 space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[6px] border border-border/60 bg-card p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-24 bg-muted rounded-[6px]" />
                <div className="h-5 w-16 bg-muted rounded-full" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 w-full bg-muted rounded-[6px]" />
                <div className="h-4 w-2/3 bg-muted rounded-[6px]" />
              </div>
              <div className="h-9 w-full bg-muted rounded-[6px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-[13px] font-medium text-foreground/70">{t("fitness.no_certificates_title")}</p>
        <p className="text-[11px] text-muted-foreground max-w-[260px]">
          {t("fitness.no_certificates_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5 space-y-3">
      {hasDraftOrPending && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[6px] border border-amber-500/30 bg-amber-500/10 text-xs font-medium">
          <p className="text-amber-700 dark:text-amber-400">{t("fitness.active_request_notice")}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
            className="h-8 text-xs font-bold gap-1.5 px-3 rounded-[6px] border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            {withdrawMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {t("fitness.withdraw_action")}
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
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("request");

  const { data: certsData } = useGetPatientCertificates();
  const certCount = certsData?.certificates?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "request", label: t("fitness.tab_new_request"), icon: FilePlus2 },
    { id: "certificates", label: t("fitness.tab_my_certificates"), icon: ClipboardList, badge: certCount },
  ];

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("fitness.page_title")}
          subtitle={t("fitness.page_subtitle")}
        />

        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="rounded-[6px] border border-border/80 bg-card overflow-hidden shadow-lg flex flex-col min-h-[560px]">
            <div className="flex items-center border-b border-border/60 bg-muted/20 px-3 sm:px-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all duration-200 -mb-px",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">
                      {tab.id === "request" ? t("fitness.tab_request_short") : t("fitness.tab_certificates_short")}
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
