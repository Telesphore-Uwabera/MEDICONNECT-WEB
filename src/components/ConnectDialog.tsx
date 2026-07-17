
// components/ConnectDialog.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { validatePhoneForCountry } from "@/lib/phone-validation";
import {
  sessionToRejoinTarget,
  fetchPatientLiveSession,
  rejoinFromPersistedCall,
  type RejoinTarget,
} from "@/lib/rejoin";
import { useMe } from "@/hooks/useAuth";
import { useGoToRole } from "@/hooks/useRoleManagement";
import { useGetSearchDoctors, type ApiDoctor } from "@/hooks/patient/use-patient-doctor";
import {
  useInstantConsultationRequest,
  useInstantConsultationRequestAny,
  useInstantConsultationStatus,
  useInstantConsultationPay,
  useInvoicePoller,
  type InstantConsultationRequestPayload,
} from "@/hooks/patient/use-instant-consultations";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Phone,
  ShieldCheck, Loader2, CheckCircle2, AlertCircle,
  MessageSquare, Wifi, ArrowRight, Sparkles, Activity,
  User, Maximize2, Minimize2, Minus, X, RotateCcw, Clock, Ban, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";
import { useConsultationSession, pruneIfEnded } from "@/hooks/patient/se-consultation-session";
import { useLogin } from "@/hooks/useAuth";
import { useCallContext } from "@/context/CallContext";
import { useNavigate } from "react-router-dom";
import { ChatPanel } from "./consultatioRoom/ChatPanel";
import { decodeCallToken } from "@/lib/scheduled-call";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// ─── IremboPay window type ────────────────────────────────────────────────────
// Declared here so we never need `(window as any)` throughout the file.

interface IremboPayLocale {
  EN: string;
  FR: string;
}

interface IremboPayStatic {
  locale: IremboPayLocale;
  initiate: (options: {
    publicKey: string;
    invoiceNumber: string;
    locale: string;
    callback: (err: Error | null) => void;
  }) => void;
  closeModal?: () => void;
}

declare global {
  interface Window {
    IremboPay: IremboPayStatic;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CallPhase =
  | "search"
  | "idle"
  | "guest_form"
  | "requesting"
  | "payment"
  | "payment_verifying"
  | "polling"
  | "accepted"
  | "in_progress"
  | "connected"
  | "rejected"
  | "failed"
  | "ended"
  ;


// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const nameInitial = (name: string): string =>
  name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";

const splitName = (name?: string | null) => {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
};

const joinName = (firstName: string, lastName: string) =>
  [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Signal Bars ──────────────────────────────────────────────────────────────

const SignalBars = ({ strength }: { strength: number }) => (
  <div className="flex items-end gap-0.5 h-4">
    {[1, 2, 3, 4].map((b) => (
      <div key={b} style={{ height: `${b * 4}px` }}
        className={cn("w-1 rounded-[6px] transition-colors",
          b <= strength ? "bg-emerald-500 dark:bg-emerald-400" : "bg-foreground/10")} />
    ))}
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ phase }: { phase: CallPhase }) => {
  const { t } = useTranslation();
  const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    requesting: { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: t("consult.connect.status_requesting"), cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25" },
    payment_verifying: { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: t("consult.connect.status_payment_verifying"), cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" },
    polling: { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: t("consult.connect.status_polling"), cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25" },
    accepted: { icon: <Phone className="h-4 w-4 animate-pulse" />, text: t("consult.connect.status_accepted"), cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
    in_progress: { icon: <Activity className="h-4 w-4 animate-pulse" />, text: t("consult.connect.status_in_progress"), cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
    connected: { icon: <CheckCircle2 className="h-4 w-4" />, text: t("consult.connect.status_connected"), cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
    rejected: { icon: <AlertCircle className="h-4 w-4" />, text: t("consult.connect.status_rejected"), cls: "bg-destructive/10 text-destructive border-destructive/25" },
    failed: { icon: <AlertCircle className="h-4 w-4" />, text: t("consult.connect.status_failed"), cls: "bg-destructive/10 text-destructive border-destructive/25" },
    ended: { icon: <PhoneOff className="h-4 w-4" />, text: t("consult.connect.status_ended"), cls: "bg-muted text-muted-foreground border-border" },
  };
  const c = map[phase];
  if (!c) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", c.cls)}>
      {c.icon}{c.text}
    </span>
  );
};

// ─── Resume Session Banner ────────────────────────────────────────────────────

const ResumeSessionBanner = ({
  savedAt, onResume, onDiscard, isResuming,
}: {
  savedAt: number; onResume: () => void; onDiscard: () => void; isResuming: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className={cn(
      "rounded-[6px] border p-3.5 space-y-2.5",
      "bg-violet-500/5 border-violet-500/20",
      "animate-in fade-in slide-in-from-top-2 duration-300",
    )}>
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-[6px] bg-violet-500/15 flex items-center justify-center shrink-0">
          <RotateCcw className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{t("consult.connect.resume_title")}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="h-4 w-4 shrink-0" />{t("consult.connect.resume_saved_at", { time: timeAgo(savedAt) })}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("consult.connect.resume_body_pre")}{" "}
        <strong className="text-foreground font-medium">{t("consult.connect.resume_word")}</strong> {t("consult.connect.resume_body_post")}
      </p>
      <div className="flex gap-2 pt-0.5">
        <Button size="sm" onClick={onResume} disabled={isResuming}
          className="flex-1 h-8 text-sm font-semibold gap-1.5 rounded-[6px] bg-violet-600 hover:bg-violet-700 text-white">
          {isResuming
            ? <><Loader2 className="h-4 w-4 animate-spin" />{t("consult.connect.resuming")}</>
            : <><RotateCcw className="h-4 w-4" />{t("consult.connect.resume_button")}</>}
        </Button>
        <Button size="sm" variant="outline" onClick={onDiscard} disabled={isResuming}
          className="flex-1 h-8 text-sm rounded-[6px]">
          {t("consult.connect.start_fresh")}
        </Button>
      </div>
    </div>
  );
};

// ─── Device Toggles ───────────────────────────────────────────────────────────

const DeviceToggles = ({ compact = false }: { compact?: boolean }) => {
  const call = useCallStore();
  const { t } = useTranslation();

  if (compact) {
    return (
      <div className="flex gap-2">
        {([
          { on: call.videoEnabled, toggle: call.toggleVideo, OnIcon: Video, OffIcon: VideoOff, onLabel: t("consult.connect.camera_on"), offLabel: t("consult.connect.camera_off"), key: "camera" },
          { on: call.audioEnabled, toggle: call.toggleAudio, OnIcon: Mic, OffIcon: MicOff, onLabel: t("consult.connect.mic_on"), offLabel: t("consult.connect.mic_off"), key: "mic" },
        ] as const).map(({ on, toggle, OnIcon, OffIcon, onLabel, offLabel, key }) => (
          <button key={key} onClick={toggle}
            className={cn(
              "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-[6px] text-sm font-medium border transition-all duration-150",
              on ? "bg-primary/10 text-primary border-primary/25"
                : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
            )}>
            {on ? <OnIcon className="h-4 w-4" /> : <OffIcon className="h-4 w-4" />}
            {on ? onLabel : offLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        {([
          { on: call.videoEnabled, toggle: call.toggleVideo, OnIcon: Video, OffIcon: VideoOff, label: t("consult.connect.camera_label"), onSub: t("consult.connect.on_label"), offSub: t("consult.connect.off_label"), key: "camera" },
          { on: call.audioEnabled, toggle: call.toggleAudio, OnIcon: Mic, OffIcon: MicOff, label: t("consult.connect.microphone_label"), onSub: t("consult.connect.on_label"), offSub: t("consult.connect.off_label"), key: "microphone" },
        ] as const).map(({ on, toggle, OnIcon, OffIcon, label, onSub, offSub, key }) => (
          <button key={key} onClick={toggle}
            className={cn(
              "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-[6px] border transition-all duration-150",
              on ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
                : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
            )}>
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-colors",
              on ? "bg-primary/20" : "bg-muted-foreground/10")}>
              {on ? <OnIcon className="h-5 w-5" /> : <OffIcon className="h-5 w-5" />}
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-sm font-semibold leading-none">{label}</p>
              <p className={cn("text-xs leading-none", on ? "text-primary/70" : "text-muted-foreground/50")}>
                {on ? onSub : offSub}
              </p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/60 text-center">
        {!call.videoEnabled && !call.audioEnabled
          ? t("consult.connect.both_off_warning")
          : !call.videoEnabled
            ? t("consult.connect.camera_off_mic_on")
            : !call.audioEnabled
              ? t("consult.connect.camera_on_mic_off")
              : t("consult.connect.devices_ready")}
      </p>
    </>
  );
};

// ─── ConnectDialogContent ─────────────────────────────────────────────────────

interface ConnectDialogContentProps {
  doctor?: Doctor;
  onMinimize: () => void;
  onCloseCompletely: () => void;
  /**
   * Called whenever the "cancel completely" action becomes available or
   * unavailable. UnifiedModal uses this to show/hide the persistent red
   * cancel button in the shared header bar.
   * Receives the handler fn when a session is in-flight, null otherwise.
   */
  onRegisterCancel?: (fn: (() => void) | null) => void;
}

// Does this error mean the user already has an active consultation elsewhere?
// The backend may return this as 409 or 422, and apiFetch can overwrite the
// message with flattened field errors — so check the raw payload too.
const ACTIVE_SESSION_RE =
  /active consultation session|already have an active|complete or cancel/i;
const isActiveSessionError = (err: any): boolean => {
  if (err?.status === 409) return true;
  const blobs = [
    err?.message,
    err?.data?.message,
    err?.data?.errors ? JSON.stringify(err.data.errors) : "",
  ];
  return blobs.some((b) => ACTIVE_SESSION_RE.test(String(b ?? "")));
};

// Resolve a rejoin target ({ roomName, token-object }). Prefers the authoritative
// patient live-session endpoint, then the error payload, then the call we
// persisted locally this session.
const resolveRejoinTarget = async (err: any): Promise<RejoinTarget | null> => {
  const fromApi = sessionToRejoinTarget(await fetchPatientLiveSession(), "patient");
  if (fromApi) return fromApi;

  const fromError = sessionToRejoinTarget(err?.data, "patient");
  if (fromError) return fromError;

  return rejoinFromPersistedCall();
};

// The Echo authorizer (lib/echo.ts) authorizes the private chat channel using a
// bearer token from localStorage["auth_token"], falling back to
// localStorage["instant_consult_session"].token. Guests have no auth_token, so
// mirror their consultation token here — otherwise /broadcasting/auth returns 403
// and realtime chat fails. Cleared when the session ends.
const setGuestChatAuth = (token: string | null) => {
  try {
    if (token) localStorage.setItem("instant_consult_session", JSON.stringify({ token }));
    else localStorage.removeItem("instant_consult_session");
  } catch {
    /* ignore */
  }
};

export const ConnectDialogContent = ({
  doctor: initialDoctor, onMinimize, onCloseCompletely, onRegisterCancel,
}: ConnectDialogContentProps) => {
  const { t } = useTranslation();
  const [selectedDoctor, setSelectedDoctor] = useState<ApiDoctor | undefined>(undefined);
  const doctor = initialDoctor || (selectedDoctor as unknown as Doctor);

  const { startCall } = useCallContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const call = useCallStore();
  const isGeneral = !initialDoctor && !selectedDoctor;
  const session = useConsultationSession(doctor?.id ?? 0);

  const handleRejoinActive = () => {
    if (!activeRejoin) return;
    onCloseCompletely();
    startCall(activeRejoin.roomName, activeRejoin.token);
  };

  const { data: me } = useMe();
  const { go: goToRole } = useGoToRole();
  const isLoggedIn = !!me;
  // Resume the instant request after a stay-and-switch to patient.
  const [resumeRequest, setResumeRequest] = useState(false);
  // Inline switch prompt (a toast button is unclickable behind the modal).
  const [switchPromptRole, setSwitchPromptRole] = useState<string | null>(null);
  const isProfileComplete = isLoggedIn && !!me?.name && !!me?.phone;

  const [phase, setPhase] = useState<CallPhase>("idle");
  const [fullscreen, setFullscreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchDoctorsData, isLoading: searchLoading } = useGetSearchDoctors({
    instant: true,
    q: searchQuery,
    per_page: 20,
  });
  const searchDoctors = searchDoctorsData?.data || [];

  // ── Resume state ──────────────────────────────────────────────────────────
  // savedSession: non-null while the resume banner is visible
  // isResuming:   true during the 400ms transition after clicking Resume
  // resumeDeclinedRef: persists across renders without triggering effects,
  //   prevents the banner from re-showing after the user clicked "Start fresh"
  const [savedSession, setSavedSession] = useState<ReturnType<typeof session.read>>(null);
  const [isResuming, setIsResuming] = useState(false);
  const resumeDeclinedRef = useRef(false);

  // ── Guest form ────────────────────────────────────────────────────────────
  const [guestName, setGuestName] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCountryCode, setGuestCountryCode] = useState("+250");
  const [guestPassword, setGuestPassword] = useState("");
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginCountryCode, setLoginCountryCode] = useState("+250");
  const [loginPassword, setLoginPassword] = useState("");
  const [guestDescription, setGuestDescription] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);

  // ── Consultation state ────────────────────────────────────────────────────
  const [consultationToken, setConsultationToken] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<number | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ position: number; ahead: number } | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [dailyToken, setDailyToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Set when the backend rejects a new request because one is already active —
  // holds the in-progress consultation so we can offer a one-click rejoin.
  const [activeRejoin, setActiveRejoin] = useState<{ roomName: string; token: any } | null>(null);
  // A backend-confirmed in-progress instant for this doctor (or any, for general).
  // When present, the idle screen offers "Join" instead of starting a new one.
  const [activeInstant, setActiveInstant] = useState<{ id: number } | null>(null);
  const [joiningActive, setJoiningActive] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: number;
    currency: string;
  } | null>(null);

  const invoicePoller = useInvoicePoller();
  const requestMutation = useInstantConsultationRequest();
  const requestAnyMutation = useInstantConsultationRequestAny();
  const payMutation = useInstantConsultationPay();
  const loginMutation = useLogin();

  // Polling is active only when phase === "polling" AND token is set
  const { data: statusData } = useInstantConsultationStatus(
    consultationToken,
    phase === "polling",
  );

  // ── Mount: check for a saved session ─────────────────────────────────────
  //
  // Runs once on mount. Three cases:
  //
  // 1. Saved session WITH pendingPayment
  //    → Request already succeeded; restore token + payment info and go
  //      straight to the payment step. No API re-call needed.
  //
  // 2. Saved session WITHOUT pendingPayment (free / already paid → in queue)
  //    → Pre-load token + guest info; show resume banner; polling starts on
  //      user confirmation.
  //
  // 3. No session (or user already declined)
  //    → Full clean reset.
  //
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      let existing = resumeDeclinedRef.current ? null : session.read();

      // The doctor may have completed/declined this consultation while the
      // dialog was closed — verify before showing a stale resume banner.
      if (existing) {
        const ended = await pruneIfEnded(existing);
        if (cancelled) return;
        if (ended) existing = null;
      }

      // NOTE: the `resumeDeclinedRef.current` guard is already applied above when
      // computing `existing`. (A previous `!resumeDeclinedRef` check here was always
      // false — a ref object is truthy — so the restore branch never ran and every
      // remount reset the flow to idle, discarding an in-progress payment/queue.)
      if (existing) {
        // Pre-load everything from the saved session right away
        setSavedSession(existing);
        setConsultationToken(existing.token);   // ← key fix: token is live immediately
        setGuestChatAuth(existing.token);
        setConsultationId(existing.consultationId ?? null);
        setGuestName(existing.guestName);
        const existingName = splitName(existing.guestName);
        setGuestFirstName(existingName.firstName);
        setGuestLastName(existingName.lastName);
        setGuestPhone(existing.guestPhone);
        setGuestCountryCode("+250");

        if (existing.pendingPayment) {
          // Request succeeded before but user left before paying.
          // Restore payment context and skip straight to payment — no re-request.
          setConsultationId(existing.pendingPayment.consultationId);
          setPaymentInfo({
            amount: existing.pendingPayment.amount,
            currency: existing.pendingPayment.currency,
          });
          // Don't show the resume banner — jump directly to the payment step
          setSavedSession(null);
          setPhase("payment");
        } else {
          // Payment confirmed (or free) — show resume banner, polling on confirm
          setSavedSession(existing);
          setPhase("idle");
        }
      } else {
        setSavedSession(null);
        setConsultationToken(null);
        setConsultationId(null);
        setQueueInfo(null);
        setRoomUrl(null);
        setDailyToken(null);
        setErrorMsg(null);
        setPaymentInfo(null);
        setGuestName(me?.name ?? "");
        const currentName = splitName(me?.name);
        setGuestFirstName(currentName.firstName);
        setGuestLastName(currentName.lastName);
        setGuestEmail(me?.email ?? "");
        setGuestPhone(me?.phone ?? "");
        setGuestCountryCode(me?.country_code ?? "+250");
        setLoginCountryCode(me?.country_code ?? "+250");
        setLoginIdentifier(me?.email ?? me?.phone ?? "");
        if (!initialDoctor) {
          setPhase("search");
        } else {
          setPhase(isProfileComplete ? "idle" : "guest_form");
        }
      }

      setFullscreen(false);
      setGuestError(null);
    };

    init();

    const handleMessage = (e: MessageEvent) => {
      if (e.data === "END_CALL") {
        handleEnd();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      cancelled = true;
      window.removeEventListener("message", handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Promote guest_form → idle when profile becomes complete ──────────────
  useEffect(() => {
    if (phase === "guest_form" && isProfileComplete) {
      setGuestName(me?.name ?? "");
      const currentName = splitName(me?.name);
      setGuestFirstName(currentName.firstName);
      setGuestLastName(currentName.lastName);
      setGuestEmail(me?.email ?? "");
      setGuestPhone(me?.phone ?? "");
      setGuestCountryCode(me?.country_code ?? "+250");
      setLoginCountryCode(me?.country_code ?? "+250");
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, me]);

  // ── Poll handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!statusData || phase !== "polling") return;
    setQueueInfo({ position: Number(statusData.queue_position), ahead: statusData.people_ahead });
    console.info("[Poll] statusData:", JSON.stringify(statusData));

    if (statusData.status === "accepted" || statusData.status === "in_progress") {
      setRoomUrl(statusData.room_url ?? null);
      setDailyToken(statusData.daily_guest_token ?? null);
      setPhase(statusData.status === "in_progress" ? "in_progress" : "accepted");
      session.clear();
    } else if (
      statusData.status === "declined" ||
      statusData.status === "withdrawn" ||
      statusData.status === "expired" ||
      statusData.status === "completed" ||
      statusData.status === "rejected" ||
      statusData.status === "cancelled"
    ) {
      setPhase(statusData.status === "completed" ? "ended" : "rejected");
      session.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusData]);

  // ── Resume saved session ──────────────────────────────────────────────────
  //
  // Token + guest info are already pre-loaded on mount.
  // This only needs to: dismiss the banner, play a brief UX delay, start polling.
  //
  const handleResumeSession = useCallback(async () => {
    if (!savedSession) return;
    setIsResuming(true);
    setErrorMsg(null);
    setSavedSession(null); // dismiss banner, spinner takes over

    await new Promise((r) => setTimeout(r, 400)); // intentional UX delay

    setIsResuming(false);
    setPhase("polling"); // consultationToken is already set — polling starts immediately
  }, [savedSession]);

  // ── Discard saved session ─────────────────────────────────────────────────
  //
  // User chose "Start fresh". Clears sessionStorage, marks declined so
  // re-mounts don't re-show the banner, resets all state including token
  // so handleRequest will send a fresh API call.
  //
  const handleDiscardSession = useCallback(() => {
    session.clear();
    resumeDeclinedRef.current = true;
    setGuestChatAuth(null);
    setGuestChatAuth(null);
    setSavedSession(null);
    setConsultationToken(null);  // cleared — next request will be fresh
    setConsultationId(null);
    setQueueInfo(null);
    setRoomUrl(null);
    setDailyToken(null);
    setErrorMsg(null);
    setPaymentInfo(null);
    setGuestName(me?.name ?? "");
    const currentName = splitName(me?.name);
    setGuestFirstName(currentName.firstName);
    setGuestLastName(currentName.lastName);
    setGuestEmail(me?.email ?? "");
    setGuestPhone(me?.phone ?? "");
    setGuestCountryCode(me?.country_code ?? "+250");
    setLoginCountryCode(me?.country_code ?? "+250");
    setPhase(isProfileComplete ? "idle" : "guest_form");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfileComplete, me]);

  // ── Send request ──────────────────────────────────────────────────────────
  //
  // If a guest_token is already in state (restored from a saved session or from
  // a previous request in this render-cycle), skip the API call entirely and
  // resume from wherever we left off:
  //   - paymentInfo already set  → go to payment
  //   - no paymentInfo           → payment was completed, go to polling
  //

  // ── Detect an existing in-progress instant for this doctor ────────────────
  // If the logged-in patient already has a live instant, the idle screen offers
  // to JOIN it (via /patient/quick/{id}) instead of starting a duplicate.
  useEffect(() => {
    if (!isLoggedIn) {
      setActiveInstant(null);
      return;
    }
    let cancelled = false;
    apiFetch<{ data: Array<any> }>("/patient/quick")
      .then((res) => {
        if (cancelled) return;
        const list = res?.data ?? [];
        const match = list.find(
          (a) =>
            a?.booking_type === "instant" &&
            (a?.status === "in_progress" || a?.status === "confirmed") &&
            (isGeneral || a?.doctor?.id === doctor?.id),
        );
        setActiveInstant(match ? { id: Number(match.id) } : null);
      })
      .catch(() => {
        if (!cancelled) setActiveInstant(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isGeneral, doctor?.id]);

  // Join the existing instant via its /patient/quick/{id} detail (patient token).
  const handleJoinActiveInstant = useCallback(async () => {
    if (!activeInstant) return;
    setJoiningActive(true);
    try {
      const detail = await apiFetch<any>(`/patient/quick/${activeInstant.id}`);
      const decoded = decodeCallToken(detail?.daily_guest_token);
      const roomName = detail?.daily_room_name || decoded?.room;
      if (decoded && roomName) {
        decoded.consultation_id = Number(activeInstant.id);
        decoded.is_owner = false;
        onCloseCompletely();
        startCall(roomName, decoded);
        return;
      }
      if (detail?.daily_room_url) {
        onCloseCompletely();
        window.open(detail.daily_room_url, "_blank", "noopener,noreferrer");
        return;
      }
      toast.error(t("consult.connect.err_could_not_open_active"));
    } catch (err) {
      toast.error((err as Error)?.message || t("consult.connect.err_could_not_join_active"));
    } finally {
      setJoiningActive(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstant, onCloseCompletely, startCall]);

  const handleRequest = useCallback(async (override?: { name: string; phone: string; countryCode?: string; email?: string; password?: string }) => {
    const name = override?.name ?? me?.name ?? guestName;
    const phone = override?.phone ?? me?.phone ?? guestPhone;
    const email = override?.email ?? me?.email ?? guestEmail;
    const countryCode = override?.countryCode ?? me?.country_code ?? guestCountryCode;

    // ── Fast-path: token already exists, skip re-requesting ────────────────
    if (consultationToken) {
      if (paymentInfo) {
        // Request succeeded before, payment still pending — jump to payment
        setPhase("payment");
      } else {
        // Payment was confirmed (or free) — jump straight to polling
        session.save(consultationToken, name, phone);
        setPhase("polling");
      }
      return;
    }

    // ── Role gate: instant consults are patient-only. If signed in as another
    // role, offer a one-click switch instead of failing with "unauthorized". ──
    const activeRole = (me?.active_role ?? me?.role) as string | undefined;
    if (isLoggedIn && activeRole && activeRole !== "patient") {
      setSwitchPromptRole(activeRole);
      return;
    }

    // ── Normal path: send a fresh request ──────────────────────────────────
    setPhase("requesting");
    setErrorMsg(null);
    setActiveRejoin(null);
    setConsultationId(null);
    setPaymentInfo(null);
    invoicePoller.cancel();

    try {
      const name = override?.name ?? me?.name ?? guestName;
      const phone = override?.phone ?? me?.phone ?? guestPhone;
      const countryCode = override?.countryCode ?? me?.country_code ?? guestCountryCode;

      let res;
      if (isGeneral) {
        res = await requestAnyMutation.mutateAsync({
          guest_name: name,
          guest_phone: phone,
          country_code: countryCode,
          guest_email: email || undefined,
          password: override?.password ?? guestPassword,
          description: guestDescription,
        });
      } else {
        const payload: InstantConsultationRequestPayload = {
          doctor_id: doctor!.id,
          guest_name: name,
          guest_phone: phone,
          country_code: countryCode,
          guest_email: email || undefined,
          password: override?.password ?? guestPassword,
          description: guestDescription,
        };
        res = await requestMutation.mutateAsync(payload);
      }
      console.info("[Request] response:", JSON.stringify(res));

      const attemptedPassword = override?.password ?? guestPassword;
      if (res.token && res.user) {
        localStorage.setItem("auth_token", res.token);
        qc.setQueryData(["auth", "me"], { user: res.user });
        qc.invalidateQueries({ queryKey: ["auth", "me"] });
      } else if (attemptedPassword) {
        try {
          await loginMutation.mutateAsync({
            phone,
            password: attemptedPassword,
            country_code: countryCode,
            auth_method: "password"
          });
        } catch (err) {
          console.warn("[Request] auto-login failed:", err);
        }
      }

      setConsultationToken(res.guest_token);
      setGuestChatAuth(res.guest_token);

      // Fallback for different backend keys
      const extractedId = res.id ?? (res as any).instant_consultation_request_id ?? (res as any).instant_consultation_id ?? null;
      setConsultationId(extractedId);


      setQueueInfo({ position: Number(res.queue_position), ahead: res.people_ahead ?? 0 });

      if (
        res.payment_status === "paid" ||
        res.status === "confirmed" ||
        res.status === "accepted" ||
        res.status === "in_progress"
      ) {
        // Free or already paid — save session and start polling immediately
        session.save(res.guest_token, name, phone, extractedId);
        setPhase("polling");
        return;
      }

      // Payment required — save session with pendingPayment so that if the
      // user closes before paying, reopening resumes at the payment step
      const amount = Number(res.amount);
      session.saveWithPendingPayment(res.guest_token, name, phone, res.id, amount, "RWF");
      setPaymentInfo({ amount, currency: "RWF" });
      setPhase("payment");
    } catch (err: unknown) {
      // Wrong-role rejection → offer a one-click switch to patient.
      if ((err as { status?: number })?.status === 403) {
        setSwitchPromptRole((me?.active_role ?? me?.role ?? t("consult.connect.unknown_role_fallback")) as string);
        setPhase("idle");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : t("consult.connect.err_request_failed"));
      // If the backend blocked this because a consultation is already active,
      // surface a one-click rejoin to that session.
      setActiveRejoin(isActiveSessionError(err) ? await resolveRejoinTarget(err) : null);
      setPhase("failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationToken, paymentInfo, doctor?.id, guestName, guestPhone, guestCountryCode, guestEmail, me, guestDescription, guestPassword]);

  // Once the session reflects the patient role after a stay-and-switch, retry.
  useEffect(() => {
    if (!resumeRequest) return;
    if ((me?.active_role ?? me?.role) === "patient") {
      setResumeRequest(false);
      void handleRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeRequest, me]);

  // ── Pay ───────────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!consultationId || !paymentInfo) return;
    console.info("[Pay] initiating for consultationId:", consultationId);
    setPaymentLoading(true);
    setErrorMsg(null);

    try {
      const payRes = await payMutation.mutateAsync(consultationId);
      console.info("[Pay] payRes:", JSON.stringify(payRes));

      (window as any).IremboPay.initiate({
        publicKey: payRes.public_key,
        invoiceNumber: payRes.invoice_number,
        locale: window.IremboPay.locale.EN,
        callback: (err: Error | null) => {
          window.IremboPay.closeModal?.();
          if (err) {
            setErrorMsg(t("consult.connect.err_payment_processing_failed"));
            setPhase("payment");
            return;
          }
          setPhase("payment_verifying");
          invoicePoller.start(
            payRes.invoice_number,
            () => {
              const name = me?.name ?? guestName;
              const phone = me?.phone ?? guestPhone;
              // Payment confirmed — upgrade session: remove pendingPayment block
              // so that if the user closes during polling, resume goes to polling
              if (consultationToken) session.save(consultationToken, name, phone, consultationId);
              setPhase("polling");
            },
            (msg) => { setErrorMsg(msg); setPhase("payment"); },
          );
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("consult.connect.err_payment_initiate_failed");
      console.error("[Pay] error:", msg);
      setErrorMsg(`${msg} ${t("consult.connect.please_try_again_suffix")}`);
      setPhase("payment");
    } finally {
      setPaymentLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId, consultationToken, guestName, guestPhone, me, paymentInfo]);

  // ── Guest form submit ─────────────────────────────────────────────────────
  const handleGuestSubmit = () => {
    const name = joinName(guestFirstName, guestLastName);
    const email = guestEmail.trim();

    if (!guestFirstName.trim()) { setGuestError(t("consult.connect.err_first_name_required")); return; }
    if (!guestLastName.trim()) { setGuestError(t("consult.connect.err_last_name_required")); return; }
    if (!isLoggedIn && !email) {
      setGuestError(t("consult.connect.err_email_required", "Email is required to create your account."));
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      setGuestError(t("consult.connect.err_email_invalid", "Please enter a valid email address."));
      return;
    }

    const phoneValidation = validatePhoneForCountry(guestPhone, guestCountryCode);
    if (!phoneValidation.isValid) {
      setGuestError(phoneValidation.message ?? t("consult.connect.err_phone_required"));
      return;
    }

    if (!isLoggedIn && !guestPassword.trim()) { setGuestError(t("consult.connect.err_password_required")); return; }
    if (!isLoggedIn && guestPassword.length < 6) { setGuestError(t("consult.connect.err_password_min_length")); return; }

    setGuestError(null);
    setGuestName(name);
    handleRequest({
      name,
      phone: phoneValidation.normalizedPhone,
      countryCode: phoneValidation.normalizedCountryCode,
      email,
      password: isLoggedIn ? undefined : guestPassword.trim(),
    });
  };

  const handleLoginSubmit = async () => {
    const identifier = loginIdentifier.trim();
    if (!identifier) { setGuestError(t("consult.connect.err_identifier_required")); return; }
    if (!loginPassword.trim()) { setGuestError(t("consult.connect.err_password_required")); return; }

    setGuestError(null);
    try {
      const isEmail = identifier.includes("@");
      const phoneValidation = !isEmail ? validatePhoneForCountry(identifier, loginCountryCode) : null;

      if (isEmail && !EMAIL_RE.test(identifier)) {
        setGuestError(t("consult.connect.err_email_invalid", "Please enter a valid email address."));
        return;
      }
      if (phoneValidation && !phoneValidation.isValid) {
        setGuestError(phoneValidation.message ?? t("consult.connect.err_identifier_required"));
        return;
      }

      const data = await loginMutation.mutateAsync(
        isEmail
          ? { email: identifier, auth_method: "password" as const, password: loginPassword }
          : {
            phone: phoneValidation?.normalizedPhone ?? identifier,
            country_code: phoneValidation?.normalizedCountryCode ?? "+250",
            auth_method: "password" as const,
            password: loginPassword,
          },
      );
      const currentName = splitName(data.user.name);
      setGuestName(data.user.name);
      setGuestFirstName(currentName.firstName);
      setGuestLastName(currentName.lastName);
      setGuestEmail(data.user.email ?? "");
      setGuestPhone(data.user.phone ?? "");
      setGuestCountryCode(data.user.country_code ?? "+250");
      setLoginCountryCode(data.user.country_code ?? "+250");
      await handleRequest({
        name: data.user.name,
        phone: data.user.phone,
        countryCode: data.user.country_code,
        email: data.user.email,
      });
    } catch (err: any) {
      setGuestError(err?.message || t("consult.connect.err_login_failed"));
    }
  };

  // Join call
  const handleJoin = () => {
    if (!roomUrl || !dailyToken) return;
    const roomName = roomUrl.split("/consultation/").pop() ?? roomUrl;

    // Resolve a consultation id even if the live state was lost (e.g. the user
    // resumed a saved session). Without it the in-call chat can't work.
    const resolvedId =
      consultationId ??
      savedSession?.consultationId ??
      session.read()?.consultationId ??
      null;

    if (resolvedId == null) {
      console.warn("[ConnectDialog] Joining without a consultation_id — chat will be unavailable.");
    }

    // Inject consultation_id into the token so the consultation room can use it
    // for the chat API.
    let enrichedToken = encodeURIComponent(dailyToken);
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(dailyToken)));
      decoded.consultation_id = resolvedId;
      enrichedToken = encodeURIComponent(btoa(JSON.stringify(decoded)));
    } catch {
      // If decoding fails, pass the original token as-is.
      enrichedToken = encodeURIComponent(dailyToken);
    }

    onCloseCompletely();
    navigate(`/consultation/${roomName}?t=${enrichedToken}`);
  };

  // ── Cancel completely ─────────────────────────────────────────────────────
  // The ONLY path that truly ends the session from inside this component.
  // Clears sessionStorage, resets state, ends CallStore call, then calls
  // onCloseCompletely so DoctorCard closes the modal.
  const handleCancelCompletely = useCallback(() => {
    invoicePoller.cancel();
    session.clear();
    resumeDeclinedRef.current = true;
    setSavedSession(null);
    setConsultationToken(null);
    setConsultationId(null);
    setQueueInfo(null);
    setRoomUrl(null);
    setDailyToken(null);
    setErrorMsg(null);
    setPaymentInfo(null);
    call.endCall();
    onCloseCompletely(); // tells DoctorCard to close the modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCloseCompletely]);

  // ── End connected call ────────────────────────────────────────────────────
  const handleEnd = () => {
    call.endCall();
    session.clear();
    setGuestChatAuth(null);
    setPhase("ended");
  };

  // ── Retry after failure / rejection ──────────────────────────────────────
  // Full reset — clears token so handleRequest sends a fresh API call.
  const handleRetry = () => {
    invoicePoller.cancel();
    session.clear();
    resumeDeclinedRef.current = true;
    setSavedSession(null);
    setConsultationToken(null);  // cleared so handleRequest won't fast-path
    setConsultationId(null);
    setQueueInfo(null);
    setRoomUrl(null);
    setDailyToken(null);
    setErrorMsg(null);
    setActiveRejoin(null);
    setPaymentInfo(null);
    if (isProfileComplete) handleRequest();
    else setPhase("guest_form");
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const doctorName = doctor?.user.name ?? t("consult.connect.fallback_specialist_name");
  const doctorInitial = nameInitial(doctorName);

  const titleText = (): string => {
    if (savedSession && !isResuming) return t("consult.connect.title_resume");
    if (isResuming) return t("consult.connect.title_reconnecting");
    if (phase === "idle") return t("consult.connect.title_idle");
    if (phase === "guest_form") return t("consult.connect.title_guest_form");
    if (phase === "requesting") return t("consult.connect.title_requesting");
    if (phase === "payment") return t("consult.connect.title_payment");
    if (phase === "payment_verifying") return t("consult.connect.title_payment_verifying");
    if (phase === "polling") return t("consult.connect.title_polling");
    if (phase === "accepted") return t("consult.connect.title_accepted");
    if (phase === "in_progress") return t("consult.connect.title_in_progress");
    if (phase === "connected") return t("consult.connect.title_connected");
    if (phase === "rejected") return t("consult.connect.title_rejected");
    if (phase === "failed") return t("consult.connect.title_failed");
    if (phase === "ended") return t("consult.connect.title_ended");
    return t("consult.connect.title_idle");
  };

  const progressValue = (): number => {
    if (phase === "requesting") return 25;
    if (phase === "payment") return 40;
    if (phase === "payment_verifying") return 55;
    if (phase === "polling") return 70;
    if (phase === "accepted") return 85;
    if (phase === "in_progress") return 100;
    return 0;
  };

  const showProgress = ["requesting", "payment_verifying", "polling", "accepted", "in_progress"].includes(phase);
  const isInFlight = ["requesting", "payment", "payment_verifying", "polling", "accepted", "in_progress"].includes(phase);

  // ── Register cancel handler with parent (UnifiedModal header) ────────────
  // When a session is in-flight, tell the parent header to show the cancel
  // button. When we leave an in-flight phase, tell it to hide the button.
  useEffect(() => {
    if (!onRegisterCancel) return;
    onRegisterCancel(isInFlight ? handleCancelCompletely : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInFlight]);

  // ── In-call view ──────────────────────────────────────────────────────────
  if (phase === "connected") {
    const roomName = roomUrl?.split("/consultation/").pop();
    const iframeSrc = roomName && dailyToken
      ? `${window.location.origin}/consultation/${roomName}?t=${encodeURIComponent(dailyToken)}`
      : null;

    return (
      <div className={cn(
        "relative flex bg-black/80 overflow-hidden backdrop-blur-md",
        fullscreen ? "h-screen w-screen fixed inset-0 z-[70]" : "h-[520px]",
      )}>
        <div className="relative flex-1 flex flex-col min-w-0 transition-all duration-300"
          style={{ marginRight: chatOpen ? 288 : 0 }}>
          {iframeSrc ? (
            <iframe src={iframeSrc}
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
              allowFullScreen className="absolute inset-0 w-full h-full border-0"
              title={t("consult.connect.consultation_with", { name: doctorName })} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="relative mx-auto w-[88px] h-[88px]">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="relative h-[88px] w-[88px] rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-3xl font-bold ring-[1.5px] ring-emerald-500/30 select-none">
                    {doctorInitial}
                  </div>
                </div>
                <p className="text-base text-white/50">{t("consult.connect.connecting_to_room")}</p>
              </div>
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2.5 z-20 pointer-events-none bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2 pointer-events-none">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white/70 font-mono tracking-wide">{t("consult.connect.live_label")} · {fmt(call.elapsed)}</span>
            </div>
            <div className="flex items-center gap-1 pointer-events-auto">
              <SignalBars strength={call.signalStrength} />
              <button onClick={onMinimize} title={t("consult.connect.minimize")}
                className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                <Minus className="h-4 w-4" />
              </button>
              <button onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? t("consult.connect.exit_fullscreen") : t("consult.connect.fullscreen_action")}
                className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors">
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button onClick={onCloseCompletely} title={t("consult.connect.end_and_close")}
                className="h-7 w-7 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-3 z-20 bg-gradient-to-t from-black/65 to-transparent">
            <div className="relative">
              <button
                onClick={() => { const next = !chatOpen; setChatOpen(next); if (next) call.clearUnread(); }}
                className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
                  chatOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
                <MessageSquare className="h-4 w-4" />
              </button>
              {call.unreadCount > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center leading-none">
                  {call.unreadCount > 9 ? "9+" : call.unreadCount}
                </span>
              )}
            </div>
            <button onClick={handleEnd}
              className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/35">
              <PhoneOff className="h-[18px] w-[18px]" />
            </button>
            <div className="w-10" />
          </div>
        </div>

        {/* Chat panel */}
        <div className={cn(
          "absolute top-0 right-0 h-full flex flex-col z-30 bg-card border-l border-border transition-all duration-300 ease-in-out",
          chatOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden",
        )}>
          {chatOpen && (
            <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)}
              doctorAvatar={doctorInitial} consultationId={consultationId} isOwner={false} mode="instant" />
          )}
        </div>
      </div>
    );
  }


  // ── Pre-call / post-call panel ────────────────────────────────────────────
  return (
    <div className="min-h-0 flex-1 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-5 space-y-4">
      {switchPromptRole && (
        <div className="rounded-[6px] border border-amber-400/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-foreground">{t("consult.connect.switch_role_title")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("consult.connect.switch_role_body", { role: switchPromptRole })}
            </p>
          </div>
          <button
            onClick={() =>
              goToRole("patient", {
                stay: true,
                onSwitched: () => {
                  setSwitchPromptRole(null);
                  setResumeRequest(true);
                },
              })
            }
            className="h-8 px-3 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
          >
            {t("consult.connect.switch_role_button")}
          </button>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">{titleText()}</span>
      </div>

      {/* ── Resume banner ── */}
      {savedSession && !isResuming && (
        <ResumeSessionBanner
          savedAt={savedSession.savedAt}
          onResume={handleResumeSession}
          onDiscard={handleDiscardSession}
          isResuming={isResuming}
        />
      )}

      {/* ── Resuming spinner ── */}
      {isResuming && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
          <p className="text-sm font-medium text-foreground">{t("consult.connect.reconnecting_message")}</p>
          <p className="text-xs text-muted-foreground">{t("consult.connect.reconnecting_sub")}</p>
        </div>
      )}

      {/* Doctor card — hidden while resume banner or spinner is active */}
      {phase !== "guest_form" && !savedSession && !isResuming && (
        <div className={cn(
          "flex items-center gap-3.5 p-3.5 rounded-[6px] border transition-all",
          showProgress ? "border-primary/20 bg-primary/5" : "border-border bg-muted/50",
        )}>
          <div className="relative shrink-0">
            <div className="h-12 w-12 rounded-[6px] bg-primary/15 text-primary flex items-center justify-center text-base font-bold select-none">
              {doctorInitial}
            </div>
            {showProgress && (
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-amber-400 animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">{doctorName}</p>
            {doctor?.specialization && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{doctor.specialization}</p>
            )}
            {queueInfo && phase === "polling" && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("consult.connect.queue_position", { position: queueInfo.position })} ·{" "}
                {queueInfo.ahead === 0
                  ? t("consult.connect.queue_next")
                  : t("consult.connect.queue_ahead", { count: queueInfo.ahead })}
              </p>
            )}
          </div>
          {phase !== "idle" && <StatusBadge phase={phase} />}
        </div>
      )}

      {/* Progress bar */}
      {showProgress && !savedSession && !isResuming && (
        <div className="space-y-2">
          <Progress value={progressValue()}
            className="h-[3px] bg-muted [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-700" />
          <p className="text-xs text-muted-foreground text-center">
            {phase === "requesting" && t("consult.connect.progress_requesting")}
            {phase === "payment_verifying" && t("consult.connect.progress_payment_verifying")}
            {phase === "polling" && t("consult.connect.progress_polling")}
            {phase === "accepted" && t("consult.connect.progress_accepted")}
            {phase === "in_progress" && t("consult.connect.progress_in_progress")}
          </p>
        </div>
      )}

      {/* Phase content — hidden while banner/spinner is active */}
      {!savedSession && !isResuming && (
        <>
          {/* ── Guest form ── */}
          {phase === "guest_form" && (
            <div className="space-y-4">
              <div className=" flex items-center gap-2 p-3 rounded-[6px] bg-primary/20 border border-border">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {isLoggedIn ? t("consult.connect.confirm_details")
                    : t("consult.connect.signin_or_create")}
                </p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-[6px] border border-border bg-muted/30">
                <div className="h-9 w-9 rounded-[6px] bg-primary/15 text-primary flex items-center justify-center text-sm font-bold select-none shrink-0">
                  {doctorInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{doctorName}</p>
                  {doctor?.specialization && (
                    <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                  )}
                </div>
              </div>

              {!isLoggedIn && (
                <div className="grid grid-cols-2 gap-1 rounded-[6px] border border-border bg-muted/40 p-1">
                  {(["register", "login"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setAuthMode(mode);
                        setGuestError(null);
                      }}
                      className={cn(
                        "h-8 rounded-[6px] text-xs font-semibold transition-colors",
                        authMode === mode
                          ? "bg-card text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode === "register" ? t("consult.connect.create_account") : t("consult.connect.sign_in")}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {isLoggedIn || authMode === "register" ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t("consult.connect.first_name")}</Label>
                        <Input
                          placeholder={t("consult.connect.first_name_placeholder")}
                          value={guestFirstName}
                          onChange={(e) => setGuestFirstName(e.target.value)}
                          className="h-9 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t("consult.connect.last_name")}</Label>
                        <Input
                          placeholder={t("consult.connect.last_name_placeholder")}
                          value={guestLastName}
                          onChange={(e) => setGuestLastName(e.target.value)}
                          className="h-9 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{t("consult.connect.email_address")}{!isLoggedIn && <span className="ml-1 text-destructive">*</span>}</Label>
                      <Input
                        type="email"
                        required={!isLoggedIn}
                        placeholder={t("consult.connect.email_placeholder")}
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="h-9 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{t("consult.connect.phone_number")}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={guestCountryCode}
                          onChange={(e) => setGuestCountryCode(e.target.value)}
                          className="h-9 w-20 text-center text-sm font-medium"
                          placeholder="+250"
                          aria-label={t("consult.connect.country_code", "Country code")}
                        />
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder={t("consult.connect.phone_placeholder")}
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="h-9 flex-1 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                        />
                      </div>
                    </div>
                    {!isLoggedIn && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t("consult.connect.password")}</Label>
                        <Input
                          placeholder={t("consult.connect.password_placeholder")}
                          type="password"
                          value={guestPassword}
                          onChange={(e) => setGuestPassword(e.target.value)}
                          className="h-9 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{t("consult.connect.email_or_phone")}</Label>
                      <div className="flex gap-2">
                        {!loginIdentifier.includes("@") && (
                          <Input
                            value={loginCountryCode}
                            onChange={(e) => setLoginCountryCode(e.target.value)}
                            className="h-9 w-20 text-center text-sm font-medium"
                            placeholder="+250"
                            aria-label={t("consult.connect.country_code", "Country code")}
                          />
                        )}
                        <Input
                          placeholder={t("consult.connect.email_or_phone_placeholder")}
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          className="h-9 flex-1 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleLoginSubmit()}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">{t("consult.connect.password")}</Label>
                      <Input
                        placeholder={t("consult.connect.password_placeholder")}
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-9 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleLoginSubmit()}
                      />
                    </div>
                  </>
                )}
                {isGeneral && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{t("consult.connect.symptoms_label")}</Label>
                    <textarea
                      placeholder={t("consult.connect.symptoms_placeholder")}
                      value={guestDescription}
                      onChange={(e) => setGuestDescription(e.target.value)}
                      className="flex min-h-[60px] w-full rounded-[6px] border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}
                {guestError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> {guestError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Button
                  onClick={authMode === "login" && !isLoggedIn ? handleLoginSubmit : handleGuestSubmit}
                  disabled={loginMutation.isPending || requestMutation.isPending || requestAnyMutation.isPending}
                  className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px]"
                >
                  {loginMutation.isPending || requestMutation.isPending || requestAnyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                  {authMode === "login" && !isLoggedIn ? t("consult.connect.sign_in_and_request") : t("consult.connect.request_consultation")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={onMinimize} className="w-full h-9 text-sm rounded-[6px]">
                  {t("consult.connect.minimize")}
                </Button>
              </div>
            </div>
          )}
          {/* ── Search ── */}
          {phase === "search" && (
            <div className="space-y-4 pt-1 pb-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("consult.connect.search_label")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("consult.connect.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-muted/30"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {searchLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchDoctors.length > 0 ? (
                  searchDoctors.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoctor(doc as any);
                        setPhase(isProfileComplete ? "idle" : "guest_form");
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-[6px] border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-[6px] bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                          {nameInitial(doc.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{doc.user.name}</p>
                          {doc.specialization && (
                            <p className="text-xs text-muted-foreground truncate">{doc.specialization}</p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    {t("consult.connect.no_doctors_found")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Idle ── */}
          {phase === "idle" && (
            <div className="space-y-3 pt-1">
              {activeInstant ? (
                // Already has a live instant → join it instead of starting a new one.
                <>
                  <div className="flex items-center gap-2 p-3 rounded-[6px] bg-yellow-500/10 border border-yellow-500/20 text-[12px] text-yellow-700 dark:text-yellow-400">
                    <Activity className="h-4 w-4 shrink-0" />
                    {doctor ? t("consult.connect.already_active_with_doctor") : t("consult.connect.already_active_general")}
                  </div>
                  <Button
                    onClick={handleJoinActiveInstant}
                    disabled={joiningActive}
                    className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px] bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {joiningActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                    {t("consult.connect.join_your_consultation")}<ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={onMinimize} className="w-full h-9 text-sm rounded-[6px]">
                    {t("consult.connect.minimize")}
                  </Button>
                </>
              ) : (
                <>
                  {isGeneral && (
                    <div className="space-y-1.5 mb-2">
                      <Label className="text-sm font-medium">{t("consult.connect.symptoms_label")}</Label>
                      <textarea
                        placeholder={t("consult.connect.symptoms_placeholder")}
                        value={guestDescription}
                        onChange={(e) => setGuestDescription(e.target.value)}
                        className="flex min-h-[60px] w-full rounded-[6px] border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  )}
                  <DeviceToggles compact={false} />
                  <Button onClick={() => handleRequest()} className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px]">
                    <Wifi className="h-4 w-4" />{t("consult.connect.start_instant")}<ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={onMinimize} className="w-full h-9 text-sm rounded-[6px]">
                    Minimize
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── Requesting ── */}
          {phase === "requesting" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("consult.connect.requesting_message")}</p>
            </div>
          )}

          {/* ── Polling ── */}
          {phase === "polling" && (
            <div className="space-y-3">
              <DeviceToggles compact={true} />
              <div className="space-y-2 pt-1">
                <Button variant="outline" onClick={onMinimize} className="w-full h-9 text-sm rounded-[6px]">
                  {t("consult.connect.close_place_saved")}
                </Button>
              </div>
            </div>
          )}

          {/* ── Payment ── */}
          {phase === "payment" && (
            <div className="space-y-4">
              <div className="p-4 rounded-[6px] border border-border bg-muted/40 space-y-3">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{t("consult.connect.payment_summary_title")}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("consult.connect.payment_patient_label")}</span>
                  <span className="font-medium text-foreground">{guestName || me?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("consult.connect.payment_phone_label")}</span>
                  <span className="font-medium text-foreground">{guestPhone || me?.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("consult.connect.payment_doctor_label")}</span>
                  <span className="font-medium text-foreground">{doctorName}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-base">
                  <span className="font-semibold text-foreground">{t("consult.connect.payment_amount_label")}</span>
                  <span className="font-bold text-primary">
                    {paymentInfo ? `${paymentInfo.currency} ${paymentInfo.amount.toLocaleString()}` : t("consult.connect.payment_loading")}
                  </span>
                </div>
              </div>
              {errorMsg && (
                <div className="p-3 rounded-[6px] bg-destructive/5 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{errorMsg}
                </div>
              )}
              <Button onClick={handlePay} disabled={paymentLoading || !consultationId}
                className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px]">
                {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {paymentLoading ? t("consult.connect.payment_initiating") : t("consult.connect.pay_now")}
              </Button>
              <Button variant="outline" onClick={onMinimize} className="w-full h-9 text-sm rounded-[6px]">{t("consult.connect.minimize")}</Button>
            </div>
          )}

          {/* ── Payment verifying ── */}
          {phase === "payment_verifying" && (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">{t("consult.connect.confirming_payment")}</p>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  {t("consult.connect.confirming_payment_hint")}
                </p>
              </div>
              <Button variant="outline" onClick={onMinimize} className="w-full h-9 text-sm rounded-[6px]">
                {t("consult.connect.minimize_verification_bg")}
              </Button>
            </div>
          )}

          {/* ── Accepted / In Progress ── */}
          {(phase === "accepted" || phase === "in_progress") && (
            <div className="space-y-3">
              <DeviceToggles compact={true} />
              <div className="space-y-2 pt-1">
                <Button onClick={handleJoin}
                  className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px] bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Phone className="h-4 w-4" />{t("consult.connect.join_call")}<ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={onMinimize} className="w-full h-9 text-sm rounded-[6px]">
                  {t("consult.connect.minimize_join_later")}
                </Button>
              </div>
            </div>
          )}

          {/* ── Failed / Rejected ── */}
          {(phase === "failed" || phase === "rejected") && (
            <div className="space-y-3">
              {errorMsg && (
                <div className="p-3 rounded-[6px] bg-destructive/5 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{errorMsg}
                </div>
              )}
              {phase === "rejected" && (
                <div className="p-3 rounded-[6px] bg-muted border border-border text-center text-sm text-muted-foreground">
                  {t("consult.connect.doctor_unavailable")}
                </div>
              )}
              <div className="space-y-2 pt-1">
                {activeRejoin && (
                  <Button onClick={handleRejoinActive} className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px]">
                    <Phone className="h-4 w-4" />{t("consult.connect.rejoin_active")}
                  </Button>
                )}
                <Button onClick={handleRetry} variant={activeRejoin ? "outline" : "default"} className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px]">
                  <Phone className="h-4 w-4" />{t("consult.connect.try_again")}
                </Button>
                <Button variant="outline" onClick={onCloseCompletely} className="w-full h-9 text-sm rounded-[6px]">{t("consult.connect.close")}</Button>
              </div>
            </div>
          )}

          {/* ── Ended ── */}
          {phase === "ended" && (
            <div className="space-y-3">
              <div className="rounded-[6px] bg-muted border border-border px-4 py-3 text-center space-y-1">
                <p className="text-sm font-medium text-foreground/60">{t("consult.connect.ended_title")}</p>
                <p className="text-xs text-muted-foreground">{t("consult.connect.ended_duration")}</p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleRetry} className="w-full h-10 text-sm font-semibold gap-2 rounded-[6px]">
                  <Phone className="h-4 w-4" />{t("consult.connect.reconnect_with", { name: doctorName })}
                </Button>
                <Button variant="outline" onClick={onCloseCompletely} className="w-full h-9 text-sm rounded-[6px]">{t("consult.connect.close")}</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trust footer */}
      {["idle", "guest_form", "payment", "payment_verifying", "polling", "accepted", "in_progress"].includes(phase) && (
        <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground/50 pt-1">
          <ShieldCheck className="h-4 w-4" />{t("consult.connect.hipaa_footer")}
        </div>
      )}

      {/* In-flight hint */}
      {isInFlight && (
        <p className="text-center text-sm text-muted-foreground/40">
          {t("consult.connect.inflight_hint")}
        </p>
      )}
    </div>
  );
};

// ─── Legacy ConnectDialog wrapper ─────────────────────────────────────────────

interface ConnectDialogProps {
  doctor?: Doctor;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/** @deprecated Use ConnectDialogContent inside UnifiedModal instead. */
export const ConnectDialog = ({ doctor, open, onOpenChange }: ConnectDialogProps) => {
  if (!open) return null;
  return (
    <ConnectDialogContent
      doctor={doctor}
      onMinimize={() => onOpenChange(false)}
      onCloseCompletely={() => onOpenChange(false)}
    />
  );
};
