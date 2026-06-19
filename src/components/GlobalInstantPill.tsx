// Global "Join your consultation" pill.
//
// When a patient has an in-flight instant consultation saved (they sent a
// request and it's waiting/accepted), this floating pill appears on EVERY page
// so they can jump back in and join — not only on a page that happens to render
// that doctor's card. Clicking it reopens the same ConnectDialog flow, which
// resumes from the saved session (queue → accepted → Join), then hands off to
// the global call overlay once the call starts.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Wifi } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConnectDialogContent } from "@/components/ConnectDialog";
import { useCallContext } from "@/context/CallContext";
import {
  readConsultSession,
  type ConsultSession,
} from "@/hooks/patient/se-consultation-session";
import type { Doctor } from "@/context/CallStore";

const PREFIX = "consult_session:";

/** Find any non-expired saved instant session across all doctors. */
function scanSessions(): ConsultSession | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const id = Number(k.slice(PREFIX.length));
      if (!Number.isFinite(id)) continue;
      const s = readConsultSession(id); // also prunes expired entries
      if (s) return s;
    }
  } catch {
    /* localStorage unavailable */
  }
  return null;
}

export function GlobalInstantPill() {
  const { activeCall } = useCallContext();
  const [session, setSession] = useState<ConsultSession | null>(null);
  const [open, setOpen] = useState(false);

  // Poll localStorage for an in-flight instant session.
  useEffect(() => {
    const check = () => setSession(scanSessions());
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  // Hide while a real call overlay is already up, or while the dialog is open.
  const showPill = !!session && !activeCall && !open;

  // Reconstruct a minimal doctor so ConnectDialogContent reads the right saved
  // session (keyed by doctor id). doctorId 0 means a general "any doctor" request.
  const doctor: Doctor | undefined =
    session && session.doctorId > 0
      ? {
          id: session.doctorId,
          user: { id: 0, name: "your doctor", avatar: null },
          specialization: "",
        }
      : undefined;

  return (
    <>
      {showPill &&
        createPortal(
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-5 left-5 z-[9980] flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 pl-3 pr-4 py-2.5 text-[12px] font-semibold transition-all active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <Wifi className="h-3.5 w-3.5" />
            Join your consultation
          </button>,
          document.body,
        )}

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent
          className="p-0 border-0 overflow-hidden sm:max-w-md w-full bg-card shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {open && (
            <ConnectDialogContent
              doctor={doctor}
              onMinimize={() => setOpen(false)}
              onCloseCompletely={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
