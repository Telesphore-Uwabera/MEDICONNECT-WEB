// components/DoctorCard.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Star,
  MapPin,
  Clock,
  Wifi,
  BriefcaseMedical,
  Zap,
  Maximize2,
  Globe,
  Video,
  Building2,
  X,
  ShieldCheck,
  Languages,
  BadgeCheck,
  FileText,
  CalendarCheck,
  User,
  ChevronRight,
  ChevronLeft,
  Minus,
  ArrowUpRight,
  RotateCcw,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingDialog } from "@/components/BookingDialog";
import { ConnectDialogContent } from "@/components/ConnectDialog";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";
import type {
  ApiDoctor,
  ApiDoctorHospital,
  ApiDoctorSpecialization,
} from "@/hooks/patient/use-patient-doctor";
import { readConsultSession } from "@/hooks/patient/se-consultation-session";
import { Card } from "./ui/card";
import { RichTextRenderer } from "./ui/rich-textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "details" | "connect";

// ─── Avatar ───────────────────────────────────────────────────────────────────
// Unchanged — internal to the modal/card system, out of scope for this pass.

function DoctorAvatar({
  doctor,
  size = "sm",
}: {
  doctor: ApiDoctor;
  size?: "sm" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const initials = doctor.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizeClass =
    size === "lg" ? "h-full w-full text-2xl sm:text-3xl" : "h-full w-full text-sm";
  if (!doctor.image || imgError) {
    return (
      <div
        className={cn(
          sizeClass,
          "rounded-[inherit] bg-primary/10 text-primary flex items-center justify-center font-bold select-none",
        )}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={doctor.image}
      alt={doctor.user.name}
      className="h-full w-full object-cover rounded-[inherit]"
      onError={() => setImgError(true)}
    />
  );
}

// ─── Consultation badge ───────────────────────────────────────────────────────
// Unchanged — shared with UnifiedModal, out of scope for this pass.

function ConsultBadge({ type }: { type: ApiDoctor["consultation_type"] }) {
  const map = {
    online: {
      label: "Online",
      icon: Video,
      cls: "text-sky-700 bg-sky-500/15 border-sky-500/30 dark:text-sky-400",
    },
    in_person: {
      label: "In-Person",
      icon: Building2,
      cls: "text-violet-700 bg-violet-500/15 border-violet-500/30 dark:text-violet-400",
    },
    both: {
      label: "Online & In-Person",
      icon: Globe,
      cls: "text-teal-700 bg-teal-500/15 border-teal-500/30 dark:text-teal-400",
    },
  };
  const cfg = map[type] ?? map.both;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-[6px] border",
        cfg.cls,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

// ─── Detail row (compact card variant, used inside a responsive grid) ─────────
// Unchanged — lives inside UnifiedModal, out of scope for this pass.

function DetailRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-[6px] border border-border/40 bg-card/60">
      <div
        className={cn(
          "mt-0.5 flex-shrink-0 w-7 h-7 rounded-[6px] flex items-center justify-center",
          accent ? "bg-primary/10" : "bg-muted/60",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            accent ? "text-primary" : "text-muted-foreground",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground leading-snug truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Quick stat (used in the sidebar) ──────────────────────────────────────────
// Unchanged — lives inside UnifiedModal, out of scope for this pass.

function QuickStat({
  icon,
  top,
  bot,
}: {
  icon: React.ReactNode;
  top: React.ReactNode;
  bot: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-2.5 bg-background/60 rounded-[6px] border border-border/40">
      <div className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-muted/60 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground leading-tight truncate">
          {top}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight">{bot}</p>
      </div>
    </div>
  );
}

// ─── Resume Pill ──────────────────────────────────────────────────────────────
// Unchanged — out of scope for this pass.

function ResumePill({
  doctorName,
  phase,
  onResume,
  onEndCompletely,
}: {
  doctorName: string;
  phase: string;
  onResume: () => void;
  onEndCompletely: () => void;
}) {
  const isLive = phase === "connected";
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button
        onClick={onEndCompletely}
        title="End call completely"
        className="h-8 w-8 rounded-full bg-destructive/90 hover:bg-destructive text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        onClick={onResume}
        className={cn(
          "flex items-center gap-2.5 pl-3 pr-4 h-10 rounded-full shadow-xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
          isLive
            ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-400/30 text-white"
            : "bg-card border-border text-foreground hover:bg-muted",
        )}
      >
        {isLive && (
          <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
        )}
        <span className="text-sm font-semibold leading-none truncate max-w-[120px]">
          {isLive ? "Live · " : ""}
          {doctorName}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Saved Session Pill ───────────────────────────────────────────────────────
// Unchanged — out of scope for this pass.

function SavedSessionPill({
  doctorName,
  onResume,
  onDismiss,
}: {
  doctorName: string;
  onResume: () => void;
  onDismiss: () => void;
}) {
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button
        onClick={onDismiss}
        title="Dismiss"
        className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 border border-border text-muted-foreground flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>
      <button
        onClick={onResume}
        className="flex items-center gap-2.5 pl-3 pr-4 h-10 rounded-full shadow-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 text-violet-700 dark:text-violet-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <RotateCcw className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold leading-none truncate max-w-[130px]">
          Resume · {doctorName}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Unified Modal ────────────────────────────────────────────────────────────
// Unchanged — out of scope for this pass (card-only restyle, per your call).

interface UnifiedModalProps {
  doctor: ApiDoctor;
  callDoctor: Doctor;
  initialMode: ModalMode;
  open: boolean;
  onMinimize: () => void;
  onCloseCompletely: () => void;
  onBook: () => void;
  canBook: boolean;
  canConnect: boolean;
}

export function UnifiedModal({
  doctor,
  callDoctor,
  initialMode,
  open,
  onMinimize,
  onCloseCompletely,
  onBook,
  canBook,
  canConnect,
}: UnifiedModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    } else {
      setCancelFn(null);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (mode !== "connect") setCancelFn(null);
  }, [mode]);

  if (!open) return null;

  const fee = parseFloat(doctor.consultation_fee);
  const rating = parseFloat(doctor.rating_avg);
  const feeLabel =
    fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

  const status: "online" | "busy" | "offline" =
    doctor.is_available && !doctor.bookings_paused
      ? "online"
      : doctor.bookings_paused
        ? "busy"
        : "offline";

  const statusStyles = {
    online: {
      dot: "bg-emerald-500",
      pulse: "animate-pulse",
      label: "Available",
      text: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    busy: {
      dot: "bg-amber-500",
      pulse: "",
      label: "Paused",
      text: "text-amber-600",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    offline: {
      dot: "bg-zinc-400",
      pulse: "",
      label: "Unavailable",
      text: "text-muted-foreground",
      bg: "bg-muted border-border",
    },
  };
  const s = statusStyles[status];
  const langMap: Record<string, string> = {
    en: "English",
    fr: "French",
    kiny: "Kinyarwanda",
  };
  const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;
  const bio = doctor.bio_en || doctor.bio_fr || doctor.bio_kiny || null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onMinimize}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-full",
            mode === "connect" ? "max-w-[420px]" : "max-w-3xl",
            "bg-card/80 backdrop-blur-2xl border border-border/60 rounded-[6px] shadow-2xl",
            "flex flex-col max-h-[90dvh] overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-200",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {mode === "connect" && (
                <button
                  onClick={() => setMode("details")}
                  className="h-6 w-6 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                  title="Back to details"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm font-semibold text-foreground/70 truncate">
                {mode === "details" ? doctor.user.name : "Instant consultation"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {mode === "connect" && cancelFn && (
                <button
                  onClick={cancelFn}
                  title="Cancel request completely"
                  className="h-7 px-2 rounded-[6px] flex items-center gap-1 text-xs font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Ban className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              )}
              <button
                onClick={onMinimize}
                title="Minimize (keep session alive)"
                className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={mode === "connect" ? onMinimize : onCloseCompletely}
                title={
                  mode === "connect" ? "Minimize (keep session alive)" : "Close"
                }
                className={cn(
                  "h-7 w-7 rounded-[6px] flex items-center justify-center transition-all",
                  mode === "connect"
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode === "details" ? (
            <>
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                <div className="md:w-[260px] flex-shrink-0 border-b md:border-b-0 md:border-r border-border/50 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent overflow-y-auto">
                  <div className="p-4 flex flex-col items-center text-center">
                    <div className="w-28 h-28 rounded-[6px] overflow-hidden border border-border/50 shadow-sm flex-shrink-0">
                      <DoctorAvatar doctor={doctor} size="lg" />
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                      <h2 className="text-base font-semibold text-foreground leading-tight">
                        {doctor.user.name}
                      </h2>
                      {doctor.verified_at && (
                        <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    {doctor.is_featured && (
                      <span className="mt-1 px-1.5 py-px text-[10px] font-semibold rounded-[6px] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                        Featured
                      </span>
                    )}
                    <p className="text-xs text-primary font-medium mt-1">
                      {doctor.specialization}
                      {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
                    </p>
                    {doctor.designations && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {doctor.designations}
                      </p>
                    )}

                    <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px] border",
                          s.text,
                          s.bg,
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full flex-shrink-0",
                            s.dot,
                            s.pulse,
                          )}
                        />
                        {s.label}
                      </span>
                      {doctor.instant_consultation && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-bold rounded-[6px] bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                          <Zap className="h-3 w-3" />
                          Instant
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <ConsultBadge type={doctor.consultation_type} />
                    </div>

                    <div className="w-full mt-4 space-y-1.5 text-left">
                      <QuickStat
                        icon={
                          <Star
                            className={cn(
                              "h-4 w-4",
                              rating > 0
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40",
                            )}
                          />
                        }
                        top={rating > 0 ? rating.toFixed(1) : "New"}
                        bot="Rating"
                      />
                      <QuickStat
                        icon={
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        }
                        top={feeLabel}
                        bot="Per visit"
                      />
                      <QuickStat
                        icon={
                          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                        }
                        top={
                          doctor.instant_consultation ? "Instant" : "Scheduled"
                        }
                        bot="Consult"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 min-w-0">
                  {bio && (
                    <div className="mb-4 p-3 rounded-[6px] bg-muted/30 border border-border/40">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                        About
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <RichTextRenderer value={bio} className="text-xs text-foreground" />

                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {locationLabel && (
                      <DetailRow
                        icon={MapPin}
                        label="Location"
                        value={locationLabel}
                      />
                    )}
                    {doctor.medical_license && (
                      <DetailRow
                        icon={ShieldCheck}
                        label="Medical License"
                        value={doctor.medical_license}
                        accent
                      />
                    )}
                    {doctor.preferred_language && (
                      <DetailRow
                        icon={Languages}
                        label="Language"
                        value={
                          langMap[doctor.preferred_language] ??
                          doctor.preferred_language
                        }
                      />
                    )}
                    <DetailRow
                      icon={FileText}
                      label="Agreement Status"
                      value={
                        <span
                          className={cn(
                            "capitalize text-xs font-semibold px-1.5 py-0.5 rounded-[6px] border",
                            doctor.agreement_status === "approved"
                              ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                              : "text-amber-600 bg-amber-500/10 border-amber-500/20",
                          )}
                        >
                          {doctor.agreement_status}
                        </span>
                      }
                    />
                    <DetailRow
                      icon={User}
                      label="Profile Status"
                      value={
                        <span
                          className={cn(
                            "capitalize text-xs font-semibold px-1.5 py-0.5 rounded-[6px] border",
                            doctor.is_active
                              ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                              : "text-zinc-500 bg-muted border-border",
                          )}
                        >
                          {doctor.is_active ? "Active" : "Inactive"}
                        </span>
                      }
                    />
                    {doctor.verified_at && (
                      <DetailRow
                        icon={BadgeCheck}
                        label="Verified"
                        accent
                        value={new Date(doctor.verified_at).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      />
                    )}
                  </div>

                  {doctor.hospitals && doctor.hospitals.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                        Hospitals
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {doctor.hospitals.map(
                          (h: ApiDoctorHospital, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-2 rounded-[6px] border border-border/40 bg-muted/20"
                            >
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-foreground font-medium truncate">
                                {h.name}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {doctor.specializations &&
                    doctor.specializations.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                          Specializations
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {doctor.specializations.map(
                            (sp: ApiDoctorSpecialization, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs font-medium rounded-[6px] bg-primary/8 text-primary border border-primary/20"
                              >
                                {sp.name}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 flex items-center justify-end gap-2 bg-card/80">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canBook}
                  onClick={() => {
                    onMinimize();
                    onBook();
                  }}
                  className="w-[40%] sm:w-auto sm:px-6 h-9 text-xs font-semibold rounded-[6px]"
                >
                  <CalendarCheck className="h-4 w-4 mr-1.5" />
                  Book Appointment
                </Button>
                {canConnect && (
                  <Button
                    size="sm"
                    onClick={() => setMode("connect")}
                    className="w-[40%] sm:w-auto sm:px-6 h-9 text-xs font-semibold rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Wifi className="h-4 w-4 mr-1.5" />
                    Connect Now
                  </Button>
                )}
              </div>
            </>
          ) : (
            <ConnectDialogContent
              doctor={callDoctor}
              onMinimize={onMinimize}
              onCloseCompletely={onCloseCompletely}
              onRegisterCancel={(fn) => setCancelFn(() => fn)}
            />
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Main DoctorCard ──────────────────────────────────────────────────────────
// Restyled: the doctor image is now a full-width banner at the top of the
// card (h-44 / sm:h-52) instead of a small h-12 inline avatar. Status dot and
// "Featured" badge float on top of the image as pills. Everything else —
// name, specialization, location, consult badge, divider, buttons, pills,
// modal — is unchanged in content, only reflowed to sit below the image.

export const DoctorCard = ({
  doctor: doctorProp,
  compact = false,
}: {
  doctor: ApiDoctor;
  compact?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const [bookOpen, setBookOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<ModalMode>("details");
  const call = useCallStore();

  const [doctor, setDoctor] = useState<ApiDoctor>(doctorProp);

  const [hasSavedSession, setHasSavedSession] = useState(
    () => !!readConsultSession(doctorProp.id),
  );
  const [savedSessionPillDismissed, setSavedSessionPillDismissed] =
    useState(false);

  useEffect(() => {
    if (modalOpen) return;

    const check = () => {
      const exists = !!readConsultSession(doctor.id);
      setHasSavedSession(exists);
      if (exists) setSavedSessionPillDismissed(false);
    };

    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [modalOpen, doctor.id]);

  if (!bookOpen && doctorProp !== doctor && doctorProp.id === doctor.id) {
    setDoctor(doctorProp);
  }

  const handleDoctorUpdated = (updatedDoctor: ApiDoctor) =>
    setDoctor(updatedDoctor);

  const fee = parseFloat(doctor.consultation_fee);
  const rating = parseFloat(doctor.rating_avg);
  const feeLabel =
    fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

  const status: "online" | "busy" | "offline" =
    doctor.is_available && !doctor.bookings_paused
      ? "online"
      : doctor.bookings_paused
        ? "busy"
        : "offline";

  const statusStyles = {
    online: {
      dot: "bg-emerald-500",
      pulse: "animate-pulse",
      label: "Available",
      text: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    busy: {
      dot: "bg-amber-500",
      pulse: "",
      label: "Paused",
      text: "text-amber-600",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    offline: {
      dot: "bg-zinc-400",
      pulse: "",
      label: "Unavailable",
      text: "text-muted-foreground",
      bg: "bg-muted border-border",
    },
  };
  const s = statusStyles[status];

  const callDoctor: Doctor = {
    id: doctor.id,
    user: {
      id: doctor.user.id,
      name: doctor.user.name,
      avatar: doctor.user.avatar,
    },
    specialization: doctor.specialization,
  };

  const isThisDoctor = call.doctor?.id === doctor.id;
  const isCallInProgress =
    isThisDoctor && call.phase !== "idle" && call.phase !== "ended";
  const isConnected = isThisDoctor && call.phase === "connected";

  const canConnect =
    doctor.is_available &&
    !doctor.bookings_paused &&
    doctor.instant_consultation;
  const canBook = doctor.is_available && !doctor.bookings_paused;

  const showResumePill = isCallInProgress && !modalOpen && !bookOpen;

  const showSavedSessionPill =
    hasSavedSession &&
    !isCallInProgress &&
    !modalOpen &&
    !bookOpen &&
    !savedSessionPillDismissed;

  const openDetails = () => {
    setInitialMode("details");
    setModalOpen(true);
  };

  const openConnect = () => {
    if (!canConnect) return;
    setInitialMode("connect");
    setModalOpen(true);
  };

  const openResume = () => {
    setInitialMode("connect");
    setModalOpen(true);
  };

  const handleMinimize = () => setModalOpen(false);

  const handleCloseCompletely = () => {
    setModalOpen(false);
    setHasSavedSession(false);
    if (isCallInProgress) call.endCall();
  };

  const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;

  return (
    <>
      {/* ── Card ── */}
      <Card
        onClick={openDetails}
        className="rounded-[6px] overflow-hidden border-border/60 hover:shadow-md hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 cursor-pointer"
      >
        <div className="px-3.5 pt-3 pb-3">
          {/* Top row — avatar enlarged from h-12 to h-20 (h-24 on sm+),
              same row layout as before, just a bigger image. */}
          <div className="flex items-start gap-3 ">
            <div className="relative shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[6px] overflow-hidden border border-border">
                <DoctorAvatar doctor={doctor} size="lg" />
              </div>
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card",
                  s.dot,
                  s.pulse,
                )}
              />
            </div>

            <div className=" flex flex-col justify-between flex-1 min-w-0  h-[70px]">
              <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                {doctor.user.name}
              </h3>
              <p className="text-xs text-primary font-medium mt-0.5 truncate">

                {doctor.doctor_degree ? `  ${doctor.doctor_degree}` : ""}
              </p>
              {doctor.specialization && (
                <p className="mt-1 capitalize text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <BriefcaseMedical className="h-3.5 w-3.5 shrink-0" />
                  {doctor.specialization}
                </p>
              )}
            </div>
          </div>

          {!compact && (
            <div className="mt-3 flex  items-center justify-between">
              <ConsultBadge type={doctor.consultation_type} />
              <span className="flex cursor-pointer  items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                View details <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          )}

          <div className="mt-3 border-t border-border" />

          {/* Bottom actions */}
          <div
            className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left hint */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Call in progress
                  </span>
                </>
              ) : isCallInProgress ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    Connecting…
                  </span>
                </>
              ) : hasSavedSession ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                    Queue session saved
                  </span>
                </>
              ) : (
                <><Zap className={cn("h-4 w-4 shrink-0", doctor.instant_consultation ? "text-emerald-500" : "text-muted-foreground/50")} />
                  <span className={cn("text-[10px] font-bold tracking-tight", doctor.instant_consultation ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70")}>
                    {doctor.instant_consultation ? "Usually replies in 2 min" : "Replies within 24h"}
                  </span></>
              )}
            </div>

            {/* Right buttons — rounded-[6px] + h-8 to match the
                Book / Connect button sizing used on HospitalCard */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canBook || isCallInProgress}
                onClick={() =>
                  canBook && !isCallInProgress && setBookOpen(true)
                }
                className="h-9 px-10 text-xs font-medium rounded-[6px] border-border"
              >
                {t("pages.cards.book")}
              </Button>

              {hasSavedSession && !isCallInProgress ? (
                <Button size="sm" onClick={openResume}
                  className="h-8 px-3 text-xs font-bold rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all">
                  <Wifi className="h-3.5 w-3.5 mr-1.5" />Join
                </Button>
              ) : canConnect ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (isCallInProgress || isConnected) {
                      setInitialMode("connect");
                      setModalOpen(true);
                    } else {
                      openConnect();
                    }
                  }}
                  className={cn(
                    "h-8 px-3 text-xs font-bold rounded-[6px] shadow-sm hover:shadow transition-all",
                    isConnected || isCallInProgress
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground",
                  )}>
                  {isConnected || isCallInProgress
                    ? <><Wifi className="h-3.5 w-3.5 mr-1.5" />Join</>
                    : <><Wifi className="h-3.5 w-3.5 mr-1.5" />{t("pages.cards.connect")}</>}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  className="h-8 px-3 text-xs font-semibold rounded-[6px] opacity-50 cursor-not-allowed border border-border bg-muted"
                >
                  {s.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Live-call resume pill ── (unchanged) */}
      {showResumePill && (
        <ResumePill
          doctorName={doctor.user.name}
          phase={call.phase}
          onResume={() => {
            setInitialMode("connect");
            setModalOpen(true);
          }}
          onEndCompletely={handleCloseCompletely}
        />
      )}

      {/* ── Saved-session pill ── (unchanged) */}
      {showSavedSessionPill && (
        <SavedSessionPill
          doctorName={doctor.user.name}
          onResume={openResume}
          onDismiss={() => setSavedSessionPillDismissed(true)}
        />
      )}

      {/* ── Unified modal ── (unchanged) */}
      <UnifiedModal
        doctor={doctor}
        callDoctor={callDoctor}
        initialMode={initialMode}
        open={modalOpen}
        onMinimize={handleMinimize}
        onCloseCompletely={handleCloseCompletely}
        onBook={() => setBookOpen(true)}
        canBook={canBook}
        canConnect={canConnect}
      />

      {/* ── Booking dialog ── (unchanged) */}
      <BookingDialog
        doctor={doctor}
        open={bookOpen}
        onOpenChange={setBookOpen}
        onConfirmed={handleDoctorUpdated}
      />
    </>
  );
};