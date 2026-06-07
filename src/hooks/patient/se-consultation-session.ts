/**
 * use-consultation-session.ts
 *
 * Persists an in-flight instant consultation token to sessionStorage so that
 * if the user accidentally closes the ConnectDialog while waiting, they can
 * reopen it and resume polling from exactly where they left off.
 *
 * Key shape:  "consult_session:<doctorId>"
 * Value shape: ConsultSession (JSON)
 *
 * Lifetime: sessionStorage — cleared automatically when the tab/window closes,
 * so stale tokens never survive a full browser restart.
 */

import { useCallback } from "react";

export interface ConsultSession {
  token: string;
  doctorId: number;
  guestName: string;
  guestPhone: string;
  savedAt: number; // Date.now() — used to detect sessions older than TTL
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes — roughly max queue wait time

const key = (doctorId: number) => `consult_session:${doctorId}`;

// ─── Read ──────────────────────────────────────────────────────────────────────

export function readConsultSession(doctorId: number): ConsultSession | null {
  try {
    const raw = sessionStorage.getItem(key(doctorId));
    if (!raw) return null;
    const session: ConsultSession = JSON.parse(raw);
    // Discard sessions that are too old — the token has likely expired
    if (Date.now() - session.savedAt > TTL_MS) {
      sessionStorage.removeItem(key(doctorId));
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useConsultationSession(doctorId: number) {
  const save = useCallback((token: string, guestName: string, guestPhone: string) => {
    try {
      const session: ConsultSession = { token, doctorId, guestName, guestPhone, savedAt: Date.now() };
      sessionStorage.setItem(key(doctorId), JSON.stringify(session));
    } catch {
      // sessionStorage unavailable (private mode quota, etc.) — degrade silently
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

  return { save, clear, read };
}


