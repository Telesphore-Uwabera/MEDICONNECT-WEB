import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  ShieldOff,
  ShieldCheck,
  Users,
  Stethoscope,
  Building2,
  Pill,
  UserCircle,
  Clock,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  useAdminUsers,
  setUserStatus,
  deleteUser,
  type AdminUser,
} from "@/lib/admin-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ─────────────────────────────────────────────────────────────────────

type RoleFilter = "all" | "doctor" | "hospital" | "pharmacy" | "patient";
type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
type SortOption = "name" | "joined-desc" | "joined-asc" | "role";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "joined-desc", label: "Joined: Newest first" },
  { value: "joined-asc", label: "Joined: Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "role", label: "Role (A–Z)" },
];

interface FilterState {
  search: string;
  role: RoleFilter;
  status: StatusFilter;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  role: "all",
  status: "all",
  sort: "joined-desc",
};

// ─── Style maps ────────────────────────────────────────────────────────────────

const statusStyle: Record<AdminUser["status"], string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  suspended:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  rejected: "bg-muted text-muted-foreground border-border",
};

const STATUS_DOT: Record<AdminUser["status"], string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  suspended: "bg-red-500",
  rejected: "bg-muted-foreground",
};

const roleStyle: Record<string, string> = {
  doctor:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  hospital: "bg-primary/10 text-primary border-primary/20",
  pharmacy:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  patient: "bg-secondary text-foreground border-border",
};

const roleIcon: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  hospital: Building2,
  pharmacy: Pill,
  patient: UserCircle,
};

// ─── Sidebar atoms ─────────────────────────────────────────────────────────────

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

// ─── Desktop User row ──────────────────────────────────────────────────────────

function UserRow({
  u,
  onManage,
}: {
  u: AdminUser;
  onManage: (u: AdminUser) => void;
}) {
  const { t } = useTranslation();
  const Icon = roleIcon[u.role] ?? UserCircle;

  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            {u.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">
              {u.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {u.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {u.phone}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-sm border font-medium",
            roleStyle[u.role],
          )}
        >
          <Icon className="h-3 w-3" />
          {t(`admin.roles.${u.role}`)}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            statusStyle[u.status],
          )}
        >
          <span
            className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[u.status])}
          />
          {t(`admin.status.${u.status}`)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {new Date(u.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(u)}
        >
          {t("admin.users.manage")}
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile User card ──────────────────────────────────────────────────────────

function UserCard({
  u,
  onManage,
}: {
  u: AdminUser;
  onManage: (u: AdminUser) => void;
}) {
  const { t } = useTranslation();
  const Icon = roleIcon[u.role] ?? UserCircle;

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
        {u.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">
              {u.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {u.email}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
              statusStyle[u.status],
            )}
          >
            <span
              className={cn(
                "w-1 h-1 rounded-full mr-1",
                STATUS_DOT[u.status],
              )}
            />
            {t(`admin.status.${u.status}`)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-sm border font-medium",
              roleStyle[u.role],
            )}
          >
            <Icon className="h-3 w-3" />
            {t(`admin.roles.${u.role}`)}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {u.phone}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {new Date(u.createdAt).toLocaleDateString()}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(u)}
        >
          {t("admin.users.manage")}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminUsers = () => {
  const { t } = useTranslation();
  const users = useAdminUsers();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { toast } = useToast();

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

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

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    users.forEach((u) => {
      counts[u.status] = (counts[u.status] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return users
      .filter((u) => {
        if (filters.role !== "all" && u.role !== filters.role) return false;
        if (filters.status !== "all" && u.status !== filters.status)
          return false;
        if (
          q &&
          ![u.name, u.email, u.phone].some((v) => v.toLowerCase().includes(q))
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "joined-asc":
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          case "name":
            return a.name.localeCompare(b.name);
          case "role":
            return a.role.localeCompare(b.role);
          default:
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      });
  }, [users, filters]);

  const toggleStatus = useCallback(
    (u: AdminUser) => {
      const next: AdminUser["status"] =
        u.status === "active" ? "suspended" : "active";
      setUserStatus(u.id, next);
      toast({ title: t("admin.users.status_changed") });
      setSelected({ ...u, status: next });
    },
    [t, toast],
  );

  const removeUser = useCallback(() => {
    if (!confirmDelete) return;
    deleteUser(confirmDelete.id);
    toast({ title: t("admin.users.deleted_toast") });
    setConfirmDelete(null);
    setSelected(null);
  }, [confirmDelete, t, toast]);

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
        <FilterSection title="Role">
          <PillGroup<RoleFilter>
            value={filters.role}
            onChange={(v) => set("role", v)}
            options={[
              {
                value: "all",
                label: t("admin.users.all"),
                count: roleCounts["all"],
              },
              {
                value: "doctor",
                label: t("admin.roles.doctor"),
                count: roleCounts["doctor"] ?? 0,
              },
              {
                value: "hospital",
                label: t("admin.roles.hospital"),
                count: roleCounts["hospital"] ?? 0,
              },
              {
                value: "pharmacy",
                label: t("admin.roles.pharmacy"),
                count: roleCounts["pharmacy"] ?? 0,
              },
              {
                value: "patient",
                label: t("admin.roles.patient"),
                count: roleCounts["patient"] ?? 0,
              },
            ]}
          />
        </FilterSection>

        <FilterSection title="Status">
          <PillGroup<StatusFilter>
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              {
                value: "all",
                label: t("admin.users.all"),
                count: statusCounts["all"],
              },
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
          title={t("pages.doctor.overview_title")}
          subtitle={t("pages.doctor.overview_sub")}
        />

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile overlay: backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile overlay: bottom-sheet drawer */}
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

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats strip */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard
                label="Total users"
                value={users.length}
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

            {/* Mobile search bar — below stats, above meta bar */}
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
                {filters.search && (
                  <button
                    onClick={() => set("search", "")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
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
                  <span className="font-bold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  {filtered.length === 1 ? "user" : "users"}
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
                {/* Search — desktop only */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search name, email, phone…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) =>
                      set("sort", e.target.value as SortOption)
                    }
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

                {/* Filters button — mobile only */}
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
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Users className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No users match your filters
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
                            {t("admin.users.role")}
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
                        {filtered.map((u) => (
                          <UserRow key={u.id} u={u} onManage={setSelected} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="md:hidden flex flex-col gap-2">
                    {filtered.map((u) => (
                      <UserCard key={u.id} u={u} onManage={setSelected} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── Manage drawer ── */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{t("admin.users.drawer_title")}</DrawerTitle>
              <DrawerDescription>
                {t("admin.users.drawer_sub")}
              </DrawerDescription>
            </DrawerHeader>

            {selected && (
              <div className="px-4 pb-4 space-y-4">
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border bg-secondary/30">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                    {selected.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                      {selected.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selected.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium",
                          roleStyle[selected.role],
                        )}
                      >
                        {(() => {
                          const I = roleIcon[selected.role] ?? UserCircle;
                          return <I className="h-3 w-3" />;
                        })()}
                        {t(`admin.roles.${selected.role}`)}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border text-xs",
                          statusStyle[selected.status],
                        )}
                      >
                        {t(`admin.status.${selected.status}`)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <Field
                    label={t("admin.users.contact")}
                    value={selected.phone}
                  />
                  <Field
                    label={t("admin.users.joined")}
                    value={new Date(selected.createdAt).toLocaleDateString()}
                  />
                </div>

                {selected.meta && Object.keys(selected.meta).length > 0 && (
                  <div className="rounded-xl border border-border p-3 sm:p-4 bg-secondary/30 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      Additional Info
                    </p>
                    {Object.entries(selected.meta).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground capitalize">
                          {k}
                        </span>
                        <span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DrawerFooter>
              {selected && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => toggleStatus(selected)}
                  >
                    {selected.status === "active" ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-1.5" />
                        {t("admin.users.suspend")}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-1.5" />
                        {t("admin.users.reactivate")}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmDelete(selected)}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {t("admin.users.delete")}
                  </Button>
                </div>
              )}
              <DrawerClose asChild>
                <Button variant="ghost">{t("admin.common.close")}</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── Delete confirm ── */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.users.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.delete_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={removeUser}>
              {t("admin.common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
  </div>
);

export default AdminUsers;