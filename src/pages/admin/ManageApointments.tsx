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
} from "lucide-react";
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
type TypeFilter   = "all" | "online" | "in_person";
type BookingFilter = "all" | "scheduled" | "walk_in";
type SortOption   = "date-desc" | "date-asc" | "patient";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date: Newest first" },
  { value: "date-asc",  label: "Date: Oldest first" },
  { value: "patient",   label: "Patient (A–Z)" },
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
  confirmed:   "bg-emerald-500",
  pending:     "bg-amber-500",
  in_progress: "bg-violet-500",
  cancelled:   "bg-red-500",
  completed:   "bg-blue-500",
  no_show:     "bg-muted-foreground",
};

const typeStyle: Record<string, string> = {
  online:    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
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
  // Handle both "HH:MM:SS" and full ISO "2026-06-01T11:00:00.000000Z"
  const d = new Date(time);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  // Fallback: plain HH:MM
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12  = hour % 12 || 12;
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center justify-between",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          <span>{o.label}</span>
          {o.count !== undefined && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                value === o.value
                  ? "bg-white/20 text-white"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
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
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(a)}
        >
          View
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function AppointmentCard({
  a,
  onManage,
}: {
  a: ApiAppointment;
  onManage: (a: ApiAppointment) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
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
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
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
  <div className="p-3 rounded-lg border border-border/60 bg-secondary/30">
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

  // Fetch full detail when panel opens
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
                  <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden">
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
                          {/* Status badge */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                              statusStyle[appt.status],
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[appt.status])} />
                            {appt.status.replace("_", " ")}
                          </span>

                          {/* Type badge */}
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

                          {/* Booking type */}
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
                    <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden">
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
                className="w-full h-9 text-[12px] rounded-lg text-muted-foreground"
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
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<ApiAppointment | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

  // Debounced search (client-side since API doesn't advertise search param)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── API ──
  const { data, isLoading, isError } = useGetAdminAppointments({
    status:       filters.status !== "all"       ? filters.status       : undefined,
    type:         filters.type !== "all"         ? filters.type         : undefined,
    booking_type: filters.booking_type !== "all" ? filters.booking_type : undefined,
    page:         filters.page,
  });

  const appointments = data?.data ?? [];
  const total        = data?.total ?? 0;
  const perPage      = data?.per_page ?? 20;
  const totalPages   = Math.ceil(total / perPage);

  // ── Counts (from current page data for sidebar counters) ──
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
  const filtered = useMemo(() => {
    return appointments.filter((a) => matchesSearch(a, debouncedSearch));
  }, [appointments, debouncedSearch]);

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

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
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

  // ── Sidebar ──
  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<StatusFilter>
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all",         label: "All",         count: total },
              { value: "confirmed",   label: "Confirmed",   count: statusCounts["confirmed"]   ?? 0 },
              { value: "pending",     label: "Pending",     count: statusCounts["pending"]     ?? 0 },
              { value: "in_progress", label: "In progress", count: statusCounts["in_progress"] ?? 0 },
              { value: "completed",   label: "Completed",   count: statusCounts["completed"]   ?? 0 },
              { value: "cancelled",   label: "Cancelled",   count: statusCounts["cancelled"]   ?? 0 },
              { value: "no_show",     label: "No show",     count: statusCounts["no_show"]     ?? 0 },
            ]}
          />
        </FilterSection>

        <FilterSection title="Type">
          <PillGroup<TypeFilter>
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={[
              { value: "all",       label: "All types",  count: appointments.length },
              { value: "online",    label: "Online",     count: typeCounts["online"]    ?? 0 },
              { value: "in_person", label: "In-person",  count: typeCounts["in_person"] ?? 0 },
            ]}
          />
        </FilterSection>

        <FilterSection title="Booking type">
          <PillGroup<BookingFilter>
            value={filters.booking_type}
            onChange={(v) => set("booking_type", v)}
            options={[
              { value: "all",       label: "All" },
              { value: "scheduled", label: "Scheduled" },
              { value: "walk_in",   label: "Walk-in" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.overview_title")}
          subtitle={t("pages.admin.overview_sub")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom-sheet */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 md:hidden",
              "bg-card rounded-t-2xl border-t border-border",
              "max-h-[85dvh] flex flex-col overflow-hidden",
              "transition-transform duration-300 ease-out",
              filterOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-4 border-t border-border">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* ── Main ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
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

            {/* Mobile search */}
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search patient, doctor, hospital…"
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
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

            {/* Meta bar */}
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

                {pendingCount > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pendingCount} pending
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Desktop search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search patient, doctor, hospital…"
                    className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as SortOption)}
                    className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters
                      ? "bg-primary text-white border-primary"
                      : "border-border/60 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Filters</span>
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              </div>
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
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
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
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
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

                  {/* Mobile cards */}
                  <div className="md:hidden flex flex-col gap-2">
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-24 rounded-sm border border-border/60 bg-card animate-pulse"
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
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={filters.page >= totalPages}
                          onClick={() => set("page", filters.page + 1)}
                          className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
