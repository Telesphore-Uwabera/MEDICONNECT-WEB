import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Wifi, WifiOff, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import echo from "@/lib/echo";
import { ChatPanel } from "@/components/consultatioRoom/ChatPanel";

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
  const [remoteStream, setRemoteStream] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const consultationId = token.consultation_id ?? null;

  // ── Send signal via API ───────────────────────────────────────────────────
  const sendSignal = useCallback(
    async (type: string, data: unknown = {}) => {
      console.info(`[WebRTC] Sending signal: ${type}`);
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
    const pc = new RTCPeerConnection({ iceServers: token.ice_servers });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal("ice-candidate", candidate.toJSON());
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setConnState("connected");
      else if (s === "disconnected" || s === "closed") setConnState("disconnected");
      else if (s === "failed") setConnState("failed");
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setRemoteStream(true);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    } else {
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    pcRef.current = pc;
    return pc;
  }, [token.ice_servers, sendSignal]);

  // ── Create and Send Offer ─────────────────────────────────────────────────
  const createAndSendOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || makingOffer.current) return;

    try {
      makingOffer.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", { type: offer.type, sdp: offer.sdp });
    } catch (e) {
      console.error("[WebRTC] Offer creation failed", e);
    } finally {
      makingOffer.current = false;
    }
  }, [sendSignal]);

  // ── Handle incoming signal (Wrapped in a ref to avoid stale closures) ─────
  const handleSignalRef = useRef<((payload: any) => Promise<void>) | null>(null);

  handleSignalRef.current = async (payload: { type: string; data: unknown; from: string }) => {
    if (payload.from === token.username) return; // Ignore own signals

    const pc = pcRef.current ?? createPeerConnection();

    // Helper to fix escaped newlines from the backend JSON encoder
    // Helper to completely rebuild the SDP string with strict WebRTC CRLF line endings
    const sanitizeSDP = (sdp: string) => {
      if (!sdp) return sdp;

      // 1. Catch any literal escaped newline characters from the JSON payload
      let normalized = sdp.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

      // 2. Break the string into an array of lines, regardless of how they are separated
      return normalized
        .split(/\r?\n/)
        // 3. Trim invisible trailing spaces that cause parse failures
        .map(line => line.trim())
        // 4. Destroy empty blank lines (WebRTC hates blank lines in SDPs)
        .filter(line => line.length > 0)
        // 5. Reassemble with strict Carriage Return + Line Feed
        .join('\r\n') + '\r\n';
    };

    try {
      if (payload.type === "ready" && isOwner) {
        // The remote peer is ready. Generate and send the offer.
        await createAndSendOffer();
      }
      else if (payload.type === "offer") {
        const offerCollision = makingOffer.current || pc.signalingState !== "stable";
        if (offerCollision && isOwner) return;

        const rawData = payload.data as RTCSessionDescriptionInit;

        // Sanitize the SDP string before setting it
        if (rawData.sdp) rawData.sdp = sanitizeSDP(rawData.sdp);

        await pc.setRemoteDescription(new RTCSessionDescription(rawData));

        // Process queued ICE candidates
        while (candidateQueue.current.length > 0) {
          const c = candidateQueue.current.shift();
          if (c) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal("answer", { type: answer.type, sdp: answer.sdp });
      }
      else if (payload.type === "answer") {
        if (pc.signalingState !== "have-local-offer") return;

        const rawAnswer = payload.data as RTCSessionDescriptionInit;

        // Sanitize the SDP string before setting it
        if (rawAnswer.sdp) rawAnswer.sdp = sanitizeSDP(rawAnswer.sdp);

        await pc.setRemoteDescription(new RTCSessionDescription(rawAnswer));

        // Process queued ICE candidates
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
    } catch (e) {
      console.error("[WebRTC] Signal handling error", e);
    }
  };

  // ── Main setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      // 1. Get local media with specific error handling
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

      // 2. Initialize Peer Connection
      createPeerConnection();

      // 3. Subscribe to WebSocket Channel
      const subscribeToChannel = () => {
        const channel = echo.channel(`consultation.${roomName}`);
        channelRef.current = channel;

        // Use the ref to ensure we always call the freshest version of the handler
        channel.listen(".webrtc.signal", (payload: any) => {
          handleSignalRef.current?.(payload);
        });
      };

      subscribeToChannel();

      echo.connector.pusher.connection.bind("connected", () => {
        if (!channelRef.current) subscribeToChannel();
      });

      // 4. Synchronization
      // Instead of the owner blindly sending an offer, the non-owner tells the room they are ready.
      if (!isOwner) {
        // Send 'ready' periodically until connected to ensure the Doctor receives it
        // even if the Patient joined the room before the Doctor.
        const sendReadyLoop = () => {
          if (cancelled) return;
          const pc = pcRef.current;
          if (pc && pc.connectionState === "connected") return; // Stop once connected
          
          sendSignal("ready");
          setTimeout(sendReadyLoop, 3000); // Try again in 3 seconds
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
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setAudioEnabled((v) => !v);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setVideoEnabled((v) => !v);
  };

  const endCall = () => {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    echo.leaveChannel(`consultation.${roomName}`);
    window.location.href = "/";
  };

  const stateColor = { connecting: "bg-amber-400", connected: "bg-emerald-400", disconnected: "bg-red-400", failed: "bg-red-600" }[connState];
  const stateLabel = { connecting: "Connecting…", connected: "Connected", disconnected: "Disconnected", failed: "Connection failed" }[connState];

  return (
    <div className="h-screen w-screen bg-[#0c0c0c] flex flex-col overflow-hidden">
      {/* ── Video area ──────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex overflow-hidden">
        <div className="relative flex-1 overflow-hidden transition-all duration-300">
          <video ref={remoteVideoRef} autoPlay playsInline className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-500", remoteStream ? "opacity-100" : "opacity-0")} />

          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="relative w-24 h-24 rounded-full bg-[#1e2a26] text-white/80 flex items-center justify-center text-2xl font-bold ring-2 ring-emerald-500/30 select-none">
                    {nameInitial(token.username)}
                  </div>
                </div>
                <p className="text-white/40 text-sm">Waiting for the other participant…</p>
              </div>
            </div>
          )}

          <div className="absolute right-4 w-36 h-28 rounded-xl overflow-hidden border border-white/10 shadow-xl z-10 transition-all duration-300 bottom-24">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-white/30" />
              </div>
            )}
          </div>

          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-20">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", stateColor)} />
              <span className="text-white/60 text-[11px] font-mono">{stateLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/40 text-[10px]">
              {connState === "connected" ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5" />}
              {roomName}
            </div>
          </div>
        </div>

        {/* ── Chat panel ──────────────────────────────────────────────────── */}
        <div className={cn("h-full z-30 transition-all duration-300 ease-in-out border-l border-white/10 shrink-0", chatOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden")}>
          {chatOpen && (
            <div className="relative w-72 h-full">
              <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} doctorAvatar={nameInitial(token.username)} doctorName={token.username} consultationId={consultationId} onUnreadChange={setUnreadCount} />
            </div>
          )}
        </div>
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="h-20 bg-[#111] border-t border-white/5 flex items-center justify-center gap-4 px-6 shrink-0 relative z-40">
        <button onClick={toggleAudio} className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90", audioEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400")}>
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button onClick={toggleVideo} className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90", videoEnabled ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500/20 hover:bg-red-500/30 text-red-400")}>
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button onClick={() => setChatOpen(!chatOpen)} className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90", chatOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white")}>
            <MessageSquare className="w-5 h-5" />
          </button>
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none z-10 shadow-lg border border-[#111]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <button onClick={endCall} className="h-13 w-13 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/40 p-3 ml-2">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ConsultationRoom;