import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Video, Calendar } from "lucide-react";
import { Reveal, landingShell } from "./LandingMotion";

export default function FinalCta() {
  const { t } = useTranslation();
  return (
    <section id="start" className="scroll-mt-24 py-16 md:py-20 lg:py-24">
      <div className={landingShell}>
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-[linear-gradient(145deg,hsl(172_76%_28%),hsl(192_55%_22%))] px-6 py-10 text-white shadow-[0_24px_60px_-28px_hsl(172_60%_18%/0.7)] sm:px-10 sm:py-12">
            <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {t("pages.landing.final_cta_title")}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/90">
              {t("pages.landing.final_cta_sub")}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/patient/search-doctors?instant=true"
                className="landing-cta inline-flex items-center justify-center gap-2 bg-white px-5 text-sm font-semibold text-[hsl(172_76%_24%)] hover:bg-white/90"
              >
                <Video className="h-4 w-4" aria-hidden="true" />
                {t("pages.landing.join_instant_consultation")}
              </Link>
              <Link
                to="/patient/search-doctors"
                className="landing-cta inline-flex items-center justify-center gap-2 border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10"
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
