import { useState, useCallback, useEffect, useRef } from "react";
import {
  Video, PhoneOff, Mic, MicOff, VideoOff, Activity, MessageSquare,
  Minus, Maximize2, Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallStore } from "@/context/CallStore";
import { ChatPanel } from "@/components/consultatioRoom/ChatPanel";
import { InlineVitalsChart } from "./InlineVitalsChart";
import { fmt } from "./helpers";
import { SignalBars } from "./SignalBars";

// ─── Call control button ──────────────────────────────────────────────────────

const CallCtrlBtn = ({
  active, icon, onClick, label,
}: { active: boolean; icon: React.ReactNode; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    title={label}
    className={cn(
      "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
      active
        ? "bg-white/15 hover:bg-white/25 text-white"
        : "bg-red-500/80 hover:bg-red-500 text-white",
    )}
  >
    {icon}
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveCallPanel() {
  const call = useCallStore();
  const { activeRequest, activeAppointment } = call;
  const [chatOpen, setChatOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showVitals, setShowVitals] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = activeRequest?.patientName ?? activeAppointment?.patientLabel ?? "Patient";
  const displaySub = activeRequest?.reason ?? activeAppointment?.specialty ?? "";
  const displayAvatar = activeRequest?.patientAvatar ?? (activeAppointment?.specialty.slice(0, 2).toUpperCase() ?? "PT");
  const chatName = activeRequest?.patientName ?? activeAppointment?.patientLabel ?? "Patient";
  const chatAvatar = activeRequest?.patientAvatar ?? displayAvatar;

  const resetHide = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!chatOpen) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
    }
  }, [chatOpen]);

  useEffect(() => {
    resetHide();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [resetHide]);

  if (call.phase !== "connected") return null;

  const videoArea = (
    <div
      className="relative flex-1 flex flex-col bg-[#0c0c0c] overflow-hidden min-h-0"
      onMouseMove={resetHide}
      onTouchStart={resetHide}
    >
      {/* Top bar */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 shrink-0",
        "bg-gradient-to-b from-black/60 to-transparent",
        "transition-opacity duration-300",
        controlsVisible ? "opacity-100" : "opacity-0",
      )}>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-white/70 font-mono tracking-wide">LIVE · {fmt(call.elapsed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <SignalBars strength={call.signalStrength} />
          <button
            onClick={() => call.setMinimized(true)}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setFullscreen(v => !v)}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Patient avatar */}
      <div className="flex-1 flex items-center justify-center py-4 min-h-0">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="relative h-20 w-20 rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-2xl font-bold ring-[1.5px] ring-emerald-500/30">
              {displayAvatar}
            </div>
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-white/90">{displayName}</p>
            <p className="text-[11px] text-white/35 mt-0.5 max-w-[200px] truncate">{displaySub}</p>
          </div>
          {/* Self-view */}
          <div
            className="w-28 rounded-[6px] bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center shadow-lg"
            style={{ aspectRatio: "16/9" }}
          >
            <span className="text-[9px] text-white/30 select-none">You</span>
            {!call.videoEnabled && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-[6px]">
                <VideoOff className="h-3.5 w-3.5 text-white/25" />
              </div>
            )}
          </div>
        </div>
      </div>

      {showVitals && (
        <div className="px-3 pb-2 shrink-0">
          <InlineVitalsChart />
        </div>
      )}

      {/* Controls */}
      <div className={cn(
        "flex items-center justify-center gap-2.5 px-4 py-3 shrink-0",
        "bg-gradient-to-t from-black/60 to-transparent",
        "transition-opacity duration-300",
        controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}>
        <CallCtrlBtn active={call.audioEnabled} onClick={call.toggleAudio} label="Mic"
          icon={call.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} />
        <CallCtrlBtn active={call.videoEnabled} onClick={call.toggleVideo} label="Video"
          icon={call.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />} />
        <div className="relative">
          <CallCtrlBtn
            active={chatOpen}
            onClick={() => { setChatOpen(v => !v); if (!chatOpen) call.clearUnread(); }}
            label="Chat"
            icon={<MessageSquare className="h-4 w-4" />}
          />
          {call.unreadCount > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none">
              {call.unreadCount > 9 ? "9+" : call.unreadCount}
            </span>
          )}
        </div>
        <CallCtrlBtn active={showVitals} onClick={() => setShowVitals(v => !v)} label="Vitals"
          icon={<Activity className="h-4 w-4" />} />
        <button
          onClick={call.endCall}
          className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/30"
        >
          <PhoneOff className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );

  const chatColumn = chatOpen ? (
    <div className="w-72 flex-shrink-0 flex flex-col bg-[#161616] border-l border-white/8 overflow-hidden">
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} doctorAvatar={chatAvatar} doctorName={chatName} />
    </div>
  ) : null;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] flex bg-[#0c0c0c]">
        {videoArea}
        {chatColumn}
      </div>
    );
  }

  return (
    <div className="flex w-full h-full rounded-[6px] overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
      {videoArea}
      {chatColumn}
    </div>
  );
}
