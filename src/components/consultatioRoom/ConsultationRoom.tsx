import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Wifi, WifiOff, MessageSquare, Minimize2, Maximize2, Users, X, FileText } from "lucide-react";
import { useCallContext } from "@/context/CallContext";
import { useAudioVolume } from "@/hooks/video/use-audio-volume";
import { cn } from "@/lib/utils";
import echo from "@/lib/echo";
import { ChatPanel } from "@/components/consultatioRoom/ChatPanel";
import { InstantNotesSidebar } from "@/components/consultatioRoom/InstantNotesSidebar";
import { Link } from "react-router-dom";

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
}

interface ConsultationRoomProps {
  roomName: string;
  token: ConsultationToken;
}

type ConnectionState = "connecting" | "connected" | "disconnected" | "failed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nameInitial = (name: string) =>
  name.split(":").pop()?.slice(0, 2).toUpperCase() ?? "??";

// ─── Component ────────────────────────────────────────────────────────────────

const ConsultationRoom = ({ roomName, token }: ConsultationRoomProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof echo.channel> | null>(null);
  const makingOffer = useRef(false);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isOwner = token.is_owner;

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connState, setConnState] = useState<ConnectionState>("connecting");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Remote media status
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);

  // Audio wave status
  const { isTalking: localTalking } = useAudioVolume(localStreamRef.current);
  const { isTalking: remoteTalking } = useAudioVolume(remoteStream);

  const [participantsOpen, setParticipantsOpen] = useState(false);

  // Hook into the global CallContext
  const { isMinimized, toggleMinimize, endCall: endCallContext } = useCallContext();

  const consultationId = token.consultation_id ?? null;

  // ── Send signal via API ───────────────────────────────────────────────────
  const sendSignal = useCallback(
    async (type: string, data: unknown = {}) => {
      try {
        await fetch(
          `${import.meta.env.VITE_APP_BASE_URL}/public/consultations/signal`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: roomName, type, data, from: token.username }),
          }
        );
      } catch (e) {
        console.error("[WebRTC] Signal send failed", e);
      }
    },
    [roomName, token.username]
  );

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
      if (s === "connected") setConnState("connected");
      else if (s === "disconnected" || s === "closed") setConnState("disconnected");
      else if (s === "failed") setConnState("failed");
    };

    pc.ontrack = (event) => {
      const track = event.track;

      // Attempt to get existing stream from the video element, or create a new one
      let stream = remoteVideoRef.current?.srcObject as MediaStream;
      if (!stream) {
        stream = new MediaStream();
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      }

      // Add the track to our stream if it doesn't already exist
      if (!stream.getTracks().find(t => t.id === track.id)) {
        stream.addTrack(track);
      }

      setRemoteStream(new MediaStream(stream.getTracks()));
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
    return sdp.replace(
      /useinbandfec=1/g,
      "useinbandfec=1;usedtx=1;stereo=0;maxaveragebitrate=16000"
    );
  };

  // ── Create and Send Offer ─────────────────────────────────────────────────
  const createAndSendOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || makingOffer.current) return;

    try {
      makingOffer.current = true;
      const offer = await pc.createOffer();
      offer.sdp = optimizeAudioSDP(offer.sdp);

      await pc.setLocalDescription(offer);
      await sendSignal("offer", { type: offer.type, sdp: offer.sdp });
    } catch (e) {
      console.error("[WebRTC] Offer creation failed", e);
    } finally {
      makingOffer.current = false;
    }
  }, [sendSignal]);

  const handleSignalRef = useRef<((payload: any) => Promise<void>) | null>(null);

  handleSignalRef.current = async (payload: { type: string; data: unknown; from: string }) => {
    if (payload.from === token.username) return;

    let pc = pcRef.current;

    if (payload.type === "ready" || payload.type === "offer") {
      if (pc && ["connected", "disconnected", "failed", "closed"].includes(pc.connectionState)) {
        pc.close();
        pc = null;
        pcRef.current = null;
        candidateQueue.current = [];
        setRemoteStream(null); // Clear old dead streams
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
        if (pc.signalingState !== "have-local-offer") return;

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
        await pc.addIceCandidate(new RTCIceCandidate(payload.data as RTCIceCandidateInit));
      }
      else if (payload.type === "media-status") {
        const { audio, video } = payload.data as { audio: boolean, video: boolean };
        if (audio !== undefined) setRemoteAudioEnabled(audio);
        if (video !== undefined) setRemoteVideoEnabled(video);
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
          alert("Your camera or microphone is in use by another app (like Zoom or another tab). Please close it and refresh.");
        } else if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          alert("Please grant camera and microphone permissions to join the consultation.");
        }
      }

      createPeerConnection();

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

          if (!pc || pc.connectionState !== "connected") {
            sendSignal("ready");
          }
          setTimeout(sendReadyLoop, 3000);
        };
        setTimeout(sendReadyLoop, 1000);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        channelRef.current.stopListening(".webrtc.signal");
        echo.leaveChannel(`consultation.${roomName}`);
      }
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomName, isOwner, createPeerConnection, sendSignal]);

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

  const endCall = () => {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    echo.leaveChannel(`consultation.${roomName}`);
    endCallContext();
  };

  const stateColor = { connecting: "bg-amber-400", connected: "bg-emerald-400", disconnected: "bg-red-400", failed: "bg-red-600" }[connState];
  const stateLabel = { connecting: "Connecting…", connected: "Connected", disconnected: "Disconnected", failed: "Connection failed" }[connState];

  return (
    <motion.div
      drag={isMinimized}
      dragMomentum={false}
      animate={{ x: isMinimized ? undefined : 0, y: isMinimized ? undefined : 0 }}
      className={cn(
        "bg-[#0c0c0c] z-[5000] flex flex-col overflow-hidden transition-all duration-300 shadow-2xl",
        isMinimized
          ? "fixed bottom-6 right-6 w-80 h-56 rounded-2xl z-50 border border-white/10 ring-1 ring-black/50 cursor-move touch-none"
          : "fixed inset-0 h-screen w-screen z-40"
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
                  <div className={cn("relative w-24 h-24 rounded-full bg-[#1e2a26] text-white/80 flex items-center justify-center text-2xl font-bold select-none transition-all duration-300", remoteTalking ? "ring-4 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]" : "ring-2 ring-emerald-500/30")}>
                    {nameInitial(token.username)}
                  </div>
                </div>
                <p className="text-white/40 text-sm">
                  {connState !== "connected"
                    ? "Waiting for the other participant…"
                    : !remoteStream
                      ? "Waiting for participant's camera/microphone…"
                      : !remoteAudioEnabled
                        ? "Microphone muted"
                        : "Camera off"}
                </p>
              </div>
            </div>
          )}

          <div className={cn("absolute right-4 rounded-xl overflow-hidden border shadow-xl z-10 transition-all duration-300 bottom-24 bg-[#1a1a1a]", isMinimized ? "w-20 h-16 bottom-16 right-3" : "w-36 h-28", localTalking ? "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400" : "border-white/10")}>
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
                <VideoOff className={cn("text-white/30", isMinimized ? "w-4 h-4" : "w-6 h-6")} />
              </div>
            )}
          </div>

          <div className={cn("absolute top-0 inset-x-0 flex items-center justify-between py-3 bg-gradient-to-b from-black/60 to-transparent z-20 transition-all", isMinimized ? "px-3" : "px-4")}>
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", stateColor)} />
              {!isMinimized && <span className="text-white/60 text-[11px] font-mono">{stateLabel}</span>}
            </div>
            <div className="flex items-center gap-1.5 text-white/40 text-[10px]">
              <button
                onClick={toggleMinimize}
                className="ml-2 h-6 w-6 rounded-md bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Chat panel ──────────────────────────────────────────────────── */}
        {!isMinimized && (
          <div className={cn("h-full z-30 transition-all duration-300 ease-in-out border-l border-white/10 shrink-0", chatOpen ? "w-96 opacity-100" : "w-0 opacity-0 overflow-hidden")}>
            <div className="relative w-96 h-full bg-[#0c0c0c]">
              <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} doctorAvatar={nameInitial(token.username)} isOwner={isOwner} consultationId={consultationId} onUnreadChange={setUnreadCount} />
            </div>
          </div>
        )}

        {/* ── Notes panel ─────────────────────────────────────────────────── */}
        {!isMinimized && isOwner && (
          <div className={cn("h-full z-30 transition-all duration-300 ease-in-out border-l border-white/10 shrink-0 bg-[#0c0c0c]", notesOpen ? "w-96 opacity-100" : "w-0 opacity-0 overflow-hidden")}>
            {notesOpen && (
              <div className="relative w-96 h-full">
                <InstantNotesSidebar onClose={() => setNotesOpen(false)} consultationId={consultationId} patientName={token.username} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className={cn("bg-[#111] border-t border-white/5 flex items-center justify-center relative z-40 shrink-0 transition-all duration-300", isMinimized ? "h-14 gap-3 px-3" : "h-20 gap-4 px-6")}>
        <button onClick={toggleAudio} className={cn("rounded-full flex items-center justify-center transition-all active:scale-90", isMinimized ? "h-9 w-9" : "h-11 w-11", audioEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400", localTalking && audioEnabled && "ring-2 ring-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]")}>
          {audioEnabled ? <Mic className={isMinimized ? "w-4 h-4" : "w-5 h-5"} /> : <MicOff className={isMinimized ? "w-4 h-4" : "w-5 h-5"} />}
        </button>

        <button onClick={toggleVideo} className={cn("rounded-full flex items-center justify-center transition-all active:scale-90", isMinimized ? "h-9 w-9" : "h-11 w-11", videoEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400")}>
          {videoEnabled ? <Video className={isMinimized ? "w-4 h-4" : "w-5 h-5"} /> : <VideoOff className={isMinimized ? "w-4 h-4" : "w-5 h-5"} />}
        </button>

        {!isMinimized && (
          <div className="relative flex gap-2">
            <button onClick={() => setParticipantsOpen(!participantsOpen)} className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90", participantsOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
              <Users className="w-5 h-5" />
            </button>
            <div className="relative">
              <button onClick={() => {
                const next = !chatOpen;
                setChatOpen(next);
                if (next) setNotesOpen(false);
              }} className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90", chatOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
                <MessageSquare className="w-5 h-5" />
              </button>
              {unreadCount > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none z-10 shadow-lg border border-[#111]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {isOwner && (
              <button onClick={() => {
                const next = !notesOpen;
                setNotesOpen(next);
                if (next) setChatOpen(false);
              }} className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90", notesOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
                <FileText className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="w-px h-6 bg-white/10 mx-2" />

        <button onClick={endCall} className={cn("rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/40 p-3 ml-2", isMinimized ? "h-10 w-10 p-2 ml-0" : "h-13 w-13")}>
          <PhoneOff className={isMinimized ? "w-5 h-5" : "w-6 h-6"} />
        </button>

        {/* Participants Overlay */}
        {participantsOpen && !isMinimized && (
          <div className="absolute bottom-24 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-50 w-64 translate-x-1/2 right-[calc(50%-40px)]">
            <h3 className="text-white/80 font-semibold text-[13px] mb-3">Participants (2)</h3>
            <div className="space-y-4">
              {/* Local User */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={cn("h-8 w-8 rounded-full bg-white/10 text-white/80 flex items-center justify-center text-[10px] font-bold transition-all", localTalking && audioEnabled && "ring-2 ring-emerald-400")}>
                      You
                    </div>
                    {localTalking && audioEnabled && <div className="absolute inset-0 rounded-full ring-2 ring-emerald-400 animate-ping" style={{ animationDuration: '1.5s' }} />}
                  </div>
                  <span className="text-[12px] text-white">You</span>
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
                      {nameInitial(token.username)}
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
  );
};

export default ConsultationRoom;