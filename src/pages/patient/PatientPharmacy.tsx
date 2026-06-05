import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
  useSearchMedicines,
  useSearchPharmacies,
  parseDeliveryMins,
  type Medicine,
  type Pharmacy,
} from "@/hooks/patient/use-patient-search-pharmacy";
import {
  addToCart,
  removeFromCart,
  clearCart,
  useCart,
} from "@/lib/marketplace-store";
import {
  Search,
  ShoppingCart,
  Star,
  MapPin,
  Truck,
  ShieldCheck,
  X,
  SlidersHorizontal,
  Pill,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { PharmacyDrawer } from "./components/Pharmacydrawer";
// import { PharmacyDrawer } from "@/components/patient/PharmacyDrawer";

type Sort = "relevance" | "price-asc" | "price-desc" | "rating";
type PrescriptionFilter = "all" | "otc" | "rx";

// ─── Main Page ────────────────────────────────────────────────────────────────

const PatientPharmacy = () => {
  const { t } = useTranslation();
  const cart = useCart();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  const [city, setCity] = useState("");
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [offersPickup, setOffersPickup] = useState(false);
  const [isOpen24h, setIsOpen24h] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [prescriptionFilter, setPrescriptionFilter] = useState<PrescriptionFilter>("all");
  const [sort, setSort] = useState<Sort>("relevance");

  // Pharmacies — always loaded, drives browse mode + city dropdown
  const { data: pharmaciesResp, isLoading: loadingPharmacies } = useSearchPharmacies({
    per_page: 50,
    city: city || undefined,
    offers_delivery: offersDelivery || undefined,
    offers_pickup: offersPickup || undefined,
    is_open_24h: isOpen24h || undefined,
  });
  const pharmacies: Pharmacy[] = pharmaciesResp?.data ?? [];

  // Unfiltered city list
  const { data: allPharmaciesResp } = useSearchPharmacies({ per_page: 50 });
  const cities = useMemo(
    () => Array.from(new Set((allPharmaciesResp?.data ?? []).map((p) => p.city))).sort(),
    [allPharmaciesResp],
  );

  // Medicines — only when query ≥ 2 chars
  const searchActive = debouncedQuery.trim().length >= 2;
  const {
    data: medicines = [],
    isLoading: loadingMedicines,
    isFetching: fetchingMedicines,
  } = useSearchMedicines({ q: debouncedQuery });

  const allowedSlugs = useMemo(() => {
    if (!offersDelivery && !offersPickup && !isOpen24h) return null;
    return new Set(
      pharmacies
        .filter((p) => {
          if (offersDelivery && !p.offers_delivery) return false;
          if (offersPickup && !p.offers_pickup) return false;
          if (isOpen24h && !p.is_open_24h) return false;
          return true;
        })
        .map((p) => p.slug),
    );
  }, [pharmacies, offersDelivery, offersPickup, isOpen24h]);

  const filteredMedicines = useMemo(() => {
    let list = medicines.slice();
    if (city) list = list.filter((m) => m.pharmacy.city === city);
    if (allowedSlugs) list = list.filter((m) => allowedSlugs.has(m.pharmacy.slug));
    list = list.filter((m) => m.price >= priceRange[0] && m.price <= priceRange[1]);
    if (prescriptionFilter === "otc") list = list.filter((m) => !m.prescription_required);
    if (prescriptionFilter === "rx") list = list.filter((m) => m.prescription_required);
    switch (sort) {
      case "price-asc":  list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "rating":     list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
    }
    return list;
  }, [medicines, city, allowedSlugs, priceRange, prescriptionFilter, sort]);

  const cartTotal = cart.reduce((sum, c) => {
    const med = medicines.find((m) => String(m.id) === c.productId);
    return sum + (med ? med.price * c.qty : 0);
  }, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const isLoadingMeds = loadingMedicines || fetchingMedicines;

  const filtersPanel = (
    <div className="space-y-6">
      <FilterBlock label={t("pages.patient.location")}>
        <Select value={city || "all"} onValueChange={(v) => setCity(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("pages.patient.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("pages.patient.all")}</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBlock>

      {searchActive && (
        <FilterBlock label={t("pages.patient.price", { min: priceRange[0], max: priceRange[1] })}>
          <Slider
            value={priceRange}
            onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
            min={0} max={500} step={5}
          />
        </FilterBlock>
      )}

      {searchActive && (
        <FilterBlock label={t("pages.patient.prescription", { defaultValue: "Prescription" })}>
          <Select
            value={prescriptionFilter}
            onValueChange={(v) => setPrescriptionFilter(v as PrescriptionFilter)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("pages.patient.all")}</SelectItem>
              <SelectItem value="otc">{t("pages.patient.otc_only", { defaultValue: "OTC only" })}</SelectItem>
              <SelectItem value="rx">{t("pages.patient.rx_only", { defaultValue: "Rx only" })}</SelectItem>
            </SelectContent>
          </Select>
        </FilterBlock>
      )}

      <div className="space-y-2.5">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={offersDelivery} onCheckedChange={(v) => setOffersDelivery(!!v)} />
          {t("pages.patient.offers_delivery", { defaultValue: "Offers delivery" })}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={offersPickup} onCheckedChange={(v) => setOffersPickup(!!v)} />
          {t("pages.patient.offers_pickup", { defaultValue: "Offers pickup" })}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={isOpen24h} onCheckedChange={(v) => setIsOpen24h(!!v)} />
          {t("pages.patient.open_24h", { defaultValue: "Open 24 h" })}
        </label>
      </div>
    </div>
  );

  return (
    <DashboardLayout role="patient">
      <PageHeader
        title={t("pages.patient.pharmacy_title")}
        subtitle={t("pages.patient.pharmacy_sub")}
        actions={
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t("pages.patient.cart")}
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{t("pages.patient.your_cart")}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                {cart.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("pages.patient.cart_empty")}</p>
                )}
                {cart.map((c) => {
                  const med = medicines.find((m) => String(m.id) === c.productId);
                  if (!med) return null;
                  return (
                    <div key={c.productId} className="flex items-center gap-3 p-3 rounded-sm border border-border">
                      <div className="h-10 w-10 rounded-sm bg-primary-soft flex items-center justify-center shrink-0">
                        <Pill className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{med.name}</div>
                        <div className="text-xs text-muted-foreground">${med.price.toFixed(2)} × {c.qty}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeFromCart(c.productId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {cart.length > 0 && (
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between font-display">
                      <span>{t("pages.patient.total")}</span>
                      <span className="font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
                    </div>
                    <Button
                      className="w-full bg-gradient-primary hover:opacity-90"
                      onClick={() => { toast.success(t("pages.patient.order_placed")); clearCart(); }}
                    >
                      {t("pages.patient.checkout")}
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="p-8 grid lg:grid-cols-[260px_1fr] gap-8">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="rounded-md border border-border bg-card p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("pages.patient.filters")}</h3>
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            {filtersPanel}
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("pages.patient.search_meds")}
                className="pl-9"
              />
            </div>
            {searchActive && (
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t("pages.patient.sort_relevance")}</SelectItem>
                  <SelectItem value="price-asc">{t("pages.patient.sort_price_asc")}</SelectItem>
                  <SelectItem value="price-desc">{t("pages.patient.sort_price_desc")}</SelectItem>
                  <SelectItem value="rating">{t("pages.patient.sort_rating")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  {t("pages.patient.filters")}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader><SheetTitle>{t("pages.patient.filters")}</SheetTitle></SheetHeader>
                <div className="mt-6">{filtersPanel}</div>
              </SheetContent>
            </Sheet>
          </div>

          {/* ── MODE A: Browse pharmacies ─────────────────────────── */}
          {!searchActive && (
            <>
              <p className="text-xs text-muted-foreground">
                {t("pages.patient.pharmacies_count", {
                  count: pharmacies.length,
                  defaultValue: `${pharmacies.length} pharmacies found`,
                })}
              </p>

              {loadingPharmacies && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-border bg-card p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-14 w-14 rounded-sm shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-8 w-full mt-2" />
                    </div>
                  ))}
                </div>
              )}

              {!loadingPharmacies && pharmacies.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-16 text-center">
                  <MapPin className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t("pages.patient.no_pharmacies", { defaultValue: "No pharmacies match your filters." })}
                  </p>
                </div>
              )}

              {!loadingPharmacies && pharmacies.length > 0 && (
                <>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pharmacies.map((ph) => (
                      <PharmacyCard key={ph.id} pharmacy={ph} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    {t("pages.patient.search_hint", {
                      defaultValue: "Search above to find specific medicines across all pharmacies",
                    })}
                  </p>
                </>
              )}
            </>
          )}

          {/* ── MODE B: Medicine search results ──────────────────── */}
          {searchActive && (
            <>
              {!isLoadingMeds && (
                <p className="text-xs text-muted-foreground">
                  {t("pages.patient.products_count", { count: filteredMedicines.length, vendors: pharmacies.length })}
                </p>
              )}
              {isLoadingMeds && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-border bg-card p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-14 w-14 rounded-sm shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isLoadingMeds && filteredMedicines.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-16 text-center">
                  <Pill className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">{t("pages.patient.no_products")}</p>
                </div>
              )}
              {!isLoadingMeds && filteredMedicines.length > 0 && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredMedicines.map((med) => (
                    <MedicineCard
                      key={med.id}
                      medicine={med}
                      onAdd={() => {
                        addToCart(String(med.id));
                        toast.success(t("pages.patient.added_to_cart", { name: med.name }));
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// ─── Pharmacy Card ────────────────────────────────────────────────────────────

const PharmacyCard = ({ pharmacy: ph }: { pharmacy: Pharmacy }) => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);

  const todayName = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === todayName);
  const isClosedToday = todayHours?.is_closed ?? true;

  return (
    <>
      <div className="rounded-md border border-border bg-card p-5 shadow-soft hover:shadow-medium transition-smooth flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-sm bg-primary-soft flex items-center justify-center shrink-0 overflow-hidden">
            {ph.logo
              ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
              : <Pill className="h-7 w-7 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold truncate">{ph.name}</span>
              {ph.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <div className="text-xs text-muted-foreground truncate">{ph.address}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ph.offers_delivery && (
                <Badge className="bg-success/10 text-success hover:bg-success/10 border-success/20 text-[10px]">
                  <Truck className="h-2.5 w-2.5 mr-1" />Delivery
                </Badge>
              )}
              {ph.offers_pickup && (
                <Badge variant="secondary" className="text-[10px]">Pickup</Badge>
              )}
              {ph.is_open_24h && (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[10px]">24h</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-4 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {ph.city}, {ph.province}
          </div>
          {deliveryMins != null && (
            <div className="flex items-center gap-1.5">
              <Truck className="h-3 w-3 shrink-0" />
              {t("pages.patient.delivery_mins", { mins: deliveryMins })}
            </div>
          )}
          {ph.phone && (
            <div className="flex items-center gap-1.5">
              <X className="h-3 w-3 shrink-0 hidden" />{ph.phone}
            </div>
          )}
          {todayHours && (
            <div className="flex items-center gap-1.5">
              {isClosedToday
                ? t("pages.patient.closed_today", { defaultValue: "Closed today" })
                : `${todayHours.open_time?.slice(0, 5)} – ${todayHours.close_time?.slice(0, 5)}`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
          {ph.delivery_fee && ph.offers_delivery ? (
            <div className="text-xs text-muted-foreground">
              {t("pages.patient.delivery_fee", { defaultValue: "Delivery fee" })}:{" "}
              <span className="font-medium text-foreground">{ph.delivery_fee} {ph.delivery_currency}</span>
            </div>
          ) : <div />}

          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setDrawerOpen(true)}
          >
            {t("pages.patient.view_details", { defaultValue: "View Details" })}
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* ✅ Drawer is always mounted (Sheet requires it) but queries inside are
           gated on `open` so nothing fires until the user clicks View Details */}
      <PharmacyDrawer
        pharmacy={ph}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
};

// ─── Medicine Card ────────────────────────────────────────────────────────────

const MedicineCard = ({
  medicine: m,
  onAdd,
}: {
  medicine: Medicine;
  onAdd: () => void;
}) => {
  const { t } = useTranslation();
  const out = m.stock === 0;
  const deliveryMins = parseDeliveryMins(m.pharmacy.estimated_delivery_minutes);

  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-soft hover:shadow-medium transition-smooth flex flex-col">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-sm bg-primary-soft flex items-center justify-center shrink-0">
          <Pill className="h-7 w-7 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{m.name}</div>
          <div className="text-xs text-muted-foreground">
            {[m.brand, m.category].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            {m.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {m.rating.toFixed(1)}
              </span>
            )}
            {m.prescription_required ? (
              <Badge variant="secondary" className="text-[10px]">
                <ShieldCheck className="h-3 w-3 mr-1" />Rx
              </Badge>
            ) : (
              <Badge className="bg-success/10 text-success hover:bg-success/10 border-success/20 text-[10px]">OTC</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3" />{m.pharmacy.name} · {m.pharmacy.city}
        </div>
        {deliveryMins != null && (
          <div className="flex items-center gap-1.5">
            <Truck className="h-3 w-3" />
            {t("pages.patient.delivery_mins", { mins: deliveryMins })}
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div>
          <div className="font-display text-xl font-bold tabular-nums">${m.price.toFixed(2)}</div>
          <div className={`text-[10px] uppercase tracking-wider font-medium ${
            out ? "text-destructive" : m.stock < 30 ? "text-warning" : "text-success"
          }`}>
            {out
              ? t("pages.patient.out_of_stock")
              : m.stock < 30
                ? t("pages.patient.low_stock", { count: m.stock })
                : t("pages.patient.in_stock")}
          </div>
        </div>
        <Button size="sm" disabled={out} onClick={onAdd} className="bg-gradient-primary hover:opacity-90">
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          {t("pages.patient.add")}
        </Button>
      </div>
    </div>
  );
};

// ─── FilterBlock ──────────────────────────────────────────────────────────────

const FilterBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);

export default PatientPharmacy;
