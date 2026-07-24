import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { createPortal } from "react-dom";
import { formatDateOnly, toLocalDateInputValue } from "@/lib/date";
  import {Search,
  Calendar,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Wifi,
  Maximize2,
} from "lucide-react";
import { HeroHeadline } from "@/components/landing/HeroHeadline";

import doctorPlaceholder from "@/assets/doctor-hero.png";
import { HeroHeader } from "@/components/landing/HeroHeader";
import StartConsult from "@/components/landing/StartConsult";
import { useGetSearchDoctors } from "@/hooks/patient/use-patient-doctor";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { localizedText } from "@/lib/localized-settings";

import { cn } from "@/lib/utils";
import { ConnectDialog } from "@/components/ConnectDialog";
import { useCallStore } from "@/context/CallStore";
import type { Doctor } from "@/context/CallStore";

 
interface ApiDoctor {
  id: number;
  specialization: string;
  doctor_degree: string;
  designations: string;
  consultation_fee: string;
  currency: string;
  instant_consultation: boolean;
  is_available: boolean;
  bookings_paused: boolean;
  image: string | null;
  rating_avg: string;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
}

interface DisplayDoctor {
  id: number;
  name: string;
  role: string;
  image: string;
  fee: string;
  currency: string;
  instant: boolean;
  raw: ApiDoctor;
}

function toDisplayDoctor(doc: ApiDoctor, t: TFunction): DisplayDoctor {
  return {
    id: doc.id,
    name: doc.user?.name || doc.designations || t("pages.doctor.fallback_doctor_name"),
    role: doc.specialization || doc.doctor_degree || t("pages.doctor.fallback_specialization"),
    image: doc.image || doc.user?.avatar || doctorPlaceholder,
    fee: doc.consultation_fee,
    currency: doc.currency,
    instant: doc.instant_consultation,
    raw: doc,
  };
}

 
function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const monthNames = t("pages.landing.months", { returnObjects: true }) as string[];
  const dayAbbrevs = t("pages.landing.days_short", { returnObjects: true }) as string[];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const iso = toLocalDateInputValue(d);
    onChange(iso);
    setOpen(false);
  };

  const displayValue = value
    ? formatDateOnly(value + "T00:00:00", i18n.language, {
      year: "numeric", month: "short", day: "numeric",
    })
    : "";

  const clear = (e: React.MouseEvent) => { e.stopPropagation(); onChange(""); };

  return (
    <div ref={ref} className="relative w-full">
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 cursor-pointer w-full"
      >
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={`text-sm flex-1 ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {displayValue || t("pages.landing.date_select")}
        </span>
        {value && (
          <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div
          className="fixed z-[9999] bg-card border border-border rounded-[6px] shadow-xl p-3 w-[min(260px,90vw)]"
          style={{
            bottom: (() => {
              const el = ref.current;
              if (!el) return "auto";
              const rect = el.getBoundingClientRect();
              return `${window.innerHeight - rect.top + 8}px`;
            })(),
            left: (() => {
              const el = ref.current;
              if (!el) return 0;
              const rect = el.getBoundingClientRect();
              const maxLeft = window.innerWidth - Math.min(260, window.innerWidth * 0.9) - 8;
              return `${Math.min(Math.max(8, rect.left), maxLeft)}px`;
            })(),
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="w-6 h-6 rounded-[4px] hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-foreground">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="w-6 h-6 rounded-[4px] hover:bg-muted flex items-center justify-center transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {dayAbbrevs.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(viewYear, viewMonth, day);
              date.setHours(0, 0, 0, 0);
              const isPast = date < today;
              const isSelected =
                value === `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = date.getTime() === today.getTime();
              return (
                <button
                  key={day}
                  onClick={() => !isPast && selectDay(day)}
                  disabled={isPast}
                  className={`
                    h-7 w-full rounded-[4px] text-xs font-medium transition-colors
                    ${isSelected ? "bg-primary text-primary-foreground" : ""}
                    ${!isSelected && isToday ? "border border-primary text-primary" : ""}
                    ${!isSelected && !isPast ? "hover:bg-muted text-foreground" : ""}
                    ${isPast ? "text-muted-foreground/40 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-border">
            <button
              onClick={() => selectDay(today.getDate())}
              className="w-full text-xs text-primary font-medium hover:underline"
            >
              {t("pages.landing.date_today")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

//   MeetOurDoctorsSlider 

interface SliderProps {
  doctors: DisplayDoctor[];
  totalDoctors: number;
  index: number;
  setIndex: (n: number) => void;
  setPaused: (p: boolean) => void;
  className?: string;
}

function MeetOurDoctorsSlider({
  doctors,
  totalDoctors,
  index,
  setIndex,
  setPaused,
  className = "",
}: SliderProps) {
  const { t } = useTranslation();

  if (doctors.length === 0) return null;

  const safeIndex = index % doctors.length;
  const doc = doctors[safeIndex];

  const prev = () => { setPaused(true); setIndex((safeIndex - 1 + doctors.length) % doctors.length); };
  const next = () => { setPaused(true); setIndex((safeIndex + 1) % doctors.length); };

  return (
    <div className={`bg-card rounded-[6px] p-3 sm:p-4 border border-border ${className}`}>
      <div className="flex items-center justify-between">
        <div className="font-bold text-foreground text-xs sm:text-sm">{t("pages.doctor.meet_our_doctors")}</div>
        <div className="flex gap-1">
          <button
            onClick={prev}
            className="w-6 h-6 rounded-[4px] bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors grid place-items-center"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={next}
            className="w-6 h-6 rounded-[4px] bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors grid place-items-center"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
        <img
          src={doc.image}
          alt={doc.name}
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-card shrink-0"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
        />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-foreground text-xs sm:text-sm truncate">{doc.name}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{doc.role}</div>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full text-primary-foreground text-[9px] sm:text-[10px] font-bold grid place-items-center shrink-0 bg-gradient-primary">
          {totalDoctors}+
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mt-2 sm:mt-3">
        {doctors.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPaused(true); setIndex(i); }}
            aria-label={t("pages.doctor.show_doctor_aria", { number: i + 1 })}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === safeIndex ? "bg-primary w-4" : "bg-muted-foreground/20 w-1.5"
              }`}
          />
        ))}
      </div>
    </div>
  );
}

//  HeroSection 

export default function HeroSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
const [selectedDate, setSelectedDate] = useState("");
const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchDropdownPos, setSearchDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const { data: publicSettings } = usePublicSettings();
  const heroTagline = localizedText(
    publicSettings?.general?.app_tagline,
    i18n.language,
    t("pages.landing.hero_intro"),
  );

useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchValue), 300);
    return () => clearTimeout(timer);
  }, [searchValue]);


  useEffect(() => {
    if (!searchDropdownOpen) return;

    const updatePos = () => {
      const el = searchBoxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSearchDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [searchDropdownOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideBox = searchBoxRef.current?.contains(target);
      const insideDropdown = searchDropdownRef.current?.contains(target);
      if (!insideBox && !insideDropdown) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    const query = searchValue.trim();
    if (query) localStorage.setItem("doctorSearchQuery", query);

    let url = "/patient/search-doctors";
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedDate) params.set("date", selectedDate);

    if (params.toString()) {
      url += "?" + params.toString();
    }

    navigate(url);
  };

  const call = useCallStore();

const { data: instantDoctorsData, isLoading: doctorsLoading } =
    useGetSearchDoctors({
      instant: true,
      page: 1,
      per_page: 6,
      q: debouncedSearch,
      date: selectedDate,
    });

  const { data: searchResultsData, isLoading: searchResultsLoading } =
    useGetSearchDoctors({
      page: 1,
      per_page: 6,
      q: debouncedSearch,
      date: selectedDate,
    });

  const searchResults: DisplayDoctor[] = (searchResultsData?.data ?? []).map((doc) => toDisplayDoctor(doc, t));

  const doctors: DisplayDoctor[] = (instantDoctorsData?.data ?? []).map((doc) => toDisplayDoctor(doc, t));
  const hasDoctors = doctors.length > 0;
  const activeDoc = hasDoctors ? doctors[activeIdx % doctors.length] : null;
  const totalDoctors: number = instantDoctorsData?.total ?? doctors.length;

  const callDoctor: Doctor | null = activeDoc
    ? {
      id: activeDoc.raw.id,
      user: {
        id: activeDoc.raw.user.id,
        name: activeDoc.raw.user.name,
        avatar: activeDoc.raw.user.avatar,
      },
      specialization: activeDoc.raw.specialization,
    }
    : null;

  const isThisDoctor = !!activeDoc && call.doctor?.id === activeDoc.id;
  const isCallInProgress = isThisDoctor && call.phase !== "idle";
  const isAnyCallInProgress = call.phase !== "idle";
  const isConnected = isThisDoctor && call.phase === "connected";
  const isMinimized = isConnected && call.minimized;

  const canConnect =
    !!activeDoc &&
    activeDoc.raw.is_available &&
    !activeDoc.raw.bookings_paused &&
    activeDoc.raw.instant_consultation;

  const dialogDoctor = call.doctor ?? callDoctor;
  const connectOpen = call.dialogOpen && !!dialogDoctor;

  const handleOpenChange = (v: boolean) => {
    if (!v && isAnyCallInProgress) call.setMinimized(true);
    else call.setDialogOpen(v);
  };

const handleConnect = () => {
    if (!callDoctor || !canConnect) return;
    setPaused(true);
    if (isMinimized) call.setMinimized(false);
    else if (isCallInProgress) call.setDialogOpen(true);
    else call.startCall(callDoctor);
  };

  const handleSelectSearchDoctor = (doc: DisplayDoctor) => {
    const doctorForCall: Doctor = {
      id: doc.raw.id,
      user: {
        id: doc.raw.user.id,
        name: doc.raw.user.name,
        avatar: doc.raw.user.avatar,
      },
      specialization: doc.raw.specialization,
    };

    const isThisDocInCall = call.doctor?.id === doctorForCall.id;
    const docCallInProgress = isThisDocInCall && call.phase !== "idle";
    const docConnected = isThisDocInCall && call.phase === "connected";
    const docMinimized = docConnected && call.minimized;

    const docCanConnect =
      doc.raw.is_available && !doc.raw.bookings_paused && doc.raw.instant_consultation;

setSearchDropdownOpen(false);
    setSearchValue(doc.name);

    if (!docCanConnect && !docCallInProgress) return;

    if (docMinimized) call.setMinimized(false);
    else if (docCallInProgress) call.setDialogOpen(true);
    else call.startCall(doctorForCall);
  };

  useEffect(() => {
    if (!call.doctor?.id || doctors.length === 0) return;

    const callDoctorIndex = doctors.findIndex((doctor) => doctor.id === call.doctor?.id);
    if (callDoctorIndex >= 0 && callDoctorIndex !== activeIdx) {
      setActiveIdx(callDoctorIndex);
    }
  }, [activeIdx, call.doctor?.id, doctors]);

  useEffect(() => {
    if (paused || call.dialogOpen || isAnyCallInProgress || !hasDoctors || doctors.length < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(
      () => setActiveIdx((p) => (p + 1) % doctors.length),
      8000,
    );

    return () => window.clearInterval(timer);
  }, [paused, call.dialogOpen, isAnyCallInProgress, hasDoctors, doctors.length]);

  return (
    <div className="min-h-[540px] lg:min-h-[610px] lg:mt-0 lg:pt-0 pt-12 bg-background overflow-x-hidden relative">
      {/* Mobile-only background image — same artwork used as a full-bleed backdrop instead of a side image */}
      <div className="absolute inset-0 top-0 pointer-events-none lg:hidden" aria-hidden="true">
        <img
          src="/images/Jul18202601_47_20AM.png"
          alt=""
          className="h-full w-full object-cover object-center opacity-45"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>
      {/* Soft hero lighting */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_76%_45%,hsl(var(--primary)/0.22),transparent_32%),radial-gradient(circle_at_18%_56%,hsl(var(--primary)/0.1),transparent_34%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none hidden bg-gradient-to-r from-background via-background/92 to-background/70 lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 left-0 w-[58%] pointer-events-none hidden bg-gradient-to-b from-background via-transparent to-background lg:block"
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 right-0 z-0 hidden w-[62vw] pointer-events-none lg:block"
        aria-hidden="true"
      >
        <img
          src="/images/Jul18202601_47_20AM.png"
          alt=""
          className="h-full w-full object-cover object-center opacity-80"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/35 to-background/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-transparent to-background/65" />
      </div>
      {/* Diagonal lines background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, hsl(var(--accent)) 0 1px, transparent 1px 22px)",
        }}
      />

      <div className="relative">
     
        <section id="landing-page" className="relative mx-auto grid min-h-[540px] max-w-7xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:min-h-[610px] lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:px-10 lg:py-12">

          
          <div className="relative z-10 w-full max-w-[680px]">
          <HeroHeadline />
            <p className="mt-3 sm:mt-4 max-w-2xl text-sm font-medium leading-6 text-muted-foreground sm:text-[15px] text-center lg:text-left mx-auto lg:mx-0">
              {heroTagline}
            </p> 
            <StartConsult />
 
            <div className="mt-4 max-w-[620px] overflow-visible rounded-[8px] border border-border/80 bg-card/95 shadow-lg shadow-black/5 backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center gap-0">
                <div className="flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0 border-b sm:border-b-0 sm:border-r border-border">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={searchValue}
                    onChange={(e) => {
                      setSearchValue(e.target.value);
                      setSearchDropdownOpen(e.target.value.trim().length > 0);
                    }}
                    onFocus={() => {
                      if (searchValue.trim().length > 0) setSearchDropdownOpen(true);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="bg-transparent outline-none text-xs sm:text-sm w-full placeholder:text-muted-foreground text-foreground min-w-0"
                    placeholder={t("pages.landing.search_doctors_placeholder")}
                  />

{searchDropdownOpen &&
                    debouncedSearch.trim().length > 0 &&
                    typeof document !== "undefined" &&
                    createPortal(
                      <div
                        ref={searchDropdownRef}
                        className="fixed z-[9999] bg-card border border-border rounded-[6px] shadow-xl max-h-[280px] overflow-y-auto"
                        style={{
                          top: `${searchDropdownPos.top}px`,
                          left: `${searchDropdownPos.left}px`,
                          width: `${searchDropdownPos.width}px`,
                        }}
                      >
                        {searchResultsLoading ? (
                          <div className="px-3 py-3 text-xs text-muted-foreground">
                            {t("pages.landing.searching", { defaultValue: "Searching..." })}
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-muted-foreground">
                            {t("pages.landing.no_doctors_available")}
                          </div>
                        ) : (
                          searchResults.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => handleSelectSearchDoctor(doc)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left"
                            >
                              <img
                                src={doc.image}
                                alt={doc.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = doctorPlaceholder; }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-foreground truncate">{doc.name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{doc.role}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>,
                      document.body,
                    )}
                </div>

                <div className="flex items-center gap-2.5 px-3 py-2 sm:w-[180px] shrink-0 border-b sm:border-b-0 sm:border-r border-border">
                  <DatePicker value={selectedDate} onChange={setSelectedDate} />
                </div>

                <div className="px-1.5 py-1 shrink-0">
                  <button
                    onClick={handleSearch}
                    className="w-full sm:w-auto text-primary-foreground font-semibold rounded-[4px] px-3 sm:px-4 py-1.5 text-xs sm:text-sm bg-gradient-primary hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    {t("pages.landing.search_action")}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}

