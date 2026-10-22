import { Phone, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCallContext } from "@/context/CallContext";

/** Shown after hang-up while the visit is not completed, so either side can rejoin. */
export function PostCallRejoinBar() {
  const { t } = useTranslation();
  const {
    pausedCall,
    activeCall,
    pendingCompletion,
    startCall,
    clearAppointmentCompletion,
  } = useCallContext();

  if (!pausedCall || activeCall || pendingCompletion) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[10000] w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[8px] border border-emerald-500/30 bg-[#111] px-4 py-3 text-white shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <Phone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight">
            {t("consult.call.ended_rejoin_title", "Call ended")}
          </p>
          <p className="text-[11px] text-white/60 leading-snug">
            {t(
              "consult.call.ended_rejoin_hint",
              "You can rejoin until the visit is marked complete.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearAppointmentCompletion();
            startCall(pausedCall.roomName, pausedCall.token);
          }}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-500"
        >
          <Video className="h-3.5 w-3.5" />
          {t("consult.bookings.rejoin", "Rejoin")}
        </button>
      </div>
    </div>
  );
}
