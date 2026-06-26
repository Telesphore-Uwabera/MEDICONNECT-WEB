import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Clock3, ExternalLink, Phone, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  useGetAppointments,
  useGetInstantQueue,
  type Appointment,
  type InstantConsultQueueItem,
} from "@/hooks/doctor/use-doctor-appointment";

const ALERT_AUDIO_SRC = "/audio/new-notification-057-494255.mp3";
const SEEN_STORAGE_KEY = "doctor_instant_paid_alert_seen_ids";
const SEEN_APPOINTMENT_STORAGE_KEY = "doctor_appointment_paid_alert_seen_ids";
const ALERT_DURATION_MS = 60_000;
const SPEECH_INTERVAL_MS = 12_000;

type PaidAlert =
  | { kind: "instant"; item: InstantConsultQueueItem }
  | { kind: "appointment"; item: Appointment };

const loadSeenIds = (storageKey: string) => {
  if (typeof window === "undefined") return new Set<number>();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set<number>(
      Array.isArray(ids)
        ? ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [],
    );
  } catch {
    return new Set<number>();
  }
};

const saveSeenIds = (storageKey: string, ids: Set<number>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(ids).slice(-100)));
};

const getInstantPatientLabel = (item: InstantConsultQueueItem) =>
  item.guest_phone?.trim() || `Instant request #${item.id}`;

const getAppointmentPatientLabel = (item: Appointment) =>
  item.patient?.name?.trim() || item.patient?.phone?.trim() || `Appointment #${item.id}`;

const getAlertPatientLabel = (alert: PaidAlert) =>
  alert.kind === "instant"
    ? getInstantPatientLabel(alert.item)
    : getAppointmentPatientLabel(alert.item);

const getAlertSpeech = (alert: PaidAlert) => {
  const patientLabel = getAlertPatientLabel(alert);
  if (alert.kind === "instant") {
    return `New paid instant consultation from ${patientLabel}. Please open the instant queue.`;
  }
  return `New confirmed appointment from ${patientLabel}. Please open your appointments.`;
};

export function InstantPaidAlertListener() {
  const navigate = useNavigate();
  const { data: instantData } = useGetInstantQueue(true);
  const { data: appointmentData } = useGetAppointments(
    { status: "confirmed", upcoming: true },
    { refetchInterval: 10_000 },
  );
  const [activeAlert, setActiveAlert] = useState<PaidAlert | null>(null);

  const seenInstantIdsRef = useRef<Set<number>>(loadSeenIds(SEEN_STORAGE_KEY));
  const seenAppointmentIdsRef = useRef<Set<number>>(loadSeenIds(SEEN_APPOINTMENT_STORAGE_KEY));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paidRequests = useMemo(
    () => (instantData?.queue ?? []).filter((item) => item.status === "confirmed"),
    [instantData?.queue],
  );

  const confirmedAppointments = useMemo(
    () => (appointmentData?.data ?? []).filter((item) => item.status === "confirmed"),
    [appointmentData?.data],
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
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakAlert = useCallback((alert: PaidAlert) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(getAlertSpeech(alert));
    utterance.rate = 0.95;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const startAlertSound = useCallback(
    (alert: PaidAlert) => {
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

  useEffect(() => {
    const unseenInstant = paidRequests.find((item) => !seenInstantIdsRef.current.has(item.id));
    if (unseenInstant) {
      seenInstantIdsRef.current.add(unseenInstant.id);
      saveSeenIds(SEEN_STORAGE_KEY, seenInstantIdsRef.current);
      const alert: PaidAlert = { kind: "instant", item: unseenInstant };
      setActiveAlert(alert);
      startAlertSound(alert);
      return;
    }

    const unseenAppointment = confirmedAppointments.find(
      (item) => !seenAppointmentIdsRef.current.has(item.id),
    );
    if (!unseenAppointment) return;

    seenAppointmentIdsRef.current.add(unseenAppointment.id);
    saveSeenIds(SEEN_APPOINTMENT_STORAGE_KEY, seenAppointmentIdsRef.current);
    const alert: PaidAlert = { kind: "appointment", item: unseenAppointment };
    setActiveAlert(alert);
    startAlertSound(alert);
  }, [confirmedAppointments, paidRequests, startAlertSound]);

  useEffect(() => stopAlertSound, [stopAlertSound]);

  const dismiss = () => {
    stopAlertSound();
    setActiveAlert(null);
  };

  const openQueue = () => {
    dismiss();
    navigate(activeAlert?.kind === "instant" ? "/doctor/appointments?tab=instant" : "/doctor/appointments");
  };

  if (!activeAlert) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[95] w-[min(380px,calc(100vw-24px))] rounded-[6px] border border-primary/30 bg-card shadow-2xl">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-primary/15 text-primary">
          <BellRing className="h-5 w-5 animate-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {activeAlert.kind === "instant" ? "Paid instant consultation" : "Confirmed appointment"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeAlert.kind === "instant"
                  ? "A patient is waiting for you to accept the call."
                  : "A scheduled appointment is ready for you to review or join."}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-[6px] p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss instant consultation alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-2 rounded-[6px] border border-border/70 bg-background p-3 text-xs">
            <div className="flex items-center gap-2 text-foreground">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{getAlertPatientLabel(activeAlert)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span>
                {activeAlert.kind === "instant"
                  ? activeAlert.item.waiting_label || "Waiting now"
                  : `${activeAlert.item.appointment_date} ${activeAlert.item.appointment_time}`}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="h-9 rounded-[6px] border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Later
            </button>
            <button
              type="button"
              onClick={openQueue}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-[6px] bg-primary px-3 text-xs font-semibold text-primary-foreground",
                "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40",
              )}
            >
              {activeAlert.kind === "instant" ? "Open queue" : "Open appointments"}
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
