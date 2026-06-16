import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Video, MapPin, Calendar, Clock, SlidersHorizontal, X,
  FileText, AlertCircle, Loader2, Eye, Timer,
  ChevronRight, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  useGetAppointments,
  useAcceptQuick,
  useJoinSession,
  useReadyNext,
  type Appointment,
  type GetAppointmentsParams,
} from "@/hooks/doctor/use-doctor-appointment";
import { AppointmentContext, useCallStore } from "@/context/CallStore";
import { useCallContext } from "@/context/CallContext";
import { startInAppCallFromJoin } from "@/lib/scheduled-call";
import { doctors } from "@/lib/mock-data";

import { FilterSidebar } from "./shared/FilterSidebar";
import { AppointmentCard } from "./shared/AppointmentCard";
import { RunningLateModal } from "./shared/RunningLateModal";
import { AppointmentDetailDrawer } from "./shared/AppointmentDetailDrawer";
import { ScheduledCallView } from "./shared/ScheduledCallView";
import {
  type FilterState, type ViewMode, type UIStatus,
  INITIAL_FILTERS, STATUS_STYLES, STATUS_DOT,
} from "./shared/types";
import {
  fmtDate, fmtTime, apptLabel, apptSpecialty,
  statusLabel, getErrMsg,
} from "./shared/helpers";
import { SkeletonRow } from "./shared/Skeletonrow";

// ─── Mock doctor ──────────────────────────────────────────────────────────────

const MOCK_DOCTOR = doctors?.[0] ?? {
  id: "mock", name: "Dr. (Scheduled)", specialty: "General", hospital: "",
  avatar: "DR", status: "online" as const, rating: 5, reviews: 0,
  experience: 10, instantAvailable: true, fee: 0,
};

// ─── Param builder ────────────────────────────────────────────────────────────

function filtersToParams(filters: FilterState): GetAppointmentsParams {
  const params: GetAppointmentsParams = {};
  if (filters.status !== "All") params.status   = filters.status;
  if (filters.type   !== "All") params.type     = filters.type;
  if (filters.today)             params.today    = true;
  if (filters.upcoming)          params.upcoming = true;
  if (filters.date) {
    params.date = filters.date;
    delete params.today;
    delete params.upcoming;
  }
  return params;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentsTab() {
  const { t, i18n } = useTranslation();
  const call = useCallStore();
  const { startCall } = useCallContext();

  const [filters,             setFilters]             = useState<FilterState>(INITIAL_FILTERS);
  const [view,                setView]                = useState<ViewMode>("table");
  const [filterOpen,          setFilterOpen]          = useState(false);
  const [scheduledCallActive, setScheduledCallActive] = useState(false);
  const [detailAppt,          setDetailAppt]          = useState<Appointment | null>(null);
  const [runningLateAppt,     setRunningLateAppt]     = useState<Appointment | null>(null);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS), [filters]
  );
  const clearAllFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  // Lock body scroll when mobile filter drawer is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // Sync call phase → view state
  useEffect(() => {
    if (call.phase === "idle" && scheduledCallActive) setScheduledCallActive(false);
  }, [call.phase, scheduledCallActive]);

  // ── API ────────────────────────────────────────────────────────────────────
  const queryParams = useMemo(() => filtersToParams(filters), [filters]);
  const { data, isLoading, isError, error } = useGetAppointments(queryParams);

  const joinSession = useJoinSession();
  const acceptQuick = useAcceptQuick();
  const readyNext   = useReadyNext();

  const appointments: Appointment[] = data?.data ?? [];
  console.log("appointments:", appointments);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return appointments
      .filter((a) => {
        if (!q) return true;
        return (
          a.patient?.name?.toLowerCase().includes(q) ||
          a.appointment_date.includes(q)
        );
      })
      .sort((a, b) => {
        if (filters.sort === "date-desc") {
          return `${b.appointment_date}${b.appointment_time}`.localeCompare(
            `${a.appointment_date}${a.appointment_time}`
          );
        }
        if (filters.sort === "name") {
          return (a.patient?.name ?? "").localeCompare(b.patient?.name ?? "");
        }
        return `${a.appointment_date}${a.appointment_time}`.localeCompare(
          `${b.appointment_date}${b.appointment_time}`
        );
      });
  }, [appointments, filters.search, filters.sort]);

  // Status counts for toolbar chips
  const pendingCount    = filtered.filter((a) => a.status === "pending").length;
  const confirmedCount  = filtered.filter((a) => a.status === "confirmed").length;
  const inProgressCount = filtered.filter((a) => a.status === "in_progress").length;
  const completedCount  = filtered.filter((a) => a.status === "completed").length;

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Build an AppointmentContext and start / rejoin a scheduled call. */
  const startOrRejoin = useCallback(
    (appt: Appointment, isRejoin = false) => {
      const apptCtx: AppointmentContext = {
        id:           String(appt.id),
        patientLabel: appt.patient?.name ?? "Patient",
        specialty:    apptSpecialty(appt),
        date:         appt.appointment_date,
        time:         appt.appointment_time,
        type:         appt.type === "online" ? "video" : "in-person",
      };

      // Open the in-app ConsultationRoom (same call + chat as instant consults)
      // when the join token is our WebRTC format; otherwise fall back to the
      // previous scheduled-call behaviour.
      const openCall = (res: unknown) => {
        const started = startInAppCallFromJoin(startCall, res as any, {
          consultationId: appt.id,
          isOwner: true,
        });
        if (!started) {
          call.startScheduledCall(apptCtx, MOCK_DOCTOR);
          setScheduledCallActive(true);
          const joinUrl = (res as any)?.join_url;
          if (joinUrl) window.open(joinUrl, "_blank", "noopener,noreferrer");
        }
      };

      const join = () =>
        joinSession.mutate(appt.id, {
          onSuccess: (res) => openCall(res),
          onError: (err: unknown) => {
            toast.error(getErrMsg(err, isRejoin ? "Failed to rejoin session" : "Failed to join session"));
          },
        });

      if (!isRejoin && appt.booking_type === "quick" && appt.status === "pending") {
        // Quick appointment that hasn't been accepted yet — accept, then join.
        acceptQuick.mutate(appt.id, {
          onSuccess: () => join(),
          onError: (err: unknown) => {
            toast.error(getErrMsg(err, "Failed to accept appointment"));
          },
        });
      } else {
        join();
      }
    },
    [call, acceptQuick, joinSession, startCall]
  );

  const handleStart  = useCallback((appt: Appointment) => startOrRejoin(appt, false), [startOrRejoin]);
  const handleRejoin = useCallback((appt: Appointment) => startOrRejoin(appt, true),  [startOrRejoin]);

  const handleReadyNext = useCallback((appt: Appointment) => {
    readyNext.mutate(appt.id, {
      onSuccess: (res) => {
        if (res.next_appointment) {
          toast.success(`${res.next_appointment.patient.name} `);
        } else {
          toast.success(res.message ?? "Next patient notified.");
        }
      },
      onError: (err: unknown) => {
        toast.error(getErrMsg(err, "No next appointment found."));
      },
    });
  }, [readyNext]);

  const handleExit = useCallback(() => {
    call.endCall();
    setScheduledCallActive(false);
  }, [call]);

  // ── Active call view ───────────────────────────────────────────────────────

  if (
    scheduledCallActive &&
    call.role === "doctor" &&
    (call.phase === "connected" || call.phase === "ended")
  ) {
    return <ScheduledCallView onExit={handleExit} />;
  }

  // ── Filter sidebar content (reused in desktop aside + mobile drawer) ───────

  const sidebarContent = (
    <FilterSidebar
      filters={filters}
      setFilters={setFilters}
      hasActiveFilters={hasActiveFilters}
      clearAllFilters={clearAllFilters}
    />
  );

  const isJoining = acceptQuick.isPending || joinSession.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Detail drawer */}
      {detailAppt && (
        <AppointmentDetailDrawer
          appt={detailAppt}
          onClose={() => setDetailAppt(null)}
          onStart={(a) => { handleStart(a); setDetailAppt(null); }}
          onRejoin={(a) => { handleRejoin(a); setDetailAppt(null); }}
          onRunningLate={(a) => { setRunningLateAppt(a); setDetailAppt(null); }}
          onReadyNext={(a) => handleReadyNext(a)}
          isReadyNextPending={readyNext.isPending}
          isJoining={isJoining}
        />
      )}

      {/* Running-late modal */}
      {runningLateAppt && (
        <RunningLateModal appt={runningLateAppt} onClose={() => setRunningLateAppt(null)} />
      )}

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
        {/* ── Toolbar ── */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-muted-foreground">
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> {t('consult.booking.loading')}
                </span>
              ) : (
                <>
                  <span className="font-bold text-foreground">{data?.total ?? filtered.length}</span>{" "}
                  {(data?.total ?? filtered.length) === 1 ? t('consult.booking.appointment') : t('consult.booking.appointments')}
                  {hasActiveFilters && (
                    <button onClick={clearAllFilters} className="ml-2 text-primary hover:underline text-[10px] font-medium">
                      {t('consult.booking.reset_filters')}
                    </button>
                  )}
                </>
              )}
            </p>

            {/* Status chips */}
            <div className="hidden lg:flex items-center gap-2">
              {pendingCount    > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{pendingCount} pending
                </span>
              )}
              {confirmedCount  > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />{confirmedCount} confirmed
                </span>
              )}
              {inProgressCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200 dark:border-violet-900 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />{inProgressCount} active
                </span>
              )}
              {completedCount  > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{completedCount} done
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden sm:flex relative">
              <input
                type="text"
                placeholder="Search patient…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="h-7 pl-2.5 pr-7 text-[11px] bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all w-36 focus:w-48"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setFilterOpen(true)}
              className={cn(
                "md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-all duration-200 font-medium",
                hasActiveFilters
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              {
                t('consult.booking.filter')
              }
            </button>

            {/* View toggle */}
            <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                className={cn("px-2.5 py-1.5 transition-all duration-200",
                  view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M3 15h18M9 3v18" />
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

        {/* ── Content ── */}
        <div className="p-4">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground">
                  {t("consult.booking.failed_to_load_appointments")}
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {getErrMsg(error, t("consult.booking.failed_to_load_appointments"))}
                </p>
              </div>
            </div>

          ) : !isLoading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                <Calendar className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground">
                  {t("consult.booking.no_appointments_match_your_filters")}
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {t("consult.booking.try_widening_your_search_criteria")}
                </p>
              </div>
              <button onClick={clearAllFilters} className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                {t("consult.booking.clear_all_filters")}
              </button>
            </div>

          ) : view === "table" ? (
            /* ── Table view ── */
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
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    : filtered.map((a) => {
                        const status      = a.status as UIStatus;
                        const canStart    = status === "confirmed" || status === "pending";
                        const isInProgress = status === "in_progress";
                        const hasNotes    = !!a.notes;

                        return (
                          <tr
                            key={a.id}
                            className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                          >
                            {/* Patient */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-sm bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-primary/10">
                                  {a.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
                                </div>
                                <div>
                                  <p className="font-semibold text-[12px] text-foreground">{apptLabel(a)}</p>
                                  <p className="text-[10px] text-muted-foreground/70 capitalize">{a.booking_type}</p>
                                </div>
                              </div>
                            </td>

                            {/* When */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <Calendar className="h-3 w-3 text-muted-foreground/40" />
                                  {fmtDate(a.appointment_date)}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-3 w-3 text-muted-foreground/40" />
                                  {fmtTime(a.appointment_time)}
                                </span>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
                                {a.type === "online"
                                  ? <Video className="h-3.5 w-3.5 text-sky-500" />
                                  : <MapPin className="h-3.5 w-3.5 text-amber-500" />}
                                <span>{a.type === "online" ? "Video" : "In-person"}</span>
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", STATUS_STYLES[status])}>
                                <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[status])} />
                                {statusLabel(status)}
                              </Badge>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {hasNotes && (
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                                    <FileText className="h-3 w-3" /> {t("consult.booking.has_notes")}
                                  </span>
                                )}

                                {/* Details */}
                                <button
                                  onClick={() => setDetailAppt(a)}
                                  className="h-7 px-2 rounded-sm border border-border/60 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors flex items-center gap-1"
                                  title="View details"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span className="hidden xl:inline">{t("consult.booking.details")}</span>
                                </button>

                                {/* Running late */}
                                {isInProgress && (
                                  <button
                                    onClick={() => setRunningLateAppt(a)}
                                    className="h-7 px-2 rounded-sm border border-amber-200 dark:border-amber-900 text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors flex items-center gap-1"
                                    title="Running late"
                                  >
                                    <Timer className="h-3 w-3" />
                                    <span className="hidden xl:inline">{t("consult.booking.late")}</span>
                                  </button>
                                )}

                                {/* Ready for next */}
                                {isInProgress && (
                                  <button
                                    onClick={() => handleReadyNext(a)}
                                    disabled={readyNext.isPending}
                                    className="h-7 px-2 rounded-sm border border-emerald-200 dark:border-emerald-900 text-[10px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    title="Ready for next patient"
                                  >
                                    {readyNext.isPending
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <ChevronRight className="h-3 w-3" />}
                                    <span className="hidden xl:inline">
                                      {t("consult.booking.ready")}
                                    </span>
                                  </button>
                                )}

                                {/* ── REJOIN — in_progress ── */}
                                {isInProgress && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleRejoin(a)}
                                    disabled={isJoining}
                                    className="h-7 px-3 text-[10px] font-semibold rounded-sm bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-sm flex items-center gap-1"
                                    title="Rejoin session"
                                  >
                                    {isJoining
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <Video className="h-3 w-3" />}
                                    <span>{t("consult.booking.rejoin")}</span>
                                  </Button>
                                )}

                                {/* Start — pending / confirmed */}
                                {canStart && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStart(a)}
                                    disabled={isJoining}
                                    className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm"
                                  >
                                    {isJoining
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : t("pages.doctor.start")}
                                  </Button>
                                )}

                                {/* Notes — completed */}
                                {!canStart && !isInProgress && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
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
            /* ── Card view ── */
            <div className="flex flex-col gap-2">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-sm bg-muted/40 animate-pulse border border-border/40" />
                  ))
                : filtered.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appt={a}
                      onStart={handleStart}
                      onRejoin={handleRejoin}
                      onView={setDetailAppt}
                      hasNotes={!!a.notes}
                    />
                  ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
