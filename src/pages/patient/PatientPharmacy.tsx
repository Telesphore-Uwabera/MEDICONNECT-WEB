import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Search,
  MapPin,
  Truck,
  X,
  SlidersHorizontal,
  Pill,
  BadgeCheck,
  ChevronRight,
  Clock,
  Navigation,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronDown,
  Wifi,
  Shield,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useSearchPharmacies,
  useNearbyPharmacies,
  parseDeliveryMins,
  type Pharmacy,
} from "@/hooks/patient/use-patient-search-pharmacy";
import { PharmacyDrawer } from "./components/Pharmacydrawer";
import { PharmacyCart } from "./components/PharmacyCart";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { Card } from "@/components/ui/card";

// ─── Rwanda regions ───────────────────────────────────────────────────────────

const RWANDA_REGIONS = [
  { province: "Kigali City", city: "Kigali" },
  { province: "Eastern Province", city: "Rwamagana" },
  { province: "Northern Province", city: "Musanze" },
  { province: "Southern Province", city: "Nyanza" },
  { province: "Western Province", city: "Karongi" },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────────

type SortOption = "name" | "delivery-asc" | "fee-asc";
type ViewMode = "grid" | "list";

interface FilterState {
  q: string;
  province: string;
  city: string;
  offers_delivery: boolean;
  offers_pickup: boolean;
  is_open_24h: boolean;
  open_now: boolean;
  sort: SortOption;
}

const INITIAL_FILTERS: FilterState = {
  q: "",
  province: "",
  city: "",
  offers_delivery: false,
  offers_pickup: false,
  is_open_24h: false,
  open_now: false,
  sort: "name",
};

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "name", label: "Name (A–Z)" },
  { value: "delivery-asc", label: "Fastest delivery" },
  { value: "fee-asc", label: "Lowest fee" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortPharmacies(pharmacies: Pharmacy[], sort: SortOption): Pharmacy[] {
  return [...pharmacies].sort((a, b) => {
    switch (sort) {
      case "delivery-asc": {
        const da = parseDeliveryMins(a.estimated_delivery_minutes) ?? Infinity;
        const db = parseDeliveryMins(b.estimated_delivery_minutes) ?? Infinity;
        return da - db;
      }
      case "fee-asc": {
        const fa = a.delivery_fee ?? Infinity;
        const fb = b.delivery_fee ?? Infinity;
        return fa - fb;
      }
      default: return a.name.localeCompare(b.name);
    }
  });
}

// ─── Sidebar atoms ──────────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
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
  options: { value: T; label: string; icon?: React.ElementType }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-2.5 py-1.5 rounded-[6px] text-xs border transition-all duration-200 text-left flex items-center gap-1.5",
              value === o.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
                : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
            )}
          >
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleButton({
  value,
  onChange,
  label,
  icon: Icon,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: React.ElementType;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "px-2.5 py-1.5 rounded-[6px] text-xs border transition-all duration-200 text-left flex items-center gap-1.5 w-full",
        value
          ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      {label}
    </button>
  );
}

function PharmacyGridCard({ pharmacy: ph }: { pharmacy: Pharmacy }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);
  const todayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === todayName);
  const isClosedToday = todayHours?.is_closed ?? true;

  return (
    <>
      <Card
        className="rounded-[6px] overflow-hidden border-border/60 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col"
        onClick={() => setDrawerOpen(true)}
      >
        {/* ── Top strip ── */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pharmacy
          </span>
          <span
            className={cn(
              "text-xs font-bold",
              !isClosedToday ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}
          >
            {!isClosedToday ? "Open Today" : "Closed Today"}
          </span>
        </div>

        <div className="p-4 sm:p-5 flex flex-col flex-1">
          {/* Identity row */}
          <div className="flex items-start gap-3.5">
            <div className="h-16 w-16 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/15 overflow-hidden shadow-sm">
              {ph.logo
                ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
                : <Pill className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground leading-tight truncate flex items-center gap-1.5">
                {ph.name}
                {ph.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
              </h3>
              <p className="text-[15px] font-medium text-muted-foreground flex items-center gap-1 mt-1 truncate">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {ph.city}{ph.address ? `, ${ph.address}` : ""}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-[6px] border border-border overflow-hidden">
            <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
              <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                <Truck className="h-3.5 w-3.5" />
                <span className="text-[12px] uppercase tracking-wider font-semibold">Delivery</span>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {ph.offers_delivery && ph.delivery_fee != null ? `${ph.delivery_fee} ${ph.delivery_currency}` : ph.offers_delivery ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
              <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                <Navigation className="h-3.5 w-3.5" />
                <span className="text-[12px] uppercase tracking-wider font-semibold">Distance</span>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {ph.distance_km != null ? `${ph.distance_km.toFixed(1)} km` : "—"}
              </span>
            </div>
            <div className="flex flex-col items-center py-2 px-1 bg-muted/20">
              <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[12px] uppercase tracking-wider font-semibold">Time</span>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {deliveryMins != null ? `~${deliveryMins}m` : "—"}
              </span>
            </div>
          </div>

          {/* Badges / Features */}
          <div className="mt-3 flex flex-wrap gap-1">
            {ph.offers_delivery && (
              <span className="text-[12px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                Delivery
              </span>
            )}
            {ph.offers_pickup && (
              <span className="text-[12px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-[6px] bg-secondary text-muted-foreground border border-border/60">
                Pickup
              </span>
            )}
            {ph.is_open_24h && (
              <span className="text-[12px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-[6px] bg-primary/10 text-primary border border-primary/20">
                24h Open
              </span>
            )}
          </div>

          {/* Hours info */}
          <p className="mt-2 text-sm text-muted-foreground">
            {todayHours && !isClosedToday
              ? `Hours today: ${todayHours.open_time?.slice(0, 5)} – ${todayHours.close_time?.slice(0, 5)}`
              : "Closed today"}
          </p>

          {/* Actions */}
          <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 mt-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
              className="h-8 px-3 text-xs font-bold rounded-[6px] border-border/60 hover:bg-muted/50 transition-colors flex-1"
            >
              <Pill className="h-3.5 w-3.5 mr-1.5" />
              Inventory
            </Button>
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
              className="h-8 px-3 text-xs font-bold rounded-[6px] bg-primary text-primary-foreground hover:bg-primary/90 flex-1 shadow-sm"
            >
              Order Now
            </Button>
          </div>
        </div>
      </Card>

      <PharmacyDrawer pharmacy={ph} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

// ─── Pharmacy List Item ──────────────────────────────────────────────────────

function PharmacyListItem({ pharmacy: ph }: { pharmacy: Pharmacy }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);
  const todayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === todayName);
  const isClosedToday = todayHours?.is_closed ?? true;

  return (
    <>
      <div className="bg-card border border-border/70 rounded-[6px] p-3 flex items-center gap-3 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => setDrawerOpen(true)}>
        <div className="w-10 h-10 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10 overflow-hidden">
          {ph.logo
            ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
            : <Pill className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{ph.name}</h3>
            {ph.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/70">
            <span className="truncate">{ph.address}</span>
            <span>·</span>
            <span>{ph.city}</span>
            {deliveryMins != null && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Truck className="w-4 h-4" />~{deliveryMins} min
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            {ph.offers_delivery && (
              <span className="px-1.5 py-px text-xs font-semibold rounded-[6px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                Delivery
              </span>
            )}
            {isClosedToday ? (
              <span className="text-xs text-destructive font-medium">Closed</span>
            ) : (
              <span className="text-xs text-emerald-600 font-medium">Open</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
        </div>
      </div>

      <PharmacyDrawer pharmacy={ph} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────

function PharmacyCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-[6px] p-3 flex flex-col gap-2.5 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-[6px] bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded-[6px] w-3/4" />
          <div className="h-2.5 bg-muted/70 rounded-[6px] w-1/2" />
        </div>
      </div>
      <div className="flex gap-1">
        <div className="h-4 bg-muted rounded-[6px] w-16" />
        <div className="h-4 bg-muted/70 rounded-[6px] w-14" />
      </div>
      <div className="space-y-1">
        <div className="h-2.5 bg-muted/60 rounded-[6px] w-full" />
        <div className="h-2.5 bg-muted/50 rounded-[6px] w-3/4" />
      </div>
      <div className="flex justify-between pt-1.5 border-t border-border/40">
        <div className="h-3 bg-muted rounded-[6px] w-20" />
        <div className="h-6 bg-muted/80 rounded-[6px] w-24" />
      </div>
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
}: {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
}) {
  if (lastPage <= 1) return null;
  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-card/50">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}–{to}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span> pharmacies
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-[6px] border text-xs font-medium transition-all",
              currentPage === p
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40",
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SearchStats({
  isLoading,
  total,
  shown,
  delivery,
  open24h,
}: {
  isLoading: boolean;
  total: number;
  shown: number;
  delivery: number;
  open24h: number;
}) {
  const cards = [
    { label: "Matching pharmacies", value: total, icon: Pill, tone: "text-primary bg-primary/10 border-primary/20" },
    { label: "Shown now", value: shown, icon: Building2, tone: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
    { label: "With delivery", value: delivery, icon: Truck, tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Open 24h", value: open24h, icon: Clock, tone: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 p-4 pb-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-[6px] border border-border/70 bg-card p-3 flex items-center gap-3 min-w-0">
            <div className={cn("h-9 w-9 rounded-[6px] border flex items-center justify-center shrink-0", card.tone)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="h-5 w-12 rounded-[6px] bg-muted animate-pulse" />
              ) : (
                <p className="leading-none font-bold text-foreground text-sm tabular-nums ">{card.value}</p>
              )}
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaginationV2({
  currentPage,
  lastPage,
  total,
  perPage,
  itemLabel,
  onPageChange,
}: {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  itemLabel: string;
  onPageChange: (p: number) => void;
}) {
  if (total <= 0) return null;

  const safeLastPage = Math.max(1, lastPage);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeLastPage);
  const from = (safeCurrentPage - 1) * perPage + 1;
  const to = Math.min(safeCurrentPage * perPage, total);
  const goToPage = (nextPage: number) =>
    onPageChange(Math.min(Math.max(1, nextPage), safeLastPage));

  const pageNumbers = (() => {
    const pages = new Set<number>([1, safeLastPage, safeCurrentPage]);
    for (let p = safeCurrentPage - 1; p <= safeCurrentPage + 1; p += 1) {
      if (p >= 1 && p <= safeLastPage) pages.add(p);
    }
    return Array.from(pages).sort((a, b) => a - b);
  })();

  return (
    <div className="border-t border-border/70 bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Page {safeCurrentPage} of {safeLastPage}
          </p>
          <p className="text-[12px] text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{from}-{to}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> {itemLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="h-9 px-3 flex items-center gap-1.5 rounded-[6px] border border-border/70 bg-background text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>

          {pageNumbers.map((pageNumber, index) => {
            const previous = pageNumbers[index - 1];
            return (
              <span key={pageNumber} className="inline-flex items-center gap-1.5">
                {previous != null && pageNumber - previous > 1 && (
                  <span className="px-1 text-xs text-muted-foreground">...</span>
                )}
                <button
                  onClick={() => goToPage(pageNumber)}
                  aria-current={safeCurrentPage === pageNumber ? "page" : undefined}
                  className={cn(
                    "h-9 min-w-9 px-3 flex items-center justify-center rounded-[6px] border text-xs font-bold transition-all",
                    safeCurrentPage === pageNumber
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/50",
                  )}
                >
                  {pageNumber}
                </button>
              </span>
            );
          })}

          <button
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeLastPage}
            className="h-9 px-3 flex items-center gap-1.5 rounded-[6px] border border-border/70 bg-background text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PatientPharmacy = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(filters.q);
      setPage(1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters.q]);

  // Location
  const [nearbyCoords, setNearbyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
        toast.success("Showing pharmacies near you");
      },
      () => {
        setLocLoading(false);
        toast.error("Could not get your location. Please allow location access.");
      },
    );
  }, []);

  const handleClearLocation = useCallback(() => setNearbyCoords(null), []);

  const availableCities = filters.province
    ? RWANDA_REGIONS.filter((r) => r.province === filters.province).map((r) => r.city)
    : RWANDA_REGIONS.map((r) => r.city);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const searchQ = debouncedQ.trim().length >= 2 ? debouncedQ.trim() : undefined;

  const { data: pharmaciesResp, isLoading: loadingPharmacies } = useSearchPharmacies({
    q: searchQ,
    per_page: 50,
    page: page,
    province: filters.province || undefined,
    city: filters.city || undefined,
    offers_delivery: filters.offers_delivery || undefined,
    offers_pickup: filters.offers_pickup || undefined,
    is_open_24h: filters.is_open_24h || undefined,
    open_now: filters.open_now || undefined,
  });

  const { data: nearbyResp, isLoading: loadingNearby } = useNearbyPharmacies({
    lat: nearbyCoords?.lat ?? 0,
    lng: nearbyCoords?.lng ?? 0,
    per_page: 50,
    enabled: !!nearbyCoords,
  });

  const nearbyPharmacies: Pharmacy[] = useMemo(() => {
    const list = nearbyResp?.data ?? [];
    if (!searchQ) return list;
    const lower = searchQ.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.address?.toLowerCase().includes(lower) ||
        p.city?.toLowerCase().includes(lower),
    );
  }, [nearbyResp, searchQ]);

  const rawPharmacies: Pharmacy[] = nearbyCoords ? nearbyPharmacies : (pharmaciesResp?.data ?? []);
  const pharmacies = useMemo(() => sortPharmacies(rawPharmacies, filters.sort), [rawPharmacies, filters.sort]);
  const isLoading = nearbyCoords ? loadingNearby : loadingPharmacies;
  const paginationMeta = nearbyCoords ? nearbyResp?.meta : pharmaciesResp?.meta;
  const totalPharmacies = nearbyCoords ? nearbyPharmacies.length : paginationMeta?.total ?? pharmacies.length;
  const currentPage = nearbyCoords ? 1 : paginationMeta?.current_page ?? page;
  const perPage = paginationMeta?.per_page ?? Math.max(pharmacies.length, 1);
  const lastPage = nearbyCoords ? 1 : paginationMeta?.last_page ?? 1;

  useEffect(() => {
    if (!nearbyCoords && lastPage >= 1 && page > lastPage) setPage(lastPage);
  }, [lastPage, nearbyCoords, page]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== "q" && key !== "sort") setPage(1);
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setDebouncedQ("");
    setNearbyCoords(null);
    setPage(1);
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS) || !!nearbyCoords,
    [filters, nearbyCoords],
  );

  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  const deliveryCount = pharmacies.filter((p) => p.offers_delivery).length;
  const open24hCount = pharmacies.filter((p) => p.is_open_24h).length;

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
    requestAnimationFrame(() => {
      document.querySelector("[data-pharmacy-results]")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const filterFields = useMemo(() => [
    { type: "search" as const, key: "q", label: "Search", value: filters.q, onChange: (v: string) => set("q", v) },
    { type: "select" as const, key: "province", label: "Province", value: filters.province || "all", options: [{ value: "all", label: "All provinces" }, ...RWANDA_REGIONS.map(r => ({ value: r.province, label: r.province }))], onChange: (v: string) => { const province = v === "all" ? "" : v; set("province", province); set("city", ""); if (province) setNearbyCoords(null); } },
    { type: "select" as const, key: "city", label: "City", value: filters.city || "all", options: [{ value: "all", label: filters.province ? "All cities in province" : "All cities" }, ...availableCities.map(c => ({ value: c, label: c }))], onChange: (v: string) => { const city = v === "all" ? "" : v; set("city", city); if (city) setNearbyCoords(null); } },
    {
      type: "custom" as const,
      key: "location",
      label: "Location",
      render: () => (
        nearbyCoords ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 flex items-center justify-center gap-1.5 h-[28px] rounded-[6px] bg-primary/10 border border-primary/20 text-[13px] text-primary font-medium">
              <Navigation className="h-3 w-3 shrink-0" />
              Using location
            </div>
            <button
              className="h-[28px] w-[28px] rounded-[6px] border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleClearLocation}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleUseMyLocation}
            className="w-full mt-1 h-[28px] rounded-[6px] text-[13px] border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30 transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            {locLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
            {locLoading ? "Detecting…" : "Use my location"}
          </button>
        )
      )
    },
    {
      type: "custom" as const,
      key: "availability",
      label: "Availability",
      render: () => (
        <div className="flex flex-wrap gap-1 mt-1">
          <button
            onClick={() => set("offers_delivery", !filters.offers_delivery)}
            className={cn("px-2 h-[28px] rounded-[6px] text-[12px] border flex items-center gap-1 transition-all", filters.offers_delivery ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm" : "border-border/60 text-muted-foreground bg-card hover:bg-muted/50")}
          >
            <Truck className="w-3 h-3" /> Delivery
          </button>
          <button
            onClick={() => set("offers_pickup", !filters.offers_pickup)}
            className={cn("px-2 h-[28px] rounded-[6px] text-[12px] border flex items-center gap-1 transition-all", filters.offers_pickup ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm" : "border-border/60 text-muted-foreground bg-card hover:bg-muted/50")}
          >
            <MapPin className="w-3 h-3" /> Pickup
          </button>
          <button
            onClick={() => set("is_open_24h", !filters.is_open_24h)}
            className={cn("px-2 h-[28px] rounded-[6px] text-[12px] border flex items-center gap-1 transition-all", filters.is_open_24h ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm" : "border-border/60 text-muted-foreground bg-card hover:bg-muted/50")}
          >
            <Clock className="w-3 h-3" /> 24h
          </button>
          <button
            onClick={() => set("open_now", !filters.open_now)}
            className={cn("px-2 h-[28px] rounded-[6px] text-[12px] border flex items-center gap-1 transition-all", filters.open_now ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm" : "border-border/60 text-muted-foreground bg-card hover:bg-muted/50")}
          >
            <Wifi className="w-3 h-3" /> Open Now
          </button>
        </div>
      )
    }
  ], [filters, availableCities, nearbyCoords, locLoading, handleClearLocation, handleUseMyLocation, set]);

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.pharmacy_title", "Pharmacy Marketplace")}
          subtitle={t("pages.patient.pharmacy_sub", "Order medicines and healthcare products from registered pharmacies")}
          actions={<PharmacyCart variant="trigger" />}
        />

        <FilterBar
          open={filterOpen}
          onToggle={() => setFilterOpen(!filterOpen)}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAll}
          fields={filterFields}
          cols={{ default: 1, sm: 2, lg: 3, xl: 5 }}
        />

        {/* ── Results ── */}
        <main className="flex-1 overflow-y-auto flex flex-col" data-pharmacy-results>
          <SearchStats
            isLoading={isLoading}
            total={totalPharmacies}
            shown={pharmacies.length}
            delivery={deliveryCount}
            open24h={open24hCount}
          />

          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className="text-[13px] text-muted-foreground">
                {isLoading ? (
                  <span className="inline-block w-24 h-3 bg-muted rounded-[6px] animate-pulse" />
                ) : (
                  <>
                    <span className="font-bold text-foreground">{totalPharmacies}</span>{" "}
                    {totalPharmacies === 1 ? "pharmacy" : "pharmacies"} found
                    {searchQ && ` for "${searchQ}"`}
                    {hasActiveFilters && (
                      <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-[12px] font-medium transition-colors">
                        Reset
                      </button>
                    )}
                  </>
                )}
              </p>

              {/* Live stats */}
              {!isLoading && deliveryCount > 0 && (
                <span className="hidden lg:flex items-center gap-1 text-[12px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5" />
                  {deliveryCount} with delivery
                </span>
              )}
              {!isLoading && open24hCount > 0 && (
                <span className="hidden lg:flex items-center gap-1 text-[12px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  {open24hCount} open 24h
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as SortOption)}
                className="hidden sm:block px-2 py-1.5 text-[13px] font-medium bg-card border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              {/* View toggle */}
              <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card shadow-sm">
                {(["grid", "list"] as const).map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-label={`${v} view`}
                    className={cn(
                      "px-2.5 py-1.5 transition-all duration-200",
                      i > 0 && "border-l border-border/60",
                      view === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    {v === "grid" ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex-1">
            {isLoading ? (
              <div className={cn(
                view === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
                  : "flex flex-col gap-1.5",
              )}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <PharmacyCardSkeleton key={i} />
                ))}
              </div>
            ) : pharmacies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Pill className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {searchQ ? `No pharmacies found for "${searchQ}"` : "No pharmacies match your filters"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {searchQ ? "Try a different name or city." : "Try widening your search criteria"}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="text-xs text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {pharmacies.map((ph) => (
                  <PharmacyGridCard key={ph.id} pharmacy={ph} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {pharmacies.map((ph) => (
                  <PharmacyListItem key={ph.id} pharmacy={ph} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {paginationMeta && !nearbyCoords && (
            <PaginationV2
              currentPage={currentPage}
              lastPage={lastPage}
              total={totalPharmacies}
              perPage={perPage}
              itemLabel="pharmacies"
              onPageChange={handlePageChange}
            />
          )}
        </main>
      </div>
    </DashboardLayout>
  );
};

export default PatientPharmacy;
