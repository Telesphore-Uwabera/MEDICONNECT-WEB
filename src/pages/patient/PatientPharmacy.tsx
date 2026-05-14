import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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
  marketplaceProducts,
  pharmacyVendors,
  productCategories,
  addToCart,
  removeFromCart,
  clearCart,
  useCart,
  getPharmacy,
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
} from "lucide-react";
import { toast } from "sonner";

type Sort = "relevance" | "price-asc" | "price-desc" | "rating";

const cities = [
  "All",
  ...Array.from(new Set(pharmacyVendors.map((p) => p.city))),
];

const PatientPharmacy = () => {
  const { t } = useTranslation();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [city, setCity] = useState("All");
  const [pharmacyId, setPharmacyId] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [otcOnly, setOtcOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("relevance");

  const filtered = useMemo(() => {
    let list = marketplaceProducts.slice();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
      );
    }
    if (category !== "All") list = list.filter((p) => p.category === category);
    if (city !== "All")
      list = list.filter((p) => getPharmacy(p.pharmacyId)?.city === city);
    if (pharmacyId !== "all")
      list = list.filter((p) => p.pharmacyId === pharmacyId);
    list = list.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1],
    );
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
    if (otcOnly) list = list.filter((p) => !p.prescriptionRequired);
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
    }
    return list;
  }, [
    query,
    category,
    city,
    pharmacyId,
    priceRange,
    inStockOnly,
    otcOnly,
    sort,
  ]);

  const cartTotal = cart.reduce((sum, c) => {
    const p = marketplaceProducts.find((x) => x.id === c.productId);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const filtersPanel = (
    <div className="space-y-6">
      <FilterBlock label={t("pages.patient.category")}>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {productCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "All" ? t("pages.patient.all") : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label={t("pages.patient.location")}>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "All" ? t("pages.patient.all") : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label={t("sidebar.pharmacy")}>
        <Select value={pharmacyId} onValueChange={setPharmacyId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("pages.patient.all_pharmacies")}
            </SelectItem>
            {pharmacyVendors.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock
        label={t("pages.patient.price", {
          min: priceRange[0],
          max: priceRange[1],
        })}
      >
        <Slider
          value={priceRange}
          onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
          min={0}
          max={100}
          step={1}
        />
      </FilterBlock>

      <div className="space-y-2.5">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={inStockOnly}
            onCheckedChange={(v) => setInStockOnly(!!v)}
          />
          {t("pages.patient.in_stock_only")}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={otcOnly}
            onCheckedChange={(v) => setOtcOnly(!!v)}
          />
          {t("pages.patient.otc_only")}
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
                  <p className="text-sm text-muted-foreground">
                    {t("pages.patient.cart_empty")}
                  </p>
                )}
                {cart.map((c) => {
                  const p = marketplaceProducts.find(
                    (x) => x.id === c.productId,
                  );
                  if (!p) return null;
                  return (
                    <div
                      key={c.productId}
                      className="flex items-center gap-3 p-3 rounded-sm border border-border"
                    >
                      <div className="text-2xl">{p.image}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${p.price.toFixed(2)} × {c.qty}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(c.productId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {cart.length > 0 && (
                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between font-display">
                      <span>{t("pages.patient.total")}</span>
                      <span className="font-bold tabular-nums">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-gradient-primary hover:opacity-90"
                      onClick={() => {
                        toast.success(t("pages.patient.order_placed"));
                        clearCart();
                      }}
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
        <aside className="hidden lg:block">
          <div className="rounded-md border border-border bg-card p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{t("pages.patient.filters")}</h3>
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            {filtersPanel}
          </div>
        </aside>

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
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">
                  {t("pages.patient.sort_relevance")}
                </SelectItem>
                <SelectItem value="price-asc">
                  {t("pages.patient.sort_price_asc")}
                </SelectItem>
                <SelectItem value="price-desc">
                  {t("pages.patient.sort_price_desc")}
                </SelectItem>
                <SelectItem value="rating">
                  {t("pages.patient.sort_rating")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  {t("pages.patient.filters")}
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>{t("pages.patient.filters")}</SheetTitle>
                </SheetHeader>
                <div className="mt-6">{filtersPanel}</div>
              </SheetContent>
            </Sheet>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("pages.patient.products_count", {
              count: filtered.length,
              vendors: pharmacyVendors.length,
            })}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-16 text-center">
              <Pill className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {t("pages.patient.no_products")}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const ph = getPharmacy(p.pharmacyId)!;
                const out = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className="rounded-md border border-border bg-card p-5 shadow-soft hover:shadow-medium transition-smooth flex flex-col"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 rounded-sm bg-primary-soft flex items-center justify-center text-2xl shrink-0">
                        {p.image}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.brand} · {p.category}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            {p.rating}
                          </span>
                          {p.prescriptionRequired ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Rx
                            </Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success hover:bg-success/10 border-success/20 text-[10px]">
                              OTC
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {ph.name} · {ph.city}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-3 w-3" />
                        {t("pages.patient.delivery_mins", {
                          mins: ph.deliveryMins,
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        <div className="font-display text-xl font-bold tabular-nums">
                          ${p.price.toFixed(2)}
                        </div>
                        <div
                          className={`text-[10px] uppercase tracking-wider font-medium ${out ? "text-destructive" : p.stock < 30 ? "text-warning" : "text-success"}`}
                        >
                          {out
                            ? t("pages.patient.out_of_stock")
                            : p.stock < 30
                              ? t("pages.patient.low_stock", { count: p.stock })
                              : t("pages.patient.in_stock")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={out}
                        onClick={() => {
                          addToCart(p.id);
                          toast.success(
                            t("pages.patient.added_to_cart", { name: p.name }),
                          );
                        }}
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                        {t("pages.patient.add")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const FilterBlock = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);

export default PatientPharmacy;
