
// Pharmacy cart store — real data only, no mock fixtures.
import { useSyncExternalStore } from "react";
import type { Medicine } from "@/hooks/patient/use-patient-search-pharmacy";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string; // String(medicine.id)
  medicine: Medicine;
  qty: number;
}

// ─── Internal state ───────────────────────────────────────────────────────────

const cart: CartItem[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// Stable snapshot — same array reference until mutated, then replaced.
// We keep a single cached ref and only swap it on emit.
let cachedSnapshot: CartItem[] = [];

const getSnapshot = () => cachedSnapshot;
const getServerSnapshot = () => cachedSnapshot;

// Replace emit so it also refreshes the cached snapshot before notifying.
const notifyWithSnapshot = () => {
  cachedSnapshot = [...cart];
  listeners.forEach((l) => l());
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export const addToCart = (medicine: Medicine) => {
  const id = String(medicine.id);
  const existing = cart.find((c) => c.productId === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ productId: id, medicine, qty: 1 });
  }
  notifyWithSnapshot();
};

export const removeFromCart = (productId: string) => {
  const i = cart.findIndex((c) => c.productId === productId);
  if (i >= 0) cart.splice(i, 1);
  notifyWithSnapshot();
};

export const updateCartQty = (productId: string, newQty: number) => {
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = cart.find((c) => c.productId === productId);
  if (item) {
    item.qty = newQty;
    notifyWithSnapshot();
  }
};

export const clearCart = () => {
  cart.length = 0;
  notifyWithSnapshot();
};

// ─── Single hook — consumers derive what they need ────────────────────────────

/** Returns the stable cart snapshot. Re-renders only when cart changes. */
export const useCart = (): CartItem[] =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

// ─── Lightweight derived hooks (read from snapshot, no extra subscriptions) ───

/** Total unit count across all items. */
export const useCartCount = (): number => {
  const items = useCart();
  return items.reduce((n, c) => n + c.qty, 0);
};

/** Total price across all items. */
export const useCartTotal = (): number => {
  const items = useCart();
  return items.reduce((n, c) => n + parseFloat(c.medicine.price) * c.qty, 0);
};

/** Qty of a specific medicine in the cart (0 if absent). */
export const useCartQty = (medicineId: number): number => {
  const items = useCart();
  return items.find((c) => c.productId === String(medicineId))?.qty ?? 0;
};

