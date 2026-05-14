// pages/DoctorAppointmentsPage.tsx
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { appointments as seedAppointments, doctors } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectDialog } from "@/components/ConnectDialog";
import { ChatPanel } from "@/components/ChatPanel";
import { AppointmentNotesPanel } from "@/components/AppointmentNotesPanel";
import {
  Video, MapPin, Calendar, Clock, SlidersHorizontal, X,
  PhoneOff, Mic, MicOff, VideoOff, Activity, MessageSquare,
  FileText, AlertCircle, Users, Clock3, CheckCircle2,
  Maximize2, Minimize2, Minus, BellRing, UserCheck,
  Stethoscope, Sparkles, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { AppointmentContext, IncomingRequest, useCallStore } from "@/context/CallStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = "upcoming" | "completed" | "cancelled";
type AppointmentType   = "video" | "in-person";
type ViewMode          = "table" | "cards";
type SortOption        = "date-asc" | "date-desc" | "specialty";
type TabId             = "appointments" | "instant";

interface FilterState {
  search:   string;
  status:   AppointmentStatus | "All";
  type:     AppointmentType   | "All";
  dateFrom: string;
  dateTo:   string;
  sort:     SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "", status: "All", type: "All", dateFrom: "", dateTo: "", sort: "date-asc",
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "date-asc",  label: "Date: Soonest first" },
  { value: "date-desc", label: "Date: Latest first"  },
  { value: "specialty", label: "Specialty (A–Z)"      },
];

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  upcoming:  "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  upcoming:  "bg-sky-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

// ─── Fix 1: mockDoctor lifted to module scope — stable reference, never recreated ──

const MOCK_DOCTOR = doctors?.[0] ?? {
  id: "mock", name: "Dr. (Scheduled)", specialty: "General", hospital: "",
  avatar: "DR", status: "online" as const, rating: 5, reviews: 0,
  experience: 10, instantAvailable: true, fee: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const fmtWait = (since: number) => {
  const s = Math.floor((Date.now() - since) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

// ─── Chart.js CDN instance type (avoids no-explicit-any) ─────────────────────

interface ChartDataset {
  data: number[];
}

interface ChartInstance {
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  update: (mode: string) => void;
  destroy: () => void;
}

// ─── Filter sidebar atoms ─────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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

// ─── Signal bars ──────────────────────────────────────────────────────────────

const SignalBars = ({ strength }: { strength: number }) => (
  <div className="flex items-end gap-0.5 h-3.5">
    {[1, 2, 3, 4].map((b) => (
      <div
        key={b}
        style={{ height: `${b * 3}px` }}
        className={cn("w-1 rounded-sm transition-colors", b <= strength ? "bg-emerald-400" : "bg-white/20")}
      />
    ))}
  </div>
);

// ─── Live vitals chart ────────────────────────────────────────────────────────

function InlineVitalsChart() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const chartRef    = useRef<ChartInstance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initChart = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Chart = (window as Record<string, any>)["Chart"];
    if (!Chart || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const hrData   = Array.from({ length: 20 }, () => Math.round(68 + Math.random() * 20));
    const spo2Data = Array.from({ length: 20 }, () => Math.round(95 + Math.random() * 4));
    const labels   = Array.from({ length: 20 }, (_, i) => i === 19 ? "now" : `${19 - i}s`);

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "HR", data: hrData,
            borderColor: "#f87171", backgroundColor: "transparent",
            borderWidth: 1.5, pointRadius: 0, tension: 0.4, yAxisID: "y",
          },
          {
            label: "SpO₂", data: spo2Data,
            borderColor: "#34d399", backgroundColor: "transparent",
            borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, tension: 0.4, yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index", intersect: false,
            backgroundColor: "rgba(0,0,0,0.85)",
            titleFont: { size: 10 }, bodyFont: { size: 10 }, padding: 6,
          },
        },
        scales: {
          x:  { ticks: { color: "rgba(255,255,255,0.25)", font: { size: 9 }, maxTicksLimit: 4 }, grid: { color: "rgba(255,255,255,0.05)" }, border: { display: false } },
          y:  { position: "left",  min: 50, max: 110, ticks: { color: "#f87171",  font: { size: 9 }, stepSize: 30 }, grid: { color: "rgba(255,255,255,0.05)" }, border: { display: false } },
          y2: { position: "right", min: 90, max: 100, ticks: { color: "#34d399",  font: { size: 9 }, stepSize: 5  }, grid: { display: false }, border: { display: false } },
        },
      },
    }) as ChartInstance;

    intervalRef.current = setInterval(() => {
      const c = chartRef.current;
      if (!c) return;
      c.data.labels.shift();
      c.data.labels.push("now");
      c.data.labels = c.data.labels.map(
        (_: unknown, i: number, a: string[]) => i === a.length - 1 ? "now" : `${a.length - 1 - i}s`
      );
      c.data.datasets[0].data.shift();
      c.data.datasets[0].data.push(Math.round(68 + Math.random() * 20));
      c.data.datasets[1].data.shift();
      c.data.datasets[1].data.push(Math.round(95 + Math.random() * 4));
      c.update("none");
    }, 2000);
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as Record<string, any>)["Chart"]) {
      initChart();
    } else {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      s.onload = initChart;
      document.head.appendChild(s);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, []);

  return (
    <div className="bg-black/40 border border-white/10 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-white/30" />
          <span className="text-[9px] text-white/40 font-medium uppercase tracking-wide">Live vitals</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-red-400 inline-block" />
            <span className="text-red-400 font-mono text-[9px]">HR</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3" style={{ borderTop: "1.5px dashed #34d399" }} />
            <span className="text-emerald-400 font-mono text-[9px]">SpO₂</span>
          </span>
        </div>
      </div>
      <div className="h-[80px]">
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

// ─── Active call panel (inline flex, no absolute children) ───────────────────

function ActiveCallPanel() {
  const call = useCallStore();
  const { activeRequest, activeAppointment } = call;
  const [chatOpen,        setChatOpen]        = useState(false);
  const [fullscreen,      setFullscreen]      = useState(false);
  const [showVitals,      setShowVitals]      = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive display info from whichever call type is active
  const displayName   = activeRequest?.patientName   ?? activeAppointment?.patientLabel ?? "Patient";
  const displaySub    = activeRequest?.reason        ?? activeAppointment?.specialty    ?? "";
  const displayAvatar = activeRequest?.patientAvatar ?? (activeAppointment?.specialty.slice(0, 2).toUpperCase() ?? "PT");
  const chatName      = activeRequest?.patientName   ?? activeAppointment?.patientLabel ?? "Patient";
  const chatAvatar    = activeRequest?.patientAvatar ?? displayAvatar;

  // Fix 4: stable resetHide via useCallback — correctly closes over current chatOpen
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

      {/* Center: patient avatar + info */}
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
          {/* Self PiP */}
          <div
            className="w-28 rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center shadow-lg"
            style={{ aspectRatio: "16/9" }}
          >
            <span className="text-[9px] text-white/30 select-none">You</span>
            {!call.videoEnabled && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                <VideoOff className="h-3.5 w-3.5 text-white/25" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vitals chart */}
      {showVitals && (
        <div className="px-3 pb-2 shrink-0">
          <InlineVitalsChart />
        </div>
      )}

      {/* Bottom controls */}
      <div className={cn(
        "flex items-center justify-center gap-2.5 px-4 py-3 shrink-0",
        "bg-gradient-to-t from-black/60 to-transparent",
        "transition-opacity duration-300",
        controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}>
        <CallCtrlBtn
          active={call.audioEnabled}
          onClick={call.toggleAudio}
          label="Mic"
          icon={call.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        />
        <CallCtrlBtn
          active={call.videoEnabled}
          onClick={call.toggleVideo}
          label="Video"
          icon={call.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        />
        {/* Chat with badge */}
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
        <CallCtrlBtn
          active={showVitals}
          onClick={() => setShowVitals(v => !v)}
          label="Vitals"
          icon={<Activity className="h-4 w-4" />}
        />
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
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        doctorAvatar={chatAvatar}
        doctorName={chatName}
      />
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
    <div className="flex w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
      {videoArea}
      {chatColumn}
    </div>
  );
}

// ─── Instant-call notes sidebar ───────────────────────────────────────────────

function InstantNotesSidebar({ onClose }: { onClose: () => void }) {
  const call = useCallStore();
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const templates = ["Chief complaint", "Current medications", "Allergies", "Assessment", "Plan"];

  const insertTemplate = (tpl: string) => {
    const prefix = `${tpl}:\n`;
    const next = call.callNotes ? `${call.callNotes}\n\n${prefix}` : prefix;
    call.updateCallNotes(next);
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        textRef.current.setSelectionRange(next.length, next.length);
      }
    }, 0);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-semibold">Call notes</span>
          {call.activeRequest && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              — {call.activeRequest.patientName.split(" ")[0]}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 py-2.5 border-b border-border/60 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Quick insert</p>
        <div className="flex flex-wrap gap-1.5">
          {templates.map((tpl) => (
            <button
              key={tpl}
              onClick={() => insertTemplate(tpl)}
              className="text-[10px] px-2 py-1 rounded-md border border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              {tpl}
            </button>
          ))}
        </div>
      </div>

      <textarea
        ref={textRef}
        value={call.callNotes}
        onChange={(e) => call.updateCallNotes(e.target.value)}
        placeholder={`Type consultation notes here…\n\nNotes are auto-saved and attached to this appointment.`}
        className="flex-1 w-full resize-none bg-transparent text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-none px-4 py-3 font-mono"
      />

      <div className="px-4 py-2.5 border-t border-border/60 shrink-0 flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground/50">{call.callNotes.length} chars · auto-saved</span>
        <button
          onClick={() => call.updateCallNotes("")}
          className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ─── Incoming request card ────────────────────────────────────────────────────

function IncomingCard({
  req, onAccept, onDecline,
}: { req: IncomingRequest; onAccept: () => void; onDecline: () => void }) {
  const [wait, setWait] = useState(fmtWait(req.waitingSince));

  useEffect(() => {
    const t = setInterval(() => setWait(fmtWait(req.waitingSince)), 1000);
    return () => clearInterval(t);
  }, [req.waitingSince]);

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
      req.priority === "urgent"
        ? "border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
        : "border-border bg-card hover:border-border/80",
    )}>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold",
            req.priority === "urgent"
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
              : "bg-primary/10 text-primary",
          )}>
            {req.patientAvatar}
          </div>
          {req.priority === "urgent" && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
              <AlertCircle className="h-2 w-2 text-white" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-foreground">{req.patientName}</p>
            {req.priority === "urgent" && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/40 uppercase tracking-wide">
                Urgent
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{req.reason}</p>
          <div className="flex items-center gap-1 mt-1">
            <Clock3 className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">Waiting {wait}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDecline}
            title="Decline"
            className="h-9 w-9 rounded-full border border-border bg-background hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950/30 text-muted-foreground flex items-center justify-center transition-all duration-200"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
          <button
            onClick={onAccept}
            title="Accept"
            className={cn(
              "h-9 px-4 rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 shadow-md active:scale-95",
              req.priority === "urgent"
                ? "bg-red-500 hover:bg-red-400 shadow-red-500/25"
                : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25",
            )}
          >
            <Phone className="h-3.5 w-3.5" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment card (card view) ─────────────────────────────────────────────
// Fix 5: removed internal useCallStore() call — hasNotes now comes as a prop

function AppointmentCard({
  appt, statusLabel, onStart, hasNotes,
}: {
  appt: typeof seedAppointments[number];
  statusLabel: Record<string, string>;
  onStart: (appt: typeof seedAppointments[number]) => void;
  hasNotes: boolean;
}) {
  return (
    <div className="bg-card border border-border/70 rounded-sm p-3.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
        {appt.specialty?.slice(0, 2).toUpperCase() || "PT"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-foreground">Patient · {appt.specialty}</span>
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium border", STATUS_STYLES[appt.status])}>
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[appt.status])} />
            {statusLabel[appt.status] ?? appt.status}
          </Badge>
          {hasNotes && (
            <span className="text-[9px] text-emerald-600 dark:text-emerald-500 flex items-center gap-0.5">
              <FileText className="h-2.5 w-2.5" />notes
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-1">
          {appt.type === "video"
            ? <Video className="h-3 w-3 text-sky-500" />
            : <MapPin className="h-3 w-3 text-amber-500" />}
          {appt.type}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[11px] font-medium text-foreground flex items-center justify-end gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground/50" />{appt.date}
          </p>
          <p className="text-[10px] text-muted-foreground/70 flex items-center justify-end gap-1 mt-0.5">
            <Clock className="h-3 w-3" />{appt.time}
          </p>
        </div>
        <Button
          size="sm"
          variant={appt.status === "upcoming" ? "default" : "ghost"}
          className={cn(
            "h-7 px-3 text-[10px] font-semibold rounded-sm transition-all duration-200",
            appt.status === "upcoming"
              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          )}
          onClick={() => appt.status === "upcoming" && onStart(appt)}
        >
          {appt.status === "upcoming" ? "Start" : "Notes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Scheduled call view ──────────────────────────────────────────────────────

function ScheduledCallView({ onExit }: { onExit: () => void }) {
  const call = useCallStore();
  const [notesOpen, setNotesOpen] = useState(true);
  const appt = call.activeAppointment;

  // Fix 3: onExit is now a stable useCallback from the parent — safe as a dep
  useEffect(() => {
    if (call.phase === "ended") {
      const t = setTimeout(onExit, 1800);
      return () => clearTimeout(t);
    }
  }, [call.phase, onExit]);

  if (!appt) return null;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: summary bar + call panel */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Summary bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/50 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[12px] font-semibold text-foreground shrink-0">{appt.patientLabel}</span>
            <span className="text-[11px] text-muted-foreground truncate">
              — {appt.specialty} · {appt.date} {appt.time}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{fmt(call.elapsed)}</span>
            <button
              onClick={() => setNotesOpen(v => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors",
                notesOpen
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {notesOpen ? "Hide notes" : "Notes"}
            </button>
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Back
            </button>
          </div>
        </div>

        {/* Call panel */}
        <div className="flex-1 min-h-0 p-4">
          <ActiveCallPanel />
        </div>
      </div>

      {/* Notes sidebar */}
      {notesOpen && (
        <div className="w-80 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
          <AppointmentNotesPanel appt={appt} onClose={() => setNotesOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: Appointments ──────────────────────────────────────────────────────

function AppointmentsTab() {
  const { t } = useTranslation();
  const call = useCallStore();

  const [filters,             setFilters]             = useState<FilterState>(INITIAL_FILTERS);
  const [view,                setView]                = useState<ViewMode>("table");
  const [filterOpen,          setFilterOpen]          = useState(false);
  const [scheduledCallActive, setScheduledCallActive] = useState(false);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAllFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS), [filters]);

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // Exit scheduled call view when store resets
  useEffect(() => {
    if (call.phase === "idle" && scheduledCallActive) setScheduledCallActive(false);
  }, [call.phase, scheduledCallActive]);

  const statusLabel: Record<string, string> = {
    upcoming:  t("pages.hospital.pending"),
    completed: t("pages.hospital.completed"),
    cancelled: t("pages.hospital.cancelled"),
  };

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return seedAppointments
      .filter((a) => {
        if (filters.status !== "All" && a.status !== filters.status) return false;
        if (filters.type   !== "All" && a.type   !== filters.type)   return false;
        if (filters.dateFrom && a.rawDate < filters.dateFrom) return false;
        if (filters.dateTo   && a.rawDate > filters.dateTo)   return false;
        if (q && !a.specialty.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const aD = a.rawDate ?? "", bD = b.rawDate ?? "";
        if (filters.sort === "date-desc") return bD.localeCompare(aD);
        if (filters.sort === "specialty") return a.specialty.localeCompare(b.specialty);
        return aD.localeCompare(bD);
      });
  }, [filters]);

  const upcomingCount  = filtered.filter((a) => a.status === "upcoming").length;
  const completedCount = filtered.filter((a) => a.status === "completed").length;
  const cancelledCount = filtered.filter((a) => a.status === "cancelled").length;

  // Fix 1: MOCK_DOCTOR is now a module-level constant — no dep needed
  // Fix 1 continued: handleStart no longer lists mockDoctor as a dep
  const handleStart = useCallback((appt: typeof seedAppointments[number]) => {
    const apptCtx: AppointmentContext = {
      id:           appt.id,
      patientLabel: t("pages.doctor.patient"),
      specialty:    appt.specialty,
      date:         appt.date,
      time:         appt.time,
      type:         appt.type as "video" | "in-person",
    };
    call.startScheduledCall(apptCtx, MOCK_DOCTOR);
    setScheduledCallActive(true);
  }, [call, t]);

  // Fix 3: stable onExit so ScheduledCallView's useEffect doesn't fire multiple times
  const handleExit = useCallback(() => {
    call.endCall();
    setScheduledCallActive(false);
  }, [call]);

  // Show call+notes view when scheduled call is live
  if (scheduledCallActive && call.role === "doctor" &&
      (call.phase === "connected" || call.phase === "ended")) {
    return (
      <ScheduledCallView onExit={handleExit} />
    );
  }

  // ── Filter sidebar content (shared desktop + mobile) ──────────────────────

  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" />Reset all
          </button>
        )}
      </div>
      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<AppointmentStatus | "All">
            value={filters.status} onChange={(v) => set("status", v)}
            options={[
              { value: "All",       label: "All statuses" },
              { value: "upcoming",  label: "Upcoming"     },
              { value: "completed", label: "Completed"    },
              { value: "cancelled", label: "Cancelled"    },
            ]}
          />
        </FilterSection>
        <FilterSection title="Type">
          <PillGroup<AppointmentType | "All">
            value={filters.type} onChange={(v) => set("type", v)}
            options={[
              { value: "All",        label: "All types"       },
              { value: "video",      label: "Video consult"   },
              { value: "in-person",  label: "In-person visit" },
            ]}
          />
        </FilterSection>
        <FilterSection title="Date Range">
          <div className="space-y-2">
            <div>
              <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">From</p>
              <input
                type="date" value={filters.dateFrom}
                onChange={(e) => set("dateFrom", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">To</p>
              <input
                type="date" value={filters.dateTo} min={filters.dateFrom}
                onChange={(e) => set("dateTo", e.target.value)}
                className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => { set("dateFrom", ""); set("dateTo", ""); }}
                className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        </FilterSection>
        <FilterSection title="Sort">
          <PillGroup<SortOption>
            value={filters.sort} onChange={(v) => set("sort", v)}
            options={SORT_OPTIONS}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 h-full overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      <div
        onClick={() => setFilterOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 backdrop-blur-sm",
          filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Mobile bottom drawer */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-lg border-t border-border/60",
        "max-h-[85dvh] flex flex-col overflow-hidden transition-transform duration-300 ease-out shadow-2xl",
        filterOpen ? "translate-y-0" : "translate-y-full",
      )}>
        <div className="flex justify-center pt-3 pb-1.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="overflow-y-auto flex-1">{sidebarContent}</div>
        <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card">
          <button
            onClick={() => setFilterOpen(false)}
            className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all duration-200"
          >
            Show {filtered.length} {filtered.length === 1 ? "appointment" : "appointments"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Meta / toolbar bar */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "appointment" : "appointments"}
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="ml-2 text-primary hover:underline text-[10px] font-medium">
                  Reset filters
                </button>
              )}
            </p>
            <div className="hidden lg:flex items-center gap-2">
              {upcomingCount  > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />{upcomingCount} upcoming
                </span>
              )}
              {completedCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{completedCount} done
                </span>
              )}
              {cancelledCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{cancelledCount} cancelled
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen(true)}
              className={cn(
                "md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-all duration-200 font-medium",
                hasActiveFilters
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />Filters
            </button>
            <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                className={cn("px-2.5 py-1.5 transition-all duration-200",
                  view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
                </svg>
              </button>
              <button
                onClick={() => setView("cards")}
                aria-label="Card view"
                className={cn("px-2.5 py-1.5 border-l border-border/60 transition-all duration-200",
                  view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Table / card list */}
        <div className="p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                <Calendar className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground">No appointments match your filters</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
              </div>
              <button onClick={clearAllFilters} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                Clear all filters
              </button>
            </div>
          ) : view === "table" ? (
            <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
              <table className="w-full text-[11px]">
                <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_patient")}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_when")}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_type")}</th>
                    <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_status")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    // Fix 5: hasNotes computed once here in the parent — no per-row store access
                    const hasNotes = !!call.appointmentNotes[a.id];
                    return (
                      <tr key={a.id} className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
                              {a.specialty?.slice(0, 2).toUpperCase() || "PT"}
                            </div>
                            <div>
                              <p className="font-semibold text-[12px] text-foreground">{t("pages.doctor.patient")}</p>
                              <p className="text-[10px] text-muted-foreground/70">{a.specialty}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Calendar className="h-3 w-3 text-muted-foreground/40" />{a.date}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3 text-muted-foreground/40" />{a.time}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
                            {a.type === "video"
                              ? <Video className="h-3.5 w-3.5 text-sky-500" />
                              : <MapPin className="h-3.5 w-3.5 text-amber-500" />}
                            <span>{a.type}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", STATUS_STYLES[a.status])}>
                            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[a.status])} />
                            {statusLabel[a.status] ?? a.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasNotes && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                                <FileText className="h-3 w-3" />Has notes
                              </span>
                            )}
                            {a.status === "upcoming" ? (
                              <Button
                                size="sm"
                                onClick={() => handleStart(a)}
                                className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm"
                              >
                                {t("pages.doctor.start")}
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 px-3 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm"
                              >
                                {t("pages.doctor.notes")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Fix 5: hasNotes computed in parent and passed as prop — no per-card store subscription */}
              {filtered.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appt={a}
                  statusLabel={statusLabel}
                  onStart={handleStart}
                  hasNotes={!!call.appointmentNotes[a.id]}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Tab 2: Instant Consultation ─────────────────────────────────────────────

function InstantConsultTab() {
  const call = useCallStore();
  const [notesOpen, setNotesOpen] = useState(true);
  const isInCall = call.phase === "connected" && call.role === "doctor";

  // Fix 2: track latest queue length in a ref so setInterval closure is never stale
  const queueLenRef = useRef(call.incomingRequests.length);
  useEffect(() => {
    queueLenRef.current = call.incomingRequests.length;
  }, [call.incomingRequests.length]);

  useEffect(() => {
    if (isInCall) return;
    if (queueLenRef.current === 0) call.simulateIncomingRequest();
    const t = setInterval(() => {
      if (queueLenRef.current < 4) call.simulateIncomingRequest();
    }, 18000);
    return () => clearInterval(t);
  }, [isInCall, call.simulateIncomingRequest]);

  // ── Active call layout ────────────────────────────────────────────────────

  if (isInCall) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: summary bar + video */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/50 shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-[12px] font-semibold text-foreground shrink-0">
                {call.activeRequest?.patientName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                — {call.activeRequest?.reason}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                {fmt(call.elapsed)}
              </span>
              <button
                onClick={() => setNotesOpen(v => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors",
                  notesOpen
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                {notesOpen ? "Hide notes" : "Notes"}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-4">
            <ActiveCallPanel />
          </div>
        </div>

        {/* Right: instant notes sidebar */}
        {notesOpen && (
          <div className="w-72 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
            <InstantNotesSidebar onClose={() => setNotesOpen(false)} />
          </div>
        )}
      </div>
    );
  }

  // ── Queue view ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {/* Status header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-semibold text-foreground">You're online</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {call.incomingRequests.length === 0
                ? "No patients waiting"
                : `${call.incomingRequests.length} patient${call.incomingRequests.length > 1 ? "s" : ""} in queue`}
            </span>
          </div>
          <button
            onClick={call.simulateIncomingRequest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground border border-border/60 rounded-md hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <BellRing className="h-3 w-3" />
            Simulate request
          </button>
        </div>

        {/* Empty state */}
        {call.incomingRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Ready for patients</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-[260px] leading-relaxed">
                Incoming instant consultation requests will appear here.
              </p>
            </div>
          </div>
        )}

        {/* Incoming cards */}
        <div className="space-y-3">
          {call.incomingRequests.map((req) => (
            <IncomingCard
              key={req.id}
              req={req}
              onAccept={() => call.acceptRequest(req.id)}
              onDecline={() => call.declineRequest(req.id)}
            />
          ))}
        </div>
      </div>

      {/* Stats sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-l border-border/60 bg-card/40 p-4 gap-4 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Today's stats
        </p>
        {[
          { icon: <UserCheck    className="h-4 w-4 text-emerald-500" />, label: "Seen today",   value: "7"   },
          { icon: <Clock3       className="h-4 w-4 text-sky-500"     />, label: "Avg duration", value: "14m" },
          { icon: <Users        className="h-4 w-4 text-violet-500"  />, label: "In queue",     value: String(call.incomingRequests.length) },
          { icon: <CheckCircle2 className="h-4 w-4 text-primary"     />, label: "Resolved",     value: "6"   },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background">
            <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">{icon}</div>
            <div>
              <p className="text-[11px] font-semibold text-foreground">{value}</p>
              <p className="text-[9px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

const DoctorAppointmentsPage = () => {
  const { t } = useTranslation();
  const call = useCallStore();
  const [tab, setTab] = useState<TabId>("appointments");

  // Auto-switch to Instant tab when a queued call is accepted
  useEffect(() => {
    if (call.phase === "connected" && call.role === "doctor" && call.activeRequest) {
      setTab("instant");
    }
  }, [call.phase, call.role, call.activeRequest]);

  const pendingCount = call.incomingRequests.length;

  return (
    <DashboardLayout role="doctor">
      <PageHeader
        title={t("pages.doctor.overview_title")}
        subtitle={t("pages.doctor.overview_sub")}
      />

      {/* Tab bar */}
      <div className="flex items-center border-b border-border/60 px-4 bg-card/30 shrink-0">
        {(["appointments", "instant"] as TabId[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-[12px] font-medium border-b-2 transition-all duration-200",
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {id === "appointments" ? (
              <>
                <Calendar className="h-3.5 w-3.5" />
                Appointments
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Instant consultation
                {pendingCount > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {pendingCount}
                  </span>
                )}
                {call.phase === "connected" && call.role === "doctor" && call.activeRequest && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {tab === "appointments" ? <AppointmentsTab /> : <InstantConsultTab />}
      </div>
    </DashboardLayout>
  );
};

export default DoctorAppointmentsPage;
