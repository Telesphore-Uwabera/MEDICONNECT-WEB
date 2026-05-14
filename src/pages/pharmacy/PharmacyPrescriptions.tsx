import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Pill, Building2, SlidersHorizontal, X, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePrescriptions, updatePrescription } from "@/lib/prescription-store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ─────────────────────────────────────────────────────────────────────

const PHARMACY_ID = "ph1";
const PHARMACY_NAME = "MediPlus Pharmacy";

type StatusFilter = "All" | "incoming" | "filled" | "cancelled";
type IssuerFilter = "All" | "doctor" | "hospital";
type SortOption = "date-desc" | "date-asc" | "patient";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date: Newest first" },
  { value: "date-asc", label: "Date: Oldest first" },
  { value: "patient", label: "Patient (A–Z)" },
];

interface FilterState {
  search: string;
  status: StatusFilter;
  issuer: IssuerFilter;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
  issuer: "All",
  sort: "date-desc",
};

const STATUS_STYLES = {
  filled: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  incoming: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
};

const STATUS_DOT = {
  filled: "bg-emerald-500",
  cancelled: "bg-red-500",
  incoming: "bg-sky-500",
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
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left",
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

// ─── Prescription Card ─────────────────────────────────────────────────────────

function PrescriptionCard({
  p,
}: {
  p: ReturnType<typeof usePrescriptions>[number];
}) {
  const { t } = useTranslation();
  const isFilled = p.status === "filled";
  const isCancelled = p.status === "cancelled";
  const effectiveStatus = isFilled ? "filled" : isCancelled ? "cancelled" : "incoming";

  return (
    <div className="bg-card border border-border/70 rounded-sm p-4 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-[12px] text-foreground truncate">
            {p.patientName}
          </div>
          <div className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
            {p.issuer === "hospital" && (
              <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            )}
            <span className="truncate">
              {p.doctorName}
              {p.issuerOrg ? ` · ${p.issuerOrg}` : ""} · {p.date}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-secondary/60 border border-border/40 text-muted-foreground/70">
            #{p.id.slice(0, 6).toUpperCase()}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 py-0 font-medium border",
              STATUS_STYLES[effectiveStatus as keyof typeof STATUS_STYLES] ?? "bg-secondary/50 text-muted-foreground border-border/60",
            )}
          >
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[effectiveStatus as keyof typeof STATUS_DOT] ?? "bg-muted-foreground/40")} />
            {isFilled
              ? t("pages.pharmacy.filled_label")
              : isCancelled
                ? t("pages.doctor.rx_status_cancelled")
                : t("pages.pharmacy.incoming_label")}
          </Badge>
        </div>
      </div>

      {/* Medications */}
      <div className="space-y-1.5">
        {p.medications.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-[11px] p-2 rounded-sm bg-secondary/40 border border-border/30"
          >
            <Pill className="h-3 w-3 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">
                {m.name}{" "}
                <span className="text-muted-foreground/70 font-normal text-[10px]">
                  · {m.dosage}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                {m.frequency}
                {m.quantity
                  ? ` · ${t("pages.patient.qty", { count: m.quantity })}`
                  : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isFilled && !isCancelled && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[10px] rounded-sm border-border/60 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            onClick={() => {
              updatePrescription(p.id, { status: "cancelled" });
              toast({ title: t("pages.pharmacy.declined") });
            }}
          >
            {t("pages.pharmacy.decline")}
          </Button>
          <Button
            size="sm"
            className="flex-1 h-7 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm shadow-sm hover:shadow transition-all duration-200"
            onClick={() => {
              updatePrescription(p.id, { status: "filled" });
              toast({
                title: t("pages.pharmacy.marked_filled"),
                description: t("pages.pharmacy.filled_desc", {
                  name: p.patientName,
                }),
              });
            }}
          >
            {t("pages.pharmacy.fulfill")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PharmacyPrescriptions = () => {
  const { t } = useTranslation();
  const allRx = usePrescriptions().filter((p) => p.pharmacyId === PHARMACY_ID);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

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

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return allRx
      .filter((p) => {
        const effectiveStatus =
          p.status === "filled"
            ? "filled"
            : p.status === "cancelled"
              ? "cancelled"
              : "incoming";
        if (filters.status !== "All" && effectiveStatus !== filters.status)
          return false;
        if (filters.issuer !== "All" && p.issuer !== filters.issuer)
          return false;
        if (
          q &&
          !p.patientName.toLowerCase().includes(q) &&
          !p.doctorName.toLowerCase().includes(q) &&
          !(p.issuerOrg ?? "").toLowerCase().includes(q) &&
          !p.medications.some((m) => m.name.toLowerCase().includes(q))
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "date-asc":
            return a.date.localeCompare(b.date);
          case "patient":
            return a.patientName.localeCompare(b.patientName);
          default:
            return b.date.localeCompare(a.date);
        }
      });
  }, [allRx, filters]);

  const incomingCount = allRx.filter(
    (p) => p.status !== "filled" && p.status !== "cancelled",
  ).length;
  const filledCount = allRx.filter((p) => p.status === "filled").length;
  const cancelledCount = allRx.filter((p) => p.status === "cancelled").length;

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
              { value: "All", label: "All statuses" },
              { value: "incoming", label: t("pages.pharmacy.incoming_label") },
              { value: "filled", label: t("pages.pharmacy.filled_label") },
              { value: "cancelled", label: t("pages.doctor.rx_status_cancelled") },
            ]}
          />
        </FilterSection>

        <FilterSection title="Issued by">
          <PillGroup<IssuerFilter>
            value={filters.issuer}
            onChange={(v) => set("issuer", v)}
            options={[
              { value: "All", label: "All sources" },
              { value: "doctor", label: "Doctor" },
              { value: "hospital", label: "Hospital" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.rx_title")}
          subtitle={t("pages.pharmacy.rx_sub", { name: PHARMACY_NAME })}
        />

        {/* ── Body: sidebar + results ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity duration-300 backdrop-blur-sm",
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom drawer */}
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

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                  {filtered.length === 1 ? "prescription" : "prescriptions"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset filters
                    </button>
                  )}
                </p>

                <div className="hidden lg:flex items-center gap-2">
                  {incomingCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      {incomingCount} awaiting
                    </span>
                  )}
                  {filledCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {filledCount} filled
                    </span>
                  )}
                  {cancelledCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {cancelledCount} declined
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search patient, doctor, medication…"
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Sort */}
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

            {/* Grid */}
            <div className="p-4">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                    <Pill className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">
                      No prescriptions match your filters
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
                <div className="grid md:grid-cols-2 gap-2">
                  {filtered.map((p) => (
                    <PrescriptionCard key={p.id} p={p} />
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
