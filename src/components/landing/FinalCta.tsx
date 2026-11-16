import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Video, Calendar } from "lucide-react";
import { Reveal, landingShell } from "./LandingMotion";

export default function FinalCta() {
  const { t } = useTranslation();
  return (
    <section id="start" className="scroll-mt-24 bg-background py-14 sm:py-16 md:py-20">
      <div className={landingShell}>
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-[hsl(var(--charcoal))] px-5 py-8 text-[hsl(var(--charcoal-foreground))] sm:px-8 sm:py-10">
            <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("pages.landing.final_cta_title")}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              {t("pages.landing.final_cta_sub")}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/patient/search-doctors?instant=true"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Video className="h-4 w-4" aria-hidden="true" />
                {t("pages.landing.join_instant_consultation")}
              </Link>
              <Link
                to="/patient/search-doctors"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {t("pages.landing.book_appointment")}
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
