
import { useState } from "react";
import {
  FileText, Stethoscope,
  UserCheck, Clock3, Users, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  useGetInstantQueue,
  useAcceptInstant,
  useDeclineInstant,
  type InstantConsultQueueItem,
} from "@/hooks/doctor/use-doctor-appointment";
import { useCallStore } from "@/context/CallStore";

import { ActiveCallPanel } from "./shared/ActiveCallPanel";
import { IncomingCard } from "./shared/IncomingCard";
import { InstantNotesSidebar } from "./shared/InstantNotesSidebar";
import { getErrMsg, fmt } from "./shared/helpers";

// ─── Per-item loading state ────────────────────────────────────────────────────
// Tracks which queue item id is currently being accepted or declined so we can
// show a spinner on that specific card without blocking the whole list.

type ItemAction = { id: number; action: "accepting" | "declining" } | null;

export function InstantConsultTab() {
  const call = useCallStore();
  const [notesOpen,    setNotesOpen]    = useState(true);
  const [activeAction, setActiveAction] = useState<ItemAction>(null);

  const isInCall = call.phase === "connected" && call.role === "doctor";

  // Poll queue every 10 s while not in a call
  const { data: queueData, isLoading: queueLoading } = useGetInstantQueue(!isInCall);
  const acceptInstant  = useAcceptInstant();
  const declineInstant = useDeclineInstant();

  // Real queue items straight from the API — no CallStore mock layer needed
  const queue: InstantConsultQueueItem[] = queueData?.queue ?? [];
  const stats = queueData?.stats;

  // ── Accept ─────────────────────────────────────────────────────────────────

  const handleAccept = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "accepting" });

    acceptInstant.mutate(item.id, {
      onSuccess: (res) => {
        // Build a minimal IncomingRequest so the CallStore / ActiveCallPanel
        // knows who the patient is (phone number stands in for name).
        call.acceptRequestFromQueue({
          id:            String(item.id),
          patientName:   item.guest_phone,
          patientAvatar: item.guest_phone.replace(/\D/g, "").slice(-2),
          reason:        item.description,
          roomUrl:       res.room_url,
        });
        console.info("Daily.co room URL:", res.room_url);
      },
      onError: (err: unknown) => {
        toast.error(getErrMsg(err, "Failed to accept consultation"));
      },
      onSettled: () => setActiveAction(null),
    });
  };

  // ── Decline ────────────────────────────────────────────────────────────────

  const handleDecline = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "declining" });

    declineInstant.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Declined request from ${item.guest_phone}`);
      },
      onError: (err: unknown) => {
        toast.error(getErrMsg(err, "Failed to decline consultation"));
      },
      onSettled: () => setActiveAction(null),
    });
  };

  // ── Active call view ───────────────────────────────────────────────────────

  if (isInCall) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Call header bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-card/50 shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-[12px] font-semibold text-foreground font-mono shrink-0">
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
                onClick={() => setNotesOpen((v) => !v)}
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

          {/* Call panel */}
          <div className="flex-1 min-h-0 p-4">
            <ActiveCallPanel />
          </div>
        </div>

        {/* Notes sidebar */}
        {notesOpen && (
          <div className="w-72 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
            <InstantNotesSidebar onClose={() => setNotesOpen(false)} />
          </div>
        )}
      </div>
    );
  }

  // ── Queue / waiting room view ──────────────────────────────────────────────

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Main queue area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[12px] font-semibold text-foreground">You're online</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {queueLoading
                ? "Loading queue…"
                : queue.length === 0
                  ? "No patients waiting"
                  : `${queue.length} patient${queue.length > 1 ? "s" : ""} in queue`}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {!queueLoading && queue.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Ready for patients</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-[260px] leading-relaxed">
                Incoming instant consultation requests will appear here automatically.
              </p>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {queueLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
            ))}
          </div>
        )}

        {/* Real queue cards — one per API item */}
        {!queueLoading && (
          <div className="space-y-3">
            {queue.map((item) => (
              <IncomingCard
                key={item.id}
                item={item}
                onAccept={() => handleAccept(item)}
                onDecline={() => handleDecline(item)}
                isAccepting={activeAction?.id === item.id && activeAction.action === "accepting"}
                isDeclining={activeAction?.id === item.id && activeAction.action === "declining"}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-l border-border/60 bg-card/40 p-4 gap-4 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Today's stats
        </p>
        {[
          {
            icon:  <UserCheck    className="h-4 w-4 text-emerald-500" />,
            label: "Seen today",
            value: stats ? String(stats.seen_today)                   : "—",
          },
          {
            icon:  <Clock3       className="h-4 w-4 text-sky-500" />,
            label: "Avg duration",
            value: stats ? stats.avg_duration                         : "—",
          },
          {
            icon:  <Users        className="h-4 w-4 text-violet-500" />,
            label: "In queue",
            value: stats ? String(stats.in_queue) : String(queue.length),
          },
          {
            icon:  <CheckCircle2 className="h-4 w-4 text-primary" />,
            label: "Resolved",
            value: stats ? String(stats.resolved)                     : "—",
          },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background">
            <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
              {icon}
            </div>
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

