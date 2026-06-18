// components/DoctorCard.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Star, MapPin, Clock, Wifi, BriefcaseMedical,
  Zap, Maximize2, Globe, Video, Building2, X,
  ShieldCheck, Languages, BadgeCheck, FileText,
  CalendarCheck, User, ChevronRight, ChevronLeft,
  Minus, ArrowUpRight, RotateCcw, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingDialog } from "@/components/BookingDialog";
import { ConnectDialogContent } from "@/components/ConnectDialog";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";
import type { ApiDoctor, ApiDoctorHospital, ApiDoctorSpecialization } from "@/hooks/patient/use-patient-doctor";
import { readConsultSession } from "@/hooks/patient/se-consultation-session";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "details" | "connect";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function DoctorAvatar({ doctor, size = "sm" }: { doctor: ApiDoctor; size?: "sm" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const initials = doctor.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const sizeClass = size === "lg" ? "h-full w-full text-xl" : "h-full w-full text-sm";
  if (!doctor.image || imgError) {
    return (
      <div className={cn(sizeClass, "rounded-sm bg-primary/10 text-primary flex items-center justify-center font-bold select-none")}>
        {initials}
      </div>
    );
  }
  return (
    <img src={doctor.image} alt={doctor.user.name}
      className="h-full w-full object-cover rounded-sm"
      onError={() => setImgError(true)} />
  );
}

// ─── Consultation badge ───────────────────────────────────────────────────────

function ConsultBadge({ type }: { type: ApiDoctor["consultation_type"] }) {
  const map = {
    online: { label: "Online", icon: Video, cls: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
    in_person: { label: "In-Person", icon: Building2, cls: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
    both: { label: "Online & In-Person", icon: Globe, cls: "text-teal-600 bg-teal-500/10 border-teal-500/20" },
  };
  const cfg = map[type] ?? map.both;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-1 py-0.5 rounded-sm border", cfg.cls)}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-b-0">
      <div className={cn("mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center", accent ? "bg-primary/10" : "bg-muted/60")}>
        <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

// ─── Resume Pill ──────────────────────────────────────────────────────────────
// Shown when a live CallStore call is running but the modal is minimized.

function ResumePill({ doctorName, phase, onResume, onEndCompletely }: {
  doctorName: string; phase: string;
  onResume: () => void; onEndCompletely: () => void;
}) {
  const isLive = phase === "connected";
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button onClick={onEndCompletely} title="End call completely"
        className="h-8 w-8 rounded-full bg-destructive/90 hover:bg-destructive text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95">
        <X className="h-4 w-4" />
      </button>
      <button onClick={onResume}
        className={cn(
          "flex items-center gap-2.5 pl-3 pr-4 h-10 rounded-full shadow-xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
          isLive ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-400/30 text-white"
            : "bg-card border-border text-foreground hover:bg-muted",
        )}>
        {isLive && <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />}
        <span className="text-sm font-semibold leading-none truncate max-w-[120px]">
          {isLive ? "Live · " : ""}{doctorName}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Saved Session Pill ───────────────────────────────────────────────────────
// Shown when sessionStorage has a token but no live CallStore call is running.

function SavedSessionPill({ doctorName, onResume, onDismiss }: {
  doctorName: string; onResume: () => void; onDismiss: () => void;
}) {
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-300">
      <button onClick={onDismiss} title="Dismiss"
        className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 border border-border text-muted-foreground flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95">
        <X className="h-4 w-4" />
      </button>
      <button onClick={onResume}
        className="flex items-center gap-2.5 pl-3 pr-4 h-10 rounded-full shadow-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 text-violet-700 dark:text-violet-300 transition-all hover:scale-[1.02] active:scale-[0.98]">
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

interface UnifiedModalProps {
  doctor: ApiDoctor;
  callDoctor: Doctor;
  initialMode: ModalMode;
  open: boolean;
  // Called when the user wants to hide the modal but keep the session alive.
  onMinimize: () => void;
  // Called only when the user explicitly wants to destroy the session (no active
  // in-flight request). In connect mode this is never triggered by the header X —
  // the content's own "Cancel completely" button owns that path.
  onCloseCompletely: () => void;
  onBook: () => void;
  canBook: boolean;
  canConnect: boolean;
}

export function UnifiedModal({
  doctor, callDoctor, initialMode, open,
  onMinimize, onCloseCompletely, onBook, canBook, canConnect,
}: UnifiedModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode);
  // Populated by ConnectDialogContent via onRegisterCancel when a session is
  // in-flight. Null when no cancellable session exists.
  const [cancelFn, setCancelFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    } else {
      // Reset cancel button when modal is hidden
      setCancelFn(null);
    }
  }, [open, initialMode]);

  // Clear cancel button when switching away from connect mode
  useEffect(() => {
    if (mode !== "connect") setCancelFn(null);
  }, [mode]);

  if (!open) return null;

  const fee = parseFloat(doctor.consultation_fee);
  const rating = parseFloat(doctor.rating_avg);
  const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

  const status: "online" | "busy" | "offline" =
    doctor.is_available && !doctor.bookings_paused ? "online"
      : doctor.bookings_paused ? "busy" : "offline";

  const statusStyles = {
    online: { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available", text: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
    busy: { dot: "bg-amber-500", pulse: "", label: "Paused", text: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20" },
    offline: { dot: "bg-zinc-400", pulse: "", label: "Unavailable", text: "text-muted-foreground", bg: "bg-muted border-border" },
  };
  const s = statusStyles[status];
  const langMap: Record<string, string> = { en: "English", fr: "French", kiny: "Kinyarwanda" };
  const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;
  const bio = doctor.bio_en || doctor.bio_fr || doctor.bio_kiny || null;

  return createPortal(
    <>
      {/* Backdrop — clicking it minimizes (never destroys) */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onMinimize} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-full",
            mode === "connect" ? "max-w-[420px]" : "max-w-md",
            "bg-card/80 backdrop-blur-2xl border border-border/60 rounded-xl shadow-2xl",
            "flex flex-col max-h-[90dvh] overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 duration-200",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Shared header bar ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {mode === "connect" && (
                <button onClick={() => setMode("details")}
                  className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0"
                  title="Back to details">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm font-semibold text-foreground/70 truncate">
                {mode === "details" ? doctor.user.name : "Instant consultation"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/*
                Cancel completely — only visible in connect mode when a session
                is in-flight. ConnectDialogContent registers this handler via
                onRegisterCancel whenever isInFlight changes.
              */}
              {mode === "connect" && cancelFn && (
                <button
                  onClick={cancelFn}
                  title="Cancel request completely"
                  className="h-7 px-2 rounded-md flex items-center gap-1 text-xs font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Ban className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              )}
              {/* Minus — always minimizes */}
              <button onClick={onMinimize} title="Minimize (keep session alive)"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
                <Minus className="h-4 w-4" />
              </button>
              {/* X — minimizes in connect mode, closes completely in details mode */}
              <button
                onClick={mode === "connect" ? onMinimize : onCloseCompletely}
                title={mode === "connect" ? "Minimize (keep session alive)" : "Close"}
                className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center transition-all",
                  mode === "connect"
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                )}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Content area ── */}
          {mode === "details" ? (
            <>
              {/* Doctor header band */}
              <div className="relative bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/50 px-4 pt-4 pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-40 h-40 rounded-sm overflow-hidden border border-border/50 shadow-sm flex-shrink-0">
                    <DoctorAvatar doctor={doctor} size="lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h2 className="text-base font-semibold text-foreground leading-tight truncate">{doctor.user.name}</h2>
                      {doctor.is_featured && (
                        <span className="px-1 py-px text-sm font-semibold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900 flex-shrink-0">
                          Featured
                        </span>
                      )}
                      {doctor.verified_at && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-primary font-medium truncate">
                      {doctor.specialization}{doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
                    </p>
                    {doctor.designations && (
                      <p className="text-sm text-muted-foreground/70 mt-0.5 truncate">{doctor.designations}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-sm border", s.text, s.bg)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", s.dot, s.pulse)} />{s.label}
                      </span>
                      <ConsultBadge type={doctor.consultation_type} />
                      {doctor.instant_consultation && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-xs font-bold rounded-sm bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                          <Zap className="h-3 w-3" />Instant
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {[
                    { icon: <Star className={cn("h-4 w-4", rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />, top: rating > 0 ? rating.toFixed(1) : "New", bot: "Rating" },
                    { icon: <Clock className="h-4 w-4 text-muted-foreground" />, top: feeLabel, bot: "Per visit" },
                    { icon: <CalendarCheck className="h-4 w-4 text-muted-foreground" />, top: doctor.instant_consultation ? "Instant" : "Scheduled", bot: "Consult" },
                  ].map(({ icon, top, bot }) => (
                    <div key={bot} className="flex flex-col items-center py-1.5 px-2 bg-background/60 rounded-sm border border-border/40">
                      <div className="flex items-center gap-1 mb-0.5">{icon}</div>
                      <span className="text-sm font-bold text-foreground leading-tight">{top}</span>
                      <span className="text-sm text-muted-foreground leading-tight">{bot}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {bio && (
                  <div className="mb-3 p-2.5 rounded-sm bg-muted/30 border border-border/40">
                    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">About</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{bio}</p>
                  </div>
                )}
                <div className="rounded-sm border border-border/40 bg-card overflow-hidden divide-y divide-border/40">
                  {locationLabel && <DetailRow icon={MapPin} label="Location" value={locationLabel} />}
                  {doctor.medical_license && <DetailRow icon={ShieldCheck} label="Medical License" value={doctor.medical_license} accent />}
                  {doctor.preferred_language && (
                    <DetailRow icon={Languages} label="Language" value={langMap[doctor.preferred_language] ?? doctor.preferred_language} />
                  )}
                  <DetailRow icon={FileText} label="Agreement Status" value={
                    <span className={cn("capitalize text-xs font-semibold px-1.5 py-0.5 rounded-sm border",
                      doctor.agreement_status === "approved"
                        ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                        : "text-amber-600 bg-amber-500/10 border-amber-500/20")}>
                      {doctor.agreement_status}
                    </span>} />
                  <DetailRow icon={User} label="Profile Status" value={
                    <span className={cn("capitalize text-xs font-semibold px-1.5 py-0.5 rounded-sm border",
                      doctor.is_active ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-zinc-500 bg-muted border-border")}>
                      {doctor.is_active ? "Active" : "Inactive"}
                    </span>} />
                  {doctor.verified_at && (
                    <DetailRow icon={BadgeCheck} label="Verified" accent
                      value={new Date(doctor.verified_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} />
                  )}
                </div>
                {doctor.hospitals && doctor.hospitals.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Hospitals</p>
                    <div className="space-y-1">
                      {doctor.hospitals.map((h: ApiDoctorHospital, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-sm border border-border/40 bg-muted/20">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-foreground font-medium truncate">{h.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {doctor.specializations && doctor.specializations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">Specializations</p>
                    <div className="flex flex-wrap gap-1">
                      {doctor.specializations.map((sp: ApiDoctorSpecialization, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-sm font-medium rounded-sm bg-primary/8 text-primary border border-primary/20">
                          {sp.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 flex items-center gap-2 bg-card/80">
                <Button variant="outline" size="sm" disabled={!canBook}
                  onClick={() => { onMinimize(); onBook(); }}
                  className="flex-1 h-7 text-xs font-semibold rounded-sm">
                  <CalendarCheck className="h-4 w-4 mr-1.5" />Book Appointment
                </Button>
                {canConnect && (
                  <Button size="sm" onClick={() => setMode("connect")}
                    className="flex-1 h-7 text-xs font-semibold rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Wifi className="h-4 w-4 mr-1.5" />Connect Now
                  </Button>
                )}
              </div>
            </>
          ) : (
            /*
              ConnectDialogContent owns the full session lifecycle.
              - onMinimize        → hides modal, keeps session alive
              - onCloseCompletely → called only from "Cancel completely" inside
                                    the content, after sessionStorage is cleared
              - onRegisterCancel  → called when isInFlight changes so the header
                                    can show/hide the persistent cancel button
            */
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
  const { t, i18n } = useTranslation();
  const [bookOpen, setBookOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<ModalMode>("details");
  const call = useCallStore();

  const [doctor, setDoctor] = useState<ApiDoctor>(doctorProp);

  // ── Saved-session tracking ────────────────────────────────────────────────
  // We read sessionStorage on mount, on every modal close, AND on a 2-second
  // interval while the modal is closed — this catches the case where the user
  // closes the modal mid-request and the session gets saved asynchronously.
  const [hasSavedSession, setHasSavedSession] = useState(() => !!readConsultSession(doctorProp.id));
  const [savedSessionPillDismissed, setSavedSessionPillDismissed] = useState(false);

  // Poll sessionStorage while the modal is closed so the pill appears
  // as soon as the session is written (e.g. after "Close — your place is saved").
  useEffect(() => {
    if (modalOpen) return; // no need to poll while modal is open

    const check = () => {
      const exists = !!readConsultSession(doctor.id);
      setHasSavedSession(exists);
      if (exists) setSavedSessionPillDismissed(false); // un-dismiss if new session appeared
    };

    check(); // immediate check on close / mount
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, [modalOpen, doctor.id]);

  if (!bookOpen && doctorProp !== doctor && doctorProp.id === doctor.id) {
    setDoctor(doctorProp);
  }

  const handleDoctorUpdated = (updatedDoctor: ApiDoctor) => setDoctor(updatedDoctor);

  const fee = parseFloat(doctor.consultation_fee);
  const rating = parseFloat(doctor.rating_avg);
  const feeLabel = fee === 0 ? "Free" : `${fee.toLocaleString()} ${doctor.currency}`;

  const status: "online" | "busy" | "offline" =
    doctor.is_available && !doctor.bookings_paused ? "online"
      : doctor.bookings_paused ? "busy" : "offline";

  const statusStyles = {
    online: { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Available", text: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
    busy: { dot: "bg-amber-500", pulse: "", label: "Paused", text: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20" },
    offline: { dot: "bg-zinc-400", pulse: "", label: "Unavailable", text: "text-muted-foreground", bg: "bg-muted border-border" },
  };
  const s = statusStyles[status];

  const callDoctor: Doctor = {
    id: doctor.id,
    user: { id: doctor.user.id, name: doctor.user.name, avatar: doctor.user.avatar },
    specialization: doctor.specialization,
  };

  const isThisDoctor = call.doctor?.id === doctor.id;
  const isCallInProgress = isThisDoctor && call.phase !== "idle" && call.phase !== "ended";
  const isConnected = isThisDoctor && call.phase === "connected";

  const canConnect = doctor.is_available && !doctor.bookings_paused && doctor.instant_consultation;
  const canBook = doctor.is_available && !doctor.bookings_paused;

  // Live-call resume pill: CallStore call running, modal closed
  const showResumePill = isCallInProgress && !modalOpen && !bookOpen;

  // Saved-session pill: sessionStorage token exists, no live call, modal closed
  const showSavedSessionPill =
    hasSavedSession && !isCallInProgress && !modalOpen && !bookOpen && !savedSessionPillDismissed;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openDetails = () => {
    setInitialMode("details");
    setModalOpen(true);
  };

  // Fresh connect — no startCall(), ConnectDialogContent owns the lifecycle
  const openConnect = () => {
    if (!canConnect) return;
    setInitialMode("connect");
    setModalOpen(true);
  };

  // Resume: open directly to connect mode; ConnectDialogContent will show the
  // resume banner because it reads sessionStorage on mount
  const openResume = () => {
    setInitialMode("connect");
    setModalOpen(true);
  };

  // Minimize: hide modal, keep everything alive
  const handleMinimize = () => setModalOpen(false);

  // Close completely: called ONLY from the "Cancel completely" action inside
  // ConnectDialogContent (which has already cleared sessionStorage) or from
  // the ResumePill's X button (live call).
  // Never called from the modal's X button when in connect mode.
  const handleCloseCompletely = () => {
    setModalOpen(false);
    setHasSavedSession(false);
    // Only end a live CallStore call — saved-session cancel is handled by
    // ConnectDialogContent before it calls this
    if (isCallInProgress) call.endCall();
  };

  const locationLabel = doctor.hospitals?.[0]?.name ?? doctor.city ?? null;

  return (
    <>
      {/* ── Card ── */}
      <div
        className={cn(
          "relative rounded-sm border border-border bg-card",
          "overflow-hidden transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:-translate-y-px shadow-sm",
          isConnected && "ring-1 ring-emerald-500/30",
          hasSavedSession && !isCallInProgress && "ring-1 ring-violet-500/25",
        )}
        onClick={openDetails}
      >
        <div className="p-3.5">
          {/* Top row */}
          <div className="flex items-center justify-start gap-2">
            <div className="relative shrink-0">
              <div className="h-14 w-14 rounded-sm overflow-hidden border border-border/40">
                <DoctorAvatar doctor={doctor} />
              </div>
              <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card", s.dot, s.pulse)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground truncate leading-tight">{doctor.user.name}</h3>
                  </div>
                  <p className="text-xs text-primary font-medium mt-0.5 truncate">
                    {doctor.specialization}{doctor.doctor_degree ? ` · ${doctor.doctor_degree}` : ""}
                  </p>
                </div>

                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shrink-0" />In call
                  </span>
                ) : isCallInProgress ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-sky-600 bg-sky-500/10 border-sky-500/20">
                    <span className="h-1 w-1 rounded-full bg-sky-500 animate-pulse shrink-0" />Connecting
                  </span>
                ) : hasSavedSession ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-sm border shrink-0 text-violet-600 bg-violet-500/10 border-violet-500/20">
                    <RotateCcw className="h-2 w-2 shrink-0" />In queue
                  </span>
                ) : (
                  <></>
                )}
              </div>

              {locationLabel && (
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="h-4 w-4 shrink-0" />{locationLabel}
                </p>
              )}
            </div>
          </div>

          {!compact && (
            <div className="mt-3 flex items-center justify-between">
              <ConsultBadge type={doctor.consultation_type} />
              <span className="flex items-center gap-0.5 text-sm text-muted-foreground/50 font-medium">
                View details <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          )}

          <div className="mt-2.5 border-t border-border" />

          {/* Bottom actions */}
          <div className="mt-2.5 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Left hint */}
            <div className="flex items-center gap-1">
              {isConnected ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-600">Call in progress</span></>
              ) : isCallInProgress ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-xs font-medium text-sky-600">Connecting…</span></>
              ) : hasSavedSession ? (
                <><RotateCcw className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Queue session saved</span></>
              ) : (
                <><Zap className={cn("h-4 w-4", doctor.instant_consultation ? "text-emerald-500" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", doctor.instant_consultation ? "text-emerald-600" : "text-muted-foreground")}>
                    {doctor.instant_consultation ? "Usually replies in 2 min" : "Replies within 24h"}
                  </span></>
              )}
            </div>

            {/* Right buttons */}
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm"
                disabled={!canBook || isCallInProgress}
                onClick={() => canBook && !isCallInProgress && setBookOpen(true)}
                className="h-6 px-2.5 text-xs font-medium rounded-sm border-border">
                {t("pages.cards.book")}
              </Button>

              {/*
                Priority:
                1. Saved queue session + no live call → violet "Resume"
                2. Live call (connected or connecting) → re-open modal
                3. canConnect → fresh "Connect"
                4. Otherwise → disabled
              */}
              {hasSavedSession && !isCallInProgress ? (
                <Button size="sm" onClick={openResume}
                  className="h-6 px-2.5 text-xs font-semibold rounded-sm bg-violet-600 hover:bg-violet-700 text-white">
                  <RotateCcw className="h-4 w-4 mr-1" />Resume
                </Button>
              ) : canConnect ? (
                <Button size="sm"
                  onClick={() => {
                    if (isCallInProgress || isConnected) {
                      setInitialMode("connect");
                      setModalOpen(true);
                    } else {
                      openConnect();
                    }
                  }}
                  className={cn(
                    "h-6 px-2.5 text-xs font-semibold rounded-sm",
                    isConnected ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : isCallInProgress ? "bg-sky-500 hover:bg-sky-600 text-white"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground",
                  )}>
                  {isConnected ? <><Maximize2 className="h-4 w-4 mr-1" />Resume</>
                    : isCallInProgress ? <><Wifi className="h-4 w-4 mr-1" />Open</>
                      : <><Wifi className="h-4 w-4 mr-1" />{t("pages.cards.connect")}</>}
                </Button>
              ) : (
                <Button size="sm" variant="secondary" disabled
                  className="h-6 px-2.5 text-xs rounded-sm opacity-50 cursor-not-allowed">
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
          onResume={() => { setInitialMode("connect"); setModalOpen(true); }}
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
