
import { useState, useMemo, useRef } from "react";
import {
  FileText, Stethoscope,
  UserCheck, Clock3, Users, CheckCircle2, Activity, Video, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  useGetInstantQueue,
  useAcceptInstant,
  useDeclineInstant,
  useJoinInstant,
  useCompleteInstant,
  useDoctorLiveSession,
  type InstantConsultQueueItem,
} from "@/hooks/doctor/use-doctor-appointment";
import { useCallStore } from "@/context/CallStore";
import { useCallContext } from "@/context/CallContext";
import { sessionToRejoinTarget, type LiveSessionResponse } from "@/lib/rejoin";
import { apiFetch } from "@/lib/api";
import { openBlankSummaryWindow, writeSummaryToWindow } from "@/lib/summary-document";
import { usePublicSettings } from "@/hooks/use-public-settings";
import type { ConsultationSummary } from "@/hooks/doctor/use-consultation-summaries";

import { ActiveCallPanel } from "./shared/ActiveCallPanel";
import { IncomingCard } from "./shared/IncomingCard";
import { InstantNotesSidebar } from "./shared/InstantNotesSidebar";
import { getErrMsg, fmt } from "./shared/helpers";
import { BookPhysicalModal } from "./shared/BookPhysicalModal";
import { TransferPatientPrompt } from "./shared/TransferPatientPrompt";
import { ConsultationSummaryModal } from "./shared/ConsultationSummaryModal";
import { t } from "i18next";

type ItemAction = {
  id: number;
  action: "accepting" | "declining" | "joining" | "completing";
} | null;

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({
  dotCls,
  label,
  count,
}: {
  dotCls: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("h-2 w-2 rounded-full shrink-0", dotCls)} />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto text-xs font-semibold text-muted-foreground/50 tabular-nums">
        {count}
      </span>
    </div>
  );
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-[6px] border border-border bg-card p-4 flex items-center gap-4 animate-pulse">
      <div className="h-12 w-12 rounded-[6px] bg-muted shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-3 w-32 bg-muted rounded-full" />
        <div className="h-2 w-48 bg-muted rounded-full" />
      </div>
      <div className="h-9 w-20 rounded-[6px] bg-muted" />
    </div>
  );
}

// ─── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon,
  label,
  value,
  iconWrapCls,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconWrapCls: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-[6px] border border-border/60 bg-background">
      <div className={cn("h-10 w-10 rounded-[6px] flex items-center justify-center shrink-0", iconWrapCls)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InstantConsultTab() {
  const call = useCallStore();
  const { data: publicSettings } = usePublicSettings();
  const [notesOpen, setNotesOpen] = useState(true);
  const [queueTab, setQueueTab] = useState<"active" | "completed">("active");
  const [activeAction, setActiveAction] = useState<ItemAction>(null);
  const [bookingItem, setBookingItem] = useState<InstantConsultQueueItem | null>(null);
  const [transferPromptItem, setTransferPromptItem] = useState<InstantConsultQueueItem | null>(null);
  const [recordItem, setRecordItem] = useState<InstantConsultQueueItem | null>(null);

  // Queue items expose only the request id. The consultation-summary endpoint
  // validates against the real `instant_consultations` id, so we remember the
  // mapping (request id → consultation id) captured from the join token.
  const consultIdByRequest = useRef<Record<number, number>>({});

  const isInCall = call.phase === "connected" && call.role === "doctor";

  const { data: queueData, isLoading: queueLoading } = useGetInstantQueue(!isInCall);
  const acceptInstant = useAcceptInstant();
  const declineInstant = useDeclineInstant();
  const joinInstant = useJoinInstant();
  const completeInstant = useCompleteInstant();
  const { startCall, activeCall } = useCallContext();

  // In-progress session the doctor can rejoin after navigating away. Suppressed
  // while a call overlay is already open.
  const { data: liveSession } = useDoctorLiveSession(!isInCall && !activeCall);
  // Only offer "rejoin" for a genuinely in-progress session — never one that has
  // already been completed/cancelled (which can briefly leak through a stale
  // cache after the doctor finishes the consult).
  const liveStatus = String(
    (liveSession as LiveSessionResponse | null)?.status ?? "",
  ).toLowerCase();
  const liveIsTerminal = [
    "completed", "resolved", "cancelled", "declined", "expired", "withdrawn",
  ].includes(liveStatus);
  const liveTarget = useMemo(
    () => (liveSession && !liveIsTerminal ? sessionToRejoinTarget(liveSession, "doctor") : null),
    [liveSession, liveIsTerminal],
  );

  const handleRejoinLive = () => {
    if (liveTarget) startCall(liveTarget.roomName, liveTarget.token);
  };

  const queue: InstantConsultQueueItem[] = queueData?.queue ?? [];
  const stats = queueData?.stats;

  const visibleQueue = queue.filter((i) => i.status !== "expired");
  const completed = visibleQueue.filter((i) => i.status === "completed");
  const activeItems = visibleQueue.filter((i) => i.status !== "completed");
  const confirmed = activeItems.filter((i) => i.status === "confirmed");
  const accepted = activeItems.filter((i) => i.status === "accepted");
  const joined = activeItems.filter((i) => i.status === "in_progress");
  const others = activeItems.filter((i) =>
    ["pending", "declined", "withdrawn"].includes(i.status),
  );

  const handleAccept = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "accepting" });
    acceptInstant.mutate(item.id, {
      onSuccess: () => toast.success(t("consult.bookings.request_accepted")),
      onError: (err: unknown) => toast.error(getErrMsg(err, t("consult.bookings.failed_to_accept"))),
      onSettled: () => setActiveAction(null),
    });
  };

  const handleDecline = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "declining" });
    declineInstant.mutate(item.id, {
      onSuccess: () => toast.success(t("consult.bookings.request_declined")),
      onError: (err: unknown) => toast.error(getErrMsg(err, t("consult.bookings.failed_to_decline"))),
      onSettled: () => setActiveAction(null),
    });
  };

  const handleJoin = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "joining" });
    joinInstant.mutate(item.id, {
      onSuccess: (res) => {
        const roomName = res.room_url.split("/consultation/").pop() ?? res.room_name;

        const consultationId = Number(item.id);
        let enrichedToken = res.doctor_token;
        let decodedToken: any;
        try {
          decodedToken = JSON.parse(atob(decodeURIComponent(res.doctor_token)));
          // The token natively carries the real instant_consultations id — capture
          // it (keyed by request id) for the consultation-summary payload before we
          // overwrite it below for the chat API.
          const nativeCid = Number(decodedToken?.consultation_id);
          if (Number.isFinite(nativeCid) && nativeCid > 0 && nativeCid !== item.id) {
            consultIdByRequest.current[item.id] = nativeCid;
          }
          // The chat API needs the consultation id; it isn't in the token natively.
          decodedToken.consultation_id = Number.isFinite(consultationId) ? consultationId : item.id;
          enrichedToken = encodeURIComponent(btoa(JSON.stringify(decodedToken)));
        } catch {
          decodedToken = null;
        }

        if (decodedToken) {
          // If you are using startCall directly:
          startCall(roomName, decodedToken);
          // If you are navigating to the page instead:
          // window.location.href = `/consultation/${roomName}?t=${enrichedToken}`;
        } else {
          toast.error(t("consult.bookings.failed_to_parse_token"));
        }
      },
      onError: (err: unknown) => toast.error(getErrMsg(err, t("consult.bookings.failed_to_join"))),
      onSettled: () => setActiveAction(null),
    });
  };

  // Completing opens the "book physical appointment" step first; the booking is
  // optional (the doctor can skip), but either path finalizes the consult.
  const completeConsult = (item: InstantConsultQueueItem) => {
    setActiveAction({ id: item.id, action: "completing" });
    completeInstant.mutate(item.id, {
      onSuccess: () => toast.success(t("consult.bookings.session_completed")),
      onError: (err: unknown) => toast.error(getErrMsg(err, t("consult.bookings.failed_to_complete"))),
      onSettled: () => setActiveAction(null),
    });
  };

  // Completing first requires the patient medical record (required), then the
  // optional hospital booking, then the consult is finalized.
  const handleComplete = (item: InstantConsultQueueItem) => {
    setRecordItem(item);
  };

  const patientIdOf = (item: InstantConsultQueueItem | null): number | null =>
    item == null
      ? null
      : ((item as any).user_id ?? (item as any).patient_id ?? (item as any).patient?.id ?? null);

  // Resolve the real `instant_consultations` id for the summary payload, since
  // the queue item only carries the request id.
  const resolveInstantConsultId = (item: InstantConsultQueueItem | null): number | null => {
    if (!item) return null;
    // 1. captured from this session's join token
    const captured = consultIdByRequest.current[item.id];
    if (captured) return captured;
    // 2. the doctor's in-progress live session (matched by request id)
    const ls = (liveSession ?? null) as LiveSessionResponse | null;
    const lsReqId = ls?.instant_consultation_request_id ?? ls?.id;
    if (ls?.consultation_id && lsReqId === item.id) return ls.consultation_id;
    // 3. fall back to the request id
    return item.id;
  };

  // Open the consultation-summary document (formatted on the frontend) for a
  // completed instant consult. Opens the tab first (user gesture) then fills it.
  const handleViewSummary = async (item: InstantConsultQueueItem) => {
    const win = openBlankSummaryWindow();
    try {
      const cid = resolveInstantConsultId(item);
      const res = await apiFetch<{ data: ConsultationSummary[] }>(
        `/doctor/consultation-summaries?instant_consultation_id=${cid}`,
      );
      const summary = res.data?.[0];
      if (summary) {
        writeSummaryToWindow(win, summary, false, publicSettings);
      } else {
        win?.close();
        toast.error(t("pages.doctor.no_consultation_summary"));
      }
    } catch (err: unknown) {
      win?.close();
      toast.error(getErrMsg(err, t("pages.doctor.could_not_load_summary")));
    }
  };

  const recordPatientId = patientIdOf(recordItem);
  const bookingPatientId = patientIdOf(bookingItem);

  // Carry the consultation notes (saved by InstantNotesSidebar under
  // instant_notes:{consultationId}) into the booking's notes field.
  const bookingDefaultNotes = (() => {
    if (bookingItem == null) return "";
    try {
      return localStorage.getItem(`instant_notes:${bookingItem.id}`) ?? "";
    } catch {
      return "";
    }
  })();

  // ── Active call view ───────────────────────────────────────────────────────
  if (isInCall) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-card shrink-0">
            {/* Live chip */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-destructive/10 border border-destructive/20">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
              <span className="text-xs font-bold text-destructive uppercase tracking-widest">
                {t("consult.bookings.online")}
              </span>
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground font-mono shrink-0 truncate max-w-[160px]">
                {call.activeRequest?.patientName}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                — {call.activeRequest?.reason}
              </span>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-sm font-mono text-muted-foreground tabular-nums">
                {fmt(call.elapsed)}
              </span>
              <button
                onClick={() => setNotesOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm font-medium border transition-smooth",
                  notesOpen
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <FileText className="h-4 w-4" />
                {notesOpen ? t("consult.notes.hide_notes") : t("consult.notes.notes")}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-4">
            <ActiveCallPanel />
          </div>
        </div>

        {notesOpen && (
          <div className="w-72 flex-shrink-0 border-l border-border overflow-hidden flex flex-col bg-muted/20">
            <InstantNotesSidebar onClose={() => setNotesOpen(false)} consultationId={joined[0]?.id} patientName={joined[0]?.guest_phone} />
          </div>
        )}
      </div>
    );
  }

  // ── Queue view ─────────────────────────────────────────────────────────────
  const actionableCount = confirmed.length + accepted.length + joined.length;
  const activeCount = activeItems.length;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-background">

      {/* Main queue */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Rejoin in-progress consultation */}
        {liveTarget && (
          <div className="flex items-center gap-4 p-4 rounded-[6px] border border-primary/30 bg-primary/5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t("consult.bookings.in_progress")}
              </p>
              <p className="text-xs text-muted-foreground">{t("consult.bookings.rejoin_info")}</p>
            </div>
            <button
              onClick={handleRejoinLive}
              className="flex items-center gap-2 px-4 h-9 rounded-[6px] bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
            >
              <Video className="h-4 w-4" /> {t("consult.bookings.rejoin")}
            </button>
          </div>
        )}

        {/* Online header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.25)]">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              <span className="text-xs font-bold text-[hsl(var(--success))] uppercase tracking-widest">
                {t("consult.bookings.online")}
              </span>
            </div>
            <span className="truncate text-sm text-muted-foreground">
              {queueLoading
                ? t("consult.bookings.loading_queue")
                : actionableCount === 0
                  ? t("consult.bookings.no_active_patients")
                  : `${actionableCount} ${actionableCount > 1 ? t("consult.bookings.patients_need_attentions") : t("consult.bookings.patient_need_attention")}`}
            </span>
          </div>

          <div className="inline-flex shrink-0 items-center rounded-[6px] border border-border/60 bg-card p-0.5">
            {[
              {
                id: "active" as const,
                label: t("consult.bookings.active_queue", { defaultValue: "Active queue" }),
                count: activeCount,
                icon: Activity,
              },
              {
                id: "completed" as const,
                label: t("consult.bookings.completed", { defaultValue: "Completed" }),
                count: completed.length,
                icon: History,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = queueTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setQueueTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[5px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-[5px] px-1.5 py-0.5 text-[10px] leading-none tabular-nums",
                      active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading skeletons */}
        {queueLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!queueLoading && queueTab === "active" && activeCount === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center">
              <Stethoscope className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("consult.bookings.ready_for_patients")}</p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-[260px] leading-relaxed">
                {t("consult.bookings.confirmed_paid_requests")}
              </p>
            </div>
          </div>
        )}

        {!queueLoading && queueTab === "active" && (
          <div className="space-y-5">

            {/* Confirmed — success (green) */}
            {confirmed.length > 0 && (
              <section className="space-y-2">
                <SectionLabel
                  dotCls="bg-[hsl(var(--success))]"
                  label={t("consult.bookings.ready_to_accept")}
                  count={confirmed.length}
                />
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

            {/* Accepted — primary teal */}
            {accepted.length > 0 && (
              <section className="space-y-2">
                <SectionLabel
                  dotCls="bg-primary"
                  label={t('consult.bookings.accepted_ready')}
                  count={accepted.length}
                />
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

            {/* In session — info */}
            {joined.length > 0 && (
              <section className="space-y-2">
                <SectionLabel
                  dotCls="bg-[hsl(var(--info))]"
                  label={t('consult.bookings.in_session')}
                  count={joined.length}
                />
                {joined.map((item) => (
                  <IncomingCard
                    key={item.id}
                    item={item}
                    onComplete={() => handleComplete(item)}
                    onJoin={() => handleJoin(item)}
                    isCompleting={activeAction?.id === item.id && activeAction.action === "completing"}
                    isJoining={activeAction?.id === item.id && activeAction.action === "joining"}
                  />
                ))}
              </section>
            )}

            {/* History — muted */}
            {others.length > 0 && (
              <section className="space-y-2">
                <SectionLabel
                  dotCls="bg-muted-foreground/30"
                  label={t("consult.bookings.other_requests", { defaultValue: "Other requests" })}
                  count={others.length}
                />
                {others.map((item) => (
                  <IncomingCard key={item.id} item={item} />
                ))}
              </section>
            )}

          </div>
        )}

        {!queueLoading && queueTab === "completed" && (
          <div className="space-y-5">
            {completed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="h-16 w-16 rounded-[6px] bg-muted/50 border border-border flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t("consult.bookings.no_completed_instants", { defaultValue: "No completed instant consultations" })}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-[280px] leading-relaxed">
                    {t("consult.bookings.completed_instants_info", { defaultValue: "Completed instant consultations will appear here after you finish a session." })}
                  </p>
                </div>
              </div>
            ) : (
              <section className="space-y-2">
                <SectionLabel
                  dotCls="bg-[hsl(var(--success))]"
                  label={t("consult.bookings.completed", { defaultValue: "Completed" })}
                  count={completed.length}
                />
                {completed.map((item) => ( 
                  <div key={item.id} className="space-y-1.5">
                    <IncomingCard item={item} />
                 
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>

      {/* Stats sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-l border-border/60 bg-card/40 p-5 gap-4 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground/60" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            {t("consult.bookings.today_stats")}
          </p>
        </div>

        <StatTile
          icon={<UserCheck className="h-5 w-5 text-[hsl(var(--success))]" />}
          label={t("consult.bookings.seen_today")}
          value={stats ? String(stats.seen_today) : "—"}
          iconWrapCls="bg-[hsl(var(--success)/0.1)]"
        />
        <StatTile
          icon={<Clock3 className="h-5 w-5 text-primary" />}
          label={t("consult.bookings.avg_duration")}
          value={stats ? stats.avg_duration : "—"}
          iconWrapCls="bg-accent"
        />
        <StatTile
          icon={<Users className="h-5 w-5 text-[hsl(var(--info))]" />}
          label={t("consult.bookings.in_queue")}
          value={stats ? String(stats.in_queue) : String(queue.length)}
          iconWrapCls="bg-[hsl(var(--info)/0.1)]"
        />
        <StatTile
          icon={<CheckCircle2 className="h-5 w-5 text-[hsl(var(--warning))]" />}
          label={t("consult.bookings.resolved")}
          value={stats ? String(stats.resolved) : "—"}
          iconWrapCls="bg-[hsl(var(--warning)/0.1)]"
        />

        <div className="border-t border-border/60 pt-4 mt-auto">
          <p className="text-xs text-muted-foreground/50 leading-relaxed">
            {t("consult.bookings.stats_reset_daily")}
          </p>
        </div>
      </aside>

      {/* Step 1 — required: consultation summary (SOAP note) */}
      {recordItem != null && (
        <ConsultationSummaryModal
          instantConsultationId={resolveInstantConsultId(recordItem)}
          patientId={recordPatientId}
          patientName={recordItem.guest_phone}
          onClose={() => setRecordItem(null)}
          onSaved={() => {
            const item = recordItem;
            setRecordItem(null);
            setTransferPromptItem(item);
          }}
        />
      )}


      {/* Step 2 - ask whether to transfer before opening facility booking */}
      {transferPromptItem != null && (
        <TransferPatientPrompt
          patientName={transferPromptItem.guest_phone}
          onConfirm={() => {
            const item = transferPromptItem;
            setTransferPromptItem(null);
            setBookingItem(item);
          }}
          onDecline={() => {
            const item = transferPromptItem;
            setTransferPromptItem(null);
            if (item) completeConsult(item);
          }}
        />
      )}
      {/* Step 3 - optional: book physical appointment, then complete */}
      {bookingItem != null && (
        <BookPhysicalModal
          open
          onClose={() => setBookingItem(null)}
          patientId={bookingPatientId}
          patientPhone={bookingItem?.guest_phone}
          defaultNotes={bookingDefaultNotes}
          onSkip={() => {
            const item = bookingItem;
            setBookingItem(null);
            if (item) completeConsult(item);
          }}
          onBooked={() => {
            const item = bookingItem;
            setBookingItem(null);
            if (item) completeConsult(item);
          }}
        />
      )}
    </div>
  );
}
