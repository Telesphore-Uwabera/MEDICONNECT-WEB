import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  Stethoscope,
  Building2,
  ShieldCheck,
  Hash,
  Video,
  MapPin,
  ClipboardList,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import {
  useGetAdminAppointments,
  useGetAdminAppointment,
  type ApiAppointment,
} from "@/hooks/admin/use-admin-appointments";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "confirmed" | "pending" | "in_progress" | "cancelled" | "completed" | "no_show";
type TypeFilter = "all" | "online" | "in_person";
type BookingFilter = "all" | "scheduled" | "walk_in";
type SortOption = "date-desc" | "date-asc" | "patient";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date: Newest first" },
  { value: "date-asc", label: "Date: Oldest first" },
  { value: "patient", label: "Patient (A–Z)" },
];

interface FilterState {
  search: string;
  status: StatusFilter;
  type: TypeFilter;
  booking_type: BookingFilter;
  sort: SortOption;
  page: number;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  type: "all",
  booking_type: "all",
  sort: "date-desc",
  page: 1,
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  confirmed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  in_progress:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  completed:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  no_show: "bg-muted text-muted-foreground border-border",
};

const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-500",
  in_progress: "bg-violet-500",
  cancelled: "bg-red-500",
  completed: "bg-blue-500",
  no_show: "bg-muted-foreground",
};

const typeStyle: Record<string, string> = {
  online: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  in_person: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string): string {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function formatTime(time: string): string {
  if (!time) return "—";
  const d = new Date(time);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)} · ${formatTime(time)}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function matchesSearch(a: ApiAppointment, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    a.patient.name.toLowerCase().includes(lower) ||
    a.doctor.user.name.toLowerCase().includes(lower) ||
    (a.hospital?.name_en ?? "").toLowerCase().includes(lower) ||
    String(a.id).includes(lower)
  );
}



// ─── Desktop row ──────────────────────────────────────────────────────────────

function AppointmentRow({
  a,
  onManage,
}: {
  a: ApiAppointment;
  onManage: (a: ApiAppointment) => void;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Patient */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {a.patient.avatar ? (
            <img
              src={a.patient.avatar}
              alt={a.patient.name}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-border/40"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
              {getInitials(a.patient.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">
              {a.patient.name}
            </p>
            <p className="text-[10px] text-muted-foreground/60 truncate">
              #{a.id}
            </p>
          </div>
        </div>
      </td>

      {/* Doctor */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {a.doctor.user.name}
      </td>

      {/* Date & time */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        <span>{formatDate(a.appointment_date)}</span>
        <span className="text-muted-foreground/40 ml-1">
          {formatTime(a.appointment_time)}
        </span>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            typeStyle[a.type] ?? "bg-muted text-muted-foreground border-border",
          )}
        >
          {a.type === "online" ? (
            <Video className="w-2.5 h-2.5 mr-1" />
          ) : (
            <MapPin className="w-2.5 h-2.5 mr-1" />
          )}
          {a.type.replace("_", " ")}
        </Badge>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            statusStyle[a.status],
          )}
        >
          <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[a.status])} />
          {a.status.replace("_", " ")}
        </Badge>
      </td>

      {/* Hospital */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/70 whitespace-nowrap max-w-[120px] truncate">
        {a.hospital?.name_en ?? <span className="text-muted-foreground/30">—</span>}
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(a)}
        >
          View
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile / tablet card ─────────────────────────────────────────────────────

function AppointmentCard({
  a,
  onManage,
}: {
  a: ApiAppointment;
  onManage: (a: ApiAppointment) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[6px] border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      {a.patient.avatar ? (
        <img
          src={a.patient.avatar}
          alt={a.patient.name}
          className="h-9 w-9 rounded-full object-cover flex-shrink-0 mt-0.5 border border-border/40"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
          {getInitials(a.patient.name)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">
              {a.patient.name}
            </p>
            <p className="text-[10px] text-muted-foreground/60 truncate">
              {a.doctor.user.name}{a.hospital ? ` · ${a.hospital.name_en}` : ""}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
              statusStyle[a.status],
            )}
          >
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[a.status])} />
            {a.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground/60">
            {formatDateTime(a.appointment_date, a.appointment_time)}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize",
              typeStyle[a.type] ?? "bg-muted text-muted-foreground border-border",
            )}
          >
            {a.type.replace("_", " ")}
          </Badge>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(a)}
        >
          View details
        </Button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "140px" : j === 6 ? "60px" : "80px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── InfoTile ─────────────────────────────────────────────────────────────────

const InfoTile = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="p-3 rounded-[6px] border border-border/60 bg-secondary/30">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
      {icon}
      {label}
    </div>
    <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
  </div>
);

// ─── Detail panel ─────────────────────────────────────────────────────────────

function AppointmentPanel({
  appointmentId,
  appointmentPreview,
  onClose,
}: {
  appointmentId: number | null;
  appointmentPreview: ApiAppointment | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const open = !!appointmentId;

  const { data: detailData, isLoading: detailLoading } =
    useGetAdminAppointment(appointmentId);

  const appt = detailData?.appointment ?? appointmentPreview;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[440px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Appointment details
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Review appointment info
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {detailLoading && !appt ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : appt ? (
                <div className="px-5 py-5 space-y-4">

                  {/* Identity card */}
                  <div className="rounded-[6px] border border-border/60 bg-secondary/20 overflow-hidden">
                    <div className="h-1 w-full bg-primary/40" />
                    <div className="p-4 flex items-start gap-4">
                      {appt.patient.avatar ? (
                        <img
                          src={appt.patient.avatar}
                          alt={appt.patient.name}
                          className="h-16 w-16 rounded-full object-cover flex-shrink-0 border-2 border-background ring-1 ring-border/40"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0 border-2 border-background ring-1 ring-border/40">
                          {getInitials(appt.patient.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="font-semibold text-[15px] text-foreground leading-tight truncate">
                          {appt.patient.name}
                        </p>
                        {appt.patient.email && (
                          <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                            {appt.patient.email}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                              statusStyle[appt.status],
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[appt.status])} />
                            {appt.status.replace("_", " ")}
                          </span>

                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                              typeStyle[appt.type] ?? "bg-muted text-muted-foreground border-border",
                            )}
                          >
                            {appt.type === "online" ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <MapPin className="w-3 h-3" />
                            )}
                            {appt.type.replace("_", " ")}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-secondary text-foreground border-border/60">
                            <ClipboardList className="w-3 h-3" />
                            {appt.booking_type.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <InfoTile
                      icon={<CalendarDays className="w-3.5 h-3.5" />}
                      label="Date"
                      value={formatDate(appt.appointment_date)}
                    />
                    <InfoTile
                      icon={<Clock className="w-3.5 h-3.5" />}
                      label="Time"
                      value={formatTime(appt.appointment_time)}
                    />
                    <InfoTile
                      icon={<Stethoscope className="w-3.5 h-3.5" />}
                      label="Doctor"
                      value={appt.doctor.user.name}
                    />
                    <InfoTile
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      label="Hospital"
                      value={appt.hospital?.name_en ?? "—"}
                    />
                    <InfoTile
                      icon={<Hash className="w-3.5 h-3.5" />}
                      label="Appointment ID"
                      value={`#${appt.id}`}
                    />
                    {appt.insurance && (
                      <InfoTile
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                        label="Insurance"
                        value={appt.insurance.name}
                      />
                    )}
                  </div>

                  {/* Notes */}
                  {appt.notes && appt.notes.length > 0 && (
                    <div className="rounded-[6px] border border-border/60 bg-secondary/20 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border/40">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                          Notes ({appt.notes.length})
                        </p>
                      </div>
                      <div className="divide-y divide-border/40">
                        {appt.notes.map((note) => (
                          <div key={note.id} className="px-4 py-3">
                            <p className="text-[12px] text-foreground leading-relaxed">
                              {note.content}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 bg-card">
              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-[6px] text-muted-foreground"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageAppointments() {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<ApiAppointment | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

  // Debounced search (client-side)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── API ──
  const { data, isLoading, isError } = useGetAdminAppointments({
    status: filters.status !== "all" ? filters.status : undefined,
    type: filters.type !== "all" ? filters.type : undefined,
    booking_type: filters.booking_type !== "all" ? filters.booking_type : undefined,
    page: filters.page,
  });

  const appointments = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

  // ── Counts ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    return counts;
  }, [appointments]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      counts[a.type] = (counts[a.type] ?? 0) + 1;
    });
    return counts;
  }, [appointments]);

  // ── Client-side search + sort ──
  const filtered = useMemo(
    () => appointments.filter((a) => matchesSearch(a, debouncedSearch)),
    [appointments, debouncedSearch],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (filters.sort) {
        case "date-asc":
          return (
            new Date(`${a.appointment_date}T${a.appointment_time}`).getTime() -
            new Date(`${b.appointment_date}T${b.appointment_time}`).getTime()
          );
        case "patient":
          return a.patient.name.localeCompare(b.patient.name);
        default:
          return (
            new Date(`${b.appointment_date}T${b.appointment_time}`).getTime() -
            new Date(`${a.appointment_date}T${a.appointment_time}`).getTime()
          );
      }
    });
  }, [filtered, filters.sort]);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        ...(key !== "page" ? { page: 1 } : {}),
      }));
    },
    [],
  );

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
    setDebouncedSearch("");
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // Lock body scroll when filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const openPanel = useCallback((a: ApiAppointment) => {
    setSelectedPreview(a);
    setSelectedId(a.id);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedId(null);
    setSelectedPreview(null);
  }, []);

  const pendingCount = statusCounts["pending"] ?? 0;

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: "All" },
        { value: "confirmed", label: "Confirmed" },
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "no_show", label: "No show" },
      ],
      onChange: (v: string) => set("status", v as any),
    },
    {
      type: "select" as const,
      key: "type",
      label: "Type",
      value: filters.type,
      options: [
        { value: "all", label: "All types" },
        { value: "online", label: "Online" },
        { value: "in_person", label: "In-person" },
      ],
      onChange: (v: string) => set("type", v as any),
    },
    {
      type: "select" as const,
      key: "booking_type",
      label: "Booking type",
      value: filters.booking_type,
      options: [
        { value: "all", label: "All" },
        { value: "scheduled", label: "Scheduled" },
        { value: "walk_in", label: "Walk-in" },
      ],
      onChange: (v: string) => set("booking_type", v as any),
    }
  ], [filters.status, filters.type, filters.booking_type, set]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.overview_title")}
          subtitle={t("pages.admin.overview_sub")}
        />

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2, lg: 3 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">

          {/*
             * Stat cards:
             *   phone  → 2 columns
             *   tablet (md+) → 4 columns
             */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard
              label="Total appointments"
              value={total}
              icon={CalendarClock}
              accent="primary"
            />
            <StatCard
              label="Confirmed"
              value={statusCounts["confirmed"] ?? 0}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label="Pending"
              value={statusCounts["pending"] ?? 0}
              icon={Clock}
              accent="warning"
            />
            <StatCard
              label="Cancelled"
              value={statusCounts["cancelled"] ?? 0}
              icon={XCircle}
              accent="warning"
            />
          </div>

          {/* Phone-only search (below stat cards) */}
          <div className="sm:hidden px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search patient, doctor, hospital…"
                className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sticky meta bar */}
          <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <p className="text-[11px] text-muted-foreground shrink-0">
                {isLoading ? (
                  <span className="text-muted-foreground/50">Loading…</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{sorted.length}</span>{" "}
                    {sorted.length === 1 ? "appointment" : "appointments"}
                  </>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                  >
                    Reset
                  </button>
                )}
              </p>

              {/*
                 * Pending badge — visible at md+ to avoid cramping the
                 * phone meta bar, but no longer gated behind sm: only.
                 */}
              {pendingCount > 0 && (
                <span className="hidden md:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pendingCount} pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/*
                 * Search input in meta bar — visible at sm+ (tablets and
                 * desktop). Phone uses the dedicated block above.
                 * Slightly wider on tablet (md+) for comfort.
                 */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search patient, doctor, hospital…"
                  className="w-44 md:w-60 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

            </div>

            {/* Refresh Button */}
            <button
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </button>

            {/* Sort select */}
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as SortOption)}
                className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
            </div>

            <FilterToggleButton
              open={filterOpen}
              onToggle={() => setFilterOpen(!filterOpen)}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">
                  Failed to load appointments
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Check your connection and try again
                </p>
              </div>
            ) : !isLoading && sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Calendar className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    No appointments match your filters
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Try widening your search criteria
                  </p>
                </div>
                <button
                  onClick={clearAll}
                  className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                {/*
                   * Desktop table — only at lg+ (1024px+).
                   * Tablets get the 2-column card grid below.
                   */}
                <div className="hidden lg:block rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Patient</th>
                        <th className="text-left px-4 py-3 font-semibold">Doctor</th>
                        <th className="text-left px-4 py-3 font-semibold">Date & Time</th>
                        <th className="text-left px-4 py-3 font-semibold">Type</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="text-left px-4 py-3 font-semibold">Hospital</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <SkeletonRows />
                      ) : (
                        sorted.map((a) => (
                          <AppointmentRow key={a.id} a={a} onManage={openPanel} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/*
                   * Card layout — phone AND tablet (hidden at lg+).
                   * 2-column grid on tablet (sm:grid-cols-2) for better
                   * use of the wider screen.
                   */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-[6px] border border-border/60 bg-card animate-pulse"
                      />
                    ))
                    : sorted.map((a) => (
                      <AppointmentCard key={a.id} a={a} onManage={openPanel} />
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground">
                      Page{" "}
                      <span className="font-semibold text-foreground">{filters.page}</span>{" "}
                      of{" "}
                      <span className="font-semibold text-foreground">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={filters.page <= 1}
                        onClick={() => set("page", filters.page - 1)}
                        className="p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={filters.page >= totalPages}
                        onClick={() => set("page", filters.page + 1)}
                        className="p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Right-side detail panel */}
      <AppointmentPanel
        appointmentId={selectedId}
        appointmentPreview={selectedPreview}
        onClose={closePanel}
      />
    </DashboardLayout>
  );
}

export default ManageAppointments;
