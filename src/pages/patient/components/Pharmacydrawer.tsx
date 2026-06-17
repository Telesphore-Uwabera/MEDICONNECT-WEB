import { useState, useMemo, useEffect, useCallback } from "react";
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
  useDraftOrder,
  useAddOrderItem,
  useUpdateOrderItem,
  useRemoveOrderItem,
  type OrderItem,
} from "@/hooks/patient/use-pharmacy-orders";
import { ActivePharmacyContext } from "@/lib/marketplace-store";
import {
  Search, MapPin, Truck, Phone, Mail, Pill, BadgeCheck,
  ShieldCheck, CheckCircle2, XCircle, AlertCircle, Clock,
  Star, Plus, Minus, SlidersHorizontal, X, Eye, Package,
  Tag, FlaskConical, Layers, Loader2,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { PharmacyCart } from "./PharmacyCart";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PharmacyDrawerProps {
  pharmacy: Pharmacy;
  open: boolean;
  onClose: () => void;
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
      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-[6px] whitespace-nowrap">
        <XCircle className="h-2.5 w-2.5" /> Out
      </span>
    );
  if (quantity < 30)
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-[6px] whitespace-nowrap">
        <AlertCircle className="h-2.5 w-2.5" /> {quantity}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-[6px] whitespace-nowrap">
      <CheckCircle2 className="h-2.5 w-2.5" /> In
    </span>
  );
};

// ─── DetailRow ────────────────────────────────────────────────────────────────

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="rounded-[6px] bg-muted/50 border border-border/60 px-3 py-2">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-primary/60">{icon}</span>
      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
    <div className="text-[11px] font-semibold text-foreground">{value}</div>
  </div>
);

// ─── MedicineModal ────────────────────────────────────────────────────────────

interface MedicineModalProps {
  medicine: Medicine | null;
  open: boolean;
  onClose: () => void;
  cartItem: OrderItem | undefined;
  orderId: number | null;
  pharmacyId: number;
  onAdd: () => void;
}

const MedicineModal = ({
  medicine: med, open, onClose, cartItem, orderId, pharmacyId, onAdd,
}: MedicineModalProps) => {
  const update = useUpdateOrderItem();
  const remove = useRemoveOrderItem();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!med) return null;

  const outOfStock = !med.is_available || med.quantity === 0;
  const cartQty = cartItem?.quantity ?? 0;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[400px] max-w-[90vw] bg-card border border-border shadow-2xl",
          "transition-all duration-200 rounded-[6px]",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border">
          <div className="h-10 w-10 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-foreground leading-tight">{med.name}</h3>
            {med.generic_name && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{med.generic_name}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {med.requires_prescription ? (
                <Badge variant="secondary" className="rounded-[4px] text-[9px] px-2 py-0.5 h-auto gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" /> Rx
                </Badge>
              ) : (
                <Badge className="rounded-[4px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[9px] px-2 py-0.5 h-auto">
                  OTC
                </Badge>
              )}
              {med.rating != null && (
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                  {med.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <DetailRow icon={<Tag className="h-3 w-3" />} label="Category" value={med.category ?? "—"} />
            <DetailRow icon={<FlaskConical className="h-3 w-3" />} label="Generic" value={med.generic_name ?? "—"} />
            <DetailRow icon={<Layers className="h-3 w-3" />} label="Unit" value={med.unit ?? "—"} />
            <DetailRow icon={<Package className="h-3 w-3" />} label="Availability"
              value={<StockBadge quantity={med.quantity} isAvailable={med.is_available} />}
            />
            <DetailRow icon={<Package className="h-3 w-3" />} label="Stock" value={med.quantity.toLocaleString()} />
            {med.source && (
              <DetailRow icon={<Package className="h-3 w-3" />} label="Source" value={med.source} />
            )}
          </div>

          {/* Price + CTA */}
          <div className="rounded-[6px] bg-primary/5 border border-primary/15 px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Unit Price</p>
              <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                {parseFloat(med.price).toLocaleString()}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">{med.currency ?? "RWF"}</span>
              </p>
              {med.unit && <p className="text-[9px] text-muted-foreground">per {med.unit}</p>}
            </div>
            {outOfStock ? (
              <div className="h-8 px-3 flex items-center justify-center rounded-[6px] bg-muted text-[11px] text-muted-foreground font-medium">
                Unavailable
              </div>
            ) : cartQty === 0 ? (
              <Button
                size="sm"
                onClick={onAdd}
                className="h-8 text-[11px] rounded-[6px] px-3 bg-gradient-primary hover:opacity-90 gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 h-8 rounded-[6px] border border-primary/30 bg-primary/5 px-2">
                <button
                  onClick={() => {
                    if (!orderId || !cartItem) return;
                    if (cartQty <= 1) {
                      remove.mutate({ orderId, itemId: cartItem.id, pharmacyId });
                    } else {
                      update.mutate({ orderId, itemId: cartItem.id, quantity: cartQty - 1, pharmacyId });
                    }
                  }}
                  className="h-5 w-5 rounded-[4px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-[12px] font-bold tabular-nums text-primary w-4 text-center">{cartQty}</span>
                <button
                  onClick={() => {
                    if (!orderId || !cartItem) return;
                    update.mutate({ orderId, itemId: cartItem.id, quantity: cartQty + 1, pharmacyId });
                  }}
                  className="h-5 w-5 rounded-[4px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
                >
                  <Plus className="h-3 w-3" />
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
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("pickup");

  // ── Server cart ────────────────────────────────────────────────────────────
  const { data: draftData } = useDraftOrder(open ? ph.id : null);
  const addItem = useAddOrderItem();

  const order = draftData?.order ?? null;
  const cartItems: OrderItem[] = order?.items ?? [];
  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);

  // ── Medicine list ──────────────────────────────────────────────────────────
  const { data: rawData, isLoading } = usePharmacyMedicines({
    pharmacySlug: ph.slug,
    q: debouncedMedSearch || undefined,
    enabled: open,
  });

  const medicines: Medicine[] = Array.isArray(rawData) ? rawData : (rawData as any)?.medicines ?? [];

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

  const resetAndClose = useCallback(() => {
    setMedSearch("");
    setSelectedCategory("All");
    setOnlyInStock(false);
    setOnlyOTC(false);
    setOnlyRx(false);
    setModalOpen(false);
    setSelectedMed(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);
  const todayHours = ph.working_hours?.find((h) => h.day_of_week === TODAY);
  const isClosedToday = todayHours?.is_closed ?? true;
  const isOpenNow = ph.is_open_24h || (!isClosedToday && !!todayHours);

  const openModal = (med: Medicine) => { setSelectedMed(med); setModalOpen(true); };
  const modalCartItem = cartItems.find((c) => c.medicine_id === selectedMed?.id);

  const handleAdd = useCallback(
    (med: Medicine) => {
      addItem.mutate(
        {
          pharmacy_id: ph.id,
          medicine_id: med.id,
          quantity: 1,
          delivery_type: deliveryType,
        },
        {
          onSuccess: () => toast.success(`${med.name} added to cart`),
          onError: (e) => toast.error(e.message ?? "Failed to add item"),
        },
      );
    },
    [addItem, ph.id, deliveryType],
  );

  return (
    // Provide active pharmacy context so PharmacyCart inside can fetch the right draft
    <ActivePharmacyContext.Provider value={{ pharmacyId: ph.id, deliveryType, setDeliveryType }}>
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          )}
          onClick={resetAndClose}
        />

        {/* Drawer */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-[52vw] flex flex-col bg-background",
            "border-l border-border shadow-2xl transition-transform duration-300 ease-in-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="px-5 pt-4 pb-3 border-b border-border shrink-0 bg-card">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-primary/20">
                {ph.logo
                  ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
                  : <Pill className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0 pr-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[13px] font-semibold leading-tight text-foreground">{ph.name}</h2>
                  {ph.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <div className={cn(
                    "inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full",
                    isOpenNow ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive",
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", isOpenNow ? "bg-emerald-500" : "bg-destructive")} />
                    {ph.is_open_24h ? "24h" : isClosedToday ? "Closed" : "Open"}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ph.address}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {ph.offers_delivery && (
                    <Badge className="rounded-[6px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[9px] px-1.5 py-0.5 h-auto gap-1">
                      <Truck className="h-2.5 w-2.5" /> Delivery
                    </Badge>
                  )}
                  {ph.offers_pickup && (
                    <Badge variant="secondary" className="rounded-[6px] text-[9px] px-1.5 py-0.5 h-auto">Pickup</Badge>
                  )}
                  {ph.is_open_24h && (
                    <Badge className="rounded-[6px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[9px] px-1.5 py-0.5 h-auto">24h</Badge>
                  )}
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="absolute right-4 top-4 h-7 w-7 rounded-[6px] flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <MetaItem icon={<MapPin className="h-3 w-3" />}>{ph.city}, {ph.province}</MetaItem>
              {ph.phone && <MetaItem icon={<Phone className="h-3 w-3" />}>{ph.phone}</MetaItem>}
              {ph.email && <MetaItem icon={<Mail className="h-3 w-3" />}>{ph.email}</MetaItem>}
              {deliveryMins != null && (
                <MetaItem icon={<Truck className="h-3 w-3" />}>~{deliveryMins} min</MetaItem>
              )}
              {ph.delivery_fee && ph.offers_delivery && (
                <MetaItem icon={<Truck className="h-3 w-3" />}>
                  {ph.delivery_fee} {ph.delivery_currency}
                </MetaItem>
              )}
              {todayHours && !isClosedToday && (
                <MetaItem icon={<Clock className="h-3 w-3" />}>
                  Today: {todayHours.open_time?.slice(0, 5)} – {todayHours.close_time?.slice(0, 5)}
                </MetaItem>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-border/60">
              <PharmacyCart variant="trigger" currency={ph.delivery_currency ?? "RWF"} />
            </div>
          </div>

          {/* ── Working hours ──────────────────────────────────────── */}
          {ph.working_hours?.length > 0 && (
            <div className="px-5 py-2.5 border-b border-border shrink-0 bg-muted/20">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Working Hours
              </p>
              <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                {ph.working_hours.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-[10px]">
                    <span className={cn("font-semibold w-6", h.day_of_week === TODAY ? "text-primary" : "text-muted-foreground")}>
                      {DAY_LABELS[h.day_of_week]}
                    </span>
                    {h.is_closed ? (
                      <span className="text-destructive text-[9px]">Closed</span>
                    ) : (
                      <span className="tabular-nums text-foreground text-[9px]">
                        {h.open_time?.slice(0, 5)}–{h.close_time?.slice(0, 5)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Medicine section ───────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 pt-3 pb-2.5 shrink-0 space-y-2.5 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Medicines
                </p>
                {!isLoading && filtered.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={medSearch}
                    onChange={(e) => setMedSearch(e.target.value)}
                    placeholder="Search medicines…"
                    className="pl-8 h-8 text-[11px] rounded-[6px]"
                  />
                  {medSearch && (
                    <button
                      onClick={() => setMedSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={showFilters ? "default" : "outline"}
                  className="h-8 rounded-[6px] text-[11px] px-2.5 gap-1 shrink-0"
                  onClick={() => setShowFilters((v) => !v)}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Filters
                  {activeFilters > 0 && (
                    <span className="h-3.5 w-3.5 rounded-full bg-primary-foreground text-primary text-[8px] font-bold flex items-center justify-center">
                      {activeFilters}
                    </span>
                  )}
                </Button>
              </div>

              {showFilters && (
                <div className="rounded-[6px] border border-border bg-muted/40 p-2.5 space-y-2.5">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Category</p>
                    <div className="flex flex-wrap gap-1">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full border font-medium transition-colors",
                            selectedCategory === cat
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {[
                      { label: "In stock", value: onlyInStock, set: setOnlyInStock },
                      { label: "OTC only", value: onlyOTC, set: setOnlyOTC },
                      { label: "Rx only", value: onlyRx, set: setOnlyRx },
                    ].map(({ label, value, set }) => (
                      <label key={label} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <Checkbox checked={value} onCheckedChange={(v) => set(!!v)} className="h-3.5 w-3.5 rounded-[3px]" />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </label>
                    ))}
                  </div>
                  {activeFilters > 0 && (
                    <button
                      onClick={() => { setSelectedCategory("All"); setOnlyInStock(false); setOnlyOTC(false); setOnlyRx(false); }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable medicine grid */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {isLoading && (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-[6px] border border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-[6px] shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-2.5 w-3/4" />
                          <Skeleton className="h-2 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-12 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-[6px]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-[6px] bg-muted flex items-center justify-center mb-2">
                    <Pill className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-[11px] font-medium text-foreground mb-0.5">No medicines found</p>
                  <p className="text-[10px] text-muted-foreground max-w-[180px]">
                    {medSearch || activeFilters > 0
                      ? "Try adjusting your search or filters."
                      : "No medicines listed for this pharmacy."}
                  </p>
                  {(medSearch || activeFilters > 0) && (
                    <button
                      onClick={() => { setMedSearch(""); setSelectedCategory("All"); setOnlyInStock(false); setOnlyOTC(false); setOnlyRx(false); }}
                      className="text-[10px] text-primary hover:underline mt-2"
                    >
                      Clear search & filters
                    </button>
                  )}
                </div>
              )}

              {!isLoading && filtered.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {filtered.map((med) => {
                    const cartItem = cartItems.find((c) => c.medicine_id === med.id);
                    const outOfStock = !med.is_available || med.quantity === 0;
                    return (
                      <MedicineCard
                        key={med.id}
                        medicine={med}
                        cartQty={cartItem?.quantity ?? 0}
                        outOfStock={outOfStock}
                        isAdding={addItem.isPending && addItem.variables?.medicine_id === med.id}
                        onView={() => openModal(med)}
                        onAdd={() => handleAdd(med)}
                        onInc={() => {
                          if (!order || !cartItem) return;
                          // reuse useUpdateOrderItem inline — pass via prop
                        }}
                        onDec={() => {
                          if (!order || !cartItem) return;
                        }}
                        orderId={order?.id ?? null}
                        pharmacyId={ph.id}
                        cartItem={cartItem}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky cart bar */}
            {cartCount > 0 && (
              <div className="px-5 py-2.5 border-t border-border bg-card shrink-0">
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
          cartItem={modalCartItem}
          orderId={order?.id ?? null}
          pharmacyId={ph.id}
          onAdd={() => { if (selectedMed) handleAdd(selectedMed); }}
        />
      </>
    </ActivePharmacyContext.Provider>
  );
};

// ─── MedicineCard ─────────────────────────────────────────────────────────────

interface MedicineCardProps {
  medicine: Medicine;
  cartQty: number;
  outOfStock: boolean;
  isAdding: boolean;
  onView: () => void;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  orderId: number | null;
  pharmacyId: number;
  cartItem: OrderItem | undefined;
}

const MedicineCard = ({
  medicine: med, cartQty, outOfStock, isAdding, onView, onAdd,
  orderId, pharmacyId, cartItem,
}: MedicineCardProps) => {
  const update = useUpdateOrderItem();
  const remove = useRemoveOrderItem();

  const isBusy = isAdding || update.isPending || remove.isPending;

  return (
    <div className={cn(
      "flex flex-col rounded-[6px] border bg-card transition-all",
      cartQty > 0
        ? "border-primary/40 shadow-sm"
        : "border-border hover:border-primary/30 hover:shadow-sm",
    )}>
      <div className="p-2.5 flex flex-col gap-2 flex-1">
        {/* Icon + name + view */}
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
            <Pill className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold leading-tight text-foreground line-clamp-1">{med.name}</div>
            {med.generic_name && (
              <div className="text-[9px] text-muted-foreground truncate mt-0.5">{med.generic_name}</div>
            )}
            {med.category && (
              <div className="text-[9px] text-primary/70 font-medium mt-0.5">{med.category}</div>
            )}
          </div>
          <button
            onClick={onView}
            className="h-6 w-6 rounded-[6px] flex items-center justify-center bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors shrink-0"
            title="View details"
          >
            <Eye className="h-3 w-3" />
          </button>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1 flex-wrap">
          {med.requires_prescription ? (
            <Badge variant="secondary" className="rounded-[4px] text-[9px] px-1 py-0.5 h-auto gap-0.5">
              <ShieldCheck className="h-2 w-2" /> Rx
            </Badge>
          ) : (
            <Badge className="rounded-[4px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/20 text-[9px] px-1 py-0.5 h-auto">
              OTC
            </Badge>
          )}
          {med.unit && (
            <span className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded-[3px]">/{med.unit}</span>
          )}
          {med.rating != null && (
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground ml-auto">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {med.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Price + stock */}
        <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-border/50">
          <div>
            <span className="text-[11px] font-bold tabular-nums text-foreground">
              {parseFloat(med.price).toLocaleString()}
            </span>
            <span className="text-[9px] text-muted-foreground ml-0.5">{med.currency ?? "RWF"}</span>
          </div>
          <StockBadge quantity={med.quantity} isAvailable={med.is_available} />
        </div>

        {/* Available qty */}
        {med.quantity > 0 && (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <Package className="h-2.5 w-2.5" />
            <span>{med.quantity.toLocaleString()} avail</span>
          </div>
        )}

        {/* CTA */}
        {outOfStock ? (
          <div className="h-7 flex items-center justify-center rounded-[6px] bg-muted text-[10px] text-muted-foreground font-medium">
            Unavailable
          </div>
        ) : cartQty === 0 ? (
          <Button
            size="sm"
            onClick={onAdd}
            disabled={isBusy}
            className="h-7 text-[10px] rounded-[6px] w-full bg-gradient-primary hover:opacity-90 gap-1"
          >
            {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add
          </Button>
        ) : (
          <div className={cn(
            "flex items-center justify-between h-7 rounded-[6px] border border-primary/30 bg-primary/5 px-1",
            isBusy && "opacity-50 pointer-events-none",
          )}>
            <button
              onClick={() => {
                if (!orderId || !cartItem) return;
                if (cartQty <= 1) {
                  remove.mutate({ orderId, itemId: cartItem.id, pharmacyId });
                } else {
                  update.mutate({ orderId, itemId: cartItem.id, quantity: cartQty - 1, pharmacyId });
                }
              }}
              className="h-5 w-5 rounded-[4px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-[11px] font-bold tabular-nums text-primary">{cartQty}</span>
            <button
              onClick={() => {
                if (!orderId || !cartItem) return;
                update.mutate({ orderId, itemId: cartItem.id, quantity: cartQty + 1, pharmacyId });
              }}
              className="h-5 w-5 rounded-[4px] flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MetaItem ─────────────────────────────────────────────────────────────────

const MetaItem = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
    <span className="text-primary/70">{icon}</span>
    <span>{children}</span>
  </div>
);
