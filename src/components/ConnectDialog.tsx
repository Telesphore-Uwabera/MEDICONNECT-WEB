// // components/ConnectDialog.tsx
// import { useEffect, useState, useRef } from "react";
// import { createPortal } from "react-dom";
// import { ChatPanel } from "@/components/ChatPanel";
// import { Doctor } from "@/lib/mock-data";
// import { cn } from "@/lib/utils";
// import {
//   Maximize2,
//   Minimize2,
//   Minus,
//   X,
//   Mic,
//   MicOff,
//   Video,
//   VideoOff,
//   PhoneOff,
//   Phone,
//   ShieldCheck,
//   Loader2,
//   CheckCircle2,
//   AlertCircle,
//   MessageSquare,
//   Wifi,
//   ArrowRight,
//   Sparkles,
//   Activity,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import { useCallStore } from "@/context/CallStore";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type CallPhase =
//   | "idle"
//   | "setup"
//   | "checking"
//   | "permissions"
//   | "connecting"
//   | "ringing"
//   | "connected"
//   | "failed"
//   | "ended";

// interface ChartDataset {
//   label: string;
//   data: number[];
//   borderColor: string;
//   backgroundColor: string;
//   borderWidth: number;
//   pointRadius: number;
//   tension: number;
//   yAxisID: string;
//   borderDash?: number[];
// }

// interface ChartInstance {
//   data: {
//     labels: string[];
//     datasets: ChartDataset[];
//   };
//   destroy: () => void;
//   update: (mode: string) => void;
// }

 

// interface ChartConstructor {
//   new (canvas: HTMLCanvasElement, config: object): ChartInstance;
// }

// interface WindowWithChart extends Window {
//   Chart?: ChartConstructor;
// }

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// const fmt = (s: number) =>
//   `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// const SignalBars = ({ strength }: { strength: number }) => (
//   <div className="flex items-end gap-0.5 h-4">
//     {[1, 2, 3, 4].map((b) => (
//       <div
//         key={b}
//         style={{ height: `${b * 4}px` }}
//         className={cn(
//           "w-1 rounded-sm transition-colors",
//           b <= strength
//             ? "bg-emerald-500 dark:bg-emerald-400"
//             : "bg-foreground/10",
//         )}
//       />
//     ))}
//   </div>
// );

// const StatusBadge = ({ phase }: { phase: CallPhase }) => {
//   const map: Record<
//     string,
//     { icon: React.ReactNode; text: string; cls: string }
//   > = {
//     checking: {
//       icon: <Loader2 className="h-3 w-3 animate-spin" />,
//       text: "Checking..",
//       cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
//     },
//     permissions: {
//       icon: <ShieldCheck className="h-3 w-3" />,
//       text: "Setting up..",
//       cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
//     },
//     connecting: {
//       icon: <Loader2 className="h-3 w-3 animate-spin" />,
//       text: "Connecting..",
//       cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
//     },
//     ringing: {
//       icon: <Phone className="h-3 w-3 animate-pulse" />,
//       text: "Ringing..",
//       cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
//     },
//     connected: {
//       icon: <CheckCircle2 className="h-3 w-3" />,
//       text: "Connected",
//       cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
//     },
//     failed: {
//       icon: <AlertCircle className="h-3 w-3" />,
//       text: "Failed",
//       cls: "bg-destructive/10 text-destructive border-destructive/25",
//     },
//     ended: {
//       icon: <PhoneOff className="h-3 w-3" />,
//       text: "Ended",
//       cls: "bg-muted text-muted-foreground border-border",
//     },
//   };
//   const c = map[phase];
//   if (!c) return null;
//   return (
//     <span
//       className={cn(
//         "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
//         c.cls,
//       )}
//     >
//       {c.icon}
//       {c.text}
//     </span>
//   );
// };

// // ─── Vitals chart ─────────────────────────────────────────────────────────────

// const VitalsChart = () => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const chartRef = useRef<ChartInstance | null>(null);
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const scriptLoadedRef = useRef(false);

//   const initChart = () => {
//     if (!canvasRef.current) return;
//     const Chart = (window as WindowWithChart).Chart;
//     if (!Chart) return;

//     const hrData = Array.from({ length: 20 }, () =>
//       Math.round(68 + Math.random() * 20),
//     );
//     const spo2Data = Array.from({ length: 20 }, () =>
//       Math.round(95 + Math.random() * 4),
//     );
//     const labels = Array.from({ length: 20 }, (_, i) =>
//       i === 19 ? "now" : `${19 - i}s`,
//     );

//     if (chartRef.current) chartRef.current.destroy();

//     chartRef.current = new Chart(canvasRef.current, {
//       type: "line",
//       data: {
//         labels,
//         datasets: [
//           {
//             label: "HR (bpm)",
//             data: hrData,
//             borderColor: "#f87171",
//             backgroundColor: "transparent",
//             borderWidth: 1.5,
//             pointRadius: 0,
//             tension: 0.4,
//             yAxisID: "y",
//           },
//           {
//             label: "SpO₂ (%)",
//             data: spo2Data,
//             borderColor: "#34d399",
//             backgroundColor: "transparent",
//             borderWidth: 1.5,
//             borderDash: [4, 3],
//             pointRadius: 0,
//             tension: 0.4,
//             yAxisID: "y2",
//           },
//         ],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         animation: { duration: 200 },
//         plugins: {
//           legend: { display: false },
//           tooltip: {
//             mode: "index" as const,
//             intersect: false,
//             backgroundColor: "rgba(0,0,0,0.85)",
//             titleColor: "#fff",
//             bodyColor: "rgba(255,255,255,0.7)",
//             titleFont: { size: 10 },
//             bodyFont: { size: 10 },
//             padding: 6,
//           },
//         },
//         scales: {
//           x: {
//             ticks: {
//               color: "rgba(128,128,128,0.5)",
//               font: { size: 9 },
//               maxRotation: 0,
//               autoSkip: true,
//               maxTicksLimit: 4,
//             },
//             grid: { color: "rgba(128,128,128,0.08)" },
//             border: { display: false },
//           },
//           y: {
//             position: "left" as const,
//             min: 50,
//             max: 110,
//             ticks: { color: "#f87171", font: { size: 9 }, stepSize: 30 },
//             grid: { color: "rgba(128,128,128,0.08)" },
//             border: { display: false },
//           },
//           y2: {
//             position: "right" as const,
//             min: 90,
//             max: 100,
//             ticks: { color: "#34d399", font: { size: 9 }, stepSize: 5 },
//             grid: { display: false },
//             border: { display: false },
//           },
//         },
//       },
//     });

//     intervalRef.current = setInterval(() => {
//       const c = chartRef.current;
//       if (!c) return;
//       c.data.labels.shift();
//       c.data.labels.push("now");
//       c.data.labels = c.data.labels.map((_: string, i: number, a: string[]) =>
//         i === a.length - 1 ? "now" : `${a.length - 1 - i}s`,
//       );
//       c.data.datasets[0].data.shift();
//       c.data.datasets[0].data.push(Math.round(68 + Math.random() * 20));
//       c.data.datasets[1].data.shift();
//       c.data.datasets[1].data.push(Math.round(95 + Math.random() * 4));
//       c.update("none");
//     }, 2000);
//   };

//   useEffect(() => {
//     if ((window as WindowWithChart).Chart) {
//       initChart();
//     } else if (!scriptLoadedRef.current) {
//       scriptLoadedRef.current = true;
//       const script = document.createElement("script");
//       script.src =
//         "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
//       script.onload = initChart;
//       document.head.appendChild(script);
//     }
//     return () => {
//       if (intervalRef.current) clearInterval(intervalRef.current);
//       if (chartRef.current) {
//         chartRef.current.destroy();
//         chartRef.current = null;
//       }
//     };
//   }, []);

//   return (
//     <div className="rounded-xl bg-muted/60 border border-border p-2.5 space-y-1.5">
//       <div className="flex items-center justify-between px-0.5">
//         <div className="flex items-center gap-1.5">
//           <Activity className="h-3 w-3 text-muted-foreground/50" />
//           <span className="text-[9px] text-muted-foreground/60 font-medium tracking-wide uppercase">
//             Live vitals
//           </span>
//         </div>
//         <div className="flex items-center gap-3">
//           <span className="flex items-center gap-1 text-[10px]">
//             <span className="w-3 h-px bg-red-400 inline-block rounded" />
//             <span className="text-red-500 dark:text-red-400 font-mono">HR</span>
//           </span>
//           <span className="flex items-center gap-1 text-[10px]">
//             <span
//               className="inline-block w-3"
//               style={{ borderTop: "1.5px dashed #34d399" }}
//             />
//             <span className="text-emerald-600 dark:text-emerald-400 font-mono">
//               SpO₂
//             </span>
//           </span>
//         </div>
//       </div>
//       <div style={{ position: "relative", height: "72px" }}>
//         <canvas
//           ref={canvasRef}
//           role="img"
//           aria-label="Live vitals showing heart rate and blood oxygen"
//         />
//       </div>
//     </div>
//   );
// };

// // ─── Dialog wrapper ───────────────────────────────────────────────────────────

// interface ConnectDialogProps {
//   doctor: Doctor;
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
// }

// export const ConnectDialog = ({
//   doctor,
//   open,
//   onOpenChange,
// }: ConnectDialogProps) => {

//  const user = localStorage.getItem("auth_user");
//  console.log("ConnectDialog render, user =", user);

//   console.log("ConnectDialog render, doctor =", doctor);

//   const call = useCallStore();
//   const [fullscreen, setFullscreen] = useState(false);

//   useEffect(() => {
//     if (!open) setFullscreen(false);
//   }, [open]);

//   const handleClose = () => {
//     onOpenChange(false);
//     if (call.phase === "ended") {
//       call.setDialogOpen(false);
//     }
//   };
//   const handleMinimize = () => call.setMinimized(true);

//   if (!open) return null;

//   return createPortal(
//     <>
//       {!fullscreen && (
//         <div
//           className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
//           onClick={handleClose}
//         />
//       )}
//       <div
//         className={cn(
//           "fixed z-50 flex flex-col overflow-hidden transition-all duration-300",
//           fullscreen
//             ? "inset-0 rounded-none"
//             : [
//                 "rounded-2xl shadow-large",
//                 "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
//                 call.phase === "connected"
//                   ? "w-[760px] max-w-[95vw]"
//                   : "w-[400px] max-w-[95vw]",
//               ],
//         )}
//       >
//         {call.phase !== "connected" ? (
//           <PreCallView
//             doctor={doctor}
//             phase={call.phase as CallPhase}
//             fullscreen={fullscreen}
//             setFullscreen={setFullscreen}
//             onClose={handleClose}
//             onSetup={() => call.goToSetup(doctor)}
//             onStart={() => call.startCall(doctor)}
//             onConfirmJoin={call.confirmJoin}
//             onRetry={call.retryCall}
//           />
//         ) : (
//           <InCallView
//             doctor={doctor}
//             fullscreen={fullscreen}
//             setFullscreen={setFullscreen}
//             onMinimize={handleMinimize}
//             onEnd={() => call.endCall()}
//           />
//         )}
//       </div>
//     </>,
//     document.body,
//   );
// };

// // ─── Shared device toggle strip ───────────────────────────────────────────────

// const DeviceToggles = ({ compact = false }: { compact?: boolean }) => {
//   const call = useCallStore();

//   if (compact) {
//     return (
//       <div className="flex gap-2">
//         <button
//           onClick={call.toggleVideo}
//           className={cn(
//             "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
//             call.videoEnabled
//               ? "bg-primary/10 text-primary border-primary/25"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           {call.videoEnabled ? (
//             <Video className="h-3.5 w-3.5" />
//           ) : (
//             <VideoOff className="h-3.5 w-3.5" />
//           )}
//           {call.videoEnabled ? "Camera on" : "Camera off"}
//         </button>
//         <button
//           onClick={call.toggleAudio}
//           className={cn(
//             "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
//             call.audioEnabled
//               ? "bg-primary/10 text-primary border-primary/25"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           {call.audioEnabled ? (
//             <Mic className="h-3.5 w-3.5" />
//           ) : (
//             <MicOff className="h-3.5 w-3.5" />
//           )}
//           {call.audioEnabled ? "Mic on" : "Mic off"}
//         </button>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="flex gap-2">
//         <button
//           onClick={call.toggleVideo}
//           className={cn(
//             "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150",
//             call.videoEnabled
//               ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           <div
//             className={cn(
//               "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
//               call.videoEnabled ? "bg-primary/20" : "bg-muted-foreground/10",
//             )}
//           >
//             {call.videoEnabled ? (
//               <Video className="h-5 w-5" />
//             ) : (
//               <VideoOff className="h-5 w-5" />
//             )}
//           </div>
//           <div className="text-center space-y-0.5">
//             <p className="text-[11px] font-semibold leading-none">Camera</p>
//             <p
//               className={cn(
//                 "text-[10px] leading-none",
//                 call.videoEnabled
//                   ? "text-primary/70"
//                   : "text-muted-foreground/50",
//               )}
//             >
//               {call.videoEnabled ? "On" : "Off"}
//             </p>
//           </div>
//         </button>

//         <button
//           onClick={call.toggleAudio}
//           className={cn(
//             "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150",
//             call.audioEnabled
//               ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           <div
//             className={cn(
//               "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
//               call.audioEnabled ? "bg-primary/20" : "bg-muted-foreground/10",
//             )}
//           >
//             {call.audioEnabled ? (
//               <Mic className="h-5 w-5" />
//             ) : (
//               <MicOff className="h-5 w-5" />
//             )}
//           </div>
//           <div className="text-center space-y-0.5">
//             <p className="text-[11px] font-semibold leading-none">Microphone</p>
//             <p
//               className={cn(
//                 "text-[10px] leading-none",
//                 call.audioEnabled
//                   ? "text-primary/70"
//                   : "text-muted-foreground/50",
//               )}
//             >
//               {call.audioEnabled ? "On" : "Off"}
//             </p>
//           </div>
//         </button>
//       </div>

//       <p className="text-[10px] text-muted-foreground/60 text-center">
//         {!call.videoEnabled && !call.audioEnabled
//           ? "⚠ Camera and mic are both off"
//           : !call.videoEnabled
//             ? "Camera off · Mic on"
//             : !call.audioEnabled
//               ? "Camera on · Mic off — others won't hear you"
//               : "Camera and mic are ready"}
//       </p>
//     </>
//   );
// };

// // ─── Pre-call ─────────────────────────────────────────────────────────────────

// interface PreCallViewProps {
//   doctor: Doctor;
//   phase: CallPhase;
//   fullscreen: boolean;
//   setFullscreen: (v: boolean) => void;
//   onClose: () => void;
//   onSetup: () => void;
//   onStart: () => void;
//   onConfirmJoin: () => void;
//   onRetry: () => void;
// }

// const PreCallView = ({
//   doctor,
//   phase,
//   fullscreen,
//   setFullscreen,
//   onClose,
//   onSetup,
//   onStart,
//   onConfirmJoin,
//   onRetry,
// }: PreCallViewProps) => {
//   const progressMap: Record<string, number> = {
//     checking: 20,
//     permissions: 50,
//     connecting: 75,
//     ringing: 100,
//   };
//   const inProgress = [
//     "checking",
//     "permissions",
//     "connecting",
//     "ringing",
//   ].includes(phase);
//   const isConnecting = ["checking", "permissions", "connecting"].includes(
//     phase,
//   );

//   const titleText = () => {
//     if (phase === "idle") return "Instant consult";
//     if (phase === "setup") return "Set up your devices";
//     if (phase === "ringing") return "Doctor is ready";
//     if (isConnecting) return "Connecting to doctor";
//     if (phase === "failed") return "Connection failed";
//     if (phase === "ended") return "Call ended";
//     return "Instant consult";
//   };

//   return (
//     // Uses card background token — white in light, elevated dark in dark mode
//     <div className="bg-card border border-border rounded-2xl overflow-hidden">
//       {/* Title bar */}
//       <div className="flex items-center justify-between px-4 py-3 border-b border-border">
//         <div className="flex items-center gap-2">
//           <Sparkles className="h-3.5 w-3.5 text-primary" />
//           <span className="text-[12px] font-semibold text-foreground/80">
//             {titleText()}
//           </span>
//         </div>
//         <div className="flex items-center gap-1">
//           <button
//             onClick={() => setFullscreen(!fullscreen)}
//             className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//           >
//             {fullscreen ? (
//               <Minimize2 className="h-3.5 w-3.5" />
//             ) : (
//               <Maximize2 className="h-3.5 w-3.5" />
//             )}
//           </button>
//           <button
//             onClick={onClose}
//             className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//           >
//             <X className="h-3.5 w-3.5" />
//           </button>
//         </div>
//       </div>

//       <div className="p-5 space-y-4">
//         {/* Doctor card */}
//         <div
//           className={cn(
//             "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all",
//             inProgress
//               ? "border-primary/20 bg-primary/5"
//               : "border-border bg-muted/50",
//           )}
//         >
//           <div className="relative shrink-0">
//             <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold">
//               {doctor.avatar}
//             </div>
//             {inProgress && (
//               <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-amber-400 animate-pulse" />
//             )}
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-[13px] font-semibold text-foreground truncate">
//               {doctor.name}
//             </p>
//             <p className="text-[11px] text-muted-foreground truncate mt-0.5">
//               {doctor.specialty} · {doctor.hospital}
//             </p>
//           </div>
//           {phase !== "idle" && phase !== "setup" && (
//             <StatusBadge phase={phase} />
//           )}
//         </div>

//         {/* ── Setup phase ── */}
//         {phase === "setup" && (
//           <>
//             <p className="text-[11px] text-muted-foreground text-center -mt-1">
//               Configure your devices, then join when ready.
//             </p>
//             <DeviceToggles compact={false} />
//             <div className="space-y-2">
//               <Button
//                 onClick={onStart}
//                 className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//               >
//                 <Phone className="h-4 w-4" />
//                 Start connecting
//                 <ArrowRight className="h-3.5 w-3.5" />
//               </Button>
//               <Button
//                 variant="outline"
//                 onClick={onClose}
//                 className="w-full h-9 text-[11px] rounded-xl"
//               >
//                 Cancel
//               </Button>
//             </div>
//           </>
//         )}

//         {/* ── Progress bar phases ── */}
//         {isConnecting && (
//           <div className="space-y-3">
//             <div className="space-y-2">
//               <Progress
//                 value={progressMap[phase] ?? 0}
//                 className="h-[3px] bg-muted [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-700"
//               />
//               <p className="text-[10px] text-muted-foreground text-center">
//                 {phase === "checking" && "Verifying availability.."}
//                 {phase === "permissions" && "Requesting camera & microphone.."}
//                 {phase === "connecting" && "Establishing secure connection.."}
//               </p>
//             </div>
//             <DeviceToggles compact={true} />
//           </div>
//         )}

//         {/* ── Ringing ── */}
//         {phase === "ringing" && (
//           <div className="space-y-3">
//             <div className="space-y-2">
//               <Progress
//                 value={100}
//                 className="h-[3px] bg-muted [&>div]:bg-emerald-500 [&>div]:transition-all [&>div]:duration-700"
//               />
//               <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-medium">
//                 Doctor is available — ready to join
//               </p>
//             </div>
//             <DeviceToggles compact={true} />
//             <div className="space-y-2 pt-1">
//               <Button
//                 onClick={onConfirmJoin}
//                 className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white"
//               >
//                 <Phone className="h-4 w-4" />
//                 Join call
//                 <ArrowRight className="h-3.5 w-3.5" />
//               </Button>
//               <Button
//                 variant="outline"
//                 onClick={onClose}
//                 className="w-full h-9 text-[11px] rounded-xl"
//               >
//                 Cancel
//               </Button>
//             </div>
//           </div>
//         )}

//         {/* ── Idle CTA ── */}
//         {phase === "idle" && (
//           <div className="space-y-2 pt-1">
//             <Button
//               onClick={onSetup}
//               className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//             >
//               <Wifi className="h-4 w-4" />
//               Start instant consultation
//               <ArrowRight className="h-3.5 w-3.5" />
//             </Button>
//             <Button
//               variant="outline"
//               onClick={onClose}
//               className="w-full h-9 text-[11px] rounded-xl"
//             >
//               Cancel
//             </Button>
//           </div>
//         )}

//         {/* ── Failed ── */}
//         {phase === "failed" && (
//           <div className="space-y-2 pt-1">
//             <Button
//               onClick={onRetry}
//               className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//             >
//               <Phone className="h-4 w-4" />
//               Retry connection
//             </Button>
//             <Button
//               variant="outline"
//               onClick={onClose}
//               className="w-full h-9 text-[11px] rounded-xl"
//             >
//               Close
//             </Button>
//           </div>
//         )}

//         {/* ── Ended ── */}
//         {phase === "ended" && (
//           <div className="space-y-3">
//             <div className="rounded-xl bg-muted border border-border px-4 py-3 text-center space-y-1">
//               <p className="text-[12px] font-medium text-foreground/60">
//                 Your consultation has ended
//               </p>
//               <p className="text-[10px] text-muted-foreground">
//                 Duration: session complete
//               </p>
//             </div>
//             <div className="space-y-2">
//               <Button
//                 onClick={onRetry}
//                 className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//               >
//                 <Phone className="h-4 w-4" />
//                 Reconnect with {doctor.name}
//               </Button>
//               <Button
//                 variant="outline"
//                 onClick={onClose}
//                 className="w-full h-9 text-[11px] rounded-xl"
//               >
//                 Close
//               </Button>
//             </div>
//           </div>
//         )}

//         {/* Footer trust badge */}
//         {(phase === "idle" ||
//           phase === "setup" ||
//           isConnecting ||
//           phase === "ringing") && (
//           <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground/50 pt-1">
//             <ShieldCheck className="h-3 w-3" />
//             HIPAA compliant · End-to-end encrypted
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ─── Control button ───────────────────────────────────────────────────────────

// interface CtrlBtnProps {
//   active: boolean;
//   icon: React.ReactNode;
//   onClick: () => void;
//   label: string;
//   danger?: boolean;
// }

// const CtrlBtn = ({
//   active,
//   icon,
//   onClick,
//   label,
//   danger = false,
// }: CtrlBtnProps) => (
//   <button
//     onClick={onClick}
//     title={label}
//     className={cn(
//       "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
//       danger
//         ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/30"
//         : active
//           ? "bg-white/20 hover:bg-white/30 text-white"
//           : "bg-destructive/75 hover:bg-destructive/90 text-white",
//     )}
//   >
//     {icon}
//   </button>
// );

// // ─── In-call view ─────────────────────────────────────────────────────────────
// // The in-call screen is intentionally always dark (it's a video call UI).
// // We keep it using explicit dark values for the immersive feel,
// // but use CSS variables for the chat panel that slides in.

// interface InCallViewProps {
//   doctor: Doctor;
//   fullscreen: boolean;
//   setFullscreen: (v: boolean) => void;
//   onMinimize: () => void;
//   onEnd: () => void;
// }

// const InCallView = ({
//   doctor,
//   fullscreen,
//   setFullscreen,
//   onMinimize,
//   onEnd,
// }: InCallViewProps) => {
//   const call = useCallStore();
//   const [controlsVisible, setControlsVisible] = useState(true);
//   const [showVitals, setShowVitals] = useState(false);
//   const [chatOpen, setChatOpen] = useState(false);
//   const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const scheduleHide = () => {
//     if (hideTimer.current) clearTimeout(hideTimer.current);
//     if (!chatOpen) {
//       hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
//     }
//   };

//   const handleMouseMove = () => {
//     setControlsVisible(true);
//     scheduleHide();
//   };

//   useEffect(() => {
//     scheduleHide();
//     return () => {
//       if (hideTimer.current) clearTimeout(hideTimer.current);
//     };
//   }, [chatOpen]);

//   const handleChatToggle = () => {
//     const next = !chatOpen;
//     setChatOpen(next);
//     if (next) call.clearUnread();
//   };

//   const chatWidth = chatOpen ? 288 : 0;

//   return (
//     // The video call area is always dark — it's an immersive media surface.
//     // We scope it with `dark` class so inner elements use dark tokens too.
//     <div
//       className={cn(
//         "relative flex bg-[#0c0c0c] overflow-hidden dark",
//         fullscreen ? "h-screen w-screen" : "h-[480px]",
//       )}
//       onMouseMove={handleMouseMove}
//       onTouchStart={handleMouseMove}
//     >
//       {/* ── Video area ── */}
//       <div
//         className="relative flex-1 flex flex-col transition-all duration-300 min-w-0"
//         style={{ marginRight: chatWidth }}
//       >
//         {/* Doctor feed placeholder */}
//         <div className="absolute inset-0 flex items-center justify-center">
//           <div className="text-center space-y-3">
//             <div className="relative mx-auto w-[88px] h-[88px]">
//               <div
//                 className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping"
//                 style={{ animationDuration: "2s" }}
//               />
//               <div className="relative h-[88px] w-[88px] rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-3xl font-bold ring-[1.5px] ring-emerald-500/30">
//                 {doctor.avatar}
//               </div>
//             </div>
//             <div className="space-y-0.5">
//               <p className="text-[14px] font-semibold text-white/90">
//                 {doctor.name}
//               </p>
//               <p className="text-[11px] text-white/35">{doctor.specialty}</p>
//             </div>
//           </div>
//         </div>

//         {/* Vitals overlay */}
//         {showVitals && (
//           <div className="absolute bottom-[72px] left-3 right-3 z-10">
//             <VitalsChart />
//           </div>
//         )}

//         {/* Self PiP */}
//         <div
//           className={cn(
//             "absolute right-3 w-[108px] rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center shadow-xl transition-all duration-300",
//             showVitals ? "bottom-[calc(72px+100px+12px)]" : "bottom-[72px]",
//           )}
//           style={{ aspectRatio: "16/9" }}
//         >
//           <div className="text-[10px] text-white/30 font-medium select-none">
//             You
//           </div>
//           {!call.videoEnabled && (
//             <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
//               <VideoOff className="h-3.5 w-3.5 text-white/25" />
//             </div>
//           )}
//         </div>

//         {/* Top bar */}
//         <div
//           className={cn(
//             "absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2.5 z-20",
//             "bg-gradient-to-b from-black/55 to-transparent",
//             "transition-opacity duration-500",
//             controlsVisible ? "opacity-100" : "opacity-0",
//           )}
//         >
//           <div className="flex items-center gap-2">
//             <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
//             <span className="text-[10px] text-white/70 font-mono tracking-wide">
//               LIVE · {fmt(call.elapsed)}
//             </span>
//           </div>
//           <div className="flex items-center gap-2">
//             <SignalBars strength={call.signalStrength} />
//             <div className="flex items-center gap-1">
//               <button
//                 onClick={onMinimize}
//                 title="Minimize"
//                 className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
//               >
//                 <Minus className="h-3.5 w-3.5" />
//               </button>
//               <button
//                 onClick={() => setFullscreen(!fullscreen)}
//                 title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
//                 className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
//               >
//                 {fullscreen ? (
//                   <Minimize2 className="h-3.5 w-3.5" />
//                 ) : (
//                   <Maximize2 className="h-3.5 w-3.5" />
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Bottom controls */}
//         <div
//           className={cn(
//             "absolute bottom-0 inset-x-0 flex items-center justify-center gap-2.5 px-4 py-3 z-20",
//             "bg-gradient-to-t from-black/65 to-transparent",
//             "transition-opacity duration-500",
//             controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
//           )}
//         >
//           <CtrlBtn
//             active={call.audioEnabled}
//             icon={
//               call.audioEnabled ? (
//                 <Mic className="h-4 w-4" />
//               ) : (
//                 <MicOff className="h-4 w-4" />
//               )
//             }
//             onClick={call.toggleAudio}
//             label={call.audioEnabled ? "Mute" : "Unmute"}
//           />
//           <CtrlBtn
//             active={call.videoEnabled}
//             icon={
//               call.videoEnabled ? (
//                 <Video className="h-4 w-4" />
//               ) : (
//                 <VideoOff className="h-4 w-4" />
//               )
//             }
//             onClick={call.toggleVideo}
//             label={call.videoEnabled ? "Stop video" : "Start video"}
//           />

//           <div className="relative">
//             <CtrlBtn
//               active={chatOpen}
//               icon={<MessageSquare className="h-4 w-4" />}
//               onClick={handleChatToggle}
//               label={chatOpen ? "Close chat" : "Open chat"}
//             />
//             {call.unreadCount > 0 && !chatOpen && (
//               <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none leading-none">
//                 {call.unreadCount > 9 ? "9+" : call.unreadCount}
//               </span>
//             )}
//           </div>

//           <CtrlBtn
//             active={showVitals}
//             icon={<Activity className="h-4 w-4" />}
//             onClick={() => setShowVitals((v) => !v)}
//             label={showVitals ? "Hide vitals" : "Show vitals"}
//           />

//           <button
//             onClick={onEnd}
//             title="End call"
//             className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/35"
//           >
//             <PhoneOff className="h-[18px] w-[18px]" />
//           </button>
//         </div>
//       </div>

//       {/* ── Chat panel ── */}
//       {/* Uses bg-card so it follows the light/dark theme of the rest of the app */}
//       <div
//         className={cn(
//           "absolute top-0 right-0 h-full flex flex-col z-30",
//           "bg-card border-l border-border",
//           "transition-all duration-300 ease-in-out",
//           chatOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden",
//         )}
//       >
//         {chatOpen && (
//           <ChatPanel
//             open={chatOpen}
//             onClose={() => setChatOpen(false)}
//             doctorAvatar={doctor.avatar}
//             doctorName={doctor.name}
//           />
//         )}
//       </div>
//     </div>
//   );
// };


// components/ConnectDialog.tsx


// import { useEffect, useState, useRef } from "react";
// import { createPortal } from "react-dom";
// import { ChatPanel } from "@/components/ChatPanel";
// import { cn } from "@/lib/utils";
// import { useMe } from "@/hooks/useAuth";
// import {
//   useInstantConsultationRequest,
//   useInstantConsultationStatus,
// } from "@/hooks/patient/use-instant-consultations";
// import {
//   Maximize2,
//   Minimize2,
//   Minus,
//   X,
//   Mic,
//   MicOff,
//   Video,
//   VideoOff,
//   PhoneOff,
//   Phone,
//   ShieldCheck,
//   Loader2,
//   CheckCircle2,
//   AlertCircle,
//   MessageSquare,
//   Wifi,
//   ArrowRight,
//   Sparkles,
//   Activity,
//   User,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useCallStore } from "@/context/CallStore";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type CallPhase =
//   | "idle"
//   | "guest_form"   // unauthenticated: collect name + phone
//   | "requesting"   // POST in flight
//   | "polling"      // waiting for doctor to accept
//   | "accepted"     // doctor accepted, ready to join
//   | "connected"    // in the call
//   | "rejected"     // doctor declined
//   | "failed"       // network / API error
//   | "ended";

// interface ChartDataset {
//   label: string;
//   data: number[];
//   borderColor: string;
//   backgroundColor: string;
//   borderWidth: number;
//   pointRadius: number;
//   tension: number;
//   yAxisID: string;
//   borderDash?: number[];
// }

// interface ChartInstance {
//   data: { labels: string[]; datasets: ChartDataset[] };
//   destroy: () => void;
//   update: (mode: string) => void;
// }

// interface ChartConstructor {
//   new (canvas: HTMLCanvasElement, config: object): ChartInstance;
// }

// interface WindowWithChart extends Window {
//   Chart?: ChartConstructor;
// }

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// const fmt = (s: number) =>
//   `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// const SignalBars = ({ strength }: { strength: number }) => (
//   <div className="flex items-end gap-0.5 h-4">
//     {[1, 2, 3, 4].map((b) => (
//       <div
//         key={b}
//         style={{ height: `${b * 4}px` }}
//         className={cn(
//           "w-1 rounded-sm transition-colors",
//           b <= strength
//             ? "bg-emerald-500 dark:bg-emerald-400"
//             : "bg-foreground/10",
//         )}
//       />
//     ))}
//   </div>
// );

// const StatusBadge = ({ phase }: { phase: CallPhase }) => {
//   const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
//     requesting: {
//       icon: <Loader2 className="h-3 w-3 animate-spin" />,
//       text: "Requesting..",
//       cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
//     },
//     polling: {
//       icon: <Loader2 className="h-3 w-3 animate-spin" />,
//       text: "Waiting for doctor..",
//       cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
//     },
//     accepted: {
//       icon: <Phone className="h-3 w-3 animate-pulse" />,
//       text: "Doctor ready",
//       cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
//     },
//     connected: {
//       icon: <CheckCircle2 className="h-3 w-3" />,
//       text: "Connected",
//       cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
//     },
//     rejected: {
//       icon: <AlertCircle className="h-3 w-3" />,
//       text: "Declined",
//       cls: "bg-destructive/10 text-destructive border-destructive/25",
//     },
//     failed: {
//       icon: <AlertCircle className="h-3 w-3" />,
//       text: "Failed",
//       cls: "bg-destructive/10 text-destructive border-destructive/25",
//     },
//     ended: {
//       icon: <PhoneOff className="h-3 w-3" />,
//       text: "Ended",
//       cls: "bg-muted text-muted-foreground border-border",
//     },
//   };
//   const c = map[phase];
//   if (!c) return null;
//   return (
//     <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border", c.cls)}>
//       {c.icon}
//       {c.text}
//     </span>
//   );
// };

// // ─── Vitals chart ─────────────────────────────────────────────────────────────

// const VitalsChart = () => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const chartRef = useRef<ChartInstance | null>(null);
//   const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
//   const scriptLoadedRef = useRef(false);

//   const initChart = () => {
//     if (!canvasRef.current) return;
//     const Chart = (window as WindowWithChart).Chart;
//     if (!Chart) return;

//     const hrData = Array.from({ length: 20 }, () => Math.round(68 + Math.random() * 20));
//     const spo2Data = Array.from({ length: 20 }, () => Math.round(95 + Math.random() * 4));
//     const labels = Array.from({ length: 20 }, (_, i) => i === 19 ? "now" : `${19 - i}s`);

//     if (chartRef.current) chartRef.current.destroy();

//     chartRef.current = new Chart(canvasRef.current, {
//       type: "line",
//       data: {
//         labels,
//         datasets: [
//           { label: "HR (bpm)", data: hrData, borderColor: "#f87171", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 0, tension: 0.4, yAxisID: "y" },
//           { label: "SpO₂ (%)", data: spo2Data, borderColor: "#34d399", backgroundColor: "transparent", borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, tension: 0.4, yAxisID: "y2" },
//         ],
//       },
//       options: {
//         responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
//         plugins: { legend: { display: false }, tooltip: { mode: "index" as const, intersect: false, backgroundColor: "rgba(0,0,0,0.85)", titleColor: "#fff", bodyColor: "rgba(255,255,255,0.7)", titleFont: { size: 10 }, bodyFont: { size: 10 }, padding: 6 } },
//         scales: {
//           x: { ticks: { color: "rgba(128,128,128,0.5)", font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 4 }, grid: { color: "rgba(128,128,128,0.08)" }, border: { display: false } },
//           y: { position: "left" as const, min: 50, max: 110, ticks: { color: "#f87171", font: { size: 9 }, stepSize: 30 }, grid: { color: "rgba(128,128,128,0.08)" }, border: { display: false } },
//           y2: { position: "right" as const, min: 90, max: 100, ticks: { color: "#34d399", font: { size: 9 }, stepSize: 5 }, grid: { display: false }, border: { display: false } },
//         },
//       },
//     });

//     intervalRef.current = setInterval(() => {
//       const c = chartRef.current;
//       if (!c) return;
//       c.data.labels.shift();
//       c.data.labels.push("now");
//       c.data.labels = c.data.labels.map((_: string, i: number, a: string[]) => i === a.length - 1 ? "now" : `${a.length - 1 - i}s`);
//       c.data.datasets[0].data.shift();
//       c.data.datasets[0].data.push(Math.round(68 + Math.random() * 20));
//       c.data.datasets[1].data.shift();
//       c.data.datasets[1].data.push(Math.round(95 + Math.random() * 4));
//       c.update("none");
//     }, 2000);
//   };

//   useEffect(() => {
//     if ((window as WindowWithChart).Chart) { initChart(); }
//     else if (!scriptLoadedRef.current) {
//       scriptLoadedRef.current = true;
//       const script = document.createElement("script");
//       script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
//       script.onload = initChart;
//       document.head.appendChild(script);
//     }
//     return () => {
//       if (intervalRef.current) clearInterval(intervalRef.current);
//       if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
//     };
//   }, []);

//   return (
//     <div className="rounded-xl bg-muted/60 border border-border p-2.5 space-y-1.5">
//       <div className="flex items-center justify-between px-0.5">
//         <div className="flex items-center gap-1.5">
//           <Activity className="h-3 w-3 text-muted-foreground/50" />
//           <span className="text-[9px] text-muted-foreground/60 font-medium tracking-wide uppercase">Live vitals</span>
//         </div>
//         <div className="flex items-center gap-3">
//           <span className="flex items-center gap-1 text-[10px]">
//             <span className="w-3 h-px bg-red-400 inline-block rounded" />
//             <span className="text-red-500 dark:text-red-400 font-mono">HR</span>
//           </span>
//           <span className="flex items-center gap-1 text-[10px]">
//             <span className="inline-block w-3" style={{ borderTop: "1.5px dashed #34d399" }} />
//             <span className="text-emerald-600 dark:text-emerald-400 font-mono">SpO₂</span>
//           </span>
//         </div>
//       </div>
//       <div style={{ position: "relative", height: "72px" }}>
//         <canvas ref={canvasRef} role="img" aria-label="Live vitals showing heart rate and blood oxygen" />
//       </div>
//     </div>
//   );
// };

// // ─── Device toggles ───────────────────────────────────────────────────────────

// const DeviceToggles = ({ compact = false }: { compact?: boolean }) => {
//   const call = useCallStore();

//   if (compact) {
//     return (
//       <div className="flex gap-2">
//         <button onClick={call.toggleVideo} className={cn("flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150", call.videoEnabled ? "bg-primary/10 text-primary border-primary/25" : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60")}>
//           {call.videoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
//           {call.videoEnabled ? "Camera on" : "Camera off"}
//         </button>
//         <button onClick={call.toggleAudio} className={cn("flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150", call.audioEnabled ? "bg-primary/10 text-primary border-primary/25" : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60")}>
//           {call.audioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
//           {call.audioEnabled ? "Mic on" : "Mic off"}
//         </button>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="flex gap-2">
//         <button onClick={call.toggleVideo} className={cn("flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150", call.videoEnabled ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20" : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60")}>
//           <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-colors", call.videoEnabled ? "bg-primary/20" : "bg-muted-foreground/10")}>
//             {call.videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
//           </div>
//           <div className="text-center space-y-0.5">
//             <p className="text-[11px] font-semibold leading-none">Camera</p>
//             <p className={cn("text-[10px] leading-none", call.videoEnabled ? "text-primary/70" : "text-muted-foreground/50")}>{call.videoEnabled ? "On" : "Off"}</p>
//           </div>
//         </button>
//         <button onClick={call.toggleAudio} className={cn("flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150", call.audioEnabled ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20" : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60")}>
//           <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-colors", call.audioEnabled ? "bg-primary/20" : "bg-muted-foreground/10")}>
//             {call.audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
//           </div>
//           <div className="text-center space-y-0.5">
//             <p className="text-[11px] font-semibold leading-none">Microphone</p>
//             <p className={cn("text-[10px] leading-none", call.audioEnabled ? "text-primary/70" : "text-muted-foreground/50")}>{call.audioEnabled ? "On" : "Off"}</p>
//           </div>
//         </button>
//       </div>
//       <p className="text-[10px] text-muted-foreground/60 text-center">
//         {!call.videoEnabled && !call.audioEnabled ? "⚠ Camera and mic are both off" : !call.videoEnabled ? "Camera off · Mic on" : !call.audioEnabled ? "Camera on · Mic off — others won't hear you" : "Camera and mic are ready"}
//       </p>
//     </>
//   );
// };

// // ─── ConnectDialog ────────────────────────────────────────────────────────────
// interface ConnectDialogProps {
//   doctor: { id: number; user: { name: string } };
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
// }
// // interface ConnectDialogProps {
// //   doctor: { id: number; name: string };
// //   open: boolean;
// //   onOpenChange: (v: boolean) => void;
// // }

// export const ConnectDialog = ({ doctor, open, onOpenChange }: ConnectDialogProps) => {
//   const call = useCallStore();

//   // ── Auth state ──────────────────────────────────────────────────────────────
//   const { data: me } = useMe();
//   const isLoggedIn = !!me;

//   // ── Local state ─────────────────────────────────────────────────────────────
//   const [phase, setPhase] = useState<CallPhase>("idle");
//   const [fullscreen, setFullscreen] = useState(false);

//   // Guest form fields
//   const [guestName, setGuestName]   = useState("");
//   const [guestPhone, setGuestPhone] = useState("");
//   const [guestError, setGuestError] = useState<string | null>(null);

//   // Stored after a successful request — used to poll status
//   const [consultationToken, setConsultationToken] = useState<string | null>(null);
//   // Queue info shown while polling
//   const [queueInfo, setQueueInfo] = useState<{ position: number; ahead: number } | null>(null);
//   // room_url + daily token from accepted response
//   const [roomUrl, setRoomUrl]         = useState<string | null>(null);
//   const [dailyToken, setDailyToken]   = useState<string | null>(null);
//   // Error message for request/poll failures
//   const [errorMsg, setErrorMsg]       = useState<string | null>(null);

//   // ── API hooks ───────────────────────────────────────────────────────────────
//   const requestMutation = useInstantConsultationRequest();
//   const { data: statusData } = useInstantConsultationStatus(
//     consultationToken,
//     phase === "polling",  // only poll while in polling phase
//   );

//   // ── Reset on open ────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (open) {
//       setPhase(isLoggedIn ? "idle" : "guest_form");
//       setFullscreen(false);
//       setGuestName("");
//       setGuestPhone("");
//       setGuestError(null);
//       setConsultationToken(null);
//       setQueueInfo(null);
//       setRoomUrl(null);
//       setDailyToken(null);
//       setErrorMsg(null);
//     }
//   }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Re-check phase when auth changes mid-session ────────────────────────────
//   useEffect(() => {
//     if (open && phase === "guest_form" && isLoggedIn) {
//       setPhase("idle");
//     }
//   }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── React to status poll results ─────────────────────────────────────────────
//   useEffect(() => {
//     if (!statusData || phase !== "polling") return;

//     setQueueInfo({ position: statusData.queue_position, ahead: statusData.people_ahead });

//     if (statusData.status === "accepted") {
//       setRoomUrl(statusData.room_url ?? null);
//       setDailyToken(statusData.daily_guest_token ?? null);
//       setPhase("accepted");
//     } else if (statusData.status === "rejected" || statusData.status === "cancelled") {
//       setPhase("rejected");
//     }
//   }, [statusData]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Send the consultation request ────────────────────────────────────────────
//   const handleRequest = async (guestOverride?: { name: string; phone: string }) => {
//     setPhase("requesting");
//     setErrorMsg(null);

//     try {
//       const payload = guestOverride
//         ? { doctor_id: doctor.id, guest_name: guestOverride.name, guest_phone: guestOverride.phone }
//         : { doctor_id: doctor.id };

//       const res = await requestMutation.mutateAsync(payload);
//       setConsultationToken(res.guest_token);
//       setQueueInfo({ position: res.queue_position, ahead: res.people_ahead });
//       setPhase("polling");
//     } catch (err) {
//       setErrorMsg(err instanceof Error ? err.message : "Request failed. Please try again.");
//       setPhase("failed");
//     }
//   };

//   // ── Guest form submit ─────────────────────────────────────────────────────────
//   const handleGuestSubmit = () => {
//     if (!guestName.trim()) { setGuestError("Please enter your name."); return; }
//     if (!guestPhone.trim()) { setGuestError("Please enter your phone number."); return; }
//     setGuestError(null);
//     handleRequest({ name: guestName.trim(), phone: guestPhone.trim() });
//   };

//   // ── Join the call (navigate to room_url) ─────────────────────────────────────
//   const handleJoin = () => {
//     if (roomUrl) {
//       // Open the daily.co room. Adjust this if you have an embedded player.
//       window.open(roomUrl, "_blank", "noopener,noreferrer");
//     }
//     call.confirmJoin();
//     setPhase("connected");
//   };

//   // ── Close / end ───────────────────────────────────────────────────────────────
//   const handleClose = () => {
//     onOpenChange(false);
//     if (phase === "ended") call.setDialogOpen(false);
//   };

//   const handleEnd = () => {
//     call.endCall();
//     setPhase("ended");
//   };

//   const handleMinimize = () => call.setMinimized(true);

//   if (!open) return null;

//   // ── Title text per phase ──────────────────────────────────────────────────────
//   const titleText = (): string => {
//     if (phase === "idle")       return "Instant consult";
//     if (phase === "guest_form") return "Your details";
//     if (phase === "requesting") return "Sending request…";
//     if (phase === "polling")    return "Waiting for doctor";
//     if (phase === "accepted")   return "Doctor is ready";
//     if (phase === "connected")  return "In consultation";
//     if (phase === "rejected")   return "Request declined";
//     if (phase === "failed")     return "Connection failed";
//     if (phase === "ended")      return "Call ended";
//     return "Instant consult";
//   };

//   const progressValue = (): number => {
//     if (phase === "requesting") return 30;
//     if (phase === "polling")    return 65;
//     if (phase === "accepted")   return 100;
//     return 0;
//   };

//   const showProgress = ["requesting", "polling", "accepted"].includes(phase);

//   return createPortal(
//     <>
//       {!fullscreen && (
//         <div className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={handleClose} />
//       )}

//       <div className={cn(
//         "fixed z-50 flex flex-col overflow-hidden transition-all duration-300",
//         fullscreen
//           ? "inset-0 rounded-none"
//           : [
//               "rounded-2xl shadow-large",
//               "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
//               phase === "connected"
//                 ? "w-[760px] max-w-[95vw]"
//                 : "w-[400px] max-w-[95vw]",
//             ],
//       )}>
//         {phase !== "connected" ? (
//           // ── Pre-call panel ──────────────────────────────────────────────────
//           <div className="bg-card border border-border rounded-2xl overflow-hidden">
//             {/* Title bar */}
//             <div className="flex items-center justify-between px-4 py-3 border-b border-border">
//               <div className="flex items-center gap-2">
//                 <Sparkles className="h-3.5 w-3.5 text-primary" />
//                 <span className="text-[12px] font-semibold text-foreground/80">{titleText()}</span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <button onClick={() => setFullscreen(!fullscreen)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
//                   {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
//                 </button>
//                 <button onClick={handleClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               </div>
//             </div>

//             <div className="p-5 space-y-4">
//               {/* Doctor card — shown on most phases */}
//               {phase !== "guest_form" && (
//                 <div className={cn("flex items-center gap-3.5 p-3.5 rounded-xl border transition-all", showProgress ? "border-primary/20 bg-primary/5" : "border-border bg-muted/50")}>
//                   <div className="relative shrink-0">
//                     <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold">
//                      {doctor.user.name.charAt(0).toUpperCase()}
//                     </div>
//                     {showProgress && (
//                       <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-amber-400 animate-pulse" />
//                     )}
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="text-[13px] font-semibold text-foreground truncate">{doctor.user.name}</p>
//                     {queueInfo && phase === "polling" && (
//                       <p className="text-[11px] text-muted-foreground mt-0.5">
//                         Position {queueInfo.position} · {queueInfo.ahead === 0 ? "You're next" : `${queueInfo.ahead} ahead`}
//                       </p>
//                     )}
//                   </div>
//                   {(phase !== "idle") && <StatusBadge phase={phase} />}
//                 </div>
//               )}

//               {/* ── Progress bar ── */}
//               {showProgress && (
//                 <div className="space-y-2">
//                   <Progress
//                     value={progressValue()}
//                     className="h-[3px] bg-muted [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-700"
//                   />
//                   <p className="text-[10px] text-muted-foreground text-center">
//                     {phase === "requesting" && "Sending consultation request…"}
//                     {phase === "polling"    && "Waiting for doctor to accept…"}
//                     {phase === "accepted"   && "Doctor is ready — join when you are!"}
//                   </p>
//                 </div>
//               )}

//               {/* ── Guest form ── */}
//               {phase === "guest_form" && (
//                 <div className="space-y-4">
//                   <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border">
//                     <User className="h-4 w-4 text-muted-foreground shrink-0" />
//                     <p className="text-[11px] text-muted-foreground">You're not logged in. Please enter your details to continue.</p>
//                   </div>

//                   <div className="space-y-3">
//                     <div className="space-y-1.5">
//                       <Label className="text-[11px] font-medium">Full name</Label>
//                       <Input
//                         placeholder="e.g. Alain Honore"
//                         value={guestName}
//                         onChange={(e) => setGuestName(e.target.value)}
//                         className="h-9 text-[12px]"
//                         onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <Label className="text-[11px] font-medium">Phone number</Label>
//                       <Input
//                         placeholder="e.g. 0733334512"
//                         value={guestPhone}
//                         onChange={(e) => setGuestPhone(e.target.value)}
//                         className="h-9 text-[12px]"
//                         onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
//                       />
//                     </div>
//                     {guestError && (
//                       <p className="text-[11px] text-destructive flex items-center gap-1">
//                         <AlertCircle className="h-3 w-3" /> {guestError}
//                       </p>
//                     )}
//                   </div>

//                   <div className="space-y-2">
//                     <Button onClick={handleGuestSubmit} className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl">
//                       <Wifi className="h-4 w-4" />
//                       Request consultation
//                       <ArrowRight className="h-3.5 w-3.5" />
//                     </Button>
//                     <Button variant="outline" onClick={handleClose} className="w-full h-9 text-[11px] rounded-xl">
//                       Cancel
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* ── Idle CTA (logged-in user) ── */}
//               {phase === "idle" && (
//                 <div className="space-y-2 pt-1">
//                   <DeviceToggles compact={false} />
//                   <Button onClick={() => handleRequest()} className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl">
//                     <Wifi className="h-4 w-4" />
//                     Start instant consultation
//                     <ArrowRight className="h-3.5 w-3.5" />
//                   </Button>
//                   <Button variant="outline" onClick={handleClose} className="w-full h-9 text-[11px] rounded-xl">
//                     Cancel
//                   </Button>
//                 </div>
//               )}

//               {/* ── Polling — device toggles while waiting ── */}
//               {phase === "polling" && (
//                 <div className="space-y-3">
//                   <DeviceToggles compact={true} />
//                   <Button variant="outline" onClick={handleClose} className="w-full h-9 text-[11px] rounded-xl">
//                     Cancel
//                   </Button>
//                 </div>
//               )}

//               {/* ── Accepted — join CTA ── */}
//               {phase === "accepted" && (
//                 <div className="space-y-3">
//                   <DeviceToggles compact={true} />
//                   <div className="space-y-2 pt-1">
//                     <Button
//                       onClick={handleJoin}
//                       className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
//                     >
//                       <Phone className="h-4 w-4" />
//                       Join call
//                       <ArrowRight className="h-3.5 w-3.5" />
//                     </Button>
//                     <Button variant="outline" onClick={handleClose} className="w-full h-9 text-[11px] rounded-xl">
//                       Cancel
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* ── Failed / rejected ── */}
//               {(phase === "failed" || phase === "rejected") && (
//                 <div className="space-y-3">
//                   {errorMsg && (
//                     <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-[11px] text-destructive flex items-start gap-2">
//                       <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
//                       {errorMsg}
//                     </div>
//                   )}
//                   {phase === "rejected" && (
//                     <div className="p-3 rounded-xl bg-muted border border-border text-center text-[11px] text-muted-foreground">
//                       The doctor is currently unavailable. Please try again later or book an appointment.
//                     </div>
//                   )}
//                   <div className="space-y-2 pt-1">
//                     <Button
//                       onClick={() => isLoggedIn ? handleRequest() : setPhase("guest_form")}
//                       className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//                     >
//                       <Phone className="h-4 w-4" />
//                       Try again
//                     </Button>
//                     <Button variant="outline" onClick={handleClose} className="w-full h-9 text-[11px] rounded-xl">
//                       Close
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* ── Ended ── */}
//               {phase === "ended" && (
//                 <div className="space-y-3">
//                   <div className="rounded-xl bg-muted border border-border px-4 py-3 text-center space-y-1">
//                     <p className="text-[12px] font-medium text-foreground/60">Your consultation has ended</p>
//                     <p className="text-[10px] text-muted-foreground">Duration: session complete</p>
//                   </div>
//                   <div className="space-y-2">
//                     <Button
//                       onClick={() => isLoggedIn ? handleRequest() : setPhase("guest_form")}
//                       className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//                     >
//                       <Phone className="h-4 w-4" />
//                       Reconnect with {doctor.user.name}
//                     </Button>
//                     <Button variant="outline" onClick={handleClose} className="w-full h-9 text-[11px] rounded-xl">
//                       Close
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* Footer trust badge */}
//               {["idle", "guest_form", "polling", "accepted"].includes(phase) && (
//                 <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground/50 pt-1">
//                   <ShieldCheck className="h-3 w-3" />
//                   HIPAA compliant · End-to-end encrypted
//                 </div>
//               )}
//             </div>
//           </div>
//         ) : (
//           // ── In-call view ────────────────────────────────────────────────────
//           <InCallView
//             doctor={doctor}
//             roomUrl={roomUrl}
//             dailyToken={dailyToken}
//             fullscreen={fullscreen}
//             setFullscreen={setFullscreen}
//             onMinimize={handleMinimize}
//             onEnd={handleEnd}
//           />
//         )}
//       </div>
//     </>,
//     document.body,
//   );
// };

// // ─── Control button ───────────────────────────────────────────────────────────

// interface CtrlBtnProps {
//   active: boolean;
//   icon: React.ReactNode;
//   onClick: () => void;
//   label: string;
//   danger?: boolean;
// }

// const CtrlBtn = ({ active, icon, onClick, label, danger = false }: CtrlBtnProps) => (
//   <button
//     onClick={onClick}
//     title={label}
//     className={cn(
//       "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
//       danger
//         ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/30"
//         : active
//           ? "bg-white/20 hover:bg-white/30 text-white"
//           : "bg-destructive/75 hover:bg-destructive/90 text-white",
//     )}
//   >
//     {icon}
//   </button>
// );

// // ─── In-call view ─────────────────────────────────────────────────────────────

// interface InCallViewProps {
//   doctor: { id: number; name: string };
//   roomUrl: string | null;
//   dailyToken: string | null;
//   fullscreen: boolean;
//   setFullscreen: (v: boolean) => void;
//   onMinimize: () => void;
//   onEnd: () => void;
// }

// const InCallView = ({ doctor, fullscreen, setFullscreen, onMinimize, onEnd }: InCallViewProps) => {
//   const call = useCallStore();
//   const [controlsVisible, setControlsVisible] = useState(true);
//   const [showVitals, setShowVitals] = useState(false);
//   const [chatOpen, setChatOpen] = useState(false);
//   const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const scheduleHide = () => {
//     if (hideTimer.current) clearTimeout(hideTimer.current);
//     if (!chatOpen) { hideTimer.current = setTimeout(() => setControlsVisible(false), 3500); }
//   };

//   const handleMouseMove = () => { setControlsVisible(true); scheduleHide(); };

//   useEffect(() => {
//     scheduleHide();
//     return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
//   }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

//   const handleChatToggle = () => {
//     const next = !chatOpen;
//     setChatOpen(next);
//     if (next) call.clearUnread();
//   };

//   const chatWidth = chatOpen ? 288 : 0;

//   return (
//     <div
//       className={cn("relative flex bg-[#0c0c0c] overflow-hidden dark", fullscreen ? "h-screen w-screen" : "h-[480px]")}
//       onMouseMove={handleMouseMove}
//       onTouchStart={handleMouseMove}
//     >
//       {/* Video area */}
//       <div className="relative flex-1 flex flex-col transition-all duration-300 min-w-0" style={{ marginRight: chatWidth }}>
//         {/* Doctor feed placeholder */}
//         <div className="absolute inset-0 flex items-center justify-center">
//           <div className="text-center space-y-3">
//             <div className="relative mx-auto w-[88px] h-[88px]">
//               <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: "2s" }} />
//               <div className="relative h-[88px] w-[88px] rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-3xl font-bold ring-[1.5px] ring-emerald-500/30">
//                 {doctor.user.name.charAt(0).toUpperCase()}
//               </div>
//             </div>
//             <div className="space-y-0.5">
//               <p className="text-[14px] font-semibold text-white/90">{doctor.user.name}</p>
//             </div>
//           </div>
//         </div>

//         {/* Vitals overlay */}
//         {showVitals && (
//           <div className="absolute bottom-[72px] left-3 right-3 z-10"><VitalsChart /></div>
//         )}

//         {/* Self PiP */}
//         <div
//           className={cn("absolute right-3 w-[108px] rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center shadow-xl transition-all duration-300", showVitals ? "bottom-[calc(72px+100px+12px)]" : "bottom-[72px]")}
//           style={{ aspectRatio: "16/9" }}
//         >
//           <div className="text-[10px] text-white/30 font-medium select-none">You</div>
//           {!call.videoEnabled && (
//             <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
//               <VideoOff className="h-3.5 w-3.5 text-white/25" />
//             </div>
//           )}
//         </div>

//         {/* Top bar */}
//         <div className={cn("absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2.5 z-20 bg-gradient-to-b from-black/55 to-transparent transition-opacity duration-500", controlsVisible ? "opacity-100" : "opacity-0")}>
//           <div className="flex items-center gap-2">
//             <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
//             <span className="text-[10px] text-white/70 font-mono tracking-wide">LIVE · {fmt(call.elapsed)}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <SignalBars strength={call.signalStrength} />
//             <div className="flex items-center gap-1">
//               <button onClick={onMinimize} title="Minimize" className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors">
//                 <Minus className="h-3.5 w-3.5" />
//               </button>
//               <button onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors">
//                 {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Bottom controls */}
//         <div className={cn("absolute bottom-0 inset-x-0 flex items-center justify-center gap-2.5 px-4 py-3 z-20 bg-gradient-to-t from-black/65 to-transparent transition-opacity duration-500", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
//           <CtrlBtn active={call.audioEnabled} icon={call.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} onClick={call.toggleAudio} label={call.audioEnabled ? "Mute" : "Unmute"} />
//           <CtrlBtn active={call.videoEnabled} icon={call.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />} onClick={call.toggleVideo} label={call.videoEnabled ? "Stop video" : "Start video"} />
//           <div className="relative">
//             <CtrlBtn active={chatOpen} icon={<MessageSquare className="h-4 w-4" />} onClick={handleChatToggle} label={chatOpen ? "Close chat" : "Open chat"} />
//             {call.unreadCount > 0 && !chatOpen && (
//               <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none leading-none">
//                 {call.unreadCount > 9 ? "9+" : call.unreadCount}
//               </span>
//             )}
//           </div>
//           <CtrlBtn active={showVitals} icon={<Activity className="h-4 w-4" />} onClick={() => setShowVitals((v) => !v)} label={showVitals ? "Hide vitals" : "Show vitals"} />
//           <button onClick={onEnd} title="End call" className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/35">
//             <PhoneOff className="h-[18px] w-[18px]" />
//           </button>
//         </div>
//       </div>

//       {/* Chat panel */}
//       <div className={cn("absolute top-0 right-0 h-full flex flex-col z-30 bg-card border-l border-border transition-all duration-300 ease-in-out", chatOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden")}>
//         {chatOpen && (
//           <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} doctorAvatar={doctor.name.charAt(0)} doctorName={doctor.name} />
//         )}
//       </div>
//     </div>
//   );
// };



// // components/ConnectDialog.tsx
// import { useEffect, useState, useRef } from "react";
// import { createPortal } from "react-dom";
// import { ChatPanel } from "@/components/ChatPanel";
// import { cn } from "@/lib/utils";
// import { useMe } from "@/hooks/useAuth";
// import {
//   useInstantConsultationRequest,
//   useInstantConsultationStatus,
//   type InstantConsultationRequestPayload,
// } from "@/hooks/patient/use-instant-consultations";
// import {
//   Maximize2,
//   Minimize2,
//   Minus,
//   X,
//   Mic,
//   MicOff,
//   Video,
//   VideoOff,
//   PhoneOff,
//   Phone,
//   ShieldCheck,
//   Loader2,
//   CheckCircle2,
//   AlertCircle,
//   MessageSquare,
//   Wifi,
//   ArrowRight,
//   Sparkles,
//   Activity,
//   User,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useCallStore } from "@/context/CallStore";
// import type { Doctor } from "@/context/CallStore";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type CallPhase =
//   | "idle"
//   | "guest_form"
//   | "requesting"
//   | "polling"
//   | "accepted"
//   | "connected"
//   | "rejected"
//   | "failed"
//   | "ended";

// interface ChartDataset {
//   label: string;
//   data: number[];
//   borderColor: string;
//   backgroundColor: string;
//   borderWidth: number;
//   pointRadius: number;
//   tension: number;
//   yAxisID: string;
//   borderDash?: number[];
// }

// interface ChartInstance {
//   data: { labels: string[]; datasets: ChartDataset[] };
//   destroy: () => void;
//   update: (mode: string) => void;
// }

// interface ChartConstructor {
//   new (canvas: HTMLCanvasElement, config: object): ChartInstance;
// }

// interface WindowWithChart extends Window {
//   Chart?: ChartConstructor;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt = (s: number) =>
//   `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// /** Returns up to 2 uppercase initials from a display name. */
// const nameInitial = (name: string): string =>
//   name
//     .split(" ")
//     .map((n) => n[0] ?? "")
//     .join("")
//     .slice(0, 2)
//     .toUpperCase() || "?";

// const SignalBars = ({ strength }: { strength: number }) => (
//   <div className="flex items-end gap-0.5 h-4">
//     {[1, 2, 3, 4].map((b) => (
//       <div
//         key={b}
//         style={{ height: `${b * 4}px` }}
//         className={cn(
//           "w-1 rounded-sm transition-colors",
//           b <= strength
//             ? "bg-emerald-500 dark:bg-emerald-400"
//             : "bg-foreground/10",
//         )}
//       />
//     ))}
//   </div>
// );

// const StatusBadge = ({ phase }: { phase: CallPhase }) => {
//   const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
//     requesting: {
//       icon: <Loader2 className="h-3 w-3 animate-spin" />,
//       text: "Requesting..",
//       cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
//     },
//     polling: {
//       icon: <Loader2 className="h-3 w-3 animate-spin" />,
//       text: "Waiting for doctor..",
//       cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
//     },
//     accepted: {
//       icon: <Phone className="h-3 w-3 animate-pulse" />,
//       text: "Doctor ready",
//       cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
//     },
//     connected: {
//       icon: <CheckCircle2 className="h-3 w-3" />,
//       text: "Connected",
//       cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
//     },
//     rejected: {
//       icon: <AlertCircle className="h-3 w-3" />,
//       text: "Declined",
//       cls: "bg-destructive/10 text-destructive border-destructive/25",
//     },
//     failed: {
//       icon: <AlertCircle className="h-3 w-3" />,
//       text: "Failed",
//       cls: "bg-destructive/10 text-destructive border-destructive/25",
//     },
//     ended: {
//       icon: <PhoneOff className="h-3 w-3" />,
//       text: "Ended",
//       cls: "bg-muted text-muted-foreground border-border",
//     },
//   };
//   const c = map[phase];
//   if (!c) return null;
//   return (
//     <span
//       className={cn(
//         "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
//         c.cls,
//       )}
//     >
//       {c.icon}
//       {c.text}
//     </span>
//   );
// };

// // ─── Vitals chart ─────────────────────────────────────────────────────────────

// const VitalsChart = () => {
//   const canvasRef       = useRef<HTMLCanvasElement>(null);
//   const chartRef        = useRef<ChartInstance | null>(null);
//   const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
//   const scriptLoadedRef = useRef(false);

//   const initChart = () => {
//     if (!canvasRef.current) return;
//     const Chart = (window as WindowWithChart).Chart;
//     if (!Chart) return;

//     const hrData   = Array.from({ length: 20 }, () => Math.round(68 + Math.random() * 20));
//     const spo2Data = Array.from({ length: 20 }, () => Math.round(95 + Math.random() * 4));
//     const labels   = Array.from({ length: 20 }, (_, i) => i === 19 ? "now" : `${19 - i}s`);

//     if (chartRef.current) chartRef.current.destroy();

//     chartRef.current = new Chart(canvasRef.current, {
//       type: "line",
//       data: {
//         labels,
//         datasets: [
//           {
//             label: "HR (bpm)",
//             data: hrData,
//             borderColor: "#f87171",
//             backgroundColor: "transparent",
//             borderWidth: 1.5,
//             pointRadius: 0,
//             tension: 0.4,
//             yAxisID: "y",
//           },
//           {
//             label: "SpO₂ (%)",
//             data: spo2Data,
//             borderColor: "#34d399",
//             backgroundColor: "transparent",
//             borderWidth: 1.5,
//             borderDash: [4, 3],
//             pointRadius: 0,
//             tension: 0.4,
//             yAxisID: "y2",
//           },
//         ],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         animation: { duration: 200 },
//         plugins: {
//           legend: { display: false },
//           tooltip: {
//             mode: "index" as const,
//             intersect: false,
//             backgroundColor: "rgba(0,0,0,0.85)",
//             titleColor: "#fff",
//             bodyColor: "rgba(255,255,255,0.7)",
//             titleFont: { size: 10 },
//             bodyFont: { size: 10 },
//             padding: 6,
//           },
//         },
//         scales: {
//           x: {
//             ticks: {
//               color: "rgba(128,128,128,0.5)",
//               font: { size: 9 },
//               maxRotation: 0,
//               autoSkip: true,
//               maxTicksLimit: 4,
//             },
//             grid: { color: "rgba(128,128,128,0.08)" },
//             border: { display: false },
//           },
//           y: {
//             position: "left" as const,
//             min: 50,
//             max: 110,
//             ticks: { color: "#f87171", font: { size: 9 }, stepSize: 30 },
//             grid: { color: "rgba(128,128,128,0.08)" },
//             border: { display: false },
//           },
//           y2: {
//             position: "right" as const,
//             min: 90,
//             max: 100,
//             ticks: { color: "#34d399", font: { size: 9 }, stepSize: 5 },
//             grid: { display: false },
//             border: { display: false },
//           },
//         },
//       },
//     });

//     intervalRef.current = setInterval(() => {
//       const c = chartRef.current;
//       if (!c) return;
//       c.data.labels.shift();
//       c.data.labels.push("now");
//       c.data.labels = c.data.labels.map((_: string, i: number, a: string[]) =>
//         i === a.length - 1 ? "now" : `${a.length - 1 - i}s`,
//       );
//       c.data.datasets[0].data.shift();
//       c.data.datasets[0].data.push(Math.round(68 + Math.random() * 20));
//       c.data.datasets[1].data.shift();
//       c.data.datasets[1].data.push(Math.round(95 + Math.random() * 4));
//       c.update("none");
//     }, 2000);
//   };

//   useEffect(() => {
//     if ((window as WindowWithChart).Chart) {
//       initChart();
//     } else if (!scriptLoadedRef.current) {
//       scriptLoadedRef.current = true;
//       const script = document.createElement("script");
//       script.src =
//         "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
//       script.onload = initChart;
//       document.head.appendChild(script);
//     }
//     return () => {
//       if (intervalRef.current) clearInterval(intervalRef.current);
//       if (chartRef.current) {
//         chartRef.current.destroy();
//         chartRef.current = null;
//       }
//     };
//   }, []);

//   return (
//     <div className="rounded-xl bg-muted/60 border border-border p-2.5 space-y-1.5">
//       <div className="flex items-center justify-between px-0.5">
//         <div className="flex items-center gap-1.5">
//           <Activity className="h-3 w-3 text-muted-foreground/50" />
//           <span className="text-[9px] text-muted-foreground/60 font-medium tracking-wide uppercase">
//             Live vitals
//           </span>
//         </div>
//         <div className="flex items-center gap-3">
//           <span className="flex items-center gap-1 text-[10px]">
//             <span className="w-3 h-px bg-red-400 inline-block rounded" />
//             <span className="text-red-500 dark:text-red-400 font-mono">HR</span>
//           </span>
//           <span className="flex items-center gap-1 text-[10px]">
//             <span
//               className="inline-block w-3"
//               style={{ borderTop: "1.5px dashed #34d399" }}
//             />
//             <span className="text-emerald-600 dark:text-emerald-400 font-mono">
//               SpO₂
//             </span>
//           </span>
//         </div>
//       </div>
//       <div style={{ position: "relative", height: "72px" }}>
//         <canvas
//           ref={canvasRef}
//           role="img"
//           aria-label="Live vitals showing heart rate and blood oxygen"
//         />
//       </div>
//     </div>
//   );
// };

// // ─── Device toggles ───────────────────────────────────────────────────────────

// const DeviceToggles = ({ compact = false }: { compact?: boolean }) => {
//   const call = useCallStore();

//   if (compact) {
//     return (
//       <div className="flex gap-2">
//         <button
//           onClick={call.toggleVideo}
//           className={cn(
//             "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
//             call.videoEnabled
//               ? "bg-primary/10 text-primary border-primary/25"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           {call.videoEnabled ? (
//             <Video className="h-3.5 w-3.5" />
//           ) : (
//             <VideoOff className="h-3.5 w-3.5" />
//           )}
//           {call.videoEnabled ? "Camera on" : "Camera off"}
//         </button>
//         <button
//           onClick={call.toggleAudio}
//           className={cn(
//             "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
//             call.audioEnabled
//               ? "bg-primary/10 text-primary border-primary/25"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           {call.audioEnabled ? (
//             <Mic className="h-3.5 w-3.5" />
//           ) : (
//             <MicOff className="h-3.5 w-3.5" />
//           )}
//           {call.audioEnabled ? "Mic on" : "Mic off"}
//         </button>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="flex gap-2">
//         <button
//           onClick={call.toggleVideo}
//           className={cn(
//             "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150",
//             call.videoEnabled
//               ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           <div
//             className={cn(
//               "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
//               call.videoEnabled ? "bg-primary/20" : "bg-muted-foreground/10",
//             )}
//           >
//             {call.videoEnabled ? (
//               <Video className="h-5 w-5" />
//             ) : (
//               <VideoOff className="h-5 w-5" />
//             )}
//           </div>
//           <div className="text-center space-y-0.5">
//             <p className="text-[11px] font-semibold leading-none">Camera</p>
//             <p
//               className={cn(
//                 "text-[10px] leading-none",
//                 call.videoEnabled ? "text-primary/70" : "text-muted-foreground/50",
//               )}
//             >
//               {call.videoEnabled ? "On" : "Off"}
//             </p>
//           </div>
//         </button>

//         <button
//           onClick={call.toggleAudio}
//           className={cn(
//             "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150",
//             call.audioEnabled
//               ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
//               : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
//           )}
//         >
//           <div
//             className={cn(
//               "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
//               call.audioEnabled ? "bg-primary/20" : "bg-muted-foreground/10",
//             )}
//           >
//             {call.audioEnabled ? (
//               <Mic className="h-5 w-5" />
//             ) : (
//               <MicOff className="h-5 w-5" />
//             )}
//           </div>
//           <div className="text-center space-y-0.5">
//             <p className="text-[11px] font-semibold leading-none">Microphone</p>
//             <p
//               className={cn(
//                 "text-[10px] leading-none",
//                 call.audioEnabled ? "text-primary/70" : "text-muted-foreground/50",
//               )}
//             >
//               {call.audioEnabled ? "On" : "Off"}
//             </p>
//           </div>
//         </button>
//       </div>

//       <p className="text-[10px] text-muted-foreground/60 text-center">
//         {!call.videoEnabled && !call.audioEnabled
//           ? "⚠ Camera and mic are both off"
//           : !call.videoEnabled
//           ? "Camera off · Mic on"
//           : !call.audioEnabled
//           ? "Camera on · Mic off — others won't hear you"
//           : "Camera and mic are ready"}
//       </p>
//     </>
//   );
// };

// // ─── ConnectDialog ────────────────────────────────────────────────────────────

// interface ConnectDialogProps {
//   /** Slim Doctor shape from CallStore — built by DoctorCard from ApiDoctor */
//   doctor: Doctor;
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
// }

// export const ConnectDialog = ({
//   doctor,
//   open,
//   onOpenChange,
// }: ConnectDialogProps) => {
//   const call = useCallStore();

//   // ── Auth ──────────────────────────────────────────────────────────────────
//   const { data: me } = useMe();
//   const isLoggedIn = !!me;

//   // A logged-in user is "complete" only if they have both name and phone.
//   // If phone is missing, they still need the guest form.
//   const isProfileComplete = isLoggedIn && !!me?.name && !!me?.phone;

//   // ── Local state ───────────────────────────────────────────────────────────
//   const [phase, setPhase]           = useState<CallPhase>("idle");
//   const [fullscreen, setFullscreen] = useState(false);

//   // Guest / supplemental form fields
//   const [guestName, setGuestName]   = useState("");
//   const [guestPhone, setGuestPhone] = useState("");
//   const [guestError, setGuestError] = useState<string | null>(null);

//   // Consultation state
//   const [consultationToken, setConsultationToken] = useState<string | null>(null);
//   const [queueInfo, setQueueInfo] = useState<{
//     position: number;
//     ahead: number;
//   } | null>(null);
//   const [roomUrl, setRoomUrl]       = useState<string | null>(null);
//   const [dailyToken, setDailyToken] = useState<string | null>(null);
//   const [errorMsg, setErrorMsg]     = useState<string | null>(null);

//   // ── API hooks ─────────────────────────────────────────────────────────────
//   const requestMutation = useInstantConsultationRequest();
//   const { data: statusData } = useInstantConsultationStatus(
//     consultationToken,
//     phase === "polling",
//   );

//   // ── Reset on open ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (open) {
//       // Logged-in users with a complete profile skip the form.
//       // Everyone else (guests OR logged-in users missing a phone) sees the form.
//       setPhase(isProfileComplete ? "idle" : "guest_form");
//       setFullscreen(false);
//       // Pre-fill form fields from the user profile when available
//       setGuestName(me?.name ?? "");
//       setGuestPhone(me?.phone ?? "");
//       setGuestError(null);
//       setConsultationToken(null);
//       setQueueInfo(null);
//       setRoomUrl(null);
//       setDailyToken(null);
//       setErrorMsg(null);
//     }
//   }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Promote guest_form → idle if user logs in (with complete profile) ─────
//   useEffect(() => {
//     if (open && phase === "guest_form" && isProfileComplete) {
//       setGuestName(me?.name ?? "");
//       setGuestPhone(me?.phone ?? "");
//       setPhase("idle");
//     }
//   }, [isLoggedIn, me]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── React to poll results ─────────────────────────────────────────────────
//   useEffect(() => {
//     if (!statusData || phase !== "polling") return;

//     setQueueInfo({
//       position: statusData.queue_position,
//       ahead: statusData.people_ahead,
//     });

//     if (statusData.status === "accepted") {
//       setRoomUrl(statusData.room_url ?? null);
//       setDailyToken(statusData.daily_guest_token ?? null);
//       setPhase("accepted");
//     } else if (
//       statusData.status === "rejected" ||
//       statusData.status === "cancelled"
//     ) {
//       setPhase("rejected");
//     }
//   }, [statusData]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Send consultation request ─────────────────────────────────────────────
//   // Both logged-in users AND guests always send doctor_id + guest_name + guest_phone.
//   // For logged-in users the name/phone are sourced from their profile automatically.
//   const handleRequest = async (override?: { name: string; phone: string }) => {
//     setPhase("requesting");
//     setErrorMsg(null);

//     try {
//       const name  = override?.name  ?? me?.name  ?? guestName;
//       const phone = override?.phone ?? me?.phone ?? guestPhone;

//       const payload: InstantConsultationRequestPayload = {
//         doctor_id:   doctor.id,
//         guest_name:  name,
//         guest_phone: phone,
//       };

//       const res = await requestMutation.mutateAsync(payload);
//       setConsultationToken(res.guest_token);
//       setQueueInfo({ position: res.queue_position, ahead: res.people_ahead });
//       setPhase("polling");
//     } catch (err) {
//       setErrorMsg(
//         err instanceof Error ? err.message : "Request failed. Please try again.",
//       );
//       setPhase("failed");
//     }
//   };

//   // ── Guest form submit ─────────────────────────────────────────────────────
//   const handleGuestSubmit = () => {
//     if (!guestName.trim()) {
//       setGuestError("Please enter your name.");
//       return;
//     }
//     if (!guestPhone.trim()) {
//       setGuestError("Please enter your phone number.");
//       return;
//     }
//     setGuestError(null);
//     handleRequest({ name: guestName.trim(), phone: guestPhone.trim() });
//   };

//   // ── Join the call ─────────────────────────────────────────────────────────
//   const handleJoin = () => {
//     if (roomUrl) {
//       window.open(roomUrl, "_blank", "noopener,noreferrer");
//     }
//     call.confirmJoin();
//     setPhase("connected");
//   };

//   // ── Close / end ───────────────────────────────────────────────────────────
//   const handleClose = () => {
//     onOpenChange(false);
//     if (phase === "ended") call.setDialogOpen(false);
//   };

//   const handleEnd = () => {
//     call.endCall();
//     setPhase("ended");
//   };

//   const handleMinimize = () => call.setMinimized(true);

//   if (!open) return null;

//   // ── Retry helper — goes back to form for guests, re-requests for logged-in ─
//   const handleRetry = () => {
//     if (isProfileComplete) {
//       handleRequest();
//     } else {
//       setPhase("guest_form");
//     }
//   };

//   // ── Derived display values ────────────────────────────────────────────────
//   const doctorName    = doctor.user.name;
//   const doctorInitial = nameInitial(doctorName);

//   const titleText = (): string => {
//     if (phase === "idle")       return "Instant consult";
//     if (phase === "guest_form") return "Your details";
//     if (phase === "requesting") return "Sending request…";
//     if (phase === "polling")    return "Waiting for doctor";
//     if (phase === "accepted")   return "Doctor is ready";
//     if (phase === "connected")  return "In consultation";
//     if (phase === "rejected")   return "Request declined";
//     if (phase === "failed")     return "Connection failed";
//     if (phase === "ended")      return "Call ended";
//     return "Instant consult";
//   };

//   const progressValue = (): number => {
//     if (phase === "requesting") return 30;
//     if (phase === "polling")    return 65;
//     if (phase === "accepted")   return 100;
//     return 0;
//   };

//   const showProgress = ["requesting", "polling", "accepted"].includes(phase);

//   return createPortal(
//     <>
//       {!fullscreen && (
//         <div
//           className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
//           onClick={handleClose}
//         />
//       )}

//       <div
//         className={cn(
//           "fixed z-50 flex flex-col overflow-hidden transition-all duration-300",
//           fullscreen
//             ? "inset-0 rounded-none"
//             : [
//                 "rounded-2xl shadow-large",
//                 "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
//                 phase === "connected"
//                   ? "w-[760px] max-w-[95vw]"
//                   : "w-[400px] max-w-[95vw]",
//               ],
//         )}
//       >
//         {phase !== "connected" ? (
//           // ── Pre-call panel ──────────────────────────────────────────────────
//           <div className="bg-card border border-border rounded-2xl overflow-hidden">
//             {/* Title bar */}
//             <div className="flex items-center justify-between px-4 py-3 border-b border-border">
//               <div className="flex items-center gap-2">
//                 <Sparkles className="h-3.5 w-3.5 text-primary" />
//                 <span className="text-[12px] font-semibold text-foreground/80">
//                   {titleText()}
//                 </span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <button
//                   onClick={() => setFullscreen(!fullscreen)}
//                   className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//                 >
//                   {fullscreen ? (
//                     <Minimize2 className="h-3.5 w-3.5" />
//                   ) : (
//                     <Maximize2 className="h-3.5 w-3.5" />
//                   )}
//                 </button>
//                 <button
//                   onClick={handleClose}
//                   className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//                 >
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               </div>
//             </div>

//             <div className="p-5 space-y-4">
//               {/* Doctor card — hidden on guest_form */}
//               {phase !== "guest_form" && (
//                 <div
//                   className={cn(
//                     "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all",
//                     showProgress
//                       ? "border-primary/20 bg-primary/5"
//                       : "border-border bg-muted/50",
//                   )}
//                 >
//                   <div className="relative shrink-0">
//                     <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold select-none">
//                       {doctorInitial}
//                     </div>
//                     {showProgress && (
//                       <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-amber-400 animate-pulse" />
//                     )}
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="text-[13px] font-semibold text-foreground truncate">
//                       {doctorName}
//                     </p>
//                     {doctor.specialization && (
//                       <p className="text-[11px] text-muted-foreground truncate mt-0.5">
//                         {doctor.specialization}
//                       </p>
//                     )}
//                     {queueInfo && phase === "polling" && (
//                       <p className="text-[11px] text-muted-foreground mt-0.5">
//                         Position {queueInfo.position} ·{" "}
//                         {queueInfo.ahead === 0
//                           ? "You're next"
//                           : `${queueInfo.ahead} ahead`}
//                       </p>
//                     )}
//                   </div>
//                   {phase !== "idle" && <StatusBadge phase={phase} />}
//                 </div>
//               )}

//               {/* Progress bar */}
//               {showProgress && (
//                 <div className="space-y-2">
//                   <Progress
//                     value={progressValue()}
//                     className="h-[3px] bg-muted [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-700"
//                   />
//                   <p className="text-[10px] text-muted-foreground text-center">
//                     {phase === "requesting" && "Sending consultation request…"}
//                     {phase === "polling"    && "Waiting for doctor to accept…"}
//                     {phase === "accepted"   && "Doctor is ready — join when you are!"}
//                   </p>
//                 </div>
//               )}

//               {/* ── Guest form (unauthenticated OR logged-in without phone) ── */}
//               {phase === "guest_form" && (
//                 <div className="space-y-4">
//                   <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border">
//                     <User className="h-4 w-4 text-muted-foreground shrink-0" />
//                     <p className="text-[11px] text-muted-foreground">
//                       {isLoggedIn
//                         ? "Please confirm your contact details to continue."
//                         : "You're not logged in. Please enter your details to continue."}
//                     </p>
//                   </div>

//                   {/* Show which doctor they're requesting when form is open */}
//                   <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
//                     <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-sm font-bold select-none shrink-0">
//                       {doctorInitial}
//                     </div>
//                     <div className="min-w-0">
//                       <p className="text-[12px] font-semibold text-foreground truncate">
//                         {doctorName}
//                       </p>
//                       {doctor.specialization && (
//                         <p className="text-[10px] text-muted-foreground truncate">
//                           {doctor.specialization}
//                         </p>
//                       )}
//                     </div>
//                   </div>

//                   <div className="space-y-3">
//                     <div className="space-y-1.5">
//                       <Label className="text-[11px] font-medium">Full name</Label>
//                       <Input
//                         placeholder="e.g. Alain Honore"
//                         value={guestName}
//                         onChange={(e) => setGuestName(e.target.value)}
//                         className="h-9 text-[12px]"
//                         onKeyDown={(e) =>
//                           e.key === "Enter" && handleGuestSubmit()
//                         }
//                       />
//                     </div>
//                     <div className="space-y-1.5">
//                       <Label className="text-[11px] font-medium">
//                         Phone number
//                       </Label>
//                       <Input
//                         placeholder="e.g. 0733334512"
//                         value={guestPhone}
//                         onChange={(e) => setGuestPhone(e.target.value)}
//                         className="h-9 text-[12px]"
//                         onKeyDown={(e) =>
//                           e.key === "Enter" && handleGuestSubmit()
//                         }
//                       />
//                     </div>
//                     {guestError && (
//                       <p className="text-[11px] text-destructive flex items-center gap-1">
//                         <AlertCircle className="h-3 w-3" /> {guestError}
//                       </p>
//                     )}
//                   </div>

//                   <div className="space-y-2">
//                     <Button
//                       onClick={handleGuestSubmit}
//                       className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//                     >
//                       <Wifi className="h-4 w-4" />
//                       Request consultation
//                       <ArrowRight className="h-3.5 w-3.5" />
//                     </Button>
//                     <Button
//                       variant="outline"
//                       onClick={handleClose}
//                       className="w-full h-9 text-[11px] rounded-xl"
//                     >
//                       Cancel
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* ── Idle CTA (logged-in with complete profile) ── */}
//               {phase === "idle" && (
//                 <div className="space-y-2 pt-1">
//                   <DeviceToggles compact={false} />
//                   <Button
//                     onClick={() => handleRequest()}
//                     className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//                   >
//                     <Wifi className="h-4 w-4" />
//                     Start instant consultation
//                     <ArrowRight className="h-3.5 w-3.5" />
//                   </Button>
//                   <Button
//                     variant="outline"
//                     onClick={handleClose}
//                     className="w-full h-9 text-[11px] rounded-xl"
//                   >
//                     Cancel
//                   </Button>
//                 </div>
//               )}

//               {/* ── Polling — wait with device toggles ── */}
//               {phase === "polling" && (
//                 <div className="space-y-3">
//                   <DeviceToggles compact={true} />
//                   <Button
//                     variant="outline"
//                     onClick={handleClose}
//                     className="w-full h-9 text-[11px] rounded-xl"
//                   >
//                     Cancel
//                   </Button>
//                 </div>
//               )}

//               {/* ── Accepted — join CTA ── */}
//               {phase === "accepted" && (
//                 <div className="space-y-3">
//                   <DeviceToggles compact={true} />
//                   <div className="space-y-2 pt-1">
//                     <Button
//                       onClick={handleJoin}
//                       className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
//                     >
//                       <Phone className="h-4 w-4" />
//                       Join call
//                       <ArrowRight className="h-3.5 w-3.5" />
//                     </Button>
//                     <Button
//                       variant="outline"
//                       onClick={handleClose}
//                       className="w-full h-9 text-[11px] rounded-xl"
//                     >
//                       Cancel
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* ── Failed / rejected ── */}
//               {(phase === "failed" || phase === "rejected") && (
//                 <div className="space-y-3">
//                   {errorMsg && (
//                     <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-[11px] text-destructive flex items-start gap-2">
//                       <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
//                       {errorMsg}
//                     </div>
//                   )}
//                   {phase === "rejected" && (
//                     <div className="p-3 rounded-xl bg-muted border border-border text-center text-[11px] text-muted-foreground">
//                       The doctor is currently unavailable. Please try again
//                       later or book an appointment.
//                     </div>
//                   )}
//                   <div className="space-y-2 pt-1">
//                     <Button
//                       onClick={handleRetry}
//                       className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//                     >
//                       <Phone className="h-4 w-4" />
//                       Try again
//                     </Button>
//                     <Button
//                       variant="outline"
//                       onClick={handleClose}
//                       className="w-full h-9 text-[11px] rounded-xl"
//                     >
//                       Close
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* ── Ended ── */}
//               {phase === "ended" && (
//                 <div className="space-y-3">
//                   <div className="rounded-xl bg-muted border border-border px-4 py-3 text-center space-y-1">
//                     <p className="text-[12px] font-medium text-foreground/60">
//                       Your consultation has ended
//                     </p>
//                     <p className="text-[10px] text-muted-foreground">
//                       Duration: session complete
//                     </p>
//                   </div>
//                   <div className="space-y-2">
//                     <Button
//                       onClick={handleRetry}
//                       className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
//                     >
//                       <Phone className="h-4 w-4" />
//                       Reconnect with {doctorName}
//                     </Button>
//                     <Button
//                       variant="outline"
//                       onClick={handleClose}
//                       className="w-full h-9 text-[11px] rounded-xl"
//                     >
//                       Close
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* Trust footer */}
//               {["idle", "guest_form", "polling", "accepted"].includes(phase) && (
//                 <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground/50 pt-1">
//                   <ShieldCheck className="h-3 w-3" />
//                   HIPAA compliant · End-to-end encrypted
//                 </div>
//               )}
//             </div>
//           </div>
//         ) : (
//           // ── In-call view ────────────────────────────────────────────────────
//           <InCallView
//             doctor={doctor}
//             roomUrl={roomUrl}
//             dailyToken={dailyToken}
//             fullscreen={fullscreen}
//             setFullscreen={setFullscreen}
//             onMinimize={handleMinimize}
//             onEnd={handleEnd}
//           />
//         )}
//       </div>
//     </>,
//     document.body,
//   );
// };

// // ─── Control button ───────────────────────────────────────────────────────────

// interface CtrlBtnProps {
//   active: boolean;
//   icon: React.ReactNode;
//   onClick: () => void;
//   label: string;
//   danger?: boolean;
// }

// const CtrlBtn = ({
//   active,
//   icon,
//   onClick,
//   label,
//   danger = false,
// }: CtrlBtnProps) => (
//   <button
//     onClick={onClick}
//     title={label}
//     className={cn(
//       "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
//       danger
//         ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/30"
//         : active
//         ? "bg-white/20 hover:bg-white/30 text-white"
//         : "bg-destructive/75 hover:bg-destructive/90 text-white",
//     )}
//   >
//     {icon}
//   </button>
// );

// // ─── In-call view ─────────────────────────────────────────────────────────────

// interface InCallViewProps {
//   doctor: Doctor;
//   roomUrl: string | null;
//   dailyToken: string | null;
//   fullscreen: boolean;
//   setFullscreen: (v: boolean) => void;
//   onMinimize: () => void;
//   onEnd: () => void;
// }

// const InCallView = ({
//   doctor,
//   fullscreen,
//   setFullscreen,
//   onMinimize,
//   onEnd,
// }: InCallViewProps) => {
//   const call = useCallStore();
//   const [controlsVisible, setControlsVisible] = useState(true);
//   const [showVitals, setShowVitals]           = useState(false);
//   const [chatOpen, setChatOpen]               = useState(false);
//   const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const scheduleHide = () => {
//     if (hideTimer.current) clearTimeout(hideTimer.current);
//     if (!chatOpen) {
//       hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
//     }
//   };

//   const handleMouseMove = () => {
//     setControlsVisible(true);
//     scheduleHide();
//   };

//   useEffect(() => {
//     scheduleHide();
//     return () => {
//       if (hideTimer.current) clearTimeout(hideTimer.current);
//     };
//   }, [chatOpen]); // eslint-disable-line react-hooks/exhaustive-deps

//   const handleChatToggle = () => {
//     const next = !chatOpen;
//     setChatOpen(next);
//     if (next) call.clearUnread();
//   };

//   const chatWidth     = chatOpen ? 288 : 0;
//   const doctorName    = doctor.user.name;
//   const doctorInitial = nameInitial(doctorName);

//   return (
//     <div
//       className={cn(
//         "relative flex bg-[#0c0c0c] overflow-hidden dark",
//         fullscreen ? "h-screen w-screen" : "h-[480px]",
//       )}
//       onMouseMove={handleMouseMove}
//       onTouchStart={handleMouseMove}
//     >
//       {/* Video area */}
//       <div
//         className="relative flex-1 flex flex-col transition-all duration-300 min-w-0"
//         style={{ marginRight: chatWidth }}
//       >
//         {/* Doctor feed placeholder */}
//         <div className="absolute inset-0 flex items-center justify-center">
//           <div className="text-center space-y-3">
//             <div className="relative mx-auto w-[88px] h-[88px]">
//               <div
//                 className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping"
//                 style={{ animationDuration: "2s" }}
//               />
//               <div className="relative h-[88px] w-[88px] rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-3xl font-bold ring-[1.5px] ring-emerald-500/30 select-none">
//                 {doctorInitial}
//               </div>
//             </div>
//             <div className="space-y-0.5">
//               <p className="text-[14px] font-semibold text-white/90">
//                 {doctorName}
//               </p>
//               {doctor.specialization && (
//                 <p className="text-[11px] text-white/35">
//                   {doctor.specialization}
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Vitals overlay */}
//         {showVitals && (
//           <div className="absolute bottom-[72px] left-3 right-3 z-10">
//             <VitalsChart />
//           </div>
//         )}

//         {/* Self PiP */}
//         <div
//           className={cn(
//             "absolute right-3 w-[108px] rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden flex items-center justify-center shadow-xl transition-all duration-300",
//             showVitals
//               ? "bottom-[calc(72px+100px+12px)]"
//               : "bottom-[72px]",
//           )}
//           style={{ aspectRatio: "16/9" }}
//         >
//           <div className="text-[10px] text-white/30 font-medium select-none">
//             You
//           </div>
//           {!call.videoEnabled && (
//             <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
//               <VideoOff className="h-3.5 w-3.5 text-white/25" />
//             </div>
//           )}
//         </div>

//         {/* Top bar */}
//         <div
//           className={cn(
//             "absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2.5 z-20",
//             "bg-gradient-to-b from-black/55 to-transparent",
//             "transition-opacity duration-500",
//             controlsVisible ? "opacity-100" : "opacity-0",
//           )}
//         >
//           <div className="flex items-center gap-2">
//             <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
//             <span className="text-[10px] text-white/70 font-mono tracking-wide">
//               LIVE · {fmt(call.elapsed)}
//             </span>
//           </div>
//           <div className="flex items-center gap-2">
//             <SignalBars strength={call.signalStrength} />
//             <div className="flex items-center gap-1">
//               <button
//                 onClick={onMinimize}
//                 title="Minimize"
//                 className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
//               >
//                 <Minus className="h-3.5 w-3.5" />
//               </button>
//               <button
//                 onClick={() => setFullscreen(!fullscreen)}
//                 title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
//                 className="h-7 w-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
//               >
//                 {fullscreen ? (
//                   <Minimize2 className="h-3.5 w-3.5" />
//                 ) : (
//                   <Maximize2 className="h-3.5 w-3.5" />
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Bottom controls */}
//         <div
//           className={cn(
//             "absolute bottom-0 inset-x-0 flex items-center justify-center gap-2.5 px-4 py-3 z-20",
//             "bg-gradient-to-t from-black/65 to-transparent",
//             "transition-opacity duration-500",
//             controlsVisible
//               ? "opacity-100"
//               : "opacity-0 pointer-events-none",
//           )}
//         >
//           <CtrlBtn
//             active={call.audioEnabled}
//             icon={
//               call.audioEnabled ? (
//                 <Mic className="h-4 w-4" />
//               ) : (
//                 <MicOff className="h-4 w-4" />
//               )
//             }
//             onClick={call.toggleAudio}
//             label={call.audioEnabled ? "Mute" : "Unmute"}
//           />
//           <CtrlBtn
//             active={call.videoEnabled}
//             icon={
//               call.videoEnabled ? (
//                 <Video className="h-4 w-4" />
//               ) : (
//                 <VideoOff className="h-4 w-4" />
//               )
//             }
//             onClick={call.toggleVideo}
//             label={call.videoEnabled ? "Stop video" : "Start video"}
//           />

//           <div className="relative">
//             <CtrlBtn
//               active={chatOpen}
//               icon={<MessageSquare className="h-4 w-4" />}
//               onClick={handleChatToggle}
//               label={chatOpen ? "Close chat" : "Open chat"}
//             />
//             {call.unreadCount > 0 && !chatOpen && (
//               <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none leading-none">
//                 {call.unreadCount > 9 ? "9+" : call.unreadCount}
//               </span>
//             )}
//           </div>

//           <CtrlBtn
//             active={showVitals}
//             icon={<Activity className="h-4 w-4" />}
//             onClick={() => setShowVitals((v) => !v)}
//             label={showVitals ? "Hide vitals" : "Show vitals"}
//           />

//           <button
//             onClick={onEnd}
//             title="End call"
//             className="h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/35"
//           >
//             <PhoneOff className="h-[18px] w-[18px]" />
//           </button>
//         </div>
//       </div>

//       {/* Chat panel */}
//       <div
//         className={cn(
//           "absolute top-0 right-0 h-full flex flex-col z-30",
//           "bg-card border-l border-border",
//           "transition-all duration-300 ease-in-out",
//           chatOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden",
//         )}
//       >
//         {chatOpen && (
//           <ChatPanel
//             open={chatOpen}
//             onClose={() => setChatOpen(false)}
//             doctorAvatar={doctorInitial}
//             doctorName={doctorName}
//           />
//         )}
//       </div>
//     </div>
//   );
// };


// components/ConnectDialog.tsx
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ChatPanel } from "@/components/ChatPanel";
import { cn } from "@/lib/utils";
import { useMe } from "@/hooks/useAuth";
import {
  useInstantConsultationRequest,
  useInstantConsultationStatus,
  type InstantConsultationRequestPayload,
} from "@/hooks/patient/use-instant-consultations";
import {
  Maximize2,
  Minimize2,
  Minus,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Wifi,
  ArrowRight,
  Sparkles,
  Activity,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallPhase =
  | "idle"
  | "guest_form"
  | "requesting"
  | "polling"
  | "accepted" 
  | "in_progress"
  | "connected"
  | "rejected"
  | "failed"
  | "ended";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Returns up to 2 uppercase initials from a display name. */
const nameInitial = (name: string): string =>
  name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

// ─── Signal Bars ──────────────────────────────────────────────────────────────

const SignalBars = ({ strength }: { strength: number }) => (
  <div className="flex items-end gap-0.5 h-4">
    {[1, 2, 3, 4].map((b) => (
      <div
        key={b}
        style={{ height: `${b * 4}px` }}
        className={cn(
          "w-1 rounded-sm transition-colors",
          b <= strength
            ? "bg-emerald-500 dark:bg-emerald-400"
            : "bg-foreground/10",
        )}
      />
    ))}
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ phase }: { phase: CallPhase }) => {
  const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    requesting: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "Requesting..",
      cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    },
    polling: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: "Waiting for doctor..",
      cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
    },
    accepted: {
      icon: <Phone className="h-3 w-3 animate-pulse" />,
      text: "Doctor ready",
      cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    },
    in_progress: {
  icon: <Activity className="h-3 w-3 animate-pulse" />,
  text: "In progress",
  cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
},
    connected: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      text: "Connected",
      cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    },
    rejected: {
      icon: <AlertCircle className="h-3 w-3" />,
      text: "Declined",
      cls: "bg-destructive/10 text-destructive border-destructive/25",
    },
    failed: {
      icon: <AlertCircle className="h-3 w-3" />,
      text: "Failed",
      cls: "bg-destructive/10 text-destructive border-destructive/25",
    },
    ended: {
      icon: <PhoneOff className="h-3 w-3" />,
      text: "Ended",
      cls: "bg-muted text-muted-foreground border-border",
    },
  };
  const c = map[phase];
  if (!c) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
        c.cls,
      )}
    >
      {c.icon}
      {c.text}
    </span>
  );
};

// ─── Device Toggles ───────────────────────────────────────────────────────────

const DeviceToggles = ({ compact = false }: { compact?: boolean }) => {
  const call = useCallStore();

  if (compact) {
    return (
      <div className="flex gap-2">
        <button
          onClick={call.toggleVideo}
          className={cn(
            "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
            call.videoEnabled
              ? "bg-primary/10 text-primary border-primary/25"
              : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
          )}
        >
          {call.videoEnabled ? (
            <Video className="h-3.5 w-3.5" />
          ) : (
            <VideoOff className="h-3.5 w-3.5" />
          )}
          {call.videoEnabled ? "Camera on" : "Camera off"}
        </button>
        <button
          onClick={call.toggleAudio}
          className={cn(
            "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150",
            call.audioEnabled
              ? "bg-primary/10 text-primary border-primary/25"
              : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
          )}
        >
          {call.audioEnabled ? (
            <Mic className="h-3.5 w-3.5" />
          ) : (
            <MicOff className="h-3.5 w-3.5" />
          )}
          {call.audioEnabled ? "Mic on" : "Mic off"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={call.toggleVideo}
          className={cn(
            "flex-1 flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border transition-all duration-150",
            call.videoEnabled
              ? "bg-primary/10 text-primary border-primary/25 ring-1 ring-primary/20"
              : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
          )}
        >
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
              call.videoEnabled ? "bg-primary/20" : "bg-muted-foreground/10",
            )}
          >
            {call.videoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-[11px] font-semibold leading-none">Camera</p>
            <p
              className={cn(
                "text-[10px] leading-none",
                call.videoEnabled ? "text-primary/70" : "text-muted-foreground/50",
              )}
            >
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
              : "bg-muted text-muted-foreground border-border hover:border-border/80 hover:text-foreground/60",
          )}
        >
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
              call.audioEnabled ? "bg-primary/20" : "bg-muted-foreground/10",
            )}
          >
            {call.audioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-[11px] font-semibold leading-none">Microphone</p>
            <p
              className={cn(
                "text-[10px] leading-none",
                call.audioEnabled ? "text-primary/70" : "text-muted-foreground/50",
              )}
            >
              {call.audioEnabled ? "On" : "Off"}
            </p>
          </div>
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center">
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

// ─── ConnectDialog ────────────────────────────────────────────────────────────

interface ConnectDialogProps {
  /** Slim Doctor shape from CallStore — built by DoctorCard from ApiDoctor */
  doctor: Doctor;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const ConnectDialog = ({
  doctor,
  open,
  onOpenChange,
}: ConnectDialogProps) => {
  const call = useCallStore();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const { data: me } = useMe();
  const isLoggedIn = !!me;

  // A logged-in user is "complete" only if they have both name and phone.
  const isProfileComplete = isLoggedIn && !!me?.name && !!me?.phone;

  // ── Local state ───────────────────────────────────────────────────────────
  const [phase, setPhase]           = useState<CallPhase>("idle");
  const [fullscreen, setFullscreen] = useState(false);

  // Guest / supplemental form fields
  const [guestName, setGuestName]   = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);

  // Consultation state from API
  const [consultationToken, setConsultationToken] = useState<string | null>(null);
  const [queueInfo, setQueueInfo] = useState<{
    position: number;
    ahead: number;
  } | null>(null);
  const [roomUrl, setRoomUrl]       = useState<string | null>(null);
  const [dailyToken, setDailyToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  // ── API hooks ─────────────────────────────────────────────────────────────
  const requestMutation = useInstantConsultationRequest();
  const { data: statusData } = useInstantConsultationStatus(
    consultationToken,
    phase === "polling",
  );

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setPhase(isProfileComplete ? "idle" : "guest_form");
      setFullscreen(false);
      setGuestName(me?.name ?? "");
      setGuestPhone(me?.phone ?? "");
      setGuestError(null);
      setConsultationToken(null);
      setQueueInfo(null);
      setRoomUrl(null);
      setDailyToken(null);
      setErrorMsg(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Promote guest_form → idle if user logs in with complete profile ────────
  useEffect(() => {
    if (open && phase === "guest_form" && isProfileComplete) {
      setGuestName(me?.name ?? "");
      setGuestPhone(me?.phone ?? "");
      setPhase("idle");
    }
  }, [isLoggedIn, me]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to poll results ─────────────────────────────────────────────────
  useEffect(() => {
    if (!statusData || phase !== "polling") return;

    setQueueInfo({
      position: Number(statusData.queue_position),
      ahead: statusData.people_ahead,
    });

    console.info("[Poll] statusData:", JSON.stringify(statusData));
    if (statusData.status === "accepted" || statusData.status === "in_progress") {
      setRoomUrl(statusData.room_url ?? null);
      setDailyToken(statusData.daily_guest_token ?? null);
      setPhase(statusData.status === "in_progress" ? "in_progress" : "accepted");
    } else if (
      statusData.status === "rejected" ||
      statusData.status === "cancelled"
    ) {
      setPhase("rejected");
    }
  }, [statusData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send consultation request ─────────────────────────────────────────────
  const handleRequest = async (override?: { name: string; phone: string }) => {
    setPhase("requesting");
    setErrorMsg(null);

    try {
      const name  = override?.name  ?? me?.name  ?? guestName;
      const phone = override?.phone ?? me?.phone ?? guestPhone;

      const payload: InstantConsultationRequestPayload = {
        doctor_id:   doctor.id,
        guest_name:  name,
        guest_phone: phone,
      };

      const res = await requestMutation.mutateAsync(payload);
      setConsultationToken(res.guest_token);
      setQueueInfo({
        position: Number(res.queue_position),
        ahead: res.people_ahead,
      });
      setPhase("polling");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Request failed. Please try again.",
      );
      setPhase("failed");
    }
  };

  // ── Guest form submit ─────────────────────────────────────────────────────
  const handleGuestSubmit = () => {
    if (!guestName.trim()) {
      setGuestError("Please enter your name.");
      return;
    }
    if (!guestPhone.trim()) {
      setGuestError("Please enter your phone number.");
      return;
    }
    setGuestError(null);
    handleRequest({ name: guestName.trim(), phone: guestPhone.trim() });
  };

  // ── Join the call — transition to connected with real room data ───────────
const handleJoin = () => {
  if (!roomUrl || !dailyToken) return;
  const roomName = roomUrl.split('/consultation/').pop() ?? roomUrl;
  window.location.href = `/consultation/${roomName}?t=${encodeURIComponent(dailyToken)}`;
};

  // ── Close / end ───────────────────────────────────────────────────────────
  const handleClose = () => {
    onOpenChange(false);
    if (phase === "ended") call.setDialogOpen(false);
  };

  const handleEnd = () => {
    call.endCall();
    setPhase("ended");
  };

  const handleMinimize = () => call.setMinimized(true);

  // ── Retry helper ──────────────────────────────────────────────────────────
  const handleRetry = () => {
    if (isProfileComplete) {
      handleRequest();
    } else {
      setPhase("guest_form");
    }
  };

  if (!open) return null;

  // ── Derived display values ────────────────────────────────────────────────
  const doctorName    = doctor.user.name;
  const doctorInitial = nameInitial(doctorName);

  const titleText = (): string => {
    if (phase === "idle")       return "Instant consult";
    if (phase === "guest_form") return "Your details";
    if (phase === "requesting") return "Sending request…";
    if (phase === "polling")    return "Waiting for doctor";
    if (phase === "accepted")   return "Doctor is ready";
    if (phase === "in_progress") return "Doctor is in call";
    if (phase === "connected")  return "In consultation";
    if (phase === "rejected")   return "Request declined";
    if (phase === "failed")     return "Connection failed";
    if (phase === "ended")      return "Call ended";
    return "Instant consult";
  };

  const progressValue = (): number => {
    if (phase === "requesting") return 30;
    if (phase === "polling")    return 65;
    if (phase === "accepted")   return 80;
    if (phase === "in_progress") return 100;
    return 0;
  };

  const showProgress = ["requesting", "polling", "accepted", "in_progress"].includes(phase);


  return createPortal(
    <>
      {!fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      <div
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden transition-all duration-300",
          fullscreen
            ? "inset-0 rounded-none"
            : [
                "rounded-2xl shadow-2xl",
                "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                phase === "connected"
                  ? "w-[860px] max-w-[95vw]"
                  : "w-[400px] max-w-[95vw]",
              ],
        )}
      >
        {phase !== "connected" ? (
          // ── Pre-call panel ────────────────────────────────────────────────
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[12px] font-semibold text-foreground/80">
                  {titleText()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFullscreen(!fullscreen)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {fullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={handleClose}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Doctor card — hidden on guest_form */}
              {phase !== "guest_form" && (
                <div
                  className={cn(
                    "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all",
                    showProgress
                      ? "border-primary/20 bg-primary/5"
                      : "border-border bg-muted/50",
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold select-none">
                      {doctorInitial}
                    </div>
                    {showProgress && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {doctorName}
                    </p>
                    {doctor.specialization && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {doctor.specialization}
                      </p>
                    )}
                    {queueInfo && phase === "polling" && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Position {queueInfo.position} ·{" "}
                        {queueInfo.ahead === 0
                          ? "You're next"
                          : `${queueInfo.ahead} ahead`}
                      </p>
                    )}
                  </div>
                  {phase !== "idle" && <StatusBadge phase={phase} />}
                </div>
              )}

              {/* Progress bar */}
              {showProgress && (
                <div className="space-y-2">
                  <Progress
                    value={progressValue()}
                    className="h-[3px] bg-muted [&>div]:bg-primary [&>div]:transition-all [&>div]:duration-700"
                  />
                  <p className="text-[10px] text-muted-foreground text-center">
                    {phase === "requesting" && "Sending consultation request…"}
                    {phase === "polling"    && "Waiting for doctor to accept…"}
                    {phase === "accepted"   && "Doctor is ready — join when you are!"}
                  </p>
                </div>
              )}

              {/* ── Guest / contact-incomplete form ── */}
              {phase === "guest_form" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      {isLoggedIn
                        ? "Please confirm your contact details to continue."
                        : "You're not logged in. Please enter your details to continue."}
                    </p>
                  </div>

                  {/* Show which doctor they're requesting */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-sm font-bold select-none shrink-0">
                      {doctorInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {doctorName}
                      </p>
                      {doctor.specialization && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {doctor.specialization}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium">Full name</Label>
                      <Input
                        placeholder="e.g. Alain Honore"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="h-9 text-[12px]"
                        onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium">Phone number</Label>
                      <Input
                        placeholder="e.g. 0733334512"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="h-9 text-[12px]"
                        onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                      />
                    </div>
                    {guestError && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {guestError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleGuestSubmit}
                      className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
                    >
                      <Wifi className="h-4 w-4" />
                      Request consultation
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full h-9 text-[11px] rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Idle CTA (logged-in with complete profile) ── */}
              {phase === "idle" && (
                <div className="space-y-2 pt-1">
                  <DeviceToggles compact={false} />
                  <Button
                    onClick={() => handleRequest()}
                    className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
                  >
                    <Wifi className="h-4 w-4" />
                    Start instant consultation
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="w-full h-9 text-[11px] rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* ── Polling — wait with device toggles ── */}
              {phase === "polling" && (
                <div className="space-y-3">
                  <DeviceToggles compact={true} />
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="w-full h-9 text-[11px] rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* ── Accepted / In Progress — join CTA ── */}
              {(phase === "accepted" || phase === "in_progress") && (
                <div className="space-y-3">
                  <DeviceToggles compact={true} />
                  <div className="space-y-2 pt-1">
                    <Button
                      onClick={handleJoin}
                      className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Phone className="h-4 w-4" />
                      Join call
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full h-9 text-[11px] rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Failed / rejected ── */}
              {(phase === "failed" || phase === "rejected") && (
                <div className="space-y-3">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-[11px] text-destructive flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {errorMsg}
                    </div>
                  )}
                  {phase === "rejected" && (
                    <div className="p-3 rounded-xl bg-muted border border-border text-center text-[11px] text-muted-foreground">
                      The doctor is currently unavailable. Please try again
                      later or book an appointment.
                    </div>
                  )}
                  <div className="space-y-2 pt-1">
                    <Button
                      onClick={handleRetry}
                      className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
                    >
                      <Phone className="h-4 w-4" />
                      Try again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full h-9 text-[11px] rounded-xl"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Ended ── */}
              {phase === "ended" && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-muted border border-border px-4 py-3 text-center space-y-1">
                    <p className="text-[12px] font-medium text-foreground/60">
                      Your consultation has ended
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Duration: session complete
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={handleRetry}
                      className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
                    >
                      <Phone className="h-4 w-4" />
                      Reconnect with {doctorName}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full h-9 text-[11px] rounded-xl"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}

              {/* Trust footer */}
              {["idle", "guest_form", "polling", "accepted", "in_progress"].includes(phase) && (
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground/50 pt-1">
                  <ShieldCheck className="h-3 w-3" />
                  HIPAA compliant · End-to-end encrypted
                </div>
              )}
            </div>
          </div>
        ) : (
          // ── In-call view (Daily.co iframe) ────────────────────────────────
          <InCallView
            doctor={doctor}
            roomUrl={roomUrl}
            dailyToken={dailyToken}
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
            onMinimize={handleMinimize}
            onEnd={handleEnd}
          />
        )}
      </div>
    </>,
    document.body,
  );
};

// ─── In-call view ─────────────────────────────────────────────────────────────

interface InCallViewProps {
  doctor: Doctor;
  roomUrl: string | null;
  dailyToken: string | null;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  onMinimize: () => void;
  onEnd: () => void;
}

const InCallView = ({
  doctor,
  roomUrl,
  dailyToken,
  fullscreen,
  setFullscreen,
  onMinimize,
  onEnd,
}: InCallViewProps) => {
  const call = useCallStore();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [chatOpen, setChatOpen]               = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 4000);
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChatToggle = () => {
    const next = !chatOpen;
    setChatOpen(next);
    if (next) call.clearUnread();
    // Keep controls visible while chat is open
    if (next && hideTimer.current) {
      clearTimeout(hideTimer.current);
    } else {
      scheduleHide();
    }
  };

  const doctorName    = doctor.user.name;
  const doctorInitial = nameInitial(doctorName);
  const chatWidth     = chatOpen ? 288 : 0;

  // Build the Daily.co iframe src — token is passed as the `t` query param
  // which Daily recognises as the meeting token for guest access.
  const roomName = roomUrl?.split('/consultation/').pop();
  const iframeSrc =
    roomName && dailyToken
      ? `${window.location.origin}/consultation/${roomName}?t=${encodeURIComponent(dailyToken)}`
      : null;


  return (
    <div
      className={cn(
        "relative flex bg-[#0c0c0c] overflow-hidden",
        fullscreen ? "h-screen w-screen" : "h-[580px]",
      )}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* ── Daily.co iframe ─────────────────────────────────────────────── */}
      <div
        className="relative flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginRight: chatWidth }}
      >
        {iframeSrc ? (
          <iframe
            src={iframeSrc}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            title={`Consultation with ${doctorName}`}
          />
        ) : (
          // Fallback — should rarely be seen
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="relative mx-auto w-[88px] h-[88px]">
                <div
                  className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <div className="relative h-[88px] w-[88px] rounded-full bg-[#1e2a26] text-white/85 flex items-center justify-center text-3xl font-bold ring-[1.5px] ring-emerald-500/30 select-none">
                  {doctorInitial}
                </div>
              </div>
              <p className="text-[13px] text-white/50">Connecting to room…</p>
            </div>
          </div>
        )}

        {/* ── Overlay top bar (minimize / fullscreen / timer) ────────────── */}
        {/* Sits above the iframe; pointer-events only on the buttons */}
        <div
          className={cn(
            "absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2.5 z-20 pointer-events-none",
            "bg-gradient-to-b from-black/60 to-transparent",
            "transition-opacity duration-500",
            controlsVisible ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Live timer */}
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-white/70 font-mono tracking-wide">
              LIVE · {fmt(call.elapsed)}
            </span>
          </div>

          {/* Window controls */}
          <div className="flex items-center gap-1 pointer-events-auto">
            <SignalBars strength={call.signalStrength} />
            <button
              onClick={onMinimize}
              title="Minimize"
              className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
            >
              {fullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* ── Overlay bottom bar (chat + end call) ───────────────────────── */}
        {/* Daily owns mic/camera/grid controls inside the iframe.           */}
        {/* We only expose chat sidebar and end-call here.                   */}
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-3 z-20",
            "bg-gradient-to-t from-black/65 to-transparent pointer-events-none",
            "transition-opacity duration-500",
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {/* Chat toggle */}
          <div className="relative pointer-events-auto">
            <button
              onClick={handleChatToggle}
              title={chatOpen ? "Close chat" : "Open chat"}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90",
                chatOpen
                  ? "bg-white/20 hover:bg-white/30 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white",
              )}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            {call.unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center pointer-events-none leading-none">
                {call.unreadCount > 9 ? "9+" : call.unreadCount}
              </span>
            )}
          </div>

          {/* End call */}
          <button
            onClick={onEnd}
            title="End call"
            className="pointer-events-auto h-11 w-11 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-red-500/35"
          >
            <PhoneOff className="h-[18px] w-[18px]" />
          </button>

          {/* Spacer to balance layout */}
          <div className="w-10" />
        </div>
      </div>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      {/* Uses bg-card so it follows the light/dark theme of the app       */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full flex flex-col z-30",
          "bg-card border-l border-border",
          "transition-all duration-300 ease-in-out",
          chatOpen ? "w-72 opacity-100" : "w-0 opacity-0 overflow-hidden",
        )}
      >
        {chatOpen && (
          <ChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            doctorAvatar={doctorInitial}
            doctorName={doctorName}
          />
        )}
      </div>
    </div>
  );
};
