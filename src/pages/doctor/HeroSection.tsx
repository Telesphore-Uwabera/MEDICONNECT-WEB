import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Zap, ShieldCheck, Lock, Heart, Wifi, CalendarCheck } from "lucide-react";
import { HeroHeadline } from "@/components/landing/HeroHeadline";
import StartConsult from "@/components/landing/StartConsult";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";
import { useGetSearchDoctors, type ApiDoctor } from "@/hooks/patient/use-patient-doctor";
import { UnifiedModal } from "@/components/DoctorCard";
import { BookingDialog } from "@/components/BookingDialog";
import type { Doctor as CallDoctor } from "@/context/CallStore";

const HERO_PHOTO = "/images/Jul18202601_47_20JM.png";
const HERO_DOCTOR_ROTATE_MS = 6000;

const FEATURES = [
  { key: "hero_feature_seconds", fallback: "Consult in seconds", icon: Zap },
  { key: "hero_feature_licensed", fallback: "Licensed & verified doctors", icon: ShieldCheck },
  { key: "hero_feature_privacy", fallback: "Your privacy, our priority", icon: Lock },
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

  // Featured / active doctor for the circular photo on larger screens.
  const { data: doctorsData } = useGetSearchDoctors({ per_page: 6 });
  const heroDoctors = useMemo(() => {
    const list = doctorsData?.data ?? [];
    const withPhoto = (d: ApiDoctor) => Boolean(d.image || d.user?.avatar);
    const featured = list.filter((d) => (d.is_featured || d.show_homepage) && withPhoto(d));
    return (featured.length ? featured : list.filter(withPhoto)).slice(0, 5);
  }, [doctorsData]);

  const [activeDoctorIdx, setActiveDoctorIdx] = useState(0);
  // Paused while the visitor is hovering the photo, or while either modal it
  // opens is up — otherwise the doctor underneath could change mid-interaction.
  const [isPaused, setIsPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"details" | "connect">("details");
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    if (heroDoctors.length < 2 || isPaused || modalOpen || bookOpen) return;
    const id = window.setInterval(() => {
      setActiveDoctorIdx((i) => (i + 1) % heroDoctors.length);
    }, HERO_DOCTOR_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [heroDoctors.length, isPaused, modalOpen, bookOpen]);

  const activeDoctor = heroDoctors[activeDoctorIdx % heroDoctors.length] ?? null;
  const [doctorImgError, setDoctorImgError] = useState(false);
  useEffect(() => setDoctorImgError(false), [activeDoctor?.id]);

  const heroPhotoSrc =
    activeDoctor && !doctorImgError ? activeDoctor.image || activeDoctor.user?.avatar || HERO_PHOTO : HERO_PHOTO;

  const canConnect = Boolean(
    activeDoctor?.is_available && !activeDoctor?.bookings_paused && activeDoctor?.instant_consultation,
  );
  const canBook = Boolean(activeDoctor?.is_available && !activeDoctor?.bookings_paused);
  const callDoctor: CallDoctor | null = activeDoctor
    ? {
        id: activeDoctor.id,
        user: {
          id: activeDoctor.user.id,
          name: activeDoctor.user.name,
          avatar: activeDoctor.user.avatar,
        },
        specialization: activeDoctor.specialization,
      }
    : null;

  const handleHeroCta = () => {
    if (!activeDoctor) return;
    if (canConnect) {
      setModalMode("connect");
      setModalOpen(true);
    } else if (canBook) {
      setBookOpen(true);
    }
  };

  return (
    <div className="min-h-[540px] md:min-h-[560px] pt-12 md:pt-0 bg-background overflow-x-hidden relative">
      {/* Mobile-only background image — same artwork used as a full-bleed backdrop */}
      <div className="absolute inset-0 top-0 pointer-events-none md:hidden" aria-hidden="true">
        <img
          src={HERO_PHOTO}
          alt=""
          className="h-full w-full object-cover object-center opacity-45"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      {/* Soft hero lighting */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_82%_35%,hsl(var(--primary)/0.16),transparent_38%),radial-gradient(circle_at_14%_60%,hsl(var(--primary)/0.08),transparent_36%)]"
        aria-hidden="true"
      />
      {/* Diagonal lines background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, hsl(var(--accent)) 0 1px, transparent 1px 22px)",
        }}
      />

      <div className="relative">
        <section
          id="landing-page"
          className="container relative grid min-h-[540px] grid-cols-1 items-center gap-10 py-10 md:min-h-[560px] md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:py-14 lg:gap-14 lg:py-16"
        >
          {/* ── Text column ── */}
         <div className="relative z-10 mx-auto w-full max-w-[560px] text-left md:mx-0 md:max-w-none">
            <HeroHeadline />
            <p className="mt-5 max-w-lg text-[15px] font-medium leading-7 text-muted-foreground sm:mt-6 sm:text-base">
              {heroTagline}
            </p>

            {/* Feature bullets */}
            <ul className="mt-6 flex flex-col items-start gap-3 sm:mt-7">
              {FEATURES.map(({ key, fallback, icon: Icon }) => (
                <li key={key} className="flex items-center gap-3">
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
          <div className="relative mx-auto hidden w-full max-w-[380px] items-end justify-center md:flex lg:max-w-[420px]">

            {/* Floating background blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div
                className="absolute -top-8 -right-8 h-64 w-64 rounded-full bg-primary/10"
                style={{ animation: "hero-blob1 7s ease-in-out infinite" }}
              />
              <div
                className="absolute -bottom-4 -left-4 h-44 w-44 rounded-full bg-primary/8"
                style={{ animation: "hero-blob2 9s ease-in-out infinite" }}
              />
            </div>

            {/* Portrait card */}
            <div
              className="group relative z-10 w-full cursor-pointer"
              style={{ animation: "hero-float 5s ease-in-out infinite" }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Card frame — tall portrait, rounded corners, NO circle */}
              <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border/40"
                   style={{ aspectRatio: "3/4" }}>

                {/* Doctor image */}
                <img
                  key={activeDoctor?.id ?? "static"}
                  src={heroPhotoSrc}
                  alt={activeDoctor ? activeDoctor.user?.name ?? "" : ""}
                  className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  style={{ animation: "hero-fade-in 0.6s ease forwards" }}
                  loading="eager"
                  onError={() => setDoctorImgError(true)}
                />

                {/* Bottom gradient overlay — always visible */}
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Doctor name chip — bottom of card */}
                {activeDoctor && (
                  <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-2 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold leading-tight text-white drop-shadow">
                        {activeDoctor.user?.name ?? ""}
                      </p>
                      {activeDoctor.specialization && (
                        <p className="mt-0.5 truncate text-[11px] font-medium leading-none text-white/75">
                          {activeDoctor.specialization}
                        </p>
                      )}
                    </div>
                    {/* Availability dot */}
                    {activeDoctor.is_available && (
                      <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 ring-2 ring-white/30 mb-0.5"
                            style={{ animation: "hero-pulse 2s ease-in-out infinite" }} />
                    )}
                  </div>
                )}

                {/* Connect / Book hover overlay */}
                {activeDoctor && (canConnect || canBook) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={handleHeroCta}
                      className="inline-flex translate-y-2 scale-95 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:scale-100 hover:bg-primary/90"
                    >
                      {canConnect ? (
                        <>
                          <Wifi className="h-4 w-4" />
                          {t("pages.cards.connect", { defaultValue: "Connect" })}
                        </>
                      ) : (
                        <>
                          <CalendarCheck className="h-4 w-4" />
                          {t("pages.cards.book", { defaultValue: "Book" })}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Slide indicator dots */}
              {heroDoctors.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {heroDoctors.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDoctorIdx(i)}
                      className={`transition-all duration-300 rounded-full ${
                        i === activeDoctorIdx
                          ? "w-5 h-1.5 bg-primary"
                          : "w-1.5 h-1.5 bg-muted-foreground/30"
                      }`}
                      aria-label={`Doctor ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Decorative dot grid */}
            <div
              className="absolute -top-4 -right-4 z-20 h-20 w-20 opacity-30 lg:-right-2"
              style={{
                backgroundImage: "radial-gradient(hsl(var(--primary)) 1.5px, transparent 1.5px)",
                backgroundSize: "10px 10px",
              }}
              aria-hidden="true"
            />

            {/* Keyframe animations injected inline */}
            <style>{`
              @keyframes hero-float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
              @keyframes hero-blob1 {
                0%, 100% { transform: scale(1) translate(0, 0); }
                33% { transform: scale(1.08) translate(6px, -8px); }
                66% { transform: scale(0.96) translate(-4px, 6px); }
              }
              @keyframes hero-blob2 {
                0%, 100% { transform: scale(1) translate(0, 0); }
                40% { transform: scale(1.1) translate(-6px, 8px); }
                70% { transform: scale(0.94) translate(4px, -4px); }
              }
              @keyframes hero-fade-in {
                from { opacity: 0; transform: scale(1.03); }
                to   { opacity: 1; transform: scale(1); }
              }
              @keyframes hero-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
                50% { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
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
          <BookingDialog
            doctor={activeDoctor}
            open={bookOpen}
            onOpenChange={setBookOpen}
          />
        </>
      )}
    </div>
  );
}
