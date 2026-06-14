import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ActiveCall {
  roomName: string;
  token: any;
}

/** A scheduled appointment whose call just ended and that the doctor must now
 *  finalize (required medical record → optional hospital booking → complete). */
export interface PendingCompletion {
  appointmentId: number;
}

interface CallContextType {
  activeCall: ActiveCall | null;
  isMinimized: boolean;
  startCall: (roomName: string, token: any) => void;
  endCall: () => void;
  toggleMinimize: () => void;
  setMinimized: (val: boolean) => void;
  /** Set when a doctor ends a scheduled-appointment call; drives the global
   *  completion flow (record + booking). Null for instant or patient-ended calls. */
  pendingCompletion: PendingCompletion | null;
  requestAppointmentCompletion: (info: PendingCompletion) => void;
  clearAppointmentCompletion: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// ── Persistence ──────────────────────────────────────────────────────────────
// The active call lives in memory, so a full page refresh (or accidental
// reload) would otherwise drop the user from a call that's still live on the
// server. We persist it to sessionStorage so the call overlay restores on
// reload and the participant automatically rejoins. sessionStorage (rather than
// localStorage) keeps the TURN credentials in the token on disk only for the
// life of the tab — it survives a refresh but is cleared when the tab closes,
// which limits credential exposure. Trade-off: no cross-tab mirroring and the
// call won't restore after a full browser restart.
const STORAGE_KEY = "active_call_session";
// Safety expiry so a stale call can't resurrect hours later within the same
// tab if it was never explicitly ended.
const CALL_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

interface PersistedCall {
  roomName: string;
  token: any;
  startedAt: number;
}

function loadPersistedCall(): ActiveCall | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCall;
    if (!parsed?.roomName || !parsed?.token) return null;
    if (Date.now() - (parsed.startedAt ?? 0) > CALL_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { roomName: parsed.roomName, token: parsed.token };
  } catch {
    return null;
  }
}

function persistCall(call: ActiveCall) {
  try {
    const payload: PersistedCall = {
      roomName: call.roomName,
      token: call.token,
      startedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable — call still works for this session */
  }
}

function clearPersistedCall() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function CallProvider({ children }: { children: ReactNode }) {
  // Restore any in-progress call on first mount so a refresh rejoins it.
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(() => loadPersistedCall());
  const [isMinimized, setIsMinimized] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState<PendingCompletion | null>(null);

  const requestAppointmentCompletion = useCallback((info: PendingCompletion) => {
    setPendingCompletion(info);
  }, []);
  const clearAppointmentCompletion = useCallback(() => {
    setPendingCompletion(null);
  }, []);

  const startCall = useCallback((roomName: string, token: any) => {
    const call = { roomName, token };
    persistCall(call);
    setActiveCall(call);
    setIsMinimized(false);
  }, []);

  const endCall = useCallback(() => {
    clearPersistedCall();
    setActiveCall(null);
    setIsMinimized(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        isMinimized,
        startCall,
        endCall,
        toggleMinimize,
        setMinimized: setIsMinimized,
        pendingCompletion,
        requestAppointmentCompletion,
        clearAppointmentCompletion,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallContext must be used within a CallProvider");
  }
  return context;
}
