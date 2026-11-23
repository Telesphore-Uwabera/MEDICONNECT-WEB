import { useTranslation } from "react-i18next";
import { UserPlus, Stethoscope, HeartPulse } from "lucide-react";
import { Reveal, landingShell } from "./LandingMotion";

const STEPS = [
  { icon: UserPlus, title: "step_create_title", text: "step_create_text" },
  { icon: Stethoscope, title: "step_consult_title", text: "step_consult_text" },
  { icon: HeartPulse, title: "step_care_title", text: "step_care_text" },
] as const;

export default function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section id="how-it-works" className="scroll-mt-24 py-16 md:py-20 lg:py-24">
      <div className={landingShell}>
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {t("pages.landing.how_it_works")}
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("pages.landing.how_title")}
          </h2>
        </Reveal>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={index * 0.06}>
                <li className="landing-card flex h-full min-w-0 gap-4 border border-border/80 bg-card p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {index + 1}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-foreground">
                      {t(`pages.landing.${step.title}`)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {t(`pages.landing.${step.text}`)}
                    </p>
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
