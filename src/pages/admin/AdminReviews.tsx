import { useMemo, useState, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import {
  useGetAdminReviews,
  type ApiReview,
} from "@/hooks/admin/use-admin-reviews";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import AdminReviewDetail from "./components/Adminreviewdetail";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type SortOption = "date-desc" | "date-asc" | "rating-high" | "rating-low" | "patient";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date: Newest first" },
  { value: "date-asc", label: "Date: Oldest first" },
  { value: "rating-high", label: "Rating: High to low" },
  { value: "rating-low", label: "Rating: Low to high" },
  { value: "patient", label: "Patient (A–Z)" },
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
  sort: "date-desc",
  page: 1,
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const statusStyle: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  approved:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(date: string): string {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function matchesSearch(r: ApiReview, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    r.patient.name.toLowerCase().includes(lower) ||
    r.doctor.user.name.toLowerCase().includes(lower) ||
    (r.comment ?? "").toLowerCase().includes(lower) ||
    String(r.id).includes(lower)
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3 h-3",
            i < value
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground/20 fill-muted-foreground/10",
          )}
        />
      ))}
    </div>
  );
}



// ─── Desktop row ──────────────────────────────────────────────────────────────

function ReviewRow({ r, onManage }: { r: ApiReview; onManage: (r: ApiReview) => void }) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Patient */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {r.patient.avatar ? (
            <img
              src={r.patient.avatar}
              alt={r.patient.name}
              className="h-9 w-9 rounded-full object-cover flex-shrink-0 border border-border/40"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
              {getInitials(r.patient.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{r.patient.name}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">#{r.id}</p>
          </div>
        </div>
      </td>

      {/* Doctor */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {r.doctor.user.name}
      </td>

      {/* Rating */}
      <td className="px-4 py-3">
        <StarRating value={r.rating} />
      </td>

      {/* Comment */}
      <td className="px-4 py-3 max-w-[200px]">
        <p className="text-[11px] text-muted-foreground/80 truncate">
          {r.comment ?? <span className="text-muted-foreground/30">No comment</span>}
        </p>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize", statusStyle[r.status])}
        >
          <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[r.status])} />
          {r.status}
        </Badge>
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {formatDate(r.created_at)}
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(r)}
        >
          Review
        </Button>
      </td>
    </tr>
  );
}

// ─── Mobile / tablet card ─────────────────────────────────────────────────────

function ReviewCard({ r, onManage }: { r: ApiReview; onManage: (r: ApiReview) => void }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[6px] border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      {r.patient.avatar ? (
        <img
          src={r.patient.avatar}
          alt={r.patient.name}
          className="h-9 w-9 rounded-full object-cover flex-shrink-0 mt-0.5 border border-border/40"
        />
      ) : (
        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
          {getInitials(r.patient.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{r.patient.name}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">{r.doctor.user.name}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0", statusStyle[r.status])}
          >
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[r.status])} />
            {r.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <StarRating value={r.rating} />
          <span className="text-[10px] text-muted-foreground/50">{formatDate(r.created_at)}</span>
        </div>
        {r.comment && (
          <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2">{r.comment}</p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(r)}
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

// ─── Review Panel ─────────────────────────────────────────────────────────────

function ReviewPanel({ reviewId, onClose }: { reviewId: number | null; onClose: () => void }) {
  const open = !!reviewId;

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
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] lg:w-[680px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  Review details
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Approve, reject or delete this review
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
            <div className="flex-1 overflow-y-auto">
              <AdminReviewDetail reviewId={reviewId} onClose={onClose} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminReviews() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError } = useGetAdminReviews({
    status: filters.status !== "all" ? filters.status : undefined,
    page: filters.page,
  });

  const reviews = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return counts;
  }, [reviews]);

  const filtered = useMemo(
    () => reviews.filter((r) => matchesSearch(r, debouncedSearch)),
    [reviews, debouncedSearch],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (filters.sort) {
        case "date-asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "rating-high": return b.rating - a.rating;
        case "rating-low": return a.rating - b.rating;
        case "patient": return a.patient.name.localeCompare(b.patient.name);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

  // Lock body scroll when filter sheet is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const openPanel = useCallback((r: ApiReview) => setSelectedId(r.id), []);
  const closePanel = useCallback(() => setSelectedId(null), []);

  const pendingCount = statusCounts["pending"] ?? 0;

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ],
      onChange: (v: string) => set("status", v as any),
    }
  ], [filters.status, set]);

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader title="Reviews" subtitle="Moderate and manage patient reviews" />

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2 }}
        />

        <main className="flex-1 overflow-y-auto flex flex-col min-w-0">

          {/*
             * Stat cards:
             *   phone  → 2 columns
             *   tablet (md+) → 4 columns
             */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard label="Total reviews" value={total} icon={MessageSquare} accent="primary" />
            <StatCard label="Pending" value={statusCounts["pending"] ?? 0} icon={Clock} accent="warning" />
            <StatCard label="Approved" value={statusCounts["approved"] ?? 0} icon={CheckCircle2} accent="success" />
            <StatCard label="Rejected" value={statusCounts["rejected"] ?? 0} icon={XCircle} accent="warning" />
          </div>

          {/* Phone-only search (below stat cards) */}
          <div className="sm:hidden px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search patient, doctor…"
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
                    {sorted.length === 1 ? "review" : "reviews"}
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
                 * Pending badge — visible at md+ to avoid cramping phone meta bar.
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
                 * Search input in meta bar — visible at sm+ (tablet + desktop).
                 * Phone uses the dedicated block above instead.
                 * Wider at md+ now that the sidebar isn't competing for space.
                 */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search patient, doctor…"
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
                  <option key={o.value} value={o.value}>{o.label}</option>
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
                <p className="text-[12px] font-semibold text-destructive">Failed to load reviews</p>
                <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
              </div>
            ) : !isLoading && sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Star className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">No reviews match your filters</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
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
                   * This table has 7 columns including a long Comment column,
                   * so lg+ is the right threshold — it genuinely needs the space.
                   */}
                <div className="hidden lg:block rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Patient</th>
                        <th className="text-left px-4 py-3 font-semibold">Doctor</th>
                        <th className="text-left px-4 py-3 font-semibold">Rating</th>
                        <th className="text-left px-4 py-3 font-semibold">Comment</th>
                        <th className="text-left px-4 py-3 font-semibold">Status</th>
                        <th className="text-left px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? <SkeletonRows />
                        : sorted.map((r) => <ReviewRow key={r.id} r={r} onManage={openPanel} />)}
                    </tbody>
                  </table>
                </div>

                {/*
                   * Card layout — phone AND tablet (hidden at lg+).
                   * Single column on phone, 2-column grid on tablet for
                   * better use of the wider screen.
                   */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-24 rounded-[6px] border border-border/60 bg-card animate-pulse" />
                    ))
                    : sorted.map((r) => <ReviewCard key={r.id} r={r} onManage={openPanel} />)}
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

      <ReviewPanel reviewId={selectedId} onClose={closePanel} />
    </DashboardLayout>
  );
}

export default AdminReviews;
