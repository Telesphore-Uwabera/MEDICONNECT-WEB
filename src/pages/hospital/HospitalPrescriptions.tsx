import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pill, Send, User, Mail, Smartphone, Info, SlidersHorizontal, X, Search, ChevronDown } from "lucide-react";
import { PrescriptionWizard } from "@/components/PrescriptionWizard";
import { usePrescriptions, type RxStatus } from "@/lib/prescription-store";
import { cn } from "@/lib/utils";

// ─── Constants ─────────────────────────────────────────────────────────────────

const channelIcon = { app: User, email: Mail, sms: Smartphone } as const;
const HOSPITAL = "King Faisal Hospital";

type SortOption = "date-desc" | "date-asc" | "patient";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date: Newest first" },
  { value: "date-asc", label: "Date: Oldest first" },
  { value: "patient", label: "Patient (A–Z)" },
];

interface FilterState {
  search: string;
  status: RxStatus | "All";
  sort: SortOption;
  channelFilter: "All" | "app" | "email" | "sms";
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "All",
  sort: "date-desc",
  channelFilter: "All",
};

// ─── Status styles ────────────────────────────────────────────────────────────

const STATUS_STYLES: Partial<Record<RxStatus, string>> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800",
  "sent-to-patient": "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  "sent-to-pharmacy": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  filled: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Partial<Record<RxStatus, string>> = {
  draft: "bg-slate-400",
  "sent-to-patient": "bg-sky-500",
  "sent-to-pharmacy": "bg-amber-500",
  filled: "bg-emerald-500",
  cancelled: "bg-red-500",
};

// ─── Dummy data ────────────────────────────────────────────────────────────────

const DUMMY_PRESCRIPTIONS = [
  {
    id: "rx-001",
    patientName: "Amina Uwase",
    doctorName: "Dr. Jean-Paul Habimana",
    date: "2025-05-07",
    status: "sent-to-patient" as RxStatus,
    issuer: "hospital",
    issuerOrg: HOSPITAL,
    channels: ["app", "sms"] as ("app" | "email" | "sms")[],
    pharmacyName: null,
    medications: [
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily" },
    ],
  },
  {
    id: "rx-002",
    patientName: "Eric Nshimiyimana",
    doctorName: "Dr. Marie Claire Ingabire",
    date: "2025-05-06",
    status: "sent-to-pharmacy" as RxStatus,
    issuer: "hospital",
    issuerOrg: HOSPITAL,
    channels: ["email"] as ("app" | "email" | "sms")[],
    pharmacyName: "Kigali Central Pharmacy",
    medications: [
      { name: "Amoxicillin", dosage: "250mg", frequency: "Three times daily" },
    ],
  },
  {
    id: "rx-003",
    patientName: "Claudine Mukamana",
    doctorName: "Dr. Samuel Nkurunziza",
    date: "2025-05-05",
    status: "filled" as RxStatus,
    issuer: "hospital",
    issuerOrg: HOSPITAL,
    channels: ["app", "email"] as ("app" | "email" | "sms")[],
    pharmacyName: "Nyarugenge Pharmacy",
    medications: [
      { name: "Atorvastatin", dosage: "20mg", frequency: "Once daily at night" },
      { name: "Aspirin", dosage: "75mg", frequency: "Once daily" },
    ],
  },
  {
    id: "rx-004",
    patientName: "Patrick Bizimana",
    doctorName: "Dr. Diane Umubyeyi",
    date: "2025-05-04",
    status: "draft" as RxStatus,
    issuer: "hospital",
    issuerOrg: HOSPITAL,
    channels: [] as ("app" | "email" | "sms")[],
    pharmacyName: null,
    medications: [
      { name: "Omeprazole", dosage: "20mg", frequency: "Before meals" },
    ],
  },
  {
    id: "rx-005",
    patientName: "Solange Iradukunda",
    doctorName: "Dr. Jean-Paul Habimana",
    date: "2025-05-03",
    status: "cancelled" as RxStatus,
    issuer: "hospital",
    issuerOrg: HOSPITAL,
    channels: ["sms"] as ("app" | "email" | "sms")[],
    pharmacyName: null,
    medications: [
      { name: "Ciprofloxacin", dosage: "500mg", frequency: "Twice daily for 7 days" },
    ],
  },
  {
    id: "rx-006",
    patientName: "Jean de Dieu Ndayishimiye",
    doctorName: "Dr. Marie Claire Ingabire",
    date: "2025-05-02",
    status: "sent-to-pharmacy" as RxStatus,
    issuer: "hospital",
    issuerOrg: HOSPITAL,
    channels: ["app"] as ("app" | "email" | "sms")[],
    pharmacyName: "Remera Health Pharmacy",
    medications: [
      { name: "Salbutamol Inhaler", dosage: "100mcg", frequency: "As needed" },
      { name: "Beclometasone", dosage: "200mcg", frequency: "Twice daily" },
    ],
  },
];

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
            "px-2.5 py-1.5 rounded-[6px] text-[11px] border transition-all duration-200 text-left",
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
  statusLabel,
}: {
  p: (typeof DUMMY_PRESCRIPTIONS)[number];
  statusLabel: Record<RxStatus, string>;
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-card border border-border/70 rounded-[6px] p-4 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-[12px] text-foreground truncate">{p.patientName}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
            <span className="font-medium text-muted-foreground">{p.doctorName}</span>
            <span>·</span>
            <span>{p.date}</span>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[9px] px-1.5 py-0 font-medium border", STATUS_STYLES[p.status] ?? "bg-secondary/50 text-muted-foreground border-border/60")}>
          <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[p.status] ?? "bg-muted-foreground/40")} />
          {statusLabel[p.status]}
        </Badge>
      </div>

      {/* Medications */}
      <div className="space-y-1.5">
        {p.medications.map((m, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <Pill className="h-3 w-3 text-primary shrink-0" />
            <span className="font-medium text-foreground">{m.name}</span>
            <span className="text-muted-foreground/70 text-[10px]">
              · {m.dosage} · {m.frequency}
            </span>
          </div>
        ))}
      </div>

      {/* Pharmacy */}
      {p.pharmacyName && (
        <div className="text-[10px] flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <Send className="h-3 w-3" />
          {t("pages.doctor.forwarded_to", { name: p.pharmacyName })}
        </div>
      )}

      {/* Channels */}
      {p.channels.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground/70">
            {t("pages.doctor.patient_copy")}
          </span>
          {p.channels.map((c) => {
            const I = channelIcon[c];
            return (
              <span
                key={c}
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-[6px] bg-secondary/60 border border-border/40 text-muted-foreground/80"
              >
                <I className="h-2.5 w-2.5" />
                {c}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const HospitalPrescriptions = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const stored = usePrescriptions().filter(
    (p) => p.issuer === "hospital" && p.issuerOrg === HOSPITAL,
  );

  const allPrescriptions = useMemo(() => {
    const storeIds = new Set(stored.map((p) => p.id));
    return [
      ...stored,
      ...DUMMY_PRESCRIPTIONS.filter((p) => !storeIds.has(p.id)),
    ];
  }, [stored]);

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
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const statusLabel: Record<RxStatus, string> = {
    draft: t("pages.doctor.rx_status_draft"),
    "sent-to-patient": t("pages.doctor.rx_status_sent_patient"),
    "sent-to-pharmacy": t("pages.doctor.rx_status_sent_pharmacy"),
    filled: t("pages.doctor.rx_status_filled"),
    cancelled: t("pages.doctor.rx_status_cancelled"),
    completed: "Completed",
    active: "Active",
    rejected: "Rejected",
    pending: "Pending",
    dispensed: "Dispensed",
    returned: "Returned",
    expired: "Expired",
  };

  const STATUS_FILTER_OPTIONS: { value: RxStatus | "All"; label: string }[] = [
    { value: "All", label: "All statuses" },
    { value: "draft", label: statusLabel.draft },
    { value: "sent-to-patient", label: statusLabel["sent-to-patient"] },
    { value: "sent-to-pharmacy", label: statusLabel["sent-to-pharmacy"] },
    { value: "filled", label: statusLabel.filled },
    { value: "cancelled", label: statusLabel.cancelled },
  ];

  const CHANNEL_OPTIONS: { value: FilterState["channelFilter"]; label: string }[] = [
    { value: "All", label: "All channels" },
    { value: "app", label: "App" },
    { value: "email", label: "Email" },
    { value: "sms", label: "SMS" },
  ];

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return allPrescriptions
      .filter((p) => {
        if (filters.status !== "All" && p.status !== filters.status) return false;
        if (
          filters.channelFilter !== "All" &&
          !p.channels.includes(filters.channelFilter as "app" | "email" | "sms")
        )
          return false;
        if (
          q &&
          !p.patientName.toLowerCase().includes(q) &&
          !p.doctorName.toLowerCase().includes(q) &&
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
  }, [allPrescriptions, filters]);

  const sentCount = allPrescriptions.filter(
    (p) => p.status === "sent-to-patient" || p.status === "sent-to-pharmacy",
  ).length;
  const filledCount = allPrescriptions.filter((p) => p.status === "filled").length;
  const draftCount = allPrescriptions.filter((p) => p.status === "draft").length;

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: "Status",
      value: filters.status,
      options: STATUS_FILTER_OPTIONS,
      onChange: (v: string) => set("status", v as any)
    },
    {
      type: "select" as const,
      key: "channelFilter",
      label: "Delivery Channel",
      value: filters.channelFilter,
      options: CHANNEL_OPTIONS,
      onChange: (v: string) => set("channelFilter", v as any)
    },
    {
      type: "select" as const,
      key: "sort",
      label: "Sort By",
      value: filters.sort,
      options: SORT_OPTIONS,
      onChange: (v: string) => set("sort", v as any)
    }
  ], [filters.status, filters.channelFilter, filters.sort, set]);

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.rx_title")}
          subtitle={t("pages.hospital.rx_sub", { name: HOSPITAL })}
        />

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2, lg: 3 }}
        />

        {/* Info banner */}
        <div className="mx-4 mt-3 rounded-[6px] border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] flex items-start gap-2 text-primary">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{t("pages.hospital.rx_attached")}</span>
        </div>

        <main className="flex-1 overflow-y-auto flex flex-col">

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
                    Reset
                  </button>
                )}
              </p>

              <div className="hidden lg:flex items-center gap-2">
                {sentCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-[6px]">
                    <Send className="h-2.5 w-2.5" />
                    {sentCount} sent
                  </span>
                )}
                {filledCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-[6px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {filledCount} filled
                  </span>
                )}
                {draftCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-[6px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {draftCount} draft
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
                  className="w-56 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              <Button
                className="h-7 px-3 text-[10px] font-semibold rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200 shrink-0"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("pages.doctor.new_rx")}
              </Button>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
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
                  <PrescriptionCard
                    key={p.id}
                    p={p as (typeof DUMMY_PRESCRIPTIONS)[number]}
                    statusLabel={statusLabel}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <PrescriptionWizard
        open={open}
        onOpenChange={setOpen}
        doctorName="Hospital Clinician"
        issuer="hospital"
        issuerOrg={HOSPITAL}
      />
    </DashboardLayout>
  );
};

export default HospitalPrescriptions;
