import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateOnly, toLocalDateInputValue } from "@/lib/date";
  import {RichTextarea,
  RichTextRenderer,
  prepareRichTextForSave,
} from "@/components/ui/rich-textarea";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Clock,
  ShieldCheck,
  XCircle,
  Eye,
  Search,
  ChevronRight,
  User,
  Activity,
  HeartPulse,
  AlertTriangle,
  Check,
  X,
  QrCode,
  Download,
  ArrowLeft,
  CalendarDays,
  Stethoscope,
  BookOpen,
  Pencil,
  Loader2,
  Ban,
  FileText,
  Video,
  CreditCard,
  Briefcase,
} from "lucide-react";
import {
  useGetCertificates,
  useGetCertificate,
  useUpdateCertificate,
  useRejectCertificate,
  useRevokeCertificate,
  useSignCertificate,
  useDownloadCertificate,
  useCreateConfirmationSession,
  useConfirmIdentity,
  type Certificate,
  type CertStatus,
  type CertDecision,
  STATUS_DISPLAY,
  DECISION_LABELS,
  getJobTypeLabel,
  getActiveRedFlags,
  canMakeDecision,
  canSign,
} from "@/hooks/doctor/use-doctor-certificates";
import { toast } from "sonner";
import { useCallContext } from "@/context/CallContext";
import { startInAppCallFromJoin } from "@/lib/scheduled-call";
import { t } from "i18next";

 
const FILTER_TABS: { id: CertStatus | "all"; label: string }[] = [
  { id: "all", label: "fitness.status_all" },
  { id: "pending", label: "fitness.status_pending" },
  { id: "in_review", label: "fitness.status_in_review" },
  { id: "draft", label: "fitness.status_draft" },
  { id: "issued", label: "fitness.status_issued"},
  { id: "approved", label: "fitness.status_approved" },
  { id: "rejected", label: "fitness.status_rejected" },
  { id: "revoked", label: "fitness.status_revoked" },
];

const DECISION_OPTIONS: { value: CertDecision; labelKey: string }[] = [
  { value: "fit", labelKey: "pages.doctor.cert_decision_fit" },
  { value: "temporarily_unfit", labelKey: "pages.doctor.cert_decision_temporarily_unfit" },
  { value: "needs_physical_exam", labelKey: "pages.doctor.cert_decision_needs_physical_exam" },
  { value: "referred", labelKey: "pages.doctor.cert_decision_referred" },
];

const PURPOSE_LABELS: Record<string, string> = {
  general_fitness: "pages.doctor.cert_purpose_general_fitness",
  school_work: "pages.doctor.cert_purpose_school_work",
  return_to_work: "pages.doctor.cert_purpose_return_to_work",
  fitness_for_travel: "pages.doctor.cert_purpose_fitness_for_travel",
  other: "pages.doctor.cert_purpose_other",
};

const JOB_FLAGS = [
  { key: "job_heavy_labor", labelKey: "pages.doctor.job_heavy_labor" },
  { key: "job_driving_machinery", labelKey: "pages.doctor.job_driving_machinery" },
  { key: "job_armed_forces", labelKey: "pages.doctor.job_armed_forces" },
  { key: "job_mining_construction", labelKey: "pages.doctor.job_mining_construction" },
  { key: "job_requires_xray", labelKey: "pages.doctor.job_requires_xray" },
  { key: "job_none_of_above", labelKey: "pages.doctor.job_none_of_above" },
] as const;

const RED_FLAG_ROWS = [
  { key: "red_flag_chest_pain", labelKey: "pages.doctor.cert_red_flag_chest_pain" },
  { key: "red_flag_shortness_of_breath", labelKey: "pages.doctor.cert_red_flag_shortness_of_breath" },
  { key: "red_flag_syncope", labelKey: "pages.doctor.cert_red_flag_syncope" },
  { key: "red_flag_severe_headache", labelKey: "pages.doctor.cert_red_flag_severe_headache" },
  { key: "red_flag_neurological", labelKey: "pages.doctor.cert_red_flag_neurological" },
  { key: "red_flag_weight_loss", labelKey: "pages.doctor.cert_red_flag_weight_loss" },
  { key: "red_flag_cardiac_history", labelKey: "pages.doctor.cert_red_flag_cardiac_history" },
  { key: "red_flag_recent_surgery", labelKey: "pages.doctor.cert_red_flag_recent_surgery" },
  { key: "red_flag_seizure", labelKey: "pages.doctor.cert_red_flag_seizure" },
  { key: "red_flag_pregnancy_complications", labelKey: "pages.doctor.cert_red_flag_pregnancy_complications" },
] as const;

 
const fmtDate = (d: string) =>
  formatDateOnly(d, "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatId = (id: string) => id.replace(/(\d{4})(?=\d)/g, "$1 ").trim();

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getStatusMeta = (status: CertStatus) =>
  STATUS_DISPLAY[status] ?? {
    label: status ?? "Unknown",
    colorClass: "bg-slate-500/15 text-slate-600 border-slate-400/30",
    dotClass: "bg-slate-500",
  };

 
function SectionCard({
  icon: Icon,
  title,
  children,
  id,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="scroll-mt-3 rounded-[6px] border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 sm:py-3.5 border-b border-border/60 bg-muted/20">
        <div className="w-8 h-8 rounded-[6px] flex items-center justify-center bg-primary/10 shrink-0 border border-primary/10">
          <Icon size={14} className="text-primary" />
        </div>
        <h3 className="text-sm font-bold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

/** A labelled key-value row used inside detail sections */
function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-medium text-foreground",
          mono && "font-mono",
        )}
      >
        {value ?? (
          <span className="text-muted-foreground italic font-normal">-</span>
        )}
      </span>
    </div>
  );
}

/** Pill-shaped yes/no status chip */
function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border w-fit",
        ok
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/30"
          : "bg-destructive/10 text-destructive border-destructive/25",
      )}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </div>
  );
}

function BoolRow({
  label,
  value,
  redFlag,
}: {
  label: string;
  value: boolean;
  redFlag?: boolean;
}) {
  const flagged = redFlag && value;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span
        className={cn(
          "text-xs leading-snug pr-2",
          flagged ? "text-destructive font-medium" : "text-foreground",
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "flex items-center gap-1 text-[11px] font-medium shrink-0",
          value
            ? flagged
              ? "text-destructive"
              : "text-amber-600"
            : "text-muted-foreground",
        )}
      >
        {value ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3 text-emerald-500" />
        )}
        {value ? t("pages.doctor.yes") : t("pages.doctor.no")}
      </div>
    </div>
  );
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[6px] border border-border bg-muted/40 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

 // Request List Card
 
function RequestCard({
  cert,
  onOpen,
  compact,
}: {
  cert: Certificate;
  onOpen: () => void;
  compact?: boolean;
}) {
  const meta = getStatusMeta(cert.status);
  const redFlags = getActiveRedFlags(cert);
  const highRisk = !cert.job_none_of_above;

  const StatusIcon =
    cert.status === "issued"
      ? ShieldCheck
      : cert.status === "rejected" || cert.status === "revoked"
        ? XCircle
        : cert.status === "in_review"
          ? Eye
          : Clock;

  return (
    <div
      onClick={onOpen}
      className="rounded-[6px] border border-border/60 bg-card p-3 sm:p-4 flex items-start gap-3.5 cursor-pointer hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
    >
      <div
        className={cn(
          "w-12 h-12 rounded-[6px] flex items-center justify-center text-sm font-bold text-primary-foreground bg-primary border shadow-sm shrink-0",
          compact && "hidden sm:flex",
        )}
      >
        {getInitials(cert.patient_full_name)}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground leading-tight tracking-tight">
            {cert.patient_full_name}
          </span>
          <Badge
            className={cn(
              "text-[10px] font-medium rounded-full px-2 py-0 border flex items-center gap-1 h-5 shrink-0",
              meta.colorClass,
            )}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {t(`pages.doctor.cert_status_${cert.status}`)}
          </Badge>
        </div>

        {(redFlags.length > 0 || highRisk) && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {redFlags.length > 0 && (
              <Badge className="text-[10px] font-medium rounded-full px-2 py-0 border h-4 bg-destructive/15 text-destructive border-destructive/25 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {t("pages.doctor.red_flags_count", { count: redFlags.length })}
              </Badge>
            )}
            {highRisk && (
              <Badge className="text-[10px] font-medium rounded-full px-2 py-0 border h-4 bg-amber-500/15 text-amber-600 border-amber-400/30 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {t("pages.doctor.high_risk")}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground">
            {cert.certificate_number}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            · {PURPOSE_LABELS[cert.purpose] ? t(PURPOSE_LABELS[cert.purpose]) : cert.purpose}
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground mt-0.5">
          {fmtDate(cert.created_at)}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
    </div>
  );
}

 // Skeleton Request Card
 
function SkeletonRequestCard({ compact }: { compact?: boolean }) {
  return (
    <div className="rounded-[6px] border border-border/60 bg-card p-3 sm:p-4 flex items-start gap-3.5 shadow-sm">
      <Skeleton
        className={cn(
          "w-12 h-12 rounded-[6px] shrink-0",
          compact && "hidden sm:block"
        )}
      />
      <div className="flex-1 min-w-0 pt-0.5 space-y-2">
        <div className="flex items-start gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-1.5 mt-1">
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24 hidden sm:block" />
        </div>
        <Skeleton className="h-3 w-24 mt-0.5" />
      </div>
      <Skeleton className="h-4 w-4 shrink-0 mt-0.5 rounded-[6px]" />
    </div>
  );
}
 // Detail View
 
 // Workflow stepper - guides the doctor through each step and scrolls to it
 
function scrollToAnchor(anchor: string) {
  document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function CertStepper({ cert }: { cert: Certificate }) {
  const terminal = cert.status === "rejected" || cert.status === "revoked";
  const issued = cert.is_signed || cert.status === "issued";

  const steps = [
    { label: t("pages.doctor.step_request"), anchor: "cert-sec-patient", done: true, hint: t("pages.doctor.step_hint_review_request") },
    {
      label: t("pages.doctor.step_identity"),
      anchor: "cert-sec-identity",
      done: cert.identity_verified_via_video,
      hint: t("pages.doctor.step_hint_verify_identity"),
    },
    { label: t("pages.doctor.step_decision"), anchor: "cert-sec-decision", done: !!cert.decision, hint: t("pages.doctor.step_hint_record_decision") },
    { label: t("pages.doctor.step_sign_issue"), anchor: "cert-sec-decision", done: issued, hint: t("pages.doctor.step_hint_sign_issue") },
  ];
  const activeIndex = terminal || issued ? -1 : steps.findIndex((s) => !s.done);

  return (
    <div className="rounded-[6px] border border-border/60 bg-card px-3 sm:px-4 py-3">
      <div className="flex items-center">
        {steps.map((s, i) => {
          const state = s.done ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <React.Fragment key={s.label}>
              <button
                type="button"
                onClick={() => scrollToAnchor(s.anchor)}
                className="flex flex-col items-center gap-1 shrink-0"
                title={t("pages.doctor.go_to_step", { step: s.label })}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-colors",
                    state === "done"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : state === "active"
                        ? "bg-primary/15 border-primary text-primary ring-2 ring-primary/20"
                        : "bg-muted border-border text-muted-foreground",
                  )}
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    state === "pending" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1.5 sm:mx-2 rounded -mt-4",
                    s.done ? "bg-emerald-500/60" : "bg-border",
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {terminal ? (
        <p className="mt-2.5 text-[11px] font-medium text-destructive capitalize">
          {t("pages.doctor.request_was_status", { status: t(`pages.doctor.cert_status_${cert.status}`) })}
        </p>
      ) : activeIndex >= 0 ? (
        <p className="mt-2.5 text-[11px] text-muted-foreground">
          {t("pages.doctor.next")}: {" "}
          <button
            type="button"
            onClick={() => scrollToAnchor(steps[activeIndex].anchor)}
            className="text-primary font-semibold hover:underline"
          >
            {steps[activeIndex].hint}
          </button>
        </p>
      ) : (
        <p className="mt-2.5 text-[11px] font-medium text-emerald-600">
          {t("pages.doctor.certificate_issued_steps_complete")}
        </p>
      )}
    </div>
  );
}

function RequestDetail({
  certId,
  onBack,
}: {
  certId: number;
  onBack: () => void;
}) {
  const { data: cert, isLoading, isError } = useGetCertificate(certId);

  const updateMut = useUpdateCertificate(certId);
  const rejectMut = useRejectCertificate(certId);
  const revokeMut = useRevokeCertificate(certId);
  const signMut = useSignCertificate(certId);
  const downloadMut = useDownloadCertificate();
  const sessionMut = useCreateConfirmationSession(certId);
  const confirmIdentityMut = useConfirmIdentity(certId);
  const { startCall } = useCallContext();

  // Create the video confirmation session, then open the SAME in-app
  // ConsultationRoom the consultations use (the response is the WebRTC token
  // shape: doctor_token + ice_servers). The patient is notified by SMS.
  const handleStartVerification = () => {
    sessionMut.mutate(undefined, {
      onSuccess: (res) => { 
        const started = startInAppCallFromJoin(
          startCall,
          { token: res.doctor_token, room_url: res.room_url },
          { isOwner: true },
        );
        if (started) {
          toast.success(t("pages.doctor.verification_call_started"));
        } else if (res.room_url) {
          window.open(res.room_url, "_blank", "noopener,noreferrer");
        } else {
          toast.error(t("pages.doctor.verification_session_open_failed"));
        }
      },
      onError: (err) =>
        toast.error((err as Error)?.message || t("pages.doctor.verification_session_start_failed")),
    });
  };

  const handleConfirmIdentity = () => {
    confirmIdentityMut.mutate(undefined, {
      onSuccess: () =>
        toast.success(t("pages.doctor.identity_confirmed_can_sign")),
      onError: (err) =>
        toast.error((err as Error)?.message || t("pages.doctor.identity_confirm_failed")),
    });
  };

  const [decision, setDecision] = useState<CertDecision | "">("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (cert) {
      setDecision(cert.decision ?? "");
      setDoctorNotes(cert.doctor_notes ?? "");
      // Default validity to one year out when none is set yet.
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      setValidUntil(cert.valid_until?.slice(0, 10) ?? toLocalDateInputValue(oneYear));
    }
  }, [cert?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm font-medium text-foreground">
            {t("pages.doctor.certificate_load_failed")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("pages.doctor.please_try_again")}
          </p>
        </div>
      </div>
    );
  }

  const meta = getStatusMeta(cert.status);
  const redFlags = getActiveRedFlags(cert);
  const highRisk = !cert.job_none_of_above;
  const isIssued = cert.status === "issued";
  const decidable = canMakeDecision(cert);
  const signable = canSign(cert);

  const StatusIcon =
    cert.status === "issued"
      ? ShieldCheck
      : cert.status === "rejected" || cert.status === "revoked"
        ? XCircle
        : cert.status === "in_review"
          ? Eye
          : Clock;

  const handleSaveDecision = () => {
    if (!decision) return;
    const cleanedDoctorNotes = prepareRichTextForSave(doctorNotes);

    updateMut.mutate(
      {
        decision: decision as CertDecision,
        doctor_notes: cleanedDoctorNotes,
        // A fit decision needs an expiry; send it for any decision that has one.
        valid_until: validUntil || undefined,
      },
      {
        onSuccess: ({ certificate, red_flags_found, requires_inperson }) => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
          setDecision(certificate.decision ?? "");
          setDoctorNotes(certificate.doctor_notes ?? cleanedDoctorNotes ?? "");
          // Surface what the backend flagged so the doctor knows why signing may
          // be blocked (these gate the sign step per the API rules).
          if (red_flags_found && red_flags_found.length > 0) {
            toast.warning(t("pages.doctor.red_flags_found", { flags: red_flags_found.join(", ") }));
          } else if (requires_inperson) {
            toast.warning(t("pages.doctor.requires_inperson_cannot_sign"));
          } else {
            toast.success(t("pages.doctor.decision_saved"));
          }
        },
        onError: (err) => toast.error((err as Error)?.message || t("pages.doctor.decision_save_failed")),
      },
    );
  };

  const handleReject = () => {
    if (rejectReason.trim().length < 10) return;
    rejectMut.mutate(
      { reason: rejectReason },
      { onSuccess: () => setShowReject(false) },
    );
  };

  const handleRevoke = () => {
    if (revokeReason.trim().length < 10) return;
    revokeMut.mutate(
      { reason: revokeReason },
      { onSuccess: () => setShowRevoke(false) },
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
     
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-7 text-xs border-border gap-1.5 shrink-0"
          >
            <ArrowLeft className="h-3 w-3" /> {t("common.back")}
          </Button>
          <div className="flex-1 min-w-0 sm:flex-none">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">
                {cert.patient_full_name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                {cert.certificate_number}
              </span>
              <Badge
                className={cn(
                  "text-[10px] font-medium rounded-full px-2.5 border flex items-center gap-1",
                  meta.colorClass,
                )}
              >
                <StatusIcon className="h-2.5 w-2.5" />
                {t(`pages.doctor.cert_status_${cert.status}`)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 sm:ml-auto shrink-0 flex-wrap">
          {isIssued && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-border gap-1.5"
                onClick={() => downloadMut.mutate(cert.id)}
                disabled={downloadMut.isPending}
              >
                {downloadMut.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                {t("pages.doctor.download")}
              </Button>
              {cert.qr_code && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-border gap-1.5"
                  onClick={() => window.open(cert.qr_code!, "_blank")}
                >
                  <QrCode className="h-3 w-3" /> {t("pages.doctor.qr_code")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
                onClick={() => setShowRevoke(true)}
              >
                <Ban className="h-3 w-3" /> {t("pages.doctor.revoke")}
              </Button>
            </>
          )}

        </div>
      </div>

      {/*  Scrollable body   */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/*   Workflow stepper  */}
        <CertStepper cert={cert} />

        {/*   Cannot-sign warning  */}
        {decidable && decision === "fit" && !signable && (
          <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-blue-400/30 bg-blue-500/10">
            <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>{t("pages.doctor.cannot_sign_yet")} </strong>
              {!cert.identity_verified_via_video &&
                t("pages.doctor.identity_not_verified_video")}
              {cert.has_red_flags && t("pages.doctor.active_red_flags_must_resolve")}
              {cert.requires_inperson && t("pages.doctor.inperson_exam_required")}
            </p>
          </div>
        )}

        {/*  Red-flag / high-risk alerts  */}
        {(redFlags.length > 0 || highRisk) && (
          <div className="flex flex-col gap-2">
            {redFlags.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-destructive/30 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  <strong>{t("pages.doctor.red_flag_symptoms")}:</strong> {redFlags.join(", ")}.
                  {" "}{t("pages.doctor.physical_exam_may_be_required")}
                </p>
              </div>
            )}
            {highRisk && (
              <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-amber-400/40 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>{t("pages.doctor.high_risk_job_type")}:</strong> {getJobTypeLabel(cert)}.
                  {" "}{t("pages.doctor.typically_requires_inperson_exam")}
                </p>
              </div>
            )}
          </div>
        )}

        {/*1. Patient Information  */}
        <SectionCard id="cert-sec-patient" icon={User} title={t("pages.doctor.patient_information")}>
          <div className="flex items-center gap-3 mb-1 pb-3 border-b border-border">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
              {getInitials(cert.patient_full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {cert.patient_full_name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("pages.doctor.internal_id", { id: cert.patient_id })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label={t("pages.doctor.national_id")}
              value={
                cert.patient_national_id
                  ? formatId(cert.patient_national_id)
                  : null
              }
              mono
            />
            <InfoRow label={t("pages.doctor.contact")} value={cert.patient_contact} />
            <InfoRow
              label={t("pages.doctor.consent_given")}
              value={
                <StatusChip
                  ok={cert.consent_given}
                  label={cert.consent_given ? t("pages.doctor.consent_given") : t("pages.doctor.no_consent")}
                />
              }
            />
            <InfoRow
              label={t("pages.doctor.identity_verified_via_video")}
              value={
                <StatusChip
                  ok={cert.identity_verified_via_video}
                  label={
                    cert.identity_verified_via_video
                      ? t("pages.doctor.verified")
                      : t("pages.doctor.not_verified")
                  }
                />
              }
            />
          </div>
        </SectionCard>

        {/*   2. Certificate Details   */}
        <SectionCard icon={CalendarDays} title={t("pages.doctor.certificate_details")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label={t("pages.doctor.certificate_number")}
              value={cert.certificate_number}
              mono
            />
            <InfoRow
              label={t("pages.doctor.status")}
              value={
                <Badge
                  className={cn(
                    "text-[11px] font-medium rounded-full px-2.5 border flex items-center gap-1 w-fit",
                    meta.colorClass,
                  )}
                >
                  <StatusIcon className="h-2.5 w-2.5" />
                  {t(`pages.doctor.cert_status_${cert.status}`)}
                </Badge>
              }
            />
            <InfoRow
              label={t("pages.doctor.purpose")}
              value={PURPOSE_LABELS[cert.purpose] ? t(PURPOSE_LABELS[cert.purpose]) : cert.purpose}
            />
            {cert.purpose_other && (
              <InfoRow label={t("pages.doctor.purpose_details")} value={cert.purpose_other} />
            )}
            <InfoRow label={t("pages.doctor.current_step")} value={String(cert.current_step)} />
            <InfoRow
              label={t("pages.doctor.appointment_id")}
              value={String(cert.appointment_id)}
            />
            <InfoRow
              label={t("pages.doctor.requires_inperson")}
              value={
                <StatusChip
                  ok={!cert.requires_inperson}
                  label={cert.requires_inperson ? t("pages.doctor.required") : t("pages.doctor.not_required")}
                />
              }
            />
            <InfoRow
              label={t("pages.doctor.signed")}
              value={
                <StatusChip
                  ok={cert.is_signed}
                  label={cert.is_signed ? t("pages.doctor.signed") : t("pages.doctor.not_signed")}
                />
              }
            />
            {cert.signed_at && (
              <InfoRow label={t("pages.doctor.signed_at")} value={fmtDateTime(cert.signed_at)} />
            )}
            {cert.valid_until && (
              <InfoRow label={t("pages.doctor.valid_until")} value={fmtDate(cert.valid_until)} />
            )}
            <InfoRow label={t("pages.doctor.created")} value={fmtDateTime(cert.created_at)} />
            <InfoRow
              label={t("pages.doctor.last_updated")}
              value={fmtDateTime(cert.updated_at)}
            />
            {cert.reviewed_at && (
              <InfoRow
                label={t("pages.doctor.reviewed_at")}
                value={fmtDateTime(cert.reviewed_at)}
              />
            )}
          </div>
        </SectionCard>

        {/*  3. Fees   */}
        <SectionCard icon={CreditCard} title={t("pages.doctor.fees")}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <VitalChip
              label={t("pages.doctor.initial_fee_paid")}
              value={String(cert.initial_fee_paid)}
            />
            <VitalChip
              label={t("pages.doctor.actual_fee_paid")}
              value={String(cert.actual_fee_paid)}
            />
          </div>
        </SectionCard>

        {/*  4. Job Type */}
        <SectionCard icon={Briefcase} title={t("pages.doctor.job_type")}>
          <div>
            {JOB_FLAGS.map(({ key, labelKey }) => (
              <BoolRow
                key={key}
                label={t(labelKey)}
                value={
                  (cert as unknown as Record<string, boolean>)[key] ?? false
                }
              />
            ))}
          </div>
        </SectionCard>

        {/*   5. Vitals */}
        <SectionCard icon={HeartPulse} title={t("pages.doctor.reported_vitals")}>
          {cert.vitals_available ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cert.temperature && (
                <VitalChip label={t("pages.doctor.temp_c")} value={cert.temperature} />
              )}
              {cert.blood_pressure && (
                <VitalChip label={t("pages.doctor.blood_pressure")} value={cert.blood_pressure} />
              )}
              {cert.pulse && (
                <VitalChip label={t("pages.doctor.pulse_bpm")} value={cert.pulse} />
              )}
              {cert.oxygen_saturation && (
                <VitalChip label={t("pages.doctor.oxygen_sat")} value={cert.oxygen_saturation} />
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {t("pages.doctor.no_vitals_reported")}
            </p>
          )}
        </SectionCard>

        {/*  6. Red Flag Assessment   */}
        <SectionCard icon={Activity} title={t("pages.doctor.red_flag_assessment")}>
          <div className="mb-3">
            <StatusChip
              ok={!cert.has_red_flags}
              label={
                cert.has_red_flags ? t("pages.doctor.red_flags_present") : t("pages.doctor.no_red_flags_found")
              }
            />
          </div>
          <div>
            {RED_FLAG_ROWS.map(({ key, labelKey }) => (
              <BoolRow
                key={key}
                label={t(labelKey)}
                value={
                  (cert as unknown as Record<string, boolean>)[key] ?? false
                }
                redFlag
              />
            ))}
          </div>
        </SectionCard>

        {/*   7. Video Confirmation   */}
        <SectionCard id="cert-sec-identity" icon={Video} title={t("pages.doctor.video_confirmation")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label={t("pages.doctor.confirmation_session")}
              value={
                cert.confirmation_session ? (
                  <span className="text-emerald-600 font-medium text-xs">
                    {t("pages.doctor.active")}
                  </span>
                ) : null
              }
            />
            <InfoRow
              label={t("pages.doctor.confirmation_requested_at")}
              value={
                cert.confirmation_requested_at
                  ? fmtDateTime(cert.confirmation_requested_at)
                  : null
              }
            />
          </div>

          {/*   Video verification actions  */}
          {!isIssued && (
            <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartVerification}
                disabled={sessionMut.isPending}
                className="flex-1 h-9 text-xs gap-1.5"
              >
                {sessionMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Video className="h-3.5 w-3.5" />
                )}
                {cert.confirmation_session ? t("pages.doctor.rejoin_verification_call") : t("pages.doctor.start_video_verification")}
              </Button>

              <Button
                size="sm"
                onClick={handleConfirmIdentity}
                disabled={
                  confirmIdentityMut.isPending || cert.identity_verified_via_video
                }
                className="flex-1 h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {confirmIdentityMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                {cert.identity_verified_via_video ? t("pages.doctor.identity_verified") : t("pages.doctor.confirm_identity")}
              </Button>
            </div>
          )}
        </SectionCard>

        {/*   8. Documents   */}
        <SectionCard icon={FileText} title={t("pages.doctor.documents")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label={t("pages.doctor.qr_code")}
              value={
                cert.qr_code ? (
                  <a
                    href={cert.qr_code}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2 text-xs"
                  >
                    {t("pages.doctor.view_qr_code")}
                  </a>
                ) : null
              }
            />
            <InfoRow
              label="PDF"
              value={
                cert.pdf_url ? (
                  <a
                    href={cert.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2 text-xs"
                  >
                    {t("pages.doctor.view_pdf")}
                  </a>
                ) : null
              }
            />
          </div>
        </SectionCard>

        {/*   9. Patient notes   */}
        {cert.patient_notes && (
          <SectionCard icon={BookOpen} title={t("pages.doctor.patient_notes")}>
            <RichTextRenderer value={cert.patient_notes} className="text-xs text-foreground" />
          </SectionCard>
        )}

        {/*   10. Doctor's Decision  */}
        <SectionCard
          id="cert-sec-decision"
          icon={Stethoscope}
          title={decidable ? t("pages.doctor.doctors_decision") : t("pages.doctor.review_summary")}
        >
          {decidable ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("pages.doctor.decision")}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DECISION_OPTIONS.map(( value ) => (
                    console.log("Decision option:", value.key),
                    <button
                      key={value.value}
                      type="button"
                      onClick={() => setDecision(value.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-all",
                        decision === value.value
                          ? value.value === "fit"
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : value.value === "temporarily_unfit"
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-destructive text-destructive-foreground border-destructive"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {t(value.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("pages.doctor.doctors_notes_optional")}
                </Label>
                <RichTextarea
                  value={doctorNotes}
                  onChange={setDoctorNotes}
                  placeholder={t("pages.doctor.clinical_observations_placeholder")}
                  minHeight={130}
                  editorClassName="text-xs"
                />
              </div>

              {decision === "fit" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("pages.doctor.valid_until")}
                  </Label>
                  <Input
                    type="date"
                    value={validUntil}
                    min={toLocalDateInputValue()}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="h-9 text-xs w-full sm:w-52"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleSaveDecision}
                  disabled={!decision || updateMut.isPending}
                  className={cn(
                    "text-xs gap-2 transition-all",
                    saved
                      ? "bg-emerald-500 text-white hover:bg-emerald-500"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {saved ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> {t("pages.doctor.saved")}
                    </>
                  ) : updateMut.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("pages.doctor.saving")}
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" /> {t("pages.doctor.save_decision")}
                    </>
                  )}
                </Button>

                {signable && (
                  <Button
                    onClick={() =>
                      signMut.mutate(undefined, {
                        onSuccess: () =>
                          toast.success(t("pages.doctor.certificate_signed_issued")),
                        onError: (err) =>
                          toast.error(
                            (err as Error)?.message ||
                            t("pages.doctor.certificate_sign_failed"),
                          ),
                      })
                    }
                    disabled={signMut.isPending}
                    className="text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {signMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    {t("pages.doctor.sign_issue_certificate")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("pages.doctor.decision")}:
                </span>
                <Badge
                  className={cn(
                    "text-[11px] font-medium rounded-full px-3 border",
                    cert.decision === "fit"
                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-400/30"
                      : cert.decision === "temporarily_unfit"
                        ? "bg-amber-500/15 text-amber-600 border-amber-400/30"
                        : "bg-destructive/15 text-destructive border-destructive/25",
                  )}
                >
                  {cert.decision
                    ? t(`pages.doctor.cert_decision_${cert.decision}`)
                    : t("pages.doctor.no_decision")}
                </Badge>
              </div>
              {cert.doctor_notes && (
                <RichTextRenderer value={cert.doctor_notes} className="text-xs text-foreground" />
              )}
              {cert.reviewed_at && (
                <p className="text-[10px] text-muted-foreground">
                  {t("pages.doctor.reviewed_on", { date: fmtDateTime(cert.reviewed_at) })}
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/*  Reject form  */}
        {showReject && (
          <SectionCard icon={XCircle} title={t("pages.doctor.reject_certificate")}>
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder={t("pages.doctor.reject_reason_placeholder")}
                className="w-full rounded-[6px] border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs gap-1.5"
                  onClick={handleReject}
                  disabled={
                    rejectReason.trim().length < 10 || rejectMut.isPending
                  }
                >
                  {rejectMut.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {t("pages.doctor.confirm_rejection")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowReject(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {/*  Revoke form   */}
        {showRevoke && (
          <SectionCard icon={Ban} title={t("pages.doctor.revoke_certificate")}>
            <div className="space-y-3">
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                placeholder={t("pages.doctor.revoke_reason_placeholder")}
                className="w-full rounded-[6px] border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs gap-1.5"
                  onClick={handleRevoke}
                  disabled={
                    revokeReason.trim().length < 10 || revokeMut.isPending
                  }
                >
                  {revokeMut.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {t("pages.doctor.confirm_revocation")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowRevoke(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

 
function DoctorFitnessCertificates() {
  const { t, i18n } = useTranslation();

  type CertFilter = CertStatus | "all" | "action" | "high_risk" | "declined";
  const [activeFilter, setActiveFilter] = useState<CertFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: certificates = [], isLoading } = useGetCertificates();

  const isAction = (c: Certificate) =>
    c.status === "pending" || c.status === "in_review";
  const isHighRisk = (c: Certificate) => !c.job_none_of_above;
  const isDeclined = (c: Certificate) =>
    c.status === "rejected" || c.status === "revoked";

  const filtered = certificates.filter((cert) => {
    const matchFilter =
      activeFilter === "all"
        ? true
        : activeFilter === "action"
          ? isAction(cert)
          : activeFilter === "high_risk"
            ? isHighRisk(cert)
            : activeFilter === "declined"
              ? isDeclined(cert)
              : cert.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      cert.patient_full_name.toLowerCase().includes(q) ||
      cert.certificate_number.toLowerCase().includes(q) ||
      cert.purpose.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = Object.fromEntries(
    FILTER_TABS.map(({ id }) => [
      id,
      id === "all"
        ? certificates.length
        : certificates.filter((c) => c.status === id).length,
    ]),
  ) as Record<CertStatus | "all", number>;

  // Top-line stats (each card also acts as a quick filter).
  const stats: {
    key: CertFilter;
    label: string;
    value: number;
    icon: React.ElementType;
    tone: string;
  }[] = [
    { key: "all", label: t("pages.doctor.total"), value: certificates.length, icon: ClipboardList, tone: "text-primary bg-primary/10 border-primary/15" },
    { key: "action", label: t("pages.doctor.needs_action"), value: certificates.filter(isAction).length, icon: Clock, tone: "text-amber-600 bg-amber-500/10 border-amber-400/20" },
    { key: "issued", label: t("pages.doctor.cert_status_issued"), value: certificates.filter((c) => c.status === "issued").length, icon: ShieldCheck, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-400/20" },
    { key: "declined", label: t("pages.doctor.declined"), value: certificates.filter(isDeclined).length, icon: XCircle, tone: "text-destructive bg-destructive/10 border-destructive/20" },
    { key: "high_risk", label: t("pages.doctor.high_risk"), value: certificates.filter(isHighRisk).length, icon: AlertTriangle, tone: "text-orange-600 bg-orange-500/10 border-orange-400/20" },
  ];

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t(
            "pages.doctor.fitness_certificates_title",
            "Fitness Certificates",
          )}
          subtitle={t(
            "pages.doctor.fitness_certificates_subtitle",
            "Review and manage patient certificate requests",
          )}
        />

        <div className="px-3 py-4 sm:px-6 sm:py-8">
          {/*   Stats cards (also quick filters)   */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-4">
            {stats.map(({ key, label, value, icon: Icon, tone }) => {
              const active = activeFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={cn(
                    "group flex items-center gap-3 rounded-[6px] border bg-card px-3 py-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5",
                    active ? "border-primary ring-1 ring-primary/30" : "border-border/70",
                  )}
                >
                  <span className={cn("h-9 w-9 rounded-[6px] flex items-center justify-center border shrink-0", tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-bold leading-none text-foreground tabular-nums">{value}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">{label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-[6px] border border-border/80 bg-card overflow-hidden shadow-lg flex min-h-[580px]">
            {/*   Left panel  */}
            <div
              className={cn(
                "flex flex-col border-border/60",
                selectedId !== null
                  ? "hidden sm:flex sm:w-72 sm:border-r lg:w-80 shrink-0"
                  : "flex-1",
              )}
            >
              {/* Filter tabs */}
              <div className="flex items-center border-b border-border/60 bg-muted/20 px-2 sm:px-3 overflow-x-auto">
                {FILTER_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveFilter(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap -mb-px shrink-0",
                      activeFilter === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
                    )}
                  >
                    {t(label)}
                    <span
                      className={cn(
                        "text-[10px] font-semibold rounded-full px-1.5 py-0 min-w-[18px] text-center leading-5",
                        activeFilter === id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {counts[id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="px-3 py-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("pages.doctor.search_certificates_placeholder")}
                    className="pl-8 h-8 text-xs border-border focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRequestCard key={i} compact={selectedId !== null} />
                  ))
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {t("pages.doctor.no_requests_found")}
                    </p>
                  </div>
                ) : (
                  filtered.map((cert) => (
                    <RequestCard
                      key={cert.id}
                      cert={cert}
                      onOpen={() => setSelectedId(cert.id)}
                      compact={selectedId !== null}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right panel  */}
            {selectedId !== null ? (
              <div className="flex-1 flex flex-col min-h-0">
                <RequestDetail
                  certId={selectedId}
                  onBack={() => setSelectedId(null)}
                />
              </div>
            ) : (
              <div className="hidden sm:flex flex-1 items-center justify-center text-center p-10">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Stethoscope className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {t("pages.doctor.select_request")}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {t("pages.doctor.select_request_desc")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DoctorFitnessCertificates;

