import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { AlertTriangle, Mic, MicOff, Video, VideoOff, PhoneOff, Wifi, WifiOff, MessageSquare, Minimize2, Maximize2, Users, X, FileText, User, UserCircleIcon, PictureInPicture2, Paperclip } from "lucide-react";
import { useCallContext } from "@/context/CallContext";
import { useAudioVolume } from "@/hooks/video/use-audio-volume";
import { usePictureInPicture } from "@/hooks/video/usePictureInPicture";
import { cn } from "@/lib/utils";
import echo from "@/lib/echo";
import { ChatPanel } from "@/components/consultatioRoom/ChatPanel";
import { IllnessProofPanel } from "@/components/consultatioRoom/IllnessProofPanel";
import { InstantNotesSidebar } from "@/components/consultatioRoom/InstantNotesSidebar";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

interface ConsultationToken {
  username: string;
  credential: string;
  room: string;
  is_owner: boolean;
  ice_servers: IceServer[];
  consultation_id?: number;
  appointment_duration_minutes?: number;
}

interface ConsultationRoomProps {
  roomName: string;
  token: ConsultationToken;
}

type ConnectionState = "connecting" | "connected" | "disconnected" | "failed";

const INSTANT_DURATION_WARNING_SECONDS = 25 * 60;
const SESSION_WARNING_LEAD_SECONDS = 5 * 60;
const ALERT_AUDIO_SRC = "/audio/new-notification-057-494255.mp3";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nameInitial = (name: string) =>
  name.split(":").pop()?.slice(0, 2).toUpperCase() ?? "??";

// ─── Component ────────────────────────────────────────────────────────────────

const ConsultationRoom = ({ roomName, token }: ConsultationRoomProps) => {
  const { t, i18n } = useTranslation();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof echo.channel> | null>(null);
  const makingOffer = useRef(false);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectedSinceRef = useRef<number | null>(null);
  const durationWarningShownRef = useRef(false);
  const audioEnabledRef = useRef(true);
  const videoEnabledRef = useRef(true);
  // Refs holding the latest callbacks so the main effect can stay decoupled
  // from their identities (prevents tearing down the call on parent re-render).
  const sendSignalRef = useRef<((type: string, data?: unknown) => Promise<void>) | null>(null);
  const createPeerConnectionRef = useRef<(() => RTCPeerConnection) | null>(null);
  const createAndSendOfferRef = useRef<((iceRestart?: boolean) => Promise<void>) | null>(null);
  const isOwner = token.is_owner;
  // Signaling identity. Must be UNIQUE per peer. The display username can be the
  // same on both sides (e.g. when the doctor rejoins with a shared/guest token),
  // which would make each peer ignore the other's signals (the "ignore my own
  // broadcast" filter). Suffixing with the role guarantees the two differ.
  const selfId = `${token.username}#${isOwner ? "owner" : "guest"}`;

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connState, setConnState] = useState<ConnectionState>("connecting");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [proofsOpen, setProofsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadProofCount, setUnreadProofCount] = useState(0);
  const [proofSignal, setProofSignal] = useState<{ id: number; nonce: number } | null>(null);

  // Remote media status
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [durationWarningVisible, setDurationWarningVisible] = useState(false);

  // Audio wave status
  const { isTalking: localTalking } = useAudioVolume(localStreamRef.current);
  const { isTalking: remoteTalking } = useAudioVolume(remoteStream);

  const [participantsOpen, setParticipantsOpen] = useState(false);

  // Consultation id the peer told us about (see consultation-meta signal below).
  // Used when our own token didn't carry one — e.g. a patient whose token was
  // issued without it. The doctor always has a valid id and shares it.
  const [peerConsultationId, setPeerConsultationId] = useState<number | null>(null);

  // Hook into the global CallContext
  const { isMinimized, toggleMinimize, endCall: endCallContext, requestAppointmentCompletion } = useCallContext();

  // Resolve the consultation id the chat API needs. It isn't part of the WebRTC
  // token natively — it's injected by the join flows — so we check every known
  // key, coerce to a positive integer, and fall back to a numeric id embedded
  // in the room name. This keeps chat working even if token enrichment was
  // skipped or lost a value somewhere upstream.
  const consultationId = useMemo<number | null>(() => {
    const t = token as any;
    const candidates = [
      t?.consultation_id,
      t?.consultationId,
      t?.instant_consultation_request_id,
      t?.instant_consultation_id,
      t?.id,
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const match = /(?:consultation|consult|instant)[-_.]?(\d+)/i.exec(roomName ?? "");
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }, [token, roomName]);

  // Prefer our own token's id; fall back to the one the peer shared over signaling.
  const effectiveConsultationId = consultationId ?? peerConsultationId;
  const doctorId = useMemo(() => {
    const t = token as any;
    const candidates = [t?.doctor_id, t?.doctorId, t?.doctor?.id, t?.doctor?.doctor_id];
    for (const candidate of candidates) {
      const id = Number(candidate);
      if (Number.isFinite(id) && id > 0) return id;
    }
    return null;
  }, [token]);

  // Scheduled appointments tag the token so chat uses the appointment endpoints.
  const chatMode: "instant" | "appointment" =
    (token as any)?.chat_mode === "appointment" ? "appointment" : "instant";
  const proofAppointmentId = chatMode === "appointment" ? effectiveConsultationId : null;
  const proofInstantConsultationId = chatMode === "instant" ? effectiveConsultationId : null;
  const isInstantRoom = chatMode === "instant" && /instant/i.test(roomName ?? "");
  const appointmentDurationSeconds = useMemo(() => {
    const duration = Number((token as any)?.appointment_duration_minutes);
    return Number.isFinite(duration) && duration > 0 ? duration * 60 : null;
  }, [token]);
  const durationWarningThresholdSeconds = useMemo(() => {
    if (isInstantRoom) return INSTANT_DURATION_WARNING_SECONDS;
    if (chatMode === "appointment" && appointmentDurationSeconds != null) {
      return Math.max(0, appointmentDurationSeconds - SESSION_WARNING_LEAD_SECONDS);
    }
    return null;
  }, [appointmentDurationSeconds, chatMode, isInstantRoom]);

  // Once connected, share our consultation id so a peer whose token lacked one
  // (e.g. the patient) can use it for the chat. Only the side that actually has
  // the id broadcasts, so there's no ping-pong.
  useEffect(() => {
    if (connState === "connected" && consultationId != null) {
      sendSignalRef.current?.("consultation-meta", { consultation_id: consultationId });
    }
  }, [connState, consultationId]);

  // ── Send signal via API ───────────────────────────────────────────────────
  // Path can be overridden with VITE_SIGNAL_PATH if the backend exposes the
  // WebRTC relay endpoint somewhere other than the default.
  const sendSignal = useCallback(
    async (type: string, data: unknown = {}) => {
      const url = `${import.meta.env.VITE_APP_BASE_URL}${import.meta.env.VITE_SIGNAL_PATH ?? "/public/consultations/signal"}`;
      const payload = JSON.stringify({ room: roomName, type, data, from: selfId });
      // Signaling is critical (offer/answer/ICE), and the network can flake
      // briefly during renegotiation, so retry a transient failure once before
      // giving up. The `ready` heartbeat also keeps re-announcing, so a missed
      // signal recovers on its own.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: payload,
          });
          if (!res.ok) {
            console.warn(`[WebRTC] Signal "${type}" rejected: HTTP ${res.status}`);
          }
          return;
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 400)); // brief backoff, retry once
            continue;
          }
          // Persistent network/CORS failure — caught so it never aborts the
          // handler; the heartbeat keeps retrying so the call can still recover.
          // If this is constant, verify the signal endpoint allows this origin.
          console.warn(`[WebRTC] Signal "${type}" couldn't be sent (network/CORS).`);
        }
      }
    },
    [roomName, selfId]
  );

  // ── Connection recovery ───────────────────────────────────────────────────
  // Attempt to re-establish a degraded connection. The owner re-offers with an
  // ICE restart; the patient nudges the owner by resending `ready`.
  const scheduleRecovery = (delay: number) => {
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = setTimeout(() => {
      recoveryTimerRef.current = null;
      const pc = pcRef.current;
      if (!pc || pc.connectionState === "connected") return;
      if (isOwner) {
        createAndSendOfferRef.current?.(true);
      } else {
        sendSignalRef.current?.("ready");
      }
    }, delay);
  };

  const clearRecovery = () => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  };

  // ── Setup RTCPeerConnection ───────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: token.ice_servers,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal("ice-candidate", candidate.toJSON());
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setConnState("connected");
        disconnectedSinceRef.current = null;
        clearRecovery();
        // Sync our current mic/camera state so the peer's indicators are correct.
        sendSignalRef.current?.("media-status", {
          audio: audioEnabledRef.current,
          video: videoEnabledRef.current,
        });
      } else if (s === "disconnected") {
        setConnState("disconnected");
        disconnectedSinceRef.current = Date.now();
        // `disconnected` is often transient — give ICE time to self-heal first.
        scheduleRecovery(5000);
      } else if (s === "failed") {
        setConnState("failed");
        scheduleRecovery(0);
      } else if (s === "closed") {
        setConnState("disconnected");
      }
    };

    pc.oniceconnectionstatechange = () => {
      // Some browsers surface failures on the ICE state before connectionState.
      if (pc.iceConnectionState === "failed") {
        setConnState("failed");
        scheduleRecovery(0);
      }
    };

    pc.ontrack = (event) => {
      // Prefer the stream the remote attached; fall back to assembling one.
      const [incoming] = event.streams;
      if (incoming) {
        setRemoteStream(incoming);
        return;
      }
      const track = event.track;
      setRemoteStream((prev) => {
        const next = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
        if (!next.getTracks().find((t) => t.id === track.id)) next.addTrack(track);
        return next;
      });
    };


    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    pcRef.current = pc;
    return pc;
  }, [token.ice_servers, sendSignal]);

  // ── SDP Optimizer ─────────────────────────────────────────────────────────
  const optimizeAudioSDP = (sdp: string | undefined) => {
    if (!sdp) return sdp;
    // Mono voice, but at a wideband bitrate for clearer clinical audio.
    // ~40 kbps Opus gives crisp speech without the bandwidth of stereo/music.
    return sdp.replace(
      /useinbandfec=1/g,
      "useinbandfec=1;usedtx=1;stereo=0;maxaveragebitrate=40000;maxplaybackrate=48000"
    );
  };

  // ── Create and Send Offer ─────────────────────────────────────────────────
  const createAndSendOffer = useCallback(async (iceRestart = false) => {
    const pc = pcRef.current;
    if (!pc || makingOffer.current) return;

    try {
      makingOffer.current = true;
      const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      offer.sdp = optimizeAudioSDP(offer.sdp);

      await pc.setLocalDescription(offer);
      await sendSignal("offer", { type: offer.type, sdp: offer.sdp });
    } catch (e) {
      console.error("[WebRTC] Offer creation failed", e);
    } finally {
      makingOffer.current = false;
    }
  }, [sendSignal]);

  // Keep refs pointed at the latest callbacks / control state.
  sendSignalRef.current = sendSignal;
  createPeerConnectionRef.current = createPeerConnection;
  createAndSendOfferRef.current = createAndSendOffer;
  audioEnabledRef.current = audioEnabled;
  videoEnabledRef.current = videoEnabled;

  // Single source of truth: bind the remote stream to the <video> element and
  // attempt playback (covers autoplay-with-audio policies). Clears on null.
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) {
      el.play().catch(() => {/* awaiting a user gesture; UI play affordance handles it */ });
    }
  }, [remoteStream]);

  const handleSignalRef = useRef<((payload: any) => Promise<void>) | null>(null);

  handleSignalRef.current = async (payload: { type: string; data: unknown; from: string }) => {
    if (payload.from === selfId) return;

    let pc = pcRef.current;

    if (payload.type === "bye") {
      clearRecovery();
      pcRef.current?.close();
      pcRef.current = null;
      candidateQueue.current = [];
      setRemoteStream(null);
      setConnState("disconnected");
      return;
    }

    if (payload.type === "illness-proof-submitted") {
      const data = payload.data as { proof_id?: unknown; id?: unknown };
      const id = Number(data?.proof_id ?? data?.id);
      if (isOwner && Number.isFinite(id) && id > 0) {
        setProofSignal({ id, nonce: Date.now() });
      }
      return;
    }

    if (payload.type === "ready" || payload.type === "offer") {
      if (pc && ["connected", "disconnected", "failed", "closed"].includes(pc.connectionState)) {
        pc.close();
        pc = null;
        pcRef.current = null;
        candidateQueue.current = [];
        setRemoteStream(null); // Clear old dead streams (srcObject is cleared by the bind effect)
      }
    }

    if (!pc) pc = createPeerConnection();

    const sanitizeSDP = (sdp: string) => {
      if (!sdp) return sdp;
      let normalized = sdp.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
      return normalized
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\r\n') + '\r\n';
    };

    try {
      if (payload.type === "ready" && isOwner) {
        await createAndSendOffer();
      }
      else if (payload.type === "offer") {
        const offerCollision = makingOffer.current || pc.signalingState !== "stable";
        if (offerCollision && isOwner) return;

        const rawData = payload.data as RTCSessionDescriptionInit;
        if (rawData.sdp) rawData.sdp = sanitizeSDP(rawData.sdp);

        await pc.setRemoteDescription(new RTCSessionDescription(rawData));

        while (candidateQueue.current.length > 0) {
          const c = candidateQueue.current.shift();
          if (c) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        }

        const answer = await pc.createAnswer();
        answer.sdp = optimizeAudioSDP(answer.sdp);

        await pc.setLocalDescription(answer);
        sendSignal("answer", { type: answer.type, sdp: answer.sdp });
      }
      else if (payload.type === "answer") {
        if (pc.signalingState !== "have-local-offer") {
          // Benign: a duplicate/late answer arrived while already stable. Ignore.
          console.debug("[WebRTC] Dropping answer in unexpected signalingState:", pc.signalingState);
          return;
        }

        const rawAnswer = payload.data as RTCSessionDescriptionInit;
        if (rawAnswer.sdp) rawAnswer.sdp = sanitizeSDP(rawAnswer.sdp);

        await pc.setRemoteDescription(new RTCSessionDescription(rawAnswer));

        while (candidateQueue.current.length > 0) {
          const c = candidateQueue.current.shift();
          if (c) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        }
      }
      else if (payload.type === "ice-candidate") {
        if (!pc.remoteDescription) {
          candidateQueue.current.push(payload.data as RTCIceCandidateInit);
          return;
        }
        // Adding a candidate can fail benignly (it arrived for a since-reset/
        // renegotiated description). Swallow it so it doesn't abort the handler
        // or surface as a hard error — ICE will still complete on valid ones.
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.data as RTCIceCandidateInit));
        } catch (err) {
          // Benign: a stale candidate (e.g. "Unknown ufrag" after renegotiation).
          // ICE still completes on the valid ones — keep it quiet at debug level.
          console.debug("[WebRTC] Skipped an ICE candidate that couldn't be added", err);
        }
      }
      else if (payload.type === "media-status") {
        const { audio, video } = payload.data as { audio: boolean, video: boolean };
        if (audio !== undefined) setRemoteAudioEnabled(audio);
        if (video !== undefined) setRemoteVideoEnabled(video);
      }
      else if (payload.type === "consultation-meta") {
        // Peer is telling us the consultation id (used when our token lacked one).
        const id = Number((payload.data as { consultation_id?: unknown })?.consultation_id);
        if (Number.isFinite(id) && id > 0) setPeerConsultationId(id);
      }
    } catch (e) {
      console.error("[WebRTC] Signal handling error", e);
    }
  };

  // ── Main setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480, max: 640 },
            height: { ideal: 360, max: 480 },
            frameRate: { ideal: 15, max: 20 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (e: any) {
        console.error("[WebRTC] Media access denied", e);
        if (e.name === "NotReadableError") {
          alert(t("consult.call.media_in_use"));
        } else if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          alert(t("consult.call.grant_perms"));
        }
      }

      createPeerConnectionRef.current?.();

      const subscribeToChannel = () => {
        const channel = echo.channel(`consultation.${roomName}`);
        channelRef.current = channel;
        channel.listen(".webrtc.signal", (payload: any) => {
          handleSignalRef.current?.(payload);
        });
      };

      subscribeToChannel();

      echo.connector.pusher.connection.bind("connected", () => {
        if (!channelRef.current) subscribeToChannel();
      });

      if (!isOwner) {
        const sendReadyLoop = () => {
          if (cancelled) return;
          const pc = pcRef.current;
          const st = pc?.connectionState;
          // Resend `ready` when there's no usable connection. Includes
          // `disconnected`, but only after a grace window so a self-healing
          // ICE blip doesn't trigger an unnecessary full renegotiation.
          const needsReady =
            !pc ||
            ["new", "failed", "closed"].includes(st as string) ||
            (st === "disconnected" &&
              Date.now() - (disconnectedSinceRef.current ?? 0) > 4000);

          if (needsReady) sendSignalRef.current?.("ready");
          setTimeout(sendReadyLoop, 3000);
        };
        setTimeout(sendReadyLoop, 1000);
      } else {
        // Owner re-announces while not yet connected. A single nudge is fragile
        // on rejoin: if the peer is still holding a stale connection and misses
        // it, nothing else prompts a re-handshake until its ICE times out
        // (10–30s of "Connecting…"). Re-announcing every 3s prompts the peer to
        // tear the stale connection down and re-initiate promptly. It stops once
        // we're connected/connecting, so it never disrupts a live call.
        // const announceLoop = () => {
        //   if (cancelled) return;
        //   const pc = pcRef.current;
        //   const st = pc?.connectionState;
        //   const needsAnnounce =
        //     !pc ||
        //     ["new", "failed", "closed"].includes(st as string) ||
        //     (st === "disconnected" &&
        //       Date.now() - (disconnectedSinceRef.current ?? 0) > 4000);

        //   if (needsAnnounce) sendSignalRef.current?.("ready");
        //   setTimeout(announceLoop, 3000);
        // };
        // setTimeout(announceLoop, 1000);

        const announceLoop = () => {
        if (cancelled) return;
        const pc = pcRef.current;
        const st = pc?.connectionState;
        const needsAnnounce =
          !pc ||
          ["new", "failed", "closed"].includes(st as string) ||
          (st === "disconnected" &&
            Date.now() - (disconnectedSinceRef.current ?? 0) > 4000);

        if (needsAnnounce) {
          // Owner tries to send offer directly instead of waiting for guest's ready
          if (pcRef.current) {
            createAndSendOfferRef.current?.();
          } else {
            sendSignalRef.current?.("ready");
          }
        }
        setTimeout(announceLoop, 3000);
      };
      setTimeout(announceLoop, 1000);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      if (channelRef.current) {
        channelRef.current.stopListening(".webrtc.signal");
        echo.leaveChannel(`consultation.${roomName}`);
      }
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // Decoupled from callback identities (accessed via refs) so a parent
    // re-render passing a new token object can't tear down a live call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, isOwner]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleAudio = () => {
    const nextAudio = !audioEnabled;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = nextAudio));
    setAudioEnabled(nextAudio);
    sendSignal("media-status", { audio: nextAudio, video: videoEnabled });
  };

  const toggleVideo = () => {
    const nextVideo = !videoEnabled;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = nextVideo));
    setVideoEnabled(nextVideo);
    sendSignal("media-status", { audio: audioEnabled, video: nextVideo });
  };

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  // ── Picture-in-Picture ──────────────────────────────────────────────────────
  // Floats the remote video in an always-on-top window so the call keeps playing
  // while the user is on another tab. Auto-pops when the tab is hidden.
  const pip = usePictureInPicture(remoteVideoRef, {
    autoOnHide: true,
    active: connState === "connected" && !isMinimized,
    fallbackRef: localVideoRef, // float the self-view until the remote connects
  });

  // ── Call duration ───────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (connState !== "connected") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [connState]);

  useEffect(() => {
    durationWarningShownRef.current = false;
    setDurationWarningVisible(false);
  }, [roomName]);

  const durationWarningTitle =
    chatMode === "appointment"
      ? t("consult.call.appointment_duration_warning_title", {
        defaultValue: "Appointment time reminder",
      })
      : t("consult.call.duration_warning_title", {
        defaultValue: "Instant session time reminder",
      });
  const durationWarningMessage =
    chatMode === "appointment"
      ? t("consult.call.appointment_duration_warning_body", {
        defaultValue: "This appointment call is about 5 minutes away from the scheduled slot ending.",
      })
      : t("consult.call.duration_warning_body", {
        defaultValue: "This instant consultation has reached 25 minutes. You have about 5 minutes remaining.",
      });
  const isDurationWarningActive =
    isOwner &&
    durationWarningThresholdSeconds != null &&
    connState === "connected" &&
    elapsed >= durationWarningThresholdSeconds;

  useEffect(() => {
    if (
      !isOwner ||
      durationWarningThresholdSeconds == null ||
      connState !== "connected" ||
      elapsed < durationWarningThresholdSeconds ||
      durationWarningShownRef.current
    ) {
      return;
    }

    durationWarningShownRef.current = true;
    setDurationWarningVisible(true);

    toast.warning(durationWarningMessage, { description: durationWarningTitle, duration: 10_000 });

    const audio = new Audio(ALERT_AUDIO_SRC);
    audio.volume = 0.75;
    void audio.play().catch(() => undefined);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(durationWarningMessage);
      utterance.rate = 0.95;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }

    if ("Notification" in window) {
      const showNotification = () => {
        if (Notification.permission === "granted") {
          new Notification(durationWarningTitle, { body: durationWarningMessage });
        }
      };

      if (Notification.permission === "default") {
        void Notification.requestPermission().then((permission) => {
          if (permission === "granted") showNotification();
        });
      } else {
        showNotification();
      }
    }
  }, [
    connState,
    durationWarningMessage,
    durationWarningThresholdSeconds,
    durationWarningTitle,
    elapsed,
    isOwner,
  ]);

  const fmtElapsed = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const endCall = () => {
    sendSignal("bye");
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    echo.leaveChannel(`consultation.${roomName}`);
    // When the doctor ends a scheduled-appointment call, kick off the same
    // post-call flow as instant: required medical record → optional booking →
    // mark the appointment complete. Patient-ended / instant calls just close.
    if (isOwner && chatMode === "appointment" && effectiveConsultationId != null) {
      requestAppointmentCompletion({ appointmentId: effectiveConsultationId });
    }
    endCallContext();
  };

  const stateColor = isDurationWarningActive ? "bg-amber-400" : { connecting: "bg-amber-400", connected: "bg-emerald-400", disconnected: "bg-red-400", failed: "bg-red-600" }[connState];
  const stateLabel = { connecting: t("consult.call.connecting"), connected: t("consult.call.connected"), disconnected: t("consult.call.disconnected"), failed: t("consult.call.failed") }[connState];

  return (
    <>
      {/* ── End-call confirmation ─────────────────────────────────────────── */}
      {confirmEndOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setConfirmEndOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[6px] bg-[#1a1a1a] border border-white/10 shadow-2xl p-6 text-center"
          >
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/15 flex items-center justify-center">
              <PhoneOff className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-white text-base font-semibold mb-1">{t("consult.call.end_title")}</h2>
            <p className="text-white/50 text-[13px] mb-5 leading-relaxed">
              {isOwner ? t("consult.call.end_desc_owner") : t("consult.call.end_desc")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEndOpen(false)}
                className="flex-1 h-10 rounded-[6px] bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
              >
                {t("consult.call.cancel")}
              </button>
              <button
                onClick={() => { setConfirmEndOpen(false); endCall(); }}
                className="flex-1 h-10 rounded-[6px] bg-red-500 hover:bg-red-400 text-white text-sm font-semibold transition-colors shadow-lg shadow-red-500/30"
              >
                {t("consult.call.end_call")}
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div
        drag={isMinimized}
        dragMomentum={false}
        animate={{ x: isMinimized ? undefined : 0, y: isMinimized ? undefined : 0 }}
        className={cn(
          // Single decisive z-index above all app chrome (sidebar/header sit at
          // z-30–z-50). Avoid stacking two z-* utilities — source order, not class
          // order, would decide the winner and could drop the call behind the nav.
          "bg-[#0c0c0c] z-[9990] flex flex-col overflow-hidden transition-all duration-300 shadow-2xl",
          isMinimized
            ? "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[17rem] sm:w-80 h-48 sm:h-56 max-w-[calc(100vw-2rem)] rounded-[6px] border border-white/10 ring-1 ring-black/50 cursor-move touch-none"
            : "fixed inset-0 h-[100dvh] w-screen"
        )}
      >

        {/* ── Video area ──────────────────────────────────────────────────── */}
        <div className="relative flex-1 flex overflow-hidden">
          <div className="relative flex-1 overflow-hidden transition-all duration-300">
            <video ref={remoteVideoRef} autoPlay playsInline className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-500", remoteStream && remoteVideoEnabled ? "opacity-100" : "opacity-0")} />

            {(!remoteStream || !remoteVideoEnabled) && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c0c] z-0">
                <div className="text-center space-y-4">
                  <div className="relative mx-auto w-24 h-24">
                    <div className={cn("absolute inset-0 rounded-full bg-emerald-500/15", remoteTalking ? "animate-ping" : "")} style={{ animationDuration: "2s" }} />
                    <div className={cn("relative w-24 h-24 rounded-full bg-[#1e2a26] text-white/60 flex items-center justify-center select-none transition-all duration-300", remoteTalking ? "ring-4 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]" : "ring-2 ring-emerald-500/30")}>
                      <User className="w-10 h-10" />
                    </div>
                  </div>
                  <p className="text-white/40 text-sm">
                    {connState !== "connected"
                      ? t("consult.call.waiting_participant")
                      : !remoteStream
                        ? t("consult.call.waiting_media")
                        : !remoteAudioEnabled
                          ? t("consult.call.mic_muted")
                          : t("consult.call.camera_off")}
                  </p>
                </div>
              </div>
            )}

            <div className={cn("absolute rounded-[6px] overflow-hidden border shadow-xl z-10 transition-all duration-300 bg-[#1a1a1a]", isMinimized ? "w-20 h-14 bottom-3 right-3" : "w-28 h-20 sm:w-36 sm:h-28 bottom-4 right-3 sm:bottom-6 sm:right-4", localTalking ? "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400" : "border-white/10")}>
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {!videoEnabled && (
                <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
                  <VideoOff className={cn("text-white/30", isMinimized ? "w-4 h-4" : "w-6 h-6")} />
                </div>
              )}
            </div>

            <div className={cn("absolute top-0 inset-x-0 flex items-center justify-between z-20 transition-all bg-gradient-to-b from-black/70 via-black/25 to-transparent", isMinimized ? "px-2.5 py-2" : "px-4 py-3 sm:px-5 sm:py-4")}>
              {/* Status pill */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full backdrop-blur-md border transition-colors",
                  isDurationWarningActive
                    ? "bg-amber-500/15 border-amber-400/35 shadow-[0_0_18px_rgba(251,191,36,0.14)]"
                    : "bg-black/40 border-white/10",
                  isMinimized ? "px-2 py-1" : "px-3 py-1.5",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", stateColor, connState === "connected" && "animate-pulse")} />
                {!isMinimized && (
                  <>
                    <span className={cn("text-[11px] font-medium leading-none", isDurationWarningActive ? "text-amber-100" : "text-white/80")}>{stateLabel}</span>
                    {connState === "connected" && (
                      <>
                        <span className="text-white/25">·</span>
                        <span className={cn("text-[11px] font-mono tabular-nums leading-none", isDurationWarningActive ? "text-amber-200" : "text-white/55")}>{fmtElapsed(elapsed)}</span>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Window controls */}
              <div className="flex items-center gap-1.5">
                {!isMinimized && pip.supported && (
                  <button
                    onClick={pip.toggle}
                    title="Pop out · Picture-in-Picture"
                    aria-label="Picture-in-Picture"
                    className={cn("h-8 w-8 rounded-[6px] backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-90", pip.isPipActive ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/30" : "bg-black/40 hover:bg-black/60 text-white/80")}
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={toggleMinimize}
                  className="h-8 w-8 rounded-[6px] bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white/80 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title={isMinimized ? t("consult.call.expand") : t("consult.call.minimize")}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!isMinimized && durationWarningVisible && (
              <div className="absolute left-1/2 top-16 z-20 w-[min(92vw,28rem)] -translate-x-1/2 rounded-[6px] border border-amber-400/35 bg-amber-500/15 px-3 py-2.5 text-amber-50 shadow-2xl shadow-black/40 backdrop-blur-md">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{durationWarningTitle}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed ">{durationWarningMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDurationWarningVisible(false)}
                    className="rounded-[6px] p-1 text-amber-100/70 hover:bg-amber-400/15 hover:text-amber-50"
                    aria-label="Dismiss time warning"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Chat panel ──────────────────────────────────────────────────── */}
          {/* Stays mounted (so the realtime subscription + unread badge keep
            working) but collapses to zero width when closed so it never overlays
            or blocks the notes panel. Full-width drawer on mobile, side panel ≥sm. */}
          {!isMinimized && (
            <div className={cn("absolute inset-y-0 right-0 z-30 overflow-hidden transition-[width] duration-300 ease-in-out", chatOpen ? "w-full sm:w-[22rem] md:w-96 max-w-full pointer-events-auto" : "w-0 pointer-events-none")}>
              <div className="relative h-full w-screen sm:w-[22rem] md:w-96 max-w-full">
                <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} doctorAvatar={nameInitial(token.username)} isOwner={isOwner} consultationId={effectiveConsultationId} mode={chatMode} onUnreadChange={setUnreadCount} />
              </div>
            </div>
          )}


          {/* Illness proof panel */}
          {!isMinimized && (
            <div className={cn("absolute inset-y-0 right-0 z-30 overflow-hidden transition-[width] duration-300 ease-in-out", proofsOpen ? "w-full sm:w-[22rem] md:w-96 max-w-full pointer-events-auto" : "w-0 pointer-events-none")}>
              <div className="relative h-full w-screen sm:w-[22rem] md:w-96 max-w-full">
                <IllnessProofPanel
                  open={proofsOpen}
                  onClose={() => setProofsOpen(false)}
                  isOwner={isOwner}
                  appointmentId={proofAppointmentId}
                  instantConsultationId={proofInstantConsultationId}
                  doctorId={doctorId}
                  proofSignal={proofSignal}
                  onUnreadChange={setUnreadProofCount}
                  onSubmitted={(proof) => {
                    const id = Number(proof.id);
                    if (!Number.isFinite(id) || id <= 0) return;
                    sendSignalRef.current?.("illness-proof-submitted", {
                      proof_id: id,
                      appointment_id: proof.appointment_id ?? proofAppointmentId,
                      instant_consultation_id: proof.instant_consultation_id ?? proofInstantConsultationId,
                    });
                  }}
                />
              </div>
            </div>
          )}
          {/* ── Notes panel ─────────────────────────────────────────────────── */}
          {!isMinimized && isOwner && (
            <div className={cn("absolute inset-y-0 right-0 z-30 overflow-hidden transition-[width] duration-300 ease-in-out", notesOpen ? "w-full sm:w-[22rem] md:w-96 max-w-full pointer-events-auto" : "w-0 pointer-events-none")}>
              <div className="relative h-full w-screen sm:w-[22rem] md:w-96 max-w-full bg-[#0c0c0c] border-l border-white/10 shadow-2xl">
                <InstantNotesSidebar onClose={() => setNotesOpen(false)} consultationId={effectiveConsultationId} patientName={token.username} mode={chatMode} />
              </div>
            </div>
          )}
        </div>

        {/* ── Controls bar ─────────────────────────────────────────────────── */}
        <div className={cn("relative z-40 shrink-0 flex items-center justify-center transition-all duration-300 bg-gradient-to-t from-black via-[#0a0a0a] to-[#0a0a0a]/80 border-t border-white/[0.06]", isMinimized ? "h-14 gap-2 px-3" : "h-[4.75rem] sm:h-[5.5rem] gap-3 px-3 sm:px-6")}>
          {/* Grouped controls pill */}
          <div className={cn("flex items-center rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md", isMinimized ? "gap-1 p-1" : "gap-1.5 sm:gap-2 p-1.5")}>
            <button onClick={toggleAudio} title={audioEnabled ? t("consult.call.mute_mic") : t("consult.call.unmute_mic")} aria-label={audioEnabled ? t("consult.call.mute_mic") : t("consult.call.unmute_mic")} aria-pressed={!audioEnabled} className={cn("rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0", isMinimized ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11", audioEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500 hover:bg-red-400 text-white", localTalking && audioEnabled && "ring-2 ring-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]")}>
              {audioEnabled ? <Mic className={isMinimized ? "w-4 h-4" : "w-5 h-5"} /> : <MicOff className={isMinimized ? "w-4 h-4" : "w-5 h-5"} />}
            </button>

            <button onClick={toggleVideo} title={videoEnabled ? t("consult.call.turn_camera_off") : t("consult.call.turn_camera_on")} aria-label={videoEnabled ? t("consult.call.turn_camera_off") : t("consult.call.turn_camera_on")} aria-pressed={!videoEnabled} className={cn("rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0", isMinimized ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11", videoEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500 hover:bg-red-400 text-white")}>
              {videoEnabled ? <Video className={isMinimized ? "w-4 h-4" : "w-5 h-5"} /> : <VideoOff className={isMinimized ? "w-4 h-4" : "w-5 h-5"} />}
            </button>

            {!isMinimized && (
              <>
                <div className="w-px h-6 bg-white/10 mx-0.5 sm:mx-1" />
                <button onClick={() => setParticipantsOpen(!participantsOpen)} title={t("consult.call.participants")} aria-label={t("consult.call.participants")} aria-pressed={participantsOpen} className={cn("h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0", participantsOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
                  <Users className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button onClick={() => {
                    const next = !chatOpen;
                    setChatOpen(next);
                    if (next) {
                      setNotesOpen(false);
                      setProofsOpen(false);
                    }
                  }} title={t("consult.call.chat")} aria-label={t("consult.call.chat")} aria-pressed={chatOpen} className={cn("h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0", chatOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  {unreadCount > 0 && !chatOpen && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none z-10 shadow-lg border border-[#0a0a0a]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => {
                    const next = !proofsOpen;
                    setProofsOpen(next);
                    if (next) {
                      setChatOpen(false);
                      setNotesOpen(false);
                      setUnreadProofCount(0);
                    }
                  }} title={t("consult.proofs.title", "Illness proofs")} aria-label={t("consult.proofs.title", "Illness proofs")} aria-pressed={proofsOpen} className={cn("h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0", proofsOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
                    <Paperclip className="w-5 h-5" />
                  </button>
                  {unreadProofCount > 0 && !proofsOpen && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none z-10 shadow-lg border border-[#0a0a0a]">
                      {unreadProofCount > 9 ? "9+" : unreadProofCount}
                    </span>
                  )}
                </div>
                {isOwner && (
                  <button onClick={() => {
                    const next = !notesOpen;
                    setNotesOpen(next);
                    if (next) {
                      setChatOpen(false);
                      setProofsOpen(false);
                    }
                  }} title={t("consult.call.call_notes")} aria-label={t("consult.call.call_notes")} aria-pressed={notesOpen} className={cn("h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0", notesOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
                    <FileText className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* End call */}
          <button onClick={() => setConfirmEndOpen(true)} title={t("consult.call.end_call")} aria-label={t("consult.call.end_call")} className={cn("rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/40 shrink-0", isMinimized ? "h-10 w-10" : "h-12 w-12 sm:h-14 sm:w-14")}>
            <PhoneOff className={isMinimized ? "w-5 h-5" : "w-5 h-5 sm:w-6 sm:h-6"} />
          </button>

          {/* Participants Overlay */}
          {participantsOpen && !isMinimized && (
            <div className="absolute bottom-[calc(100%+0.75rem)] left-1/2 -translate-x-1/2 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-[6px] p-4 shadow-2xl z-50 w-64 max-w-[calc(100vw-2rem)]">
              <h3 className="text-white/80 font-semibold text-[13px] mb-3">
                {t("consult.call.participants")} ({2})
              </h3>
              <div className="space-y-4">
                {/* Local User */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={cn("h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center text-[10px] font-bold transition-all", localTalking && audioEnabled && "ring-2 ring-emerald-400")}>
                        <UserCircleIcon />
                      </div>
                      {localTalking && audioEnabled && <div className="absolute inset-0 rounded-full ring-2 ring-emerald-400 animate-ping" style={{ animationDuration: '1.5s' }} />}
                    </div>
                    <span className="text-[12px] text-white">  {t("consult.call.you")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    {audioEnabled ? <Mic className={cn("w-3.5 h-3.5", localTalking && "text-emerald-400")} /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                    {videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                </div>

                {/* Remote User */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={cn("h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold transition-all", remoteTalking && remoteAudioEnabled && "ring-2 ring-emerald-400")}>
                        <UserCircleIcon />
                      </div>
                      {remoteTalking && remoteAudioEnabled && <div className="absolute inset-0 rounded-full ring-2 ring-emerald-400 animate-ping" style={{ animationDuration: '1.5s' }} />}
                    </div>
                    <span className="text-[12px] text-white max-w-[90px] truncate">{token.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    {remoteAudioEnabled ? <Mic className={cn("w-3.5 h-3.5", remoteTalking && "text-emerald-400")} /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                    {remoteVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default ConsultationRoom;


