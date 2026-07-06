import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Video,
  Stethoscope,
  Pill,
  Hospital,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMe } from "@/hooks/useAuth";
import { ConnectDialogContent } from "../ConnectDialog";

const StartConsult = () => {
  const { t } = useTranslation();
  const { data: user } = useMe();
  const [connectOpen, setConnectOpen] = useState(false);

  // ── Authenticated: show dashboard shortcut ──────────

  if (user) {
    return (
      <>
        <div className="mt-7 flex flex-col gap-3 
         w-full">
          <div className="grid grid-cols-2 gap-3">

            {/* /patient/search-doctors instant */}
            {/* <button onClick={() => setConnectOpen(true)} className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-[6px] bg-white/15 shrink-0">
                  <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold leading-none">
                    {t(
                      "pages.landing.instant_consultation",
                      "Instant Consultation",
                    )}
                  </p>
                  <p className="hidden sm:block text-[10px] sm:text-[11px] text-primary-foreground/70 mt-0.5">
                    {t("pages.landing.title", "connect in under 5 minutes")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button> */}

            <Link to="/patient/search-doctors?instant=true">
              <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-[6px] bg-white/15 shrink-0">
                    <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-xs sm:text-sm font-semibold leading-none">
                      {t(
                        "pages.landing.instant_consultation",
                        "Instant Consultation",
                      )}
                    </p>
                    <p className="hidden sm:block text-[10px] sm:text-[11px] text-primary-foreground/70 mt-0.5">
                      {t("pages.landing.title", "connect in under 5 minutes")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </Link>
            <Link to="/patient/search-doctors">
              <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-[6px] bg-white/15 shrink-0">
                    <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-xs sm:text-sm font-semibold leading-none">
                      {t("pages.landing.browse_doctors")}
                    </p>
                    <p className="hidden sm:block text-[10px] sm:text-[11px] text-primary-foreground/70 mt-0.5">
                      500+ specialists
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </Link>
          </div>
        </div>
        {/* modal={false} is required so the IremboPay widget (rendered outside this
          dialog) stays interactive — a modal Radix dialog sets pointer-events:none
          on everything outside it and traps focus, which blocks typing/clicking in
          the payment widget. We still prevent outside-click/Escape from closing it.
          Because modal=false disables the Radix overlay, we add our own manual overlay. */}
        {connectOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md pointer-events-none" />
        )}
        <Dialog open={connectOpen} onOpenChange={setConnectOpen} modal={false}>
          <DialogContent
            className="p-0 border-0 overflow-hidden sm:max-w-md w-full max-h-[calc(100dvh-2rem)] bg-card/80 backdrop-blur-2xl shadow-2xl"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            {connectOpen && (
              <ConnectDialogContent
                onMinimize={() => setConnectOpen(false)}
                onCloseCompletely={() => setConnectOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── Guest: show sign up / browse CTAs ───────────────
  return (
    <>
      <div className="mt-7 flex flex-col gap-3  w-full">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/patient/search-doctors?instant=true">
            <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-[6px] bg-white/15 shrink-0">
                  <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold leading-none">
                    {t(
                      "pages.landing.instant_consultation",
                      "Instant Consultation",
                    )}
                  </p>
                  <p className="hidden sm:block text-[10px] sm:text-[11px] text-primary-foreground/70 mt-0.5">
                    {t("pages.landing.title", "connect in under 5 minutes")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </Link>

          <Link to="/patient/search-doctors">
            <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-[6px] bg-white/15 shrink-0">
                  <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold leading-none">
                    {t("pages.landing.book_appointment")}
                  </p>
                  <p className="hidden sm:block text-[10px] sm:text-[11px] text-primary-foreground/70 mt-0.5">
                    500+ specialists
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </Link>
        </div>


      </div>
      {/* modal={false} is required so the IremboPay widget (rendered outside this
          dialog) stays interactive — a modal Radix dialog sets pointer-events:none
          on everything outside it and traps focus, which blocks typing/clicking in
          the payment widget. We still prevent outside-click/Escape from closing it.
          Because modal=false disables the Radix overlay, we add our own manual overlay. */}
      {connectOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md pointer-events-none" />
      )}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen} modal={false}>
        <DialogContent
          className="p-0 border-0 overflow-hidden sm:max-w-md w-full max-h-[calc(100dvh-2rem)] bg-card/80 backdrop-blur-2xl shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {connectOpen && (
            <ConnectDialogContent
              onMinimize={() => setConnectOpen(false)}
              onCloseCompletely={() => setConnectOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StartConsult;
