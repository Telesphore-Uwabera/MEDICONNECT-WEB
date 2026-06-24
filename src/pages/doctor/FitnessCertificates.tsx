import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_TABS: { id: CertStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_review", label: "In Review" },
  { id: "draft", label: "Draft" },
  { id: "issued", label: "Issued" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "revoked", label: "Revoked" },
];

const DECISION_OPTIONS: { value: CertDecision; label: string }[] = [
  { value: "fit", label: "Fit" },
  { value: "temporarily_unfit", label: "Temporarily unfit" },
  { value: "needs_physical_exam", label: "Needs physical examination" },
  { value: "referred", label: "Referred to nearest facility" },
];

const PURPOSE_LABELS: Record<string, string> = {
  general_fitness: "General fitness",
  school_work: "School / work fitness",
  return_to_work: "Return to work",
  fitness_for_travel: "Fitness for travel",
  other: "Other",
};

const JOB_FLAGS = [
  { key: "job_heavy_labor", label: "Heavy physical labor" },
  { key: "job_driving_machinery", label: "Driving / operating machinery" },
  { key: "job_armed_forces", label: "Armed forces" },
  { key: "job_mining_construction", label: "Mining / construction" },
  { key: "job_requires_xray", label: "Requires X-ray clearance" },
  { key: "job_none_of_above", label: "None of the above" },
] as const;

const RED_FLAG_ROWS = [
  { key: "red_flag_chest_pain", label: "Chest pain" },
  { key: "red_flag_shortness_of_breath", label: "Shortness of breath" },
  { key: "red_flag_syncope", label: "Syncope / fainting" },
  { key: "red_flag_severe_headache", label: "Severe headache" },
  { key: "red_flag_neurological", label: "Neurological symptoms" },
  { key: "red_flag_weight_loss", label: "Unexplained weight loss" },
  { key: "red_flag_cardiac_history", label: "Cardiac history" },
  { key: "red_flag_recent_surgery", label: "Recent surgery (6 mo)" },
  { key: "red_flag_seizure", label: "Seizure" },
  { key: "red_flag_pregnancy_complications", label: "Pregnancy complications" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
          <span className="text-muted-foreground italic font-normal">—</span>
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
        {value ? "Yes" : "No"}
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

// ─────────────────────────────────────────────────────────────────────────────
// Request List Card
// ─────────────────────────────────────────────────────────────────────────────

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
            {meta.label}
          </Badge>
        </div>

        {(redFlags.length > 0 || highRisk) && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {redFlags.length > 0 && (
              <Badge className="text-[10px] font-medium rounded-full px-2 py-0 border h-4 bg-destructive/15 text-destructive border-destructive/25 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                {redFlags.length} red flag{redFlags.length > 1 ? "s" : ""}
              </Badge>
            )}
            {highRisk && (
              <Badge className="text-[10px] font-medium rounded-full px-2 py-0 border h-4 bg-amber-500/15 text-amber-600 border-amber-400/30 flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                High-risk
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground">
            {cert.certificate_number}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            · {PURPOSE_LABELS[cert.purpose] ?? cert.purpose}
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

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Request Card
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Detail View
// ─────────────────────────────────────────────────────────────────────────────

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
        console.log("[Certificate] confirmation session:", res);
        const started = startInAppCallFromJoin(
          startCall,
          { token: res.doctor_token, room_url: res.room_url },
          { isOwner: true },
        );
        if (started) {
          toast.success("Verification call started — the patient has been notified by SMS.");
        } else if (res.room_url) {
          window.open(res.room_url, "_blank", "noopener,noreferrer");
        } else {
          toast.error("Could not open the verification session.");
        }
      },
      onError: (err) =>
        toast.error((err as Error)?.message || "Could not start verification session."),
    });
  };

  const handleConfirmIdentity = () => {
    confirmIdentityMut.mutate(undefined, {
      onSuccess: () =>
        toast.success("Identity confirmed. You can now sign the certificate."),
      onError: (err) =>
        toast.error((err as Error)?.message || "Could not confirm identity."),
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
      setValidUntil(cert.valid_until?.slice(0, 10) ?? oneYear.toISOString().slice(0, 10));
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
            Failed to load certificate
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Please try again.
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
    updateMut.mutate(
      {
        decision: decision as CertDecision,
        doctor_notes: doctorNotes || undefined,
        // A fit decision needs an expiry; send it for any decision that has one.
        valid_until: validUntil || undefined,
      },
      {
        onSuccess: ({ certificate, red_flags_found, requires_inperson }) => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
          setDecision(certificate.decision ?? "");
          setDoctorNotes(certificate.doctor_notes ?? "");
          // Surface what the backend flagged so the doctor knows why signing may
          // be blocked (these gate the sign step per the API rules).
          if (red_flags_found && red_flags_found.length > 0) {
            toast.warning(`Red flags found: ${red_flags_found.join(", ")}`);
          } else if (requires_inperson) {
            toast.warning("This case requires an in-person examination — it can't be signed online.");
          } else {
            toast.success("Decision saved.");
          }
        },
        onError: (err) => toast.error((err as Error)?.message || "Could not save the decision."),
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
      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-7 text-xs border-border gap-1.5 shrink-0"
          >
            <ArrowLeft className="h-3 w-3" /> Back
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
                {meta.label}
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
                Download
              </Button>
              {cert.qr_code && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-border gap-1.5"
                  onClick={() => window.open(cert.qr_code!, "_blank")}
                >
                  <QrCode className="h-3 w-3" /> QR Code
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
                onClick={() => setShowRevoke(true)}
              >
                <Ban className="h-3 w-3" /> Revoke
              </Button>
            </>
          )}

        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/* ── Cannot-sign warning ── */}
        {decidable && decision === "fit" && !signable && (
          <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-blue-400/30 bg-blue-500/10">
            <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>Cannot sign yet. </strong>
              {!cert.identity_verified_via_video &&
                "Identity not yet verified via video. "}
              {cert.has_red_flags && "Active red flags must be resolved. "}
              {cert.requires_inperson && "In-person examination required."}
            </p>
          </div>
        )}

        {/* ── Red-flag / high-risk alerts ── */}
        {(redFlags.length > 0 || highRisk) && (
          <div className="flex flex-col gap-2">
            {redFlags.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-destructive/30 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  <strong>Red flag symptoms:</strong> {redFlags.join(", ")}.
                  Physical examination may be required.
                </p>
              </div>
            )}
            {highRisk && (
              <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-amber-400/40 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>High-risk job type:</strong> {getJobTypeLabel(cert)}.
                  This typically requires an in-person examination.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 1. Patient Information ── */}
        <SectionCard icon={User} title="Patient Information">
          <div className="flex items-center gap-3 mb-1 pb-3 border-b border-border">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0">
              {getInitials(cert.patient_full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {cert.patient_full_name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Internal ID: {cert.patient_id}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label="National ID"
              value={
                cert.patient_national_id
                  ? formatId(cert.patient_national_id)
                  : null
              }
              mono
            />
            <InfoRow label="Contact" value={cert.patient_contact} />
            <InfoRow
              label="Consent given"
              value={
                <StatusChip
                  ok={cert.consent_given}
                  label={cert.consent_given ? "Consent given" : "No consent"}
                />
              }
            />
            <InfoRow
              label="Identity verified via video"
              value={
                <StatusChip
                  ok={cert.identity_verified_via_video}
                  label={
                    cert.identity_verified_via_video
                      ? "Verified"
                      : "Not verified"
                  }
                />
              }
            />
          </div>
        </SectionCard>

        {/* ── 2. Certificate Details ── */}
        <SectionCard icon={CalendarDays} title="Certificate Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label="Certificate #"
              value={cert.certificate_number}
              mono
            />
            <InfoRow
              label="Status"
              value={
                <Badge
                  className={cn(
                    "text-[11px] font-medium rounded-full px-2.5 border flex items-center gap-1 w-fit",
                    meta.colorClass,
                  )}
                >
                  <StatusIcon className="h-2.5 w-2.5" />
                  {meta.label}
                </Badge>
              }
            />
            <InfoRow
              label="Purpose"
              value={PURPOSE_LABELS[cert.purpose] ?? cert.purpose}
            />
            {cert.purpose_other && (
              <InfoRow label="Purpose details" value={cert.purpose_other} />
            )}
            <InfoRow label="Current step" value={String(cert.current_step)} />
            <InfoRow
              label="Appointment ID"
              value={String(cert.appointment_id)}
            />
            <InfoRow
              label="Requires in-person"
              value={
                <StatusChip
                  ok={!cert.requires_inperson}
                  label={cert.requires_inperson ? "Required" : "Not required"}
                />
              }
            />
            <InfoRow
              label="Signed"
              value={
                <StatusChip
                  ok={cert.is_signed}
                  label={cert.is_signed ? "Signed" : "Not signed"}
                />
              }
            />
            {cert.signed_at && (
              <InfoRow label="Signed at" value={fmtDateTime(cert.signed_at)} />
            )}
            {cert.valid_until && (
              <InfoRow label="Valid until" value={fmtDate(cert.valid_until)} />
            )}
            <InfoRow label="Created" value={fmtDateTime(cert.created_at)} />
            <InfoRow
              label="Last updated"
              value={fmtDateTime(cert.updated_at)}
            />
            {cert.reviewed_at && (
              <InfoRow
                label="Reviewed at"
                value={fmtDateTime(cert.reviewed_at)}
              />
            )}
          </div>
        </SectionCard>

        {/* ── 3. Fees ── */}
        <SectionCard icon={CreditCard} title="Fees">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <VitalChip
              label="Initial fee paid"
              value={String(cert.initial_fee_paid)}
            />
            <VitalChip
              label="Actual fee paid"
              value={String(cert.actual_fee_paid)}
            />
          </div>
        </SectionCard>

        {/* ── 4. Job Type ── */}
        <SectionCard icon={Briefcase} title="Job Type">
          <div>
            {JOB_FLAGS.map(({ key, label }) => (
              <BoolRow
                key={key}
                label={label}
                value={
                  (cert as unknown as Record<string, boolean>)[key] ?? false
                }
              />
            ))}
          </div>
        </SectionCard>

        {/* ── 5. Vitals ── */}
        <SectionCard icon={HeartPulse} title="Reported Vitals">
          {cert.vitals_available ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cert.temperature && (
                <VitalChip label="Temp (°C)" value={cert.temperature} />
              )}
              {cert.blood_pressure && (
                <VitalChip label="Blood pressure" value={cert.blood_pressure} />
              )}
              {cert.pulse && (
                <VitalChip label="Pulse (bpm)" value={cert.pulse} />
              )}
              {cert.oxygen_saturation && (
                <VitalChip label="O₂ sat (%)" value={cert.oxygen_saturation} />
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No vitals reported by patient.
            </p>
          )}
        </SectionCard>

        {/* ── 6. Red Flag Assessment ── */}
        <SectionCard icon={Activity} title="Red Flag Assessment">
          <div className="mb-3">
            <StatusChip
              ok={!cert.has_red_flags}
              label={
                cert.has_red_flags ? "Red flags present" : "No red flags found"
              }
            />
          </div>
          <div>
            {RED_FLAG_ROWS.map(({ key, label }) => (
              <BoolRow
                key={key}
                label={label}
                value={
                  (cert as unknown as Record<string, boolean>)[key] ?? false
                }
                redFlag
              />
            ))}
          </div>
        </SectionCard>

        {/* ── 7. Video Confirmation ── */}
        <SectionCard icon={Video} title="Video Confirmation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label="Confirmation session"
              value={
                cert.confirmation_session ? (
                  <span className="text-emerald-600 font-medium text-xs">
                    Active
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Confirmation requested at"
              value={
                cert.confirmation_requested_at
                  ? fmtDateTime(cert.confirmation_requested_at)
                  : null
              }
            />
          </div>

          {/* ── Video verification actions ── */}
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
                {cert.confirmation_session ? "Rejoin verification call" : "Start video verification"}
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
                {cert.identity_verified_via_video ? "Identity verified" : "Confirm identity"}
              </Button>
            </div>
          )}
        </SectionCard>

        {/* ── 8. Documents ── */}
        <SectionCard icon={FileText} title="Documents">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow
              label="QR code"
              value={
                cert.qr_code ? (
                  <a
                    href={cert.qr_code}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2 text-xs"
                  >
                    View QR code
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
                    View PDF
                  </a>
                ) : null
              }
            />
          </div>
        </SectionCard>

        {/* ── 9. Patient notes ── */}
        {cert.patient_notes && (
          <SectionCard icon={BookOpen} title="Patient Notes">
            <p className="text-xs text-foreground leading-relaxed">
              {cert.patient_notes}
            </p>
          </SectionCard>
        )}

        {/* ── 10. Doctor's Decision ── */}
        <SectionCard
          icon={Stethoscope}
          title={decidable ? "Doctor's Decision" : "Review Summary"}
        >
          {decidable ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DECISION_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDecision(value)}
                      className={cn(
                        "px-3 py-1.5 rounded-[6px] text-xs font-medium border transition-all",
                        decision === value
                          ? value === "fit"
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : value === "temporarily_unfit"
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-destructive text-destructive-foreground border-destructive"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Doctor's notes (optional)
                </Label>
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  rows={3}
                  placeholder="Clinical observations, recommendations, or reason for referral…"
                  className="w-full rounded-[6px] border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {decision === "fit" && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Valid until
                  </Label>
                  <Input
                    type="date"
                    value={validUntil}
                    min={new Date().toISOString().slice(0, 10)}
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
                      <Check className="h-3.5 w-3.5" /> Saved
                    </>
                  ) : updateMut.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" /> Save decision
                    </>
                  )}
                </Button>

                {signable && (
                  <Button
                    onClick={() =>
                      signMut.mutate(undefined, {
                        onSuccess: () =>
                          toast.success("Certificate signed and issued."),
                        onError: (err) =>
                          toast.error(
                            (err as Error)?.message ||
                            "Could not sign the certificate.",
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
                    Sign & issue certificate
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Decision:
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
                    ? DECISION_LABELS[cert.decision]
                    : "No decision"}
                </Badge>
              </div>
              {cert.doctor_notes && (
                <p className="text-xs text-foreground leading-relaxed">
                  {cert.doctor_notes}
                </p>
              )}
              {cert.reviewed_at && (
                <p className="text-[10px] text-muted-foreground">
                  Reviewed on {fmtDateTime(cert.reviewed_at)}
                </p>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Reject form ── */}
        {showReject && (
          <SectionCard icon={XCircle} title="Reject Certificate">
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Reason for rejection (min 10 characters)…"
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
                  Confirm rejection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowReject(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Revoke form ── */}
        {showRevoke && (
          <SectionCard icon={Ban} title="Revoke Certificate">
            <div className="space-y-3">
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                placeholder="Reason for revocation (min 10 characters)…"
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
                  Confirm revocation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowRevoke(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

function DoctorFitnessCertificates() {
  const { t, i18n } = useTranslation();

  const [activeFilter, setActiveFilter] = useState<CertStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: certificates = [], isLoading } = useGetCertificates();

  const filtered = certificates.filter((cert) => {
    const matchFilter = activeFilter === "all" || cert.status === activeFilter;
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

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t(
            "pages.doctor.fitness_certificates.title",
            "Fitness Certificates",
          )}
          subtitle={t(
            "pages.doctor.fitness_certificates.subtitle",
            "Review and manage patient certificate requests",
          )}
        />

        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="rounded-[6px] border border-border/80 bg-card overflow-hidden shadow-lg flex min-h-[580px]">
            {/* ── Left panel ── */}
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
                    {label}
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
                    placeholder="Search by name, cert # or purpose…"
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
                      No requests found.
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

            {/* ── Right panel ── */}
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
                    Select a request
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Click any request on the left to review it and issue a
                    decision.
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
