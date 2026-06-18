import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, Pill, Trash2, Plus, Minus, Package, X,
  Truck, MapPin, AlertCircle, Loader2,
} from "lucide-react";
import {
  useDraftOrder,
  useAddOrderItem,
  useUpdateOrderItem,
  useRemoveOrderItem,
  usePlaceOrder,
  type OrderItem,
} from "@/hooks/patient/use-pharmacy-orders";
import { useActivePharmacy } from "@/lib/marketplace-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PharmacyCartProps {
  variant?: "trigger" | "inline";
  currency?: string;
}

// ─── Cart item row ────────────────────────────────────────────────────────────

function CartItemRow({
  item,
  orderId,
  pharmacyId,
  currency,
}: {
  item: OrderItem;
  orderId: number;
  pharmacyId: number;
  currency: string;
}) {
  const update = useUpdateOrderItem();
  const remove = useRemoveOrderItem();

  const isPending = update.isPending || remove.isPending;

  return (
    <div className="flex items-center gap-3 p-3 rounded-[5px] border border-border bg-card">
      <div className="h-9 w-9 rounded-[5px] bg-primary/10 flex items-center justify-center shrink-0">
        <Pill className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold truncate">{item.medicine.name}</div>
        <div className="text-[10px] text-muted-foreground">
          {parseFloat(item.unit_price).toLocaleString()} {item.medicine.currency ?? currency} /{" "}
          {item.medicine.unit ?? "unit"}
        </div>
      </div>

      {/* Qty controls */}
      <div className={cn("flex items-center gap-1 shrink-0", isPending && "opacity-50 pointer-events-none")}>
        <button
          onClick={() =>
            update.mutate({
              orderId,
              itemId: item.id,
              quantity: item.quantity - 1,
              pharmacyId,
            })
          }
          className="h-6 w-6 rounded-[3px] border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-xs font-bold w-5 text-center tabular-nums">{item.quantity}</span>
        <button
          onClick={() =>
            update.mutate({
              orderId,
              itemId: item.id,
              quantity: item.quantity + 1,
              pharmacyId,
            })
          }
          className="h-6 w-6 rounded-[3px] border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Line total */}
      <div className="text-xs font-bold tabular-nums shrink-0 min-w-[64px] text-right">
        {parseFloat(item.subtotal).toLocaleString()} {item.medicine.currency ?? currency}
      </div>

      {/* Remove */}
      <button
        disabled={isPending}
        onClick={() => remove.mutate({ orderId, itemId: item.id, pharmacyId })}
        className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Delivery type toggle ─────────────────────────────────────────────────────

function DeliveryToggle({
  value,
  onChange,
}: {
  value: "delivery" | "pickup";
  onChange: (v: "delivery" | "pickup") => void;
}) {
  return (
    <div className="flex rounded-[5px] border border-border overflow-hidden text-[11px] font-medium">
      {(["pickup", "delivery"] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-all",
            t === "delivery" && "border-l border-border",
            value === t
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/50",
          )}
        >
          {t === "pickup" ? <MapPin className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const PharmacyCart = ({ variant = "trigger", currency = "RWF" }: PharmacyCartProps) => {
  const [open, setOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const { pharmacyId, deliveryType, setDeliveryType } = useActivePharmacy();

  const { data: draftData, isLoading: draftLoading } = useDraftOrder(pharmacyId);
  const placeOrder = usePlaceOrder();

  const order = draftData?.order ?? null;
  const items = order?.items ?? [];
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const total = order ? parseFloat(order.total_amount) : 0;

  const handlePlaceOrder = () => {
    if (!order) return;
    if (deliveryType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }
    placeOrder.mutate(
      {
        orderId: order.id,
        delivery_type: deliveryType,
        delivery_address: deliveryType === "delivery" ? deliveryAddress.trim() : undefined,
        pharmacyId: order.pharmacy_id,
      },
      {
        onSuccess: (res) => {
          toast.success(res.message ?? "Order placed successfully!");
          setOpen(false);
          setDeliveryAddress("");
        },
        onError: (err) => {
          toast.error(err.message ?? "Failed to place order.");
        },
      },
    );
  };

  // ── Trigger ──────────────────────────────────────────────────────────────

  const trigger =
    variant === "trigger" ? (
      <Button
        size="sm"
        variant="outline"
        className="relative rounded-[5px] h-8 text-xs gap-1.5"
        onClick={() => setOpen(true)}
      >
        <ShoppingCart className="h-3.5 w-3.5" />
        Cart
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </Button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gradient-primary text-primary-foreground rounded-[5px] text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
        <span>View Cart</span>
        {count > 0 && (
          <span className="h-4 min-w-4 px-1 rounded-full bg-white/20 text-[9px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
        <span className="ml-auto tabular-nums font-bold">
          {total.toLocaleString()} {currency}
        </span>
      </button>
    );

  // ── Sheet ────────────────────────────────────────────────────────────────

  return (
    <>
      {trigger}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0 gap-0">
          {/* Header */}
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-semibold">Your Cart</SheetTitle>
              {count > 0 && (
                <Badge variant="secondary" className="rounded-[3px] text-[10px]">
                  {count} item{count !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {draftLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-medium text-foreground">Your cart is empty</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Add medicines from this pharmacy to get started.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  orderId={order!.id}
                  pharmacyId={order!.pharmacy_id}
                  currency={currency}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-5 py-4 border-t border-border shrink-0 space-y-3 bg-card">
              {/* Delivery type */}
              <DeliveryToggle value={deliveryType} onChange={setDeliveryType} />

              {/* Delivery address */}
              {deliveryType === "delivery" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Delivery address
                  </label>
                  <input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. KG 123 St, Kigali"
                    className="w-full px-3 py-2 text-[11px] bg-background border border-border/60 rounded-[5px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  {deliveryType === "delivery" && !deliveryAddress.trim() && (
                    <p className="flex items-center gap-1 text-[10px] text-amber-600">
                      <AlertCircle className="h-3 w-3" /> Required for delivery
                    </p>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Total</span>
                <span className="font-bold tabular-nums text-primary">
                  {total.toLocaleString()} {currency}
                </span>
              </div>

              {/* CTA */}
              <Button
                className="w-full rounded-[5px] bg-gradient-primary hover:opacity-90 text-xs h-9"
                onClick={handlePlaceOrder}
                disabled={placeOrder.isPending}
              >
                {placeOrder.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                )}
                {placeOrder.isPending ? "Placing order…" : "Place Order"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
