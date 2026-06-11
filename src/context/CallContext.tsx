import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface ActiveCall {
  roomName: string;
  token: any;
}

interface CallContextType {
  activeCall: ActiveCall | null;
  isMinimized: boolean;
  startCall: (roomName: string, token: any) => void;
  endCall: () => void;
  toggleMinimize: () => void;
  setMinimized: (val: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const startCall = useCallback((roomName: string, token: any) => {
    setActiveCall({ roomName, token });
    setIsMinimized(false);
  }, []);

  const endCall = useCallback(() => {
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
