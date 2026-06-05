
import { useState, useEffect } from "react";
import { Clock3, Phone, PhoneOff, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { type InstantConsultQueueItem } from "@/hooks/doctor/use-doctor-appointment";
import { Loader2 } from "lucide-react";

interface Props {
  item: InstantConsultQueueItem;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

/** Format waiting_seconds into a human-readable string that stays live */
function fmtSeconds(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Derive a 2-char avatar from a phone number */
function phoneAvatar(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 2 ? digits.slice(-2) : phone.slice(0, 2).toUpperCase();
}

export function IncomingCard({ item, onAccept, onDecline, isAccepting, isDeclining }: Props) {
  // Tick the displayed wait time every second using waiting_seconds as the base
  const [elapsed, setElapsed] = useState(item.waiting_seconds);

  useEffect(() => {
    setElapsed(item.waiting_seconds); // reset if item changes
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [item.waiting_seconds]);

  const isBusy = isAccepting || isDeclining;

  return (
    <div className="rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-md p-4 transition-all duration-200">
      <div className="flex items-center gap-3">
        {/* Avatar — derived from phone digits */}
        <div className="relative shrink-0">
          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold font-mono select-none">
            {phoneAvatar(item.guest_phone)}
          </div>
          {/* Queue position badge */}
          <span className="absolute -bottom-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border border-background">
            {item.queue_position}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Phone */}
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-foreground font-mono tracking-wide">
              {item.guest_phone}
            </p>
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              <Hash className="h-2.5 w-2.5" />{item.queue_position}
            </span>
          </div>
          {/* Description / chief complaint */}
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {item.description}
          </p>
          {/* Wait time — live ticking */}
          <div className="flex items-center gap-1 mt-1">
            <Clock3 className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">
              Waiting {fmtSeconds(elapsed)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDecline}
            disabled={isBusy}
            title="Decline"
            className="h-9 w-9 rounded-full border border-border bg-background hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950/30 text-muted-foreground flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeclining
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <PhoneOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onAccept}
            disabled={isBusy}
            title="Accept"
            className="h-9 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all duration-200 shadow-md shadow-emerald-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAccepting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Phone className="h-3.5 w-3.5" />}
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

