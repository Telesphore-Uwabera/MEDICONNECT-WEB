import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Zap, ShieldCheck, Lock, Wifi, CalendarCheck } from "lucide-react";
import { HeroHeadline } from "@/components/landing/HeroHeadline";
import StartConsult from "@/components/landing/StartConsult";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";
import { useGetSearchDoctors, type ApiDoctor } from "@/hooks/patient/use-patient-doctor";
import { apiFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/image-url";
import { doctorOffersInstant, type PublicDoctorSchedule } from "@/lib/doctor-presence";
import { UnifiedModal } from "@/components/DoctorCard";
import { BookingDialog } from "@/components/BookingDialog";
import type { Doctor as CallDoctor } from "@/context/CallStore";

const HERO_PHOTO = "/images/hero/consult-1280.webp";
const HERO_SRCSET = "/images/hero/consult-640.webp 640w, /images/hero/consult-960.webp 960w, /images/hero/consult-1280.webp 1280w, /images/hero/consult-1920.webp 1920w";
const HERO_DOCTOR_ROTATE_MS = 5000; // 5 seconds per doctor

const FEATURES = [
  { key: "hero_feature_seconds",  fallback: "Consult in seconds",          icon: Zap       },
  { key: "hero_feature_licensed", fallback: "Licensed & verified doctors",  icon: ShieldCheck },
  { key: "hero_feature_privacy",  fallback: "Your privacy, our priority",   icon: Lock      },
] as const;

// ─── HeroSection ────────────────────────────────────────────────────────────

export default function HeroSection() {
  const { t, i18n } = useTranslation();
  const { data: publicSettings } = usePublicSettings();
  const heroTagline = localizedText(
    publicSettings?.general?.app_tagline,
    i18n.language,
    t("pages.landing.hero_intro"),
  );

  const { data: doctorsData } = useGetSearchDoctors({ per_page: 100 });
  const doctorList = doctorsData?.data ?? [];

  const { heroDoctors, showingOnline } = useMemo(() => {
    const withPhoto = (doctor: ApiDoctor) => Boolean(doctor.image || doctor.user?.avatar);
    const instant = doctorList.filter((doctor) => doctor.instant_consultation);
    if (instant.length) return { heroDoctors: instant, showingOnline: true };

    const featured = doctorList.filter((doctor) => (doctor.is_featured || doctor.show_homepage) && withPhoto(doctor));
    const fallback = (featured.length ? featured : doctorList.filter(withPhoto)).slice(0, 5);
    return { heroDoctors: fallback, showingOnline: false };
  }, [doctorList]);

  const [activeDoctorIdx, setActiveDoctorIdx] = useState(0);
  const [prevDoctorIdx,   setPrevDoctorIdx]   = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused,  setIsPaused]  = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"details" | "connect">("details");
  const [bookOpen,  setBookOpen]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const heroKey = heroDoctors.map((doctor) => doctor.id).join("|");
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeDoctorIdx;
  }, [activeDoctorIdx]);

  useEffect(() => {
    setActiveDoctorIdx(0);
    setPrevDoctorIdx(null);
  }, [heroKey]);

  // ── 5-second crossfade rotation ─────────────────────────────────────────
  useEffect(() => {
    if (heroDoctors.length < 2 || isPaused || modalOpen || bookOpen) return;
    let swapTimer = 0;
    const id = window.setInterval(() => {
      setIsTransitioning(true);
      swapTimer = window.setTimeout(() => {
        const current = activeIndexRef.current;
        const next = (current + 1) % heroDoctors.length;
        setPrevDoctorIdx(current);
        setActiveDoctorIdx(next);
        setIsTransitioning(false);
      }, 700);
    }, HERO_DOCTOR_ROTATE_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(swapTimer);
    };
  }, [heroDoctors.length, isPaused, modalOpen, bookOpen]);

  // ── Progress bar ─────────────────────────────────────────────────────────
  useEffect(() => {
    setProgress(0);
    if (isPaused || modalOpen || bookOpen || heroDoctors.length < 2) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const pct = Math.min(((now - start) / HERO_DOCTOR_ROTATE_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeDoctorIdx, isPaused, modalOpen, bookOpen, heroDoctors.length]);

  const activeDoctor = heroDoctors[activeDoctorIdx % Math.max(heroDoctors.length, 1)] ?? null;
  const prevDoctor   = prevDoctorIdx !== null
    ? (heroDoctors[prevDoctorIdx % heroDoctors.length] ?? null)
    : null;

  const getPhotoSrc = (d: ApiDoctor | null) =>
    resolveMediaUrl(d?.image || d?.user?.avatar) || "";

  const heroPhoto = (src: string, alt: string, eager: boolean) => {
    const remote = Boolean(src);
    return (
      <img
        src={remote ? src : HERO_PHOTO}
        srcSet={remote ? undefined : HERO_SRCSET}
        sizes={remote ? undefined : "(max-width: 768px) 92vw, 640px"}
        alt={alt}
        width={1280}
        height={1920}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    );
  };

  const { data: activeSchedule } = useQuery({
    queryKey: ["doctor-availability", activeDoctor?.slug],
    queryFn: () => apiFetch<PublicDoctorSchedule>(`/public/doctors/${activeDoctor?.slug}/availability`),
    enabled: !!activeDoctor?.slug,
    staleTime: 60_000,
  });

  const canConnect = Boolean(activeDoctor && doctorOffersInstant(activeDoctor, activeSchedule));
  const canBook = Boolean(activeDoctor);

  const callDoctor: CallDoctor | null = activeDoctor
    ? {
        id: activeDoctor.id,
        user: { id: activeDoctor.user.id, name: activeDoctor.user.name, avatar: activeDoctor.user.avatar },
        specialization: activeDoctor.specialization,
      }
    : null;

  const handleHeroCta = () => {
    if (!activeDoctor) return;
    if (canConnect) { setModalMode("connect"); setModalOpen(true); }
    else if (canBook) setBookOpen(true);
  };

  return (
    <div className="min-h-[540px] md:min-h-[560px] pt-12 md:pt-0 bg-background overflow-x-hidden relative">

      {/* Mobile backdrop */}
      <div className="absolute inset-0 top-0 pointer-events-none md:hidden" aria-hidden="true">
        <img src={HERO_PHOTO} srcSet={HERO_SRCSET} sizes="100vw" alt="" width={1280} height={1920} className="h-full w-full object-cover object-center opacity-45" loading="eager" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      {/* Soft lighting */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_82%_35%,hsl(var(--primary)/0.16),transparent_38%),radial-gradient(circle_at_14%_60%,hsl(var(--primary)/0.08),transparent_36%)]" aria-hidden="true" />

      <div className="relative">
        <section
          id="landing-page"
          className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 relative grid min-h-[540px] grid-cols-1 items-center gap-10 py-10 md:min-h-[560px] md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:py-14 lg:gap-14 lg:py-16"
        >
          {/* ── Text column ── */}
          <div className="relative z-10 mx-auto w-full max-w-[560px] text-left md:mx-0 md:max-w-none">
            <HeroHeadline />
            <p className="mt-6 max-w-lg text-base font-normal leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {heroTagline}
            </p>

            <ul className="mt-6 flex flex-col items-start gap-3 sm:mt-7">
              {FEATURES.map(({ key, fallback, icon: Icon }, index) => (
                <li
                  key={key}
                  className="hero-feature flex items-center gap-3"
                  style={{ animationDelay: `${140 + index * 90}ms` }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {t(`pages.landing.${key}`, fallback)}
                  </span>
                </li>
              ))}
            </ul>

            <StartConsult />
          </div>

          {/* ── Photo column ── */}
          <div
            className="relative mx-auto flex w-full max-w-[320px] items-end justify-center sm:max-w-[380px] lg:max-w-[420px]"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Animated background blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div className="hero-blob absolute -top-8 -right-8 h-64 w-64 rounded-full bg-primary/10" />
              <div className="hero-blob hero-blob-slow absolute -bottom-4 -left-4 h-44 w-44 rounded-full bg-primary/8" />
            </div>

            {/* Portrait card — floats gently */}
            <div
              className="hero-float group relative z-10 w-full max-w-full cursor-pointer"
              onClick={handleHeroCta}
            >
              {/* Card frame — 3:4 portrait, no circle */}
              <div
                className="relative overflow-hidden rounded-3xl shadow-[0_24px_60px_-24px_hsl(172_45%_18%/0.45)] ring-1 ring-border/50"
                style={{ aspectRatio: "3/4" }}
              >
                {/* ── Crossfade image stack ── */}

                {/* Previous image — fades OUT as new one comes in */}
                {prevDoctor && (
                  <span
                    key={`prev-${prevDoctor.id}`}
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      opacity: isTransitioning ? 0 : 1,
                      transition: "opacity 1.4s cubic-bezier(0.4,0,0.2,1)",
                      zIndex: 1,
                    }}
                  >
                    {heroPhoto(getPhotoSrc(prevDoctor), "", true)}
                  </span>
                )}

                <span
                  key={`active-${activeDoctor?.id ?? "static"}`}
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={{
                    opacity: isTransitioning ? 0 : 1,
                    transition: "opacity 1.4s cubic-bezier(0.4,0,0.2,1), transform 700ms ease",
                    zIndex: 2,
                  }}
                >
                  {heroPhoto(getPhotoSrc(activeDoctor), activeDoctor?.user?.name ?? t("pages.landing.hero_image_alt"), true)}
                </span>

                {/* Bottom gradient */}
                <div
                  className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                  style={{ zIndex: 3 }}
                />

                {/* ── Doctor info — crossfades with the image ── */}
                {activeDoctor && (
                  <div
                    className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-8"
                    style={{
                      zIndex: 4,
                      opacity: isTransitioning ? 0 : 1,
                      transform: isTransitioning ? "translateY(6px)" : "translateY(0)",
                      transition: "opacity 0.7s ease, transform 0.7s ease",
                    }}
                  >
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        {/* Full name */}
                        <p className="truncate text-sm font-bold leading-tight text-white drop-shadow-md">
                          {activeDoctor.user?.name ?? ""}
                        </p>
                        {/* Speciality from DB — fallback to General Practitioner */}
                        <p className="mt-0.5 truncate text-[11px] font-semibold leading-none text-white/80 drop-shadow">
                          {activeDoctor.specialization
                            || t("pages.landing.general_practitioner", "General Practitioner")}
                        </p>
                      </div>

                      {/* Availability indicator */}
                      {showingOnline && (
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mb-0.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white/30"
                            style={{ animation: "hero-pulse 2s ease-in-out infinite" }}
                          />
                          <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wide">Live</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Connect / Book hover overlay */}
                {activeDoctor && (canConnect || canBook) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100"
                    style={{ zIndex: 5 }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleHeroCta(); }}
                      className="inline-flex translate-y-2 scale-95 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:scale-100 hover:bg-primary/90"
                    >
                      {canConnect ? (
                        <><Wifi className="h-4 w-4" />{t("pages.cards.instant_consultation", { defaultValue: "Instant Consultation" })}</>
                      ) : (
                        <><CalendarCheck className="h-4 w-4" />{t("pages.cards.book", { defaultValue: "Book" })}</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Progress bar + dot indicators ── */}
              {heroDoctors.length > 1 && (
                <div className="mt-3 space-y-2">
                  {/* Thin sweep progress bar */}
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted-foreground/15">
                    <div
                      className="h-full rounded-full bg-primary transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* Dot indicators */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {heroDoctors.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setPrevDoctorIdx(activeDoctorIdx);
                          setActiveDoctorIdx(i);
                          setProgress(0);
                        }}
                        className={`transition-all duration-300 rounded-full ${
                          i === activeDoctorIdx
                            ? "w-5 h-1.5 bg-primary"
                            : "w-1.5 h-1.5 bg-muted-foreground/30"
                        }`}
                        aria-label={`Doctor ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dot grid decoration */}
            <div
              className="absolute -top-4 -right-4 z-20 h-20 w-20 opacity-30 lg:-right-2"
              style={{
                backgroundImage: "radial-gradient(hsl(var(--primary)) 1.5px, transparent 1.5px)",
                backgroundSize: "10px 10px",
              }}
              aria-hidden="true"
            />

            <style>{`
              @keyframes hero-feature-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
              .hero-feature { animation: hero-feature-in 520ms cubic-bezier(0.22,1,0.36,1) both; }
              @keyframes hero-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
              .hero-float { animation: hero-float 6s ease-in-out infinite; }
              @keyframes hero-blob1 { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.06) translate(4px,-6px)} }
              .hero-blob { animation: hero-blob1 8s ease-in-out infinite; }
              .hero-blob-slow { animation-duration: 10s; }
              @keyframes hero-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0.5)} 50%{box-shadow:0 0 0 5px rgba(52,211,153,0)} }
              @media (prefers-reduced-motion: reduce) {
                .hero-feature, .hero-float, .hero-blob { animation: none; }
              }
            `}</style>
          </div>
        </section>
      </div>

      {activeDoctor && callDoctor && (
        <>
          <UnifiedModal
            doctor={activeDoctor}
            callDoctor={callDoctor}
            initialMode={modalMode}
            open={modalOpen}
            onMinimize={() => setModalOpen(false)}
            onCloseCompletely={() => setModalOpen(false)}
            onBook={() => setBookOpen(true)}
            canBook={canBook}
            canConnect={canConnect}
          />
          <BookingDialog doctor={activeDoctor} open={bookOpen} onOpenChange={setBookOpen} />
        </>
      )}
    </div>
  );
}
