import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import {
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
import Navbar from "@/components/landing/Navbar";
import HeroCta from "@/components/landing/HeroCta";
import {
  useGetSearchHospitals,
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
  SpecializationSelect,
  SpecializationValue,
} from "./patient/components/SpecializationSelect";
import { useGetPharmacyStats } from "@/hooks/pharmacy/use-pharmacy-dashboard";
import HeroSection from "./doctor/HeroSection";
import Specialities from "@/components/landing/Specialities";
import OurTeam from "@/components/landing/Ourteam";
import { HeroHeader } from "@/components/landing/HeroHeader";
import { usePublicSettings } from "@/hooks/use-public-settings";
import Footer from "@/components/landing/Footer";

// ─── Types (inline for self-containment) ──────────────────────────────────────

interface DoctorAvailabilityEvent {
  doctor_id: number;
  instant_consultation: boolean;
  bookings_paused: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDoctorImage = (d: ApiDoctor): string =>
  d.image ??
  d.user.avatar ??
  `https://ui-avatars.com/api/?name=${encodeURIComponent(d.user.name)}&background=0ea5e9&color=fff&size=600`;

const getDoctorName = (d: ApiDoctor): string =>
  d.designations?.trim() || d.user.name;

const getDoctorSpecialty = (d: ApiDoctor): string =>
  d.specializations?.[0]?.name ?? d.specialization ?? "General Practice";

const formatFee = (d: ApiDoctor): string => {
  const fee = parseFloat(d.consultation_fee);
  return fee === 0 ? "Free" : `${d.currency} ${fee.toLocaleString()}`;
};

const formatRating = (d: ApiDoctor): string | null => {
  const r = parseFloat(d.rating_avg);
  return r > 0 ? r.toFixed(1) : null;
};

// ─── Shared section heading classes ────────────────────────────────────────────
// Reduced one step on every breakpoint (5xl→3xl, 4xl→3xl/2xl, 3xl→2xl)
// so headings read as section markers rather than competing hero text.

const SECTION_EYEBROW =
  "inline-flex items-center rounded-[6px] px-3 py-1 text-xs md:text-sm font-bold uppercase tracking-widest bg-primary/10 text-primary mb-4";
const SECTION_TITLE =
  "mt-2 font-display text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground leading-[1.1]";

// ─── Slider Skeleton ──────────────────────────────────────────────────────────

const SliderSkeleton = () => (
  <div className="absolute inset-0 bg-muted animate-pulse rounded-[6px] flex flex-col justify-end p-4 gap-2">
    <div className="h-4 w-2/3 rounded bg-muted-foreground/20" />
    <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
    <div className="h-3 w-1/3 rounded bg-muted-foreground/20" />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Index = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { resolvedTheme, theme } = useTheme();
  const { data: publicSettings } = usePublicSettings();
  const generalSettings = publicSettings?.general;
  const logo = generalSettings?.app_logo_url || ((resolvedTheme ?? theme) === "dark" ? LOGODARK : LOGOLIGHT);
  const appName = generalSettings?.app_name || "MEDICONNECT";
  const appTagline =
    generalSettings?.app_tagline || t("pages.landing.footer_desc");
  const contactEmail = generalSettings?.contact_email || "support@mediconnect.com";
  const contactPhone = generalSettings?.contact_phone || "+250 788 123 456";
  const contactAddress = generalSettings?.contact_address || "Kigali, Rwanda";

  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("doctors");

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
    const sectionIds = ["doctors", "specialities", "hospitals", "pharmacy", "team"];
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
      <section className="relative bg-gradient-hero">
        <HeroSection />
      </section>

      {/* ── Available Doctors Grid ── */}
      <section
        id="doctors"
        className=" w-full  flex flex-col justify-center py-20 bg-gradient-soft border-t border-border"
      >
        <div className="lg:container px-6">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
            <div className="flex-1 min-w-0">
              <h2 className={cn(SECTION_TITLE, "text-left lg:w-[500px]")}>
                {t("pages.landing.doctors_ready")}
              </h2>

              {/* ── Filters ── */}
              <div className="mt-6 flex  flex-wrap items-center gap-3">
                {/* Type filter */}
                <div className="inline-flex items-center  
                appearance-none px-4 py-1 text-xs font-medium bg-background border rounded-[6px] transition-all cursor-pointer outline-none shadow-sm">
                  <button
                    onClick={() => setDoctorFilter("all")}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-[6px] transition-all duration-300",
                      doctorFilter === "all"
                        ? "bg-primary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDoctorFilter("instant")}
                    className={cn(
                      "px-2 py-1.5 text-xs flex gap-1 font-semibold rounded-[6px] transition-all duration-300",
                      doctorFilter === "instant"
                        ? "bg-primary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Instant only
                  </button>
                </div>

                {/* Specialization filter */}
                <div className="w-64">
                  <SpecializationSelect
                    className="h-9 border-none"
                    value={selectedSpecialization}
                    onChange={setSelectedSpecialization}
                  />
                </div>

                {/* Language filter */}
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className={cn(
                      "appearance-none px-4 py-2.5 pr-9 text-xs font-medium bg-background border rounded-[6px] transition-all cursor-pointer outline-none shadow-sm",
                      selectedLanguage !== "all"
                        ? "border-primary/50 ring-2 ring-primary/10 text-foreground"
                        : "border-border/60 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <option value="all">Any language</option>
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="rw">Kinyarwanda</option>
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground/50 pointer-events-none" />
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
            <Link to="/patient/search-doctors">
              <Button variant="outline" size="sm" className="rounded-[6px] px-5 py-2 font-medium text-sm border-border/60 hover:bg-muted/50 hover:text-foreground transition-all">
                {t("pages.landing.see_all_doctors")}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {doctorsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm space-y-2.5 animate-pulse"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-[6px] bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 rounded bg-muted" />
                      <div className="h-2.5 w-1/2 rounded bg-muted" />
                      <div className="h-2 w-1/3 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-14 rounded-[6px] bg-muted shrink-0" />
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border rounded-[6px] border border-border overflow-hidden">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div
                        key={j}
                        className="flex flex-col items-center py-1.5 px-1 bg-muted/30 gap-1"
                      >
                        <div className="h-2 w-2 rounded-full bg-muted" />
                        <div className="h-2.5 w-8 rounded bg-muted" />
                        <div className="h-2 w-6 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded-[6px] bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-28 rounded bg-muted" />
                    <div className="flex gap-1.5">
                      <div className="h-6 w-12 rounded-[6px] bg-muted" />
                      <div className="h-6 w-16 rounded-[6px] bg-muted" />
                    </div>
                  </div>
                </div>
              ))
              : allDoctors.map((d, i) => {
                if (allDoctors.length === i + 1) {
                  return (
                    <div ref={lastDoctorElementRef} key={d.id}>
                      <DoctorCard doctor={d} />
                    </div>
                  );
                } else {
                  return <DoctorCard key={d.id} doctor={d} />;
                }
              })}
            {isFetchingNextPage &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm space-y-2.5 animate-pulse"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-[6px] bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 rounded bg-muted" />
                      <div className="h-2.5 w-1/2 rounded bg-muted" />
                      <div className="h-2 w-1/3 rounded bg-muted" />
                    </div>
                    <div className="h-4 w-14 rounded-[6px] bg-muted shrink-0" />
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border rounded-[6px] border border-border overflow-hidden">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div
                        key={j}
                        className="flex flex-col items-center py-1.5 px-1 bg-muted/30 gap-1"
                      >
                        <div className="h-2 w-2 rounded-full bg-muted" />
                        <div className="h-2.5 w-8 rounded bg-muted" />
                        <div className="h-2 w-6 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded-[6px] bg-muted" />
                    <div className="h-3 w-16 rounded bg-muted" />
                  </div>
                  <div className="border-t border-border" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-28 rounded bg-muted" />
                    <div className="flex gap-1.5">
                      <div className="h-6 w-12 rounded-[6px] bg-muted" />
                      <div className="h-6 w-16 rounded-[6px] bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Empty state when filters return no results */}
          {!doctorsLoading && allDoctors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No doctors match your filters.{" "}
                <button
                  onClick={clearFilters}
                  className="text-primary hover:underline"
                >
                  Reset filters
                </button>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Specialities ── */}
      <section id="specialities" className=" flex flex-col justify-center py-20">
        <div className="container">
          <div className="max-w-2xl">
            <h2 className={SECTION_TITLE}>
              {t("pages.landing.features_title")}
            </h2>
          </div>
        </div>
        <div className="mt-4 lg:px-14 ">
          <Specialities />
        </div>
      </section>

      {/* ── Hospitals ── */}
      <section id="hospitals" className=" border-t flex flex-col justify-center py-20 border-border">
        <div className="container">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
            <div>
              <h2 className={SECTION_TITLE}>
                {t("pages.landing.health_facility")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                {t("pages.landing.hospitals_sub")}
              </p>
            </div>
            <Link to="/patient/search-facilities">
              <Button variant="outline" size="sm" className="rounded-[6px] px-5 py-2 font-medium text-sm border-border/60 hover:bg-muted/50 hover:text-foreground transition-all">
                {t("pages.landing.see_all_hospitals")}{" "}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {hospitalsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[6px] border border-border bg-card overflow-hidden animate-pulse"
                >
                  <div className="px-3.5 py-1.5 bg-muted/60 border-b border-border flex items-center justify-between">
                    <div className="h-2.5 w-16 rounded bg-muted" />
                    <div className="h-2.5 w-12 rounded bg-muted" />
                  </div>
                  <div className="px-3.5 pt-3 pb-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-[6px] bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-muted" />
                        <div className="h-2.5 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-border rounded-[6px] border border-border overflow-hidden">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div
                          key={j}
                          className="flex flex-col items-center py-2 px-1 bg-muted/30 gap-1"
                        >
                          <div className="h-2 w-2 rounded-full bg-muted" />
                          <div className="h-2.5 w-10 rounded bg-muted" />
                          <div className="h-2 w-6 rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <div className="h-4 w-14 rounded-[6px] bg-muted" />
                      <div className="h-4 w-18 rounded-[6px] bg-muted" />
                    </div>
                    <div className="h-2.5 w-28 rounded bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-7 flex-1 rounded-[6px] bg-muted" />
                      <div className="h-7 flex-1 rounded-[6px] bg-muted" />
                    </div>
                  </div>
                </div>
              ))
              : allHospitals.map((hospital, i) => {
                if (allHospitals.length === i + 1) {
                  return (
                    <div ref={lastHospitalElementRef} key={hospital.id}>
                      <HospitalCard hospital={hospital} />
                    </div>
                  );
                } else {
                  return (
                    <HospitalCard key={hospital.id} hospital={hospital} />
                  );
                }
              })}
            {isFetchingNextHospitalsPage &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-hosp-${i}`}
                  className="rounded-[6px] border border-border bg-card overflow-hidden animate-pulse"
                >
                  <div className="px-3.5 py-1.5 bg-muted/60 border-b border-border flex items-center justify-between">
                    <div className="h-2.5 w-16 rounded bg-muted" />
                    <div className="h-2.5 w-12 rounded bg-muted" />
                  </div>
                  <div className="px-3.5 pt-3 pb-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-[6px] bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-muted" />
                        <div className="h-2.5 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-border rounded-[6px] border border-border overflow-hidden">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div
                          key={j}
                          className="flex flex-col items-center py-2 px-1 bg-muted/30 gap-1"
                        >
                          <div className="h-2 w-2 rounded-full bg-muted" />
                          <div className="h-2.5 w-10 rounded bg-muted" />
                          <div className="h-2 w-6 rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <div className="h-4 w-14 rounded-[6px] bg-muted" />
                      <div className="h-4 w-18 rounded-[6px] bg-muted" />
                    </div>
                    <div className="h-2.5 w-28 rounded bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-7 flex-1 rounded-[6px] bg-muted" />
                      <div className="h-7 flex-1 rounded-[6px] bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {!hospitalsLoading && allHospitals.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No health facilities found.
            </div>
          )}
        </div>
      </section>

      {/* ── Pharmacy teaser ── */}
      <section
        id="pharmacy"
        className="h-fit flex flex-col justify-center bg-primary  w-full "
      >
        <div className=" grid lg:grid-cols-2  items-center">
          <div className="px-10 py-10 lg:px-20 lg:py-20">
            <h2 className={cn(SECTION_TITLE, "dark:text-black text-white ")}>
              {t("pages.landing.pharmacy_title")}
            </h2>
            <p className="mt-6 text-base md:text-lg dark:text-black  text-white/90 leading-relaxed max-w-xl">
              {t("pages.landing.pharmacy_sub")}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/patient/search-pharmacy">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 hover:scale-[1.02] shadow-xl rounded-[6px] px-8 py-6 text-base font-semibold transition-all duration-300 dark:text-black"
                >
                  <Pill className="mr-2 h-5 w-5" />
                  {t("pages.landing.open_marketplace")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="bg-[url('/images/arpad-czapp-tvP6pCnq9iI.jpg')] bg-cover bg-center h-full">
          </div>
        </div>
      </section>

      {/* ── Our Team ── */}
      <section id="team" className="min-h-dvh flex flex-col justify-center py-20 bg-gradient-soft">
        <div className="container">
          <div className="max-w-2xl">
            <h2 className={SECTION_TITLE}>
              Meet the minds behind MEDICONNECT
            </h2>
          </div>
          <div className="">
            <OurTeam />
          </div>
        </div>
      </section>

   <Footer/>
    </div>
  );
};

export default Index;
