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
    <section id="why" className="scroll-mt-24 bg-gradient-soft py-14 sm:py-16 md:py-20">
      <div className={landingShell}>
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {t("pages.landing.features_title")}
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("pages.landing.services_showcase_title")}
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {REASONS.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <Reveal key={reason.title} delay={index * 0.05}>
                <article className="flex h-full min-w-0 gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:border-primary/30 sm:p-5">
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
