import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  usePharmacyMedicines,
  parseDeliveryMins,
  type Medicine,
  type Pharmacy,
} from "@/hooks/patient/use-patient-search-pharmacy";
import {
  Search,
  MapPin,
  Truck,
  Phone,
  Mail,
  ExternalLink,
  Pill,
  BadgeCheck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PharmacyDrawerProps {
  pharmacy: Pharmacy;
  open: boolean;
  onClose: () => void;
}

interface MedicineRowProps {
  medicine: Medicine;
}

// ─── Day label map ────────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

// ─── Stock badge helper ───────────────────────────────────────────────────────
// Derives availability purely from med.stock — the field already returned by
// usePharmacyMedicines. No extra per-medicine network call needed.

const StockBadge = ({ stock, t }: { stock: number; t: (k: string, o?: Record<string, unknown>) => string }) => {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">
        <XCircle className="h-3 w-3" />
        {t("pages.patient.out_of_stock")}
      </span>
    );
  }
  if (stock < 30) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-warning bg-warning/10 px-2 py-1 rounded-full">
        <AlertCircle className="h-3 w-3" />
        {t("pages.patient.low_stock", { count: stock })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-1 rounded-full">
      <CheckCircle2 className="h-3 w-3" />
      {t("pages.patient.in_stock")}
    </span>
  );
};

// ─── PharmacyDrawer ───────────────────────────────────────────────────────────

export const PharmacyDrawer = ({ pharmacy: ph, open, onClose }: PharmacyDrawerProps) => {
  const { t } = useTranslation();
  const [medSearch, setMedSearch] = useState("");
  const debouncedMedSearch = useDebounce(medSearch, 300);

  // Single request for the whole list — gated on `open` so it never fires
  // while the drawer is closed. Stock data comes embedded in each medicine
  // object, so no per-row availability fetch is needed.
  const { data: medicines = [], isLoading } = usePharmacyMedicines({
    pharmacySlug: ph.slug,
    q: debouncedMedSearch || undefined,
    enabled: open,
  });

  const deliveryMins = parseDeliveryMins(ph.estimated_delivery_minutes);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="p-6 border-b border-border shrink-0">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-md bg-primary-soft flex items-center justify-center shrink-0 overflow-hidden">
              {ph.logo
                ? <img src={ph.logo} alt={ph.name} className="h-full w-full object-cover" />
                : <Pill className="h-8 w-8 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg leading-tight truncate">{ph.name}</h2>
                {ph.is_verified && <BadgeCheck className="h-5 w-5 text-primary shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{ph.address}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ph.offers_delivery && (
                  <Badge className="bg-success/10 text-success hover:bg-success/10 border-success/20 text-[10px]">
                    <Truck className="h-2.5 w-2.5 mr-1" />Delivery
                  </Badge>
                )}
                {ph.offers_pickup && <Badge variant="secondary" className="text-[10px]">Pickup</Badge>}
                {ph.is_open_24h && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 text-[10px]">24h</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />{ph.city}, {ph.province}
            </div>
            {ph.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />{ph.phone}
              </div>
            )}
            {ph.email && (
              <div className="flex items-center gap-1.5 col-span-2">
                <Mail className="h-3 w-3 shrink-0" />{ph.email}
              </div>
            )}
            {deliveryMins != null && (
              <div className="flex items-center gap-1.5">
                <Truck className="h-3 w-3 shrink-0" />
                {t("pages.patient.delivery_mins", { mins: deliveryMins })}
              </div>
            )}
            {ph.delivery_fee && ph.offers_delivery && (
              <div className="flex items-center gap-1.5">
                <ExternalLink className="h-3 w-3 shrink-0" />
                {ph.delivery_fee} {ph.delivery_currency}
              </div>
            )}
          </div>
        </div>

        {/* ── Working hours ────────────────────────────────────────── */}
        {ph.working_hours?.length > 0 && (
          <div className="px-6 py-4 border-b border-border shrink-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              {t("pages.patient.working_hours", { defaultValue: "Working Hours" })}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {ph.working_hours.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground w-8">{DAY_LABELS[h.day_of_week]}</span>
                  {h.is_closed ? (
                    <span className="text-destructive font-medium">Closed</span>
                  ) : (
                    <span className="tabular-nums">
                      {h.open_time?.slice(0, 5)} – {h.close_time?.slice(0, 5)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Medicine list ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 pb-3 shrink-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              {t("pages.patient.medicine_availability", { defaultValue: "Medicine Availability" })}
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                placeholder={t("pages.patient.search_in_pharmacy", {
                  defaultValue: "Search medicines in this pharmacy…",
                })}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-sm border border-border">
                    <Skeleton className="h-9 w-9 rounded-sm shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && medicines.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Pill className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("pages.patient.no_medicines_in_pharmacy", {
                    defaultValue: "No medicines found in this pharmacy.",
                  })}
                </p>
              </div>
            )}

            {!isLoading && medicines.length > 0 && (
              <div className="space-y-2">
                {medicines.map((med) => (
                  <MedicineRow key={med.id} medicine={med} />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── MedicineRow ──────────────────────────────────────────────────────────────
// Pure display component — no network calls. Stock comes from the medicine
// object already fetched by the single usePharmacyMedicines call above.

const MedicineRow = ({ medicine: med }: MedicineRowProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 rounded-sm border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="h-9 w-9 rounded-sm bg-primary-soft flex items-center justify-center shrink-0">
        <Pill className="h-4.5 w-4.5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{med.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {[med.brand, med.category].filter(Boolean).join(" · ")}
          </span>
          {med.prescription_required ? (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">
              <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />Rx
            </Badge>
          ) : (
            <Badge className="bg-success/10 text-success hover:bg-success/10 border-success/20 text-[9px] px-1 py-0">
              OTC
            </Badge>
          )}
        </div>
      </div>

      <div className="text-sm font-bold tabular-nums shrink-0">
        ${med.price.toFixed(2)}
      </div>

      <StockBadge stock={med.stock} t={t} />
    </div>
  );
};
