import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import {
  Users,
  UserCheck,
  UserX,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Calendar,
} from "lucide-react";
import {
  useGetAdminTeam,
  type ApiTeamMember,
} from "@/hooks/admin/use-admin-ourteam";
import { cn } from "@/lib/utils";
import { AdminTeamMemberPanel } from "./components/AdminTeamMemberPanel";
import { AdminAddTeamMemberModal } from "./components/AdminAddTeamMemberModal";
import { useTranslation } from "react-i18next";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "active" | "inactive";
type SortOption   = "date-desc" | "date-asc" | "name-asc" | "name-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Joined: Newest first" },
  { value: "date-asc",  label: "Joined: Oldest first" },
  { value: "name-asc",  label: "Name: A – Z" },
  { value: "name-desc", label: "Name: Z – A" },
];

interface FilterState {
  search: string;
  status: StatusFilter;
  sort:   SortOption;
  page:   number;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  sort:   "date-desc",
  page:   1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function formatDate(date: string): string {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function getYears(joinedAt: string): number {
  const diff = Date.now() - new Date(joinedAt).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
}

function matchesSearch(m: ApiTeamMember, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    m.name.toLowerCase().includes(lower) ||
    (m.title ?? "").toLowerCase().includes(lower) ||
    String(m.id).includes(lower)
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  inactive:
    "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
};

const STATUS_DOT: Record<string, string> = {
  active:   "bg-emerald-500",
  inactive: "bg-slate-400",
};

function StatusBadge({ active }: { active: boolean }) {
  const key = active ? "active" : "inactive";
  return (
    <Badge
      variant="outline"
      className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize", statusStyle[key])}
    >
      <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[key])} />
      {key}
    </Badge>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────

function TeamRow({
  m,
  onManage,
}: {
  m: ApiTeamMember;
  onManage: (m: ApiTeamMember) => void;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Member */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {m.photo_url ? (
            <img
              src={m.photo_url}
              alt={m.name}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-border/40"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
              {getInitials(m.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{m.name}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">#{m.id}</p>
          </div>
        </div>
      </td>

      {/* Title */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {m.title ?? "—"}
      </td>

      {/* Joined */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <Calendar className="w-3 h-3 shrink-0" />
          {formatDate(m.joined_at)}
        </div>
      </td>

      {/* Experience */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {getYears(m.joined_at)} yr{getYears(m.joined_at) !== 1 ? "s" : ""}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge active={m.is_active} />
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(m)}
        >
          Manage
        </Button>
      </td>
    </tr>
  );
}

// ── Mobile / tablet card ──────────────────────────────────────────────────────

function TeamCard({
  m,
  onManage,
}: {
  m: ApiTeamMember;
  onManage: (m: ApiTeamMember) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      {m.photo_url ? (
        <img
          src={m.photo_url}
          alt={m.name}
          className="h-10 w-10 rounded-full object-cover flex-shrink-0 mt-0.5 border border-border/40"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
          {getInitials(m.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{m.name}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">{m.title ?? "—"}</p>
          </div>
          <StatusBadge active={m.is_active} />
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(m.joined_at)}
          </span>
          <span>{getYears(m.joined_at)} yrs exp</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(m)}
        >
          Manage
        </Button>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "140px" : j === 5 ? "60px" : "80px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function AdminOurTeam() {
  const { t } = useTranslation();

  const [filters, setFilters]               = useState<FilterState>(INITIAL_FILTERS);
  const [selectedId, setSelectedId]         = useState<number | null>(null);
  const [filterOpen, setFilterOpen]         = useState(false);
  const [addOpen, setAddOpen]               = useState(false);
  const [searchInput, setSearchInput]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useGetAdminTeam({
    page:     filters.page,
    per_page: 20,
  });

  const members    = data?.data  ?? [];
  const total      = data?.total ?? 0;
  const perPage    = 20;
  const totalPages = Math.ceil(total / perPage);

  const activeCount   = useMemo(() => members.filter((m) => m.is_active).length,  [members]);
  const inactiveCount = useMemo(() => members.filter((m) => !m.is_active).length, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const searchOk = matchesSearch(m, debouncedSearch);
      const statusOk =
        filters.status === "all"      ? true :
        filters.status === "active"   ? m.is_active :
        !m.is_active;
      return searchOk && statusOk;
    });
  }, [members, debouncedSearch, filters.status]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (filters.sort) {
        case "date-asc":  return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        case "name-asc":  return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        default:          return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
      }
    });
  }, [filtered, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, ...(key !== "page" ? { page: 1 } : {}) }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
    setDebouncedSearch("");
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  const openPanel  = useCallback((m: ApiTeamMember) => setSelectedId(m.id), []);
  const closePanel = useCallback(() => setSelectedId(null), []);

  // ── Filter fields (same pattern as ManageAppointments) ────────────────────
  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all",      label: "All" },
        { value: "active",   label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      onChange: (v: string) => set("status", v as StatusFilter),
    },
  ], [filters.status, set]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("admin.team.title", { defaultValue: "Team" })}
          subtitle={t("admin.team.subtitle", { defaultValue: "Manage your medical team members" })}
        />

        {/* Top filter bar — same as ManageAppointments */}
        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2, lg: 3 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">

          {/* Stat cards */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            <StatCard label="Total members" value={total}         icon={Users}     accent="primary" />
            <StatCard label="Active"        value={activeCount}   icon={UserCheck} accent="success" />
            <StatCard label="Inactive"      value={inactiveCount} icon={UserX}     accent="warning" />
          </div>

          {/* Phone-only search */}
          <div className="sm:hidden px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, title…"
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

          {/* Sticky meta bar */}
          <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <p className="text-[11px] text-muted-foreground shrink-0">
                {isLoading ? (
                  <span className="text-muted-foreground/50">Loading…</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{sorted.length}</span>{" "}
                    {sorted.length === 1 ? "member" : "members"}
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
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Add member button */}
              <Button
                size="sm"
                className="h-7 px-2.5 sm:px-3 text-[10px] rounded-sm gap-1 sm:gap-1.5"
                onClick={() => setAddOpen(true)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add member</span>
              </Button>

              {/* Search input — sm+ */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, title…"
                  className="w-44 md:w-60 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort select */}
              <div className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>

              {/* Filter toggle button — same component as ManageAppointments */}
              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">Failed to load team</p>
                <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
              </div>
            ) : !isLoading && sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                  <Users className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">No members match your filters</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table — lg+ */}
                <div className="hidden lg:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Member</th>
                        <th className="text-left px-4 py-3 font-semibold">Title</th>
                        <th className="text-left px-4 py-3 font-semibold">Joined</th>
                        <th className="text-left px-4 py-3 font-semibold">Experience</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? <SkeletonRows />
                        : sorted.map((m) => <TeamRow key={m.id} m={m} onManage={openPanel} />)}
                    </tbody>
                  </table>
                </div>

                {/* Card grid — phone + tablet */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-24 rounded-sm border border-border/60 bg-card animate-pulse" />
                      ))
                    : sorted.map((m) => <TeamCard key={m.id} m={m} onManage={openPanel} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground">
                      Page{" "}
                      <span className="font-semibold text-foreground">{filters.page}</span> of{" "}
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

      {/* Slide-over panel */}
      <AdminTeamMemberPanel
        memberId={selectedId}
        onClose={closePanel}
        onDeleted={closePanel}
      />

      {/* Add member drawer */}
      <AdminAddTeamMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </DashboardLayout>
  );
}

export default AdminOurTeam;