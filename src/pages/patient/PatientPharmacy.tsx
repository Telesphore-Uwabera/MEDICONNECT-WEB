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

// ─── Rwanda regions ───────────────────────────────────────────────────────────

const RWANDA_REGIONS = [
  { province: "Kigali City",      city: "Kigali"    },
  { province: "Eastern Province", city: "Rwamagana" },
  { province: "Northern Province",city: "Musanze"   },
  { province: "Southern Province",city: "Nyanza"    },
  { province: "Western Province", city: "Karongi"   },
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
              "px-2.5 py-1.5 rounded-sm text-xs border transition-all duration-200 text-left flex items-center gap-1.5",
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
        "px-2.5 py-1.5 rounded-sm text-xs border transition-all duration-200 text-left flex items-center gap-1.5 w-full",
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

// ─── Pharmacy Grid Card (Hospital-style) ─────────────────────────────────────

function PharmacyGridCard({ pharmacy: ph }: { pharmacy: Pharmacy }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);
  const todayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === todayName);
  const isClosedToday = todayHours?.is_closed ?? true;

  return (
    <>
      <div className="bg-card border border-border/70 rounded-sm p-3 flex flex-col gap-2.5 hover:border-primary/30 hover:shadow-md transition-all duration-200">
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10 overflow-hidden">
            {ph.logo
              ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
              : <Pill className="w-4.5 h-4.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                {ph.name}
              </h3>
              {ph.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground/70">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{ph.city}</span>
              {ph.address && <span className="truncate">· {ph.address}</span>}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {ph.offers_delivery && (
            <span className="flex items-center gap-0.5 px-1.5 py-px text-xs font-semibold rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
              <Truck className="w-4 h-4" />
              Delivery
            </span>
          )}
          {ph.offers_pickup && (
            <span className="px-1.5 py-px text-xs font-semibold rounded-sm bg-secondary/60 text-muted-foreground border border-border/40">
              Pickup
            </span>
          )}
          {ph.is_open_24h && (
            <span className="flex items-center gap-0.5 px-1.5 py-px text-xs font-semibold rounded-sm bg-primary/10 text-primary border border-primary/20">
              <Clock className="w-4 h-4" />
              24h
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <MapPin className="w-4 h-4 flex-shrink-0 text-primary/60" />
            {ph.city}, {ph.province}
            {ph.distance_km != null && (
              <span className="ml-auto text-xs font-semibold text-primary">{ph.distance_km.toFixed(1)} km</span>
            )}
          </div>
          {deliveryMins != null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Truck className="w-4 h-4 flex-shrink-0 text-primary/60" />
              ~{deliveryMins} min delivery
            </div>
          )}
          {todayHours && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Clock className="w-4 h-4 flex-shrink-0 text-primary/60" />
              {isClosedToday
                ? <span className="text-destructive font-medium">Closed today</span>
                : `${todayHours.open_time?.slice(0, 5)} – ${todayHours.close_time?.slice(0, 5)}`}
            </div>
          )}
        </div>

        {/* Stats + CTA */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
          {ph.delivery_fee && ph.offers_delivery ? (
            <div className="text-xs text-muted-foreground/70">
              Fee: <span className="font-semibold text-foreground">{ph.delivery_fee} {ph.delivery_currency}</span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/40">No delivery</div>
          )}
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-2.5 py-1 rounded-sm text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-95 shadow-sm"
          >
            View medicines
          </button>
        </div>
      </div>

      <PharmacyDrawer pharmacy={ph} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

// ─── Pharmacy List Item ──────────────────────────────────────────────────────

function PharmacyListItem({ pharmacy: ph }: { pharmacy: Pharmacy }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);
  const todayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === todayName);
  const isClosedToday = todayHours?.is_closed ?? true;

  return (
    <>
      <div className="bg-card border border-border/70 rounded-sm p-3 flex items-center gap-3 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => setDrawerOpen(true)}>
        <div className="w-10 h-10 rounded-sm bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/10 overflow-hidden">
          {ph.logo
            ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
            : <Pill className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-xs font-semibold text-foreground truncate">{ph.name}</h3>
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
              <span className="px-1.5 py-px text-xs font-semibold rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
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
    <div className="bg-card border border-border/50 rounded-sm p-3 flex flex-col gap-2.5 animate-pulse">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-sm bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded-sm w-3/4" />
          <div className="h-2.5 bg-muted/70 rounded-sm w-1/2" />
        </div>
      </div>
      <div className="flex gap-1">
        <div className="h-4 bg-muted rounded-sm w-16" />
        <div className="h-4 bg-muted/70 rounded-sm w-14" />
      </div>
      <div className="space-y-1">
        <div className="h-2.5 bg-muted/60 rounded-sm w-full" />
        <div className="h-2.5 bg-muted/50 rounded-sm w-3/4" />
      </div>
      <div className="flex justify-between pt-1.5 border-t border-border/40">
        <div className="h-3 bg-muted rounded-sm w-20" />
        <div className="h-6 bg-muted/80 rounded-sm w-24" />
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
          className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-sm border text-xs font-medium transition-all",
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
          className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
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
    q:               searchQ,
    per_page:        50,
    page:            page,
    province:        filters.province || undefined,
    city:            filters.city     || undefined,
    offers_delivery: filters.offers_delivery || undefined,
    offers_pickup:   filters.offers_pickup   || undefined,
    is_open_24h:     filters.is_open_24h        || undefined,
    open_now:        filters.open_now          || undefined,
  });

  const { data: nearbyResp, isLoading: loadingNearby } = useNearbyPharmacies({
    lat:      nearbyCoords?.lat ?? 0,
    lng:      nearbyCoords?.lng ?? 0,
    per_page: 50,
    enabled:  !!nearbyCoords,
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
  const lastPage = pharmaciesResp?.last_page ?? (pharmaciesResp ? Math.ceil(pharmaciesResp.total / pharmaciesResp.per_page) : 1);

  // ── Sidebar content ─────────────────────────────────────────────────────────
  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            <X className="w-4 h-4" />
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        {/* Search */}
        <FilterSection title="Search">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              placeholder="Name, city, or address…"
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              className="w-full pl-7 pr-7 py-1.5 text-xs bg-background border border-border/60 rounded-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
            {filters.q && (
              <button
                onClick={() => set("q", "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </FilterSection>

        {/* Province */}
        <FilterSection title="Province">
          <Select
            value={filters.province || "all"}
            onValueChange={(v) => {
              const province = v === "all" ? "" : v;
              set("province", province);
              set("city", "");
              if (province) setNearbyCoords(null);
            }}
          >
            <SelectTrigger className="h-8 text-xs rounded-sm border-border/60">
              <SelectValue placeholder="All provinces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All provinces</SelectItem>
              {RWANDA_REGIONS.map((r) => (
                <SelectItem key={r.province} value={r.province} className="text-xs">
                  {r.province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        {/* City */}
        <FilterSection title="City">
          <Select
            value={filters.city || "all"}
            onValueChange={(v) => {
              const city = v === "all" ? "" : v;
              set("city", city);
              if (city) setNearbyCoords(null);
            }}
          >
            <SelectTrigger className="h-8 text-xs rounded-sm border-border/60">
              <SelectValue placeholder={filters.province ? "Select city" : "All cities"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                {filters.province ? "All cities in province" : "All cities"}
              </SelectItem>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city} className="text-xs">{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        {/* Nearby */}
        <FilterSection title="Nearby">
          {nearbyCoords ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                <Navigation className="h-4 w-4 shrink-0" />
                Using your location
              </div>
              <button
                className="h-7 w-7 rounded-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleClearLocation}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <ToggleButton
              value={false}
              onChange={() => handleUseMyLocation()}
              label={locLoading ? "Detecting…" : "Use my location"}
              icon={locLoading ? Loader2 : Navigation}
            />
          )}
        </FilterSection>

        {/* Availability */}
        <FilterSection title="Availability">
          <div className="flex flex-col gap-1">
            <ToggleButton
              value={filters.offers_delivery}
              onChange={(v) => set("offers_delivery", v)}
              label="Offers delivery"
              icon={Truck}
            />
            <ToggleButton
              value={filters.offers_pickup}
              onChange={(v) => set("offers_pickup", v)}
              label="Offers pickup"
              icon={MapPin}
            />
            <ToggleButton
              value={filters.is_open_24h}
              onChange={(v) => set("is_open_24h", v)}
              label="Open 24h"
              icon={Clock}
            />
            <ToggleButton
              value={filters.open_now}
              onChange={(v) => set("open_now", v)}
              label="Open now"
              icon={Wifi}
            />
          </div>
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.pharmacy_title", "Pharmacy Marketplace")}
          subtitle={t("pages.patient.pharmacy_sub", "Order medicines and healthcare products from registered pharmacies")}
          actions={<PharmacyCart variant="trigger" />}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-52 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity duration-300 backdrop-blur-sm",
              filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile bottom drawer */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
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
                className="w-full py-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all duration-200 shadow-sm"
              >
                Show {pharmacies.length} {pharmacies.length === 1 ? "pharmacy" : "pharmacies"}
              </button>
            </div>
          </div>

          {/* ── Results ── */}
          <main className="flex-1 overflow-y-auto flex flex-col">

            {/* Meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  {isLoading ? (
                    <span className="inline-block w-24 h-3 bg-muted rounded-sm animate-pulse" />
                  ) : (
                    <>
                      <span className="font-bold text-foreground">{pharmacies.length}</span>{" "}
                      {pharmacies.length === 1 ? "pharmacy" : "pharmacies"} found
                      {searchQ && ` for "${searchQ}"`}
                      {hasActiveFilters && (
                        <button onClick={clearAll} className="ml-2 text-primary hover:text-primary/80 hover:underline text-xs font-medium transition-colors">
                          Reset
                        </button>
                      )}
                    </>
                  )}
                </p>

                {/* Live stats */}
                {!isLoading && deliveryCount > 0 && (
                  <span className="hidden lg:flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-sm">
                    <Truck className="w-4 h-4" />
                    {deliveryCount} with delivery
                  </span>
                )}
                {!isLoading && open24hCount > 0 && (
                  <span className="hidden lg:flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm">
                    <Clock className="w-4 h-4" />
                    {open24hCount} open 24h
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <select
                  value={filters.sort}
                  onChange={(e) => set("sort", e.target.value as SortOption)}
                  className="hidden sm:block px-2 py-1.5 text-xs bg-card border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-xs transition-all duration-200 font-medium",
                    hasActiveFilters
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />}
                </button>

                {/* View toggle */}
                <div className="flex rounded-sm border border-border/60 overflow-hidden bg-card shadow-sm">
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
                  <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
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
            {pharmaciesResp && lastPage > 1 && (
              <Pagination
                currentPage={pharmaciesResp.current_page}
                lastPage={lastPage}
                total={pharmaciesResp.total}
                perPage={pharmaciesResp.per_page}
                onPageChange={setPage}
              />
            )}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientPharmacy;
