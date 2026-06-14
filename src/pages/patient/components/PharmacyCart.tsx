import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Pill,
  Trash2,
  Plus,
  Minus,
  Package,
  X,
} from "lucide-react";
import {
  useCart,
  useCartCount,
  useCartTotal,
  removeFromCart,
  updateCartQty,
  clearCart,
} from "@/lib/marketplace-store";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PharmacyCartProps {
  /**
   * "trigger" — renders the top-bar icon button (used in PageHeader)
   * "inline"  — renders a full-width bar (used at bottom of PharmacyDrawer)
   */
  variant?: "trigger" | "inline";
  currency?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PharmacyCart = ({ variant = "trigger", currency = "RWF" }: PharmacyCartProps) => {
  const [open, setOpen] = useState(false);

  const items = useCart();
  const count = useCartCount();
  const total = useCartTotal();

  const handleCheckout = () => {
    clearCart();
    setOpen(false);
    toast.success("Order placed successfully!");
  };

  // ── Trigger ───────────────────────────────────────────────────────────────

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

  // ── Sheet ─────────────────────────────────────────────────────────────────

  return (
    <>
      {trigger}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[400px] flex flex-col p-0 gap-0"
        >
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
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-medium text-foreground">Your cart is empty</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Add medicines from any pharmacy to get started.
                </p>
              </div>
            ) : (
              items.map(({ productId, medicine: med, qty }) => (
                <div
                  key={productId}
                  className="flex items-center gap-3 p-3 rounded-[5px] border border-border bg-card"
                >
                  {/* Icon */}
                  <div className="h-9 w-9 rounded-[5px] bg-primary-soft flex items-center justify-center shrink-0">
                    <Pill className="h-4 w-4 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate">{med.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {parseFloat(med.price).toLocaleString()} {med.currency ?? currency} / {med.unit ?? "unit"}
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateCartQty(productId, qty - 1)}
                      className="h-6 w-6 rounded-[3px] border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center tabular-nums">{qty}</span>
                    <button
                      onClick={() => updateCartQty(productId, qty + 1)}
                      className="h-6 w-6 rounded-[3px] border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Line total */}
                  <div className="text-xs font-bold tabular-nums shrink-0 min-w-[64px] text-right">
                    {(parseFloat(med.price) * qty).toLocaleString()} {med.currency ?? currency}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(productId)}
                    className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-5 py-4 border-t border-border shrink-0 space-y-3 bg-card">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Total</span>
                <span className="font-bold tabular-nums text-primary">
                  {total.toLocaleString()} {currency}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[5px] text-xs h-9 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => clearCart()}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
                <Button
                  className="flex-1 rounded-[5px] bg-gradient-primary hover:opacity-90 text-xs h-9"
                  onClick={handleCheckout}
                >
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  Place Order
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
