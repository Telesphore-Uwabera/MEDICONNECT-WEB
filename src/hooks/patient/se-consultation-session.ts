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
 * Lifetime: localStorage — persists across tabs and windows, 
 * automatically pruned by TTL to prevent stale tokens.
 */

import { useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface ConsultSession {
  /** Guest token returned by the request API — used to poll status. */
  token: string;
  doctorId: number;
  guestName: string;
  guestPhone: string;
  consultationId: number | null;
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
    const raw = localStorage.getItem(key(doctorId));
    if (!raw) return null;
    const session: ConsultSession = JSON.parse(raw);
    if (Date.now() - session.savedAt > TTL_MS) {
      localStorage.removeItem(key(doctorId));
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ─── Prune ended sessions ─────────────────────────────────────────────────────
//
// A saved session only tracks what the patient's browser last knew — it has no
// idea the doctor accepted, then completed (or declined/cancelled) the
// consultation while the patient wasn't looking at the dialog. Left alone,
// the stale entry keeps surfacing "Resume"/"Join your consultation" affordances
// for a session that's actually over, which is confusing. This checks the
// authoritative status by guest token and clears the entry once it's terminal.

const TERMINAL_STATUSES = new Set([
  "declined",
  "withdrawn",
  "expired",
  "completed",
  "rejected",
  "cancelled",
]);

/** Returns true if the session was stale and has been cleared. */
export async function pruneIfEnded(session: ConsultSession): Promise<boolean> {
  try {
    const res = await apiFetch<{ status: string }>(
      `/public/instant-consultations/${session.token}/status`,
    );
    if (TERMINAL_STATUSES.has(res.status)) {
      localStorage.removeItem(key(session.doctorId));
      return true;
    }
  } catch {
    // Ambiguous failure (offline, etc.) — keep the session rather than
    // discarding it on a hunch.
  }
  return false;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConsultationSession(doctorId: number) {
  /** Save a session after the request API succeeds and payment is confirmed. */
  const save = useCallback((token: string, guestName: string, guestPhone: string, consultationId: number | null = null) => {
    try {
      const session: ConsultSession = { token, doctorId, guestName, guestPhone, consultationId, savedAt: Date.now() };
      localStorage.setItem(key(doctorId), JSON.stringify(session));
    } catch {
      // localStorage unavailable (private mode quota, etc.) — degrade silently
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
        consultationId: 0
      };
      localStorage.setItem(key(doctorId), JSON.stringify(session));
    } catch {
      // degrade silently
    }
  }, [doctorId]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key(doctorId));
    } catch {
      // ignore
    }
  }, [doctorId]);

  const read = useCallback((): ConsultSession | null => {
    return readConsultSession(doctorId);
  }, [doctorId]);

  return { save, saveWithPendingPayment, clear, read };
}
