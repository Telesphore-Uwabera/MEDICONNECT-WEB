import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ArrowRight, ChevronRight, Mail, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTheme } from "@/context/ThemeContext";

import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";

function Footer() {
  const { t, i18n } = useTranslation();
  const { data: publicSettings } = usePublicSettings();
  const generalSettings = publicSettings?.general;
  const { resolvedTheme, theme } = useTheme();

  const appName = generalSettings?.app_name || "MEDICONNECT";
  const appTagline = localizedText(
    generalSettings?.app_tagline,
    i18n.language,
    t("pages.landing.footer_desc"),
  );

  const logo =
    generalSettings?.app_logo_url ||
    ((resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT);
  const contactEmail =
    generalSettings?.contact_email || "support@mediconnect.com";
  const contactPhone = generalSettings?.contact_phone || "+250 788 123 456";
  const contactAddress = generalSettings?.contact_address || "Kigali, Rwanda";
  const heroTagline = localizedText(
    publicSettings?.general?.app_tagline,
    i18n.language,
    t("pages.landing.hero_intro"),
  );

  const footerPlatformLinks = [
    { label: t("pages.landing.doctors"), to: "/patient/search-doctors" },
    { label: t("pages.landing.hospitals"), to: "/patient/search-facilities" },
    { label: t("pages.landing.footer_pharmacy"), to: "/patient/pharmacy" },
    { label: t("common.signIn"), to: "/auth" },
  ];

  const footerForLinks = [
    { label: t("pages.landing.footer_role_patient"), to: "/patient" },
    { label: t("pages.landing.footer_role_doctor"), to: "/doctor" },
    { label: t("pages.landing.footer_role_hospital"), to: "/hospital" },
    { label: t("pages.landing.footer_pharmacy"), to: "/pharmacy" },
    { label: t("pages.landing.footer_role_admin"), to: "/admin" },
  ];

  const footerLegalLinks = [
    {
      label: t("pages.landing.footer_legal_privacy"),
      href: generalSettings?.privacy_url || "/privacy",
    },
    {
      label: t("pages.landing.footer_legal_terms"),
      href: generalSettings?.terms_url || "/terms",
    },
  ];

  const footerSocials = [
    {
      label: "Twitter",
      path: "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z",
      href: "https://x.com/mediconnectrw?s=11",
    },
    {
      label: "Instagram",
      path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
      href: "https://www.instagram.com/mediconnectrw_?igsh=YnM4NTBrbHRoa3N2&utm_source=qr",
    },
    {
      label: "Youtube",
      path: "M20.5245 6.00694C20.3025 5.81544 20.0333 5.70603 19.836 5.63863C19.6156 5.56337 19.3637 5.50148 19.0989 5.44892C18.5677 5.34348 17.9037 5.26005 17.1675 5.19491C15.6904 5.06419 13.8392 5 12 5C10.1608 5 8.30956 5.06419 6.83246 5.1949C6.09632 5.26005 5.43231 5.34348 4.9011 5.44891C4.63628 5.50147 4.38443 5.56337 4.16403 5.63863C3.96667 5.70603 3.69746 5.81544 3.47552 6.00694C3.26514 6.18846 3.14612 6.41237 3.07941 6.55976C3.00507 6.724 2.94831 6.90201 2.90314 7.07448C2.81255 7.42043 2.74448 7.83867 2.69272 8.28448C2.58852 9.18195 2.53846 10.299 2.53846 11.409C2.53846 12.5198 2.58859 13.6529 2.69218 14.5835C2.74378 15.047 2.81086 15.4809 2.89786 15.8453C2.97306 16.1603 3.09841 16.5895 3.35221 16.9023C3.58757 17.1925 3.92217 17.324 4.08755 17.3836C4.30223 17.461 4.55045 17.5218 4.80667 17.572C5.32337 17.6733 5.98609 17.7527 6.72664 17.8146C8.2145 17.9389 10.1134 18 12 18C13.8865 18 15.7855 17.9389 17.2733 17.8146C18.0139 17.7527 18.6766 17.6733 19.1933 17.572C19.4495 17.5218 19.6978 17.461 19.9124 17.3836C20.0778 17.324 20.4124 17.1925 20.6478 16.9023C20.9016 16.5895 21.0269 16.1603 21.1021 15.8453C21.1891 15.4809 21.2562 15.047 21.3078 14.5835C21.4114 13.6529 21.4615 12.5198 21.4615 11.409C21.4615 10.299 21.4115 9.18195 21.3073 8.28448C21.2555 7.83868 21.1874 7.42043 21.0969 7.07448C21.0517 6.90201 20.9949 6.72401 20.9206 6.55976C20.8539 6.41236 20.7349 6.18846 20.5245 6.00694Z",
      href: "https://youtube.com/@mediconnectrwanda1?si=zkORxyOOV9Q-jYPd",
    },

    {
      label: "Facebook",
      path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
      href: "https://www.facebook.com/share/1PGfL8zefj/?mibextid=wwXIfr",
    },
  ];
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-10 border-b border-border pb-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.65fr)_minmax(150px,0.65fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <img
              src={logo}
              alt={appName}
              className="h-12 w-40 object-contain"
            />
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              {appTagline}
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <a
                href={`mailto:${contactEmail}`}
                className="flex min-w-0 items-center gap-3 transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{contactEmail}</span>
              </a>
              <a
                href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                className="flex min-w-0 items-center gap-3 transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{contactPhone}</span>
              </a>
              <div className="flex min-w-0 items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{contactAddress}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {footerSocials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
              <div className="flex items-center gap-2 px-2 py-2 text-[11px] font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t("pages.landing.footer_status_operational")}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              {t("pages.landing.footer_platform")}
            </p>
            <div className="mt-4 grid gap-3">
              {footerPlatformLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  className="group flex items-center justify-between text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <span>{l.label}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
            <div className="flex lg:flex-row lg:flex-nowrap flex-wrap gap-2 mt-5">
              <a
                href="#"
                role="menuitem"
                className="group flex   items-center transition-all"
              >
                <img
                  src="/images/android.png"
                  alt={t("pages.landing.app_store_alt")}
                  className="max-h-9 max-w-full object-contain"
                />
              </a>
              <a
                href="#"
                role="menuitem"
                className="group flex   items-center transition-all"
              >
                <img
                  src="/images/apple.png"
                  alt={t("pages.landing.app_store_alt")}
                  className="max-h-9 max-w-full object-contain"
                />
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              {t("pages.landing.footer_workspaces")}
            </p>
            <div className="mt-4 grid gap-3">
              {footerForLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  className="group flex items-center justify-between text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <span>{l.label}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:border-l lg:border-border lg:pl-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("pages.landing.footer_start_care")}
            </p>
            <h3 className="mt-3 text-xl font-semibold leading-tight text-foreground">
              {t("pages.landing.footer_cta_title")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("pages.landing.footer_cta_sub")}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Link to="/patient/search-doctors">
                <Button className="h-11 w-full justify-between rounded-[6px]">
                  {t("pages.landing.browse_doctors")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button
                  variant="outline"
                  className="h-11 w-full justify-between rounded-[6px]"
                >
                  {t("common.signIn")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center text-xs text-muted-foreground sm:text-left">
            {t("pages.landing.footer_copyright", {
              year: new Date().getFullYear(),
              name: appName,
            })}{" "}
            {heroTagline}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {footerLegalLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
