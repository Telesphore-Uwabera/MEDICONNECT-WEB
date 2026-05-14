// components/ConnectDialog.tsx
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ChatPanel } from "@/components/ChatPanel";
import { Doctor } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Maximize2, Minimize2, Minus, X, Mic, MicOff, Video, VideoOff,
  PhoneOff, Phone, ShieldCheck, Loader2, CheckCircle2, AlertCircle,
  MessageSquare, Wifi, ArrowRight, Sparkles, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCallStore } from "@/context/CallStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallPhase =
  | "idle"
  | "setup"       // user configures mic/video before joining
  | "checking"
  | "permissions"
  | "connecting"
  | "ringing"
  | "connected"
  | "failed"
  | "ended";

interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  pointRadius: number;
  tension: number;
  yAxisID: string;
  borderDash?: number[];
}

interface ChartInstance {
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  destroy: () => void;
  update: (mode: string) => void;
}

interface ChartConstructor {
  new (
    canvas: HTMLCanvasElement,
    config: object
  ): ChartInstance;
}

interface WindowWithChart extends Window {
  Chart?: ChartConstructor;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const SignalBars = ({ strength }: { strength: number }) => (
  <div className="flex items-end gap-0.5 h-4">
    {[1, 2, 3, 4].map((b) => (
      <div
        key={b}
        style={{ height: `${b * 4}px` }}
        className={cn(
          "w-1 rounded-sm transition-colors",
          b <= strength ? "bg-emerald-400" : "bg-white/20"
        )}
      />
    ))}
  </div>
);

const StatusBadge = ({ phase }: { phase: CallPhase }) => {
  const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    checking: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: "Checking...", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    permissions: { icon: <ShieldCheck className="h-3 w-3" />, text: "Setting up...", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    connecting: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: "Connecting...", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
    ringing: { icon: <Phone className="h-3 w-3 animate-pulse" />, text: "Ringing...", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    connected: { icon: <CheckCircle2 className="h-3 w-3" />, text: "Connected", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    failed: { icon: <AlertCircle className="h-3 w-3" />, text: "Failed", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
    ended: { icon: <PhoneOff className="h-3 w-3" />, text: "Ended", cls: "bg-white/10 text-white/50 border-white/20" },
  };
  const c = map[phase];
  if (!c) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border", c.cls)}>
      {c.icon}{c.text}
    </span>
  );
};

// ─── Vitals chart ─────────────────────────────────────────────────────────────

const VitalsChart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scriptLoadedRef = useRef(false);

  const initChart = () => {
    if (!canvasRef.current) return;
    const Chart = (window as WindowWithChart).Chart;
    if (!Chart) return;

    const hrData = Array.from({ length: 20 }, () => Math.round(68 + Math.random() * 20));
    const spo2Data = Array.from({ length: 20 }, () => Math.round(95 + Math.random() * 4));
    const labels = Array.from({ length: 20 }, (_, i) => i === 19 ? "now" : `${19 - i}s`);

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "HR (bpm)",
            data: hrData,
            borderColor: "#f87171",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "SpO₂ (%)",
            data: spo2Data,
            borderColor: "#34d399",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 0,
            tension: 0.4,
            yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 200 },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index" as const,
            intersect: false,
            backgroundColor: "rgba(0,0,0,0.85)",
            titleColor: "#fff",
            bodyColor: "rgba(255,255,255,0.7)",
            titleFont: { size: 10 },
            bodyFont: { size: 10 },
            padding: 6,
          },
        },
        scales: {
          x: {
            ticks: { color: "rgba(255,255,255,0.25)", font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 4 },
            grid: { color: "rgba(255,255,255,0.04)" },
            border: { display: false },
          },
          y: {
            position: "left" as const,
            min: 50, max: 110,
            ticks: { color: "#f87171", font: { size: 9 }, stepSize: 30 },
            grid: { color: "rgba(255,255,255,0.04)" },
            border: { display: false },
          },
          y2: {
            position: "right" as const,
            min: 90, max: 100,
            ticks: { color: "#34d399", font: { size: 9 }, stepSize: 5 },
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    });

    intervalRef.current = setInterval(() => {
      const c = chartRef.current;
      if (!c) return;
      c.data.labels.shift();
      c.data.labels.push("now");
      c.data.labels = c.data.labels.map((_: string, i: number, a: string[]) =>
        i === a.length - 1 ? "now" : `${a.length - 1 - i}s`
      );
      c.data.datasets[0].data.shift();
      c.data.datasets[0].data.push(Math.round(68 + Math.random() * 20));
      c.data.datasets[1].data.shift();
      c.data.datasets[1].data.push(Math.round(95 + Math.random() * 4));
      c.update("none");
    }, 2000);
  };

  useEffect(() => {
    if ((window as WindowWithChart).Chart) {
      initChart();
    } else if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      script.onload = initChart;
      document.head.appendChild(script);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, []);

  return (
    <div className="rounded-xl bg-black/50 border border-white/10 p-2.5 space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-white/30" />
          <span className="text-[9px] text-white/40 font-medium tracking-wide uppercase">Live vitals</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px]">
            <span className="w-3 h-px bg-red-400 inline-block rounded" />
            <span className="text-red-400 font-mono">HR</span>
          </span>
          <span className="flex items-center gap-1 text-[10px]">
            <span className="inline-block w-3" style={{ borderTop: "1.5px dashed #34d399" }} />
            <span className="text-emerald-400 font-mono">SpO₂</span>
          </span>
        </div>
      </div>
      <div style={{ position: "relative", height: "72px" }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Live vitals showing heart rate and blood oxygen"
        />
      </div>
    </div>
  );
};

// ─── Dialog wrapper ───────────────────────────────────────────────────────────

interface ConnectDialogProps {
  doctor: Doctor;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const ConnectDialog = ({ doctor, open, onOpenChange }: ConnectDialogProps) => {
  const call = useCallStore();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => { if (!open) setFullscreen(false); }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    // If ending from the "ended" screen, fully reset the store so next open is fresh
    if (call.phase === "ended") {
      call.setDialogOpen(false);
    }
  };
  const handleMinimize = () => call.setMinimized(true);

  if (!open) return null;

  return createPortal(
    <>
      {!fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}
      <div
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden transition-all duration-300",
          fullscreen
            ? "inset-0 rounded-none"
            : [
                "rounded-2xl shadow-2xl shadow-black/60",
                "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                call.phase === "connected"
                  ? "w-[760px] max-w-[95vw]"
                  : "w-[400px] max-w-[95vw]",
              ]
        )}
      >
        {call.phase !== "connected" ? (
          <PreCallView
            doctor={doctor}
            phase={call.phase as CallPhase}
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
            onClose={handleClose}
            onSetup={() => call.goToSetup(doctor)}
            onStart={() => call.startCall(doctor)}
            onConfirmJoin={call.confirmJoin}
            onRetry={call.retryCall}
          />
        ) : (
          <InCallView
            doctor={doctor}
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
            onMinimize={handleMinimize}
            onEnd={() => call.endCall()}
          />
        )}
      </div>
    </>,
    document.body
  );
};

// ─── Shared device toggle strip ───────────────────────────────────────────────
// Shown both on the setup screen and during the connecting progress phases.

const DeviceToggles = ({ compact = false }: { compact?: boolean }) => {
  const call = useCallStore();
  if (compact) {
    // Small pill-style toggles for the progress screen
    return (
      <div className="flex gap-2">
        <button
          onClick={call.toggleVideo}
          className={cn(
            "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
            call.videoEnabled
              ? "bg-primary/10 text-primary border-primary/25"
              : "bg-white/5 text-white/35 border-white/10 hover:border-white/20 hover:text-white/50"
          )}
        >
          {call.videoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
          {call.videoEnabled ? "Camera on" : "Camera off"}
        </button>
        <button
          onClick={call.toggleAudio}
          className={cn(
            "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
            call.audioEnabled
              ? "bg-primary/10 text-primary border-primary/25"
              : "bg-white/5 text-white/35 border-white/10 hover:border-white/20 hover:text-white/50"
          )}
        >
          {call.audioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          {call.audioEnabled ? "Mic on" : "Mic off"}
        </button>
      </div>
    );
  }

  // Large card-style toggles for the setup screen
  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={call.toggleVideo}
          className={cn(
            "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150",
            call.videoEnabled
              ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
              : "bg-white/4 text-white/35 border-white/10 hover:border-white/20 hover:text-white/50"
          )}
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
            call.videoEnabled ? "bg-primary/20" : "bg-white/8"
          )}>
            {call.videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-[11px] font-semibold leading-none">Camera</p>
            <p className={cn("text-[10px] leading-none", call.videoEnabled ? "text-primary/70" : "text-white/25")}>
              {call.videoEnabled ? "On" : "Off"}
            </p>
          </div>
        </button>

        <button
          onClick={call.toggleAudio}
          className={cn(
            "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150",
            call.audioEnabled
              ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
              : "bg-white/4 text-white/35 border-white/10 hover:border-white/20 hover:text-white/50"
          )}
        >
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
            call.audioEnabled ? "bg-primary/20" : "bg-white/8"
          )}>
            {call.audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-[11px] font-semibold leading-none">Microphone</p>
            <p className={cn("text-[10px] leading-none", call.audioEnabled ? "text-primary/70" : "text-white/25")}>
              {call.audioEnabled ? "On" : "Off"}
            </p>
          </div>
        </button>
      </div>

      <p className="text-[10px] text-white/25 text-center">
        {!call.videoEnabled && !call.audioEnabled
          ? "⚠ Camera and mic are both off"
          : !call.videoEnabled
          ? "Camera off · Mic on"
          : !call.audioEnabled
          ? "Camera on · Mic off — others won't hear you"
          : "Camera and mic are ready"}
      </p>
    </>
  );
};

// ─── Pre-call ─────────────────────────────────────────────────────────────────

interface PreCallViewProps {
  doctor: Doctor;
  phase: CallPhase;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  onClose: () => void;
  onSetup: () => void;
  onStart: () => void;
  onConfirmJoin: () => void;
  onRetry: () => void;
}

const PreCallView = ({
  doctor, phase, fullscreen, setFullscreen, onClose, onSetup, onStart, onConfirmJoin, onRetry,
}: PreCallViewProps) => {
  // Progress values — ringing is 100 to signal "ready"
  const progressMap: Record<string, number> = {
    checking: 20, permissions: 50, connecting: 75, ringing: 100,
  };
  const inProgress = ["checking", "permissions", "connecting", "ringing"].includes(phase);
  const isConnecting = ["checking", "permissions", "connecting"].includes(phase);

  const titleText = () => {
    if (phase === "idle")    return "Instant consult";
    if (phase === "setup")   return "Set up your devices";
    if (phase === "ringing") return "Doctor is ready";
    if (isConnecting)        return "Connecting to doctor";
    if (phase === "failed")  return "Connection failed";
    if (phase === "ended")   return "Call ended";
    return "Instant consult";
  };

  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-semibold text-white/80">{titleText()}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Doctor card */}
        <div className={cn(
          "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all",
          inProgress ? "border-primary/15 bg-primary/5" : "border-white/8 bg-white/4"
        )}>
          <div className="relative shrink-0">
            <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold">
              {doctor.avatar}
            </div>
            {inProgress && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#141414] bg-amber-400 animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white/90 truncate">{doctor.name}</p>
            <p className="text-[11px] text-white/40 truncate mt-0.5">{doctor.specialty} · {doctor.hospital}</p>
          </div>
          {phase !== "idle" && phase !== "setup" && <StatusBadge phase={phase} />}
        </div>

        {/* ── Setup phase: large device cards + confirm ── */}
        {phase === "setup" && (
          <>
            <p className="text-[11px] text-white/40 text-center -mt-1">
              Configure your devices, then join when ready.
            </p>
            <DeviceToggles compact={false} />
            <div className="space-y-2">
              <Button onClick={onStart} className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl">
                <Phone className="h-4 w-4" />
                Start connecting
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full h-9 text-[11px] rounded-xl border-white/10 text-white/50 hover:text-white/80 bg-transparent hover:bg-white/5">
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* ── Progress bar (checking / permissions / connecting) ── */}
        {isConnecting && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Progress
                value={progressMap[phase] ?? 0}
                className="h-[3px] bg-white/8 [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-700"
              />
              <p className="text-[10px] text-white/30 text-center">
                {phase === "checking"    && "Verifying availability..."}
                {phase === "permissions" && "Requesting camera & microphone..."}
                {phase === "connecting"  && "Establishing secure connection..."}
              </p>
            </div>
            {/* Device toggles available throughout — compact pill style */}
            <DeviceToggles compact={true} />
          </div>
        )}

        {/* ── Ringing: progress complete, user confirms to enter call ── */}
        {phase === "ringing" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Progress
                value={100}
                className="h-[3px] bg-white/8 [&>div]:bg-emerald-400 [&>div]:transition-all [&>div]:duration-700"
              />
              <p className="text-[10px] text-emerald-400/70 text-center font-medium">
                Doctor is available — ready to join
              </p>
            </div>
            {/* Still let user adjust devices before entering */}
            <DeviceToggles compact={true} />
            <div className="space-y-2 pt-1">
              <Button
                onClick={onConfirmJoin}
                className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white"
              >
                <Phone className="h-4 w-4" />
                Join call
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full h-9 text-[11px] rounded-xl border-white/10 text-white/50 hover:text-white/80 bg-transparent hover:bg-white/5">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Idle CTA ── */}
        {phase === "idle" && (
          <div className="space-y-2 pt-1">
            <Button onClick={onSetup} className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl">
              <Wifi className="h-4 w-4" />
              Start instant consultation
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full h-9 text-[11px] rounded-xl border-white/10 text-white/50 hover:text-white/80 bg-transparent hover:bg-white/5">
              Cancel
            </Button>
          </div>
        )}

        {/* ── Failed ── */}
        {phase === "failed" && (
          <div className="space-y-2 pt-1">
            <Button onClick={onRetry} className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl">
              <Phone className="h-4 w-4" />Retry connection
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full h-9 text-[11px] rounded-xl border-white/10 bg-transparent text-white/50 hover:bg-white/5">
              Close
            </Button>
          </div>
        )}

        {/* ── Ended: keep modal open, offer reconnect or close ── */}
        {phase === "ended" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-white/4 border border-white/8 px-4 py-3 text-center space-y-1">
              <p className="text-[12px] font-medium text-white/60">Your consultation has ended</p>
              <p className="text-[10px] text-white/30">Duration: {/* elapsed displayed by parent via call.elapsed */} session complete</p>
            </div>
            <div className="space-y-2">
              <Button onClick={onRetry} className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl">
                <Phone className="h-4 w-4" />
                Reconnect with {doctor.name}
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full h-9 text-[11px] rounded-xl border-white/10 bg-transparent text-white/50 hover:text-white/80 hover:bg-white/5">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Footer trust badge */}
        {(phase === "idle" || phase === "setup" || isConnecting || phase === "ringing") && (
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-white/20 pt-1">
            <ShieldCheck className="h-3 w-3" />
            HIPAA compliant · End-to-end encrypted
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Control button ───────────────────────────────────────────────────────────

interface CtrlBtnProps {
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}

const CtrlBtn = ({ active, icon, onClick, label, danger = false }: CtrlBtnProps) => (
  <button
    onClick={onClick}
    title={label}
    className={cn(
      "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
      danger
        ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30"
        : active
          ? "bg-white/15 hover:bg-white/22 text-white"
          : "bg-red-500/75 hover:bg-red-500/90 text-white"
    )}
  >
    {icon}
  </button>
);

// ─── In-call view ─────────────────────────────────────────────────────────────

interface InCallViewProps {
  doctor: Doctor;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  onMinimize: () => void;
  onEnd: () => void;
}

const InCallView = ({ doctor, fullscreen, setFullscreen, onMinimize, onEnd }: InCallViewProps) => {
  const call = useCallStore();
  const [controlsVisible, setControlsVisible] = useState(true);
  // Vitals hidden by default; user can toggle on
  const [showVitals, setShowVitals] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!chatOpen) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
    }
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  useEffect(() => {
    scheduleHide();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [chatOpen]);

  const handleChatToggle = () => {
    const next = !chatOpen;
    setChatOpen(next);
    if (next) call.clearUnread();
  };

  const chatWidth = chatOpen ? 288 : 0;

  return (
    <div
      className={cn(
        "relative flex bg-[#0c0c0c] overflow-hidden",
        fullscreen ? "h-screen w-screen" : "h-[480px]"
      )}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* ── Video area (shrinks when chat open) ── */}
      <div
        className="relative flex-1 flex flex-col transition-all duration-300 min-w-0"
        style={{ marginRight: chatWidth }}
      >
        {/* Doctor feed */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="relative mx-auto w-[88px] h-[88px]">
              <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative h-[88px] w-[88px] rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-3xl font-bold ring-[1.5px] ring-emerald-500/30">
                {doctor.avatar}
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-[14px] font-semibold text-white/90">{doctor.name}</p>
              <p className="text-[11px] text-white/35">{doctor.specialty}</p>
            </div>
          </div>
        </div>

        {/* Vitals overlay — bottom-left, above controls */}
        {showVitals && (
          <div className="absolute bottom-[72px] left-3 right-3 z-10">
            <VitalsChart />
          </div>
        )}

        {/* Self PiP — bottom-right, moves up when vitals shown */}
        <div
          className={cn(
            "absolute right-3 w-[108px] rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center shadow-xl transition-all duration-300",
            showVitals ? "bottom-[calc(72px+100px+12px)]" : "bottom-[72px]"
          )}
          style={{ aspectRatio: "16/9" }}
        >
          <div className="text-[10px] text-white/30 font-medium select-none">You</div>
          {!call.videoEnabled && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <VideoOff className="h-3.5 w-3.5 text-white/25" />
            </div>
          )}
        </div>

        {/* Top bar */}
        <div
          className={cn(
            "absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2.5 z-20",
            "bg-gradient-to-b from-black/55 to-transparent",
            "transition-opacity duration-500",
            controlsVisible ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-white/70 font-mono tracking-wide">
              LIVE · {fmt(call.elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SignalBars strength={call.signalStrength} />
            <div className="flex items-center gap-1">
              <button
                onClick={onMinimize}
                title="Minimize"
                className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setFullscreen(!fullscreen)}
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
              >
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom controls bar */}
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 flex items-center justify-center gap-2.5 px-4 py-3 z-20",
            "bg-gradient-to-t from-black/65 to-transparent",
            "transition-opacity duration-500",
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <CtrlBtn
            active={call.audioEnabled}
            icon={call.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            onClick={call.toggleAudio}
            label={call.audioEnabled ? "Mute" : "Unmute"}
          />
          <CtrlBtn
            active={call.videoEnabled}
            icon={call.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            onClick={call.toggleVideo}
            label={call.videoEnabled ? "Stop video" : "Start video"}
          />

          {/* Chat with unread badge */}
          <div className="relative">
            <CtrlBtn
              active={chatOpen}
              icon={<MessageSquare className="h-4 w-4" />}
              onClick={handleChatToggle}
              label={chatOpen ? "Close chat" : "Open chat"}
            />
            {call.unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none leading-none">
                {call.unreadCount > 9 ? "9+" : call.unreadCount}
              </span>
            )}
          </div>

          <CtrlBtn
            active={showVitals}
            icon={<Activity className="h-4 w-4" />}
            onClick={() => setShowVitals((v) => !v)}
            label={showVitals ? "Hide vitals" : "Show vitals"}
          />

          {/* End call — larger */}
          <button
            onClick={onEnd}
            title="End call"
            className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/35"
          >
            <PhoneOff className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* ── Chat panel — rendered as a sibling, slides in from right ── */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full flex flex-col z-30",
          "bg-[#161616] border-l border-white/8",
          "transition-all duration-300 ease-in-out",
          chatOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden"
        )}
      >
        {chatOpen && (
          <ChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            doctorAvatar={doctor.avatar}
            doctorName={doctor.name}
          />
        )}
      </div>
    </div>
  );
};
