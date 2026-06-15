// import { useState, useEffect } from "react";
// import { createPortal } from "react-dom";
// import { Clock3, Phone, PhoneOff, CheckCircle2, LogIn, X, Mic, MicOff, Video, VideoOff } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { type InstantConsultQueueItem } from "@/hooks/doctor/use-doctor-appointment";
// import { Loader2 } from "lucide-react";
// import { useCallStore } from "@/context/CallStore";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Props {
//   item: InstantConsultQueueItem;
//   onAccept?: () => void;
//   onDecline?: () => void;
//   onJoin?: () => void;
//   onComplete?: () => void;
//   isAccepting?: boolean;
//   isDeclining?: boolean;
//   isJoining?: boolean;
//   isCompleting?: boolean;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function fmtSeconds(seconds: number): string {
//   const s = Math.round(seconds);
//   if (s < 60) return `${s}s`;
//   const m = Math.floor(s / 60);
//   if (m < 60) return `${m}m ${s % 60}s`;
//   const h = Math.floor(m / 60);
//   return `${h}h ${m % 60}m`;
// }

// function phoneAvatar(phone: string): string {
//   const digits = phone.replace(/\D/g, "");
//   return digits.length >= 2 ? digits.slice(-2) : phone.slice(0, 2).toUpperCase();
// }

// // ─── Status badge config ──────────────────────────────────────────────────────

// const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
//   pending:     { label: "Pending",     cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
//   confirmed:   { label: "Paid ✓",      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
//   accepted:    { label: "Accepted",    cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
//   in_progress: { label: "In Session",  cls: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
//   declined:    { label: "Declined",    cls: "bg-red-500/10 text-red-500 border-red-500/20" },
//   withdrawn:   { label: "Withdrawn",   cls: "bg-muted text-muted-foreground border-border" },
//   expired:     { label: "Expired",     cls: "bg-muted text-muted-foreground border-border" },
//   completed:   { label: "Completed",   cls: "bg-muted text-muted-foreground border-border" },
// };

// // ─── Device Toggles ───────────────────────────────────────────────────────────

// const DeviceToggles = () => {
//   const call = useCallStore();
//   return (
//     <div className="flex gap-2">
//       <button
//         onClick={call.toggleVideo}
//         className={cn(
//           "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all",
//           call.videoEnabled
//             ? "bg-primary/10 text-primary border-primary/25"
//             : "bg-muted text-muted-foreground border-border",
//         )}
//       >
//         {call.videoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
//         {call.videoEnabled ? "Camera on" : "Camera off"}
//       </button>
//       <button
//         onClick={call.toggleAudio}
//         className={cn(
//           "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-lg text-[11px] font-medium border transition-all",
//           call.audioEnabled
//             ? "bg-primary/10 text-primary border-primary/25"
//             : "bg-muted text-muted-foreground border-border",
//         )}
//       >
//         {call.audioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
//         {call.audioEnabled ? "Mic on" : "Mic off"}
//       </button>
//     </div>
//   );
// };

// // ─── Pre-call Modal ───────────────────────────────────────────────────────────

// interface PreCallModalProps {
//   item: InstantConsultQueueItem;
//   onJoin?: () => void;
//   onClose: () => void;
//   isJoining?: boolean;
// }

// const PreCallModal = ({ item, onJoin, onClose, isJoining }: PreCallModalProps) => {
//   return createPortal(
//     <>
//       {/* Backdrop */}
//       <div
//         className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
//         onClick={onClose}
//       />

//       {/* Modal */}
//       <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] max-w-[95vw]">
//         <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">

//           {/* Header */}
//           <div className="flex items-center justify-between px-4 py-3 border-b border-border">
//             <div className="flex items-center gap-2">
//               <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
//               <span className="text-[12px] font-semibold text-foreground/80">
//                 Ready to join
//               </span>
//             </div>
//             <button
//               onClick={onClose}
//               className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//             >
//               <X className="h-3.5 w-3.5" />
//             </button>
//           </div>

//           <div className="p-5 space-y-4">
//             {/* Patient info */}
//             <div className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
//               <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold select-none shrink-0">
//                 {phoneAvatar(item.guest_phone)}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-[13px] font-semibold text-foreground font-mono">
//                   {item.guest_phone}
//                 </p>
//                 <p className="text-[11px] text-muted-foreground truncate mt-0.5">
//                   {item.description ?? "No description"}
//                 </p>
//               </div>
//             </div>

//             {/* Device toggles */}
//             <DeviceToggles />

//             {/* Join button */}
//             <button
//               onClick={onJoin}
//               disabled={isJoining}
//               className="w-full h-10 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-[12px] font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
//             >
//               {isJoining
//                 ? <Loader2 className="h-4 w-4 animate-spin" />
//                 : <LogIn className="h-4 w-4" />}
//               Join consultation
//             </button>

//             <button
//               onClick={onClose}
//               className="w-full h-9 rounded-xl border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       </div>
//     </>,
//     document.body,
//   );
// };

// // ─── IncomingCard ─────────────────────────────────────────────────────────────

// export function IncomingCard({
//   item,
//   onAccept,
//   onDecline,
//   onJoin,
//   onComplete,
//   isAccepting,
//   isDeclining,
//   isJoining,
//   isCompleting,
// }: Props) {
//   const [elapsed,      setElapsed]      = useState(item.waiting_seconds);
//   const [preCallOpen,  setPreCallOpen]  = useState(false);

//   useEffect(() => {
//     setElapsed(item.waiting_seconds);
//     const t = setInterval(() => setElapsed((s) => s + 1), 1000);
//     return () => clearInterval(t);
//   }, [item.waiting_seconds]);

//   const isBusy     = isAccepting || isDeclining || isJoining || isCompleting;
//   const badge      = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
//   const isInactive = ["declined", "withdrawn", "expired", "completed"].includes(item.status);

//   return (
//     <>
//       <div className={cn(
//         "rounded-xl border bg-card p-4 transition-all duration-200",
//         isInactive
//           ? "border-border/40 opacity-50"
//           : item.status === "accepted"
//             ? "border-blue-500/30 bg-blue-500/5"
//             : item.status === "in_progress"
//               ? "border-violet-500/30 bg-violet-500/5"
//               : "border-border hover:border-border/80 hover:shadow-md",
//       )}>
//         <div className="flex items-center gap-3">

//           {/* Avatar */}
//           <div className="relative shrink-0">
//             <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold font-mono select-none">
//               {phoneAvatar(item.guest_phone)}
//             </div>
//             <span className="absolute -bottom-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border border-background">
//               {item.queue_position}
//             </span>
//           </div>

//           {/* Info */}
//           <div className="flex-1 min-w-0">
//             <div className="flex items-center gap-2 flex-wrap">
//               <p className="text-[13px] font-semibold text-foreground font-mono tracking-wide">
//                 {item.guest_phone}
//               </p>
//               <span className={cn(
//                 "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border",
//                 badge.cls,
//               )}>
//                 {badge.label}
//               </span>
//             </div>
//             <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
//               {item.description ?? "No description"}
//             </p>
//             <div className="flex items-center gap-1 mt-1">
//               <Clock3 className="h-3 w-3 text-muted-foreground/50" />
//               <span className="text-[10px] text-muted-foreground">
//                 Waiting {fmtSeconds(elapsed)}
//               </span>
//             </div>
//           </div>

//           {/* Actions */}
//           <div className="flex items-center gap-2 shrink-0">

//             {/* CONFIRMED → Decline + Accept */}
//             {item.status === "confirmed" && (
//               <>
//                 <button
//                   onClick={onDecline}
//                   disabled={isBusy}
//                   title="Decline"
//                   className="h-9 w-9 rounded-full border border-border bg-background hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950/30 text-muted-foreground flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
//                 >
//                   {isDeclining
//                     ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                     : <PhoneOff className="h-4 w-4" />}
//                 </button>
//                 <button
//                   onClick={onAccept}
//                   disabled={isBusy}
//                   className="h-9 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
//                 >
//                   {isAccepting
//                     ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                     : <Phone className="h-3.5 w-3.5" />}
//                   Accept
//                 </button>
//               </>
//             )}

//             {/* ACCEPTED → Preview button opens modal */}
//             {item.status === "accepted" && (
//               <button
//                 onClick={() => setPreCallOpen(true)}
//                 disabled={isBusy}
//                 className="h-9 px-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
//               >
//                 <LogIn className="h-3.5 w-3.5" />
//                 Preview
//               </button>
//             )}

//             {/* IN_PROGRESS / JOINED → Mark Complete */}
//             {(item.status === "in_progress") && (
//               <button
//                 onClick={onComplete}
//                 disabled={isBusy}
//                 className="h-9 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
//               >
//                 {isCompleting
//                   ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                   : <CheckCircle2 className="h-3.5 w-3.5" />}
//                 Complete
//               </button>
//             )}

//           </div>
//         </div>
//       </div>

//       {/* Pre-call modal */}
//       {preCallOpen && (
//         <PreCallModal
//           item={item}
//           onJoin={() => {
//             setPreCallOpen(false);
//             onJoin?.();
//           }}
//           onClose={() => setPreCallOpen(false)}
//           isJoining={isJoining}
//         />
//       )}
//     </>
//   );
// }

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Clock3, Phone, PhoneOff, CheckCircle2, LogIn, X, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { type InstantConsultQueueItem } from "@/hooks/doctor/use-doctor-appointment";
import { Loader2 } from "lucide-react";
import { useCallStore } from "@/context/CallStore";
import { t } from "i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  item: InstantConsultQueueItem;
  onAccept?: () => void;
  onDecline?: () => void;
  onJoin?: () => void;
  onComplete?: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  isJoining?: boolean;
  isCompleting?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function phoneAvatar(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(-2) : phone.slice(0, 2).toUpperCase();
}

// ─── Status badge config ──────────────────────────────────────────────────────
// All colours mapped to MediConnect CSS token variables from index.css

const STATUS_BADGE: Record<string, { label: string; dotCls: string; cls: string }> = {
  pending: {
    label: "Pending",
    dotCls: "bg-[hsl(var(--warning))]",
    cls: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.25)]",
  },
  confirmed: {
    label: "Paid ✓",
    dotCls: "bg-[hsl(var(--success))]",
    cls: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]",
  },
  accepted: {
    label: "Accepted",
    dotCls: "bg-primary",
    cls: "bg-accent text-accent-foreground border-primary/25",
  },
  in_progress: {
    label: "In Session",
    dotCls: "bg-[hsl(var(--info))]",
    cls: "bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.25)]",
  },
  declined: {
    label: "Declined",
    dotCls: "bg-destructive",
    cls: "bg-destructive/10 text-destructive border-destructive/20",
  },
  withdrawn: {
    label: "Withdrawn",
    dotCls: "bg-muted-foreground/40",
    cls: "bg-muted text-muted-foreground border-border",
  },
  expired: {
    label: "Expired",
    dotCls: "bg-muted-foreground/40",
    cls: "bg-muted text-muted-foreground border-border",
  },
  completed: {
    label: "Completed",
    dotCls: "bg-muted-foreground/40",
    cls: "bg-muted text-muted-foreground border-border",
  },
};

// ─── Device Toggles ───────────────────────────────────────────────────────────

const DeviceToggles = () => {
  const call = useCallStore();
  return (
    <div className="flex gap-2">
      <button
        onClick={call.toggleVideo}
        className={cn(
          "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-[5px] text-[11px] font-medium border transition-all",
          call.videoEnabled
            ? "bg-primary/10 text-primary border-primary/25"
            : "bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
        )}
      >
        {call.videoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
        {call.videoEnabled ? t('consult.booking.camera_on') : t('consult.booking.camera_off')}
      </button>
      <button
        onClick={call.toggleAudio}
        className={cn(
          "flex items-center gap-2 flex-1 justify-center px-3 py-2 rounded-[5px] text-[11px] font-medium border transition-all",
          call.audioEnabled
            ? "bg-primary/10 text-primary border-primary/25"
            : "bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground",
        )}
      >
        {call.audioEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
        {call.audioEnabled ? t('consult.booking.mic_on') : t('consult.booking.mic_off')}
      </button>
    </div>
  );
};

// ─── Pre-call Modal ───────────────────────────────────────────────────────────

interface PreCallModalProps {
  item: InstantConsultQueueItem;
  onJoin?: () => void;
  onClose: () => void;
  isJoining?: boolean;
}

const PreCallModal = ({ item, onJoin, onClose, isJoining }: PreCallModalProps) => {
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] max-w-[95vw]">
        <div className="bg-card border border-border rounded-[5px] overflow-hidden shadow-large">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold text-foreground/80 tracking-wide uppercase">
                {t('consult.bookings.ready_to_join')}
              </span>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-[5px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Patient info */}
            <div className="flex items-center gap-3 p-3.5 rounded-[5px] border border-primary/20 bg-accent/50">
              <div className="h-11 w-11 rounded-[5px] bg-primary/15 text-primary flex items-center justify-center text-base font-bold select-none shrink-0">
                {phoneAvatar(item.guest_phone)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground font-mono">
                  {item.guest_phone}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {item.description ?? t('consult.bookings.no_description')}
                </p>
              </div>
            </div>

            {/* Device toggles */}
            <DeviceToggles />

            {/* Join button */}
            <button
              onClick={onJoin}
              disabled={isJoining}
              className="w-full h-10 rounded-[5px] bg-primary hover:bg-[hsl(var(--primary-glow))] text-primary-foreground text-[11px] font-semibold flex items-center justify-center gap-2 transition-smooth shadow-medium active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isJoining
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <LogIn className="h-4 w-4" />}
              {t('consult.bookings.join_consultation')}
            </button>

            <button
              onClick={onClose}
              className="w-full h-9 rounded-[5px] border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t('consult.booking.cancel')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

// ─── IncomingCard ─────────────────────────────────────────────────────────────

export function IncomingCard({
  item,
  onAccept,
  onDecline,
  onJoin,
  onComplete,
  isAccepting,
  isDeclining,
  isJoining,
  isCompleting,
}: Props) {
  const [elapsed, setElapsed] = useState(item.waiting_seconds);
  const [preCallOpen, setPreCallOpen] = useState(false);

  useEffect(() => {
    setElapsed(item.waiting_seconds);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [item.waiting_seconds]);

  const isBusy = isAccepting || isDeclining || isJoining || isCompleting;
  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;
  const isInactive = ["declined", "withdrawn", "expired", "completed"].includes(item.status);

  // Left accent bar — 3px colour strip keyed to status
  const accentBar = {
    confirmed: "before:bg-[hsl(var(--success))]",
    accepted: "before:bg-primary",
    in_progress: "before:bg-[hsl(var(--info))]",
    pending: "before:bg-[hsl(var(--warning))]",
  }[item.status] ?? "before:bg-transparent";

  // Card border tint
  const cardBorder = isInactive
    ? "border-border/40 opacity-50"
    : item.status === "accepted"
      ? "border-primary/25 bg-accent/30"
      : item.status === "in_progress"
        ? "border-[hsl(var(--info)/0.3)] bg-[hsl(var(--info)/0.04)]"
        : item.status === "confirmed"
          ? "border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.04)]"
          : "border-border hover:border-primary/20 hover:shadow-soft";

  return (
    <>
      <div
        className={cn(
          "relative rounded-[5px] border bg-card transition-all duration-200",
          "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full",
          accentBar,
          cardBorder,
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 pl-5">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={cn(
              "h-10 w-10 rounded-[5px] flex items-center justify-center text-[11px] font-bold font-mono select-none",
              isInactive
                ? "bg-muted text-muted-foreground"
                : item.status === "in_progress"
                  ? "bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]"
                  : item.status === "accepted"
                    ? "bg-primary/15 text-primary"
                    : "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
            )}>
              {phoneAvatar(item.guest_phone)}
            </div>
            {/* Queue position badge */}
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-foreground text-background text-[8px] font-bold flex items-center justify-center border border-background leading-none">
              {item.queue_position}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[11px] font-semibold text-foreground font-mono tracking-wide">
                {item.guest_phone}
              </p>
              {/* Status badge with dot */}
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[9px] font-semibold border leading-none",
                badge.cls,
              )}>
                <span className={cn("h-1 w-1 rounded-full shrink-0", badge.dotCls)} />
                {badge.label}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {item.description ?? "No description"}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Clock3 className="h-2.5 w-2.5 text-muted-foreground/50" />
              <span className="text-[9px] text-muted-foreground tabular-nums">
                {t('consult.bookings.waiting_timer', { time: fmtSeconds(elapsed) })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">

            {/* CONFIRMED → Decline + Accept */}
            {item.status === "confirmed" && (
              <>
                <button
                  onClick={onDecline}
                  disabled={isBusy}
                  title="Decline"
                  className="h-8 w-8 rounded-[5px] border border-border bg-card hover:bg-destructive/10 hover:border-destructive/40 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeclining
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <PhoneOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={onAccept}
                  disabled={isBusy}
                  className="h-8 px-3 rounded-[5px] bg-[hsl(var(--success))] hover:opacity-90 text-[hsl(var(--success-foreground))] text-[10px] font-semibold flex items-center gap-1.5 transition-smooth shadow-soft active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAccepting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Phone className="h-3.5 w-3.5" />}
                  {t('consult.bookings.accept')}
                </button>
              </>
            )}

            {/* ACCEPTED → Preview */}
            {item.status === "accepted" && (
              <button
                onClick={() => setPreCallOpen(true)}
                disabled={isBusy}
                className="h-8 px-3 rounded-[5px] bg-primary hover:bg-[hsl(var(--primary-glow))] text-primary-foreground text-[10px] font-semibold flex items-center gap-1.5 transition-smooth shadow-soft active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <LogIn className="h-3.5 w-3.5" />
                {t("consult.bookings.preview")}
              </button>
            )}

            {/* IN_PROGRESS → Complete & Rejoin */}
            {item.status === "in_progress" && (
              <>
                <button
                  onClick={onComplete}
                  disabled={isBusy}
                  className="h-8 px-3 rounded-[5px] bg-[hsl(var(--info))] hover:opacity-90 text-[hsl(var(--info-foreground))] text-[10px] font-semibold flex items-center gap-1.5 transition-smooth shadow-soft active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCompleting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {t("consult.bookings.complete")}
                </button>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Pre-call modal */}
      {preCallOpen && (
        <PreCallModal
          item={item}
          onJoin={() => {
            setPreCallOpen(false);
            onJoin?.();
          }}
          onClose={() => setPreCallOpen(false)}
          isJoining={isJoining}
        />
      )}
    </>
  );
}
