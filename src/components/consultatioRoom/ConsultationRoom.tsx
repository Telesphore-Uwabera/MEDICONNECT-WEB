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

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connState, setConnState]       = useState<ConnectionState>("connecting");
  const [remoteStream, setRemoteStream] = useState(false);

  // ── Send signal via API ───────────────────────────────────────────────────
  const sendSignal = useCallback(
    async (type: string, data: unknown) => {
      console.info(`[WebRTC] Sending signal: ${type} from: ${token.username}`);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_APP_BASE_URL}/public/consultations/signal`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: roomName, type, data, from: token.username }),
          },
        );
        console.info(`[WebRTC] Signal sent: ${type} status: ${res.status}`);
      } catch (e) {
        console.error("[WebRTC] Signal send failed", e);
      }
    },
    [roomName, token.username],
  );

  // ── Setup RTCPeerConnection ───────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    console.info("[WebRTC] Creating RTCPeerConnection with ICE servers:", token.ice_servers);
    const pc = new RTCPeerConnection({ iceServers: token.ice_servers });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.info("[WebRTC] ICE candidate generated:", candidate.type);
        sendSignal("ice-candidate", candidate.toJSON());
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.info("[WebRTC] ICE connection state:", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.info("[WebRTC] Signaling state:", pc.signalingState);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.info("[WebRTC] Connection state changed:", s);
      if (s === "connected")                           setConnState("connected");
      else if (s === "disconnected" || s === "closed") setConnState("disconnected");
      else if (s === "failed")                         setConnState("failed");
    };

    pc.ontrack = ({ streams }) => {
      console.info("[WebRTC] Remote track received, streams:", streams.length);
      if (remoteVideoRef.current && streams[0]) {
        remoteVideoRef.current.srcObject = streams[0];
        setRemoteStream(true);
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.info("[WebRTC] Adding local tracks:", tracks.length);
      tracks.forEach((track) => pc.addTrack(track, localStreamRef.current!));
    } else {
      console.warn("[WebRTC] No local stream available when creating peer connection");
    }

    pcRef.current = pc;
    return pc;
  }, [token.ice_servers, sendSignal]);

  // ── Handle incoming signal ────────────────────────────────────────────────
  const handleSignal = useCallback(
    async (payload: { type: string; data: unknown; from: string }) => {
      console.info(`[WebRTC] Signal received: ${payload.type} from: ${payload.from}`);

      // Ignore own signals
      if (payload.from === token.username) {
        console.info("[WebRTC] Ignoring own signal");
        return;
      }

      const pc = pcRef.current ?? createPeerConnection();

      try {
        if (payload.type === "offer") {
          console.info("[WebRTC] Processing offer, signalingState:", pc.signalingState);
          const offerCollision =
            makingOffer.current || pc.signalingState !== "stable";

          if (offerCollision && isOwner) {
            console.warn("[WebRTC] Offer collision — ignoring (impolite peer)");
            return;
          }

          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.data as RTCSessionDescriptionInit),
          );
          console.info("[WebRTC] Remote description set, creating answer…");
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.info("[WebRTC] Answer created and set, sending…");
          sendSignal("answer", answer);

        } else if (payload.type === "answer") {
          console.info("[WebRTC] Processing answer, signalingState:", pc.signalingState);
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload.data as RTCSessionDescriptionInit),
          );
          console.info("[WebRTC] Remote description set from answer");

        } else if (payload.type === "ice-candidate") {
          console.info("[WebRTC] Adding ICE candidate");
          await pc.addIceCandidate(
            new RTCIceCandidate(payload.data as RTCIceCandidateInit),
          );
          console.info("[WebRTC] ICE candidate added");
        }
      } catch (e) {
        console.error("[WebRTC] Signal handling error", e);
      }
    },
    [token.username, isOwner, createPeerConnection, sendSignal],
  );

  // ── Main setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    console.info("[WebRTC] Component mounted — roomName:", roomName, "isOwner:", isOwner);
    console.info("[WebRTC] Token:", JSON.stringify(token));

    const setup = async () => {
      console.info("[WebRTC] Setup starting…");

      // 1. Get local media
      try {
        console.info("[WebRTC] Requesting media devices…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          console.warn("[WebRTC] Cancelled after media acquired — stopping tracks");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        console.info("[WebRTC] Local media acquired — tracks:", stream.getTracks().map(t => t.kind));
      } catch (e) {
        console.error("[WebRTC] Media access denied", e);
        setConnState("failed");
        return;
      }

      // 2. Create peer connection
      const pc = createPeerConnection();
      console.info("[WebRTC] PeerConnection created");

      console.info(`[WebRTC] Subscribing to channel: consultation.${roomName}`);

      const subscribeToChannel = () => {
        const channel = echo.channel(`consultation.${roomName}`);
        channelRef.current = channel;
        channel.listen(".webrtc.signal", (payload: { type: string; data: unknown; from: string }) => {
          console.info("[WebRTC] Raw signal event received:", payload);
          handleSignal(payload);
        });
        console.info("[WebRTC] Channel subscribed and listening");
      };

      subscribeToChannel();

      // Reconnect on WebSocket disconnect
      echo.connector.pusher.connection.bind("connected", () => {
        console.info("[WebRTC] WebSocket reconnected — resubscribing to channel");
        subscribeToChannel();
      });

      // 4. Owner creates offer after delay
if (isOwner) {
  console.info("[WebRTC] I am owner — will send offer in 2s…");

  const createAndSendOffer = async () => {
    const activePc = pcRef.current;
    if (!activePc || cancelled) return;
    if (activePc.signalingState !== "stable" && activePc.signalingState !== "have-local-offer") return;
    try {
      makingOffer.current = true;
      console.info("[WebRTC] Creating offer, signalingState:", activePc.signalingState);
      const offer = await activePc.createOffer();
      await activePc.setLocalDescription(offer);
      console.info("[WebRTC] Offer created — sending…");
      await sendSignal("offer", offer);
      console.info("[WebRTC] Offer sent successfully ✅");
    } catch (e) {
      console.error("[WebRTC] Offer creation failed", e);
    } finally {
      makingOffer.current = false;
    }
  };

  // Initial offer after 2s
  setTimeout(createAndSendOffer, 2000);

  // Re-send offer every 8s if still not connected (patient may have missed it)
  const retryInterval = setInterval(() => {
    if (cancelled) { clearInterval(retryInterval); return; }
    const activePc = pcRef.current;
    if (!activePc) { clearInterval(retryInterval); return; }
    if (activePc.connectionState === "connected") {
      console.info("[WebRTC] Connected — stopping offer retry");
      clearInterval(retryInterval);
      return;
    }
    console.info("[WebRTC] No answer yet — retrying offer…");
    createAndSendOffer();
  }, 8000);
} else {
        console.info("[WebRTC] I am NOT owner — waiting for offer from doctor…");
      }
    };

    setup();

    return () => {
      console.info("[WebRTC] Cleanup — leaving channel and closing PC");
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
    console.info("[WebRTC] Ending call…");
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    echo.leaveChannel(`consultation.${roomName}`);
    window.close();
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

        {/* Remote video */}
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
                <div
                  className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <div className="relative w-24 h-24 rounded-full bg-[#1e2a26] text-white/80 flex items-center justify-center text-2xl font-bold ring-2 ring-emerald-500/30 select-none">
                  {nameInitial(token.username)}
                </div>
              </div>
              <p className="text-white/40 text-sm">Waiting for the other participant…</p>
            </div>
          </div>
        )}

        {/* Local video PiP */}
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

        {/* Status bar */}
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

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="h-16 bg-[#111] border-t border-white/5 flex items-center justify-center gap-4 px-6 shrink-0">
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

        <button
          onClick={endCall}
          className="h-13 w-13 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/40 p-3"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

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