import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "@/locales/en/common.json";
import enNav from "@/locales/en/nav.json";
import enSidebar from "@/locales/en/sidebar.json";
import enHero from "@/locales/en/hero.json";
import enBooking from "@/locales/en/booking.json";
import enRx from "@/locales/en/rx.json";
import enPages from "@/locales/en/pages.json";
import enAdmin from "@/locales/en/admin.json";
import enAuth from "@/locales/en/auth.json";
import enHeader from "@/locales/en/header.json";
import enConsult from "@/locales/en/consult.json";

import frCommon from "@/locales/fr/common.json";
import frNav from "@/locales/fr/nav.json";
import frSidebar from "@/locales/fr/sidebar.json";
import frHero from "@/locales/fr/hero.json";
import frBooking from "@/locales/fr/booking.json";
import frRx from "@/locales/fr/rx.json";
import frPages from "@/locales/fr/pages.json";
import frAdmin from "@/locales/fr/admin.json";
import frAuth from "@/locales/fr/auth.json";
import frHeader from "@/locales/fr/header.json";
import frConsult from "@/locales/fr/consult.json";

import rwCommon from "@/locales/rw/common.json";
import rwNav from "@/locales/rw/nav.json";
import rwSidebar from "@/locales/rw/sidebar.json";
import rwHero from "@/locales/rw/hero.json";
import rwBooking from "@/locales/rw/booking.json";
import rwRx from "@/locales/rw/rx.json";
import rwPages from "@/locales/rw/pages.json";
import rwAdmin from "@/locales/rw/admin.json";
import rwAuth from "@/locales/rw/auth.json";
import rwHeader from "@/locales/rw/header.json";
import rwConsult from "@/locales/rw/consult.json";

const bundle = (
  common: any, nav: any, sidebar: any, hero: any, booking: any, rx: any, pages: any, admin: any, auth: any, header: any, consult: any,
) => ({ common, nav, sidebar, hero, booking, rx, pages, admin, auth, header, consult });

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "rw", label: "Kinyarwanda", nativeLabel: "Kinyarwanda" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: bundle(enCommon, enNav, enSidebar, enHero, enBooking, enRx, enPages, enAdmin, enAuth, enHeader, enConsult) },
      fr: { translation: bundle(frCommon, frNav, frSidebar, frHero, frBooking, frRx, frPages, frAdmin, frAuth, frHeader, frConsult) },
      rw: { translation: bundle(rwCommon, rwNav, rwSidebar, rwHero, rwBooking, rwRx, rwPages, rwAdmin, rwAuth, rwHeader, rwConsult) },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "rw"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "lang",
    },
  });

export default i18n;