// components/FloatingCall.tsx
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2 } from "lucide-react";
import { useCallStore } from "@/context/CallStore";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export const FloatingCall = () => {
  const call = useCallStore();
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const visible = call.minimized && call.phase === "connected" && call.doctor !== null;

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 220, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 140, e.clientY - offset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!visible || !call.doctor) return null;

  return createPortal(
    <div
      className="fixed z-[9999] w-52 rounded-[6px] overflow-hidden shadow-2xl border border-white/10 bg-[#111] select-none"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      {/* Mini video */}
      <div className="relative aspect-video bg-slate-900 flex items-center justify-center cursor-move">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-sm mx-auto">
            {call.doctor.avatar}
          </div>
          <p className="text-[9px] text-white/50 mt-1">{call.doctor.name}</p>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] text-white/80 font-mono">{fmt(call.elapsed)}</span>
        </div>
        {/* ← THE FIX: setMinimized(false) sets dialogOpen: true in the store */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => call.setMinimized(false)}
          className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center rounded bg-black/60 text-white/70 hover:text-white"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a]">
        <p className="text-[9px] text-white/50 truncate flex-1 mr-2">
          {call.doctor.specialty}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={call.toggleAudio}
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
              call.audioEnabled ? "text-white/70 hover:text-white" : "bg-red-500/80 text-white"
            )}
          >
            {call.audioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
          </button>
          <button
            onClick={call.toggleVideo}
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
              call.videoEnabled ? "text-white/70 hover:text-white" : "bg-red-500/80 text-white"
            )}
          >
            {call.videoEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
          </button>
          <button
            onClick={call.endCall}
            className="h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
          >
            <PhoneOff className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
