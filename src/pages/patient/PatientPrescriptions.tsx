
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
  List,
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
} from "./components/prescription-constants";
import { openPrescriptionDocument } from "@/lib/prescription-document";

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
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { MyMedicalInfoDrawer } from "./components/MyMedicalInfoDrawer";
import { HeartPulse } from "lucide-react";

// ─── Page ─────────────────────────────────────────────────────────────────────

const PatientPrescriptions = () => {
  const { t, i18n } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("table");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [prescriptionToSend, setPrescriptionToSend] = useState<Prescription | null>(null);
  const [medInfoOpen, setMedInfoOpen] = useState(false);

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
    // The backend PDF isn't publicly reachable (storage 403 / route 404), so we
    // render the prescription document on the frontend instead.
    if (action === "pdf") openPrescriptionDocument(p);
    if (action === "send") { setPrescriptionToSend(p); setPharmacyModalOpen(true); }
  }, []);

  const handleViewDetails = useCallback((p: Prescription) => setSelectedPrescription(p), []);
  const closeDrawer = useCallback(() => setSelectedPrescription(null), []);

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: [
        { value: "all", label: "All statuses" },
        ...ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s })),
      ],
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "select" as const,
      key: "is_signed",
      label: "Signature",
      value: String(filters.is_signed),
      options: [
        { value: "all", label: "All" },
        { value: "true", label: "Signed" },
        { value: "false", label: "Unsigned" },
      ],
      onChange: (v: string) => set("is_signed", v === "all" ? "all" : v === "true")
    },
    {
      type: "custom" as const,
      key: "date_range",
      label: "Date range",
      render: () => (
        <DateRangeInput
          from={filters.from}
          to={filters.to}
          onFrom={(v) => set("from", v)}
          onTo={(v) => set("to", v)}
        />
      )
    },
    {
      type: "search" as const,
      key: "search",
      label: "Search",
      value: filters.search,
      placeholder: "Prescription...",
      onChange: (v: string) => set("search", v)
    }
  ], [filters, set]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.prescriptions_title", { defaultValue: "My Prescriptions" })}
          subtitle={t("pages.patient.prescriptions_sub", { defaultValue: "View and manage your prescriptions" })}
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
          {/* Stats */}
          <div className="px-4 pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard label="Issued" value={issuedCount} icon={FileText} accent="primary" />
            <StatCard label="At pharmacy" value={sentToPharmacyCount} icon={MapPin} accent="warning" />
            <StatCard label="Dispensed" value={dispensedCount} icon={Send} accent="success" />
            <StatCard label="Cancelled" value={cancelledCount} icon={X} accent="primary" />
          </div>

          {/* Expiring soon banner */}
          {expiringSoonCount > 0 && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-[6px] bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {expiringSoonCount} prescription{expiringSoonCount > 1 ? "s" : ""} expiring within 3 days — collect soon.
              </p>
            </div>
          )}

          {/* Toolbar */}
          <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {isLoading ? (
                  <span className="text-muted-foreground/40">Loading…</span>
                ) : (
                  <>
                    <span className="font-bold text-foreground">{prescriptions.length}</span>{" "}
                    {prescriptions.length === 1 ? "prescription" : "prescriptions"}
                  </>
                )}
                {hasActiveFilters && !isLoading && (
                  <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/70 hover:underline text-xs font-medium">
                    Reset filters
                  </button>
                )}
              </p>
              {isFetching && !isLoading && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
                  <Loader2 className="w-4 h-4 animate-spin" />Refreshing
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as "date-asc" | "date-desc")}
                className="hidden sm:block px-2 py-1.5 text-[11px] font-medium bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
              </select>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              <div className="flex rounded-[6px] border border-border overflow-hidden bg-card shadow-sm">
                <button
                  onClick={() => setView("table")}
                  className={cn(
                    "p-1.5 transition-colors",
                    view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("cards")}
                  className={cn(
                    "p-1.5 transition-colors",
                    view === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {isError && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-12 h-12 rounded-[6px] bg-red-50 dark:bg-red-950/30 flex items-center justify-center border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Failed to load prescriptions</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Please check your connection and try again.</p>
                </div>
                <button onClick={() => refetch()} className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 font-semibold">
                  <RefreshCw className="w-4 h-4" />Retry
                </button>
              </div>
            )}

            {isLoading && !isError && (
              view === "table" ? (
                <div className="rounded-[6px] border border-border/60 bg-card overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
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
                <div className="w-12 h-12 rounded-[6px] bg-muted/50 flex items-center justify-center border border-border/30">
                  <Pill className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {hasActiveFilters ? "No prescriptions match your filters" : "No prescriptions yet"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {hasActiveFilters ? "Try widening your search criteria" : "Prescriptions issued by your doctor will appear here"}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="text-xs text-primary hover:text-primary/70 font-semibold hover:underline">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Table view */}
            {!isLoading && !isError && prescriptions.length > 0 && view === "table" && (
              <div className="rounded-[6px] border border-border/60 bg-card overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground/60 border-b border-border/50">
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
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 overflow-hidden">
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
                                <p className="font-semibold text-xs text-foreground">{p.doctor.user.name}</p>
                                <p className="text-xs text-muted-foreground/60">{p.doctor.specialization}</p>
                                {p.is_signed && (
                                  <span className="flex items-center gap-0.5 mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-2 h-2" />Signed
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              {p.items.slice(0, 2).map((item) => (
                                <span key={item.id} className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                                  <Pill className="h-2 w-2 text-primary shrink-0" />
                                  <span className="font-medium text-foreground/80">{item.medicine_name}</span>
                                  <span className="text-muted-foreground/45">· {item.dosage}</span>
                                </span>
                              ))}
                              {p.items.length > 2 && (
                                <span className="text-xs text-muted-foreground/40 pl-3">+{p.items.length - 2} more</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground/60 text-xs">
                            {new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className={cn("text-xs", expiring ? "text-amber-600 dark:text-amber-400 font-medium" : expired ? "text-muted-foreground/40" : "text-muted-foreground/60")}>
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
                                className="h-6 px-2 text-xs rounded-[6px] border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
                                onClick={() => handleViewDetails(p)}
                              >
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs rounded-[6px] border-border/50 hover:border-primary/30 hover:bg-secondary/30 gap-1"
                                onClick={() => handleAction(p, "pdf")}
                              >
                                <Download className="h-2 w-2" />PDF
                              </Button>
                              {p.status === "issued" && (
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] gap-1"
                                  onClick={() => handleAction(p, "send")}
                                >
                                  <Send className="h-4 w-4" />Send
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

      <MyMedicalInfoDrawer open={medInfoOpen} onClose={() => setMedInfoOpen(false)} />

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
