import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  AlertCircle,
  XCircle,
  Loader2,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  User,
  Stethoscope,
  Activity,
  ClipboardCheck,
  ChevronRight,
  Calendar,
  Shield,
  Briefcase,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Zap,
} from "lucide-react";

import {
  useDownloadCertificate,
  useJoinConfirmationSession,
  isDownloadPaymentRequired,
  isDownloadReady,
  type Certificate,
  type DownloadPaymentRequired,
  type CertificateAnswer,
} from "@/hooks/patient/use-patient-certificates";
import { useCallContext } from "@/context/CallContext";
import { startInAppCallFromJoin } from "@/lib/scheduled-call";
import { Video } from "lucide-react";

import PaymentPanel from "./Paymentpanel";

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeCls: string; icon: React.ElementType; dotCls: string }
> = {
  draft: {
    label: "Draft",
    badgeCls: "bg-muted/60 text-muted-foreground border-border",
    icon: Clock,
    dotCls: "bg-muted-foreground",
  },
  pending: {
    label: "Pending Review",
    badgeCls: "bg-amber-500/10 text-amber-600 border-amber-500/25",
    icon: Clock,
    dotCls: "bg-amber-500",
  },
  in_review: {
    label: "In Review",
    badgeCls: "bg-blue-500/10 text-blue-600 border-blue-500/25",
    icon: Eye,
    dotCls: "bg-blue-500",
  },
  approved: {
    label: "Approved",
    badgeCls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
    icon: CheckCircle2,
    dotCls: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    badgeCls: "bg-destructive/10 text-destructive border-destructive/25",
    icon: XCircle,
    dotCls: "bg-destructive",
  },
};

function CertStatusBadge({ status }: { status: string }) {
  const cfg =
    STATUS_CONFIG[status] ?? {
      label: status,
      badgeCls: "bg-muted/20 text-muted-foreground border-border",
      icon: Clock,
      dotCls: "bg-muted-foreground",
    };
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] sm:text-xs font-bold border",
        cfg.badgeCls,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dotCls)} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function purposeLabel(purpose: string) {
  return purpose.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer — detail view
// ─────────────────────────────────────────────────────────────────────────────

function DrawerSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="pl-8 space-y-2">{children}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-3 min-w-0">
      <span className="text-[11px] text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-[11px] font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function RedFlagRow({ label, triggered }: { label: string; triggered?: boolean }) {
  if (!triggered) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
      {label}
    </div>
  );
}

function AnswerItem({ answer }: { answer: CertificateAnswer }) {
  const q = answer.question?.question_en ?? answer.question_key ?? answer.field ?? "";
  const a = answer.answer ?? (answer.boolean_answer ? "Yes" : "No");
  const isYes = a === "Yes" || answer.boolean_answer;
  const isRedFlag = answer.triggered_red_flag || answer.question?.is_red_flag;

  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground leading-snug flex-1">{q}</span>
      <span
        className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0",
          isYes && isRedFlag
            ? "bg-destructive/10 text-destructive"
            : isYes
              ? "bg-amber-500/10 text-amber-600"
              : "bg-muted text-muted-foreground",
        )}
      >
        {a}
      </span>
    </div>
  );
}

function CertificateDrawer({
  cert,
  open,
  onClose,
}: {
  cert: Certificate;
  open: boolean;
  onClose: () => void;
}) {
  const step2Answers = cert.answers?.filter((a) => a.step === 2) ?? [];
  const step3Answers = cert.answers?.filter((a) => a.step === 3) ?? [];

  const redFlags = [
    { key: "red_flag_chest_pain", label: "Chest pain" },
    { key: "red_flag_shortness_of_breath", label: "Shortness of breath" },
    { key: "red_flag_syncope", label: "Syncope / fainting" },
    { key: "red_flag_severe_headache", label: "Severe headache" },
    { key: "red_flag_neurological", label: "Neurological symptoms" },
    { key: "red_flag_weight_loss", label: "Unexplained weight loss" },
    { key: "red_flag_cardiac_history", label: "Cardiac history" },
    { key: "red_flag_recent_surgery", label: "Recent surgery" },
    { key: "red_flag_seizure", label: "Seizure" },
    { key: "red_flag_pregnancy_complications", label: "Pregnancy complications" },
  ] as const;

  const activeRedFlags = redFlags.filter((f) => cert[f.key]);

  const jobFlags = [
    { key: "job_heavy_labor", label: "Heavy labor" },
    { key: "job_driving_machinery", label: "Driving / machinery" },
    { key: "job_armed_forces", label: "Armed forces" },
    { key: "job_mining_construction", label: "Mining / construction" },
    { key: "job_requires_xray", label: "Requires X-ray" },
  ] as const;

  const activeJobFlags = jobFlags.filter((f) => cert[f.key]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[640px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground truncate">
                {cert.certificate_number || `Certificate #${cert.id}`}
              </span>
              <CertStatusBadge status={cert.status} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Issued {fmt(cert.created_at)}
              {cert.valid_until && ` · Valid until ${fmt(cert.valid_until)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Decision banner */}
          {cert.decision && (
            <div
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-[12px] font-medium",
                cert.decision === "fit"
                  ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-700"
                  : "bg-destructive/8 border-destructive/25 text-destructive",
              )}
            >
              <Shield className="h-4 w-4 flex-shrink-0" />
              Medical decision:{" "}
              <strong className="capitalize">{cert.decision.replace(/_/g, " ")}</strong>
            </div>
          )}

          {/* Doctor notes */}
          {cert.doctor_notes && (
            <div className="px-3.5 py-2.5 rounded-xl border border-border bg-muted/30 text-[11px] text-muted-foreground italic leading-relaxed">
              "{cert.doctor_notes}"
              {cert.doctor && (
                <span className="block mt-1 not-italic font-medium text-foreground/70">
                  — Dr. {cert.doctor.name}
                </span>
              )}
            </div>
          )}

          {/* Red flags alert */}
          {activeRedFlags.length > 0 && (
            <div className="px-3.5 py-3 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Red flags detected
              </div>
              {activeRedFlags.map((f) => (
                <RedFlagRow key={f.key} label={f.label} triggered />
              ))}
            </div>
          )}

          {/* Request details */}
          <DrawerSection icon={FileText} title="Request details">
            <DataRow label="Purpose" value={purposeLabel(cert.purpose)} />
            {cert.purpose_other && <DataRow label="Other" value={cert.purpose_other} />}
            <DataRow
              label="In-person required"
              value={cert.requires_inperson ? "Yes" : "No"}
            />
            <DataRow label="Submitted" value={fmt(cert.created_at)} />
            {cert.updated_at && <DataRow label="Last updated" value={fmt(cert.updated_at)} />}
          </DrawerSection>

          {/* Job context */}
          {activeJobFlags.length > 0 && (
            <DrawerSection icon={Briefcase} title="Job context">
              <div className="flex flex-wrap gap-1.5">
                {activeJobFlags.map((f) => (
                  <span
                    key={f.key}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </DrawerSection>
          )}

          {/* Vitals */}
          {cert.vitals_available && (
            <DrawerSection icon={Activity} title="Vitals">
              <div className="grid grid-cols-2 gap-2">
                {cert.temperature && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                    <Thermometer className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Temp</p>
                      <p className="text-[12px] font-semibold text-foreground">{cert.temperature}°C</p>
                    </div>
                  </div>
                )}
                {cert.blood_pressure && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                    <Heart className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">BP</p>
                      <p className="text-[12px] font-semibold text-foreground">{cert.blood_pressure}</p>
                    </div>
                  </div>
                )}
                {cert.pulse && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                    <Zap className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Pulse</p>
                      <p className="text-[12px] font-semibold text-foreground">{cert.pulse} bpm</p>
                    </div>
                  </div>
                )}
                {cert.oxygen_saturation && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                    <Wind className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">SpO₂</p>
                      <p className="text-[12px] font-semibold text-foreground">{cert.oxygen_saturation}%</p>
                    </div>
                  </div>
                )}
              </div>
            </DrawerSection>
          )}

          {/* Reviewing doctor */}
          {cert.doctor && (
            <DrawerSection icon={User} title="Reviewing doctor">
              <div className="flex items-center gap-2.5">
                {cert.doctor.avatar ? (
                  <img
                    src={cert.doctor.avatar}
                    alt={cert.doctor.name}
                    className="w-8 h-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-primary">
                      {cert.doctor.name.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="text-[12px] font-medium text-foreground">{cert.doctor.name}</span>
              </div>
            </DrawerSection>
          )}

          {/* Symptom answers */}
          {step2Answers.length > 0 && (
            <DrawerSection icon={Stethoscope} title="Symptoms screening">
              <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                <div className="divide-y divide-border/50 px-3">
                  {step2Answers.map((a) => (
                    <AnswerItem key={a.id ?? a.question_key} answer={a} />
                  ))}
                </div>
              </div>
            </DrawerSection>
          )}

          {/* Medical history answers */}
          {step3Answers.length > 0 && (
            <DrawerSection icon={ClipboardCheck} title="Medical history">
              <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                <div className="divide-y divide-border/50 px-3">
                  {step3Answers.map((a) => (
                    <AnswerItem key={a.id ?? a.question_key} answer={a} />
                  ))}
                </div>
              </div>
            </DrawerSection>
          )}

          {/* Patient notes */}
          {cert.patient_notes && (
            <DrawerSection icon={FileText} title="Patient notes">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {cert.patient_notes}
              </p>
            </DrawerSection>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CertificateCard — improved
// ─────────────────────────────────────────────────────────────────────────────

export function CertificateCard({ cert }: { cert: Certificate }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [downloadPhase, setDownloadPhase] = useState<
    "idle" | "loading" | "payment" | "verifying"
  >("idle");
  const [downloadPayment, setDownloadPayment] = useState<DownloadPaymentRequired | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRefreshingDownloadInvoice, setIsRefreshingDownloadInvoice] = useState(false);

  const downloadMutation = useDownloadCertificate();
  const isApproved = cert.status === "approved";

  // ── Video identity verification (join the doctor's session) ────────────────
  const { startCall } = useCallContext();
  const joinSession = useJoinConfirmationSession(cert.id);
  // Show while a review is in progress and identity hasn't been verified yet.
  const canVerify =
    (cert.status === "pending" || cert.status === "in_review") &&
    !cert.identity_verified_via_video;

  const handleJoinVerification = () => {
    joinSession.mutate(undefined, {
      onSuccess: (res) => {
        console.log("[Certificate] patient verification session:", res);
        const token = res.patient_token ?? res.token ?? res.doctor_token;
        const started = startInAppCallFromJoin(
          startCall,
          { token, room_name: res.room_name, room_url: res.room_url, join_url: res.join_url },
          { isOwner: false },
        );
        if (started) {
          toast.success("Joining the verification call…");
          return;
        }
        const url = res.join_url || res.room_url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast.error("The verification call isn't ready yet. Please wait for your doctor to start it.");
      },
      onError: (err) =>
        toast.error((err as Error)?.message || "Could not join the verification call."),
    });
  };

  const handleDownload = async () => {
    setDownloadPhase("loading");
    setErrorMsg(null);
    try {
      const res = await downloadMutation.mutateAsync(cert.id);
      if (isDownloadReady(res)) {
        window.open(res.url, "_blank");
        setDownloadPhase("idle");
      } else if (isDownloadPaymentRequired(res)) {
        setDownloadPayment(res);
        setDownloadPhase("payment");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Download failed. Please try again.");
      setDownloadPhase("idle");
    }
  };

  const handleDownloadPaymentConfirmed = useCallback(async () => {
    setDownloadPhase("loading");
    setDownloadPayment(null);
    try {
      const res = await downloadMutation.mutateAsync(cert.id);
      if (isDownloadReady(res)) {
        window.open(res.url, "_blank");
      } else {
        toast.error("Download not ready yet. Please try again in a moment.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadPhase("idle");
    }
  }, [cert.id, downloadMutation]);

  const handleRefreshDownloadInvoice = useCallback(async () => {
    setIsRefreshingDownloadInvoice(true);
    try {
      const res = await downloadMutation.mutateAsync(cert.id);
      if (isDownloadReady(res)) {
        window.open(res.url, "_blank");
        setDownloadPhase("idle");
        setDownloadPayment(null);
      } else if (isDownloadPaymentRequired(res)) {
        setDownloadPayment(res);
      }
    } finally {
      setIsRefreshingDownloadInvoice(false);
    }
  }, [cert.id, downloadMutation]);

  const handleDownloadPayInitiate = useCallback(async () => {
    const res = await downloadMutation.mutateAsync(cert.id);
    if (isDownloadReady(res)) {
      window.open(res.url, "_blank");
      setDownloadPhase("idle");
      setDownloadPayment(null);
      throw new Error("Download already available.");
    }
    if (isDownloadPaymentRequired(res)) {
      setDownloadPayment(res);
      return { public_key: res.public_key, invoice_number: res.invoice_number };
    }
    throw new Error("Could not prepare download.");
  }, [cert.id, downloadMutation]);

  const stepCount = cert.current_step ?? 0;
  const totalSteps = 4;
  const progressPct = Math.min((stepCount / totalSteps) * 100, 100);

  return (
    <>
      <div className="border border-border/60 rounded-[16px] overflow-hidden bg-card hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
        {/* Progress bar for draft */}
        {cert.status === "draft" && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary/60 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Main card body */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            {/* Left icon */}
            <div
              className={cn(
                "w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0 border shadow-sm",
                isApproved
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : cert.status === "rejected"
                    ? "bg-destructive/10 border-destructive/20"
                    : "bg-primary/8 border-primary/15",
              )}
            >
              <FileText
                className={cn(
                  "h-5 w-5",
                  isApproved
                    ? "text-emerald-600"
                    : cert.status === "rejected"
                      ? "text-destructive"
                      : "text-primary",
                )}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-bold text-foreground tracking-tight truncate">
                    {cert.certificate_number || `Certificate #${cert.id}`}
                  </p>
                  <p className="text-xs font-medium text-primary/80 capitalize mt-0.5 truncate">
                    {purposeLabel(cert.purpose)}
                    {cert.job_type && cert.job_type !== "None of the above" && (
                      <span className="text-muted-foreground/60"> · {cert.job_type}</span>
                    )}
                  </p>
                </div>
                <CertStatusBadge status={cert.status} />
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmt(cert.created_at)}
                </span>
                {cert.valid_until && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-[4px]">
                    <Shield className="h-3 w-3" />
                    Valid until {fmt(cert.valid_until)}
                  </span>
                )}
                {cert.has_red_flags && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-[4px]">
                    <AlertTriangle className="h-3 w-3" />
                    Red flags
                  </span>
                )}
                {cert.doctor && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80">
                    <User className="h-3.5 w-3.5" />
                    {cert.doctor.name}
                  </span>
                )}
              </div>

              {/* Doctor notes snippet */}
              {cert.doctor_notes && (
                <p className="text-[12px] text-muted-foreground/70 italic line-clamp-1 pt-1">
                  "{cert.doctor_notes}"
                </p>
              )}
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/40">
            {/* View details — always visible */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDrawerOpen(true)}
              className="h-8 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground px-3 rounded-[8px] hover:bg-muted/50"
            >
              <Eye className="h-4 w-4" />
              View details
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            </Button>

            <div className="flex-1" />

            {/* Join verification call — while a review is pending identity check */}
            {/* {canVerify && (
              <Button
                size="sm"
                onClick={handleJoinVerification}
                disabled={joinSession.isPending}
                className="h-8 text-xs font-bold gap-1.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow"
              >
                {joinSession.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                Join verification call
              </Button>
            )} */}

            {/* Download — only for approved */}
            {isApproved && downloadPhase === "idle" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="h-8 text-xs font-bold gap-1.5 border-border/60 hover:bg-muted/50 rounded-[8px]"
              >
                <Download className="h-4 w-4 text-primary" />
                Download PDF
              </Button>
            )}
            {isApproved && downloadPhase === "loading" && (
              <Button size="sm" variant="outline" disabled className="h-8 text-xs font-bold gap-1.5 rounded-[8px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </Button>
            )}
          </div>
        </div>

        {/* Inline error */}
        {errorMsg && (
          <div className="mx-4 mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-[11px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {errorMsg}
            <button
              onClick={() => setErrorMsg(null)}
              className="ml-auto text-destructive/60 hover:text-destructive"
            >
              <XCircle className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Download payment gate */}
        {downloadPhase === "payment" && downloadPayment && (
          <div className="border-t border-border bg-muted/20">
            <div className="px-4 pt-3 pb-0 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] font-medium text-foreground">Download fee required</p>
            </div>
            <span className="px-4  p text-[10px] text-muted-foreground">
              A one-time fee applies to download your certificate PDF
            </span>

           <div className="m-4" >
             <PaymentPanel
              title=""
              paymentInfo={downloadPayment}
              onPaymentConfirmed={handleDownloadPaymentConfirmed}
              onRefreshInvoice={handleRefreshDownloadInvoice}
              isRefreshingInvoice={isRefreshingDownloadInvoice}
              onPayInitiate={handleDownloadPayInitiate}
              onCancel={() => {
                setDownloadPayment(null);
                setDownloadPhase("idle");
              }}
              cancelLabel="Cancel download"
            />
           </div>
          </div>
        )}

        {downloadPhase === "verifying" && (
          <div className="border-t border-border bg-muted/30 px-4 py-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-[11px] text-muted-foreground">Preparing your download…</p>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <CertificateDrawer
        cert={cert}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

export default CertificateCard;
