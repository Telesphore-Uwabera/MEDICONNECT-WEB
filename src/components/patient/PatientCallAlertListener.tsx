// Patient-side alert for doctor-initiated video sessions.
//
// Mirrors components/doctor/InstantPaidAlertListener.tsx: it polls in the
// background and raises a floating card + browser Notification + sound when a
// call needs the patient's attention. Certificate verification alerts fire
// immediately. Scheduled appointment alerts wait for a 30-second grace period
// after the doctor starts the call, then alert only if the patient is still not
// connected.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CalendarClock, ShieldCheck, Video, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { formatAppointmentDateTime } from "@/lib/display-dates";
import { useCallContext } from "@/context/CallContext";
import { startInAppCallFromJoin } from "@/lib/scheduled-call";
import {
  useGetPatientCertificates,
  type Certificate,
  type ConfirmationSessionJoin,
} from "@/hooks/patient/use-patient-certificates";
import {
  useGetPatientAppointments,
  type ApiAppointment,
} from "@/hooks/patient/use-patient-appointment";

const ALERT_AUDIO_SRC = "/audio/new-notification-057-494255.mp3";
const CERT_SEEN_STORAGE_KEY = "patient_confirmation_session_seen";
const APPOINTMENT_SEEN_STORAGE_KEY = "patient_appointment_call_alert_seen_ids";
const POLL_INTERVAL_MS = 10_000;
const APPOINTMENT_GRACE_MS = 30_000;
const ALERT_DURATION_MS = 60_000;
const SPEECH_INTERVAL_MS = 12_000;

type SessionAlert =
  | { kind: "certificate"; cert: Certificate }
  | { kind: "appointment"; appointment: ApiAppointment };

interface AppointmentJoinResponse {
  message?: string;
  room_url?: string;
  room_name?: string;
  token?: string;
  join_url?: string;
}

const certSeenKey = (cert: Certificate) => `${cert.id}:${cert.confirmation_requested_at ?? ""}`;
const appointmentSeenKey = (appointment: ApiAppointment) => appointment.id;

const loadSeenStrings = (storageKey: string) => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set<string>();
  }
};

const saveSeenStrings = (storageKey: string, keys: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(keys).slice(-100)));
};

const loadSeenNumbers = (storageKey: string) => {
  if (typeof window === "undefined") return new Set<number>();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<number>(
      Array.isArray(ids) ? ids.map(Number).filter((id) => Number.isFinite(id)) : [],
    );
  } catch {
    return new Set<number>();
  }
};

const saveSeenNumbers = (storageKey: string, keys: Set<number>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(keys).slice(-100)));
};

const getDoctorLabel = (cert: Certificate) => cert.doctor?.name?.trim() || "Your doctor";
const getAppointmentProviderLabel = (appointment: ApiAppointment) =>
  appointment.doctor?.user?.name?.trim() ||
  appointment.doctor?.designations?.trim() ||
  appointment.hospital?.name_en?.trim() ||
  "Your doctor";

const getAlertTitle = (alert: SessionAlert) =>
  alert.kind === "certificate" ? "Video identity check started" : "Doctor started your appointment call";

const getAlertBody = (alert: SessionAlert) => {
  if (alert.kind === "certificate") {
    return `${getDoctorLabel(alert.cert)} started a verification call for certificate #${alert.cert.certificate_number}.`;
  }
  return `${getAppointmentProviderLabel(alert.appointment)} is waiting for you to join your video appointment.`;
};

const getAlertSpeech = (alert: SessionAlert) => {
  if (alert.kind === "certificate") {
    return `${getDoctorLabel(alert.cert)} has started your identity verification call. Please join now.`;
  }
  return `${getAppointmentProviderLabel(alert.appointment)} has started your appointment call. Please join now.`;
};

const getActiveAppointmentId = (activeCall: { roomName: string; token: any } | null) => {
  if (!activeCall) return null;
  const token = activeCall.token ?? {};
  if (token.chat_mode !== "appointment") return null;
  const candidates = [token.consultation_id, token.appointment_id, activeCall.roomName];
  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
};

const isActiveAppointmentCall = (activeCall: { roomName: string; token: any } | null, appointmentId: number) =>
  getActiveAppointmentId(activeCall) === appointmentId;

export function PatientCallAlertListener() {
  const { startCall, activeCall } = useCallContext();
  const { data: certificateData } = useGetPatientCertificates(undefined, { refetchInterval: POLL_INTERVAL_MS });
  const { data: appointmentData } = useGetPatientAppointments(
    { status: "in_progress", type: "online" },
    { refetchInterval: POLL_INTERVAL_MS },
  );
  const [activeAlert, setActiveAlert] = useState<SessionAlert | null>(null);
  const [joining, setJoining] = useState(false);

  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    notificationsSupported ? Notification.permission : "denied",
  );

  const seenCertKeysRef = useRef<Set<string>>(loadSeenStrings(CERT_SEEN_STORAGE_KEY));
  const seenAppointmentIdsRef = useRef<Set<number>>(loadSeenNumbers(APPOINTMENT_SEEN_STORAGE_KEY));
  const appointmentFirstSeenRef = useRef<Map<number, number>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pendingSessions = useMemo(
    () =>
      (certificateData?.certificates ?? []).filter(
        (c) => !!c.confirmation_requested_at && !c.identity_verified_via_video,
      ),
    [certificateData?.certificates],
  );

  const inProgressAppointments = useMemo(
    () =>
      (appointmentData?.data ?? []).filter(
        (appointment) => appointment.status === "in_progress" && appointment.type === "online",
      ),
    [appointmentData?.data],
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
      const tag = alert.kind === "certificate" ? `confirmation-session-${alert.cert.id}` : `appointment-call-${alert.appointment.id}`;
      const notification = new Notification(getAlertTitle(alert), {
        body: getAlertBody(alert),
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag,
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
    const utterance = new SpeechSynthesisUtterance(getAlertSpeech(alert));
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

  const dismiss = useCallback(() => {
    stopAlertSound();
    setActiveAlert(null);
  }, [stopAlertSound]);

  useEffect(() => {
    const unseen = pendingSessions.find((cert) => !seenCertKeysRef.current.has(certSeenKey(cert)));
    if (!unseen || activeAlert) return;
    seenCertKeysRef.current.add(certSeenKey(unseen));
    saveSeenStrings(CERT_SEEN_STORAGE_KEY, seenCertKeysRef.current);
    raiseAlert({ kind: "certificate", cert: unseen });
  }, [activeAlert, pendingSessions, raiseAlert]);

  useEffect(() => {
    const now = Date.now();
    const currentIds = new Set(inProgressAppointments.map((appointment) => appointment.id));

    for (const id of Array.from(appointmentFirstSeenRef.current.keys())) {
      if (!currentIds.has(id)) appointmentFirstSeenRef.current.delete(id);
    }

    if (activeAlert) return;

    for (const appointment of inProgressAppointments) {
      if (seenAppointmentIdsRef.current.has(appointmentSeenKey(appointment))) continue;
      if (isActiveAppointmentCall(activeCall, appointment.id)) continue;

      const firstSeen = appointmentFirstSeenRef.current.get(appointment.id) ?? now;
      appointmentFirstSeenRef.current.set(appointment.id, firstSeen);
      if (now - firstSeen < APPOINTMENT_GRACE_MS) continue;

      seenAppointmentIdsRef.current.add(appointment.id);
      saveSeenNumbers(APPOINTMENT_SEEN_STORAGE_KEY, seenAppointmentIdsRef.current);
      raiseAlert({ kind: "appointment", appointment });
      break;
    }
  }, [activeAlert, activeCall, inProgressAppointments, raiseAlert]);

  useEffect(() => {
    if (activeAlert?.kind !== "appointment") return;
    const stillInProgress = inProgressAppointments.some((appointment) => appointment.id === activeAlert.appointment.id);
    if (!stillInProgress || isActiveAppointmentCall(activeCall, activeAlert.appointment.id)) dismiss();
  }, [activeAlert, activeCall, dismiss, inProgressAppointments]);

  useEffect(() => stopAlertSound, [stopAlertSound]);

  const handleJoin = async () => {
    if (!activeAlert) return;
    setJoining(true);
    try {
      if (activeAlert.kind === "certificate") {
        const certId = activeAlert.cert.id;
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
          toast.success("Joining the verification call...");
        } else {
          const url = res.join_url || res.room_url;
          if (url) window.open(url, "_blank", "noopener,noreferrer");
          else toast.error("The verification call isn't ready yet.");
        }
        return;
      }

      const appointment = activeAlert.appointment;
      const res = await apiFetch<AppointmentJoinResponse>(`/patient/appointments/${appointment.id}/join`, {
        method: "POST",
      });
      dismiss();
      const started = startInAppCallFromJoin(startCall, res, {
        consultationId: appointment.id,
        isOwner: false,
        appointmentDurationMinutes: appointment.duration_minutes,
      });
      if (started) {
        toast.success("Joining the appointment call...");
      } else {
        const url = res.join_url || res.room_url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast.error("The appointment call isn't ready yet.");
      }
    } catch (err) {
      toast.error((err as Error)?.message || "Could not join the call.");
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

  const isAppointmentAlert = activeAlert.kind === "appointment";

  return (
    <div className="fixed bottom-5 right-5 z-[95] w-[min(480px,calc(100vw-24px))] rounded-[6px] border border-primary/30 bg-card shadow-2xl">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-primary/15 text-primary">
          <Video className="h-5 w-5 animate-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{getAlertTitle(activeAlert)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{getAlertBody(activeAlert)}</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-[6px] p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss call alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-2 rounded-[6px] border border-border/70 bg-background p-3 text-xs">
            <div className="flex items-center gap-2 text-foreground">
              {isAppointmentAlert ? <CalendarClock className="h-3.5 w-3.5 text-primary" /> : <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
              <span className="truncate">
                {isAppointmentAlert
                  ? formatAppointmentDateTime(
                      activeAlert.appointment.appointment_date,
                      activeAlert.appointment.appointment_time,
                    )
                  : `Certificate #${activeAlert.cert.certificate_number}`}
              </span>
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
              {joining ? "Joining..." : "Join call"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}