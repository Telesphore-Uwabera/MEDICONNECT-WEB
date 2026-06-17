import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeliveryType = "delivery" | "pickup";

export interface OrderItem {
  id: number;
  order_id: number;
  medicine_id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
  medicine: {
    id: number;
    name: string;
    generic_name?: string;
    price: string;
    currency?: string;
    unit?: string;
  };
}

export interface PharmacyOrder {
  id: number;
  pharmacy_id: number;
  status: "draft" | "pending" | "confirmed" | "dispensed" | "cancelled";
  total_amount: string;
  delivery_type?: DeliveryType;
  delivery_address?: string;
  items: OrderItem[];
}

interface DraftOrderResponse {
  order: PharmacyOrder | null;
}

interface OrderMutationResponse {
  message: string;
  order: PharmacyOrder;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const orderKeys = {
  draft: (pharmacyId: number | null) =>
    ["pharmacy-order-draft", pharmacyId] as const,
};

// ─── 1. Get Draft Order ───────────────────────────────────────────────────────

export function useDraftOrder(pharmacyId: number | null) {
  return useQuery<DraftOrderResponse>({
    queryKey: orderKeys.draft(pharmacyId),
    queryFn: () =>
      apiFetch(`/patient/pharmacy-orders/draft?pharmacy_id=${pharmacyId}`),
    enabled: pharmacyId != null,
    staleTime: 0, // always fresh — cart state must be authoritative
  });
}

// ─── 2. Add Item ──────────────────────────────────────────────────────────────

interface AddItemVars {
  pharmacy_id: number;
  medicine_id: number;
  quantity: number;
  delivery_type: DeliveryType;
}

export function useAddOrderItem() {
  const qc = useQueryClient();
  return useMutation<OrderMutationResponse, Error, AddItemVars>({
    mutationFn: (body) =>
      apiFetch("/patient/pharmacy-orders/items", {
        method: "POST",
        body,
      }),
    onSuccess: (data, vars) => {
      qc.setQueryData<DraftOrderResponse>(
        orderKeys.draft(vars.pharmacy_id),
        { order: data.order },
      );
    },
  });
}

// ─── 3. Update Item Quantity ──────────────────────────────────────────────────

interface UpdateItemVars {
  orderId: number;
  itemId: number;
  quantity: number;
  pharmacyId: number;
}

export function useUpdateOrderItem() {
  const qc = useQueryClient();
  return useMutation<OrderMutationResponse, Error, UpdateItemVars>({
    mutationFn: ({ orderId, itemId, quantity }) =>
      apiFetch(`/patient/pharmacy-orders/${orderId}/items/${itemId}`, {
        method: "PUT",
        body: { quantity },
      }),
    onSuccess: (data, vars) => {
      qc.setQueryData<DraftOrderResponse>(
        orderKeys.draft(vars.pharmacyId),
        { order: data.order },
      );
    },
  });
}

// ─── 4. Remove Item ───────────────────────────────────────────────────────────

interface RemoveItemVars {
  orderId: number;
  itemId: number;
  pharmacyId: number;
}

export function useRemoveOrderItem() {
  const qc = useQueryClient();
  return useMutation<OrderMutationResponse, Error, RemoveItemVars>({
    mutationFn: ({ orderId, itemId }) =>
      apiFetch(`/patient/pharmacy-orders/${orderId}/items/${itemId}`, {
        method: "DELETE",
      }),
    onSuccess: (data, vars) => {
      qc.setQueryData<DraftOrderResponse>(
        orderKeys.draft(vars.pharmacyId),
        { order: data.order },
      );
    },
  });
}

// ─── 5. Place Order ───────────────────────────────────────────────────────────

interface PlaceOrderVars {
  orderId: number;
  delivery_type: DeliveryType;
  delivery_address?: string;
  pharmacyId: number;
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation<OrderMutationResponse, Error, PlaceOrderVars>({
    mutationFn: ({ orderId, delivery_type, delivery_address }) =>
      apiFetch(`/patient/pharmacy-orders/${orderId}/place`, {
        method: "POST",
        body: {
          delivery_type,
          ...(delivery_address ? { delivery_address } : {}),
        },
      }),
    onSuccess: (_data, vars) => {
      // Clear the draft so the cart empties
      qc.setQueryData<DraftOrderResponse>(
        orderKeys.draft(vars.pharmacyId),
        { order: null },
      );
    },
  });
}
