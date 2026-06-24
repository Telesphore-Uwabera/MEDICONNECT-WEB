import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useCallContext } from "@/context/CallContext";
import { startInAppCallFromJoin, decodeCallToken } from "@/lib/scheduled-call";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Video, MapPin, Calendar, Clock, X,
  SlidersHorizontal, ChevronLeft, ChevronRight,
  Building2,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import {
  useGetPatientQuickAppointments,
  ApiAppointment,
  ApiAppointmentStatus,
  ApiAppointmentType,
  AppointmentFilterParams,
} from "@/hooks/patient/use-patient-appointment";
import AppointmentDetailModal from "./components/AppointmentDetail";
import { Link } from "react-router-dom";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { Card } from "@/components/ui/card";
import { MyMedicalInfoDrawer } from "./components/MyMedicalInfoDrawer";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortOption = "date-asc" | "date-desc" | "doctor";
type ViewMode = "table" | "cards";

interface JoinResponse {
  message?: string;
  room_url?: string;
  room_name?: string;
  token?: string;
  join_url?: string;
}

// GET /patient/quick/{id} — instant detail carrying the patient's join token.
interface InstantQuickDetail {
  id: number;
  status?: string;
  daily_room_url?: string;
  daily_room_name?: string;
  daily_guest_token?: string; // patient WebRTC token (is_owner: false)
  guest_token?: string;
}

interface FilterState {
  status: ApiAppointmentStatus | "all";
  type: ApiAppointmentType | "all";
  date_from: string;
  date_to: string;
  sort: SortOption;
  page: number;
}

const INITIAL_FILTERS: FilterState = {
  status: "all",
  type: "all",
  date_from: "",
  date_to: "",
  sort: "date-desc", // usually want newest first for history
  page: 1,
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ApiAppointmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  confirmed: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<ApiAppointmentStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  in_progress: "bg-violet-500 animate-pulse",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const STATUS_LABEL: Record<ApiAppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "MMM dd, yyyy"); }
  catch { return dateStr; }
}

function formatTime(timeStr: string) {
  if (!timeStr) return "—";
  try {
    const t = timeStr.length <= 8 ? `2000-01-01T${timeStr}` : timeStr;
    return format(parseISO(t), "hh:mm a");
  } catch { return timeStr; }
}

function getDoctorName(appt: ApiAppointment) {
  if (appt.doctor) return appt.doctor.designations || appt.doctor.user.name;
  if (appt.hospital) return appt.hospital.name_en;
  return "—";
}

function getDoctorInitials(appt: ApiAppointment) {
  return getDoctorName(appt).slice(0, 2).toUpperCase();
}

function getDoctorAvatar(appt: ApiAppointment) {
  return appt.doctor?.image ?? appt.doctor?.user.avatar ?? null;
}

function getSpecialty(appt: ApiAppointment) {
  if (appt.doctor) return appt.doctor.specialization || appt.doctor.doctor_degree || "—";
  if (appt.hospital) return [appt.hospital.city, appt.hospital.address].filter(Boolean).join(" · ");
  return "—";
}

function isActionable(status: ApiAppointmentStatus) {
  return status === "confirmed" || status === "in_progress";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 text-xs border-b border-border/60 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-2 rounded-[6px] text-xs border transition-all duration-200 text-left",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function AppointmentRowSkeleton() {
  return (
    <tr className="border-t border-border/40 animate-pulse">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-[6px] bg-muted shrink-0" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-2.5 w-24 rounded bg-muted" /></td>
      <td className="px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-muted" />
          <div className="h-2 w-14 rounded bg-muted" />
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-2.5 w-16 rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 rounded-[6px] bg-muted" /></td>
      <td className="px-4 py-3 text-right"><div className="h-7 w-14 rounded-[6px] bg-muted ml-auto" /></td>
    </tr>
  );
}

function AppointmentCardSkeleton() {
  return (
    <div className="bg-card border border-border/70 rounded-[6px] p-4 flex flex-col gap-4 animate-pulse">
      <div className="flex items-start gap-3.5">
        <div className="w-16 h-16 rounded-[6px] bg-muted shrink-0" />
        <div className="flex-1 space-y-2 mt-1">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="h-14 w-full rounded-[6px] bg-muted" />
      <div className="h-8 w-full flex gap-2">
        <div className="h-8 flex-1 rounded-[6px] bg-muted" />
        <div className="h-8 flex-1 rounded-[6px] bg-muted" />
      </div>
    </div>
  );
}

function AppointmentCardItem({
  appt,
  onDetails,
  onJoin,
}: {
  appt: ApiAppointment;
  onDetails: () => void;
  onJoin: () => void;
}) {
  const avatar = getDoctorAvatar(appt);
  const actionable = isActionable(appt.status);

  return (
    <Card
      className="rounded-[6px] overflow-hidden border-border/60 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={onDetails}
    >
      {/* ── Top strip ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Request
        </span>
        <span className={cn("text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-[6px] border", STATUS_STYLES[appt.status])}>
          {STATUS_LABEL[appt.status]}
        </span>
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Identity row */}
        <div className="flex items-start gap-3.5">
          <div className="h-16 w-16 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/15 overflow-hidden shadow-sm font-bold text-xl">
            {avatar ? (
              <img src={avatar} alt={getDoctorName(appt)} className="h-full w-full object-cover" />
            ) : appt.type === "online" ? (
              <Video className="w-6 h-6" />
            ) : (
              <MapPin className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground leading-tight truncate">
              {getDoctorName(appt)}
            </h3>
            <p className="text-[13px] font-medium text-muted-foreground mt-1 truncate">
              {getSpecialty(appt)}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-[6px] border border-border overflow-hidden">
          <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Date</span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {formatDate(appt.appointment_date)}
            </span>
          </div>
          <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Time</span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {formatTime(appt.appointment_time)}
            </span>
          </div>
          <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              {appt.type === "online" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              <span className="text-[10px] uppercase tracking-wider font-semibold">Type</span>
            </div>
            <span className="text-xs font-semibold text-foreground">
              {appt.type === "online" ? "Video" : "In-person"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 mt-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs font-bold rounded-[6px] border-border/60 hover:bg-muted/50 transition-colors flex-1"
            onClick={(e) => { e.stopPropagation(); onDetails(); }}
          >
            Details
          </Button>
          <Button
            size="sm"
            disabled={!actionable}
            onClick={(e) => { e.stopPropagation(); onJoin(); }}
            className="h-8 px-3 text-xs font-bold rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 flex-1 shadow-sm"
          >
            {actionable ? "Join Call" : "Unavailable"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PatientInstant = () => {
  const { t, i18n } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [medInfoOpen, setMedInfoOpen] = useState(false);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openDetail = useCallback((id: string | number) => setSelectedId(String(id)), []);
  const closeDetail = useCallback(() => setSelectedId(null), []);

  // ── Join (video call) ────────────────────────────────────────────────────────
  const { startCall, activeCall, setMinimized } = useCallContext();

  // Joining differs by booking type:
  //  - instant      → GET /patient/quick/{id}; the detail carries the patient's
  //                   WebRTC token (daily_guest_token) → open the in-app room in
  //                   INSTANT chat mode (consultation_id = the instant id).
  //  - appointment  → POST /patient/appointments/{id}/join (appointment mode).
  const joinMutation = useMutation<void, unknown, ApiAppointment>({
    mutationFn: async (appt) => {
      if (appt.booking_type === "instant") {
        const detail = await apiFetch<InstantQuickDetail>(`/patient/quick/${appt.id}`);
        console.log("[Quick] instant detail:", detail);
        const decoded = decodeCallToken(detail.daily_guest_token);
        const roomName = detail.daily_room_name || decoded?.room;
        if (decoded && roomName) {
          decoded.consultation_id = Number(appt.id);
          decoded.is_owner = false;
          // Already in this exact call? Just bring the overlay back up.
          if (activeCall && activeCall.roomName === roomName) {
            setMinimized(false);
            return;
          }
          startCall(roomName, decoded);
          return;
        }
        // Not our WebRTC token — open the hosted room link if present.
        if (detail.daily_room_url) {
          window.open(detail.daily_room_url, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error("Could not open the consultation room.");
      }

      // Scheduled appointment
      const res = await apiFetch<JoinResponse>(
        `/patient/appointments/${appt.id}/join`,
        { method: "POST" },
      );
      console.log("[Quick] appointment join response:", res);
      const started = startInAppCallFromJoin(startCall, res, {
        consultationId: appt.id,
        isOwner: false,
      });
      if (started) return;
      const url = res.join_url || res.room_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else throw new Error("join_failed");
    },
  });

  const handleJoin = useCallback(
    (appt: ApiAppointment) => {
      joinMutation.mutate(appt, {
        onError: (err: any) => {
          console.error("[Quick] join failed:", err?.status, err?.data);
          toast.error(err?.message || t("consult.booking.join_failed"));
        },
      });
    },
    [joinMutation, t],
  );

  // ── API ────────────────────────────────────────────────────────────────────

  const apiParams: AppointmentFilterParams = useMemo(() => ({
    status: filters.status !== "all" ? filters.status : undefined,
    type: filters.type !== "all" ? filters.type : undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    page: filters.page,
  }), [filters]);

  const { data, isLoading } = useGetPatientQuickAppointments(apiParams);

  const appointments = data?.data ?? [];
  const totalPages = data?.last_page ?? 1;

  const sorted = useMemo(() => {
    return [...appointments].sort((a, b) => {
      switch (filters.sort) {
        case "date-desc": return String(b.appointment_date).localeCompare(String(a.appointment_date));
        case "doctor": return getDoctorName(a).localeCompare(getDoctorName(b));
        default: return String(a.appointment_date).localeCompare(String(b.appointment_date));
      }
    });
  }, [appointments, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" && key !== "sort" ? { page: 1 } : {}),
    }));
  }, []);

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: "All statuses" },
        { value: "pending", label: "Pending" },
        { value: "confirmed", label: "Confirmed" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "custom" as const,
      key: "date_range",
      label: "Date Range",
      render: () => (
        <div className="flex items-center gap-1.5 mt-1">
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => set("date_from", e.target.value)}
            className="w-full px-2 h-[28px] text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
          />
          <span className="text-muted-foreground/50 text-[10px]">-</span>
          <input
            type="date"
            value={filters.date_to}
            min={filters.date_from}
            onChange={(e) => set("date_to", e.target.value)}
            className="w-full px-2 h-[28px] text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
          />
          {(filters.date_from || filters.date_to) && (
            <button
              onClick={() => { set("date_from", ""); set("date_to", ""); }}
              className="ml-1 h-[28px] w-[28px] flex-shrink-0 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )
    }
  ], [filters, set]);

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  useEffect(() => {
    if (!selectedId) {
      document.body.style.overflow = filterOpen ? "hidden" : "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen, selectedId]);

  const counts = useMemo(() => appointments.reduce(
    (acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }),
    {} as Record<string, number>
  ), [appointments]);

  // ── Sidebar content ────────────────────────────────────────────────────────

  const sidebarContent = (
    <>
      <div className="px-4 pt-5 pb-4 flex  text-xs items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors"
          >
            <X className="w-4 h-4" /> Reset all
          </button>
        )}
      </div>

      <div className="px-4 text-xs">
        <FilterSection title="Status">
          <PillGroup<ApiAppointmentStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "in_progress", label: "In Progress" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </FilterSection>

        <FilterSection title="Date Range">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground/70 mb-1.5 font-medium">From</p>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => set("date_from", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground/70 mb-1.5 font-medium">To</p>
              <input
                type="date"
                value={filters.date_to}
                min={filters.date_from}
                onChange={(e) => set("date_to", e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
              />
            </div>
            {(filters.date_from || filters.date_to) && (
              <button
                onClick={() => { set("date_from", ""); set("date_to", ""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        </FilterSection>

        <FilterSection title="Sort">
          <PillGroup<SortOption>
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={[
              { value: "date-asc", label: "Date: Soonest first" },
              { value: "date-desc", label: "Date: Latest first" },
              { value: "doctor", label: "Doctor (A–Z)" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.instant_title") || "My Requests"}
          subtitle={t("pages.patient.instant_sub") || "Manage your instant consultations"}
        />

        {/* Quick access to the patient's own medical record */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-border/60 bg-card/30 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMedInfoOpen(true)}
            className="h-8 px-3 text-[11px] font-medium rounded-[6px] gap-1.5"
          >
            <HeartPulse className="h-3.5 w-3.5 text-primary" />
            My medical info
          </Button>
        </div>

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2, lg: 3 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-5 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground text-sm">{data?.total ?? 0}</span> requests
                {hasActiveFilters && (
                  <button onClick={clearAll} className="ml-3 text-primary hover:text-primary/80 hover:underline text-xs font-medium">
                    Reset filters
                  </button>
                )}
              </p>
              <div className="hidden lg:flex items-center gap-2.5">
                {(["confirmed", "in_progress", "pending"] as ApiAppointmentStatus[]).map((s) =>
                  counts[s] ? (
                    <span key={s} className={cn("flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1 rounded-[6px]", STATUS_STYLES[s])}>
                      <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[s])} />
                      {counts[s]} {STATUS_LABEL[s].toLowerCase()}
                    </span>
                  ) : null
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as SortOption)}
                className="hidden sm:block px-2 py-1.5 text-[11px] font-medium bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
              >
                <option value="date-asc">Soonest first</option>
                <option value="date-desc">Latest first</option>
                <option value="doctor">Doctor (A-Z)</option>
              </select>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              {/* View toggle */}
              <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card shadow-sm">
                <button
                  onClick={() => setView("table")}
                  aria-label="Table view"
                  className={cn(
                    "px-2.5 py-1.5 transition-all",
                    view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("cards")}
                  aria-label="Card view"
                  className={cn(
                    "px-2.5 py-1.5 border-l border-border/60 transition-all",
                    view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">

            <div className="flex items-center border-b border-border/60 px-2 sm:px-4 bg-card/30 shrink-0 overflow-x-auto">

              <Link to='/patient/appointments' className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium  transition-all duration-200 shrink-0 whitespace-nowrap">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.appointments')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.appointments_short')}
                </span>
              </Link>
              <Link to='/patient/instant' className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium border-b-2 border-primary text-primary transition-all duration-200 shrink-0 whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.instant')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.instant_short')}
                </span>
              </Link>
              <Link to='/patient/service-bookings' className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-[11px] sm:text-[12px] font-medium   transition-all duration-200 shrink-0 whitespace-nowrap">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">
                  {t('consult.bookings.service_bookings')}
                </span>
                <span className="sm:hidden">
                  {t('consult.bookings.service_bookings_short')}
                </span>
              </Link>

            </div>

            {/* Empty state */}
            {!isLoading && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Sparkles className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">No requests found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters</p>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="text-xs text-primary hover:text-primary/80 font-semibold hover:underline mt-1">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* ── Table view ── */}
            {view === "table" && (isLoading || sorted.length > 0) && (
              <div className="rounded-[6px] border border-border/70 bg-card  shadow-sm overflow-auto ">
                <table className="w-full text-sm ">
                  <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                    <tr>
                      <th className="text-left px-5 py-4 font-semibold">Doctor / Hospital</th>
                      <th className="text-left px-5 py-4 font-semibold">Specialty</th>
                      <th className="text-left px-5 py-4 font-semibold">Date & Time</th>
                      <th className="text-left px-5 py-4 font-semibold">Type</th>
                      <th className="text-left px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => <AppointmentRowSkeleton key={i} />)
                      : sorted.map((a) => (
                        <tr
                          key={a.id}
                          className="border-t border-border/40 hover:bg-secondary/20 transition-colors cursor-pointer"
                          onClick={() => openDetail(a.id)}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0 border border-primary/10 overflow-hidden">
                                {getDoctorAvatar(a) ? (
                                  <img src={getDoctorAvatar(a)!} alt={getDoctorName(a)} className="h-full w-full object-cover" />
                                ) : (
                                  getDoctorInitials(a)
                                )}
                              </div>
                              <span className="font-semibold text-sm text-foreground">{getDoctorName(a)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground/80">{getSpecialty(a)}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1.5 font-medium text-foreground">
                                <Calendar className="h-4 w-4 text-muted-foreground/40" />
                                {formatDate(a.appointment_date)}
                              </span>
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                                <Clock className="h-4 w-4 text-muted-foreground/40" />
                                {formatTime(a.appointment_time)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 text-muted-foreground/80">
                              <Video className="h-4 w-4 text-sky-500" />
                              <span className="text-sm">Video</span>
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant="outline" className={cn("border text-xs px-2 py-0.5 font-medium", STATUS_STYLES[a.status])}>
                              <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", STATUS_DOT[a.status])} />
                              {STATUS_LABEL[a.status]}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isActionable(a.status) ? (
                              <Button
                                size="sm"
                                className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm"
                                disabled={joinMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoin(a);
                                }}
                              >
                                Join call
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-4 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-[6px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(a.id);
                                }}
                              >
                                Details
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Cards view ── */}
            {view === "cards" && (isLoading || sorted.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 px-4 sm:px-5">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <AppointmentCardSkeleton key={i} />)
                  : sorted.map((a) => (
                    <AppointmentCardItem
                      key={a.id}
                      appt={a}
                      onDetails={() => openDetail(a.id)}
                      onJoin={() => handleJoin(a)}
                    />
                  ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{filters.page}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filters.page <= 1}
                    onClick={() => set("page", filters.page - 1)}
                    className="h-7 px-2.5 text-xs rounded-[6px]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - filters.page) <= 1)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                      ) : (
                        <Button
                          key={p}
                          size="sm"
                          variant={filters.page === p ? "default" : "outline"}
                          onClick={() => set("page", p as number)}
                          className={cn("h-7 min-w-[28px] px-2 text-xs rounded-[6px]", filters.page === p && "bg-primary text-primary-foreground")}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={filters.page >= totalPages}
                    onClick={() => set("page", filters.page + 1)}
                    className="h-7 px-2.5 text-xs rounded-[6px]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <MyMedicalInfoDrawer open={medInfoOpen} onClose={() => setMedInfoOpen(false)} />

    </DashboardLayout>
  );
};

export default PatientInstant;
