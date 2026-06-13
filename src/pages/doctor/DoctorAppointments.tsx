// // // pages/DoctorAppointmentsPage.tsx
// import { useState, useMemo, useCallback, useEffect, useRef } from "react";
// import { useTranslation } from "react-i18next";
// import { DashboardLayout } from "@/components/DashboardLayout";
// import { doctors } from "@/lib/mock-data";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { ConnectDialog } from "@/components/ConnectDialog";
// import { ChatPanel } from "@/components/ChatPanel";
// import { AppointmentNotesPanel } from "@/components/AppointmentNotesPanel";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// import duration from "dayjs/plugin/duration";
// dayjs.extend(relativeTime);
// dayjs.extend(duration);
// import {
//   Video, MapPin, Calendar, Clock, SlidersHorizontal, X,
//   PhoneOff, Mic, MicOff, VideoOff, Activity, MessageSquare,
//   FileText, AlertCircle, Users, Clock3, CheckCircle2,
//   Maximize2, Minimize2, Minus, BellRing, UserCheck,
//   Stethoscope, Sparkles, Phone, Loader2, Eye,
//   CreditCard, Shield, Timer, ChevronRight, AlertTriangle,
//   CheckCheck, Info, Building2,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { PageHeader } from "@/components/PageHeader";
// import { AppointmentContext, IncomingRequest, useCallStore } from "@/context/CallStore";

// import {
//   useGetAppointments,
//   useAcceptQuick,
//   useJoinSession,
//   useCompleteAppointment,
//   useRunningLate,
//   useReadyNext,
//   useGetInstantQueue,
//   useAcceptInstant,
//   useDeclineInstant,
//   useCompleteInstant,
//   type Appointment,
//   type AppointmentApiStatus,
//   type AppointmentApiType,
//   type GetAppointmentsParams,
// } from "@/hooks/doctor/use-doctor-appointment";

// import { toast } from "sonner";

// // ─── Api error type ───────────────────────────────────────────────────────────

// interface ApiError {
//   message?: string;
// }

// function getErrMsg(err: unknown, fallback: string): string {
//   if (err && typeof err === "object" && "message" in err) {
//     return (err as ApiError).message ?? fallback;
//   }
//   return fallback;
// }

// // ─── Types ────────────────────────────────────────────────────────────────────

// type UIStatus   = "pending" | "confirmed" | "in_progress" | "completed";
// type ViewMode   = "table" | "cards";
// type SortOption = "date-asc" | "date-desc" | "name";
// type TabId      = "appointments" | "instant";

// interface FilterState {
//   search:   string;
//   status:   AppointmentApiStatus | "All";
//   type:     AppointmentApiType   | "All";
//   date:     string;
//   today:    boolean;
//   upcoming: boolean;
//   sort:     SortOption;
// }

// const INITIAL_FILTERS: FilterState = {
//   search: "", status: "All", type: "All",
//   date: "", today: false, upcoming: false,
//   sort: "date-asc",
// };

// const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
//   { value: "date-asc",  label: "Date: Soonest first" },
//   { value: "date-desc", label: "Date: Latest first"  },
//   { value: "name",      label: "Patient name (A–Z)"  },
// ];

// const STATUS_STYLES: Record<UIStatus, string> = {
//   pending:     "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950/30  dark:text-amber-400  dark:border-amber-900",
//   confirmed:   "bg-sky-50    text-sky-700    border-sky-200    dark:bg-sky-950/30    dark:text-sky-400    dark:border-sky-900",
//   in_progress: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
//   completed:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
// };

// const STATUS_DOT: Record<UIStatus, string> = {
//   pending:     "bg-amber-500",
//   confirmed:   "bg-sky-500",
//   in_progress: "bg-violet-500",
//   completed:   "bg-emerald-500",
// };

// // ─── RUNNING LATE DELAY OPTIONS ───────────────────────────────────────────────

// const DELAY_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

// // ─── Mock doctor ──────────────────────────────────────────────────────────────

// const MOCK_DOCTOR = doctors?.[0] ?? {
//   id: "mock", name: "Dr. (Scheduled)", specialty: "General", hospital: "",
//   avatar: "DR", status: "online" as const, rating: 5, reviews: 0,
//   experience: 10, instantAvailable: true, fee: 0,
// };

// // ─── Date helpers ─────────────────────────────────────────────────────────────

// const fmt = (s: number) =>
//   `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// const fmtWait = (since: number) => {
//   const s = Math.floor((Date.now() - since) / 1000);
//   if (s < 60) return `${s}s`;
//   return `${Math.floor(s / 60)}m ${s % 60}s`;
// };

// /** Format an ISO date string as "Jun 15, 2026" */
// const fmtDate = (iso: string | null | undefined): string => {
//   if (!iso) return "—";
//   return dayjs(iso).format("MMM D, YYYY");
// };

// /** Format an ISO date/time as "Jun 15, 2026 · 11:00 AM" */
// const fmtDateTime = (iso: string | null | undefined): string => {
//   if (!iso) return "—";
//   return dayjs(iso).format("MMM D, YYYY · h:mm A");
// };

// /** Format just the time from ISO string */
// const fmtTime = (iso: string | null | undefined): string => {
//   if (!iso) return "—";
//   return dayjs(iso).format("h:mm A");
// };

// /** Relative time: "3 hours ago", "in 2 days" */
// const fmtRelative = (iso: string | null | undefined): string => {
//   if (!iso) return "—";
//   return dayjs(iso).fromNow();
// };

// const apptLabel     = (a: Appointment) => a.patient?.name ?? "Patient";
// const apptSpecialty = (_a: Appointment) => "General";

// const statusLabel = (status: UIStatus): string => ({
//   pending:     "Pending",
//   confirmed:   "Confirmed",
//   in_progress: "In progress",
//   completed:   "Completed",
// }[status]);

// function filtersToParams(filters: FilterState): GetAppointmentsParams {
//   const params: GetAppointmentsParams = {};
//   if (filters.status !== "All") params.status  = filters.status;
//   if (filters.type   !== "All") params.type    = filters.type;
//   if (filters.today)             params.today   = true;
//   if (filters.upcoming)          params.upcoming = true;
//   if (filters.date) {
//     params.date    = filters.date;
//     delete params.today;
//     delete params.upcoming;
//   }
//   return params;
// }

// // ─── Chart instance type ──────────────────────────────────────────────────────

// interface ChartDataset { data: number[] }
// interface ChartInstance {
//   data: { labels: string[]; datasets: ChartDataset[] };
//   update: (mode: string) => void;
//   destroy: () => void;
// }

// // ─── Filter sidebar atoms ─────────────────────────────────────────────────────

// function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <div className="py-3 border-b border-border/60 last:border-b-0">
//       <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">{title}</p>
//       {children}
//     </div>
//   );
// }

// function PillGroup<T extends string>({
//   value, onChange, options,
// }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
//   return (
//     <div className="flex flex-col gap-1">
//       {options.map((o) => (
//         <button
//           key={o.value}
//           onClick={() => onChange(o.value)}
//           className={cn(
//             "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left",
//             value === o.value
//               ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
//               : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
//           )}
//         >
//           {o.label}
//         </button>
//       ))}
//     </div>
//   );
// }

// // ─── Call control button ──────────────────────────────────────────────────────

// const CallCtrlBtn = ({
//   active, icon, onClick, label,
// }: { active: boolean; icon: React.ReactNode; onClick: () => void; label: string }) => (
//   <button
//     onClick={onClick}
//     title={label}
//     className={cn(
//       "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
//       active
//         ? "bg-white/15 hover:bg-white/25 text-white"
//         : "bg-red-500/80 hover:bg-red-500 text-white",
//     )}
//   >
//     {icon}
//   </button>
// );

// // ─── Signal bars ──────────────────────────────────────────────────────────────

// const SignalBars = ({ strength }: { strength: number }) => (
//   <div className="flex items-end gap-0.5 h-3.5">
//     {[1, 2, 3, 4].map((b) => (
//       <div
//         key={b}
//         style={{ height: `${b * 3}px` }}
//         className={cn("w-1 rounded-sm transition-colors", b <= strength ? "bg-emerald-400" : "bg-white/20")}
//       />
//     ))}
//   </div>
// );

// // ─── Live vitals chart ────────────────────────────────────────────────────────

// function InlineVitalsChart() {
//   const canvasRef   = useRef<HTMLCanvasElement>(null);
//   const chartRef    = useRef<ChartInstance | null>(null);
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   const initChart = () => {
//     const Chart = (window as Record<string, unknown>)["Chart"] as (new (...args: unknown[]) => ChartInstance) | undefined;
//     if (!Chart || !canvasRef.current) return;
//     if (chartRef.current) chartRef.current.destroy();

//     const hrData   = Array.from({ length: 20 }, () => Math.round(68 + Math.random() * 20));
//     const spo2Data = Array.from({ length: 20 }, () => Math.round(95 + Math.random() * 4));
//     const labels   = Array.from({ length: 20 }, (_, i) => i === 19 ? "now" : `${19 - i}s`);

//     chartRef.current = new Chart(canvasRef.current, {
//       type: "line",
//       data: {
//         labels,
//         datasets: [
//           {
//             label: "HR", data: hrData,
//             borderColor: "#f87171", backgroundColor: "transparent",
//             borderWidth: 1.5, pointRadius: 0, tension: 0.4, yAxisID: "y",
//           },
//           {
//             label: "SpO₂", data: spo2Data,
//             borderColor: "#34d399", backgroundColor: "transparent",
//             borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, tension: 0.4, yAxisID: "y2",
//           },
//         ],
//       },
//       options: {
//         responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
//         plugins: {
//           legend: { display: false },
//           tooltip: {
//             mode: "index", intersect: false,
//             backgroundColor: "rgba(0,0,0,0.85)",
//             titleFont: { size: 10 }, bodyFont: { size: 10 }, padding: 6,
//           },
//         },
//         scales: {
//           x:  { ticks: { color: "rgba(255,255,255,0.25)", font: { size: 9 }, maxTicksLimit: 4 }, grid: { color: "rgba(255,255,255,0.05)" }, border: { display: false } },
//           y:  { position: "left",  min: 50, max: 110, ticks: { color: "#f87171",  font: { size: 9 }, stepSize: 30 }, grid: { color: "rgba(255,255,255,0.05)" }, border: { display: false } },
//           y2: { position: "right", min: 90, max: 100, ticks: { color: "#34d399",  font: { size: 9 }, stepSize: 5  }, grid: { display: false }, border: { display: false } },
//         },
//       },
//     } as Parameters<typeof Chart>[1]);

//     intervalRef.current = setInterval(() => {
//       const c = chartRef.current;
//       if (!c) return;
//       c.data.labels.shift();
//       c.data.labels.push("now");
//       c.data.labels = c.data.labels.map(
//         (_: unknown, i: number, a: string[]) => i === a.length - 1 ? "now" : `${a.length - 1 - i}s`
//       );
//       c.data.datasets[0].data.shift();
//       c.data.datasets[0].data.push(Math.round(68 + Math.random() * 20));
//       c.data.datasets[1].data.shift();
//       c.data.datasets[1].data.push(Math.round(95 + Math.random() * 4));
//       c.update("none");
//     }, 2000);
//   };

//   useEffect(() => {
//     if ((window as Record<string, unknown>)["Chart"]) {
//       initChart();
//     } else {
//       const s = document.createElement("script");
//       s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
//       s.onload = initChart;
//       document.head.appendChild(s);
//     }
//     return () => {
//       if (intervalRef.current) clearInterval(intervalRef.current);
//       if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
//     };
//   }, []);

//   return (
//     <div className="bg-black/40 border border-white/10 rounded-lg p-2.5">
//       <div className="flex items-center justify-between mb-1.5">
//         <div className="flex items-center gap-1.5">
//           <Activity className="h-3 w-3 text-white/30" />
//           <span className="text-[9px] text-white/40 font-medium uppercase tracking-wide">Live vitals</span>
//         </div>
//         <div className="flex items-center gap-3">
//           <span className="flex items-center gap-1">
//             <span className="w-3 h-px bg-red-400 inline-block" />
//             <span className="text-red-400 font-mono text-[9px]">HR</span>
//           </span>
//           <span className="flex items-center gap-1">
//             <span className="inline-block w-3" style={{ borderTop: "1.5px dashed #34d399" }} />
//             <span className="text-emerald-400 font-mono text-[9px]">SpO₂</span>
//           </span>
//         </div>
//       </div>
//       <div className="h-[80px]">
//         <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
//       </div>
//     </div>
//   );
// }

// // ─── Active call panel ────────────────────────────────────────────────────────

// function ActiveCallPanel() {
//   const call = useCallStore();
//   const { activeRequest, activeAppointment } = call;
//   const [chatOpen,        setChatOpen]        = useState(false);
//   const [fullscreen,      setFullscreen]      = useState(false);
//   const [showVitals,      setShowVitals]      = useState(true);
//   const [controlsVisible, setControlsVisible] = useState(true);
//   const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const displayName   = activeRequest?.patientName   ?? activeAppointment?.patientLabel ?? "Patient";
//   const displaySub    = activeRequest?.reason        ?? activeAppointment?.specialty    ?? "";
//   const displayAvatar = activeRequest?.patientAvatar ?? (activeAppointment?.specialty.slice(0, 2).toUpperCase() ?? "PT");
//   const chatName      = activeRequest?.patientName   ?? activeAppointment?.patientLabel ?? "Patient";
//   const chatAvatar    = activeRequest?.patientAvatar ?? displayAvatar;

//   const resetHide = useCallback(() => {
//     setControlsVisible(true);
//     if (hideTimer.current) clearTimeout(hideTimer.current);
//     if (!chatOpen) {
//       hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
//     }
//   }, [chatOpen]);

//   useEffect(() => {
//     resetHide();
//     return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
//   }, [resetHide]);

//   if (call.phase !== "connected") return null;

//   const videoArea = (
//     <div
//       className="relative flex-1 flex flex-col bg-[#0c0c0c] overflow-hidden min-h-0"
//       onMouseMove={resetHide}
//       onTouchStart={resetHide}
//     >
//       <div className={cn(
//         "flex items-center justify-between px-3 py-2.5 shrink-0",
//         "bg-gradient-to-b from-black/60 to-transparent",
//         "transition-opacity duration-300",
//         controlsVisible ? "opacity-100" : "opacity-0",
//       )}>
//         <div className="flex items-center gap-2">
//           <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
//           <span className="text-[10px] text-white/70 font-mono tracking-wide">LIVE · {fmt(call.elapsed)}</span>
//         </div>
//         <div className="flex items-center gap-2">
//           <SignalBars strength={call.signalStrength} />
//           <button
//             onClick={() => call.setMinimized(true)}
//             className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
//           >
//             <Minus className="h-3.5 w-3.5" />
//           </button>
//           <button
//             onClick={() => setFullscreen(v => !v)}
//             className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
//           >
//             {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
//           </button>
//         </div>
//       </div>

//       <div className="flex-1 flex items-center justify-center py-4 min-h-0">
//         <div className="flex flex-col items-center gap-3">
//           <div className="relative">
//             <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: "2.5s" }} />
//             <div className="relative h-20 w-20 rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-2xl font-bold ring-[1.5px] ring-emerald-500/30">
//               {displayAvatar}
//             </div>
//           </div>
//           <div className="text-center">
//             <p className="text-[14px] font-semibold text-white/90">{displayName}</p>
//             <p className="text-[11px] text-white/35 mt-0.5 max-w-[200px] truncate">{displaySub}</p>
//           </div>
//           <div
//             className="w-28 rounded-lg bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center shadow-lg"
//             style={{ aspectRatio: "16/9" }}
//           >
//             <span className="text-[9px] text-white/30 select-none">You</span>
//             {!call.videoEnabled && (
//               <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
//                 <VideoOff className="h-3.5 w-3.5 text-white/25" />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {showVitals && (
//         <div className="px-3 pb-2 shrink-0">
//           <InlineVitalsChart />
//         </div>
//       )}

//       <div className={cn(
//         "flex items-center justify-center gap-2.5 px-4 py-3 shrink-0",
//         "bg-gradient-to-t from-black/60 to-transparent",
//         "transition-opacity duration-300",
//         controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
//       )}>
//         <CallCtrlBtn active={call.audioEnabled} onClick={call.toggleAudio} label="Mic"
//           icon={call.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} />
//         <CallCtrlBtn active={call.videoEnabled} onClick={call.toggleVideo} label="Video"
//           icon={call.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />} />
//         <div className="relative">
//           <CallCtrlBtn
//             active={chatOpen}
//             onClick={() => { setChatOpen(v => !v); if (!chatOpen) call.clearUnread(); }}
//             label="Chat"
//             icon={<MessageSquare className="h-4 w-4" />}
//           />
//           {call.unreadCount > 0 && !chatOpen && (
//             <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none">
//               {call.unreadCount > 9 ? "9+" : call.unreadCount}
//             </span>
//           )}
//         </div>
//         <CallCtrlBtn active={showVitals} onClick={() => setShowVitals(v => !v)} label="Vitals"
//           icon={<Activity className="h-4 w-4" />} />
//         <button
//           onClick={call.endCall}
//           className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/30"
//         >
//           <PhoneOff className="h-[18px] w-[18px]" />
//         </button>
//       </div>
//     </div>
//   );

//   const chatColumn = chatOpen ? (
//     <div className="w-72 flex-shrink-0 flex flex-col bg-[#161616] border-l border-white/8 overflow-hidden">
//       <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} doctorAvatar={chatAvatar} doctorName={chatName} />
//     </div>
//   ) : null;

//   if (fullscreen) {
//     return (
//       <div className="fixed inset-0 z-[60] flex bg-[#0c0c0c]">
//         {videoArea}
//         {chatColumn}
//       </div>
//     );
//   }

//   return (
//     <div className="flex w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
//       {videoArea}
//       {chatColumn}
//     </div>
//   );
// }

// // ─── Instant-call notes sidebar ───────────────────────────────────────────────

// function InstantNotesSidebar({ onClose }: { onClose: () => void }) {
//   const call = useCallStore();
//   const textRef = useRef<HTMLTextAreaElement>(null);

//   useEffect(() => { textRef.current?.focus(); }, []);

//   const templates = ["Chief complaint", "Current medications", "Allergies", "Assessment", "Plan"];

//   const insertTemplate = (tpl: string) => {
//     const prefix = `${tpl}:\n`;
//     const next = call.callNotes ? `${call.callNotes}\n\n${prefix}` : prefix;
//     call.updateCallNotes(next);
//     setTimeout(() => {
//       if (textRef.current) {
//         textRef.current.focus();
//         textRef.current.setSelectionRange(next.length, next.length);
//       }
//     }, 0);
//   };

//   return (
//     <div className="flex flex-col h-full bg-card">
//       <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
//         <div className="flex items-center gap-2">
//           <FileText className="h-3.5 w-3.5 text-primary" />
//           <span className="text-[12px] font-semibold">Call notes</span>
//           {call.activeRequest && (
//             <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
//               — {call.activeRequest.patientName.split(" ")[0]}
//             </span>
//           )}
//         </div>
//         <button
//           onClick={onClose}
//           className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
//         >
//           <X className="h-3.5 w-3.5" />
//         </button>
//       </div>
//       <div className="px-3 py-2.5 border-b border-border/60 shrink-0">
//         <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Quick insert</p>
//         <div className="flex flex-wrap gap-1.5">
//           {templates.map((tpl) => (
//             <button
//               key={tpl}
//               onClick={() => insertTemplate(tpl)}
//               className="text-[10px] px-2 py-1 rounded-md border border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
//             >
//               {tpl}
//             </button>
//           ))}
//         </div>
//       </div>
//       <textarea
//         ref={textRef}
//         value={call.callNotes}
//         onChange={(e) => call.updateCallNotes(e.target.value)}
//         placeholder={`Type consultation notes here…\n\nNotes are auto-saved and attached to this appointment.`}
//         className="flex-1 w-full resize-none bg-transparent text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-none px-4 py-3 font-mono"
//       />
//       <div className="px-4 py-2.5 border-t border-border/60 shrink-0 flex items-center justify-between">
//         <span className="text-[9px] text-muted-foreground/50">{call.callNotes.length} chars · auto-saved</span>
//         <button onClick={() => call.updateCallNotes("")} className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors">
//           Clear
//         </button>
//       </div>
//     </div>
//   );
// }

// // ─── Incoming request card ────────────────────────────────────────────────────

// function IncomingCard({
//   req, onAccept, onDecline,
// }: { req: IncomingRequest; onAccept: () => void; onDecline: () => void }) {
//   const [wait, setWait] = useState(fmtWait(req.waitingSince));

//   useEffect(() => {
//     const t = setInterval(() => setWait(fmtWait(req.waitingSince)), 1000);
//     return () => clearInterval(t);
//   }, [req.waitingSince]);

//   return (
//     <div className={cn(
//       "rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
//       req.priority === "urgent"
//         ? "border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
//         : "border-border bg-card hover:border-border/80",
//     )}>
//       <div className="flex items-center gap-3">
//         <div className="relative shrink-0">
//           <div className={cn(
//             "h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold",
//             req.priority === "urgent"
//               ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
//               : "bg-primary/10 text-primary",
//           )}>
//             {req.patientAvatar}
//           </div>
//           {req.priority === "urgent" && (
//             <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
//               <AlertCircle className="h-2 w-2 text-white" />
//             </span>
//           )}
//         </div>
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-2">
//             <p className="text-[13px] font-semibold text-foreground">{req.patientName}</p>
//             {req.priority === "urgent" && (
//               <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/40 uppercase tracking-wide">
//                 Urgent
//               </span>
//             )}
//           </div>
//           <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{req.reason}</p>
//           <div className="flex items-center gap-1 mt-1">
//             <Clock3 className="h-3 w-3 text-muted-foreground/50" />
//             <span className="text-[10px] text-muted-foreground">Waiting {wait}</span>
//           </div>
//         </div>
//         <div className="flex items-center gap-2 shrink-0">
//           <button
//             onClick={onDecline}
//             title="Decline"
//             className="h-9 w-9 rounded-full border border-border bg-background hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950/30 text-muted-foreground flex items-center justify-center transition-all duration-200"
//           >
//             <PhoneOff className="h-4 w-4" />
//           </button>
//           <button
//             onClick={onAccept}
//             title="Accept"
//             className={cn(
//               "h-9 px-4 rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 shadow-md active:scale-95",
//               req.priority === "urgent"
//                 ? "bg-red-500 hover:bg-red-400 shadow-red-500/25"
//                 : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25",
//             )}
//           >
//             <Phone className="h-3.5 w-3.5" />
//             Accept
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Running Late Modal ───────────────────────────────────────────────────────

// interface RunningLateModalProps {
//   appt: Appointment;
//   onClose: () => void;
// }

// function RunningLateModal({ appt, onClose }: RunningLateModalProps) {
//   const [delay, setDelay] = useState<number>(15);
//   const runningLate = useRunningLate();

//   const handleSubmit = () => {
//     runningLate.mutate(
//       { id: appt.id, delay_minutes: delay },
//       {
//         onSuccess: (res) => {
//           if (res.next_appointment) {
//             toast.success(
//               `Patients notified of ${res.delay_minutes}min delay. Next: ${res.next_appointment.patient.name} at ${fmtTime(res.next_appointment.appointment_time)}`
//             );
//           } else {
//             toast.success(`Patients notified of ${res.delay_minutes}min delay.`);
//           }
//           onClose();
//         },
//         onError: (err: unknown) => {
//           toast.error(getErrMsg(err, "Failed to notify patients"));
//         },
//       }
//     );
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//       <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
//       <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 z-10">
//         <div className="flex items-start gap-3 mb-4">
//           <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center justify-center shrink-0">
//             <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
//           </div>
//           <div>
//             <h3 className="text-[13px] font-semibold text-foreground">Running Late</h3>
//             <p className="text-[11px] text-muted-foreground mt-0.5">
//               Notify {appt.patient?.name ?? "the patient"} and upcoming patients of a delay.
//             </p>
//           </div>
//           <button onClick={onClose} className="ml-auto h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
//             <X className="h-3.5 w-3.5" />
//           </button>
//         </div>

//         <div className="mb-4">
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2.5">
//             Delay duration
//           </p>
//           <div className="flex flex-wrap gap-1.5">
//             {DELAY_OPTIONS.map((d) => (
//               <button
//                 key={d}
//                 onClick={() => setDelay(d)}
//                 className={cn(
//                   "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all duration-150",
//                   delay === d
//                     ? "bg-amber-500 text-white border-amber-500 shadow-sm"
//                     : "border-border/60 text-muted-foreground hover:border-amber-400/50 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
//                 )}
//               >
//                 {d}m
//               </button>
//             ))}
//           </div>
//         </div>

//         <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 mb-4">
//           <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
//           <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
//             All confirmed patients scheduled after this appointment will be notified of the <strong>{delay} minute</strong> delay.
//           </p>
//         </div>

//         <div className="flex items-center gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={onClose}
//             className="flex-1 h-8 text-[11px] font-medium"
//           >
//             Cancel
//           </Button>
//           <Button
//             size="sm"
//             onClick={handleSubmit}
//             disabled={runningLate.isPending}
//             className="flex-1 h-8 text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-white border-0"
//           >
//             {runningLate.isPending ? (
//               <><Loader2 className="h-3 w-3 animate-spin mr-1" />Notifying…</>
//             ) : (
//               `Notify — ${delay}m delay`
//             )}
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Detail row helper ────────────────────────────────────────────────────────

// function DetailRow({
//   label, value, icon, className,
// }: { label: string; value: React.ReactNode; icon?: React.ReactNode; className?: string }) {
//   return (
//     <div className={cn("flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-b-0", className)}>
//       <div className="flex items-center gap-1.5 shrink-0">
//         {icon && <span className="text-muted-foreground/50">{icon}</span>}
//         <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
//       </div>
//       <span className="text-[11px] font-medium text-foreground text-right">{value}</span>
//     </div>
//   );
// }

// // ─── Appointment Detail Drawer ────────────────────────────────────────────────

// interface AppointmentDetailDrawerProps {
//   appt: Appointment;
//   onClose: () => void;
//   onStart: (appt: Appointment) => void;
//   onRunningLate: (appt: Appointment) => void;
//   onReadyNext: (appt: Appointment) => void;
//   isReadyNextPending: boolean;
// }

// function AppointmentDetailDrawer({
//   appt, onClose, onStart, onRunningLate, onReadyNext, isReadyNextPending,
// }: AppointmentDetailDrawerProps) {
//   const status = appt.status as UIStatus;
//   const canStart    = status === "confirmed" || status === "pending";
//   const isInProgress = status === "in_progress";

//   // Extra fields from the full API response
//   const raw = appt as Appointment & {
//     duration_minutes?: string;
//     consultation_fee?: string;
//     patient_pays?: string;
//     insurance_covered?: string;
//     currency?: string;
//     payment_status?: string;
//     payment_method?: string;
//     payment_reference?: string;
//     paid_at?: string;
//     daily_room_name?: string;
//     daily_room_url?: string;
//     session_started_at?: string;
//     session_ended_at?: string;
//     is_running_late?: boolean;
//     estimated_delay_minutes?: string;
//     completed_at?: string;
//     cancellation_reason?: string;
//     cancelled_at?: string;
//   };

//   const formatPaymentMethod = (m?: string) => {
//     if (!m) return "—";
//     return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
//   };

//   return (
//     <div className="fixed inset-0 z-40 flex justify-end">
//       <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
//       <div
//         className={cn(
//           "relative flex flex-col bg-card border-l border-border shadow-2xl",
//           "w-full max-w-md h-full overflow-hidden",
//           "animate-in slide-in-from-right duration-300",
//         )}
//       >
//         {/* Header */}
//         <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 bg-card shrink-0">
//           <div className="h-9 w-9 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[11px] flex-shrink-0 border border-primary/10">
//             {appt.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-[13px] font-semibold text-foreground truncate">{apptLabel(appt)}</p>
//             <div className="flex items-center gap-2 mt-0.5">
//               <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium border", STATUS_STYLES[status])}>
//                 <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[status])} />
//                 {statusLabel(status)}
//               </Badge>
//               <span className="text-[10px] text-muted-foreground">#{appt.id}</span>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
//           >
//             <X className="h-4 w-4" />
//           </button>
//         </div>

//         {/* Scrollable content */}
//         <div className="flex-1 overflow-y-auto">
//           {/* Action bar */}
//           <div className="px-4 py-3 border-b border-border/40 bg-secondary/20 flex items-center gap-2 flex-wrap">
//             {canStart && (
//               <Button
//                 size="sm"
//                 onClick={() => { onStart(appt); onClose(); }}
//                 className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm flex items-center gap-1.5"
//               >
//                 <Video className="h-3 w-3" />
//                 Start session
//               </Button>
//             )}
//             {isInProgress && (
//               <>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   onClick={() => onRunningLate(appt)}
//                   className="h-7 px-3 text-[10px] font-medium rounded-sm border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
//                 >
//                   <Timer className="h-3 w-3" />
//                   Running late
//                 </Button>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   onClick={() => onReadyNext(appt)}
//                   disabled={isReadyNextPending}
//                   className="h-7 px-3 text-[10px] font-medium rounded-sm border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1.5"
//                 >
//                   {isReadyNextPending
//                     ? <Loader2 className="h-3 w-3 animate-spin" />
//                     : <CheckCheck className="h-3 w-3" />}
//                   Ready for next
//                 </Button>
//               </>
//             )}
//           </div>

//           {/* Appointment info */}
//           <div className="px-4 pt-4 pb-2">
//             <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
//               <Calendar className="h-3 w-3" />Appointment
//             </p>
//             <div className="bg-background rounded-lg border border-border/50 px-3 py-1">
//               <DetailRow
//                 label="Date"
//                 value={fmtDate(appt.appointment_date)}
//                 icon={<Calendar className="h-3 w-3" />}
//               />
//               <DetailRow
//                 label="Time"
//                 value={fmtTime(appt.appointment_time)}
//                 icon={<Clock className="h-3 w-3" />}
//               />
//               {raw.duration_minutes && (
//                 <DetailRow
//                   label="Duration"
//                   value={`${raw.duration_minutes} min`}
//                   icon={<Timer className="h-3 w-3" />}
//                 />
//               )}
//               <DetailRow
//                 label="Type"
//                 value={
//                   <span className="inline-flex items-center gap-1">
//                     {appt.type === "online"
//                       ? <><Video className="h-3 w-3 text-sky-500" />Video consult</>
//                       : <><MapPin className="h-3 w-3 text-amber-500" />In-person</>}
//                   </span>
//                 }
//               />
//               <DetailRow
//                 label="Booking type"
//                 value={<span className="capitalize">{appt.booking_type}</span>}
//               />
//               {raw.is_running_late && (
//                 <DetailRow
//                   label="Running late"
//                   value={
//                     <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
//                       <AlertTriangle className="h-3 w-3" />
//                       {raw.estimated_delay_minutes ?? 0}min delay
//                     </span>
//                   }
//                 />
//               )}
//             </div>
//           </div>

//           {/* Patient info */}
//           <div className="px-4 py-2">
//             <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
//               <UserCheck className="h-3 w-3" />Patient
//             </p>
//             <div className="bg-background rounded-lg border border-border/50 px-3 py-1">
//               <DetailRow label="Name" value={appt.patient?.name ?? "—"} />
//               <DetailRow label="Email" value={appt.patient?.email ?? "—"} />
//               <DetailRow label="Phone" value={appt.patient?.phone ?? "—"} />
//             </div>
//           </div>

//           {/* Hospital */}
//           {appt.hospital && (
//             <div className="px-4 py-2">
//               <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
//                 <Building2 className="h-3 w-3" />Hospital
//               </p>
//               <div className="bg-background rounded-lg border border-border/50 px-3 py-1">
//                 <DetailRow label="Name" value={appt.hospital.name} />
//                 {appt.hospital.address && (
//                   <DetailRow label="Address" value={appt.hospital.address} />
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Insurance */}
//           {appt.insurance && (
//             <div className="px-4 py-2">
//               <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
//                 <Shield className="h-3 w-3" />Insurance
//               </p>
//               <div className="bg-background rounded-lg border border-border/50 px-3 py-1">
//                 <DetailRow label="Provider" value={
//                   <span className="flex items-center gap-1.5">
//                     {(appt.insurance as Appointment["insurance"] & { logo?: string })?.logo && (
//                       <img
//                         src={(appt.insurance as Appointment["insurance"] & { logo?: string }).logo}
//                         alt=""
//                         className="h-4 w-4 rounded object-contain"
//                       />
//                     )}
//                     {(appt.insurance as Appointment["insurance"] & { name?: string })?.name ?? appt.insurance.provider ?? "—"}
//                   </span>
//                 } />
//                 {appt.insurance.policy_number && (
//                   <DetailRow label="Policy #" value={appt.insurance.policy_number} />
//                 )}
//                 {(appt.insurance as Appointment["insurance"] & { coverage_percentage?: string })?.coverage_percentage && (
//                   <DetailRow
//                     label="Coverage"
//                     value={`${(appt.insurance as Appointment["insurance"] & { coverage_percentage?: string }).coverage_percentage}%`}
//                   />
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Payment */}
//           {(raw.consultation_fee !== undefined || raw.payment_status) && (
//             <div className="px-4 py-2">
//               <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
//                 <CreditCard className="h-3 w-3" />Payment
//               </p>
//               <div className="bg-background rounded-lg border border-border/50 px-3 py-1">
//                 {raw.consultation_fee !== undefined && (
//                   <DetailRow
//                     label="Consultation fee"
//                     value={`${raw.consultation_fee} ${raw.currency ?? ""}`}
//                   />
//                 )}
//                 {raw.insurance_covered !== undefined && (
//                   <DetailRow
//                     label="Insurance covered"
//                     value={`${raw.insurance_covered} ${raw.currency ?? ""}`}
//                   />
//                 )}
//                 {raw.patient_pays !== undefined && (
//                   <DetailRow
//                     label="Patient pays"
//                     value={
//                       <span className="font-semibold text-foreground">
//                         {raw.patient_pays} {raw.currency ?? ""}
//                       </span>
//                     }
//                   />
//                 )}
//                 {raw.payment_status && (
//                   <DetailRow
//                     label="Payment status"
//                     value={
//                       <span className={cn(
//                         "inline-flex items-center gap-1 capitalize",
//                         raw.payment_status === "paid" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
//                       )}>
//                         {raw.payment_status === "paid" && <CheckCircle2 className="h-3 w-3" />}
//                         {raw.payment_status}
//                       </span>
//                     }
//                   />
//                 )}
//                 {raw.payment_method && (
//                   <DetailRow label="Method" value={formatPaymentMethod(raw.payment_method)} />
//                 )}
//                 {raw.payment_reference && (
//                   <DetailRow
//                     label="Reference"
//                     value={<span className="font-mono text-[10px]">{raw.payment_reference}</span>}
//                   />
//                 )}
//                 {raw.paid_at && (
//                   <DetailRow label="Paid at" value={fmtDateTime(raw.paid_at)} />
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Session */}
//           {(raw.session_started_at || raw.daily_room_name) && (
//             <div className="px-4 py-2">
//               <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
//                 <Video className="h-3 w-3" />Session
//               </p>
//               <div className="bg-background rounded-lg border border-border/50 px-3 py-1">
//                 {raw.daily_room_name && (
//                   <DetailRow
//                     label="Room"
//                     value={<span className="font-mono text-[10px] truncate max-w-[200px]">{raw.daily_room_name}</span>}
//                   />
//                 )}
//                 {raw.session_started_at && (
//                   <DetailRow
//                     label="Started"
//                     value={
//                       <span>
//                         {fmtDateTime(raw.session_started_at)}
//                         <span className="text-muted-foreground ml-1 text-[9px]">({fmtRelative(raw.session_started_at)})</span>
//                       </span>
//                     }
//                   />
//                 )}
//                 {raw.session_ended_at && (
//                   <DetailRow label="Ended" value={fmtDateTime(raw.session_ended_at)} />
//                 )}
//                 {raw.completed_at && (
//                   <DetailRow label="Completed" value={fmtDateTime(raw.completed_at)} />
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Notes */}
//           {appt.notes && (
//             <div className="px-4 py-2">
//               <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2 flex items-center gap-1.5">
//                 <FileText className="h-3 w-3" />Clinical notes
//               </p>
//               <div className="bg-background rounded-lg border border-border/50 px-3 py-1">
//                 {appt.notes.chief_complaint && (
//                   <DetailRow label="Chief complaint" value={appt.notes.chief_complaint} />
//                 )}
//                 {appt.notes.diagnosis && (
//                   <DetailRow label="Diagnosis" value={appt.notes.diagnosis} />
//                 )}
//                 {appt.notes.treatment_plan && (
//                   <DetailRow label="Treatment plan" value={appt.notes.treatment_plan} />
//                 )}
//                 {appt.notes.blood_pressure && (
//                   <DetailRow label="Blood pressure" value={appt.notes.blood_pressure} />
//                 )}
//                 {appt.notes.temperature && (
//                   <DetailRow label="Temperature" value={appt.notes.temperature} />
//                 )}
//                 {appt.notes.pulse_rate && (
//                   <DetailRow label="Pulse rate" value={appt.notes.pulse_rate} />
//                 )}
//                 {appt.notes.follow_up_date && (
//                   <DetailRow label="Follow-up" value={fmtDate(appt.notes.follow_up_date)} />
//                 )}
//               </div>
//             </div>
//           )}

//           {/* Created at */}
//           <div className="px-4 pt-2 pb-4">
//             <p className="text-[10px] text-muted-foreground/50 text-center">
//               Created {fmtRelative((appt as Appointment & { created_at?: string }).created_at)}
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Appointment card (card view) ─────────────────────────────────────────────

// function AppointmentCard({
//   appt, onStart, onView, hasNotes,
// }: {
//   appt: Appointment;
//   onStart: (appt: Appointment) => void;
//   onView: (appt: Appointment) => void;
//   hasNotes: boolean;
// }) {
//   const status = appt.status as UIStatus;
//   const canStart = status === "confirmed" || status === "pending";

//   return (
//     <div className="bg-card border border-border/70 rounded-sm p-3.5 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
//       <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
//         {appt.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
//       </div>
//       <div className="flex-1 min-w-0">
//         <div className="flex items-center gap-2 flex-wrap">
//           <span className="text-[11px] font-semibold text-foreground">{apptLabel(appt)}</span>
//           <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium border", STATUS_STYLES[status])}>
//             <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[status])} />
//             {statusLabel(status)}
//           </Badge>
//           {hasNotes && (
//             <span className="text-[9px] text-emerald-600 dark:text-emerald-500 flex items-center gap-0.5">
//               <FileText className="h-2.5 w-2.5" />notes
//             </span>
//           )}
//         </div>
//         <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-1">
//           {appt.type === "online"
//             ? <Video className="h-3 w-3 text-sky-500" />
//             : <MapPin className="h-3 w-3 text-amber-500" />}
//           {appt.type === "online" ? "Video consult" : "In-person"}
//         </span>
//       </div>
//       <div className="flex items-center gap-3 flex-shrink-0">
//         <div className="text-right hidden sm:block">
//           <p className="text-[11px] font-medium text-foreground flex items-center justify-end gap-1">
//             <Calendar className="h-3 w-3 text-muted-foreground/50" />{fmtDate(appt.appointment_date)}
//           </p>
//           <p className="text-[10px] text-muted-foreground/70 flex items-center justify-end gap-1 mt-0.5">
//             <Clock className="h-3 w-3" />{fmtTime(appt.appointment_time)}
//           </p>
//         </div>
//         <button
//           onClick={() => onView(appt)}
//           className="h-7 w-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors"
//           title="View details"
//         >
//           <Eye className="h-3.5 w-3.5" />
//         </button>
//         <Button
//           size="sm"
//           variant={canStart ? "default" : "ghost"}
//           className={cn(
//             "h-7 px-3 text-[10px] font-semibold rounded-sm transition-all duration-200",
//             canStart
//               ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
//               : "text-muted-foreground hover:text-foreground hover:bg-secondary",
//           )}
//           onClick={() => canStart && onStart(appt)}
//         >
//           {canStart ? "Start" : "Notes"}
//         </Button>
//       </div>
//     </div>
//   );
// }

// // ─── Skeleton row ─────────────────────────────────────────────────────────────

// function SkeletonRow() {
//   return (
//     <tr className="border-t border-border/40 animate-pulse">
//       <td className="px-4 py-3">
//         <div className="flex items-center gap-3">
//           <div className="h-9 w-9 rounded-sm bg-muted" />
//           <div className="space-y-1.5">
//             <div className="h-3 w-24 rounded bg-muted" />
//             <div className="h-2.5 w-16 rounded bg-muted/60" />
//           </div>
//         </div>
//       </td>
//       <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-muted" /></td>
//       <td className="px-4 py-3"><div className="h-3 w-16 rounded bg-muted" /></td>
//       <td className="px-4 py-3"><div className="h-5 w-20 rounded bg-muted" /></td>
//       <td className="px-4 py-3 text-right"><div className="h-7 w-16 rounded bg-muted ml-auto" /></td>
//     </tr>
//   );
// }

// // ─── Scheduled call view ──────────────────────────────────────────────────────

// function ScheduledCallView({ onExit }: { onExit: () => void }) {
//   const call = useCallStore();
//   const [notesOpen, setNotesOpen] = useState(true);
//   const appt = call.activeAppointment;

//   useEffect(() => {
//     if (call.phase === "ended") {
//       const t = setTimeout(onExit, 1800);
//       return () => clearTimeout(t);
//     }
//   }, [call.phase, onExit]);

//   if (!appt) return null;

//   return (
//     <div className="flex flex-1 min-h-0 overflow-hidden">
//       <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
//         <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/50 shrink-0">
//           <div className="flex items-center gap-2 flex-1 min-w-0">
//             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
//             <span className="text-[12px] font-semibold text-foreground shrink-0">{appt.patientLabel}</span>
//             <span className="text-[11px] text-muted-foreground truncate">
//               — {appt.specialty} · {fmtDate(appt.date)} {fmtTime(appt.time)}
//             </span>
//           </div>
//           <div className="flex items-center gap-2 shrink-0">
//             <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{fmt(call.elapsed)}</span>
//             <button
//               onClick={() => setNotesOpen(v => !v)}
//               className={cn(
//                 "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors",
//                 notesOpen
//                   ? "bg-primary/10 text-primary border-primary/20"
//                   : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
//               )}
//             >
//               <FileText className="h-3.5 w-3.5" />
//               {notesOpen ? "Hide notes" : "Notes"}
//             </button>
//             <button
//               onClick={onExit}
//               className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//             >
//               <X className="h-3.5 w-3.5" />
//               Back
//             </button>
//           </div>
//         </div>
//         <div className="flex-1 min-h-0 p-4">
//           <ActiveCallPanel />
//         </div>
//       </div>
//       {notesOpen && (
//         <div className="w-80 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
//           <AppointmentNotesPanel appt={appt} onClose={() => setNotesOpen(false)} />
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Tab 1: Appointments ──────────────────────────────────────────────────────

// function AppointmentsTab() {
//   const { t } = useTranslation();
//   const call = useCallStore();

//   const [filters,             setFilters]             = useState<FilterState>(INITIAL_FILTERS);
//   const [view,                setView]                = useState<ViewMode>("table");
//   const [filterOpen,          setFilterOpen]          = useState(false);
//   const [scheduledCallActive, setScheduledCallActive] = useState(false);
//   const [detailAppt,          setDetailAppt]          = useState<Appointment | null>(null);
//   const [runningLateAppt,     setRunningLateAppt]     = useState<Appointment | null>(null);

//   const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
//     setFilters((prev) => ({ ...prev, [key]: value }));
//   }, []);

//   const clearAllFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

//   const hasActiveFilters = useMemo(
//     () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS), [filters]);

//   useEffect(() => {
//     if (filterOpen) document.body.style.overflow = "hidden";
//     else document.body.style.overflow = "";
//     return () => { document.body.style.overflow = ""; };
//   }, [filterOpen]);

//   useEffect(() => {
//     if (call.phase === "idle" && scheduledCallActive) setScheduledCallActive(false);
//   }, [call.phase, scheduledCallActive]);

//   // ── API hooks ────────────────────────────────────────────────────────────
//   const queryParams = useMemo(() => filtersToParams(filters), [filters]);
//   const { data, isLoading, isError, error } = useGetAppointments(queryParams);

//   const joinSession  = useJoinSession();
//   const acceptQuick  = useAcceptQuick();
//   const readyNext    = useReadyNext();

//   const appointments: Appointment[] = data?.data ?? [];

//   const filtered = useMemo(() => {
//     const q = filters.search.toLowerCase().trim();
//     return appointments
//       .filter((a) => {
//         if (!q) return true;
//         return (
//           a.patient?.name?.toLowerCase().includes(q) ||
//           a.appointment_date.includes(q)
//         );
//       })
//       .sort((a, b) => {
//         if (filters.sort === "date-desc") {
//           return `${b.appointment_date}${b.appointment_time}`.localeCompare(
//             `${a.appointment_date}${a.appointment_time}`);
//         }
//         if (filters.sort === "name") {
//           return (a.patient?.name ?? "").localeCompare(b.patient?.name ?? "");
//         }
//         return `${a.appointment_date}${a.appointment_time}`.localeCompare(
//           `${b.appointment_date}${b.appointment_time}`);
//       });
//   }, [appointments, filters.search, filters.sort]);

//   const pendingCount    = filtered.filter((a) => a.status === "pending").length;
//   const confirmedCount  = filtered.filter((a) => a.status === "confirmed").length;
//   const inProgressCount = filtered.filter((a) => a.status === "in_progress").length;
//   const completedCount  = filtered.filter((a) => a.status === "completed").length;

//   const handleStart = useCallback((appt: Appointment) => {
//     const apptCtx: AppointmentContext = {
//       id:           String(appt.id), // ← fix: id is string in AppointmentContext
//       patientLabel: appt.patient?.name ?? "Patient",
//       specialty:    apptSpecialty(appt),
//       date:         appt.appointment_date,
//       time:         appt.appointment_time,
//       type:         appt.type === "online" ? "video" : "in-person",
//     };

//     if (appt.booking_type === "quick" && appt.status === "pending") {
//       acceptQuick.mutate(appt.id, {
//         onSuccess: () => {
//           call.startScheduledCall(apptCtx, MOCK_DOCTOR);
//           setScheduledCallActive(true);
//         },
//         onError: (err: unknown) => {
//           toast.error(getErrMsg(err, "Failed to accept appointment"));
//         },
//       });
//     } else {
//       joinSession.mutate(appt.id, {
//         onSuccess: (res) => {
//           call.startScheduledCall(apptCtx, MOCK_DOCTOR);
//           setScheduledCallActive(true);
//           if (res.join_url) {
//             console.info("Daily.co join URL:", res.join_url);
//           }
//         },
//         onError: (err: unknown) => {
//           toast.error(getErrMsg(err, "Failed to join session"));
//         },
//       });
//     }
//   }, [call, acceptQuick, joinSession]);

//   const handleReadyNext = useCallback((appt: Appointment) => {
//     readyNext.mutate(appt.id, {
//       onSuccess: (res) => {
//         if (res.next_appointment) {
//           toast.success(
//             `${res.next_appointment.patient.name} notified — they can join now.`
//           );
//         } else {
//           toast.success(res.message ?? "Next patient notified.");
//         }
//       },
//       onError: (err: unknown) => {
//         toast.error(getErrMsg(err, "No next appointment found."));
//       },
//     });
//   }, [readyNext]);

//   const handleExit = useCallback(() => {
//     call.endCall();
//     setScheduledCallActive(false);
//   }, [call]);

//   if (scheduledCallActive && call.role === "doctor" &&
//       (call.phase === "connected" || call.phase === "ended")) {
//     return <ScheduledCallView onExit={handleExit} />;
//   }

//   // ── Filter sidebar ───────────────────────────────────────────────────────

//   const sidebarContent = (
//     <>
//       <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
//         <div className="flex items-center gap-2">
//           <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
//             <SlidersHorizontal className="w-3 h-3 text-primary" />
//           </div>
//           <span className="text-[11px] font-semibold text-foreground">Filters</span>
//         </div>
//         {hasActiveFilters && (
//           <button onClick={clearAllFilters} className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
//             <X className="w-3 h-3" />Reset all
//           </button>
//         )}
//       </div>
//       <div className="px-3.5">
//         <FilterSection title="Status">
//           <PillGroup<AppointmentApiStatus | "All">
//             value={filters.status}
//             onChange={(v) => set("status", v)}
//             options={[
//               { value: "All",         label: "All statuses" },
//               { value: "pending",     label: "Pending"      },
//               { value: "confirmed",   label: "Confirmed"    },
//               { value: "in_progress", label: "In progress"  },
//               { value: "completed",   label: "Completed"    },
//             ]}
//           />
//         </FilterSection>

//         <FilterSection title="Type">
//           <PillGroup<AppointmentApiType | "All">
//             value={filters.type}
//             onChange={(v) => set("type", v)}
//             options={[
//               { value: "All",        label: "All types"       },
//               { value: "online",     label: "Video consult"   },
//               { value: "in_person",  label: "In-person visit" },
//             ]}
//           />
//         </FilterSection>

//         <FilterSection title="When">
//           <div className="flex flex-col gap-1 mb-2">
//             {[
//               { label: "All dates",  today: false, upcoming: false },
//               { label: "Today",      today: true,  upcoming: false },
//               { label: "Upcoming",   today: false, upcoming: true  },
//             ].map((opt) => {
//               const active = filters.today === opt.today && filters.upcoming === opt.upcoming && !filters.date;
//               return (
//                 <button
//                   key={opt.label}
//                   onClick={() => {
//                     setFilters((f) => ({ ...f, today: opt.today, upcoming: opt.upcoming, date: "" }));
//                   }}
//                   className={cn(
//                     "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left",
//                     active
//                       ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
//                       : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
//                   )}
//                 >
//                   {opt.label}
//                 </button>
//               );
//             })}
//           </div>

//           <div>
//             <p className="text-[9px] text-muted-foreground/70 mb-1 font-medium">Specific date</p>
//             <input
//               type="date"
//               value={filters.date}
//               onChange={(e) => {
//                 const d = e.target.value;
//                 setFilters((f) => ({ ...f, date: d, today: false, upcoming: false }));
//               }}
//               className="w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
//             />
//             {filters.date && (
//               <button
//                 onClick={() => set("date", "")}
//                 className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors mt-1"
//               >
//                 Clear date
//               </button>
//             )}
//           </div>
//         </FilterSection>

//         <FilterSection title="Sort">
//           <PillGroup<SortOption>
//             value={filters.sort}
//             onChange={(v) => set("sort", v)}
//             options={SORT_OPTIONS}
//           />
//         </FilterSection>
//       </div>
//     </>
//   );

//   return (
//     <div className="flex flex-1 min-h-0 overflow-hidden">
//       {/* Detail drawer */}
//       {detailAppt && (
//         <AppointmentDetailDrawer
//           appt={detailAppt}
//           onClose={() => setDetailAppt(null)}
//           onStart={(a) => { handleStart(a); setDetailAppt(null); }}
//           onRunningLate={(a) => { setRunningLateAppt(a); setDetailAppt(null); }}
//           onReadyNext={(a) => { handleReadyNext(a); }}
//           isReadyNextPending={readyNext.isPending}
//         />
//       )}

//       {/* Running late modal */}
//       {runningLateAppt && (
//         <RunningLateModal
//           appt={runningLateAppt}
//           onClose={() => setRunningLateAppt(null)}
//         />
//       )}

//       {/* Desktop sidebar */}
//       <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 h-full overflow-y-auto">
//         {sidebarContent}
//       </aside>

//       {/* Mobile backdrop */}
//       <div
//         onClick={() => setFilterOpen(false)}
//         className={cn(
//           "fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 backdrop-blur-sm",
//           filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
//         )}
//       />

//       {/* Mobile bottom drawer */}
//       <div className={cn(
//         "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-lg border-t border-border/60",
//         "max-h-[85dvh] flex flex-col overflow-hidden transition-transform duration-300 ease-out shadow-2xl",
//         filterOpen ? "translate-y-0" : "translate-y-full",
//       )}>
//         <div className="flex justify-center pt-3 pb-1.5 shrink-0">
//           <div className="w-10 h-1 rounded-full bg-border" />
//         </div>
//         <div className="overflow-y-auto flex-1">{sidebarContent}</div>
//         <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card">
//           <button
//             onClick={() => setFilterOpen(false)}
//             className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all duration-200"
//           >
//             Show {filtered.length} {filtered.length === 1 ? "appointment" : "appointments"}
//           </button>
//         </div>
//       </div>

//       {/* Main content */}
//       <main className="flex-1 overflow-y-auto">
//         {/* Toolbar */}
//         <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
//           <div className="flex items-center gap-3">
//             <p className="text-[11px] text-muted-foreground">
//               {isLoading ? (
//                 <span className="flex items-center gap-1.5">
//                   <Loader2 className="h-3 w-3 animate-spin" />Loading…
//                 </span>
//               ) : (
//                 <>
//                   <span className="font-bold text-foreground">{data?.total ?? filtered.length}</span>{" "}
//                   {(data?.total ?? filtered.length) === 1 ? "appointment" : "appointments"}
//                   {hasActiveFilters && (
//                     <button onClick={clearAllFilters} className="ml-2 text-primary hover:underline text-[10px] font-medium">
//                       Reset filters
//                     </button>
//                   )}
//                 </>
//               )}
//             </p>

//             <div className="hidden lg:flex items-center gap-2">
//               {pendingCount    > 0 && (
//                 <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
//                   <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{pendingCount} pending
//                 </span>
//               )}
//               {confirmedCount  > 0 && (
//                 <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
//                   <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />{confirmedCount} confirmed
//                 </span>
//               )}
//               {inProgressCount > 0 && (
//                 <span className="flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200 dark:border-violet-900 px-2 py-0.5 rounded-sm">
//                   <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />{inProgressCount} active
//                 </span>
//               )}
//               {completedCount  > 0 && (
//                 <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
//                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{completedCount} done
//                 </span>
//               )}
//             </div>
//           </div>

//           <div className="flex items-center gap-2">
//             {/* Search */}
//             <div className="hidden sm:flex relative">
//               <input
//                 type="text"
//                 placeholder="Search patient…"
//                 value={filters.search}
//                 onChange={(e) => set("search", e.target.value)}
//                 className="h-7 pl-2.5 pr-7 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all w-36 focus:w-48"
//               />
//               {filters.search && (
//                 <button
//                   onClick={() => set("search", "")}
//                   className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
//                 >
//                   <X className="h-3 w-3" />
//                 </button>
//               )}
//             </div>

//             <button
//               onClick={() => setFilterOpen(true)}
//               className={cn(
//                 "md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-all duration-200 font-medium",
//                 hasActiveFilters
//                   ? "bg-primary text-primary-foreground border-primary"
//                   : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
//               )}
//             >
//               <SlidersHorizontal className="w-3 h-3" />Filters
//             </button>
//             <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
//               <button
//                 onClick={() => setView("table")}
//                 aria-label="Table view"
//                 className={cn("px-2.5 py-1.5 transition-all duration-200",
//                   view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
//               >
//                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//                   <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
//                 </svg>
//               </button>
//               <button
//                 onClick={() => setView("cards")}
//                 aria-label="Card view"
//                 className={cn("px-2.5 py-1.5 border-l border-border/60 transition-all duration-200",
//                   view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
//               >
//                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//                   <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
//                 </svg>
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Content area */}
//         <div className="p-4">
//           {isError ? (
//             <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
//               <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
//                 <AlertCircle className="w-6 h-6 text-red-500" />
//               </div>
//               <div>
//                 <p className="text-[12px] font-semibold text-foreground">Failed to load appointments</p>
//                 <p className="text-[11px] text-muted-foreground/70 mt-1">
//                   {getErrMsg(error, "Something went wrong")}
//                 </p>
//               </div>
//             </div>
//           ) : !isLoading && filtered.length === 0 ? (
//             <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
//               <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
//                 <Calendar className="w-6 h-6 text-muted-foreground/50" />
//               </div>
//               <div>
//                 <p className="text-[12px] font-semibold text-foreground">No appointments match your filters</p>
//                 <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
//               </div>
//               <button onClick={clearAllFilters} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
//                 Clear all filters
//               </button>
//             </div>
//           ) : view === "table" ? (
//             <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
//               <table className="w-full text-[11px]">
//                 <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
//                   <tr>
//                     <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_patient")}</th>
//                     <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_when")}</th>
//                     <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_type")}</th>
//                     <th className="text-left px-4 py-3 font-semibold">{t("pages.doctor.th_status")}</th>
//                     <th className="px-4 py-3" />
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {isLoading
//                     ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
//                     : filtered.map((a) => {
//                         const status = a.status as UIStatus;
//                         const hasNotes = !!a.notes;
//                         const canStart = status === "confirmed" || status === "pending";
//                         const isInProgress = status === "in_progress";
//                         return (
//                           <tr key={a.id} className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
//                             <td className="px-4 py-3">
//                               <div className="flex items-center gap-3">
//                                 <div className="h-9 w-9 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
//                                   {a.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
//                                 </div>
//                                 <div>
//                                   <p className="font-semibold text-[12px] text-foreground">{apptLabel(a)}</p>
//                                   <p className="text-[10px] text-muted-foreground/70 capitalize">{a.booking_type}</p>
//                                 </div>
//                               </div>
//                             </td>
//                             <td className="px-4 py-3 whitespace-nowrap">
//                               <div className="flex flex-col gap-0.5">
//                                 <span className="flex items-center gap-1 font-medium text-foreground">
//                                   <Calendar className="h-3 w-3 text-muted-foreground/40" />
//                                   {fmtDate(a.appointment_date)}
//                                 </span>
//                                 <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
//                                   <Clock className="h-3 w-3 text-muted-foreground/40" />
//                                   {fmtTime(a.appointment_time)}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="px-4 py-3">
//                               <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
//                                 {a.type === "online"
//                                   ? <Video className="h-3.5 w-3.5 text-sky-500" />
//                                   : <MapPin className="h-3.5 w-3.5 text-amber-500" />}
//                                 <span>{a.type === "online" ? "Video" : "In-person"}</span>
//                               </span>
//                             </td>
//                             <td className="px-4 py-3">
//                               <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", STATUS_STYLES[status])}>
//                                 <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[status])} />
//                                 {statusLabel(status)}
//                               </Badge>
//                             </td>
//                             <td className="px-4 py-3 text-right">
//                               <div className="flex items-center justify-end gap-1.5">
//                                 {hasNotes && (
//                                   <span className="text-[9px] text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
//                                     <FileText className="h-3 w-3" />Has notes
//                                   </span>
//                                 )}

//                                 {/* View details */}
//                                 <button
//                                   onClick={() => setDetailAppt(a)}
//                                   className="h-7 px-2 rounded-sm border border-border/60 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors flex items-center gap-1"
//                                   title="View details"
//                                 >
//                                   <Eye className="h-3 w-3" />
//                                   <span className="hidden xl:inline">Details</span>
//                                 </button>

//                                 {/* Running late — only for in_progress */}
//                                 {isInProgress && (
//                                   <button
//                                     onClick={() => setRunningLateAppt(a)}
//                                     className="h-7 px-2 rounded-sm border border-amber-200 dark:border-amber-900 text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors flex items-center gap-1"
//                                     title="Running late"
//                                   >
//                                     <Timer className="h-3 w-3" />
//                                     <span className="hidden xl:inline">Late</span>
//                                   </button>
//                                 )}

//                                 {/* Ready for next — only for in_progress */}
//                                 {isInProgress && (
//                                   <button
//                                     onClick={() => handleReadyNext(a)}
//                                     disabled={readyNext.isPending}
//                                     className="h-7 px-2 rounded-sm border border-emerald-200 dark:border-emerald-900 text-[10px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-1 disabled:opacity-50"
//                                     title="Ready for next patient"
//                                   >
//                                     {readyNext.isPending
//                                       ? <Loader2 className="h-3 w-3 animate-spin" />
//                                       : <ChevronRight className="h-3 w-3" />}
//                                     <span className="hidden xl:inline">Ready</span>
//                                   </button>
//                                 )}

                                
//                                   <Button
//                                     size="sm"
//                                     onClick={() => handleStart(a)}
//                                     disabled={acceptQuick.isPending || joinSession.isPending}
//                                     className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm"
//                                   >
//                                     {(acceptQuick.isPending || joinSession.isPending)
//                                       ? <Loader2 className="h-3 w-3 animate-spin" />
//                                       : t("pages.doctor.start")}
//                                   </Button>
                               
//                                     <Button
//                                       size="sm" variant="ghost"
//                                       className="h-7 px-3 text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm"
//                                     >
//                                       {t("pages.doctor.notes")}
//                                     </Button>
                                 
//                               </div>
//                             </td>
//                           </tr>
//                         );
//                       })}
//                 </tbody>
//               </table>
//             </div>
//           ) : (
//             <div className="flex flex-col gap-2">
//               {isLoading
//                 ? Array.from({ length: 4 }).map((_, i) => (
//                     <div key={i} className="h-16 rounded-sm bg-muted/40 animate-pulse border border-border/40" />
//                   ))
//                 : filtered.map((a) => (
//                     <AppointmentCard
//                       key={a.id}
//                       appt={a}
//                       onStart={handleStart}
//                       onView={setDetailAppt}
//                       hasNotes={!!a.notes}
//                     />
//                   ))}
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   );
// }

// // ─── Tab 2: Instant Consultation ─────────────────────────────────────────────

// function InstantConsultTab() {
//   const call = useCallStore();
//   const [notesOpen, setNotesOpen] = useState(true);
//   const isInCall = call.phase === "connected" && call.role === "doctor";

//   const { data: queueData, isLoading: queueLoading } = useGetInstantQueue(!isInCall);
//   const acceptInstant  = useAcceptInstant();
//   const declineInstant = useDeclineInstant();

//   const queue = queueData?.queue ?? [];
//   const stats = queueData?.stats;

//   useEffect(() => {
//     if (isInCall) return;
//     if (queue.length > 0 && call.incomingRequests.length === 0) {
//       queue.forEach(() => {
//         if (call.simulateIncomingRequest) call.simulateIncomingRequest();
//       });
//     }
//   }, [queue, isInCall, call]);

//   const handleAccept = (localId: string, apiId?: number) => {
//     if (apiId) {
//       acceptInstant.mutate(apiId, {
//         onSuccess: (res) => {
//           call.acceptRequest(localId);
//           console.info("Daily.co room:", res.room_url);
//         },
//         onError: (err: unknown) => {
//           toast.error(getErrMsg(err, "Failed to accept"));
//         },
//       });
//     } else {
//       call.acceptRequest(localId);
//     }
//   };

//   const handleDecline = (localId: string, apiId?: number) => {
//     if (apiId) {
//       declineInstant.mutate(apiId, {
//         onSuccess: () => call.declineRequest(localId),
//         onError: (err: unknown) => {
//           toast.error(getErrMsg(err, "Failed to decline"));
//           call.declineRequest(localId);
//         },
//       });
//     } else {
//       call.declineRequest(localId);
//     }
//   };

//   if (isInCall) {
//     return (
//       <div className="flex flex-1 min-h-0 overflow-hidden">
//         <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
//           <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/50 shrink-0">
//             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
//             <div className="flex-1 min-w-0 flex items-center gap-2">
//               <span className="text-[12px] font-semibold text-foreground shrink-0">
//                 {call.activeRequest?.patientName}
//               </span>
//               <span className="text-[11px] text-muted-foreground truncate">
//                 — {call.activeRequest?.reason}
//               </span>
//             </div>
//             <div className="flex items-center gap-3 shrink-0">
//               <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
//                 {fmt(call.elapsed)}
//               </span>
//               <button
//                 onClick={() => setNotesOpen(v => !v)}
//                 className={cn(
//                   "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors",
//                   notesOpen
//                     ? "bg-primary/10 text-primary border-primary/20"
//                     : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
//                 )}
//               >
//                 <FileText className="h-3.5 w-3.5" />
//                 {notesOpen ? "Hide notes" : "Notes"}
//               </button>
//             </div>
//           </div>
//           <div className="flex-1 min-h-0 p-4">
//             <ActiveCallPanel />
//           </div>
//         </div>
//         {notesOpen && (
//           <div className="w-72 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
//             <InstantNotesSidebar onClose={() => setNotesOpen(false)} />
//           </div>
//         )}
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-1 min-h-0 overflow-hidden">
//       <div className="flex-1 overflow-y-auto p-4">
//         <div className="flex items-center justify-between mb-4">
//           <div className="flex items-center gap-3">
//             <div className="flex items-center gap-2">
//               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
//               <span className="text-[12px] font-semibold text-foreground">You're online</span>
//             </div>
//             <span className="text-[11px] text-muted-foreground">
//               {queueLoading
//                 ? "Loading queue…"
//                 : call.incomingRequests.length === 0
//                   ? "No patients waiting"
//                   : `${call.incomingRequests.length} patient${call.incomingRequests.length > 1 ? "s" : ""} in queue`}
//             </span>
//           </div>
//           <button
//             onClick={call.simulateIncomingRequest}
//             className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground border border-border/60 rounded-md hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
//           >
//             <BellRing className="h-3 w-3" />
//             Simulate request
//           </button>
//         </div>

//         {!queueLoading && call.incomingRequests.length === 0 && (
//           <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
//             <div className="h-14 w-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
//               <Stethoscope className="h-6 w-6 text-muted-foreground/40" />
//             </div>
//             <div>
//               <p className="text-[13px] font-semibold text-foreground">Ready for patients</p>
//               <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-[260px] leading-relaxed">
//                 Incoming instant consultation requests will appear here.
//               </p>
//             </div>
//           </div>
//         )}

//         {queueLoading && (
//           <div className="space-y-3">
//             {Array.from({ length: 2 }).map((_, i) => (
//               <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
//             ))}
//           </div>
//         )}

//         <div className="space-y-3">
//           {call.incomingRequests.map((req) => (
//             <IncomingCard
//               key={req.id}
//               req={req}
//               onAccept={() => handleAccept(req.id)}
//               onDecline={() => handleDecline(req.id)}
//             />
//           ))}
//         </div>
//       </div>

//       <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-l border-border/60 bg-card/40 p-4 gap-4 overflow-y-auto">
//         <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
//           Today's stats
//         </p>
//         {[
//           { icon: <UserCheck    className="h-4 w-4 text-emerald-500" />, label: "Seen today",   value: stats ? String(stats.seen_today)  : "—" },
//           { icon: <Clock3       className="h-4 w-4 text-sky-500"     />, label: "Avg duration", value: stats ? stats.avg_duration        : "—" },
//           { icon: <Users        className="h-4 w-4 text-violet-500"  />, label: "In queue",     value: stats ? String(stats.in_queue)    : String(call.incomingRequests.length) },
//           { icon: <CheckCircle2 className="h-4 w-4 text-primary"     />, label: "Resolved",     value: stats ? String(stats.resolved)    : "—" },
//         ].map(({ icon, label, value }) => (
//           <div key={label} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background">
//             <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">{icon}</div>
//             <div>
//               <p className="text-[11px] font-semibold text-foreground">{value}</p>
//               <p className="text-[9px] text-muted-foreground">{label}</p>
//             </div>
//           </div>
//         ))}
//       </aside>
//     </div>
//   );
// }

// // ─── Page shell ───────────────────────────────────────────────────────────────

// const DoctorAppointmentsPage = () => {
//   const { t } = useTranslation();
//   const call = useCallStore();
//   const [tab, setTab] = useState<TabId>("appointments");

//   useEffect(() => {
//     if (call.phase === "connected" && call.role === "doctor" && call.activeRequest) {
//       setTab("instant");
//     }
//   }, [call.phase, call.role, call.activeRequest]);

//   const pendingCount = call.incomingRequests.length;

//   return (
//     <DashboardLayout role="doctor">
//       <PageHeader
//         title={t("pages.doctor.overview_title")}
//         subtitle={t("pages.doctor.overview_sub")}
//       />

//       <div className="flex items-center border-b border-border/60 px-4 bg-card/30 shrink-0">
//         {(["appointments", "instant"] as TabId[]).map((id) => (
//           <button
//             key={id}
//             onClick={() => setTab(id)}
//             className={cn(
//               "relative flex items-center gap-2 px-4 py-3 text-[12px] font-medium border-b-2 transition-all duration-200",
//               tab === id
//                 ? "border-primary text-foreground"
//                 : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
//             )}
//           >
//             {id === "appointments" ? (
//               <>
//                 <Calendar className="h-3.5 w-3.5" />
//                 Appointments
//               </>
//             ) : (
//               <>
//                 <Sparkles className="h-3.5 w-3.5" />
//                 Instant consultation
//                 {pendingCount > 0 && (
//                   <span className="h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
//                     {pendingCount}
//                   </span>
//                 )}
//                 {call.phase === "connected" && call.role === "doctor" && call.activeRequest && (
//                   <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
//                 )}
//               </>
//             )}
//           </button>
//         ))}
//       </div>

//       <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
//         {tab === "appointments" ? <AppointmentsTab /> : <InstantConsultTab />}
//       </div>
//     </DashboardLayout>
//   );
// };

// export default DoctorAppointmentsPage;


import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Sparkles, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useCallStore } from "@/context/CallStore";

import { AppointmentsTab } from "@/pages/doctor/appointments/AppointmentsTab";
import { InstantConsultTab } from "@/pages/doctor/appointments/InstantConsultTab";
import { ServiceBookingsTab } from "@/pages/doctor/appointments/ServiceBookingsTab";
import { type TabId } from "@/pages/doctor/appointments/shared/types";

const DoctorAppointmentsPage = () => {
  const { t } = useTranslation();
  const call = useCallStore();
  const [tab, setTab] = useState<TabId>("appointments");

  // Auto-switch to instant tab when a call becomes active
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

      {/* Tab bar — horizontally scrollable so the three tabs never overflow */}
      <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto">
        {(["appointments", "instant", "bookings"] as TabId[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium border-b-2 transition-all duration-200 shrink-0 whitespace-nowrap",
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {id === "appointments" && (
              <>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.appointments')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.appointments_short')}
                </span>
              </>
            )}
            {id === "instant" && (
              <>
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.instant')}
                  </span>
                <span className="sm:hidden">
                  {t('consult.bookings.instant_short')}
                  </span>
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
            {id === "bookings" && (
              <>
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.service_bookings')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.service_bookings_short')}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {tab === "appointments" ? (
          <AppointmentsTab />
        ) : tab === "instant" ? (
          <InstantConsultTab />
        ) : (
          <ServiceBookingsTab />
        )}
      </div>
    </DashboardLayout>
  );
};

export default DoctorAppointmentsPage;
