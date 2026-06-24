import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Video, MapPin, Calendar, Clock, SlidersHorizontal, X,
  FileText, AlertCircle, Loader2, Eye, Timer,
  ChevronRight, CheckCheck, LayoutGrid, List
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

import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
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

const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  confirmed: 1,
  pending: 2,
  completed: 3,
};

// ─── Param builder ────────────────────────────────────────────────────────────

function filtersToParams(filters: FilterState): GetAppointmentsParams {
  const params: GetAppointmentsParams = {};
  if (filters.status !== "All") params.status = filters.status;
  if (filters.type !== "All") params.type = filters.type;
  if (filters.today) params.today = true;
  if (filters.upcoming) params.upcoming = true;
  if (filters.date) {
    params.date = filters.date;
    delete params.today;
    delete params.upcoming;
  }
  return params;
}

function minutesFromTimeRange(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const toMinutes = (value: string) => {
    const [h, m] = value.slice(0, 5).split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes == null || endMinutes == null) return null;
  const diff = endMinutes - startMinutes;
  return diff > 0 ? diff : diff + 24 * 60;
}

function appointmentDurationMinutes(appt: Appointment): number | null {
  const slotDuration = minutesFromTimeRange(appt.slot?.start_time, appt.slot?.end_time);
  if (slotDuration) return slotDuration;

  const raw = (appt as any).duration_minutes ?? (appt as any).duration;
  const duration = Number(raw);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentsTab() {
  const { t, i18n } = useTranslation();
  const call = useCallStore();
  const { startCall } = useCallContext();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [scheduledCallActive, setScheduledCallActive] = useState(false);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [runningLateAppt, setRunningLateAppt] = useState<Appointment | null>(null);

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
  const readyNext = useReadyNext();

  const appointments: Appointment[] = data?.data ?? [];

  const appointmentStats = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const local = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      in_progress: appointments.filter((a) => a.status === "in_progress").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      today: appointments.filter((a) => a.appointment_date?.slice(0, 10) === todayKey).length,
    };

    return {
      total: data?.stats?.total ?? data?.total ?? local.total,
      pending: data?.stats?.pending ?? local.pending,
      confirmed: data?.stats?.confirmed ?? local.confirmed,
      in_progress: local.in_progress,
      completed: data?.stats?.completed ?? local.completed,
      today: data?.stats?.today ?? local.today,
    };
  }, [appointments, data?.stats, data?.total]);

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
        const statusOrder =
          (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        if (statusOrder !== 0) return statusOrder;

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
  const pendingCount = filtered.filter((a) => a.status === "pending").length;
  const confirmedCount = filtered.filter((a) => a.status === "confirmed").length;
  const inProgressCount = filtered.filter((a) => a.status === "in_progress").length;
  const completedCount = filtered.filter((a) => a.status === "completed").length;

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Build an AppointmentContext and start / rejoin a scheduled call. */
  const startOrRejoin = useCallback(
    (appt: Appointment, isRejoin = false) => {
      const apptCtx: AppointmentContext = {
        id: String(appt.id),
        patientLabel: appt.patient?.name ?? "Patient",
        specialty: apptSpecialty(appt),
        date: appt.appointment_date,
        time: appt.appointment_time,
        type: appt.type === "online" ? "video" : "in-person",
      };

      // Open the in-app ConsultationRoom (same call + chat as instant consults)
      // when the join token is our WebRTC format; otherwise fall back to the
      // previous scheduled-call behaviour.
      const openCall = (res: unknown) => {
        const started = startInAppCallFromJoin(startCall, res as any, {
          consultationId: appt.id,
          isOwner: true,
          appointmentDurationMinutes: appointmentDurationMinutes(appt),
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

  const handleStart = useCallback((appt: Appointment) => startOrRejoin(appt, false), [startOrRejoin]);
  const handleRejoin = useCallback((appt: Appointment) => startOrRejoin(appt, true), [startOrRejoin]);

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

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "All", label: "All statuses" },
        { value: "pending", label: "Pending" },
        { value: "confirmed", label: "Confirmed" },
        { value: "in_progress", label: "In progress" },
        { value: "completed", label: "Completed" },
      ],
      onChange: (v: string) => setFilters((f) => ({ ...f, status: v as any }))
    },
    {
      type: "select" as const,
      key: "type",
      label: "Type",
      value: filters.type,
      options: [
        { value: "All", label: "All types" },
        { value: "online", label: "Video consult" },
        { value: "in_person", label: "In-person visit" },
      ],
      onChange: (v: string) => setFilters((f) => ({ ...f, type: v as any }))
    },
    {
      type: "custom" as const,
      key: "when",
      label: "When",
      render: () => {
        const activePreset = !filters.date && (filters.today ? "today" : filters.upcoming ? "upcoming" : "all");
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: "All dates", val: "all", today: false, upcoming: false },
                { label: "Today", val: "today", today: true, upcoming: false },
                { label: "Upcoming", val: "upcoming", today: false, upcoming: true },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setFilters((f) => ({ ...f, today: opt.today, upcoming: opt.upcoming, date: "" }))}
                  className={cn(
                    "py-1.5 text-[11px] rounded-[4px] border transition-colors text-center font-medium",
                    activePreset === opt.val
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/60 text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70 mb-1 font-medium">Specific date</p>
              <div className="relative">
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value, today: false, upcoming: false }))}
                  className="w-full px-2.5 py-1 text-[11px] bg-background border border-border/60 rounded-[4px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer h-7"
                />
                {filters.date && (
                  <button
                    onClick={() => setFilters((f) => ({ ...f, date: "" }))}
                    className="absolute right-1 top-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      type: "search" as const,
      key: "search",
      label: "Search",
      value: filters.search,
      placeholder: "Search patient…",
      onChange: (v: string) => setFilters((f) => ({ ...f, search: v }))
    }
  ], [filters, setFilters]);

  const isJoining = acceptQuick.isPending || joinSession.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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

      <FilterBar
        open={filterOpen}
        onToggle={() => setFilterOpen(!filterOpen)}
        hasActiveFilters={hasActiveFilters}
        onClearAll={clearAllFilters}
        fields={filterFields}
        cols={{ default: 1, sm: 2, lg: 4 }}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 p-5 pb-0">
          {[
            { label: "Total bookings", value: appointmentStats.total, sub: "All scheduled", icon: Calendar, tone: "text-foreground bg-muted/50 border-border/60" },
            { label: "Confirmed", value: appointmentStats.confirmed, sub: "Ready to join", icon: CheckCheck, tone: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
            { label: "In progress", value: appointmentStats.in_progress, sub: "Live now", icon: Video, tone: "text-violet-600 bg-violet-500/10 border-violet-500/20" },
            { label: "Pending", value: appointmentStats.pending, sub: "Awaiting confirmation", icon: AlertCircle, tone: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
            { label: "Today", value: appointmentStats.today, sub: "On schedule", icon: Clock, tone: "text-primary bg-primary/10 border-primary/20" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[6px] border border-border/70 bg-card p-3 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 truncate">
                      {item.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {isLoading ? "..." : item.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 truncate">
                      {item.sub}
                    </p>
                  </div>
                  <div className={cn("h-9 w-9 shrink-0 rounded-[6px] border flex items-center justify-center", item.tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* ── Toolbar ── */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('consult.booking.loading')}
                </span>
              ) : (
                <>
                  <span className="font-bold text-foreground">{data?.total ?? filtered.length}</span>{" "}
                  {(data?.total ?? filtered.length) === 1 ? t('consult.booking.appointment') : t('consult.booking.appointments')}
                </>
              )}
            </p>

            {/* Status chips */}
            {/* <div className="hidden lg:flex items-center gap-3">
              {pendingCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{pendingCount} pending
                </span>
              )}
              {confirmedCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />{confirmedCount} confirmed
                </span>
              )}
              {inProgressCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200 dark:border-violet-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />{inProgressCount} active
                </span>
              )}
              {completedCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{completedCount} done
                </span>
              )}
            </div> */}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as any }))}
              className="hidden sm:block px-2 py-1.5 text-[11px] font-medium bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
            >
              <option value="date-asc">Oldest first</option>
              <option value="date-desc">Latest first</option>
              <option value="name">Patient name A-Z</option>
            </select>

            <FilterToggleButton
              open={filterOpen}
              onToggle={() => setFilterOpen(!filterOpen)}
              hasActiveFilters={hasActiveFilters}
            />

            <div className="flex rounded-[6px] border border-border overflow-hidden bg-card shadow-sm">
              <button
                onClick={() => setView("table")}
                className={cn(
                  "p-1.5 transition-colors",
                  view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("cards")}
                className={cn(
                  "p-1.5 transition-colors",
                  view === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-5">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-[6px] bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t("consult.booking.failed_to_load_appointments")}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {getErrMsg(error, t("consult.booking.failed_to_load_appointments"))}
                </p>
              </div>
            </div>

          ) : !isLoading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                <Calendar className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t("consult.booking.no_appointments_match_your_filters")}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t("consult.booking.try_widening_your_search_criteria")}
                </p>
              </div>
              <button onClick={clearAllFilters} className="text-xs text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-2">
                {t("consult.booking.clear_all_filters")}
              </button>
            </div>

          ) : view === "table" ? (
            /* ── Table view ── */
            <div className="rounded-[6px] border border-border/70 bg-card overflow-auto  shadow-sm">
              <table className="w-full text-xs  ">
                <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                  <tr>
                    <th className="text-left px-5 py-4 font-semibold">{t("pages.doctor.th_patient")}</th>
                    <th className="text-left px-5 py-4 font-semibold">{t("pages.doctor.th_when")}</th>
                    <th className="text-left px-5 py-4 font-semibold">{t("pages.doctor.th_type")}</th>
                    <th className="text-left px-5 py-4 font-semibold">{t("pages.doctor.th_status")}</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    : filtered.map((a) => {
                      const status = a.status as UIStatus;
                      const canStart = status === "confirmed";
                      const isInProgress = status === "in_progress";
                      const hasNotes = !!a.notes;
                      return (
                        <tr
                          key={a.id}
                          className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150"
                        >
                          {/* Patient */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-[6px] bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/10">
                                {a.patient?.name?.slice(0, 2).toUpperCase() || "PT"}
                              </div>
                              <div>
                                <p className="font-semibold text-xs text-foreground">{apptLabel(a)}</p>
                                <p className="text-xs text-muted-foreground/70 capitalize">{a.booking_type}</p>
                              </div>
                            </div>
                          </td>

                          {/* When */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                                <Calendar className="h-4 w-4 text-muted-foreground/40" />
                                {fmtDate(a.appointment_date)}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-4 w-4 text-muted-foreground/40" />

                                {fmtTime(a.appointment_time)}
                              </span>
                            </div>
                          </td>
                          {/* Type */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 text-muted-foreground/80 text-xs">
                              {a.type === "online"
                                ? <Video className="h-4 w-4 text-sky-500" />
                                : <MapPin className="h-4 w-4 text-amber-500" />}
                              <span>{a.type === "online" ? "Video" : "In-person"}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <Badge variant="outline" className={cn("border text-xs px-2.5 py-0.5 font-medium", STATUS_STYLES[status])}>
                              <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[status])} />
                              {statusLabel(status)}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasNotes && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5">
                                  <FileText className="h-4 w-4" /> {t("consult.booking.has_notes")}
                                </span>
                              )}

                              {/* Details */}
                              <button
                                onClick={() => setDetailAppt(a)}
                                className="h-9 px-3 rounded-[6px] border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors flex items-center gap-1.5"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden xl:inline">{t("consult.booking.details")}</span>
                              </button>

                              {/* Running late */}
                              {isInProgress && (
                                <button
                                  onClick={() => setRunningLateAppt(a)}
                                  className="h-9 px-3 rounded-[6px] border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors flex items-center gap-1.5"
                                  title="Running late"
                                >
                                  <Timer className="h-4 w-4" />
                                  <span className="hidden xl:inline">{t("consult.booking.late")}</span>
                                </button>
                              )}

                              {/* Ready for next */}
                              {isInProgress && (
                                <button
                                  onClick={() => handleReadyNext(a)}
                                  disabled={readyNext.isPending}
                                  className="h-9 px-3 rounded-[6px] border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                  title="Ready for next patient"
                                >
                                  {readyNext.isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <ChevronRight className="h-4 w-4" />}
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
                                  className="h-9 px-4 text-xs font-semibold rounded-[6px] bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-sm flex items-center gap-1.5"
                                  title="Rejoin session"
                                >
                                  {isJoining
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Video className="h-4 w-4" />}
                                  <span>{t("consult.booking.rejoin")}</span>
                                </Button>
                              )}

                              {/* Start — pending / confirmed */}
                              {canStart && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStart(a)}
                                  disabled={isJoining}
                                  className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm"
                                >
                                  {isJoining
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : t("pages.doctor.start")}
                                </Button>
                              )}

                              {/* Notes — completed */}
                              {status === "pending" && (
                                <span className="h-9 px-3 rounded-[6px] border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 flex items-center">
                                  Awaiting confirmation
                                </span>
                              )}

                              {!canStart && !isInProgress && status !== "pending" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 px-4 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-[6px]"
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
                  <div key={i} className="h-16 rounded-[6px] bg-muted/40 animate-pulse border border-border/40" />
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
