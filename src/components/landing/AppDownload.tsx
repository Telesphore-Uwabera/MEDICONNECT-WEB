import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Reveal, landingShell } from "./LandingMotion";
import { StoreBadge } from "./StoreBadge";

const POINTS = [
  "pocket_manage_appointments",
  "pocket_consult_doctors",
  "pocket_access_prescriptions",
  "pocket_track_history",
] as const;

export default function AppDownload() {
  const { t } = useTranslation();
  return (
    <section id="download" className="page-section scroll-mt-24">
      <div className={landingShell}>
        <Reveal>
          <div className="landing-card grid items-center gap-8 overflow-hidden border border-border/80 bg-card p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {t("pages.landing.download_app")}
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {t("pages.landing.healthcare_pocket_title")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {t("pages.landing.download_app_sub")}
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {POINTS.map((key) => (
                  <li key={key} className="flex min-h-11 items-center gap-2 text-sm font-medium text-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {t(`pages.landing.${key}`)}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <StoreBadge
                  href={import.meta.env.VITE_APP_STORE_URL}
                  src="/images/apple.png"
                  alt={t("pages.landing.app_store_alt")}
                  soonLabel={t("pages.landing.store_coming_soon")}
                  className="flex h-11 min-h-11 items-center gap-1.5 overflow-hidden rounded-[6px] bg-black/80 px-2"
                />
                <StoreBadge
                  href={import.meta.env.VITE_PLAY_STORE_URL}
                  src="/images/android.png"
                  alt={t("pages.landing.google_play_alt")}
                  soonLabel={t("pages.landing.store_coming_soon")}
                  className="flex h-11 min-h-11 items-center gap-1.5 overflow-hidden rounded-[6px] bg-black/80 px-2"
                />
              </div>
            </div>
            <div className="mx-auto w-full max-w-[220px]">
              <img
                src="/images/phone.png"
                alt={t("pages.landing.mobile_app_alt")}
                width={224}
                height={396}
                loading="lazy"
                decoding="async"
                className="h-auto w-full max-w-full"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
