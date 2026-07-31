import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom"; 
import { useTranslation } from "react-i18next";

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Stethoscope,
  Pill,
  Activity,
  Shield,
  Clock,
  ChevronRight,
  Zap,
  X,
  Mail,
  MapPin,
  Phone,
  Building2,
  BadgeCheck,
  Truck,
  Navigation,
  ShoppingBag,
} from "lucide-react";

import echo from "@/lib/echo";

import { Button } from "@/components/ui/button";
import { DoctorCard } from "@/components/DoctorCard";
import { HospitalCard } from "@/components/HospitalCard";

import { cn } from "@/lib/utils";

import { useTheme } from "@/context/ThemeContext";

import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

import TopBar from "@/components/landing/TopBar"; 
import { 
  useInfiniteSearchHospitals,
} from "@/hooks/patient/use-patient-search-hospital";

// NOTE: ApiDoctor now imported from the hook file (single source of truth for the type).
// If your hook file doesn't currently export ApiDoctor, add `export` to its interface
// declaration there — see the note at the bottom of this file.

import {
  useGetSearchDoctors,
  useInfiniteSearchDoctors,
  ApiDoctor,
} from "@/hooks/patient/use-patient-doctor";
import { 
  SpecializationValue,
} from "./patient/components/SpecializationSelect";
import { useGetPharmacyStats } from "@/hooks/pharmacy/use-pharmacy-dashboard";
import { parseDeliveryMins, useSearchPharmacies } from "@/hooks/patient/use-patient-search-pharmacy";
import HeroSection from "./doctor/HeroSection";
import Specialities from "@/components/landing/Specialities";
import OurTeam from "@/components/landing/Ourteam";
import ServicesShowcase from "@/components/landing/ServicesShowcase";
import { HeroHeader } from "@/components/landing/HeroHeader";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";
import Footer from "@/components/landing/Footer";

// ─── Types (inline for self-containment) ──────────────────────────────────────

interface DoctorAvailabilityEvent {
  doctor_id: number;
  instant_consultation: boolean;
  bookings_paused: boolean;
}

 
const SECTION_EYEBROW =
  "text-xs font-black uppercase tracking-[0.18em] text-primary";
const SECTION_TITLE =
  "font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl";
const SECTION_SUBTITLE =
  "mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground md:text-base";


// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { resolvedTheme, theme } = useTheme();
  const { data: publicSettings } = usePublicSettings();
  const generalSettings = publicSettings?.general; 
  const appName = generalSettings?.app_name || "MEDICONNECT";
  const appTagline = localizedText(
    generalSettings?.app_tagline,
    i18n.language,
    t("pages.landing.footer_desc"),
  ); 
  const contactPhone = generalSettings?.contact_phone || "+250 788 123 456"; 

  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [partnerTab, setPartnerTab] = useState<"facilities" | "pharmacies">("facilities");

  // ── Doctor filter state ─────────────────────────────────────────────────────
  const [doctorFilter, setDoctorFilter] = useState<"all" | "instant">("all");
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<SpecializationValue>({ specialization: null, fee: null });
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  useEffect(() => {
    document.title = appTagline ? `${appName} - ${appTagline}` : appName;

    if (!generalSettings?.app_favicon_url) return;

    let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }
    favicon.href = generalSettings.app_favicon_url;
  }, [appName, appTagline, generalSettings?.app_favicon_url]);

  // ── Scroll to section on hash present (e.g. navigated from another page) ────
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const scrollToEl = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          return true;
        }
        return false;
      };

      // try immediately, then retry briefly in case content is still mounting
      if (!scrollToEl()) {
        const timeout = setTimeout(scrollToEl, 150);
        return () => clearTimeout(timeout);
      }
    }
  }, [location.hash]);

  useEffect(() => {
   const sectionIds = ["home", "doctors", "specialities","services", "healthfacilities", "pharmacy", "team"]; 
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.05, 0.15, 0.3, 0.5, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // ── Build backend params ─────────────────────────────────────────────────────
  // FIX: useMemo now returns a stable object that changes identity only when
  // filter values actually change, ensuring useGetSearchDoctors re-fetches.

  const doctorSearchParams = useMemo(() => {
    const params: {
      instant?: boolean;
      language?: string;
      specialization?: string;
      specialization_fee_id?: number;
    } = {};

    if (doctorFilter === "instant") params.instant = true;
    if (selectedLanguage !== "all") params.language = selectedLanguage;

    if (selectedSpecialization.specialization) {
      params.specialization = selectedSpecialization.specialization.name;
      if (selectedSpecialization.fee?.id) {
        params.specialization_fee_id = selectedSpecialization.fee.id;
      }
    }

    return params;
  }, [doctorFilter, selectedLanguage, selectedSpecialization]);

  const { data: pharmacyStats } = useGetPharmacyStats();
  const { data: pharmaciesResp, isLoading: pharmaciesLoading } = useSearchPharmacies({ per_page: 4 });

  // ── All doctors (infinite scrolling) ─────────────────────────────────────
  const {
    data: doctorsData,
    isLoading: doctorsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteSearchDoctors({ ...doctorSearchParams, per_page: 6 });

  const allDoctors = useMemo(() => {
    return doctorsData?.pages.flatMap((page) => page.data) ?? [];
  }, [doctorsData]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastDoctorElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (doctorsLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [doctorsLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  // ── Instant-only doctors (for the Quick Consult slider) ─────────────────────
  const { data: instantDoctorsData, isLoading: instantLoading } =
    useGetSearchDoctors({ instant: true, page: 1, per_page: 6 });

  // ── Hospitals (infinite scrolling) ──────────────────────────────────────────
  const {
    data: hospitalsData,
    isLoading: hospitalsLoading,
    fetchNextPage: fetchNextHospitalsPage,
    hasNextPage: hasNextHospitalsPage,
    isFetchingNextPage: isFetchingNextHospitalsPage,
  } = useInfiniteSearchHospitals({ page: 1, per_page: 6 });

  const allHospitals = useMemo(() => {
    return hospitalsData?.pages.flatMap((page) => page.data) ?? [];
  }, [hospitalsData]);

  const homepageHospitals = useMemo(() => allHospitals.slice(0, 4), [allHospitals]);
  const homepagePharmacies = useMemo(
    () => pharmaciesResp?.data?.slice(0, 4) ?? [],
    [pharmaciesResp],
  );

  const observerHospitals = useRef<IntersectionObserver | null>(null);
  const lastHospitalElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (hospitalsLoading || isFetchingNextHospitalsPage) return;
      if (observerHospitals.current) observerHospitals.current.disconnect();

      observerHospitals.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextHospitalsPage) {
          fetchNextHospitalsPage();
        }
      });

      if (node) observerHospitals.current.observe(node);
    },
    [
      hospitalsLoading,
      isFetchingNextHospitalsPage,
      hasNextHospitalsPage,
      fetchNextHospitalsPage,
    ],
  );

  // Filter to available instant doctors, max 4 slides
  const instantDoctors = useMemo<ApiDoctor[]>(
    () =>
      (instantDoctorsData?.data ?? [])
        .filter((d) => d.instant_consultation)
        .slice(0, 4),
    [instantDoctorsData],
  );

  // Reset slide index when data changes
  useEffect(() => {
    setActiveSlide(0);
  }, [instantDoctors.length]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = echo.channel("doctors.availability");

    channel.listen(".availability.changed", (data: DoctorAvailabilityEvent) => {
      console.log("Doctor availability changed:", data);
      queryClient.invalidateQueries({ queryKey: ["patient-search-doctors"] });
    });

    return () => {
      echo.leaveChannel("doctors.availability");
    };
  }, [queryClient]);

  const prevSlide = useCallback(() => {
    if (!instantDoctors.length) return;
    setActiveSlide(
      (p) => (p - 1 + instantDoctors.length) % instantDoctors.length,
    );
  }, [instantDoctors.length]);

  const nextSlide = useCallback(() => {
    if (!instantDoctors.length) return;
    setActiveSlide((p) => (p + 1) % instantDoctors.length);
  }, [instantDoctors.length]);

  // Auto-advance only when we have multiple slides
  useEffect(() => {
    if (instantDoctors.length <= 1) return;
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [nextSlide, instantDoctors.length]);

  // ── Clear all filters helper ─────────────────────────────────────────────────
  const clearFilters = useCallback(() => {
    setDoctorFilter("all");
    setSelectedSpecialization({ specialization: null, fee: null });
    setSelectedLanguage("all");
  }, []);

  const hasActiveFilters =
    doctorFilter !== "all" ||
    !!selectedSpecialization.specialization ||
    selectedLanguage !== "all";

  // ── Static content ───────────────────────────────────────────────────────────

  const features = [
    {
      icon: Calendar,
      title: t("pages.landing.f_smart_booking_t"),
      desc: t("pages.landing.f_smart_booking_d"),
    },
    {
      icon: Activity,
      title: t("pages.landing.f_instant_t"),
      desc: t("pages.landing.f_instant_d"),
    },
    {
      icon: Stethoscope,
      title: t("pages.landing.f_records_t"),
      desc: t("pages.landing.f_records_d"),
    },
    {
      icon: Pill,
      title: t("pages.landing.f_pharmacy_t"),
      desc: t("pages.landing.f_pharmacy_d"),
    },
  ];

  const footerPlatformLinks = [
    { label: "Doctors", to: "/patient/search-doctors" },
    { label: "Hospitals", to: "/patient/search-facilities" },
    { label: "Pharmacy", to: "/patient/pharmacy" },
    { label: "Sign in", to: "/auth" },
  ];

  const footerForLinks = [
    { label: "Patient", to: "/patient" },
    { label: "Doctor", to: "/doctor" },
    { label: "Hospital", to: "/hospital" },
    { label: "Pharmacy", to: "/pharmacy" },
    { label: "Admin", to: "/admin" },
  ];

  const footerLegalLinks = [
    { label: "Privacy", href: generalSettings?.privacy_url || "#" },
    { label: "Terms", href: generalSettings?.terms_url || "#" },
    { label: "Cookies", href: "#" },
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
      href: "https://youtube.com/@mediconnectrwanda1?si=zkORxyOOV9Q-jYPd"

    },
 
    {
      label: "Facebook",
      path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
      href: "https://www.facebook.com/share/1PGfL8zefj/?mibextid=wwXIfr",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-background text-md">
      <div className="sticky top-0 z-50">
        <TopBar settings={generalSettings} />
        <HeroHeader
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          activeSection={activeSection}
          settings={generalSettings}
        />
      </div>

      {/* ── Hero ── */}
      <section id="home" className="relative bg-gradient-hero">
        <HeroSection />
      </section>

      {/* ── Available Doctors Grid ── */}
      <section id="doctors" className="border-t border-border bg-gradient-soft py-12 md:py-14">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className={SECTION_EYEBROW}>
                    {t("pages.landing.top_rated_doctors", { defaultValue: "Top Rated Doctors" })}
                  </p>
                  <h2 className={`${SECTION_TITLE} mt-1`}>
                    {t("pages.landing.consult_expert_doctors", { defaultValue: "Consult With Expert Doctors" })}
                  </h2>
                </div>
                <Link to="/patient/search-doctors" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  {t("pages.landing.view_all", { defaultValue: "View all" })}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {doctorsLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-[320px] animate-pulse rounded-[6px] border border-border bg-card" />
                    ))
                  : allDoctors.slice(0, 6).map((doctor) => (
                      <DoctorCard key={doctor.id} doctor={doctor} />
                    ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-black text-foreground">
                    {t("pages.landing.quick_access", { defaultValue: "Quick Access" })}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: t("pages.landing.book_appointment", { defaultValue: "Book Appointment" }),
                      sub: t("pages.landing.schedule_for_later", { defaultValue: "Schedule for later" }),
                      to: "/patient/search-doctors",
                      icon: Calendar,
                      color: "text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/50",
                    },
                    {
                      label: t("pages.landing.find_pharmacy", { defaultValue: "Find Pharmacy" }),
                      sub: t("pages.landing.order_medicine", { defaultValue: "Order medicine" }),
                      to: "/patient/search-pharmacy",
                      icon: Pill,
                      color: "text-blue-700 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-900/50",
                    },
                    {
                      label: t("pages.landing.find_hospital_health_facility", { defaultValue: "Find Hospital / Health Facility" }),
                      sub: t("pages.landing.book_visit", { defaultValue: "Book a visit" }),
                      to: "/patient/search-facilities",
                      icon: Building2,
                      color: "text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-900/50",
                    },
                    {
                      label: t("pages.landing.qa_health_articles", { defaultValue: "Health Articles" }),
                      sub: t("pages.landing.learn_more", { defaultValue: "Learn more" }),
                      to: "/help",
                      icon: Activity,
                      color: "text-orange-700 bg-orange-50 border-orange-100 dark:text-orange-300 dark:bg-orange-950/30 dark:border-orange-900/50",
                    },
                     {
                      label: t("pages.landing.f_instant_t", { defaultValue: "Instants" }),
                      sub: t("pages.landing.f_instant_t", { defaultValue: "Instant" }),
                      to: "/patient/search-doctors?instant=true",
                      icon: Activity,
                      color: "text-orange-700 bg-orange-50 border-orange-100 dark:text-orange-300 dark:bg-orange-950/30 dark:border-orange-900/50",
                    }, {
                      label:  t("pages.landing.fitness_certificates_requests", { defaultValue: "Fitness Certificate" }),
                      sub:  t("pages.landing.fitness_certificates_requests", { defaultValue: "Fitness Certificate" }),
                      to: "/verify-certificate",
                      icon: Activity,
                      color: "text-orange-700 bg-orange-50 border-orange-100 dark:text-orange-300 dark:bg-orange-950/30 dark:border-orange-900/50",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        className="group rounded-[6px] border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                      >  
                        <span className="mt-1 inline-flex items-center text-xs font-semibold text-primary">
                            {item.label}
                          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div> 
              <div className="overflow-hidden rounded-[6px] border border-primary/10 bg-primary/10 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-foreground">
                      {t("pages.landing.need_urgent_help", { defaultValue: "Need urgent help?" })}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      {t("pages.landing.call_support_line", { defaultValue: "Call our support line" })}
                    </p>
                    <a href={`tel:${contactPhone}`} className="mt-2 inline-block text-lg font-black text-primary">
                      {contactPhone}
                    </a>
                  </div>
                  <a href={`tel:${contactPhone}`} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Phone className="h-7 w-7" />
                  </a>
                </div>
              </div>
            </aside>
          </div>
          <ServicesShowcase />
        </div>
      </section>
      {/* Specialities */}
      <section id="specialities" className="border-t border-border bg-background py-12 md:py-14">
        <div className="container">
          <Specialities />
        </div>
      </section>
      {/* Verified facilities and pharmacies */}
      <section id="healthfacilities" className="border-t border-border bg-background py-12 md:py-14">
        <div className="container">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={SECTION_TITLE}>
                {t("pages.landing.verified_facilities_title")}
              </h2>
              <p className={SECTION_SUBTITLE}>
                {t("pages.landing.verified_facilities_sub")}
              </p>
            </div>
            <Link
              to={partnerTab === "facilities" ? "/patient/search-facilities" : "/patient/search-pharmacy"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              {partnerTab === "facilities"
                ? t("pages.landing.view_all_facilities")
                : t("pages.landing.view_all_pharmacies")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div id="pharmacy" className="mb-7 flex flex-wrap items-center justify-between gap-4 scroll-mt-24">
            <div className="inline-flex rounded-[6px] bg-muted/60 p-1 ring-1 ring-border">
              <button
                type="button"
                onClick={() => setPartnerTab("facilities")}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-[6px] px-5 text-xs font-bold transition-all",
                  partnerTab === "facilities"
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <Building2 className="h-5 w-5" />
                {t("pages.landing.health_facilities_tab")}
              </button>
              <button
                type="button"
                onClick={() => setPartnerTab("pharmacies")}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-[6px] px-5 text-xs font-bold transition-all",
                  partnerTab === "pharmacies"
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <Pill className="h-5 w-3" />
                {t("pages.landing.pharmacies_tab")}
              </button>
            </div>
            <div className="hidden gap-2 md:flex">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground" aria-label={t("pages.landing.previous_cards")}>
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground" aria-label={t("pages.landing.next_cards")}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {partnerTab === "facilities" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {hospitalsLoading && homepageHospitals.length === 0
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-[330px] animate-pulse rounded-[6px] border border-border bg-card" />
                  ))
                : homepageHospitals.map((hospital) => (
                    <HospitalCard key={hospital.id} hospital={hospital} />
                  ))}
              {!hospitalsLoading && homepageHospitals.length === 0 && (
                <div className="col-span-full rounded-[6px] border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{t("pages.landing.no_hospitals_found")}</div>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" >
              {pharmaciesLoading && homepagePharmacies.length === 0
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-[330px] animate-pulse rounded-[6px] border border-border bg-card" />
                  ))
                : homepagePharmacies.map((pharmacy) => {
                    const deliveryMins = parseDeliveryMins(pharmacy.estimated_delivery_minutes);
                    const todayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
                    const todayHours = pharmacy.working_hours?.find((hour) => hour.day_of_week === todayName);
                    const isClosedToday = todayHours?.is_closed ?? !pharmacy.is_open_24h;
                    return (
                      <article
                        key={pharmacy.id}
                        className="flex flex-col overflow-hidden rounded-[6px] border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
                      >
                        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {t("pages.patient.pharmacy_label")}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold",
                              !isClosedToday ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                            )}
                          >
                            {!isClosedToday ? t("pages.patient.open_today") : t("pages.patient.closed_today")}
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-primary/15 bg-primary/10 text-primary shadow-sm">
                              {pharmacy.logo ? (
                                <img src={pharmacy.logo} alt={pharmacy.name} className="h-full w-full object-cover" />
                              ) : (
                                <Pill className="h-6 w-6" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="flex items-center gap-1.5 truncate text-base font-bold leading-tight text-foreground">
                                {pharmacy.name}
                                {pharmacy.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                              </h3>
                              <p className="mt-1 flex items-center gap-1 truncate text-[13px] font-medium text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {pharmacy.city}{pharmacy.address ? `, ${pharmacy.address}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-[6px] border border-border">
                            <div className="flex flex-col items-center bg-muted/20 px-1 py-2">
                              <div className="mb-0.5 flex items-center gap-1 text-muted-foreground">
                                <Truck className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">{t("pages.patient.delivery_stat_label")}</span>
                              </div>
                              <span className="text-xs font-semibold text-foreground">
                                {pharmacy.offers_delivery && pharmacy.delivery_fee != null
                                  ? `${pharmacy.delivery_fee} ${pharmacy.delivery_currency}`
                                  : pharmacy.offers_delivery
                                    ? t("pages.patient.yes_label")
                                    : t("pages.patient.no_label")}
                              </span>
                            </div>
                            <div className="flex flex-col items-center bg-muted/20 px-1 py-2">
                              <div className="mb-0.5 flex items-center gap-1 text-muted-foreground">
                                <Navigation className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">{t("pages.patient.distance_stat_label")}</span>
                              </div>
                              <span className="text-xs font-semibold text-foreground">
                                {pharmacy.distance_km != null ? `${pharmacy.distance_km.toFixed(1)} km` : "-"}
                              </span>
                            </div>
                            <div className="flex flex-col items-center bg-muted/20 px-1 py-2">
                              <div className="mb-0.5 flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">{t("pages.patient.time_stat_label")}</span>
                              </div>
                              <span className="text-xs font-semibold text-foreground">
                                {deliveryMins != null ? `~${deliveryMins}m` : "-"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1">
                            {pharmacy.offers_delivery && (
                              <span className="rounded-[6px] border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
                                {t("pages.patient.delivery_word")}
                              </span>
                            )}
                            {pharmacy.offers_pickup && (
                              <span className="rounded-[6px] border border-border/60 bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t("pages.patient.pickup_badge")}
                              </span>
                            )}
                            {pharmacy.is_open_24h && (
                              <span className="rounded-[6px] border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                {t("pages.patient.open_24h_badge")}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-muted-foreground">
                            {todayHours && !isClosedToday
                              ? t("pages.patient.hours_today", {
                                  open: todayHours.open_time?.slice(0, 5),
                                  close: todayHours.close_time?.slice(0, 5),
                                })
                              : t("pages.patient.closed_today")}
                          </p>

                          <div className="mt-auto flex items-center gap-2 border-t border-border/40 pt-4">
                            <Button asChild size="sm" variant="outline" className="h-8 flex-1 rounded-[6px] border-border/60 px-3 text-xs font-bold hover:bg-muted/50">
                              <Link to={`/patient/search-pharmacy?pharmacy=${pharmacy.slug}`}>
                                <Pill className="mr-1.5 h-3.5 w-3.5" />
                                {t("pages.patient.inventory_action")}
                              </Link>
                            </Button>
                            <Button asChild size="sm" className="h-8 flex-1 rounded-[6px] bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90">
                              <Link to={`/patient/search-pharmacy?pharmacy=${pharmacy.slug}`}>
                                {t("pages.patient.order_now_action")}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
              {!pharmaciesLoading && homepagePharmacies.length === 0 && (
                <div className="col-span-full rounded-[6px] border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{t("pages.landing.no_pharmacies_found")}</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Our Team */}
      <section id="team" className="bg-background py-12 md:py-14">
        <div className="container">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={SECTION_TITLE}>{t("pages.landing.team_heading")}</h2>
              <p className={SECTION_SUBTITLE}>{t("pages.landing.team_sub")}</p>
            </div> 
          </div>
          <OurTeam />
        </div>
      </section>

   <Footer/>
    </div>
  );
};

export default Index;
