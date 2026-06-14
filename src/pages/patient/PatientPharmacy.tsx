import { useMemo, useState, useCallback } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useSearchPharmacies,
  useNearbyPharmacies,
  parseDeliveryMins,
  type Pharmacy,
} from "@/hooks/patient/use-patient-search-pharmacy";
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
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const PatientPharmacy = () => {
  const { t } = useTranslation();

  // Search
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  // Location filters
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity]         = useState<string>("");

  const availableCities = selectedProvince
    ? RWANDA_REGIONS.filter((r) => r.province === selectedProvince).map((r) => r.city)
    : RWANDA_REGIONS.map((r) => r.city);

  // Boolean filters
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [offersPickup,   setOffersPickup]   = useState(false);
  const [isOpen24h,      setIsOpen24h]      = useState(false);
  const [openNow,        setOpenNow]        = useState(false);

  // Nearby
  const [nearbyCoords, setNearbyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading,   setLocLoading]   = useState(false);

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

  // ── Data fetching ──────────────────────────────────────────────────────────
  // All filtering — including search — goes through useSearchPharmacies.
  // q param is sent only when user has typed ≥2 chars.

  const searchQ = debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined;

  const { data: pharmaciesResp, isLoading: loadingPharmacies } = useSearchPharmacies({
    q:               searchQ,
    per_page:        50,
    province:        selectedProvince || undefined,
    city:            selectedCity     || undefined,
    offers_delivery: offersDelivery   || undefined,
    offers_pickup:   offersPickup     || undefined,
    is_open_24h:     isOpen24h        || undefined,
    open_now:        openNow          || undefined,
  });

  const { data: nearbyResp, isLoading: loadingNearby } = useNearbyPharmacies({
    lat:      nearbyCoords?.lat ?? 0,
    lng:      nearbyCoords?.lng ?? 0,
    per_page: 50,
    enabled:  !!nearbyCoords,
  });

  // When nearby is active, filter the nearby results locally by the search query
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

  const pharmacies: Pharmacy[] = nearbyCoords ? nearbyPharmacies : (pharmaciesResp?.data ?? []);
  const isLoading               = nearbyCoords ? loadingNearby   : loadingPharmacies;

  const hasActiveFilters =
    !!nearbyCoords || !!selectedProvince || !!selectedCity ||
    offersDelivery || offersPickup || isOpen24h || openNow;

  // ── Filter panel ───────────────────────────────────────────────────────────

  const filtersPanel = (
    <div className="space-y-5">
      <FilterSection label="Province">
        <Select
          value={selectedProvince || "all"}
          onValueChange={(v) => {
            const province = v === "all" ? "" : v;
            setSelectedProvince(province);
            setSelectedCity("");
            if (province) setNearbyCoords(null);
          }}
        >
          <SelectTrigger className="h-8 text-xs rounded-[5px]">
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

      <FilterSection label="City">
        <Select
          value={selectedCity || "all"}
          onValueChange={(v) => {
            const city = v === "all" ? "" : v;
            setSelectedCity(city);
            if (city) setNearbyCoords(null);
          }}
        >
          <SelectTrigger className="h-8 text-xs rounded-[5px]">
            <SelectValue placeholder={selectedProvince ? "Select city" : "All cities"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              {selectedProvince ? "All cities in province" : "All cities"}
            </SelectItem>
            {availableCities.map((city) => (
              <SelectItem key={city} value={city} className="text-xs">{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      <FilterSection label="Nearby">
        {nearbyCoords ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
              <Navigation className="h-3 w-3 shrink-0" />
              Using your location
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-[5px] text-muted-foreground hover:text-foreground"
              onClick={handleClearLocation}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs rounded-[5px] justify-start gap-2"
            onClick={handleUseMyLocation}
            disabled={locLoading}
          >
            {locLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Navigation className="h-3.5 w-3.5" />}
            {locLoading ? "Detecting location…" : "Use my location"}
          </Button>
        )}
      </FilterSection>

      <FilterSection label="Availability">
        <div className="space-y-2">
          {[
            { label: "Offers delivery", value: offersDelivery, set: setOffersDelivery },
            { label: "Offers pickup",   value: offersPickup,   set: setOffersPickup   },
            { label: "Open 24 h",       value: isOpen24h,      set: setIsOpen24h      },
            { label: "Open now",        value: openNow,        set: setOpenNow        },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer select-none group">
              <Checkbox
                checked={value}
                onCheckedChange={(v) => set(!!v)}
                className="rounded-[3px] h-3.5 w-3.5"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <DashboardLayout role="patient">
      <PageHeader
        title={t("pages.patient.pharmacy_title")}
        subtitle={t("pages.patient.pharmacy_sub")}
        actions={<PharmacyCart variant="trigger" />}
      />

      <div className="p-6 grid lg:grid-cols-[220px_1fr] gap-6">
        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="rounded-[5px] border border-border bg-card p-4 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Filters
              </span>
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {filtersPanel}
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">

          {/* Search bar */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pharmacies by name, address or city…"
                className="pl-8 h-9 text-sm rounded-[5px]"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Mobile filter trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden h-9 rounded-[5px] text-xs gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {[nearbyCoords, selectedProvince, selectedCity, offersDelivery, offersPickup, isOpen24h, openNow].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle className="text-sm">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-5">{filtersPanel}</div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5">
              {nearbyCoords && <FilterChip label="Near me" onRemove={handleClearLocation} />}
              {selectedProvince && (
                <FilterChip label={selectedProvince} onRemove={() => { setSelectedProvince(""); setSelectedCity(""); }} />
              )}
              {selectedCity     && <FilterChip label={selectedCity}   onRemove={() => setSelectedCity("")}       />}
              {offersDelivery   && <FilterChip label="Delivery"       onRemove={() => setOffersDelivery(false)}  />}
              {offersPickup     && <FilterChip label="Pickup"         onRemove={() => setOffersPickup(false)}    />}
              {isOpen24h        && <FilterChip label="24 h"           onRemove={() => setIsOpen24h(false)}       />}
              {openNow          && <FilterChip label="Open now"       onRemove={() => setOpenNow(false)}         />}
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {isLoading
                ? "Searching…"
                : `${pharmacies.length} pharmac${pharmacies.length === 1 ? "y" : "ies"} found${searchQ ? ` for "${searchQ}"` : ""}`}
            </p>
            {searchQ && !isLoading && pharmacies.length === 0 && (
              <button
                onClick={() => setQuery("")}
                className="text-[11px] text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>

          {/* Skeletons */}
          {isLoading && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <PharmacySkeleton key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && pharmacies.length === 0 && (
            <EmptyState
              icon={<MapPin className="h-8 w-8" />}
              message={
                searchQ
                  ? `No pharmacies found for "${searchQ}". Try a different name or city.`
                  : "No pharmacies match your filters."
              }
            />
          )}

          {/* Pharmacy grid */}
          {!isLoading && pharmacies.length > 0 && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {pharmacies.map((ph) => <PharmacyCard key={ph.id} pharmacy={ph} />)}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── Filter chip ──────────────────────────────────────────────────────────────

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-primary/10 border border-primary/20 text-[11px] text-primary font-medium">
    {label}
    <button onClick={onRemove} className="ml-0.5 hover:text-primary/60 transition-colors">
      <X className="h-2.5 w-2.5" />
    </button>
  </span>
);

// ─── Pharmacy Card ────────────────────────────────────────────────────────────

const PharmacyCard = ({ pharmacy: ph }: { pharmacy: Pharmacy }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);
  const todayName  = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === todayName);
  const isClosedToday = todayHours?.is_closed ?? true;

  return (
    <>
      <div className="rounded-[5px] border border-border bg-card p-4 shadow-soft hover:shadow-medium hover:border-primary/20 transition-all duration-150 flex flex-col group">
        <div className="flex items-start gap-2.5">
          <div className="h-11 w-11 rounded-[5px] bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-primary/10">
            {ph.logo
              ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
              : <Pill className="h-5 w-5 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold truncate">{ph.name}</span>
              {ph.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">{ph.address}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ph.offers_delivery && (
                <Badge className="rounded-[3px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] px-1.5 py-0 h-4">
                  <Truck className="h-2 w-2 mr-1" /> Delivery
                </Badge>
              )}
              {ph.offers_pickup && (
                <Badge variant="secondary" className="rounded-[3px] text-[10px] px-1.5 py-0 h-4">Pickup</Badge>
              )}
              {ph.is_open_24h && (
                <Badge className="rounded-[3px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[10px] px-1.5 py-0 h-4">24h</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
            {ph.city}, {ph.province}
            {ph.distance_km != null && (
              <span className="ml-auto text-[10px] font-semibold text-primary">{ph.distance_km.toFixed(1)} km</span>
            )}
          </div>
          {deliveryMins != null && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Truck className="h-3 w-3 shrink-0 text-primary/60" />
              ~{deliveryMins} min delivery
            </div>
          )}
          {todayHours && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0 text-primary/60" />
              {isClosedToday
                ? <span className="text-destructive font-medium">Closed today</span>
                : `${todayHours.open_time?.slice(0, 5)} – ${todayHours.close_time?.slice(0, 5)}`}
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
          {ph.delivery_fee && ph.offers_delivery ? (
            <div className="text-[11px] text-muted-foreground">
              Fee: <span className="font-medium text-foreground">{ph.delivery_fee} {ph.delivery_currency}</span>
            </div>
          ) : <div />}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] rounded-[5px] px-2.5 shrink-0 group-hover:border-primary/40 group-hover:text-primary transition-colors"
            onClick={() => setDrawerOpen(true)}
          >
            View medicines
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      <PharmacyDrawer pharmacy={ph} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

const PharmacySkeleton = () => (
  <div className="rounded-[5px] border border-border bg-card p-4 space-y-3">
    <div className="flex items-start gap-2.5">
      <Skeleton className="h-11 w-11 rounded-[5px] shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
        <Skeleton className="h-4 w-1/3 rounded-[3px]" />
      </div>
    </div>
    <div className="space-y-1.5">
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-3/4" />
    </div>
    <div className="flex items-center justify-between pt-1">
      <Skeleton className="h-2.5 w-1/3" />
      <Skeleton className="h-7 w-24 rounded-[5px]" />
    </div>
  </div>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="rounded-[5px] border border-dashed border-border p-14 text-center">
    <div className="flex justify-center text-muted-foreground/40 mb-3">{icon}</div>
    <p className="text-xs text-muted-foreground">{message}</p>
  </div>
);

// ─── FilterSection ────────────────────────────────────────────────────────────

const FilterSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</p>
    {children}
  </div>
);

export default PatientPharmacy;
