// Global "Join your consultation" pill.
//
// When a patient has an in-flight instant consultation saved (they sent a
// request and it's waiting/accepted), this floating pill appears on EVERY page
// so they can jump back in and join — not only on a page that happens to render
// that doctor's card. Clicking it reopens the same ConnectDialog flow, which
// resumes from the saved session (queue → accepted → Join), then hands off to
// the global call overlay once the call starts.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Phone, Wifi } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConnectDialogContent } from "@/components/ConnectDialog";
import { useCallContext } from "@/context/CallContext";
import { apiFetch } from "@/lib/api";
import { decodeCallToken } from "@/lib/scheduled-call";
import {
  readConsultSession,
  pruneIfEnded,
  type ConsultSession,
} from "@/hooks/patient/se-consultation-session";
import type { Doctor } from "@/context/CallStore";
import { toast } from "sonner";
import { useMe } from "@/hooks/useAuth";

const PREFIX = "consult_session:";

interface ActiveQuickInstant {
  id: number;
  doctorName?: string;
  doctorId?: number;
}

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
  const { activeCall, startCall } = useCallContext();
  const { data: user, isLoading: userLoading } = useMe();
  const [session, setSession] = useState<ConsultSession | null>(null);
  const [activeInstant, setActiveInstant] = useState<ActiveQuickInstant | null>(null);
  const [open, setOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [quickForbidden, setQuickForbidden] = useState(false);

  useEffect(() => {
    setQuickForbidden(false);
  }, [user?.role]);

  // Poll localStorage for an in-flight instant session.
  useEffect(() => {
    const hasToken = !!localStorage.getItem("auth_token");
    const isPatient = user?.role === "patient";

    if (hasToken && userLoading) return;

    if (hasToken && !isPatient) {
      setSession(null);
      setActiveInstant(null);
      return;
    }

    const check = async () => {
      const found = scanSessions();
      if (found) {
        // The doctor may have completed/declined this consultation while the
        // pill wasn't being watched — verify before offering to resume it.
        const ended = await pruneIfEnded(found);
        setSession(ended ? null : found);
      } else {
        setSession(null);
      }

      if (!hasToken) {
        setActiveInstant(null);
        return;
      }

      if (quickForbidden) return;

      try {
        const res = await apiFetch<{ data: Array<any> }>("/patient/quick");
        const match = (res?.data ?? []).find(
          (item) =>
            item?.booking_type === "instant" &&
            (item?.status === "in_progress" || item?.status === "confirmed"),
        );
        setActiveInstant(
          match
            ? {
                id: Number(match.id),
                doctorId: match?.doctor?.id != null ? Number(match.doctor.id) : undefined,
                doctorName: match?.doctor?.user?.name,
              }
            : null,
        );
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 403) setQuickForbidden(true);
        setActiveInstant(null);
      }
    };
    check();
    const id = setInterval(check, 4000);
    return () => clearInterval(id);
  }, [quickForbidden, user?.role, userLoading]);

  const handleQuickJoin = useCallback(async () => {
    if (!activeInstant) return;
    setJoining(true);
    try {
      const detail = await apiFetch<any>(`/patient/quick/${activeInstant.id}`);
      const decoded = decodeCallToken(detail?.daily_guest_token);
      const roomName = detail?.daily_room_name || decoded?.room;

      if (decoded && roomName) {
        decoded.consultation_id = Number(activeInstant.id);
        decoded.is_owner = false;
        startCall(roomName, decoded);
        return;
      }

      if (detail?.daily_room_url) {
        window.open(detail.daily_room_url, "_blank", "noopener,noreferrer");
        return;
      }

      toast.error("Could not open your active consultation.");
    } catch (err) {
      toast.error((err as Error)?.message || "Could not join your active consultation.");
    } finally {
      setJoining(false);
    }
  }, [activeInstant, startCall]);

  // Hide while a real call overlay is already up, or while the dialog is open.
  const showPill = (!!activeInstant || !!session) && !activeCall && !open;

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
            onClick={activeInstant ? handleQuickJoin : () => setOpen(true)}
            disabled={joining}
            className="fixed bottom-16 left-5 z-[9980] flex items-center gap-2 rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 pl-3 pr-4 py-2.5 text-[12px] font-semibold transition-all active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : activeInstant ? <Phone className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
            {activeInstant ? "Quick join" : "Join your consultation"}
            {activeInstant?.doctorName && (
              <span className="hidden sm:inline max-w-[160px] truncate text-white/75">
                {activeInstant.doctorName}
              </span>
            )}
          </button>,
          document.body,
        )}

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent
          className="p-0 border-0 overflow-hidden sm:max-w-md w-full max-h-[calc(100dvh-2rem)] bg-card shadow-2xl"
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
