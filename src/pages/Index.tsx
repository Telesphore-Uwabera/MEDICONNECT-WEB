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
  Building2,
  BookOpen,
  FileText,
} from "lucide-react";

import echo from "@/lib/echo";

import { Button } from "@/components/ui/button";
import { DoctorCard } from "@/components/DoctorCard";

import { cn } from "@/lib/utils";

import { useTheme } from "@/context/ThemeContext";

import LOGODARK from "@/assets/LOGODARK.png";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

import TopBar from "@/components/landing/TopBar";
import Navbar from "@/components/landing/Navbar";
import HeroCta from "@/components/landing/HeroCta";

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
import VerifiedFacilities from "@/components/landing/VerifiedFacilities";
import { HeroHeader } from "@/components/landing/HeroHeader";
import { usePublicSettings } from "@/hooks/use-public-settings";
import Footer from "@/components/landing/Footer";
import { localizedText } from "@/lib/localized-settings";

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
  const appTagline = localizedText(
    generalSettings?.app_tagline,
    i18n.language,
    t("pages.landing.footer_desc"),
  );
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

      {/* ?? Top rated doctors + quick access ?? */}
      <section
        id="doctors"
        className="w-full border-t border-border bg-gradient-soft py-10 md:py-12"
      >
        <div className="container space-y-6">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  {t("pages.landing.top_rated_doctors")}
                </h2>
                <Link to="/patient/search-doctors" className="text-sm font-semibold text-primary hover:underline">
                  {t("pages.landing.view_all")}
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctorsLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[6px] border border-border bg-card p-3.5 shadow-sm space-y-2.5 animate-pulse"
                    >
                      <div className="h-28 rounded-[6px] bg-muted" />
                      <div className="h-4 w-2/3 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                      <div className="h-9 rounded-[6px] bg-muted" />
                    </div>
                  ))
                  : allDoctors.slice(0, 6).map((doctor) => (
                    <DoctorCard key={doctor.id} doctor={doctor} />
                  ))}
              </div>

              {!doctorsLoading && allDoctors.length === 0 && (
                <div className="rounded-[6px] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  {t("pages.landing.no_doctors_match")}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">
                {t("pages.landing.quick_access")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { to: "/patient/search-doctors", icon: Calendar, label: t("pages.landing.qa_book_appointment"), tone: "bg-emerald-100 text-emerald-700" },
                  { to: "/patient/search-pharmacy", icon: Pill, label: t("pages.landing.qa_find_pharmacy"), tone: "bg-blue-100 text-blue-700" },
                  { to: "/patient/search-facilities", icon: Building2, label: t("pages.landing.qa_find_facility"), tone: "bg-violet-100 text-violet-700" },
                  { to: "/help", icon: BookOpen, label: t("pages.landing.qa_health_articles"), tone: "bg-orange-100 text-orange-700" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="w-full sm:w-auto text-primary-foreground font-semibold rounded-[4px] px-3 sm:px-5 py-2 text-xs sm:text-sm bg-gradient-primary hover:opacity-90 transition-opacity whitespace"
                    > 
                      <span className=" block text-sm font-semibold">
                        {item.label}
                      </span> 
                    </Link>
                  );
                })}
              </div>

              <Link
                to="/verify-certificate"
                className="group flex items-center gap-4 rounded-[6px] border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              > 
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                  {t("pages.landing.qa_fitness_certificates")}
                </span>
                <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
              </Link>

              <div className="relative overflow-hidden rounded-[6px] border border-primary/15 bg-primary/10 p-5">
                <div className="relative z-10">
                  <p className="text-base font-semibold text-foreground">{t("pages.landing.urgent_help_title")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("pages.landing.urgent_help_sub")}</p>
                  <a href={`tel:${generalSettings?.contact_phone ?? "+250 782 168 650"}`} className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary">
                    <Phone className="h-4 w-4" />
                    {generalSettings?.contact_phone ?? "+250 782 168 650"}
                  </a>
                </div>
                <Activity className="absolute bottom-3 right-5 h-14 w-14 text-primary/25" />
              </div>
            </aside>
          </div>

          <div className="overflow-hidden rounded-[6px] border border-primary/20 bg-primary/10 shadow-sm">
            <div className="grid min-h-[150px] lg:grid-cols-[minmax(0,0.95fr)_1.05fr]">
              <div className="flex flex-col justify-center p-5 md:p-7">
                <h3 className="max-w-md text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                  {t("pages.landing.pharmacy_banner_title")}
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {t("pages.landing.pharmacy_banner_sub")}
                </p>
                <Button asChild className="mt-6 w-fit rounded-[6px] px-6">
                  <Link to="/patient/search-pharmacy">
                    {t("pages.landing.explore_pharmacies")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="min-h-[150px] md:min-h-[170px] bg-[url('/images/arpad-czapp-tvP6pCnq9iI.jpg')] bg-cover bg-center" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Specialities ── */}
      <section id="specialities" className=" flex flex-col justify-center py-10 md:py-12">
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

      <VerifiedFacilities />

      {/* ?? Our Team ?? */}
      <section id="team" className="border-t border-border bg-gradient-soft py-10 md:py-12">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className={SECTION_TITLE}>
                {t("pages.landing.team_heading")}
              </h2>
              <p className="mt-2 text-sm md:text-base text-muted-foreground">
                {t("pages.landing.team_sub")}
              </p>
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
