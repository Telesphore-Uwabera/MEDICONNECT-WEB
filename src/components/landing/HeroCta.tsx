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

const HeroCta = () => {
  const { t } = useTranslation();
  const { data: user } = useMe();
  const [connectOpen, setConnectOpen] = useState(false);

  // ── Authenticated: show dashboard shortcut ──────────

  if (user) {
    return (
      <>
        <div className="mt-7 flex flex-col gap-4 
         w-full">
          <div className="grid grid-cols-2 gap-4">

            {/* /patient/search-doctors instant */}
            <button onClick={() => setConnectOpen(true)} className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-5 rounded-2xl bg-[#0A0E27] text-white hover:scale-[1.02] transition-all duration-300 group shadow-lg border border-[#1D1D1D]/20 hover:shadow-xl">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#FB9129] to-[#FF9B00] text-[#0A0E27] shrink-0 shadow-inner">
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-sm sm:text-base font-bold leading-tight truncate">
                    {t(
                      "pages.landing.instant_consultation",
                      "Instant Consultation",
                    )}
                  </p>
                  <p className="text-[11px] sm:text-xs text-white/70 mt-1 truncate font-medium">
                    {t("pages.landing.title", "connect in under 5 minutes")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300 shrink-0" />
            </button>

            <Link to="/patient/search-doctors" className="w-full">
              <button className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-5 rounded-2xl bg-[#0A0E27] text-white hover:scale-[1.02] transition-all duration-300 group shadow-lg border border-[#1D1D1D]/20 hover:shadow-xl">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#00ABAB] to-[#009191] text-white shrink-0 shadow-inner">
                    <Stethoscope className="h-5 w-5" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-sm sm:text-base font-bold leading-tight truncate">
                      {t("pages.landing.browse_doctors")}
                    </p>
                    <p className="text-[11px] sm:text-xs text-white/70 mt-1 truncate font-medium">
                      500+ specialists
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all duration-300 shrink-0" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-1">
            <Link to="/patient/search-pharmacy" className="group w-full">
              <button className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-5 rounded-2xl border border-border bg-card/80 backdrop-blur-sm hover:border-[#6672C7]/40 hover:bg-accent hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#6672C7]/10 text-[#6672C7] shrink-0 group-hover:bg-[#6672C7] group-hover:text-white transition-colors duration-300">
                    <Pill className="h-5 w-5" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-sm sm:text-base font-bold text-foreground leading-tight truncate group-hover:text-[#6672C7] transition-colors duration-300">
                      {t("pages.landing.open_marketplace")}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate font-medium">
                      500+ pharmacies
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 text-[#6672C7] transition-all duration-300 shrink-0" />
              </button>
            </Link>

            <Link to="/patient/search-facilities" className="group w-full">
              <button className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-5 rounded-2xl border border-border bg-card/80 backdrop-blur-sm hover:border-[#eb5757]/40 hover:bg-accent hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#eb5757]/10 text-[#eb5757] shrink-0 group-hover:bg-[#eb5757] group-hover:text-white transition-colors duration-300">
                    <Hospital className="h-5 w-5" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-sm sm:text-base font-bold text-foreground leading-tight truncate group-hover:text-[#eb5757] transition-colors duration-300">
                      {t("pages.landing.see_all_hospitals")}
                    </p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate font-medium">
                      Top-rated near you
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 text-[#eb5757] transition-all duration-300 shrink-0" />
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
            className="p-0 border-0 overflow-hidden sm:max-w-md w-full bg-card/80 backdrop-blur-2xl shadow-2xl"
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
      <div className="mt-7 flex flex-col gap-4 w-full">
        {/* <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setConnectOpen(true)} className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-white/15 shrink-0">
                <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
              <div className="text-left min-w-0">
                <p className="text-xs sm:text-sm font-semibold leading-none truncate">
                  {t("pages.landing.instant_consultation", "Instant Consultation")}
                </p>
                <p className="text-[10px] sm:text-[11px] text-primary-foreground/70 mt-0.5 truncate">
                  {t("pages.landing.title", "connect in under 5 minutes")}
                </p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          <Link to="/patient/search-doctors">
            <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-white/15 shrink-0">
                  <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold leading-none truncate">
                    {t("pages.landing.browse_doctors")}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-primary-foreground/70 mt-0.5 truncate">
                    500+ specialists
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </Link>
        </div> */}

        <div className="grid grid-cols-2 gap-4">
          <Link to="/patient/search-pharmacy" className="group w-full">
            <button className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-5 rounded-2xl border border-border bg-card/80 backdrop-blur-sm hover:border-[#6672C7]/40 hover:bg-accent hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#6672C7]/10 text-[#6672C7] shrink-0 group-hover:bg-[#6672C7] group-hover:text-white transition-colors duration-300">
                  <Pill className="h-5 w-5" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-sm sm:text-base font-bold text-foreground leading-tight truncate group-hover:text-[#6672C7] transition-colors duration-300">
                    {t("pages.landing.open_marketplace")}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate font-medium">
                    500+ pharmacies
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 text-[#6672C7] transition-all duration-300 shrink-0" />
            </button>
          </Link>

          <Link to="/patient/search-facilities" className="group w-full">
            <button className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 sm:py-5 rounded-2xl border border-border bg-card/80 backdrop-blur-sm hover:border-[#eb5757]/40 hover:bg-accent hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#eb5757]/10 text-[#eb5757] shrink-0 group-hover:bg-[#eb5757] group-hover:text-white transition-colors duration-300">
                  <Hospital className="h-5 w-5" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-sm sm:text-base font-bold text-foreground leading-tight truncate group-hover:text-[#eb5757] transition-colors duration-300">
                    {t("pages.landing.see_all_hospitals")}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate font-medium">
                    Top-rated near you
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 text-[#eb5757] transition-all duration-300 shrink-0" />
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
          className="p-0 border-0 overflow-hidden sm:max-w-md w-full bg-card/80 backdrop-blur-2xl shadow-2xl"
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

export default HeroCta;
