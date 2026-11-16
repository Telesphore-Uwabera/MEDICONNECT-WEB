import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, landingShell } from "./LandingMotion";

const ITEMS = [
  ["faq_consultation_cost_q", "faq_consultation_cost_a"],
  ["faq_medicine_home_q", "faq_medicine_home_a"],
  ["faq_prescriptions_q", "faq_prescriptions_a"],
  ["faq_medication_time_q", "faq_medication_time_a"],
  ["faq_specialists_q", "faq_specialists_a"],
] as const;

export default function LandingFaq() {
  const { t } = useTranslation();
  return (
    <section id="faq" className="scroll-mt-24 bg-gradient-soft py-14 sm:py-16 md:py-20">
      <div className={landingShell}>
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {t("pages.landing.faq_subtitle")}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("pages.landing.faq_title")}
              </h2>
              <Link
                to="/help"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
              >
                {t("pages.landing.visit_help_center")}
              </Link>
            </div>
            <Accordion type="single" collapsible className="min-w-0 rounded-2xl border border-border bg-card px-4 sm:px-5">
              {ITEMS.map(([question, answer]) => (
                <AccordionItem key={question} value={question}>
                  <AccordionTrigger className="min-h-11 py-3 text-left text-sm font-semibold text-foreground hover:no-underline sm:text-base">
                    {t(`pages.landing.${question}`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-6 text-muted-foreground">
                    {t(`pages.landing.${answer}`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
