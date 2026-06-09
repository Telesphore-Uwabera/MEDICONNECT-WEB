/**
 * use-consultation-session.ts
 *
 * Persists an in-flight instant consultation to sessionStorage so that if the
 * user closes the dialog mid-flow, they can reopen it and resume exactly where
 * they left off — whether that's waiting in queue or about to pay.
 *
 * Key shape:  "consult_session:<doctorId>"
 * Value shape: ConsultSession (JSON)
 *
 * Lifetime: sessionStorage — cleared automatically when the tab/window closes,
 * so stale tokens never survive a full browser restart.
 */

import { useCallback } from "react";

export interface ConsultSession {
  /** Guest token returned by the request API — used to poll status. */
  token: string;
  doctorId: number;
  guestName: string;
  guestPhone: string;
  /** Date.now() at save time — used to enforce TTL. */
  savedAt: number;

  // ── Payment-pending fields (optional) ─────────────────────────────────────
  // Set when the request succeeded but the user closed before completing payment.
  // If present, reopening the dialog should go straight to the payment step
  // without re-sending the consultation request.
  pendingPayment?: {
    consultationId: number;
    amount: number;
    currency: string;
  };
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes

const key = (doctorId: number) => `consult_session:${doctorId}`;

// ─── Plain read (no hook) ─────────────────────────────────────────────────────

export function readConsultSession(doctorId: number): ConsultSession | null {
  try {
    const raw = sessionStorage.getItem(key(doctorId));
    if (!raw) return null;
    const session: ConsultSession = JSON.parse(raw);
    if (Date.now() - session.savedAt > TTL_MS) {
      sessionStorage.removeItem(key(doctorId));
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConsultationSession(doctorId: number) {
  /** Save a session after the request API succeeds and payment is confirmed. */
  const save = useCallback((token: string, guestName: string, guestPhone: string) => {
    try {
      const session: ConsultSession = { token, doctorId, guestName, guestPhone, savedAt: Date.now() };
      sessionStorage.setItem(key(doctorId), JSON.stringify(session));
    } catch {
      // sessionStorage unavailable (private mode quota, etc.) — degrade silently
    }
  }, [doctorId]);

  /**
   * Save a session after the request API succeeds but BEFORE payment.
   * The pendingPayment block lets the dialog skip re-requesting and go straight
   * to the payment step when the user resumes.
   */
  const saveWithPendingPayment = useCallback((
    token: string,
    guestName: string,
    guestPhone: string,
    consultationId: number,
    amount: number,
    currency: string,
  ) => {
    try {
      const session: ConsultSession = {
        token,
        doctorId,
        guestName,
        guestPhone,
        savedAt: Date.now(),
        pendingPayment: { consultationId, amount, currency },
      };
      sessionStorage.setItem(key(doctorId), JSON.stringify(session));
    } catch {
      // degrade silently
    }
  }, [doctorId]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key(doctorId));
    } catch {
      // ignore
    }
  }, [doctorId]);

  const read = useCallback((): ConsultSession | null => {
    return readConsultSession(doctorId);
  }, [doctorId]);

  return { save, saveWithPendingPayment, clear, read };
}
