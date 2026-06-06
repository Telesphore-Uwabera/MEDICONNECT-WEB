import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  useJoinInstant,
  useCompleteInstant,
  type InstantConsultQueueItem,
} from "@/hooks/doctor/use-doctor-appointment";
import { useCallStore } from "@/context/CallStore";

import { ActiveCallPanel } from "./shared/ActiveCallPanel";
import { IncomingCard } from "./shared/IncomingCard";
import { InstantNotesSidebar } from "./shared/InstantNotesSidebar";
import { getErrMsg, fmt } from "./shared/helpers";

type ItemAction = {
  id: number;
  action: "accepting" | "declining" | "joining" | "completing";
} | null;

export function InstantConsultTab() {
  const call     = useCallStore();
  const navigate = useNavigate();
  const [notesOpen,    setNotesOpen]    = useState(true);
  const [activeAction, setActiveAction] = useState<ItemAction>(null);

  const isInCall = call.phase === "connected" && call.role === "doctor";

  const { data: queueData, isLoading: queueLoading } = useGetInstantQueue(!isInCall);
  const acceptInstant   = useAcceptInstant();
  const declineInstant  = useDeclineInstant();
  const joinInstant     = useJoinInstant();
  const completeInstant = useCompleteInstant();

  const queue: InstantConsultQueueItem[] = queueData?.queue ?? [];
  const stats = queueData?.stats;

  // Group by status — only show actionable ones prominently
  const confirmed = queue.filter((i) => i.status === "confirmed");
  const accepted  = queue.filter((i) => i.status === "accepted");
  const joined    = queue.filter((i) => i.status === "in_progress");
  const others    = queue.filter((i) =>
    ["pending", "declined", "withdrawn", "expired", "completed"].includes(i.status),
  );

  // ── Accept (confirmed → accepted) ─────────────────────────────────────────
  const handleAccept = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "accepting" });
    acceptInstant.mutate(item.id, {
      onSuccess: (res) => {
        toast.success("Request accepted. You can now join the room.");
        // Navigate doctor to the consultation room
        const roomName = res.room_url.split("/consultation/").pop() ?? res.room_name;
        navigate(`/consultation/${roomName}?t=${res.doctor_token}`);
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

  // ── Join (accepted → joined) ───────────────────────────────────────────────
  const handleJoin = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "joining" });
    joinInstant.mutate(item.id, {
      onSuccess: (res) => {
        const roomName = res.room_url.split("/consultation/").pop() ?? res.room_name;
        navigate(`/consultation/${roomName}?t=${res.doctor_token}`);
      },
      onError: (err: unknown) => {
        toast.error(getErrMsg(err, "Failed to join session"));
      },
      onSettled: () => setActiveAction(null),
    });
  };

  // ── Complete ───────────────────────────────────────────────────────────────
  const handleComplete = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "completing" });
    completeInstant.mutate(item.id, {
      onSuccess: () => {
        toast.success("Session marked as completed.");
      },
      onError: (err: unknown) => {
        toast.error(getErrMsg(err, "Failed to complete session"));
      },
      onSettled: () => setActiveAction(null),
    });
  };

  // ── Active call view ───────────────────────────────────────────────────────
  if (isInCall) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
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
          <div className="flex-1 min-h-0 p-4">
            <ActiveCallPanel />
          </div>
        </div>
        {notesOpen && (
          <div className="w-72 flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
            <InstantNotesSidebar onClose={() => setNotesOpen(false)} />
          </div>
        )}
      </div>
    );
  }

  // ── Queue view ─────────────────────────────────────────────────────────────
  const activeCount = confirmed.length + accepted.length + joined.length;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[12px] font-semibold text-foreground">You're online</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {queueLoading
              ? "Loading queue…"
              : activeCount === 0
                ? "No active patients"
                : `${activeCount} patient${activeCount > 1 ? "s" : ""} need attention`}
          </span>
        </div>

        {/* Loading */}
        {queueLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!queueLoading && activeCount === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Ready for patients</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-[260px] leading-relaxed">
                Confirmed and paid requests will appear here.
              </p>
            </div>
          </div>
        )}

        {!queueLoading && (
          <>
            {/* Confirmed — needs doctor acceptance */}
            {confirmed.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                  Ready to accept · {confirmed.length}
                </p>
                {confirmed.map((item) => (
                  <IncomingCard
                    key={item.id}
                    item={item}
                    onAccept={() => handleAccept(item)}
                    onDecline={() => handleDecline(item)}
                    isAccepting={activeAction?.id === item.id && activeAction.action === "accepting"}
                    isDeclining={activeAction?.id === item.id && activeAction.action === "declining"}
                  />
                ))}
              </section>
            )}

            {/* Accepted — doctor can join */}
            {accepted.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                  Accepted · join when ready · {accepted.length}
                </p>
                {accepted.map((item) => (
                  <IncomingCard
                    key={item.id}
                    item={item}
                    onJoin={() => handleJoin(item)}
                    isJoining={activeAction?.id === item.id && activeAction.action === "joining"}
                  />
                ))}
              </section>
            )}

            {/* Joined — mark complete */}
            {joined.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-600">
                  In session · {joined.length}
                </p>
                {joined.map((item) => (
                  <IncomingCard
                    key={item.id}
                    item={item}
                    onComplete={() => handleComplete(item)}
                    isCompleting={activeAction?.id === item.id && activeAction.action === "completing"}
                  />
                ))}
              </section>
            )}

            {/* Others — dimmed history */}
            {others.length > 0 && (
              <section className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  History · {others.length}
                </p>
                {others.map((item) => (
                  <IncomingCard key={item.id} item={item} />
                ))}
              </section>
            )}
          </>
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
            value: stats ? String(stats.seen_today)  : "—",
          },
          {
            icon:  <Clock3       className="h-4 w-4 text-sky-500" />,
            label: "Avg duration",
            value: stats ? stats.avg_duration        : "—",
          },
          {
            icon:  <Users        className="h-4 w-4 text-violet-500" />,
            label: "In queue",
            value: stats ? String(stats.in_queue)    : String(queue.length),
          },
          {
            icon:  <CheckCircle2 className="h-4 w-4 text-primary" />,
            label: "Resolved",
            value: stats ? String(stats.resolved)    : "—",
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