
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { InstantConsultDetailDrawer } from "./shared/InstantConsultDetailDrawer";
import { InstantNotesSidebar } from "@/components/consultatioRoom/InstantNotesSidebar";
import { readCallChart } from "@/lib/call-note-form";
import { getErrMsg, fmt } from "./shared/helpers";
import { BookPhysicalModal } from "./shared/BookPhysicalModal";
import { CareContinuePanel, orderTypeFromChoice, referralKindFromChoice, referralUrgencyFromChoice } from "./shared/CareContinuePanel";
import { ReferralCreateModal } from "./shared/ReferralCreateModal";
import { ClinicalOrderModal } from "./shared/ClinicalOrderModal";
import type { ReferralTargetType } from "@/hooks/doctor/use-doctor-referrals";
import type { CareOrderType } from "@/hooks/doctor/use-care-orders";
import { ConsultationSummaryModal } from "./shared/ConsultationSummaryModal";
import { QuickPrescriptionModal } from "./shared/QuickPrescriptionModal";
import { t } from "i18next";
import { TABLE_PAGE_SIZE, TablePager, paginateRows, tablePageCount } from "@/components/TablePager";

type ItemAction = {
  id: number;
  action: "accepting" | "declining" | "joining" | "completing";
} | null;

function attachPatientToCallToken(
  token: any,
  item?: InstantConsultQueueItem | null,
  live?: LiveSessionResponse | null,
) {
  if (!token || typeof token !== "object") return token;
  const liveAny = (live ?? {}) as Record<string, unknown>;
  const name =
    item?.guest_name ||
    (typeof liveAny.guest_name === "string" ? liveAny.guest_name : "") ||
    (typeof liveAny.patient_name === "string" ? liveAny.patient_name : "") ||
    token.guest_name ||
    token.patient_name;
  const phone =
    item?.guest_phone ||
    (typeof liveAny.guest_phone === "string" ? liveAny.guest_phone : "") ||
    token.guest_phone ||
    token.patient_phone;
  const pid = Number(
    (item as { user_id?: number; patient_id?: number } | null)?.user_id ??
      (item as { patient_id?: number } | null)?.patient_id ??
      liveAny.patient_id ??
      liveAny.user_id,
  );
  if (name) {
    token.guest_name = name;
    token.patient_name = name;
  }
  if (phone) {
    token.guest_phone = phone;
    token.patient_phone = phone;
  }
  if (Number.isFinite(pid) && pid > 0) token.patient_id = pid;
  return token;
}

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
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconWrapCls: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className={cn("h-10 w-10 rounded-[6px] flex items-center justify-center shrink-0", iconWrapCls)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="flex items-center gap-4 p-4 rounded-[6px] border border-border/60 bg-background text-left hover:border-primary/30 transition-colors">
        {inner}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-4 p-4 rounded-[6px] border border-border/60 bg-background">
      {inner}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function InstantConsultTab() {
  const call = useCallStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailItem, setDetailItem] = useState<InstantConsultQueueItem | null>(null);
  const { data: publicSettings } = usePublicSettings();
  const [notesOpen, setNotesOpen] = useState(true);
  const [queueTab, setQueueTab] = useState<"active" | "completed">("active");
  const [queuePage, setQueuePage] = useState(1);
  const [activeAction, setActiveAction] = useState<ItemAction>(null);
  const [bookingItem, setBookingItem] = useState<InstantConsultQueueItem | null>(null);
  const [careItem, setCareItem] = useState<InstantConsultQueueItem | null>(null);
  const [referItem, setReferItem] = useState<InstantConsultQueueItem | null>(null);
  const [referKind, setReferKind] = useState<ReferralTargetType>("hospital");
  const [referUrgency, setReferUrgency] = useState("medium");
  const [orderKind, setOrderKind] = useState<CareOrderType>("lab");
  const [orderKindShown, setOrderKindShown] = useState(false);
  const [recordItem, setRecordItem] = useState<InstantConsultQueueItem | null>(null);
  const [prescriptionItem, setPrescriptionItem] = useState<InstantConsultQueueItem | null>(null);

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
  const { startCall, activeCall, endCall: hangUpCall } = useCallContext();

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
    "completed", "resolved", "cancelled", "declined", "expired", "payment_expired", "withdrawn",
  ].includes(liveStatus);
  const liveTarget = useMemo(
    () => (liveSession && !liveIsTerminal ? sessionToRejoinTarget(liveSession, "doctor") : null),
    [liveSession, liveIsTerminal],
  );

  const handleRejoinLive = () => {
    if (!liveTarget) return;
    const match = queue.find((item) => {
      const liveId = Number((liveSession as LiveSessionResponse | null)?.instant_consultation_request_id ?? (liveSession as LiveSessionResponse | null)?.id);
      return item.id === liveId;
    }) ?? joined[0] ?? null;
    startCall(liveTarget.roomName, attachPatientToCallToken(liveTarget.token, match, liveSession));
  };

  const queue: InstantConsultQueueItem[] = queueData?.queue ?? [];
  const stats = queueData?.stats;

  const isPaid = (item: InstantConsultQueueItem) =>
    item.payment_status === "paid" || item.status === "confirmed";
  const unpaidStatuses = ["pending", "queued", "waiting", "payment_pending"];
  const UNPAID_LIMIT_SEC = 15 * 60;
  const itemAgeSec = (item: InstantConsultQueueItem) => {
    if (item.created_at) {
      const t = new Date(item.created_at).getTime();
      if (Number.isFinite(t)) return Math.max(0, Math.floor((Date.now() - t) / 1000));
    }
    return Math.max(0, Number(item.waiting_seconds) || 0);
  };
  const isUnpaidOpen = (item: InstantConsultQueueItem) =>
    unpaidStatuses.includes(item.status) && !isPaid(item);
  const isStaleUnpaid = (item: InstantConsultQueueItem) =>
    isUnpaidOpen(item) && itemAgeSec(item) >= UNPAID_LIMIT_SEC;

  const newestFirst = (items: InstantConsultQueueItem[]) =>
    [...items].sort((a, b) => b.id - a.id);
  const visibleQueue = queue.filter((i) => i.status !== "declined" && i.status !== "withdrawn");
  const finishedStatuses = ["completed", "expired", "payment_expired"];
  const finished = newestFirst(visibleQueue.filter((i) => finishedStatuses.includes(i.status)));
  const activeItems = newestFirst(visibleQueue.filter((i) => !finishedStatuses.includes(i.status)));
  const waiting = newestFirst(activeItems.filter((i) => isUnpaidOpen(i) && !isStaleUnpaid(i)));
  const staleUnpaid = newestFirst(activeItems.filter(isStaleUnpaid)).map((item) => ({
    ...item,
    status: "payment_expired" as const,
  }));
  const completed = newestFirst([...finished, ...staleUnpaid]);
  const confirmed = newestFirst(activeItems.filter((i) =>
    isPaid(i) && !["accepted", "in_progress", "completed", "declined", "withdrawn"].includes(i.status),
  ));
  const accepted = newestFirst(activeItems.filter((i) => i.status === "accepted"));
  const joined = newestFirst(activeItems.filter((i) => i.status === "in_progress"));
  const others = activeItems.filter((i) =>
    ["declined", "withdrawn"].includes(i.status),
  );
  const doctorBusy = Boolean(
    stats?.doctor_busy
    || accepted.length > 0
    || joined.length > 0
    || (call.phase === "connected" && call.role === "doctor"),
  );

  const handleAccept = (item: InstantConsultQueueItem) => {
    if (doctorBusy) {
      toast.message(t("consult.bookings.busy_cannot_accept", {
        defaultValue: "Finish your current instant consultation first. Other patients stay in the queue. Bookings are still available.",
      }));
      return;
    }
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
          startCall(roomName, attachPatientToCallToken(decodedToken, item));
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
      onSuccess: () => {
        hangUpCall();
        call.endCall();
        toast.success(t("consult.bookings.session_completed"));
      },
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

  const openDetail = useCallback((item: InstantConsultQueueItem) => {
    setDetailItem(item);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("id", String(item.id));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const closeDetail = useCallback(() => {
    setDetailItem(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("id");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const id = Number(searchParams.get("id") || "");
    if (!Number.isFinite(id) || id <= 0 || queue.length === 0) return;
    const match = queue.find((q) => q.id === id);
    if (!match) return;
    setDetailItem(match);
    if (["completed", "expired", "payment_expired", "declined", "withdrawn"].includes(match.status)) {
      setQueueTab("completed");
    }
  }, [queue, searchParams]);

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

  // Carry in-call form notes into the facility booking and the SOAP summary.
  const bookingNoteForm = bookingItem ? readCallChart(bookingItem.id, "instant") : null;
  const bookingDefaultNotes = bookingNoteForm
    ? [bookingNoteForm.chief_complaint, bookingNoteForm.clinical_assessment, bookingNoteForm.management_plan]
        .map((part) => part.trim())
        .filter(Boolean)
        .join("\n\n")
    : "";
  const recordNoteForm = recordItem ? readCallChart(recordItem.id, "instant") : null;

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
            <InstantNotesSidebar
              onClose={() => setNotesOpen(false)}
              consultationId={joined[0]?.id}
              patientId={patientIdOf(joined[0] ?? null)}
              patientName={joined[0]?.guest_name || joined[0]?.guest_phone}
              patientPhone={joined[0]?.guest_phone}
              mode="instant"
              variant="page"
            />
          </div>
        )}
      </div>
    );
  }

  // ── Queue view ─────────────────────────────────────────────────────────────
  const actionableCount = confirmed.length + accepted.length + joined.length;
  const activeCount = joined.length + accepted.length + confirmed.length + waiting.length;
  const openCompletedConsult = (item: InstantConsultQueueItem) => {
    const cid = resolveInstantConsultId(item);
    if (!cid) return;
    navigate(`/consultation/instant-consultation-${cid}?cid=${cid}`);
  };

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-1 overflow-hidden bg-background">

      {/* Main queue */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">

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

        {doctorBusy && (
          <div className="rounded-[6px] border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {t("consult.bookings.busy_title", {
                defaultValue: "In an instant consultation",
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("consult.bookings.busy_hint", {
                defaultValue: "You cannot accept another instant request until this one is finished. New patients stay in the queue. Scheduled bookings are still available.",
              })}
            </p>
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
                : actionableCount > 0
                  ? `${actionableCount} ${actionableCount > 1 ? t("consult.bookings.patients_need_attentions") : t("consult.bookings.patient_need_attention")}`
                  : waiting.length > 0
                    ? t("pages.doctor.waiting_count", { count: waiting.length })
                    : t("consult.bookings.no_active_patients")}
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
                  onClick={() => {
                    setQueueTab(tab.id);
                    setQueuePage(1);
                  }}
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

            {/* In session first — the live consult the doctor is in */}
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
                    onOpen={() => openDetail(item)}
                    onComplete={() => completeConsult(item)}
                    onOpenFile={() => handleComplete(item)}
                    onJoin={() => handleJoin(item)}
                    isCompleting={activeAction?.id === item.id && activeAction.action === "completing"}
                    isJoining={activeAction?.id === item.id && activeAction.action === "joining"}
                  />
                ))}
              </section>
            )}

            {/* Confirmed — success (green) */}
            {confirmed.length > 0 && (
              <section className="space-y-2">
                <SectionLabel
                  dotCls="bg-[hsl(var(--success))]"
                  label={doctorBusy
                    ? t("consult.bookings.waiting_in_queue", { defaultValue: "Waiting in queue" })
                    : confirmed.some(i => i.payment_status === "paid")
                      ? t("consult.bookings.ready_to_join", { defaultValue: "Paid — Ready to Join" })
                      : t("consult.bookings.ready_to_accept")}
                  count={confirmed.length}
                />
                {confirmed.map((item) => (
                  <IncomingCard
                    key={item.id}
                    item={item}
                    onOpen={() => openDetail(item)}
                    onAccept={doctorBusy ? undefined : () => handleAccept(item)}
                    onDecline={() => handleDecline(item)}
                    isAccepting={activeAction?.id === item.id && activeAction.action === "accepting"}
                    isDeclining={activeAction?.id === item.id && activeAction.action === "declining"}
                    onJoin={
                      // Paid / confirmed: doctor can join directly (accept+join in one step)
                      !doctorBusy
                        ? () => {
                            setActiveAction({ id: item.id, action: "accepting" });
                            acceptInstant.mutate(item.id, {
                              onSuccess: (res) => {
                                setActiveAction({ id: item.id, action: "joining" });
                                const roomName = res.room_url.split("/consultation/").pop() ?? res.room_name;
                                try {
                                  const decoded = JSON.parse(atob(decodeURIComponent(res.doctor_token)));
                                  decoded.consultation_id = item.id;
                                  startCall(roomName, attachPatientToCallToken(decoded, item));
                                } catch { /* fallback */ }
                              },
                              onError: (err: unknown) => toast.error(getErrMsg(err, t("consult.bookings.failed_to_accept"))),
                              onSettled: () => setActiveAction(null),
                            });
                          }
                        : undefined
                    }
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
                    onOpen={() => openDetail(item)}
                    onJoin={() => handleJoin(item)}
                    isJoining={activeAction?.id === item.id && activeAction.action === "joining"}
                  />
                ))}
              </section>
            )}

            {waiting.length > 0 && (
              <section className="space-y-2">
                <SectionLabel
                  dotCls="bg-[hsl(var(--warning))]"
                  label={t("consult.bookings.awaiting_payment", { defaultValue: "Awaiting payment" })}
                  count={waiting.length}
                />
                <p className="text-xs text-muted-foreground px-0.5">
                  {t("consult.bookings.awaiting_payment_hint", {
                    defaultValue: "These patients requested a consult but have not finished payment yet. Unpaid requests expire after 15 minutes.",
                  })}
                </p>
                {waiting.map((item) => (
                  <IncomingCard key={item.id} item={item} onOpen={() => openDetail(item)} />
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
                  <IncomingCard key={item.id} item={item} onOpen={() => openDetail(item)} />
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
                {paginateRows(completed, queuePage).map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <IncomingCard
                      item={item}
                      onOpen={() => openDetail(item)}
                    />
                  </div>
                ))}
                <TablePager
                  page={queuePage}
                  lastPage={tablePageCount(completed.length, TABLE_PAGE_SIZE)}
                  total={completed.length}
                  onPageChange={setQueuePage}
                />
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
          onClick={() => setQueueTab("completed")}
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
          onClick={() => setQueueTab("active")}
        />
        <StatTile
          icon={<CheckCircle2 className="h-5 w-5 text-[hsl(var(--warning))]" />}
          label={t("consult.bookings.resolved")}
          value={stats ? String(stats.resolved) : "—"}
          iconWrapCls="bg-[hsl(var(--warning)/0.1)]"
          onClick={() => setQueueTab("completed")}
        />

        <div className="border-t border-border/60 pt-4 mt-auto">
          <p className="text-xs text-muted-foreground/50 leading-relaxed">
            {t("consult.bookings.stats_reset_daily")}
          </p>
        </div>
      </aside>

      {detailItem && (
        <InstantConsultDetailDrawer
          item={detailItem}
          consultId={resolveInstantConsultId(detailItem)}
          onClose={closeDetail}
          onOpenRecord={
            detailItem.status === "completed"
              ? () => {
                  closeDetail();
                  openCompletedConsult(detailItem);
                }
              : undefined
          }
        />
      )}

      {/* Step 1 — required: consultation summary (SOAP note) */}
      {recordItem != null && (
        <ConsultationSummaryModal
          instantConsultationId={resolveInstantConsultId(recordItem)}
          patientId={recordPatientId}
          patientName={recordNoteForm?.identity.full_name || recordItem.guest_name || recordItem.guest_phone}
          defaultComplaint={recordNoteForm?.chief_complaint}
          defaultDiagnosis={recordNoteForm?.clinical_assessment}
          onClose={() => setRecordItem(null)}
          onSaved={() => {
            const item = recordItem;
            setRecordItem(null);
            setPrescriptionItem(item);
          }}
        />
      )}

      {/* Step 2 — optional: quick prescription (create + issue + optional pharmacy) */}
      {prescriptionItem != null && (
        <QuickPrescriptionModal
          instantConsultationId={resolveInstantConsultId(prescriptionItem) ?? undefined}
          patientName={prescriptionItem.guest_phone}
          onSkip={() => {
            const item = prescriptionItem;
            setPrescriptionItem(null);
            setCareItem(item);
          }}
          onDone={() => {
            const item = prescriptionItem;
            setPrescriptionItem(null);
            setCareItem(item);
          }}
        />
      )}

      {careItem != null && !bookingItem && !referItem && !orderKindShown && (
        <CareContinuePanel
          patientName={careItem.guest_phone}
          onChoose={(choice) => {
            const item = careItem;
            if (choice === "done") {
              setCareItem(null);
              if (item) completeConsult(item);
              return;
            }
            if (choice === "facility-book") {
              setBookingItem(item);
              return;
            }
            const referral = referralKindFromChoice(choice);
            if (referral) {
              setReferKind(referral);
              setReferUrgency(referralUrgencyFromChoice(choice) || "medium");
              setReferItem(item);
              return;
            }
            const orderType = orderTypeFromChoice(choice);
            if (orderType) {
              setOrderKind(orderType);
              setOrderKindShown(true);
            }
          }}
        />
      )}
      {referItem != null && (
        <ReferralCreateModal
          open
          kind={referKind}
          patientId={patientIdOf(referItem)}
          patientName={referItem.guest_phone}
          instantConsultationId={resolveInstantConsultId(referItem) ?? undefined}
          defaultUrgency={referUrgency}
          onClose={() => setReferItem(null)}
          onSkip={() => setReferItem(null)}
          onCreated={() => setReferItem(null)}
        />
      )}
      {careItem != null && orderKindShown && (
        <ClinicalOrderModal
          open
          kind={orderKind}
          patientId={patientIdOf(careItem)}
          patientName={careItem.guest_phone}
          instantConsultationId={resolveInstantConsultId(careItem) ?? undefined}
          onClose={() => setOrderKindShown(false)}
          onSkip={() => setOrderKindShown(false)}
          onCreated={() => setOrderKindShown(false)}
        />
      )}
      {/* Step 4 - optional: book physical appointment, then complete */}
      {bookingItem != null && (
        <BookPhysicalModal
          open
          onClose={() => setBookingItem(null)}
          patientId={bookingPatientId}
          patientPhone={bookingItem?.guest_phone}
          defaultNotes={bookingDefaultNotes}
          onSkip={() => setBookingItem(null)}
          onBooked={() => setBookingItem(null)}
        />
      )}
    </div>
  );
}
