import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import echo from "@/lib/echo";

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
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef     = useRef<ReturnType<typeof echo.channel> | null>(null);
  const makingOffer    = useRef(false);
  const isOwner        = token.is_owner;

  const [audioEnabled, setAudioEnabled]   = useState(true);
  const [videoEnabled, setVideoEnabled]   = useState(true);
  const [connState, setConnState]         = useState<ConnectionState>("connecting");
  const [remoteStream, setRemoteStream]   = useState(false);

  // ── Send signal via API ───────────────────────────────────────────────────
  const sendSignal = useCallback(
    async (type: string, data: unknown) => {
      try {
        await fetch(
          `${import.meta.env.VITE_APP_BASE_URL}/public/consultations/signal`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: roomName, type, data, from: token.username }),
          },
        );
      } catch (e) {
        console.error("Signal send failed", e);
      }
    },
    [roomName, token.username],
  );

  // ── Setup RTCPeerConnection ───────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: token.ice_servers });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal("ice-candidate", candidate.toJSON());
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected")                        setConnState("connected");
      else if (s === "disconnected" || s === "closed") setConnState("disconnected");
      else if (s === "failed")                      setConnState("failed");
    };

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setRemoteStream(true);
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) =>
        pc.addTrack(track, localStreamRef.current!),
      );
    }

    pcRef.current = pc;
    return pc;
  }, [token.ice_servers, sendSignal]);

  // ── Handle incoming signal ────────────────────────────────────────────────
  const handleSignal = useCallback(
    async (payload: { type: string; data: unknown; from: string }) => {
      // Ignore own signals
      if (payload.from === token.username) return;

      const pc = pcRef.current ?? createPeerConnection();

      try {
        if (payload.type === "offer") {
          const offerCollision =
            makingOffer.current || pc.signalingState !== "stable";
          // Polite peer (non-owner) defers; impolite peer (owner) ignores
          if (offerCollision && isOwner) return;

          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.data as RTCSessionDescriptionInit),
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal("answer", answer);
        } else if (payload.type === "answer") {
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.data as RTCSessionDescriptionInit),
          );
        } else if (payload.type === "ice-candidate") {
          await pc.addIceCandidate(
            new RTCIceCandidate(payload.data as RTCIceCandidateInit),
          );
        }
      } catch (e) {
        console.error("Signal handling error", e);
      }
    },
    [token.username, isOwner, createPeerConnection, sendSignal],
  );

  // ── Main setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      // 1. Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (e) {
        console.error("Media access denied", e);
        setConnState("failed");
        return;
      }

      // 2. Create peer connection
      const pc = createPeerConnection();

      // 3. Subscribe to Reverb channel
      const channel = echo.channel(`consultation.${roomName}`);
      channelRef.current = channel;

      channel.listen(".webrtc.signal", handleSignal);

      // 4. Owner creates offer after a short delay (lets both sides subscribe)
      if (isOwner) {
        setTimeout(async () => {
          if (cancelled) return;
          try {
            makingOffer.current = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal("offer", offer);
          } catch (e) {
            console.error("Offer creation failed", e);
          } finally {
            makingOffer.current = false;
          }
        }, 1500);
      }
    };

    setup();

    return () => {
      cancelled = true;
      channelRef.current?.stopListening(".webrtc.signal");
      echo.leaveChannel(`consultation.${roomName}`);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle audio ──────────────────────────────────────────────────────────
  const toggleAudio = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setAudioEnabled((v) => !v);
  };

  // ── Toggle video ──────────────────────────────────────────────────────────
  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setVideoEnabled((v) => !v);
  };

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = () => {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    echo.leaveChannel(`consultation.${roomName}`);
    window.close();
    // fallback if window.close() is blocked
    window.location.href = "/";
  };

  // ── Connection state indicator ────────────────────────────────────────────
  const stateColor = {
    connecting:   "bg-amber-400",
    connected:    "bg-emerald-400",
    disconnected: "bg-red-400",
    failed:       "bg-red-600",
  }[connState];

  const stateLabel = {
    connecting:   "Connecting…",
    connected:    "Connected",
    disconnected: "Disconnected",
    failed:       "Connection failed",
  }[connState];

  return (
    <div className="h-screen w-screen bg-[#0c0c0c] flex flex-col overflow-hidden">

      {/* ── Video area ──────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Remote video — full background */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            remoteStream ? "opacity-100" : "opacity-0",
          )}
        />

        {/* Remote waiting placeholder */}
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

        {/* Local video — picture-in-picture */}
        <div className="absolute bottom-20 right-4 w-36 h-28 rounded-xl overflow-hidden border border-white/10 shadow-xl z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-white/30" />
            </div>
          )}
        </div>

        {/* Status bar — top */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-20">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", stateColor)} />
            <span className="text-white/60 text-[11px] font-mono">{stateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40 text-[10px]">
            {connState === "connected" ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {roomName}
          </div>
        </div>
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────── */}
      <div className="h-16 bg-[#111] border-t border-white/5 flex items-center justify-center gap-4 px-6 shrink-0">

        {/* Mic */}
        <button
          onClick={toggleAudio}
          className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90",
            audioEnabled
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-red-500/20 hover:bg-red-500/30 text-red-400",
          )}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* End call */}
        <button
          onClick={endCall}
          className="h-13 w-13 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/40 p-3"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        {/* Camera */}
        <button
          onClick={toggleVideo}
          className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90",
            videoEnabled
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-red-500/20 hover:bg-red-500/30 text-red-400",
          )}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

      </div>
    </div>
  );
};

export default ConsultationRoom;