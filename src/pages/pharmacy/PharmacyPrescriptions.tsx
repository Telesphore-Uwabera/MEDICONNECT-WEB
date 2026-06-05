import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Pill,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  ImageIcon,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ── Import every hook + type from the dedicated hooks file ───────────────────
import {
  useGetPrescriptionRequests,
  useReviewPrescription,
  useApprovePrescription,
  useRejectPrescription,
  useFulfillPrescription,
  type Prescription,
  type PrescriptionStatus,
  type ListPrescriptionParams,
} from "@/hooks/pharmacy/use-prescription-requests";

// ─── Local UI types ────────────────────────────────────────────────────────────

type SortOption = "date-desc" | "date-asc" | "patient";

interface FilterState {
  search: string;
  /** "all" → no ?status= sent to the API */
  status: PrescriptionStatus | "all";
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  sort: "date-desc",
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date: Newest first" },
  { value: "date-asc", label: "Date: Oldest first" },
  { value: "patient", label: "Patient (A–Z)" },
];

// ─── Visual config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PrescriptionStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  reviewing:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  approved:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  fulfilled:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
};

const STATUS_DOT: Record<PrescriptionStatus, string> = {
  pending: "bg-amber-500",
  reviewing: "bg-sky-500",
  approved: "bg-violet-500",
  rejected: "bg-red-500",
  fulfilled: "bg-emerald-500",
};

const STATUS_LABEL: Record<PrescriptionStatus, string> = {
  pending: "Pending",
  reviewing: "Reviewing",
  approved: "Approved",
  rejected: "Rejected",
  fulfilled: "Fulfilled",
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
  options: { value: T; label: string; dot?: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center gap-2",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.dot && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                value === o.value ? "bg-primary-foreground/70" : o.dot,
              )}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Action buttons ────────────────────────────────────────────────────────────
//
// Status flow:
//   pending   → [Mark Reviewing]
//   reviewing → [Approve]  [Reject]
//   approved  → [Fulfill]
//   rejected / fulfilled → terminal, no actions

function PrescriptionActions({ rx }: { rx: Prescription }) {
  const { t } = useTranslation();

  const review  = useReviewPrescription();
  const approve = useApprovePrescription();
  const reject  = useRejectPrescription();
  const fulfill = useFulfillPrescription();

  const busy =
    review.isPending ||
    approve.isPending ||
    reject.isPending ||
    fulfill.isPending;

  // ── pending: start reviewing ──────────────────────────────────────────────
  if (rx.status === "pending") {
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          review.mutate(rx.id, {
            onSuccess: () =>
              toast({ title: t("pages.pharmacy.marked_reviewing", "Marked as reviewing") }),
          })
        }
        variant="outline"
        className="h-7 px-3 text-[10px] rounded-sm border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300 dark:border-sky-900 dark:text-sky-400 dark:hover:bg-sky-950/30 transition-all duration-200"
      >
        {review.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            <Eye className="w-3 h-3 mr-1" />
            {t("pages.pharmacy.review", "Review")}
          </>
        )}
      </Button>
    );
  }

  // ── reviewing: approve or reject ──────────────────────────────────────────
  if (rx.status === "reviewing") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            reject.mutate(
              { id: rx.id, reason: "Prescription is expired" },
              {
                onSuccess: () =>
                  toast({
                    title: t("pages.pharmacy.declined", "Prescription rejected"),
                    variant: "destructive",
                  }),
              },
            )
          }
          className="h-7 px-3 text-[10px] rounded-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
        >
          {reject.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <XCircle className="w-3 h-3 mr-1" />
              {t("pages.pharmacy.decline", "Reject")}
            </>
          )}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            approve.mutate(rx.id, {
              onSuccess: () =>
                toast({ title: t("pages.pharmacy.approved", "Prescription approved") }),
            })
          }
          className="h-7 px-3 text-[10px] font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-sm shadow-sm transition-all duration-200"
        >
          {approve.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t("pages.pharmacy.approve", "Approve")}
            </>
          )}
        </Button>
      </div>
    );
  }

  // ── approved: fulfill ────────────────────────────────────────────────────
  if (rx.status === "approved") {
    return (
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          fulfill.mutate(rx.id, {
            onSuccess: () =>
              toast({
                title: t("pages.pharmacy.marked_filled", "Prescription fulfilled"),
                description: t("pages.pharmacy.filled_desc", {
                  name: rx.patient.name,
                }),
              }),
          })
        }
        className="h-7 px-3 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm shadow-sm transition-all duration-200"
      >
        {fulfill.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            <PackageCheck className="w-3 h-3 mr-1" />
            {t("pages.pharmacy.fulfill", "Fulfill")}
          </>
        )}
      </Button>
    );
  }

  // ── rejected / fulfilled: terminal ───────────────────────────────────────
  return null;
}

// ─── Prescription Card ─────────────────────────────────────────────────────────

function PrescriptionCard({ rx }: { rx: Prescription }) {
  const { t } = useTranslation();

  const formattedDate = rx.created_at
    ? new Date(rx.created_at).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-card border border-border/70 rounded-sm p-4 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-[12px] text-foreground truncate">
            {rx.patient.name}
          </div>
          <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
            <span className="truncate">
              {rx.patient.phone ?? "—"}
              {formattedDate ? ` · ${formattedDate}` : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {/* ID chip */}
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-secondary/60 border border-border/40 text-muted-foreground/70">
            #{String(rx.id).padStart(6, "0")}
          </span>
          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 py-0 font-medium border capitalize",
              STATUS_STYLES[rx.status],
            )}
          >
            <span
              className={cn(
                "w-1 h-1 rounded-full mr-1",
                STATUS_DOT[rx.status],
                rx.status === "pending" && "animate-pulse",
              )}
            />
            {STATUS_LABEL[rx.status]}
          </Badge>
        </div>
      </div>

      {/* Prescription image */}
      {rx.prescription_image ? (
        <a
          href={rx.prescription_image}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block rounded-sm overflow-hidden border border-border/40 bg-secondary/30 aspect-video"
        >
          <img
            src={rx.prescription_image}
            alt="Prescription"
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-200"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
            <Eye className="w-5 h-5 text-white" />
          </div>
        </a>
      ) : (
        <div className="flex items-center justify-center rounded-sm border border-dashed border-border/50 bg-secondary/20 aspect-video text-muted-foreground/40">
          <ImageIcon className="w-6 h-6" />
        </div>
      )}

      {/* Patient notes */}
      {rx.notes && (
        <div className="flex items-start gap-2 p-2 rounded-sm bg-secondary/40 border border-border/30 text-[11px]">
          <FileText className="w-3 h-3 text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground leading-relaxed">{rx.notes}</p>
        </div>
      )}

      {/* Rejection reason (when rejected) */}
      {rx.status === "rejected" && rx.rejection_reason && (
        <div className="flex items-start gap-2 p-2 rounded-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-[11px]">
          <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 leading-relaxed">
            {rx.rejection_reason}
          </p>
        </div>
      )}

      {/* Reviewer info (when being reviewed or after) */}
      {rx.reviewer && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
          <Clock className="w-3 h-3 shrink-0" />
          <span>
            Reviewed by{" "}
            <span className="font-medium text-foreground">
              {rx.reviewer.name}
            </span>
            {rx.reviewed_at
              ? ` · ${new Date(rx.reviewed_at).toLocaleDateString()}`
              : ""}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end">
        <PrescriptionActions rx={rx} />
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PharmacyPrescriptions = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // ── Build API params (32 — GET /prescription-requests) ───────────────────
  // Only sends ?status= when a specific status is selected.
  const apiParams: ListPrescriptionParams = useMemo(
    () => ({
      ...(filters.status !== "all" && { status: filters.status }),
    }),
    [filters.status],
  );

  // React Query refetches automatically when apiParams (queryKey) changes.
  const { data, isLoading, isError, refetch } =
    useGetPrescriptionRequests(apiParams);

  const prescriptions: Prescription[] = data?.data ?? [];

  // ── Client-side search + sort (status filter is server-side) ─────────────
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();

    return prescriptions
      .filter((rx) => {
        if (!q) return true;
        return (
          rx.patient.name.toLowerCase().includes(q) ||
          (rx.notes ?? "").toLowerCase().includes(q) ||
          String(rx.id).includes(q)
        );
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "date-asc":
            return (a.created_at ?? "").localeCompare(b.created_at ?? "");
          case "patient":
            return a.patient.name.localeCompare(b.patient.name);
          default: // date-desc
            return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        }
      });
  }, [prescriptions, filters.search, filters.sort]);

  // ── Counts from the current API response ─────────────────────────────────
  const counts = useMemo(
    () => ({
      pending:   prescriptions.filter((r) => r.status === "pending").length,
      reviewing: prescriptions.filter((r) => r.status === "reviewing").length,
      approved:  prescriptions.filter((r) => r.status === "approved").length,
      rejected:  prescriptions.filter((r) => r.status === "rejected").length,
      fulfilled: prescriptions.filter((r) => r.status === "fulfilled").length,
    }),
    [prescriptions],
  );

  // ─── Sidebar ───────────────────────────────────────────────────────────────

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
        {/* Status filter → maps to ?status= on the API */}
        <FilterSection title="Status">
          <PillGroup<PrescriptionStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all",       label: "All statuses" },
              { value: "pending",   label: "Pending",   dot: "bg-amber-500" },
              { value: "reviewing", label: "Reviewing", dot: "bg-sky-500" },
              { value: "approved",  label: "Approved",  dot: "bg-violet-500" },
              { value: "rejected",  label: "Rejected",  dot: "bg-red-500" },
              { value: "fulfilled", label: "Fulfilled", dot: "bg-emerald-500" },
            ]}
          />
        </FilterSection>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2">
              Active filters
            </p>
            <div className="flex flex-wrap gap-1">
              {filters.status !== "all" && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-medium">
                  {filters.status}
                  <button onClick={() => set("status", "all")} className="hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {filters.search && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-medium">
                  "{filters.search}"
                  <button onClick={() => set("search", "")} className="hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.rx_title")}
          subtitle={t("pages.pharmacy.rx_sub")}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Desktop sidebar ── */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* ── Mobile backdrop ── */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 backdrop-blur-sm",
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* ── Mobile bottom drawer ── */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 md:hidden",
              "bg-card rounded-t-lg border-t border-border/60",
              "max-h-[85dvh] flex flex-col overflow-hidden",
              "transition-transform duration-300 ease-out shadow-2xl",
              filterOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1.5 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-3 border-t border-border/60 bg-card">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-semibold transition-all duration-200 shadow-sm hover:shadow"
              >
                Show {filtered.length}{" "}
                {filtered.length === 1 ? "prescription" : "prescriptions"}
              </button>
            </div>
          </div>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              {/* Left: count + status pills */}
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading…
                  </span>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {filtered.length}
                    </span>{" "}
                    {filtered.length === 1 ? "prescription" : "prescriptions"}
                    {hasActiveFilters && (
                      <button
                        onClick={clearAll}
                        className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </p>
                )}

                {/* Clickable quick-filter pills */}
                {!isLoading && (
                  <div className="hidden lg:flex items-center gap-2">
                    {counts.pending > 0 && (
                      <button
                        onClick={() => set("status", "pending")}
                        className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {counts.pending} pending
                      </button>
                    )}
                    {counts.reviewing > 0 && (
                      <button
                        onClick={() => set("status", "reviewing")}
                        className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        {counts.reviewing} reviewing
                      </button>
                    )}
                    {counts.approved > 0 && (
                      <button
                        onClick={() => set("status", "approved")}
                        className="flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 border border-violet-200 dark:border-violet-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        {counts.approved} approved
                      </button>
                    )}
                    {counts.fulfilled > 0 && (
                      <button
                        onClick={() => set("status", "fulfilled")}
                        className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm hover:opacity-80 transition-opacity"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {counts.fulfilled} fulfilled
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: refresh + search + sort + mobile filter btn */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refetch()}
                  title="Refresh"
                  className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw
                    className={cn("w-3 h-3", isLoading && "animate-spin")}
                  />
                </button>

                {/* Client-side search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search patient, notes, ID…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Client-side sort */}
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as SortOption)}
                    className="appearance-none pl-2.5 pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] transition-all duration-200 font-medium",
                    hasActiveFilters
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Grid / states */}
            <div className="p-4">

              {/* ── Error state ── */}
              {isError && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      Failed to load prescriptions
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Check your connection and try again
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                    className="text-[11px] h-7 px-3 rounded-sm mt-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1.5" />
                    Retry
                  </Button>
                </div>
              )}

              {/* ── Loading skeleton ── */}
              {isLoading && (
                <div className="grid md:grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-card border border-border/70 rounded-sm p-4 flex flex-col gap-3"
                    >
                      {/* Header skeleton */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="h-3 rounded bg-muted/60 animate-pulse w-2/3" />
                          <div className="h-2.5 rounded bg-muted/40 animate-pulse w-1/2" />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="h-4 w-14 rounded bg-muted/60 animate-pulse" />
                          <div className="h-4 w-16 rounded bg-muted/60 animate-pulse" />
                        </div>
                      </div>
                      {/* Image skeleton */}
                      <div
                        className="rounded-sm bg-muted/40 animate-pulse"
                        style={{ aspectRatio: "16/9" }}
                      />
                      {/* Note skeleton */}
                      <div className="h-8 rounded bg-muted/40 animate-pulse" />
                      {/* Button skeleton */}
                      <div className="flex justify-end gap-2">
                        <div className="h-7 w-20 rounded-sm bg-muted/60 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Empty state ── */}
              {!isLoading && !isError && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Pill className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      {hasActiveFilters
                        ? "No prescriptions match your filters"
                        : "No prescription requests yet"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {hasActiveFilters
                        ? "Try widening your search criteria"
                        : "Requests will appear here once submitted"}
                    </p>
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
              )}

              {/* ── Cards grid ── */}
              {!isLoading && !isError && filtered.length > 0 && (
                <div className="grid md:grid-cols-2 gap-2">
                  {filtered.map((rx) => (
                    <PrescriptionCard key={rx.id} rx={rx} />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyPrescriptions;
