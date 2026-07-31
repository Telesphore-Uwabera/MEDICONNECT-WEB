import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Video, Calendar, ArrowRight, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMe } from "@/hooks/useAuth";
import { ConnectDialogContent } from "../ConnectDialog";

const StartConsult = () => {
  const { t } = useTranslation();
  // `user` isn't currently used to branch the CTAs (both signed-in and guest
  // visitors land on the same search flow), but it's kept wired up here so
  // the hero can special-case authenticated users later without re-plumbing.
  useMe();
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <>
      <div className="mt-6 flex w-full flex-col gap-3">
        {/* Primary CTAs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/patient/search-doctors?instant=true"
            className="group flex items-center justify-between gap-3 rounded-[6px] bg-primary px-4 py-3.5 text-primary-foreground shadow-md transition hover:opacity-90"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-white/15">
                <Video className="h-4 w-4" />
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold leading-none">
                  {t(
                    "pages.landing.instant_consultation",
                    "Instant Consultation",
                  )}
                </p>
                <p className="mt-1 truncate text-[11px] text-primary-foreground/70">
                  {t(
                    "pages.landing.instant_consultation_sub",
                    "Connect with a doctor in seconds.",
                  )}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-100 p-2 rounded-full text-primary">
              <ArrowRight className="h-4 w-4 shrink-0  transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>

          <Link
            to="/patient/search-doctors"
            className="group flex items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-4 py-3.5 text-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </span>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold leading-none">
                  {t("pages.landing.book_appointment")}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {t(
                    "pages.landing.book_appointment_sub",
                    "Schedule your convenient time.",
                  )}
                </p>
              </div>
            </div>

            <div className="bg-primary p-2 rounded-full text-gray-100">
              <ArrowRight className="h-4 w-4 shrink-0  transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>

        {/* Download app row */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-[6px] border border-border bg-card/60 px-4 py-3.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
              <Download className="h-4 w-4" />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold leading-none text-foreground">
                {t("pages.landing.download_app")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t(
                  "pages.landing.download_app_sub",
                  "Access healthcare anytime, anywhere.",
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="#"
              className="flex h-9 items-center justify-center overflow-hidden rounded-[6px] bg-black"
            >
              <img
                src="/images/apple.png"
                alt={t("pages.landing.app_store_alt")}
                className="h-9 w-auto object-contain"
              />
            </a>
            <a
              href="#"
              className="flex h-9 items-center justify-center overflow-hidden rounded-[6px] bg-black"
            >
              <img
                src="/images/android.png"
                alt={t("pages.landing.google_play_alt")}
                className="h-9 w-auto object-contain"
              />
            </a>
          </div>
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
