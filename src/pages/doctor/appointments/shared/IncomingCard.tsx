import { useState, useEffect } from "react";
import { Clock3, Phone, PhoneOff, Hash, CheckCircle2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { type InstantConsultQueueItem } from "@/hooks/doctor/use-doctor-appointment";
import { Loader2 } from "lucide-react";

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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  confirmed: { label: "Paid ✓",    cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  accepted:  { label: "Accepted",  cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  "In Progress":    { label: "In Session", cls: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  declined:  { label: "Declined",  cls: "bg-red-500/10 text-red-500 border-red-500/20" },
  withdrawn: { label: "Withdrawn", cls: "bg-muted text-muted-foreground border-border" },
  expired:   { label: "Expired",   cls: "bg-muted text-muted-foreground border-border" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground border-border" },
};

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

  useEffect(() => {
    setElapsed(item.waiting_seconds);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [item.waiting_seconds]);

  const isBusy = isAccepting || isDeclining || isJoining || isCompleting;
  const badge  = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;

  // Dim inactive statuses
  const isInactive = ["declined", "withdrawn", "expired", "completed"].includes(item.status);

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 transition-all duration-200",
      isInactive
        ? "border-border/40 opacity-50"
        : "border-border hover:border-border/80 hover:shadow-md",
    )}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold font-mono select-none">
            {phoneAvatar(item.guest_phone)}
          </div>
          <span className="absolute -bottom-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border border-background">
            {item.queue_position}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-foreground font-mono tracking-wide">
              {item.guest_phone}
            </p>
            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border",
              badge.cls,
            )}>
              {badge.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {item.description ?? "No description"}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Clock3 className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">
              Waiting {fmtSeconds(elapsed)}
            </span>
          </div>
        </div>

        {/* Actions — vary by status */}
        <div className="flex items-center gap-2 shrink-0">

          {/* CONFIRMED → Accept button only */}
          {item.status === "confirmed" && (
            <>
              <button
                onClick={onDecline}
                disabled={isBusy}
                title="Decline"
                className="h-9 w-9 rounded-full border border-border bg-background hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950/30 text-muted-foreground flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeclining
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <PhoneOff className="h-4 w-4" />}
              </button>
              <button
                onClick={onAccept}
                disabled={isBusy}
                className="h-9 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAccepting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Phone className="h-3.5 w-3.5" />}
                Accept
              </button>
            </>
          )}

          {/* ACCEPTED → Join button */}
          {item.status === "accepted" && (
            <button
              onClick={onJoin}
              disabled={isBusy}
              className="h-9 px-4 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isJoining
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <LogIn className="h-3.5 w-3.5" />}
              Join
            </button>
          )}

          {/* JOINED → Mark Complete button */}
          {item.status === "in_progress" && (
            <button
              onClick={onComplete}
              disabled={isBusy}
              className="h-9 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCompleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <CheckCircle2 className="h-3.5 w-3.5" />}
              Complete
            </button>
          )}

        </div>
      </div>
    </div>
  );
}