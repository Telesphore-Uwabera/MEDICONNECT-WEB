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

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "details" | "connect";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function DoctorAvatar({
  doctor,
  size = "sm",
  rounded = true,
}: {
  doctor: ApiDoctor;
  size?: "sm" | "lg";
  rounded?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = doctor.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizeClass =
    size === "lg" ? "h-full w-full text-2xl" : "h-full w-full text-sm";
  if (!doctor.image || imgError) {
    return (
      <div
        className={cn(
          sizeClass,
          rounded && "rounded-sm",
          "bg-primary/10 text-primary flex items-center justify-center font-semibold select-none",
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
      className={cn("h-full w-full object-cover", rounded && "rounded-sm")}
      onError={() => setImgError(true)}
    />
  );
}

// ─── Consultation badge ───────────────────────────────────────────────────────

function ConsultBadge({ type }: { type: ApiDoctor["consultation_type"] }) {
  const map = {
    online: {
      label: "Online",
      icon: Video,
      cls: "text-sky-600 bg-sky-500/10 border-sky-500/20",
    },
    in_person: {
      label: "In-Person",
      icon: Building2,
      cls: "text-violet-600 bg-violet-500/10 border-violet-500/20",
    },
    both: {
      label: "Online & In-Person",
      icon: Globe,
      cls: "text-teal-600 bg-teal-500/10 border-teal-500/20",
    },
  };
  const cfg = map[type] ?? map.both;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border",
        cfg.cls,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

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
    <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-b-0">
      <div
        className={cn(
          "mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center",
          accent ? "bg-primary/10" : "bg-muted/60",
        )}
      >
        <Icon
          className={cn(
            "h-2.5 w-2.5",
            accent ? "text-primary" : "text-muted-foreground",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-[11px] font-medium text-foreground leading-relaxed">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Resume Pill ──────────────────────────────────────────────────────────────

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
        <X className="h-3.5 w-3.5" />
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
        <span className="text-[11px] font-semibold leading-none truncate max-w-[120px]">
          {isLive ? "Live · " : ""}
          {doctorName}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Saved Session Pill ───────────────────────────────────────────────────────

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
        <X className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onResume}
        className="flex items-center gap-2.5 pl-3 pr-4 h-10 rounded-full shadow-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 text-violet-700 dark:text-violet-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <RotateCcw className="h-3 w-3 shrink-0" />
        <span className="text-[11px] font-semibold leading-none truncate max-w-[130px]">
          Resume · {doctorName}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Unified Modal ────────────────────────────────────────────────────────────

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
      text: "text-emerald-700",
      bg: "bg-emerald-100 border-emerald-200",
    },
    busy: {
      dot: "bg-amber-500",
      pulse: "",
      label: "Paused",
      text: "text-amber-700",
      bg: "bg-amber-100 border-amber-200",
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
            mode === "connect" ? "max-w-[420px]" : "max-w-md",
            "bg-card border border-border/60 rounded-xl shadow-2xl",
            "flex flex-col max-h-[90dvh] overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-200",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Shared header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {mode === "connect" && (
                <button
                  onClick={() => setMode("details")}
                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                  title="Back to details"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-[11px] font-semibold text-foreground/70 truncate">
                {mode === "details" ? doctor.user.name : "Instant consultation"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {mode === "connect" && cancelFn && (
                <button
                  onClick={cancelFn}
                  title="Cancel request completely"
                  className="h-7 px-2 rounded-md flex items-center gap-1 text-[10px] font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Ban className="h-3 w-3" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              )}
              <button
                onClick={onMinimize}
                title="Minimize"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={mode === "connect" ? onMinimize : onCloseCompletely}
                title={mode === "connect" ? "Minimize" : "Close"}
                className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center transition-all",
                  mode === "connect"
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {mode === "details" ? (
            <>
              {/* Doctor header band */}
              <div className="relative bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50 px-4 pt-4 pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-sm overflow-hidden border border-border/50 shadow-sm flex-shrink-0">
                    <DoctorAvatar doctor={doctor} size="lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h2 className="text-[13px] font-semibold text-foreground leading-tight truncate">
                        {doctor.user.name}
                      </h2>
                      {doctor.is_featured && (
                        <span className="px-1 py-px text-[9px] font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 flex-shrink-0">
                          Featured
                        </span>
                      )}
                      {doctor.verified_at && (
                        <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-primary font-medium truncate">
                      {doctor.specialization}
                      {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
                    </p>
                    {doctor.designations && (
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5 truncate">
                        {doctor.designations}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-sm border",
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
                      <ConsultBadge type={doctor.consultation_type} />
                      {doctor.instant_consultation && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                          <Zap className="h-2.5 w-2.5" />
                          Instant
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {[
                    {
                      icon: (
                        <Star
                          className={cn(
                            "h-2.5 w-2.5",
                            rating > 0
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40",
                          )}
                        />
                      ),
                      top: rating > 0 ? rating.toFixed(1) : "New",
                      bot: "Rating",
                    },
                    // { icon: <Clock className="h-2.5 w-2.5 text-muted-foreground" />, top: feeLabel, bot: "Per visit" },
                    {
                      icon: (
                        <CalendarCheck className="h-2.5 w-2.5 text-muted-foreground" />
                      ),
                      top: doctor.instant_consultation
                        ? "Instant"
                        : "Scheduled",
                      bot: "Consult",
                    },
                  ].map(({ icon, top, bot }) => (
                    <div
                      key={bot}
                      className="flex flex-col items-center py-1.5 px-2 bg-background/60 rounded-sm border border-border/40"
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        {icon}
                      </div>
                      <span className="text-[11px] font-bold text-foreground leading-tight">
                        {top}
                      </span>
                      <span className="text-[9px] text-muted-foreground leading-tight">
                        {bot}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {bio && (
                  <div className="mb-3 p-2.5 rounded-sm bg-muted/30 border border-border/40">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                      About
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {bio}
                    </p>
                  </div>
                )}
                <div className="rounded-sm border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
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
                          "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
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
                          "capitalize text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border",
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
                  <div className="mt-3">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                      Hospitals
                    </p>
                    <div className="space-y-1">
                      {doctor.hospitals.map(
                        (h: ApiDoctorHospital, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 p-2 rounded-sm border border-border/40 bg-muted/20"
                          >
                            <Building2 className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-[10px] text-foreground font-medium truncate">
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
                    <div className="mt-3">
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                        Specializations
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {doctor.specializations.map(
                          (sp: ApiDoctorSpecialization, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[9px] font-medium rounded-sm bg-primary/8 text-primary border border-primary/20"
                            >
                              {sp.name}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 flex items-center gap-2 bg-card/80">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canBook}
                  onClick={() => {
                    onMinimize();
                    onBook();
                  }}
                  className="flex-1 h-9 text-[11px] font-semibold rounded-[6px]"
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                  Book Appointment
                </Button>
                {canConnect && (
                  <Button
                    size="sm"
                    onClick={() => setMode("connect")}
                    className="flex-1 h-9 text-[11px] font-semibold rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Wifi className="h-3.5 w-3.5 mr-1.5" />
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

export const DoctorCard = ({
  doctor: doctorProp,
  compact = false,
}: {
  doctor: ApiDoctor;
  compact?: boolean;
}) => {
  const { t } = useTranslation();
  const [bookOpen, setBookOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<ModalMode>("details");
  const call = useCallStore();

  const [doctor, setDoctor] = useState<ApiDoctor>(doctorProp);

  // ── Saved-session tracking ────────────────────────────────────────────────
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
      text: "text-emerald-700",
      bg: "bg-emerald-100 border-emerald-200",
    },
    busy: {
      dot: "bg-amber-500",
      pulse: "",
      label: "Paused",
      text: "text-amber-800",
      bg: "bg-amber-100 border-amber-200",
    },
    offline: {
      dot: "bg-zinc-400",
      pulse: "",
      label: "Unavailable",
      text: "text-zinc-600",
      bg: "bg-zinc-100 border-zinc-200",
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

  // ── Handlers ─────────────────────────────────────────────────────────────

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

  // ── Derived hint for footer left ──────────────────────────────────────────
  // Single source of truth — never repeats the status label from the top pill.

  const footerHint = (() => {
    if (isConnected)
      return {
        dot: (
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        ),
        text: "Call in progress",
        textCls: "text-emerald-600 font-medium",
      };
    if (isCallInProgress)
      return {
        dot: (
          <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
        ),
        text: "Connecting…",
        textCls: "text-sky-600 font-medium",
      };
    if (hasSavedSession)
      return {
        dot: <RotateCcw className="h-3 w-3 text-violet-500 shrink-0" />,
        text: "Queue saved",
        textCls: "text-violet-600 dark:text-violet-400 font-medium",
      };
    return {
      dot: (
        <Zap
          className={cn(
            "h-3 w-3 shrink-0",
            doctor.instant_consultation
              ? "text-emerald-500"
              : "text-muted-foreground/50",
          )}
        />
      ),
      text: doctor.instant_consultation
        ? "Replies in ~2 min"
        : "Replies in ~24h",
      textCls: doctor.instant_consultation
        ? "text-emerald-600"
        : "text-muted-foreground",
    };
  })();

  return (
    <>
      {/* ── Card ── */}
      <div
        className={cn(
          "relative rounded-[6px] border border-border h-[230px] bg-card",
          "overflow-hidden transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:-translate-y-px shadow-sm",
          "flex items-stretch",
          isConnected && "ring-1 ring-emerald-500/40",
          hasSavedSession && !isCallInProgress && "ring-1 ring-violet-500/30",
        )}
        onClick={openDetails}
      >
        {/* ── Left: image panel — 40% width ── */}
        <div className="relative w-[40%] shrink-0 bg-muted/40 border-r border-border/60 overflow-hidden">
          <DoctorAvatar doctor={doctor} size="lg" rounded={false} />

          {/* Status dot — bottom right of image */}
          <span
            className={cn(
              "absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-card shadow-sm",
              s.dot,
              s.pulse,
            )}
          />
        </div>

        {/* ── Right: content — 60% width ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-3 pt-3 pb-2 flex-1">
            {/* Name + status pill */}
            <div className="flex items-start justify-between gap-1.5 mb-1 ">
              <div className=" flex-1 flex flex-col">
                <span className="text-[13px] font-semibold uppercase text-foreground truncate leading-tight">
                  {doctor.user.name}
                </span>
              </div>

              {/* Single status pill — top right only */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[7px] font-semibold px-2 py-1 rounded-[6px] border shrink-0",
                  isConnected
                    ? "text-emerald-700 bg-emerald-100 border-emerald-200"
                    : isCallInProgress
                      ? "text-sky-700 bg-sky-100 border-sky-200"
                      : hasSavedSession
                        ? "text-violet-700 bg-violet-100 border-violet-200"
                        : cn(s.text, s.bg),
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    isConnected
                      ? "bg-emerald-500 animate-pulse"
                      : isCallInProgress
                        ? "bg-sky-500 animate-pulse"
                        : hasSavedSession
                          ? "bg-violet-500"
                          : s.dot,
                  )}
                />
                {isConnected
                  ? "In call"
                  : isCallInProgress
                    ? "Connecting"
                    : hasSavedSession
                      ? "In queue"
                      : s.label}
              </span>
            </div>
            <div className=" w-full my-4">
              <span className="text-[11px] text-primary font-medium pt-1 line-clamp-1 leading-tight">
                {doctor.specialization}
                {doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
              </span>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border overflow-hidden mt-2">
              {[
                {
                  icon: (
                    <Star
                      className={cn(
                        "h-3 w-3",
                        rating > 0
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40",
                      )}
                    />
                  ),
                  top: rating > 0 ? rating.toFixed(1) : "New",
                  bot: "rating",
                },
                {
                  icon: <Clock className="h-3 w-3 text-muted-foreground" />,
                  top: feeLabel,
                  bot: "per visit",
                },
                {
                  icon: doctor.instant_consultation ? (
                    <Zap className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <BriefcaseMedical className="h-3 w-3 text-muted-foreground" />
                  ),
                  top: doctor.instant_consultation ? "Instant" : "Scheduled",
                  bot: "consult",
                },
              ].map(({ icon, top, bot }) => (
                <div
                  key={bot}
                  className="flex flex-col items-center  py-2 px-1 bg-muted/30"
                >
                  <div className="flex items-center gap-1 mb-0.5">{icon}</div>
                  <span className="text-[11px] font-semibold text-foreground leading-tight">
                    {top}
                  </span>
                  <span className="text-[9px] text-muted-foreground leading-tight">
                    {bot}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Left: contextual hint (never the status label) */}
          <div className="px-3 mb-2 flex items-center flex-1  ">
            {footerHint.dot}
            <span
              className={cn("text-[10px] px-4 truncate", footerHint.textCls)}
            >
              {footerHint.text}
            </span>
          </div>
          <div className="border-t border-border/60" />

          {/* ── Footer actions ── */}
          <div
            className="px-3 py-2.5 flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Right: two equal-size buttons */}
            <div className="flex justify-between items-center gap-1.5 shrink-0  w-full">
              {/* Book button — always same size */}
              <Button
                variant="outline"
                size="sm"
                disabled={!canBook || isCallInProgress}
                onClick={() =>
                  canBook && !isCallInProgress && setBookOpen(true)
                }
                className="h-9 px-3 text-[11px] font-semibold rounded-[6px] border-border min-w-[64px]"
              >
                <CalendarCheck className="h-3 w-3 mr-1" />
                {t("pages.cards.book")}
              </Button>

              {/* Right action button — state-driven, same size as Book */}
              {hasSavedSession && !isCallInProgress ? (
                <Button
                  size="sm"
                  onClick={openResume}
                  className="h-9 px-3 text-[11px] font-semibold rounded-[6px] bg-violet-600 hover:bg-violet-700 text-white min-w-[72px]"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Resume
                </Button>
              ) : isConnected ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setInitialMode("connect");
                    setModalOpen(true);
                  }}
                  className="h-9 px-3 text-[11px] font-semibold rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white min-w-[72px]"
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Resume
                </Button>
              ) : isCallInProgress ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setInitialMode("connect");
                    setModalOpen(true);
                  }}
                  className="h-9 px-3 text-[11px] font-semibold rounded-[6px] bg-sky-500 hover:bg-sky-600 text-white min-w-[72px]"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  Open
                </Button>
              ) : canConnect ? (
                <Button
                  size="sm"
                  onClick={openConnect}
                  className="h-9 px-3 text-[11px] font-semibold rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground min-w-[72px]"
                >
                  <Wifi className="h-3 w-3 mr-1" />
                  {t("pages.cards.connect")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled
                  className="h-8 px-3 text-[11px] font-medium rounded-[6px] opacity-50 cursor-not-allowed min-w-[72px]"
                >
                  {s.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Live-call resume pill ── */}
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

      {/* ── Saved-session pill ── */}
      {showSavedSessionPill && (
        <SavedSessionPill
          doctorName={doctor.user.name}
          onResume={openResume}
          onDismiss={() => setSavedSessionPillDismissed(true)}
        />
      )}

      {/* ── Unified modal ── */}
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

      {/* ── Booking dialog ── */}
      <BookingDialog
        doctor={doctor}
        open={bookOpen}
        onOpenChange={setBookOpen}
        onConfirmed={handleDoctorUpdated}
      />
    </>
  );
};
