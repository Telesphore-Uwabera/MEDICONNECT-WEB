import { useState } from "react";
import { Link } from "react-router-dom"; 
import { useTranslation } from "react-i18next";

import {
  ArrowRight, 
  ChevronRight,
 
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
 

import { Button } from "@/components/ui/button"; 

import { useTheme } from "@/context/ThemeContext";

import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

import TopBar from "@/components/landing/TopBar"; 
 
import { HeroHeader } from "@/components/landing/HeroHeader";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";
import Footer from "@/components/landing/Footer";

 
const Index = () => {
  const { t, i18n } = useTranslation(); 
  const { resolvedTheme, theme } = useTheme();
  const { data: publicSettings } = usePublicSettings();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("doctors");

    const publicPayload = publicSettings as any;

    const generalSettings =
        publicPayload?.general ?? publicPayload?.settings ?? publicPayload ?? {};

    const logo =
        generalSettings?.app_logo_url ||
        ((resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT);

    const appName = generalSettings?.app_name || "MEDICONNECT";

    const appTagline =
        localizedText(generalSettings?.app_tagline, i18n.language, t("pages.landing.footer_desc"));

    const contactEmail =
        generalSettings?.contact_email || "support@mediconnect.com";

    const contactPhone =
        generalSettings?.contact_phone || "+250 788 123 456";

    const contactAddress =
        generalSettings?.contact_address || "Kigali, Rwanda";

    const appUrl =
        generalSettings?.app_url || "https://mediconnect.rw";

    const defaultLanguage =
        generalSettings?.default_language || "en";

    const timezone =
        generalSettings?.timezone || "Africa/Kigali";

    const defaultCurrency =
        generalSettings?.default_currency || "RWF";

    const helpTopics = [
        { title: t("pages.help.topic_book_doctors_title"), desc: t("pages.help.topic_book_doctors_desc"), to: "/patient/search-doctors" },
        { title: t("pages.help.topic_find_facilities_title"), desc: t("pages.help.topic_find_facilities_desc"), to: "/patient/search-facilities" },
        { title: t("pages.help.topic_pharmacy_title"), desc: t("pages.help.topic_pharmacy_desc"), to: "/patient/pharmacy" },
        { title: t("pages.help.topic_sign_in_title"), desc: t("pages.help.topic_sign_in_desc"), to: "/auth" },
    ];
  return (
      <section className="bg-background">
          <div className="sticky top-0 z-50">
              <TopBar settings={generalSettings} />
              <HeroHeader
                  mobileMenuOpen={mobileMenuOpen}
                  setMobileMenuOpen={setMobileMenuOpen}
                  activeSection={activeSection}
                  settings={generalSettings}
              />
          </div>
          {/* Hero */}
          <div className="border-b border-border bg-muted/30">
              <div className="container py-14 lg:py-20">
                  <div className="mx-auto max-w-3xl text-center">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                          {t("pages.help.eyebrow")}
                      </p>

                      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                          {t("pages.help.title")}
                      </h1>

                      <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                          {t("pages.help.subtitle", { appName })}
                      </p>

                      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                          <a href={`mailto:${contactEmail}`}>
                              <Button className="h-11 rounded-[6px] px-6">
                                  {t("pages.help.email_support")}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                          </a>

                          <a href={`tel:${contactPhone.replace(/\s+/g, "")}`}>
                              <Button variant="outline" className="h-11 rounded-[6px] px-6">
                                  {t("pages.help.call_us")}
                                  <Phone className="ml-2 h-4 w-4" />
                              </Button>
                          </a>
                      </div>
                  </div>
              </div>
          </div>

          {/* Contact cards */}
          <div className="container py-12 lg:py-16">
              <div className="grid gap-4 md:grid-cols-3">
                  <a
                      href={`mailto:${contactEmail}`}
                      className="rounded-[6px] border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
                          <Mail className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{t("pages.help.email_support")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{contactEmail}</p>
                  </a>

                  <a
                      href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                      className="rounded-[6px] border border-border bg-card p-5 transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
                          <Phone className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{t("pages.help.phone_contact")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{contactPhone}</p>
                  </a>

                  <div className="rounded-[6px] border border-border bg-card p-5">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[6px] border border-primary/20 bg-primary/10 text-primary">
                          <MapPin className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{t("pages.help.office_location")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{contactAddress}</p>
                  </div>
              </div>

              {/* Help topics */}
              <div className="mt-12 grid gap-8 lg:grid-cols-1">
                  <div className="rounded-[6px] border border-border bg-card p-5 sm:p-6">
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                          {t("pages.help.help_center")}
                      </p>

                      <h2 className="mt-3 text-2xl font-semibold text-foreground">
                          {t("pages.help.common_things", { appName })}
                      </h2>

                      <div className="mt-6 grid gap-3">
                          {helpTopics.map((item) => (
                              <Link
                                  key={item.title}
                                  to={item.to}
                                  className="group rounded-[6px] border border-border bg-background p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
                              >
                                  <div className="flex items-start justify-between gap-4">
                                      <div>
                                          <p className="text-sm font-semibold text-foreground">
                                              {item.title}
                                          </p>
                                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                              {item.desc}
                                          </p>
                                      </div>
                                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                                  </div>
                              </Link>
                          ))}
                      </div>
                  </div>
 
              </div>
          </div>
          <Footer />
      </section>
  );
};

export default Index;
