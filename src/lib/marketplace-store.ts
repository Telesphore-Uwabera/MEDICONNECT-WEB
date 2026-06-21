/**
 * marketplace-store.ts
 *
 * Replaces the old in-memory store.
 * Cart state now lives on the server (draft pharmacy order).
 * This module provides:
 *   - A React context that holds the "active pharmacy" for the current drawer session
 *   - Re-exports of the order hooks so call sites change minimally
 */

import { createContext, useContext } from "react";
import type { DeliveryType } from "@/hooks/patient/use-pharmacy-orders";

// ─── Active-pharmacy context ──────────────────────────────────────────────────
// Set by PharmacyDrawer when it opens; consumed by PharmacyCart inside the drawer.

export interface ActivePharmacyCtx {
  pharmacyId: number | null;
  deliveryType: DeliveryType;
  setDeliveryType: (t: DeliveryType) => void;
}

export const ActivePharmacyContext = createContext<ActivePharmacyCtx>({
  pharmacyId: null,
  deliveryType: "pickup",
  setDeliveryType: () => {},
});

export const useActivePharmacy = () => useContext(ActivePharmacyContext);
