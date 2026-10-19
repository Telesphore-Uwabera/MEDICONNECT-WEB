import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import {
  SESSION_ENDED_EVENT,
  getAuthToken,
  subscribeToRemoteSession,
} from "@/lib/auth-session";

const TAKEOVER_MESSAGE =
  "You were signed out because this account signed in on another tab or device.";

/**
 * Keeps one live MediConnect session:
 * - other tabs close the previous account when a new login happens
 * - another device signing into the same account invalidates this session
 */
export function useSessionSync() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let applying = false;
    const leaveToAuth = (message: string) => {
      if (applying) return;
      applying = true;
      qc.clear();
      if (location.pathname === "/auth") return;
      navigate("/auth", {
        replace: true,
        state: { reason: "session_replaced", message },
      });
    };

    const unsub = subscribeToRemoteSession((change) => {
      if (change.type === "logout") {
        leaveToAuth(TAKEOVER_MESSAGE);
        return;
      }
      if (applying) return;
      applying = true;
      qc.clear();
      window.location.reload();
    });

    const onEnded = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      leaveToAuth(detail?.message || TAKEOVER_MESSAGE);
    };
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);

    const verify = () => {
      if (!getAuthToken()) return;
      apiFetch("/auth/me").catch(() => null);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") verify();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", verify);
    const interval = window.setInterval(verify, 20_000);

    return () => {
      unsub();
      window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", verify);
      window.clearInterval(interval);
    };
  }, [qc, navigate, location.pathname]);
}
