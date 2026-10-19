import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { clearAuthToken, getAuthToken, goToSignIn } from "@/lib/auth-session";

/** Idle activity events we treat as "user is present" */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "touchmove",
  "wheel",
  "scroll",
  "click",
  "focus",
  "visibilitychange",
];

const IDLE_MS = 60 * 60 * 1_000; // 1 hour

/**
 * Automatically logs the user out after IDLE_MS of no interaction.
 * Call this once inside a component that is always mounted when the user is
 * logged in (e.g. inside a DashboardLayout or a top-level AppInner component).
 * It is safe to mount unconditionally — it checks for auth_token itself.
 */
export function useIdleLogout() {
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performLogout = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return; // already logged out

    apiFetch("/auth/logout", { method: "POST" }).catch(() => null);

    clearAuthToken();
    qc.clear();
    goToSignIn(undefined, { reason: "idle_timeout" });
  }, [qc]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    const token = getAuthToken();
    if (!token) return; // not logged in — nothing to do
    timerRef.current = setTimeout(performLogout, IDLE_MS);
  }, [clearTimer, performLogout]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return; // not logged in on mount — skip

    // Start the initial timer
    resetTimer();

    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
    // Only re-run when navigate/qc identity changes (effectively never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the user logs in AFTER this component mounts, restart the timer
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_token") {
        if (e.newValue) {
          resetTimer();
        } else {
          clearTimer();
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [resetTimer, clearTimer]);
}
