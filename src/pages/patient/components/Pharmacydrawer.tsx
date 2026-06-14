import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  usePharmacyMedicines,
  parseDeliveryMins,
  type Medicine,
  type Pharmacy,
} from "@/hooks/patient/use-patient-search-pharmacy";
import {
  addToCart,
  updateCartQty,
  useCart,
  useCartCount,
} from "@/lib/marketplace-store";
import {
  Search, MapPin, Truck, Phone, Mail, Pill, BadgeCheck,
  ShieldCheck, CheckCircle2, XCircle, AlertCircle, Clock,
  Star, Plus, Minus, SlidersHorizontal, X, Eye, Package,
  Tag, FlaskConical, Layers,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { PharmacyCart } from "./PharmacyCart";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PharmacyDrawerProps {
  pharmacy: Pharmacy;
  open: boolean;
  onClose: () => void;
}

interface PharmacyMedicinesResponse {
  pharmacy?: { id: number; name: string; address?: string; city?: string; mode?: string };
  query: string | null;
  count: number;
  medicines: Medicine[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const TODAY = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
const CATEGORIES = ["All", "Antibiotics", "Antihypertensives", "Analgesics", "Vitamins", "Antidiabetics", "Other"];

// ─── StockBadge ───────────────────────────────────────────────────────────────

const StockBadge = ({ quantity, isAvailable }: { quantity: number; isAvailable: boolean }) => {
  if (!isAvailable || quantity === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full whitespace-nowrap">
        <XCircle className="h-3 w-3" /> Out of stock
      </span>
    );
  if (quantity < 30)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
        <AlertCircle className="h-3 w-3" /> {quantity} left
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
      <CheckCircle2 className="h-3 w-3" /> In stock
    </span>
  );
};

// ─── DetailRow ────────────────────────────────────────────────────────────────

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="rounded-[5px] bg-muted/50 border border-border/60 px-3 py-2.5">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-primary/60">{icon}</span>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
    <div className="text-xs font-semibold text-foreground">{value}</div>
  </div>
);

// ─── MedicineModal ────────────────────────────────────────────────────────────

interface MedicineModalProps {
  medicine: Medicine | null;
  open: boolean;
  onClose: () => void;
  cartQty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}

const MedicineModal = ({ medicine: med, open, onClose, cartQty, onAdd, onInc, onDec }: MedicineModalProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!med) return null;

  const outOfStock = !med.is_available || med.quantity === 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-200
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[420px] max-w-[90vw] bg-card border border-border shadow-2xl
          transition-all duration-200 rounded-[5px]
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        {/* Modal header */}
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className="h-12 w-12 rounded-[5px] bg-primary/10 flex items-center justify-center shrink-0">
            <Pill className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{med.name}</h3>
            {med.generic_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{med.generic_name}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {med.requires_prescription ? (
                <Badge variant="secondary" className="rounded-[3px] text-[10px] px-2 py-0.5 h-auto gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" /> Prescription Required
                </Badge>
              ) : (
                <Badge className="rounded-[3px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] px-2 py-0.5 h-auto">
                  Over The Counter
                </Badge>
              )}
              {med.rating != null && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {med.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-[5px] flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Details grid */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={med.category ?? "—"} />
            <DetailRow icon={<FlaskConical className="h-3.5 w-3.5" />} label="Generic Name" value={med.generic_name ?? "—"} />
            <DetailRow icon={<Layers className="h-3.5 w-3.5" />} label="Unit" value={med.unit ?? "—"} />
            <DetailRow
              icon={<Package className="h-3.5 w-3.5" />}
              label="Availability"
              value={<StockBadge quantity={med.quantity} isAvailable={med.is_available} />}
            />
            <DetailRow
              icon={<Package className="h-3.5 w-3.5" />}
              label="Stock Qty"
              value={med.quantity.toLocaleString()}
            />
            {med.source && (
              <DetailRow icon={<Package className="h-3.5 w-3.5" />} label="Source" value={med.source} />
            )}
          </div>

          {/* Price banner */}
          <div className="rounded-[5px] bg-primary/5 border border-primary/15 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Unit Price</p>
              <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">
                {parseFloat(med.price).toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">{med.currency ?? "RWF"}</span>
              </p>
              {med.unit && <p className="text-[10px] text-muted-foreground">per {med.unit}</p>}
            </div>
            {outOfStock ? (
              <div className="h-9 px-4 flex items-center justify-center rounded-[5px] bg-muted text-xs text-muted-foreground font-medium">
                Unavailable
              </div>
            ) : cartQty === 0 ? (
              <Button
                size="sm"
                onClick={onAdd}
                className="h-9 text-xs rounded-[5px] px-4 bg-gradient-primary hover:opacity-90 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add to Cart
              </Button>
            ) : (
              <div className="flex items-center gap-2 h-9 rounded-[5px] border border-primary/30 bg-primary/5 px-2">
                <button onClick={onDec} className="h-6 w-6 rounded-[3px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-sm font-bold tabular-nums text-primary w-5 text-center">{cartQty}</span>
                <button onClick={onInc} className="h-6 w-6 rounded-[3px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── PharmacyDrawer ───────────────────────────────────────────────────────────

export const PharmacyDrawer = ({ pharmacy: ph, open, onClose }: PharmacyDrawerProps) => {
  const [medSearch, setMedSearch] = useState("");
  const debouncedMedSearch = useDebounce(medSearch, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyOTC, setOnlyOTC] = useState(false);
  const [onlyRx, setOnlyRx] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cartItems = useCart();
  const cartCount = useCartCount();

  const { data: rawData, isLoading } = usePharmacyMedicines({
    pharmacySlug: ph.slug,
    q: debouncedMedSearch || undefined,
    enabled: open,
  });

  const medicines: Medicine[] = Array.isArray(rawData)
    ? (rawData as Medicine[])
    : ((rawData as unknown as PharmacyMedicinesResponse)?.medicines ?? []);

  const filtered = useMemo(() => {
    let list = medicines;
    if (selectedCategory !== "All") list = list.filter((m) => m.category === selectedCategory);
    if (onlyInStock) list = list.filter((m) => m.is_available && m.quantity > 0);
    if (onlyOTC) list = list.filter((m) => !m.requires_prescription);
    if (onlyRx) list = list.filter((m) => m.requires_prescription);
    return list;
  }, [medicines, selectedCategory, onlyInStock, onlyOTC, onlyRx]);

  const activeFilters =
    (selectedCategory !== "All" ? 1 : 0) +
    (onlyInStock ? 1 : 0) +
    (onlyOTC ? 1 : 0) +
    (onlyRx ? 1 : 0);

  const resetAndClose = () => {
    setMedSearch("");
    setSelectedCategory("All");
    setOnlyInStock(false);
    setOnlyOTC(false);
    setOnlyRx(false);
    setModalOpen(false);
    setSelectedMed(null);
    onClose();
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === TODAY);
  const isClosedToday = todayHours?.is_closed ?? true;
  const isOpenNow = ph.is_open_24h || (!isClosedToday && !!todayHours);

  const openModal = (med: Medicine) => { setSelectedMed(med); setModalOpen(true); };
  const modalCartItem = cartItems.find((c) => c.productId === String(selectedMed?.id));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={resetAndClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[52vw] flex flex-col bg-background
          border-l border-border shadow-2xl transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-4 border-b border-border shrink-0 bg-card">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-[5px] bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-primary/20">
              {ph.logo
                ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
                : <Pill className="h-6 w-6 text-primary" />}
            </div>
            <div className="flex-1 min-w-0 pr-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold leading-tight text-foreground">{ph.name}</h2>
                {ph.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isOpenNow ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isOpenNow ? "bg-emerald-500" : "bg-destructive"}`} />
                  {ph.is_open_24h ? "Open 24h" : isClosedToday ? "Closed today" : "Open now"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{ph.address}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ph.offers_delivery && (
                  <Badge className="rounded-[5px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[10px] px-2 py-0.5 h-auto gap-1">
                    <Truck className="h-3 w-3" /> Delivery
                  </Badge>
                )}
                {ph.offers_pickup && (
                  <Badge variant="secondary" className="rounded-[5px] text-[10px] px-2 py-0.5 h-auto">Pickup</Badge>
                )}
                {ph.is_open_24h && (
                  <Badge className="rounded-[5px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[10px] px-2 py-0.5 h-auto">24h</Badge>
                )}
              </div>
            </div>
            <button
              onClick={resetAndClose}
              className="absolute right-5 top-5 h-8 w-8 rounded-[5px] flex items-center justify-center
                bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            <MetaItem icon={<MapPin className="h-3.5 w-3.5" />}>{ph.city}, {ph.province}</MetaItem>
            {ph.phone && <MetaItem icon={<Phone className="h-3.5 w-3.5" />}>{ph.phone}</MetaItem>}
            {ph.email && <MetaItem icon={<Mail className="h-3.5 w-3.5" />}>{ph.email}</MetaItem>}
            {deliveryMins != null && (
              <MetaItem icon={<Truck className="h-3.5 w-3.5" />}>~{deliveryMins} min delivery</MetaItem>
            )}
            {ph.delivery_fee && ph.offers_delivery && (
              <MetaItem icon={<Truck className="h-3.5 w-3.5" />}>
                Fee: {ph.delivery_fee} {ph.delivery_currency}
              </MetaItem>
            )}
            {todayHours && !isClosedToday && (
              <MetaItem icon={<Clock className="h-3.5 w-3.5" />}>
                Today: {todayHours.open_time?.slice(0, 5)} – {todayHours.close_time?.slice(0, 5)}
              </MetaItem>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border/60">
            <PharmacyCart variant="trigger" currency={ph.delivery_currency ?? "RWF"} />
          </div>
        </div>

        {/* ── Working hours ────────────────────────────────────────── */}
        {ph.working_hours?.length > 0 && (
          <div className="px-6 py-3 border-b border-border shrink-0 bg-muted/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Working Hours
            </p>
            <div className="grid grid-cols-4 gap-x-6 gap-y-1.5">
              {ph.working_hours.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[11px]">
                  <span className={`font-semibold w-7 ${h.day_of_week === TODAY ? "text-primary" : "text-muted-foreground"}`}>
                    {DAY_LABELS[h.day_of_week]}
                  </span>
                  {h.is_closed ? (
                    <span className="text-destructive text-[10px]">Closed</span>
                  ) : (
                    <span className="tabular-nums text-foreground text-[10px]">
                      {h.open_time?.slice(0, 5)}–{h.close_time?.slice(0, 5)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Medicine section ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 pb-3 shrink-0 space-y-3 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Medicine Availability
              </p>
              {!isLoading && filtered.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  placeholder="Search medicines…"
                  className="pl-9 h-9 text-sm rounded-[5px]"
                />
                {medSearch && (
                  <button
                    onClick={() => setMedSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                size="sm"
                variant={showFilters ? "default" : "outline"}
                className="h-9 rounded-[5px] text-xs px-3 gap-1.5 shrink-0"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilters > 0 && (
                  <span className="h-4 w-4 rounded-full bg-primary-foreground text-primary text-[9px] font-bold flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="rounded-[5px] border border-border bg-muted/40 p-3 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                          selectedCategory === cat
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {[
                    { label: "In stock only", value: onlyInStock, set: setOnlyInStock },
                    { label: "OTC only", value: onlyOTC, set: setOnlyOTC },
                    { label: "Prescription (Rx)", value: onlyRx, set: setOnlyRx },
                  ].map(({ label, value, set }) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox checked={value} onCheckedChange={(v) => set(!!v)} className="h-4 w-4 rounded-[3px]" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </label>
                  ))}
                </div>
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setSelectedCategory("All"); setOnlyInStock(false); setOnlyOTC(false); setOnlyRx(false); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scrollable medicine grid */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading && (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-[5px] border border-border space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-[5px] shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-2.5 w-full" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-7 w-20 rounded-[5px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-[5px] bg-muted flex items-center justify-center mb-3">
                  <Pill className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No medicines found</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  {medSearch || activeFilters > 0
                    ? "Try adjusting your search or filters."
                    : "No medicines listed for this pharmacy."}
                </p>
                {(medSearch || activeFilters > 0) && (
                  <button
                    onClick={() => { setMedSearch(""); setSelectedCategory("All"); setOnlyInStock(false); setOnlyOTC(false); setOnlyRx(false); }}
                    className="text-xs text-primary hover:underline mt-3"
                  >
                    Clear search & filters
                  </button>
                )}
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((med) => {
                  const cartItem = cartItems.find((c) => c.productId === String(med.id));
                  const outOfStock = !med.is_available || med.quantity === 0;
                  return (
                    <MedicineCard
                      key={med.id}
                      medicine={med}
                      cartQty={cartItem?.qty ?? 0}
                      outOfStock={outOfStock}
                      onView={() => openModal(med)}
                      onAdd={() => { addToCart(med); toast.success(`${med.name} added to cart`); }}
                      onInc={() => updateCartQty(String(med.id), (cartItem?.qty ?? 0) + 1)}
                      onDec={() => updateCartQty(String(med.id), (cartItem?.qty ?? 1) - 1)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky cart bar */}
          {cartCount > 0 && (
            <div className="px-6 py-3 border-t border-border bg-card shrink-0">
              <PharmacyCart variant="inline" currency={ph.delivery_currency ?? "RWF"} />
            </div>
          )}
        </div>
      </div>

      {/* Medicine detail modal */}
      <MedicineModal
        medicine={selectedMed}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedMed(null); }}
        cartQty={modalCartItem?.qty ?? 0}
        onAdd={() => { if (selectedMed) { addToCart(selectedMed); toast.success(`${selectedMed.name} added to cart`); } }}
        onInc={() => { if (selectedMed) updateCartQty(String(selectedMed.id), (modalCartItem?.qty ?? 0) + 1); }}
        onDec={() => { if (selectedMed) updateCartQty(String(selectedMed.id), (modalCartItem?.qty ?? 1) - 1); }}
      />
    </>
  );
};

// ─── MedicineCard ─────────────────────────────────────────────────────────────

interface MedicineCardProps {
  medicine: Medicine;
  cartQty: number;
  outOfStock: boolean;
  onView: () => void;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}

const MedicineCard = ({ medicine: med, cartQty, outOfStock, onView, onAdd, onInc, onDec }: MedicineCardProps) => (
  <div className={`flex flex-col rounded-[5px] border bg-card transition-all ${
    cartQty > 0
      ? "border-primary/40 shadow-sm"
      : "border-border hover:border-primary/30 hover:shadow-sm"
  }`}>
    {cartQty > 0 && (
      <div className="h-0.5 w-full bg-gradient-primary rounded-t-[5px]" />
    )}

    <div className="p-4 flex flex-col gap-3 flex-1">
      {/* Icon + name + view button */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-[5px] bg-primary/10 flex items-center justify-center shrink-0">
          <Pill className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold leading-tight text-foreground line-clamp-1">
            {med.name}
          </div>
          {med.generic_name && (
            <div className="text-[10px] text-muted-foreground truncate mt-0.5">{med.generic_name}</div>
          )}
          {med.category && (
            <div className="text-[10px] text-primary/70 font-medium mt-0.5">{med.category}</div>
          )}
        </div>
        <button
          onClick={onView}
          className="h-7 w-7 rounded-[5px] flex items-center justify-center bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors shrink-0"
          title="View details"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {med.requires_prescription ? (
          <Badge variant="secondary" className="rounded-[3px] text-[10px] px-1.5 py-0.5 h-auto gap-1">
            <ShieldCheck className="h-2.5 w-2.5" /> Rx
          </Badge>
        ) : (
          <Badge className="rounded-[3px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px] px-1.5 py-0.5 h-auto">
            OTC
          </Badge>
        )}
        {med.unit && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-[3px]">
            / {med.unit}
          </span>
        )}
        {med.rating != null && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {med.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Price + stock */}
      <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-border/50">
        <div>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {parseFloat(med.price).toLocaleString()}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">{med.currency ?? "RWF"}</span>
        </div>
        <StockBadge quantity={med.quantity} isAvailable={med.is_available} />
      </div>

      {/* Quantity — always show if present */}
      {med.quantity && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Package className="h-3 w-3" />
          <span>{med.quantity.toLocaleString()} units available</span>
        </div>
      )}

      {/* CTA */}
      {outOfStock ? (
        <div className="h-8 flex items-center justify-center rounded-[5px] bg-muted text-xs text-muted-foreground font-medium">
          Unavailable
        </div>
      ) : cartQty === 0 ? (
        <Button
          size="sm"
          onClick={onAdd}
          className="h-8 text-xs rounded-[5px] w-full bg-gradient-primary hover:opacity-90 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add to Cart
        </Button>
      ) : (
        <div className="flex items-center justify-between h-8 rounded-[5px] border border-primary/30 bg-primary/5 px-1.5">
          <button
            onClick={onDec}
            className="h-6 w-6 rounded-[3px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="text-sm font-bold tabular-nums text-primary">{cartQty}</span>
          <button
            onClick={onInc}
            className="h-6 w-6 rounded-[3px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  </div>
);

// ─── MetaItem ─────────────────────────────────────────────────────────────────

const MetaItem = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className="text-primary/70">{icon}</span>
    <span>{children}</span>
  </div>
);
