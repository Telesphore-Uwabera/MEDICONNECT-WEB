import { useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { User } from "@/types/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstantConsultationRequestPayload {
  doctor_id: number;
  guest_phone?: string;
  country_code?: string;
  guest_name?: string;
  guest_email?: string;
  description?: string;
  password?: string;
}

export interface InstantConsultationRequestAnyPayload {
  guest_phone?: string;
  country_code?: string;
  guest_name?: string;
  guest_email?: string;
  description?: string;
  password?: string;
}

export interface InstantConsultationRequestResponse {
  message: string;
  is_existing?: boolean;
  guest_token: string;
  queue_position: number;
  people_ahead: number;
  id: number;
  amount: number;
  payment_status: string;
  status?: string;
  account_created?: boolean;
  token?: string;
  user?: User;
}

export type ConsultationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired"
  | "completed"
  | "confirmed"
  | "in_progress"
  | "rejected"
  | "cancelled";

export interface InstantConsultationStatusResponse {
  status: ConsultationStatus;
  queue_position: number;
  people_ahead: number;
  room_url?: string;
  daily_guest_token?: string;
}

export interface InstantConsultationPayResponse {
  message: string;
  invoice_number: string;
  public_key: string;
  amount: number;
  currency: string;
  payment_uuid: string;
}

export interface CheckInvoiceResponse {
  status: "paid" | "pending" | string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * POST /public/instant-consultations/request
 */
export function useInstantConsultationRequest() {
  return useMutation<
    InstantConsultationRequestResponse,
    Error,
    InstantConsultationRequestPayload
  >({
    mutationKey: ["instant-consultation-request"],
    mutationFn: (data) =>
      apiFetch<InstantConsultationRequestResponse>(
        "/public/instant-consultations/request",
        { method: "POST", body: data },
      ),
  });
}

/**
 * POST /public/instant-consultations/request-any
 */
export function useInstantConsultationRequestAny() {
  return useMutation<
    InstantConsultationRequestResponse,
    Error,
    InstantConsultationRequestAnyPayload
  >({
    mutationKey: ["instant-consultation-request-any"],
    mutationFn: (data) =>
      apiFetch<InstantConsultationRequestResponse>(
        "/public/instant-consultations/request-any",
        { method: "POST", body: data },
      ),
  });
}

/**
 * GET /public/instant-consultations/{guestToken}/status
 * Polls every 3 s while enabled; stops automatically on terminal statuses.
 */
export function useInstantConsultationStatus(
  guestToken: string | null,
  enabled = true,
) {
  return useQuery<InstantConsultationStatusResponse>({
    queryKey: ["instant-consultation-status", guestToken],
    queryFn: () =>
      apiFetch<InstantConsultationStatusResponse>(
        `/public/instant-consultations/${guestToken}/status`,
      ),
    enabled: !!guestToken && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === "accepted" ||
        status === "declined" ||
        status === "withdrawn" ||
        status === "expired" ||
        status === "completed" ||
        status === "rejected" ||
        status === "cancelled"
      ) {
        return false;
      }
      return 3_000;
    },
    staleTime: 0,
  });
}

/**
 * POST /public/instant-consultations/pay/:id
 */
export function useInstantConsultationPay() {
  return useMutation<InstantConsultationPayResponse, Error, number>({
    mutationKey: ["instant-consultation-pay"],
    mutationFn: (id: number) =>
      apiFetch<InstantConsultationPayResponse>(
        `/public/instant-consultations/pay/${id}`,
        { method: "POST" },
      ),
  });
}

/**
 * POST /public/payments/check-invoice/:invoiceNumber
 * Single-shot check — call once per tick. Used by useInvoicePoller internally.
 */
export function useCheckInvoice() {
  return useMutation<CheckInvoiceResponse, Error, string>({
    mutationKey: ["check-invoice"],
    mutationFn: (invoiceNumber: string) =>
      apiFetch<CheckInvoiceResponse>(
        `/public/payments/check-invoice/${encodeURIComponent(invoiceNumber)}`,
        { method: "POST" },
      ),
  });
}

// ─── useInvoicePoller ─────────────────────────────────────────────────────────

interface InvoicePollerOptions {
  /** How long to wait between checks. Default: 3000 ms */
  intervalMs?: number;
  /** Give up after this many attempts. Default: 20 (~1 min at 3 s) */
  maxAttempts?: number;
}

interface UseInvoicePollerResult {
  /** Start polling. Cancels any in-flight poll first. */
  start: (
    invoiceNumber: string,
    onPaid: () => void,
    onFailed: (msg: string) => void,
    options?: InvoicePollerOptions,
  ) => void;
  /** Stop polling. Safe to call even when nothing is running. */
  cancel: () => void;
}

/**
 * Drives repeated calls to `useCheckInvoice` on a timer until the invoice is
 * paid, the attempt limit is reached, or `cancel()` is called.
 *
 * Uses `apiFetch` via the `useCheckInvoice` mutation — same auth/error
 * handling as every other hook in this file.
 *
 * @example
 * const invoicePoller = useInvoicePoller();
 *
 * invoicePoller.start(payRes.invoice_number,
 *   () => setPhase("polling"),
 *   (msg) => { setErrorMsg(msg); setPhase("payment"); },
 * );
 *
 * // On unmount / retry:
 * invoicePoller.cancel();
 */
export function useInvoicePoller(): UseInvoicePollerResult {
  const { mutateAsync: checkInvoice } = useCheckInvoice();

  // Holds the active cancel token so start/cancel don't need to close over state
  const cancelledRef = useRef(false);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (
      invoiceNumber: string,
      onPaid: () => void,
      onFailed: (msg: string) => void,
      {
        intervalMs  = 3_000,
        maxAttempts = 20,
      }: InvoicePollerOptions = {},
    ) => {
      // Cancel any previous poll before starting fresh
      cancel();
      cancelledRef.current = false;

      let attempts = 0;

      const tick = async () => {
        if (cancelledRef.current) return;
        attempts++;

        try {
          const data = await checkInvoice(invoiceNumber);

          if (cancelledRef.current) return;

          if (data.status === "paid") {
            onPaid();
            return;
          }

          if (attempts >= maxAttempts) {
            onFailed(
              "Payment verification timed out. If you completed payment, please wait a moment and try again.",
            );
            return;
          }
        } catch {
          if (cancelledRef.current) return;

          if (attempts >= maxAttempts) {
            onFailed(
              "Could not verify payment status. Please check your connection and try again.",
            );
            return;
          }
        }

        // Schedule next tick only if still active
        if (!cancelledRef.current) {
          timerRef.current = setTimeout(tick, intervalMs);
        }
      };

      // First tick after one interval (mirrors original behaviour)
      timerRef.current = setTimeout(tick, intervalMs);
    },
    [cancel, checkInvoice],
  );

  return { start, cancel };
}
