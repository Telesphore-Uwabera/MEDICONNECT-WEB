import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useGetDoctorReferrals,
  useGetReferral,
  useCancelReferral,
  type Referral,
  type ReferralStatus,
} from "@/hooks/doctor/use-doctor-referrals";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Clock,
  Loader2,
  Phone,
  RefreshCw,
  Stethoscope,
  Trash2,
  User,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type TabStatus = ReferralStatus | "all";

const STATUS_TABS: { id: TabStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
];

const URGENCY_CONFIG = {
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400" },
  high: { label: "High", className: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400" },
  emergency: { label: "Emergency", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const STATUS_CONFIG: Record<
  ReferralStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className: "bg-muted text-muted-foreground border-border",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReferralStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide",
        cfg.className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UrgencyBadge
// ─────────────────────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency?: string }) {
  if (!urgency) return null;
  const cfg = URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG];
  if (!cfg) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide",
        cfg.className
      )}
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-sm" : "w-9 h-9 text-xs";
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-primary-foreground bg-primary border-2 border-primary/20 shrink-0 overflow-hidden",
        sizeClass
      )}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CancelConfirmDialog
// ─────────────────────────────────────────────────────────────────────────────

function CancelConfirmDialog({
  referral,
  onConfirm,
  onClose,
  isLoading,
}: {
  referral: Referral;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-[6px] border border-border bg-card shadow-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t("pages.doctor.cancel_referral_title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t("pages.doctor.cancel_referral_desc_start")} {" "}
              <span className="font-medium text-foreground">{referral.patient.name}</span>.
              {" "}{t("pages.doctor.action_cannot_be_undone")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs border-border"
          >
            {t("pages.doctor.keep_it")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
          >
            {isLoading ? (
              <><Loader2 className="h-3 w-3 animate-spin" />{t("pages.doctor.cancelling")}</>
            ) : (
              <><Trash2 className="h-3 w-3" />{t("pages.doctor.yes_cancel")}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReferralDetailDrawer
// ─────────────────────────────────────────────────────────────────────────────

function ReferralDetailDrawer({
  referralId,
  onClose,
  onCancelRequest,
}: {
  referralId: number;
  onClose: () => void;
  onCancelRequest: (r: Referral) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetReferral(referralId);
  const referral = data?.referral;

  const canCancel =
    referral && (referral.status === "pending" || referral.status === "accepted");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] flex flex-col bg-card border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t("pages.doctor.referral_details")}</span>
            {referral && (
              <span className="text-[10px] font-mono text-muted-foreground">#{referral.id}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-40 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">{t("pages.doctor.loading")}</span>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm">{t("pages.doctor.referral_details_load_failed")}</p>
            </div>
          )}

          {referral && (
            <div className="p-5 space-y-5">
              {/* Status + urgency row */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={referral.status} />
                <UrgencyBadge urgency={referral.urgency} />
              </div>

              {/* Patient */}
              <Section title={t("pages.doctor.patient")} icon={User}>
                <div className="flex items-center gap-3">
                  <Avatar name={referral.patient.name} src={referral.patient.avatar} size="lg" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{referral.patient.name}</p>
                    {referral.patient.email && (
                      <p className="text-[11px] text-muted-foreground">{referral.patient.email}</p>
                    )}
                    {referral.patient.phone && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-2.5 w-2.5" /> {referral.patient.phone}
                      </p>
                    )}
                  </div>
                </div>
              </Section>

              {/* Referral reason */}
              <Section title={t("pages.doctor.reason_for_referral")} icon={Stethoscope}>
                <p className="text-xs text-foreground leading-relaxed">{referral.reason}</p>
                {referral.notes && (
                  <div className="mt-2 rounded-[6px] bg-muted/60 border border-border px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("pages.doctor.notes")}</p>
                    <p className="text-xs text-foreground leading-relaxed">{referral.notes}</p>
                  </div>
                )}
              </Section>

              {/* Doctors */}
              {(referral.referring_doctor || referral.referred_to_doctor) && (
                <Section title={t("pages.doctor.doctors")} icon={Stethoscope}>
                  <div className="space-y-2">
                    {referral.referring_doctor && (
                      <DoctorRow label={t("pages.doctor.referring")} doctor={referral.referring_doctor} />
                    )}
                    {referral.referred_to_doctor && (
                      <DoctorRow label={t("pages.doctor.referred_to")} doctor={referral.referred_to_doctor} />
                    )}
                  </div>
                </Section>
              )}

              {/* Timeline */}
              <Section title={t("pages.doctor.timeline")} icon={Calendar}>
                <div className="space-y-1.5">
                  <InfoRow label={t("pages.doctor.referred_on")} value={formatDateTime(referral.referred_at)} />
                  {referral.updated_at && (
                    <InfoRow label={t("pages.doctor.last_updated")} value={formatDateTime(referral.updated_at)} />
                  )}
                  {referral.appointment_id && (
                    <InfoRow label={t("pages.doctor.appointment_id")} value={`#${referral.appointment_id}`} mono />
                  )}
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        {canCancel && (
          <div className="shrink-0 px-5 py-4 border-t border-border bg-card/80 backdrop-blur">
            <Button
              variant="outline"
              onClick={() => onCancelRequest(referral!)}
              className="w-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("pages.doctor.cancel_this_referral")}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Small helper sub-components ─────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function DoctorRow({
  label,
  doctor,
}: {
  label: string;
  doctor: { id: number; name: string; specialization?: string; image?: string | null };
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[6px] bg-muted/50 border border-border px-3 py-2">
      <Avatar name={doctor.name} src={doctor.image} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{label}:</span>
          <span className="text-xs font-medium text-foreground truncate">{doctor.name}</span>
        </div>
        {doctor.specialization && (
          <p className="text-[10px] text-muted-foreground truncate">{doctor.specialization}</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-[11px] font-medium text-foreground", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReferralCard
// ─────────────────────────────────────────────────────────────────────────────

function ReferralCard({
  referral,
  onClick,
}: {
  referral: Referral;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-[6px] border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 shadow-sm group"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar name={referral.patient.name} src={referral.patient.avatar} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  {referral.patient.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {referral.reason}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap mt-2.5">
              <StatusBadge status={referral.status} />
              <UrgencyBadge urgency={referral.urgency} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/60">
          {referral.referred_to_doctor && (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Stethoscope className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">
                {t("pages.doctor.to")}: <span className="text-foreground font-medium">{referral.referred_to_doctor.name}</span>
                {referral.referred_to_doctor.specialization && (
                  <> · {referral.referred_to_doctor.specialization}</>
                )}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{formatDate(referral.referred_at)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonReferralCard
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonReferralCard() {
  return (
    <div className="w-full text-left rounded-[6px] border border-border bg-card shadow-sm p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="w-full max-w-[200px]">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4 mt-1.5" />
            </div>
            <Skeleton className="h-4 w-4 shrink-0 mt-0.5" />
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/60">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ status }: { status: TabStatus }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{t("pages.doctor.no_referrals_found")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {status === "all"
            ? t("pages.doctor.no_referrals_yet")
            : t("pages.doctor.no_status_referrals", { status: t(`pages.doctor.referral_status_${status}`) })}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — MyReferrals
// ─────────────────────────────────────────────────────────────────────────────

function MyReferrals() {
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Referral | null>(null);

  // Fetch all referrals once; filter client-side so the stat cards always
  // reflect real totals regardless of the active tab.
  const { data, isLoading, isError, refetch, isFetching } = useGetDoctorReferrals();

  const cancelReferral = useCancelReferral();

  const allReferrals = data?.referrals ?? [];
  const referrals =
    activeTab === "all"
      ? allReferrals
      : allReferrals.filter((r) => r.status === activeTab);

  const countBy = (s: ReferralStatus) =>
    allReferrals.filter((r) => r.status === s).length;

  const stats: {
    key: TabStatus;
    label: string;
    value: number;
    icon: React.ElementType;
    tone: string;
  }[] = [
    { key: "all", label: t("pages.doctor.total"), value: allReferrals.length, icon: ArrowUpRight, tone: "text-primary bg-primary/10 border-primary/15" },
    { key: "pending", label: t("pages.doctor.referral_status_pending"), value: countBy("pending"), icon: Clock, tone: "text-amber-600 bg-amber-500/10 border-amber-400/20" },
    { key: "accepted", label: t("pages.doctor.referral_status_accepted"), value: countBy("accepted"), icon: CheckCircle2, tone: "text-primary bg-primary/10 border-primary/15" },
    { key: "completed", label: t("pages.doctor.referral_status_completed"), value: countBy("completed"), icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-400/20" },
    { key: "rejected", label: t("pages.doctor.referral_status_rejected"), value: countBy("rejected"), icon: XCircle, tone: "text-destructive bg-destructive/10 border-destructive/20" },
  ];

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    await cancelReferral.mutateAsync(cancelTarget.id);
    setCancelTarget(null);
    // Close drawer if the cancelled referral was open
    if (selectedId === cancelTarget.id) setSelectedId(null);
  };

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.referrals_title", "My Referrals")}
          subtitle={t("pages.doctor.referrals_sub", "Track and manage all your patient referrals")}
        />

        <div className="px-3 py-4 sm:px-6 sm:py-6 space-y-4 flex-1">

          {/* ── Stats cards (also quick filters) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {stats.map(({ key, label, value, icon: Icon, tone }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
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

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Status tabs */}
            <div className="flex items-center gap-1 bg-muted/60 rounded-[6px] p-1 overflow-x-auto shrink-0">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-[6px] text-[11px] font-semibold whitespace-nowrap transition-all duration-150",
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t(`pages.doctor.referral_status_${tab.id}`)}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs border-border gap-1.5 h-8 shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              {isFetching ? t("pages.doctor.refreshing") : t("pages.doctor.refresh")}
            </Button>
          </div>

          {/* ── Content ── */}
          {isLoading ? (
            <>
              {/* Count placeholder */}
              <Skeleton className="h-3 w-24 mb-3" />
              {/* Grid placeholder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonReferralCard key={i} />
                ))}
              </div>
            </>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm font-semibold text-foreground">{t("pages.doctor.referrals_load_failed")}</p>
              <p className="text-xs text-muted-foreground">{t("pages.doctor.check_connection_try_again")}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs mt-1">
                {t("pages.doctor.try_again")}
              </Button>
            </div>
          ) : referrals.length === 0 ? (
            <EmptyState status={activeTab} />
          ) : (
            <>
              {/* Count */}
              <p className="text-[11px] text-muted-foreground">
                {referrals.length} referral{referrals.length !== 1 ? "s" : ""}
                {activeTab !== "all" && ` · ${activeTab}`}
              </p>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {referrals.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    referral={referral}
                    onClick={() => setSelectedId(referral.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {selectedId != null && (
        <ReferralDetailDrawer
          referralId={selectedId}
          onClose={() => setSelectedId(null)}
          onCancelRequest={(r) => setCancelTarget(r)}
        />
      )}

      {/* ── Cancel Confirm ── */}
      {cancelTarget && (
        <CancelConfirmDialog
          referral={cancelTarget}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
          isLoading={cancelReferral.isPending}
        />
      )}
    </DashboardLayout>
  );
}

export default MyReferrals;
