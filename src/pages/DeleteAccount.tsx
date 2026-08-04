import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LogIn,
  Settings,
  ShieldAlert,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import TopBar from "@/components/landing/TopBar";
import { HeroHeader } from "@/components/landing/HeroHeader";
import Footer from "@/components/landing/Footer";
import { usePublicSettings } from "@/hooks/use-public-settings";

const SECTION_EYEBROW =
  "text-xs font-black uppercase tracking-[0.18em] text-primary";
const SECTION_TITLE =
  "font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl";
const SECTION_SUBTITLE =
  "mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground md:text-base";

const DeleteAccount = () => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: publicSettings } = usePublicSettings();
  const generalSettings = publicSettings?.general;
  const appName = generalSettings?.app_name || "MEDICONNECT";

  const steps = [
    {
      icon: LogIn,
      title: t("pages.delete_account.step1_t"),
      desc: t("pages.delete_account.step1_d"),
    },
    {
      icon: Settings,
      title: t("pages.delete_account.step2_t"),
      desc: t("pages.delete_account.step2_d"),
    },
    {
      icon: ShieldAlert,
      title: t("pages.delete_account.step3_t"),
      desc: t("pages.delete_account.step3_d"),
    },
    {
      icon: Trash2,
      title: t("pages.delete_account.step4_t"),
      desc: t("pages.delete_account.step4_d"),
    },
  ];

  return (
    <div className="min-h-dvh bg-background text-md">
      <div className="sticky top-0 z-50">
        <TopBar settings={generalSettings} />
        <HeroHeader
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeSection=""
          settings={generalSettings}
        />
      </div>

      <section className="border-t border-border bg-gradient-soft py-10 md:py-16">
        <div className="container max-w-6xl">
          <div className="max-w-2xl">
            <p className={SECTION_EYEBROW}>
              {t("pages.delete_account.eyebrow")}
            </p>
            <h1 className={`${SECTION_TITLE} mt-1`}>
              {t("pages.delete_account.title", { appName })}
            </h1>
            <p className={SECTION_SUBTITLE}>
              {t("pages.delete_account.subtitle")}
            </p>
          </div>

          {/* Warning banner */}
          <div className="mt-6 flex items-start gap-3 rounded-[6px] border border-destructive/30 bg-destructive/10 p-4 sm:p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-black text-destructive">
                {t("pages.delete_account.warning_title")}
              </p>
              <p className="mt-1 text-sm font-medium text-destructive/90">
                {t("pages.delete_account.warning_desc")}
              </p>
            </div>
          </div>

          {/* Steps — two columns from sm up */}
          <div className="mt-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
              {t("pages.delete_account.steps_heading")}
            </h2>

            <ol className="mt-4 grid gap-4 sm:grid-cols-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="group relative flex h-full flex-col gap-3 rounded-[6px] border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-primary/15 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-2xl font-black text-muted-foreground/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">
                        {step.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Final confirmation note */}
          <div className="mt-6 flex items-start gap-3 rounded-[6px] border border-border bg-muted/30 p-4 sm:p-5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("pages.delete_account.final_note")}
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DeleteAccount;