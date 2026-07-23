import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Video,
  Stethoscope,
  Pill,
  Hospital,
  ArrowRight,
  ChevronDown,
  Download,
  LayoutDashboard,
  ChevronRight, 
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMe } from "@/hooks/useAuth";
import { ConnectDialogContent } from "../ConnectDialog";
 

const DownloadMobileApp = () => {
  const { t } = useTranslation();

  const [appDownloadOpen, setAppDownloadOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setAppDownloadOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAppDownloadOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setAppDownloadOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-[6px] bg-primary px-3 py-2.5 text-primary-foreground shadow-md transition hover:opacity-90"
        aria-expanded={appDownloadOpen}
        aria-haspopup="menu"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-white/15">
            <Download className="h-4 w-4" />
          </span>

          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold leading-none">
              {t("pages.landing.download_app")}
            </p>

            <p className="mt-1 hidden text-[11px] text-primary-foreground/70 sm:block">
              {t("pages.landing.choose_store")}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-80 transition-transform duration-200 ${
            appDownloadOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {appDownloadOpen && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+0.6rem)]  overflow-hidden rounded-[6px] border border-border bg-card p-2 shadow-2xl z-50"
        > 

          <div className="grid gap-2">
            <a
              href="#"
              role="menuitem"
              onClick={() => setAppDownloadOpen(false)}
              className="group flex  items-center gap-3 rounded-[6px] border border-border bg-background  px-3 py-2.5  transition-all hover:border-primary/40 hover:bg-muted/60"
            >
              <div className="flex  shrink-0 items-center justify-center rounded-[6px] bg-black">
                <img
                  src="/images/android.png"
                  alt={t("pages.landing.google_play_alt")}
                  className="max-h-9 max-w-full object-contain"
                />
              </div>

              <div className="min-w-0 lg:block hidden">
                <p className="text-xs text-muted-foreground">
                  Download on
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  Google Play
                </p>
              </div>

              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:block hidden" />
            </a>

            <a
              href="#"
              role="menuitem"
              onClick={() => setAppDownloadOpen(false)}
              className="group flex min-h-[72px] items-center gap-3 rounded-[6px] border border-border bg-background px-3 py-2.5 transition-all hover:border-primary/40 hover:bg-muted/60"
            >
              <div className="flex  shrink-0 items-center justify-center rounded-[6px] bg-black ">
                <img
                  src="/images/apple.png"
                  alt={t("pages.landing.app_store_alt")}
                  className="max-h-9 max-w-full object-contain"
                />
              </div>

              <div className="min-w-0 lg:block hidden">
                <p className="text-xs text-muted-foreground">
                  Download on
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  App Store
                </p>
              </div>

              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:block hidden" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

const StartConsult = () => {
  const { t } = useTranslation();
  const { data: user } = useMe();
  const [connectOpen, setConnectOpen] = useState(false);

  // ── Authenticated: show dashboard shortcut ──────────

  if (user) {
    return (
      <>
        <div
          className="mt-5 flex w-full max-w-[620px] flex-col gap-2.5"
        >
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          
            <Link to="/patient/search-doctors?instant=true">
              <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="flex items-center justify-center h-8 w-8 rounded-[6px] bg-white/15 shrink-0">
                    <LayoutDashboard className="h-3.5 w-3.5" />
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
                <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </Link>
            <DownloadMobileApp />
          </div>
          <Link to="/patient/search-doctors">
            <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="flex items-center justify-center h-8 w-8 rounded-[6px] bg-white/15 shrink-0">
                  <Stethoscope className="h-3.5 w-3.5" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-xs sm:text-sm font-semibold leading-none">
                    {t("pages.landing.book_appointment")}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </Link>
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
      <div className="mt-5 flex w-full max-w-[620px] flex-col gap-2.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Link to="/patient/search-doctors?instant=true">
            <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="flex items-center justify-center h-8 w-8 rounded-[6px] bg-white/15 shrink-0">
                  <LayoutDashboard className="h-3.5 w-3.5" />
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
              <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </Link>

          <DownloadMobileApp />
        </div>

        <Link to="/patient/search-doctors">
          <button className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 py-2.5 rounded-[6px] bg-primary text-primary-foreground hover:opacity-90 transition-smooth group shadow-medium">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="flex items-center justify-center h-8 w-8 rounded-[6px] bg-white/15 shrink-0">
                <Stethoscope className="h-3.5 w-3.5" />
              </span>
              <div className="text-left min-w-0">
                <p className="text-xs sm:text-sm font-semibold leading-none">
                  {t("pages.landing.book_appointment")}
                </p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </Link>
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
