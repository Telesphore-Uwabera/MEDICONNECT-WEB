// Patient-side alert for doctor-initiated video sessions.
//
// Mirrors components/doctor/InstantPaidAlertListener.tsx: it polls in the
// background and raises a floating card + browser Notification + sound the
// moment something needs the patient's attention. Today that "something" is
// a fitness-certificate identity-verification (confirmation) session started
// by the doctor — the patient previously only found out via SMS and had to
// remember to come back and click "Join verification call".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, ShieldCheck, Video, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useCallContext } from "@/context/CallContext";
import { startInAppCallFromJoin } from "@/lib/scheduled-call";
import {
  useGetPatientCertificates,
  type Certificate,
  type ConfirmationSessionJoin,
} from "@/hooks/patient/use-patient-certificates";

const ALERT_AUDIO_SRC = "/audio/new-notification-057-494255.mp3";
const SEEN_STORAGE_KEY = "patient_confirmation_session_seen";
const POLL_INTERVAL_MS = 10_000;
const ALERT_DURATION_MS = 60_000;
const SPEECH_INTERVAL_MS = 12_000;

type SessionAlert = { cert: Certificate };

/** Unique per session — re-requesting a session (new confirmation_requested_at) fires again. */
const seenKey = (cert: Certificate) => `${cert.id}:${cert.confirmation_requested_at ?? ""}`;

const loadSeenKeys = () => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set<string>();
  }
};

const saveSeenKeys = (keys: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(Array.from(keys).slice(-100)));
};

const getDoctorLabel = (cert: Certificate) => cert.doctor?.name?.trim() || "Your doctor";

export function PatientCallAlertListener() {
  const { startCall } = useCallContext();
  const { data } = useGetPatientCertificates(undefined, { refetchInterval: POLL_INTERVAL_MS });
  const [activeAlert, setActiveAlert] = useState<SessionAlert | null>(null);
  const [joining, setJoining] = useState(false);

  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    notificationsSupported ? Notification.permission : "denied",
  );

  const seenKeysRef = useRef<Set<string>>(loadSeenKeys());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pendingSessions = useMemo(
    () =>
      (data?.certificates ?? []).filter(
        (c) => !!c.confirmation_requested_at && !c.identity_verified_via_video,
      ),
    [data?.certificates],
  );

  const requestNotificationPermission = useCallback(async () => {
    if (!notificationsSupported) return "denied" as NotificationPermission;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  }, [notificationsSupported]);

  const showBrowserNotification = useCallback(
    (alert: SessionAlert) => {
      if (!notificationsSupported || Notification.permission !== "granted") return;
      const notification = new Notification("Video identity check started", {
        body: `${getDoctorLabel(alert.cert)} started a verification call for certificate #${alert.cert.certificate_number}.`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `confirmation-session-${alert.cert.id}`,
        renotify: true,
        requireInteraction: true,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    },
    [notificationsSupported],
  );

  const stopAlertSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speakAlert = useCallback((alert: SessionAlert) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(
      `${getDoctorLabel(alert.cert)} has started your identity verification call. Please join now.`,
    );
    utterance.rate = 0.95;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const startAlertSound = useCallback(
    (alert: SessionAlert) => {
      stopAlertSound();
      const audio = new Audio(ALERT_AUDIO_SRC);
      audio.loop = true;
      audio.volume = 0.85;
      audioRef.current = audio;
      void audio.play().catch(() => {
        audioRef.current = null;
      });
      speakAlert(alert);
      speechTimerRef.current = setInterval(() => speakAlert(alert), SPEECH_INTERVAL_MS);
      stopTimerRef.current = setTimeout(stopAlertSound, ALERT_DURATION_MS);
    },
    [speakAlert, stopAlertSound],
  );

  const raiseAlert = useCallback(
    (alert: SessionAlert) => {
      setActiveAlert(alert);
      startAlertSound(alert);
      showBrowserNotification(alert);
    },
    [showBrowserNotification, startAlertSound],
  );

  useEffect(() => {
    const unseen = pendingSessions.find((cert) => !seenKeysRef.current.has(seenKey(cert)));
    if (!unseen) return;
    seenKeysRef.current.add(seenKey(unseen));
    saveSeenKeys(seenKeysRef.current);
    raiseAlert({ cert: unseen });
  }, [pendingSessions, raiseAlert]);

  useEffect(() => stopAlertSound, [stopAlertSound]);

  const dismiss = () => {
    stopAlertSound();
    setActiveAlert(null);
  };

  const handleJoin = async () => {
    if (!activeAlert) return;
    const certId = activeAlert.cert.id;
    setJoining(true);
    try {
      const res = await apiFetch<ConfirmationSessionJoin>(
        `/patient/certificates/${certId}/confirmation-session`,
      );
      dismiss();
      const token = res.patient_token ?? res.token ?? res.doctor_token;
      const started = startInAppCallFromJoin(
        startCall,
        { token, room_name: res.room_name, room_url: res.room_url, join_url: res.join_url },
        { isOwner: false },
      );
      if (started) {
        toast.success("Joining the verification call…");
      } else {
        const url = res.join_url || res.room_url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast.error("The verification call isn't ready yet.");
      }
    } catch (err) {
      toast.error((err as Error)?.message || "Could not join the verification call.");
    } finally {
      setJoining(false);
    }
  };

  if (!activeAlert) {
    if (notificationPermission !== "default") return null;
    return (
      <button
        type="button"
        onClick={requestNotificationPermission}
        className="fixed bottom-5 right-5 z-[95] inline-flex h-10 items-center gap-2 rounded-[6px] border border-primary/30 bg-card px-3 text-xs font-semibold text-foreground shadow-lg hover:bg-muted"
      >
        <BellRing className="h-4 w-4 text-primary" />
        Enable desktop alerts
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[95] w-[min(480px,calc(100vw-24px))] rounded-[6px] border border-primary/30 bg-card shadow-2xl">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-primary/15 text-primary">
          <Video className="h-5 w-5 animate-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Video identity check started</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {getDoctorLabel(activeAlert.cert)} started a verification call for your fitness certificate.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-[6px] p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss verification call alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-2 rounded-[6px] border border-border/70 bg-background p-3 text-xs">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">Certificate #{activeAlert.cert.certificate_number}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            {notificationPermission === "default" && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="h-9 rounded-[6px] border border-primary/30 px-3 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Enable desktop alerts
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="h-9 rounded-[6px] border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-[6px] bg-primary px-3 text-xs font-semibold text-primary-foreground",
                "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60",
              )}
            >
              <Video className="h-3.5 w-3.5" />
              {joining ? "Joining…" : "Join call"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
