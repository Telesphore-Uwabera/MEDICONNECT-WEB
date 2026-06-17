
// export default PatientPrescriptions;


import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSendPrescriptionToPharmacy } from "@/hooks/patient/use-patient-prescriptions";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  Download,
  Pill,
  Send,
  MapPin,
  FileText,
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  LayoutGrid,
  Rows3,
  CalendarRange,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PrescriptionApiStatus,
  useGetPatientPrescriptions,
  type PrescriptionFilters,
  type Prescription,
} from "@/hooks/patient/use-patient-prescriptions";
import { useSearchPharmacies } from "@/hooks/patient/use-patient-search-pharmacy";

import {
  ALL_STATUSES,
  STATUS_LABEL,
  INITIAL_FILTERS,
  type FilterState,
  type ViewMode,
  isExpiringSoon,
  getPdfUrl,
} from "./components/prescription-constants";

import {
  StatusBadge,
  FilterSection,
  PillGroup,
  DateRangeInput,
  SkeletonRow,
  SkeletonCard,
  PrescriptionDrawer,
  PrescriptionCard,
  PharmacySelectionModal,
} from "./components/prescription-components";

// ─── Page ─────────────────────────────────────────────────────────────────────

const PatientPrescriptions = () => {
  const { t, i18n } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [prescriptionToSend, setPrescriptionToSend] = useState<Prescription | null>(null);

  const apiFilters = useMemo<PrescriptionFilters>(
    () => ({
      search: filters.search || undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      is_signed: filters.is_signed !== "all" ? filters.is_signed : undefined,
    }),
    [filters],
  );

  const { data, isLoading, isError, refetch, isFetching } = useGetPatientPrescriptions(apiFilters);
  const { data: pharmaciesResp, isLoading: loadingPharmacies } = useSearchPharmacies({ per_page: 100 });
  const { mutate: sendToPharmacy, isPending: isSending } = useSendPrescriptionToPharmacy();

  const handleSendToPharmacy = useCallback(
    (
      pharmacyId: number,
      deliveryType: "pickup" | "home_delivery",
      deliveryAddress?: string,
      notes?: string,
    ) => {
      if (!prescriptionToSend) return;
      sendToPharmacy(
        {
          prescription_id: prescriptionToSend.id,
          pharmacy_id: pharmacyId,
          delivery_type: deliveryType,
          delivery_address: deliveryAddress,
          notes,
        },
        {
          onSuccess: () => {
            setPharmacyModalOpen(false);
            setPrescriptionToSend(null);
          },
        },
      );
    },
    [prescriptionToSend, sendToPharmacy],
  );

  const prescriptions = useMemo(() => {
    const list = data?.prescriptions ?? [];
    return [...list].sort((a, b) =>
      filters.sort === "date-asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data, filters.sort]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const issuedCount = prescriptions.filter((p) => p.status === "issued").length;
  const sentToPharmacyCount = prescriptions.filter((p) => p.status === "sent_to_pharmacy").length;
  const dispensedCount = prescriptions.filter((p) => p.status === "dispensed").length;
  const cancelledCount = prescriptions.filter((p) => p.status === "cancelled").length;
  const expiringSoonCount = prescriptions.filter((p) => isExpiringSoon(p.valid_until)).length;

  const handleAction = useCallback((p: Prescription, action: "pdf" | "send") => {
    if (action === "pdf" && p.pdf_url) window.open(getPdfUrl(p.pdf_url), "_blank");
    if (action === "send") { setPrescriptionToSend(p); setPharmacyModalOpen(true); }
  }, []);

  const handleViewDetails = useCallback((p: Prescription) => setSelectedPrescription(p), []);
  const closeDrawer = useCallback(() => setSelectedPrescription(null), []);

  // ─── Sidebar content ───────────────────────────────────────────────────────

  const sidebarContent = (
    <>
      <div className="px-3 pt-3.5 pb-2.5 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[9px] text-primary hover:text-primary/70 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-2.5 h-2.5" />Reset
          </button>
        )}
      </div>
      <div className="px-3">
        <FilterSection title="Status">
          <PillGroup<PrescriptionApiStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s })),
            ]}
          />
        </FilterSection>
        <FilterSection title="Signature">
          <PillGroup<boolean | "all">
            value={filters.is_signed}
            onChange={(v) => set("is_signed", v)}
            options={[
              { value: "all", label: "All" },
              { value: true, label: "Signed" },
              { value: false, label: "Unsigned" },
            ]}
          />
        </FilterSection>
        <FilterSection title="Date range">
          <DateRangeInput
            from={filters.from}
            to={filters.to}
            onFrom={(v) => set("from", v)}
            onTo={(v) => set("to", v)}
          />
        </FilterSection>
        <FilterSection title="Sort">
          <PillGroup<"date-asc" | "date-desc">
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={[
              { value: "date-desc", label: "Latest first" },
              { value: "date-asc", label: "Oldest first" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.prescriptions_title", { defaultValue: "My Prescriptions" })}
          subtitle={t("pages.patient.prescriptions_sub", { defaultValue: "View and manage your prescriptions" })}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-r border-border/50 bg-card/40 overflow-y-auto">
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

          {/* Mobile filter drawer */}
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
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* Main results */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats */}
            <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard label="Issued" value={issuedCount} icon={FileText} accent="primary" />
              <StatCard label="At pharmacy" value={sentToPharmacyCount} icon={MapPin} accent="warning" />
              <StatCard label="Dispensed" value={dispensedCount} icon={Send} accent="success" />
              <StatCard label="Cancelled" value={cancelledCount} icon={X} accent="primary" />
            </div>

            {/* Expiring soon banner */}
            {expiringSoonCount > 0 && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 flex items-center gap-2">
                <CalendarRange className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  {expiringSoonCount} prescription{expiringSoonCount > 1 ? "s" : ""} expiring within 3 days — collect soon.
                </p>
              </div>
            )}

            {/* Toolbar */}
            <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground">
                  {isLoading ? (
                    <span className="text-muted-foreground/40">Loading…</span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{prescriptions.length}</span>{" "}
                      {prescriptions.length === 1 ? "prescription" : "prescriptions"}
                    </>
                  )}
                  {hasActiveFilters && !isLoading && (
                    <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/70 hover:underline text-[9px] font-medium">
                      Reset filters
                    </button>
                  )}
                </p>
                {isFetching && !isLoading && (
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />Refreshing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search diagnosis, doctor…"
                    className="w-48 pl-7 pr-2.5 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/35 transition-all"
                  />
                </div>

                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => set("sort", e.target.value as FilterState["sort"])}
                    className="appearance-none pl-2 pr-6 py-1 text-[10px] bg-background border border-border/50 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer"
                  >
                    <option value="date-desc">Latest first</option>
                    <option value="date-asc">Oldest first</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground/40 pointer-events-none" />
                </div>

                <div className="flex rounded-sm border border-border/50 overflow-hidden bg-card">
                  <button
                    onClick={() => setView("table")}
                    aria-label="Table view"
                    className={cn("px-2 py-1 transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Rows3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setView("cards")}
                    aria-label="Card view"
                    className={cn("px-2 py-1 border-l border-border/50 transition-colors", view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1 px-2.5 py-1 rounded-sm border text-[10px] transition-colors",
                    hasActiveFilters ? "bg-primary text-white border-primary" : "border-border/50 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filters
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {isError && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-sm bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">Failed to load prescriptions</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Please check your connection and try again.</p>
                  </div>
                  <button onClick={() => refetch()} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/70 font-semibold">
                    <RefreshCw className="w-3 h-3" />Retry
                  </button>
                </div>
              )}

              {isLoading && !isError && (
                view === "table" ? (
                  <div className="rounded-sm border border-border/60 bg-card overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead className="bg-secondary/30 text-[9px] uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                        <tr>
                          {["Doctor", "Medications", "Issued", "Valid Until", "Status", ""].map((h) => (
                            <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-2.5">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                )
              )}

              {!isLoading && !isError && prescriptions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-12 h-12 rounded-sm bg-muted/50 flex items-center justify-center border border-border/30">
                    <Pill className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">
                      {hasActiveFilters ? "No prescriptions match your filters" : "No prescriptions yet"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {hasActiveFilters ? "Try widening your search criteria" : "Prescriptions issued by your doctor will appear here"}
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearAll} className="text-[10px] text-primary hover:text-primary/70 font-semibold hover:underline">
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Table view */}
              {!isLoading && !isError && prescriptions.length > 0 && view === "table" && (
                <div className="rounded-sm border border-border/60 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-[10px]">
                    <thead className="bg-secondary/30 text-[9px] uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
                      <tr>
                        {["Doctor", "Medications", "Issued", "Valid until", "Status", ""].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((p) => {
                        const expiring = isExpiringSoon(p.valid_until);
                        const expired = new Date(p.valid_until).getTime() < Date.now();
                        return (
                          <tr
                            key={p.id}
                            className={cn(
                              "border-t border-border/35 hover:bg-secondary/15 transition-colors group cursor-pointer",
                              expiring && "bg-amber-50/30 dark:bg-amber-950/10",
                            )}
                            onClick={() => handleViewDetails(p)}
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                                  {p.doctor.image ? (
                                    <img
                                      src={p.doctor.image.startsWith("http") ? p.doctor.image : `${import.meta.env.VITE_APP_BASE_URL}/storage/${p.doctor.image}`}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                  ) : p.doctor.user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-[10px] text-foreground">{p.doctor.user.name}</p>
                                  <p className="text-[9px] text-muted-foreground/60">{p.doctor.specialization}</p>
                                  {p.is_signed && (
                                    <span className="flex items-center gap-0.5 mt-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 className="w-2 h-2" />Signed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-0.5">
                                {p.items.slice(0, 2).map((item) => (
                                  <span key={item.id} className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/70">
                                    <Pill className="h-2 w-2 text-primary shrink-0" />
                                    <span className="font-medium text-foreground/80">{item.medicine_name}</span>
                                    <span className="text-muted-foreground/45">· {item.dosage}</span>
                                  </span>
                                ))}
                                {p.items.length > 2 && (
                                  <span className="text-[9px] text-muted-foreground/40 pl-3">+{p.items.length - 2} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground/60 text-[9px]">
                              {new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={cn("text-[9px]", expiring ? "text-amber-600 dark:text-amber-400 font-medium" : expired ? "text-muted-foreground/40" : "text-muted-foreground/60")}>
                                {new Date(p.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                {expiring && <span className="ml-1">⚠</span>}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
                                  onClick={() => handleViewDetails(p)}
                                >
                                  Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[9px] rounded-sm border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
                                  onClick={() => handleAction(p, "pdf")}
                                >
                                  <Download className="h-2 w-2" />PDF
                                </Button>
                                {p.status === "issued" && (
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-[9px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm gap-1"
                                    onClick={() => handleAction(p, "send")}
                                  >
                                    <Send className="h-2.5 w-2.5" />Send
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
              )}

              {/* Card view */}
              {!isLoading && !isError && prescriptions.length > 0 && view === "cards" && (
                <div className="grid md:grid-cols-2 gap-2.5">
                  {prescriptions.map((p) => (
                    <PrescriptionCard key={p.id} p={p} onAction={handleAction} onViewDetails={handleViewDetails} />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <PrescriptionDrawer
        prescription={selectedPrescription}
        onClose={closeDrawer}
        onAction={handleAction}
      />

      <PharmacySelectionModal
        isOpen={pharmacyModalOpen}
        onClose={() => { setPharmacyModalOpen(false); setPrescriptionToSend(null); }}
        pharmacies={pharmaciesResp?.data ?? []}
        isLoading={loadingPharmacies}
        onSelect={handleSendToPharmacy}
        isSending={isSending}
      />
    </DashboardLayout>
  );
};

export default PatientPrescriptions;
