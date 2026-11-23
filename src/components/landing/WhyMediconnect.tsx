import { useTranslation } from "react-i18next";
import { Calendar, Activity, Stethoscope, Pill } from "lucide-react";
import { Reveal, landingShell } from "./LandingMotion";

const REASONS = [
  { icon: Calendar, title: "f_smart_booking_t", text: "f_smart_booking_d" },
  { icon: Activity, title: "f_instant_t", text: "f_instant_d" },
  { icon: Stethoscope, title: "f_records_t", text: "f_records_d" },
  { icon: Pill, title: "f_pharmacy_t", text: "f_pharmacy_d" },
] as const;

export default function WhyMediconnect() {
  const { t } = useTranslation();
  return (
    <section id="why" className="scroll-mt-24 py-16 md:py-20 lg:py-24">
      <div className={landingShell}>
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {t("pages.landing.features_title")}
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("pages.landing.services_showcase_title")}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {REASONS.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.title} delay={index * 0.05}>
                <article className="landing-card flex h-full min-w-0 gap-4 border border-border/80 bg-card p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground">{t(`pages.landing.${reason.title}`)}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`pages.landing.${reason.text}`)}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
