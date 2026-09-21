import { formatDateOnly } from "@/lib/date";
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
  Stethoscope,
  Zap,
  Maximize2,
  Globe,
  Video,
  Building2,
  X,
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
import {
  readConsultSession,
  pruneIfEnded,
} from "@/hooks/patient/se-consultation-session";
import { Card } from "./ui/card";
import { RichTextRenderer } from "./ui/rich-textarea";

type ModalMode = "details" | "connect";

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
    size === "lg"
      ? "h-full w-full text-2xl sm:text-3xl"
      : "h-full w-full text-sm";
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

// Unchanged  shared with UnifiedModal, out of scope for this pass.

function ConsultBadge({ isOnline }: { isOnline: boolean }) {
  const { t } = useTranslation();
  const cfg = isOnline
    ? {
        label: t("pages.cards.online"),
        icon: Video,
        cls: "text-sky-700 bg-sky-500/15 border-sky-500/30 dark:text-sky-400",
      }
    : {
        label: t("pages.landing.offline"),
        icon: Ban,
        cls: "text-zinc-700 bg-zinc-500/15 border-zinc-500/30 dark:text-zinc-400",
      };
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
        {}
        <p className="text-sm font-medium text-foreground leading-snug ">
          {value}
        </p>
      </div>
    </div>
  );
}
// --- Star rating ----------------------------------------------------------------
// Always renders all 5 stars (unfilled/muted when rating is 0, i.e. no reviews
// yet) rather than hiding the row, so "no rating" still reads as a rating UI.

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const starSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            starSize,
            i < filled
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/25",
          )}
        />
      ))}
    </div>
  );
}

function RatingDisplay({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "rounded-[6px] px-1.5 py-0.5 font-bold leading-none",
          size === "md" ? "text-sm" : "text-xs",
          rating > 0
            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            : "text-muted-foreground",
        )}
      >
        {(rating || 0).toFixed(1)}
      </span>
      <StarRating rating={rating} size={size} />
    </div>
  );
}

// --- Quick stat (used in the sidebar) ------------------------------------------
// Unchanged  lives inside UnifiedModal, out of scope for this pass.

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
        <div className="text-sm font-bold text-foreground leading-tight truncate">
          {top}
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">{bot}</p>
      </div>
    </div>
  );
}

// --- Resume Pill --------------------------------------------------------------
// Unchanged  out of scope for this pass.

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
  const { t } = useTranslation();
  const isLive = phase === "connected";
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button
        onClick={onEndCompletely}
        title={t("pages.cards.end_call")}
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
          {isLive ? `${t("pages.landing.live")}  ` : ""}
          {doctorName}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// --- Saved Session Pill -------------------------------------------------------
// Unchanged  out of scope for this pass.

function SavedSessionPill({
  doctorName,
  onResume,
  onDismiss,
}: {
  doctorName: string;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button
        onClick={onDismiss}
        title={t("pages.cards.dismiss")}
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
          {t("pages.landing.resume")}  {doctorName}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// --- Unified Modal ------------------------------------------------------------
// Unchanged  out of scope for this pass (card-only restyle, per your call).

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
  const { t, i18n } = useTranslation();
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
  const numericFee = Number(fee);

 
    const feeLabel =
  Number.isInteger(numericFee) && numericFee === 0
    ? t("pages.cards.free")
    : Number.isInteger(numericFee)
      ? `${numericFee.toLocaleString()} ${doctor.currency}`
      : t("pages.card.feeNotAvailable");

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
      label: t("pages.cards.available"),
      text: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    busy: {
      dot: "bg-amber-500",
      pulse: "",
      label: t("pages.cards.paused"),
      text: "text-amber-600",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    offline: {
      dot: "bg-zinc-400",
      pulse: "",
      label: t("pages.cards.unavailable"),
      text: "text-muted-foreground",
      bg: "bg-muted border-border",
    },
  };
  const s = statusStyles[status];
  const langMap: Record<string, string> = {
    en: t("pages.landing.lang_en"),
    fr: t("pages.landing.lang_fr"),
    kiny: t("pages.landing.lang_rw"),
  };
  const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;
  const subSpecialtyLabel =
    doctor.sub_specializations
      ?.map((s) => s.name ?? s.sub_type ?? s.sub_specialization)
      .filter(Boolean)
      .join(", ") || null;
  const localizedBio = (() => {
    const clean = (value?: string | null) => value?.trim() || null;
    const lang = i18n.language.toLowerCase();

    if (lang.startsWith("fr")) {
      return clean(doctor.bio_fr) || clean(doctor.bio_en) || clean(doctor.bio_kiny);
    }

    if (lang.startsWith("rw") || lang.startsWith("kiny")) {
      return clean(doctor.bio_kiny) || clean(doctor.bio_en) || clean(doctor.bio_fr);
    }

    return clean(doctor.bio_en) || clean(doctor.bio_fr) || clean(doctor.bio_kiny);
  })();

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onMinimize}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-full",
            mode === "connect" ? "max-w-[420px]" : "max-w-3xl",
            "bg-card/80 backdrop-blur-2xl border border-border/60 rounded-[6px] shadow-2xl",
            "flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden",
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
                  title={t("pages.cards.back_to_details")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm font-semibold text-foreground/70 truncate">
                {mode === "details"
                  ? doctor.user.name
                  : t("pages.cards.instant_consultation")}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {mode === "connect" && cancelFn && (
                <button
                  onClick={cancelFn}
                  title={t("pages.cards.cancel_request")}
                  className="h-7 px-2 rounded-[6px] flex items-center gap-1 text-xs font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Ban className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("common.cancel")}</span>
                </button>
              )}
              <button
                onClick={onMinimize}
                title={t("pages.cards.minimize")}
                className="h-7 w-7 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={mode === "connect" ? onMinimize : onCloseCompletely}
                title={
                  mode === "connect"
                    ? t("pages.cards.minimize")
                    : t("common.close")
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
              <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                <div className="md:w-[260px] flex-shrink-0 border-b md:border-b-0 md:border-r border-border/50 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent md:overflow-y-auto">
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
                    
                    <p className="text-xs text-primary font-medium mt-1">
                      {doctor.specialization}
                      {doctor.doctor_degree ? ` - ${doctor.doctor_degree}` : ""}
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
                          {t("pages.cards.instant")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <ConsultBadge isOnline={canConnect} />
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
                        top={<RatingDisplay rating={rating} size="md" />}
                        bot={t("pages.cards.rating")}
                      />
                      <QuickStat
                        icon={
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        }
                        top={feeLabel}
                        bot={t("pages.cards.per_visit")}
                      />
                     
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-shrink-0 md:flex-1 px-4 py-4 md:overflow-y-auto">
                  {localizedBio && (
                    <div className="mb-4 p-3 rounded-[6px] bg-muted/30 border border-border/40">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">
                        {t("pages.cards.about")}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <RichTextRenderer
                          value={localizedBio}
                          className="text-xs text-foreground"
                        />
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {locationLabel && (
                      <DetailRow
                        icon={MapPin}
                        label={t("pages.cards.location")}
                        value={locationLabel}
                      />
                    )}
                    {subSpecialtyLabel && (
                      <DetailRow
                        icon={Stethoscope}
                        label={t("pages.cards.sub_specialties")}
                        value={subSpecialtyLabel}
                      />
                    )}
                    {doctor.preferred_language && (
                      <DetailRow
                        icon={Languages}
                        label={t("pages.cards.language")}
                        value={
                          langMap[doctor.preferred_language] ??
                          doctor.preferred_language
                        }
                      />
                    )}
                    {doctor.verified_at && (
                      <DetailRow
                        icon={BadgeCheck}
                        label={t("pages.cards.verified")}
                        accent
                        value={formatDateOnly(
                          doctor.verified_at,
                          i18n.language,
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      />
                    )}
                  </div>

                  {doctor.hospitals && doctor.hospitals.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                        {t("pages.cards.hospitals")}
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
                          {t("pages.cards.specializations")}
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

              <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 bg-card/80">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canBook}
                  onClick={() => {
                    onMinimize();
                    onBook();
                  }}
                  className="w-full sm:w-auto sm:px-6 h-9 text-xs font-semibold rounded-[6px]"
                >
                  <CalendarCheck className="h-4 w-4 mr-1.5" />
                  {t("pages.landing.book_appointment")}
                </Button>
                {canConnect && (
                  <Button
                    size="sm"
                    onClick={() => setMode("connect")}
                    className="w-full sm:w-auto sm:px-6 h-9 text-xs font-semibold rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Wifi className="h-4 w-4 mr-1.5" />
                    {t("pages.cards.connect_now")}
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

// --- Main DoctorCard ----------------------------------------------------------
// Restyled: the doctor image is now a full-width banner at the top of the
// card (h-44 / sm:h-52) instead of a small h-12 inline avatar. Status dot and
// "Featured" badge float on top of the image as pills. Everything else 
// name, specialization, location, consult badge, divider, buttons, pills,
// modal  is unchanged in content, only reflowed to sit below the image.

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

    let cancelled = false;

    const check = async () => {
      const existing = readConsultSession(doctor.id);
      if (!existing) {
        if (!cancelled) setHasSavedSession(false);
        return;
      }
      // The doctor may have completed/declined this consultation while the
      // patient wasn't looking  verify before keeping the resume affordance up.
      const ended = await pruneIfEnded(existing);
      if (cancelled) return;
      setHasSavedSession(!ended);
      if (!ended) setSavedSessionPillDismissed(false);
    };

    check();
    const id = setInterval(check, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [modalOpen, doctor.id]);

  if (!bookOpen && doctorProp !== doctor && doctorProp.id === doctor.id) {
    setDoctor(doctorProp);
  }

  const handleDoctorUpdated = (updatedDoctor: ApiDoctor) =>
    setDoctor(updatedDoctor);

  const fee = parseFloat(doctor.consultation_fee);
  const rating = parseFloat(doctor.rating_avg);
  
  const numericFee = Number(fee);

const feeLabel =
  Number.isInteger(numericFee) && numericFee === 0
    ? t("pages.cards.free")
    : Number.isInteger(numericFee)
      ? `${numericFee.toLocaleString()} ${doctor.currency}`
      : t("pages.card.feeNotAvailable");

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
      label: t("pages.cards.available"),
      text: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    busy: {
      dot: "bg-amber-500",
      pulse: "",
      label: t("pages.cards.paused"),
      text: "text-amber-600",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    offline: {
      dot: "bg-zinc-400",
      pulse: "",
      label: t("pages.cards.unavailable"),
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
console.log(doctor)
  return (
    <>
      {/* -- Card -- */}
      <Card
        onClick={openDetails}
        className="rounded-[6px] overflow-hidden border-border/60 hover:shadow-md hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 cursor-pointer"
      >
        <div className="px-3.5 pt-3 pb-3">
          {/* Top row  avatar enlarged from h-12 to h-20 (h-24 on sm+),
              same row layout as before, just a bigger image. */}
          <div className="flex items-start gap-3 ">
            <div className="relative shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-[6px] overflow-hidden border border-border">
                <DoctorAvatar doctor={doctor} size="lg" />
              </div>
              {
                doctor.instant_consultation &&( <span
                className={cn(
                  "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card",
                  s.dot,
                  s.pulse,
                )}
              />)
              }
             
            </div>

            <div className=" flex flex-col justify- flex-1 min-w-0  h-[70px]">
              {doctor.user.name && (
                <>
                  <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                    {doctor.user.name}
                  </h3>
                </>
              )}
              <div className="mt-0.5">
                <RatingDisplay rating={rating} />
              </div>

              {doctor.specialization && (
                <p className="mt-1 capitalize text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <BriefcaseMedical className="h-3.5 w-3.5 shrink-0" />
                  {doctor.specialization}
                </p>
              )}
            </div>
          </div>

          {!compact && (
            <div className={`${doctor.consultation_type? '' : ''} flex  items-center justify-between`}>
              <ConsultBadge isOnline={canConnect} />
              <span className="flex cursor-pointer  items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                {t("pages.cards.view_details")}{" "}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          )}

          <div className="mt-2 border-t border-border" />

          {/* Bottom actions */}
          <div
            className="mt-1 flex flex-col sm:flex-row sm:items-center flex-wrap justify-between gap-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left hint */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("pages.cards.call_in_progress")}
                  </span>
                </>
              ) : isCallInProgress ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {t("pages.cards.connecting")}
                  </span>
                </>
              ) : hasSavedSession ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                    {t("pages.cards.queue_saved")}
                  </span>
                </>
              ) : (
                <>
                  <Zap
                    className={cn(
                      "h-4 w-4 shrink-0",
                      doctor.instant_consultation
                        ? "text-emerald-500"
                        : "text-muted-foreground/50",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-bold tracking-tight",
                      doctor.instant_consultation
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {doctor.instant_consultation
                      ? t("pages.cards.instant_reply")
                      : t("pages.cards.scheduled_reply")}
                  </span>
                </>
              )}
            </div>

            {/* Right buttons - rounded-[6px] + h-8 to match the
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
                <Button
                  size="sm"
                  onClick={openResume}
                  className="h-8 px-3 text-xs font-bold rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all"
                >
                  <Wifi className="h-3.5 w-3.5 mr-1.5" />
                  {t("pages.cards.join")}
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
                  )}
                >
                  {isConnected || isCallInProgress ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 mr-1.5" />
                      {t("pages.cards.join")}
                    </>
                  ) : (
                    <>
                      <Wifi className="h-3.5 w-3.5 mr-1.5" />
                      {t("pages.cards.connect")}
                    </>
                  )}
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

      {/* -- Live-call resume pill -- (unchanged) */}
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

      {/* -- Saved-session pill -- (unchanged) */}
      {showSavedSessionPill && (
        <SavedSessionPill
          doctorName={doctor.user.name}
          onResume={openResume}
          onDismiss={() => setSavedSessionPillDismissed(true)}
        />
      )}

      {/* -- Unified modal -- (unchanged) */}
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

      {/* -- Booking dialog -- (unchanged) */}
      <BookingDialog
        doctor={doctor}
        open={bookOpen}
        onOpenChange={setBookOpen}
        onConfirmed={handleDoctorUpdated}
      />
    </>
  );
};
