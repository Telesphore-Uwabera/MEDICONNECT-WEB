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
  // const contactEmail = generalSettings?.contact_email || "support@mediconnect.com";
  // const contactPhone = generalSettings?.contact_phone || "+250 788 123 456";
  // const contactAddress = generalSettings?.contact_address || "Kigali, Rwanda";

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
