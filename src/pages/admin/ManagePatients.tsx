import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldOff,
  ShieldCheck,
  Users,
  UserCircle,
  Clock,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Calendar,
  Globe,
  Hash,
  Cake,
} from "lucide-react";
import {
  useGetAdminPatients,
  useSuspendPatient,
  useActivatePatient,
  type ApiPatient,
} from "@/hooks/admin/use-admin-patients";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
type SortOption = "name" | "joined-desc" | "joined-asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "joined-desc", label: "Joined: Newest first" },
  { value: "joined-asc", label: "Joined: Oldest first" },
  { value: "name", label: "Name (A–Z)" },
];

interface FilterState {
  search: string;
  status: StatusFilter;
  sort: SortOption;
  page: number;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  sort: "joined-desc",
  page: 1,
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  suspended:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  rejected: "bg-muted text-muted-foreground border-border",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  suspended: "bg-red-500",
  rejected: "bg-muted-foreground",
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

function formatDob(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const age = Math.floor(
    (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  return `${age} yrs`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
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

function PatientRow({
  p,
  onManage,
}: {
  p: ApiPatient;
  onManage: (p: ApiPatient) => void;
}) {
  const { t } = useTranslation();

  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {p.avatar ? (
            <img
              src={p.avatar}
              alt={p.name}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-border/40"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
              {getInitials(p.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">
              {p.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {p.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {p.phone}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {p.patient?.date_of_birth ? (
          <span>
            {formatDob(p.patient.date_of_birth)}{" "}
            <span className="text-muted-foreground/50">
              ({calcAge(p.patient.date_of_birth)})
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            statusStyle[p.status],
          )}
        >
          <span
            className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[p.status])}
          />
          {t(`admin.status.${p.status}`)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {new Date(p.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(p)}
        >
          {t("admin.users.manage")}
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function PatientCard({
  p,
  onManage,
}: {
  p: ApiPatient;
  onManage: (p: ApiPatient) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      {p.avatar ? (
        <img
          src={p.avatar}
          alt={p.name}
          className="h-9 w-9 rounded-full object-cover flex-shrink-0 mt-0.5 border border-border/40"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
          {getInitials(p.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">
              {p.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {p.email}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
              statusStyle[p.status],
            )}
          >
            <span
              className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[p.status])}
            />
            {t(`admin.status.${p.status}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground/60">{p.phone}</span>
          {p.patient?.date_of_birth && (
            <span className="text-[10px] text-muted-foreground/50">
              {calcAge(p.patient.date_of_birth)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/50">
            {new Date(p.created_at).toLocaleDateString()}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(p)}
        >
          {t("admin.users.manage")}
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
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{
                  width: j === 0 ? "140px" : j === 5 ? "60px" : "80px",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Right-side Patient Panel ─────────────────────────────────────────────────

function PatientPanel({
  patient,
  onClose,
  onToggleStatus,
  isActing,
}: {
  patient: ApiPatient | null;
  onClose: () => void;
  onToggleStatus: (p: ApiPatient) => void;
  isActing: boolean;
}) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = !!patient;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
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
        {patient && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Manage patient
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Review account details & update access
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
              <div className="px-5 py-5 space-y-4">

                {/* Identity card */}
                <div className="rounded-xl border border-border/60 bg-secondary/20 overflow-hidden">
                  <div className="h-1 w-full bg-primary/40" />
                  <div className="p-4 flex items-start gap-4">
                    {patient.avatar ? (
                      <img
                        src={patient.avatar}
                        alt={patient.name}
                        className="h-16 w-16 rounded-full object-cover flex-shrink-0 border-2 border-background ring-1 ring-border/40"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0 border-2 border-background ring-1 ring-border/40">
                        {getInitials(patient.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-semibold text-[15px] text-foreground leading-tight truncate">
                        {patient.name}
                      </p>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                        {patient.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {/* Patient role badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-secondary text-foreground border-border/60">
                          <UserCircle className="h-3 w-3" />
                          Patient
                        </span>

                        {/* Status badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
                            statusStyle[patient.status],
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              STATUS_DOT[patient.status],
                            )}
                          />
                          {t(`admin.status.${patient.status}`)}
                        </span>

                        {/* Verified badge */}
                        {patient.is_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-secondary text-muted-foreground border-border/60">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <InfoTile
                    icon={<Phone className="w-3.5 h-3.5" />}
                    label="Contact"
                    value={`${patient.country_code ?? ""} ${patient.phone}`.trim()}
                  />
                  <InfoTile
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Joined"
                    value={new Date(patient.created_at).toLocaleDateString()}
                  />
                  <InfoTile
                    icon={<Cake className="w-3.5 h-3.5" />}
                    label="Date of birth"
                    value={
                      patient.patient?.date_of_birth
                        ? `${formatDob(patient.patient.date_of_birth)} (${calcAge(patient.patient.date_of_birth)})`
                        : "—"
                    }
                  />
                  <InfoTile
                    icon={<Hash className="w-3.5 h-3.5" />}
                    label="Patient ID"
                    value={`#${patient.id}`}
                  />
                  {patient.preferred_language && (
                    <InfoTile
                      icon={<Globe className="w-3.5 h-3.5" />}
                      label="Language"
                      value={
                        patient.preferred_language === "en"
                          ? "English"
                          : patient.preferred_language
                      }
                    />
                  )}
                </div>

                {/* Verification strip */}
                <div className="rounded-xl border border-border/60 bg-secondary/20 divide-y divide-border/40">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Phone verified
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        patient.phone_verified_at
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground/50",
                      )}
                    >
                      {patient.phone_verified_at
                        ? new Date(patient.phone_verified_at).toLocaleDateString()
                        : "Not verified"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Email verified
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        patient.email_verified_at
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground/50",
                      )}
                    >
                      {patient.email_verified_at
                        ? new Date(patient.email_verified_at).toLocaleDateString()
                        : "Not verified"}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                variant="outline"
                className="w-full h-10 text-[12px] rounded-lg gap-2"
                disabled={isActing}
                onClick={() => onToggleStatus(patient)}
              >
                {isActing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : patient.status === "active" ? (
                  <ShieldOff className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {patient.status === "active"
                  ? t("admin.users.suspend")
                  : t("admin.users.reactivate")}
              </Button>

              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-lg text-muted-foreground"
                onClick={onClose}
              >
                {t("admin.common.close")}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManagePatients() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<ApiPatient | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── API ──
  const { data, isLoading, isError } = useGetAdminPatients({
    status: filters.status !== "all" ? filters.status : undefined,
    search: filters.search || undefined,
    page: filters.page,
  });

  const suspendMutation = useSuspendPatient();
  const activateMutation = useActivatePatient();

  const patients = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

 // Replace the statusCounts memo in ManagePatients:
const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  patients.forEach((p) => {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  });
  return counts;
}, [patients]);

  // Client-side sort
  const sorted = useMemo(() => {
    return [...patients].sort((a, b) => {
      switch (filters.sort) {
        case "joined-asc":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [patients, filters.sort]);

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
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  // ── Actions ──
  const toggleStatus = useCallback(
    async (p: ApiPatient) => {
      try {
        if (p.status === "active") {
          await suspendMutation.mutateAsync(p.id);
          setSelected((prev) =>
            prev ? { ...prev, status: "suspended" } : null,
          );
        } else {
          await activateMutation.mutateAsync(p.id);
          setSelected((prev) => (prev ? { ...prev, status: "active" } : null));
        }
        toast({ title: t("admin.users.status_changed") });
      } catch (error: unknown) {
        toast({ title: getErrorMessage(error), variant: "destructive" });
      }
    },
    [suspendMutation, activateMutation, t, toast],
  );

  const isActing = suspendMutation.isPending || activateMutation.isPending;
  const pendingCount = statusCounts["pending"] ?? 0;

  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            Filters
          </span>
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
              { value: "all", label: t("admin.users.all"), count: total },
              {
                value: "active",
                label: t("admin.status.active"),
                count: statusCounts["active"] ?? 0,
              },
              {
                value: "pending",
                label: t("admin.status.pending"),
                count: statusCounts["pending"] ?? 0,
              },
              {
                value: "suspended",
                label: t("admin.status.suspended"),
                count: statusCounts["suspended"] ?? 0,
              },
              {
                value: "rejected",
                label: t("admin.status.rejected"),
                count: statusCounts["rejected"] ?? 0,
              },
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
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
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
                label="Total patients"
                value={total}
                icon={Users}
                accent="primary"
              />
              <StatCard
                label="Active"
                value={statusCounts["active"] ?? 0}
                icon={CheckCircle2}
                accent="success"
              />
              <StatCard
                label="Pending review"
                value={statusCounts["pending"] ?? 0}
                icon={Clock}
                accent="warning"
              />
              <StatCard
                label="Suspended"
                value={statusCounts["suspended"] ?? 0}
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
                  placeholder="Search name, email, phone…"
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
                      <span className="font-bold text-foreground">{total}</span>{" "}
                      {total === 1 ? "patient" : "patients"}
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
                    placeholder="Search name, email, phone…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
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
                    Failed to load patients
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Check your connection and try again
                  </p>
                </div>
              ) : !isLoading && sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Users className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No patients match your filters
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
                          <th className="text-left px-4 py-3 font-semibold">
                            {t("admin.users.name")}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            {t("admin.users.contact")}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            Date of birth
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            {t("admin.users.status")}
                          </th>
                          <th className="text-left px-4 py-3 font-semibold">
                            {t("admin.users.joined")}
                          </th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {isLoading ? (
                          <SkeletonRows />
                        ) : (
                          sorted.map((p) => (
                            <PatientRow
                              key={p.id}
                              p={p}
                              onManage={setSelected}
                            />
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
                      : sorted.map((p) => (
                          <PatientCard
                            key={p.id}
                            p={p}
                            onManage={setSelected}
                          />
                        ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <p className="text-[11px] text-muted-foreground">
                        Page{" "}
                        <span className="font-semibold text-foreground">
                          {filters.page}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-foreground">
                          {totalPages}
                        </span>
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

      {/* Right-side panel */}
      <PatientPanel
        patient={selected}
        onClose={() => setSelected(null)}
        onToggleStatus={toggleStatus}
        isActing={isActing}
      />
    </DashboardLayout>
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

export default ManagePatients;
