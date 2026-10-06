import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  Bone,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  HeartPulse,
  Scissors,
  Search,
  Smile,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { BROWSE_SPECIALTIES, type BrowseSpecialty } from '@/lib/browse-specialties';

interface LandingSpecializationFee {
  id: number;
  slug?: string | null;
  name?: string | null;
  specialization?: string | { id?: number; name?: string; slug?: string } | null;
  sub_specialization?: string | null;
  sub_specialization_en?: string | null;
  sub_specialization_fr?: string | null;
  sub_specialization_kiny?: string | null;
  tier_name?: string | null;
  doctorCount?: number;
  doctors_count?: number;
  icon_svg?: string | null;
}

type SpecializationFeesResponse =
  | LandingSpecializationFee[]
  | {
      data?: LandingSpecializationFee[];
      specialization_fees?: LandingSpecializationFee[];
    };

interface ServiceDefinition extends BrowseSpecialty {
  fallbackIcon: LucideIcon;
  fallbackSvg?: string;
  searchUrl?: string;
}

const SPECIALTY_ICONS: Record<string, Pick<ServiceDefinition, "fallbackIcon" | "fallbackSvg" | "searchUrl">> = {
  "internal-medicine": { fallbackIcon: HeartPulse },
  pediatrics: { fallbackIcon: Baby },
  "gynecology-and-obstetrics": { fallbackIcon: Heart },
  "general-surgery": { fallbackIcon: Scissors },
  "stomatology-dental-surgery": {
    fallbackIcon: Smile,
    fallbackSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 5.5 2 8 .6 3 1.5 5 2.5 5s1.5-2.5 1.5-5c0-1.5.5-2 0-3-.5 1 0 1.5 0 3 0 2.5.5 5 1.5 5s1.9-2 2.5-5c.5-2.5 2-5 2-8 0-3.5-2.5-6-6-6z"/></svg>',
    searchUrl: '/patient/search-doctors?type=booking&search=Dental',
  },
  dermatology: { fallbackIcon: Sparkles },
  ophthalmology: { fallbackIcon: Eye },
  "general-medicine-consultations": {
    fallbackIcon: Stethoscope,
    searchUrl:
      '/patient/search-doctors?type=booking&specialization=General+Practitioner&specialization_fee_id=1',
  },
  orthopedics: { fallbackIcon: Bone },
  "mental-counseling": { fallbackIcon: Brain },
};

const TARGET_SERVICES: ServiceDefinition[] = BROWSE_SPECIALTIES.map((item) => ({
  ...item,
  fallbackIcon: SPECIALTY_ICONS[item.key]?.fallbackIcon ?? Stethoscope,
  fallbackSvg: SPECIALTY_ICONS[item.key]?.fallbackSvg,
  searchUrl: SPECIALTY_ICONS[item.key]?.searchUrl,
}));

interface PreparedSpecialization {
  id: number;
  key: string;
  label: string;
  href: string;
  resolvedSlug: string;
  doctorCount?: number;
  Icon: LucideIcon;
  icon_svg?: string | null;
}

const sanitizeSvg = (svg?: string | null): string | null => {
  const raw = svg?.trim();

  if (!raw || !raw.toLowerCase().startsWith('<svg')) {
    return null;
  }

  if (
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  ) {
    return null;
  }

  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');

  if (doc.querySelector('parsererror')) {
    return null;
  }

  const root = doc.documentElement;

  if (root.tagName.toLowerCase() !== 'svg') {
    return null;
  }

  root
    .querySelectorAll('script, foreignObject, iframe, object, embed')
    .forEach((node) => node.remove());

  root.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (
        name.startsWith('on') ||
        value.startsWith('javascript:')
      ) {
        node.removeAttribute(attr.name);
      }
    });
  });

  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('focusable', 'false');

  return new XMLSerializer().serializeToString(root);
};

function SpecialtyIcon({
  svg,
  fallback: Fallback,
}: {
  svg?: string | null;
  fallback: LucideIcon;
}) {
  const safeSvg = sanitizeSvg(svg);

  if (safeSvg) {
    return (
      <span
        className="
          flex h-6 w-6 items-center justify-center
          [&_svg]:h-6 [&_svg]:w-6
          [&_svg]:max-h-full [&_svg]:max-w-full
        "
        dangerouslySetInnerHTML={{ __html: safeSvg }}
      />
    );
  }

  return <Fallback className="h-6 w-6" />;
}

function useLandingSpecializationFees() {
  return useQuery({
    queryKey: ['landing-specialization-fees'],
    queryFn: async () => {
      const response = await apiFetch<SpecializationFeesResponse>(
        '/public/specialization-fees'
      );

      return Array.isArray(response)
        ? response
        : response.data ??
            response.specialization_fees ??
            [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function specialtyHref(def: ServiceDefinition, matched?: LandingSpecializationFee) {
  const name =
    def.subSpecializationName ||
    def.specializationName ||
    matched?.sub_specialization ||
    def.label;
  const params = new URLSearchParams();
  params.set("specialization", name);
  const feeId = matched?.id ?? def.feeId;
  if (feeId) params.set("specialization_fee_id", String(feeId));
  if (def.alsoMatch) params.set("sub_specialization", def.alsoMatch);
  else if (matched?.sub_specialization && matched.sub_specialization !== name) {
    params.set("sub_specialization", matched.sub_specialization);
  }
  return `/patient/search-doctors?${params.toString()}`;
}

function specialtyLabel(
  def: ServiceDefinition,
  matched: LandingSpecializationFee | undefined,
  language: string,
  translatedMental: string,
) {
  if (def.key === "mental-counseling") return translatedMental;
  const lang = language.toLowerCase();
  if (lang.startsWith("fr") && matched?.sub_specialization_fr) return matched.sub_specialization_fr;
  if ((lang.startsWith("rw") || lang.startsWith("kiny")) && matched?.sub_specialization_kiny) {
    return matched.sub_specialization_kiny;
  }
  return matched?.sub_specialization || def.label;
}

function Specialities() {
  const { t, i18n } = useTranslation();

  const {
    data = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useLandingSpecializationFees();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isHoveringRef = useRef(false);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');

  const preparedSpecializations = useMemo<PreparedSpecialization[]>(() => {
    const mentalLabel = t("pages.landing.spec_mental_counseling", {
      defaultValue: "Mental Counseling",
    });
    return TARGET_SERVICES.map((def, idx) => {
      const matched = data.find((item) => {
        if (def.feeId && item.id === def.feeId) return true;
        if (
          def.subSpecializationName &&
          item.sub_specialization?.toLowerCase() === def.subSpecializationName.toLowerCase()
        ) {
          return true;
        }
        const specName =
          typeof item.specialization === 'string'
            ? item.specialization
            : item.specialization?.name;
        if (
          def.specializationName &&
          (specName?.toLowerCase() === def.specializationName.toLowerCase() ||
            item.name?.toLowerCase() === def.specializationName.toLowerCase())
        ) {
          return true;
        }
        return false;
      });

      return {
        id: matched?.id ?? (100 + idx),
        key: def.key,
        label: specialtyLabel(def, matched, i18n.language, mentalLabel),
        href: specialtyHref(def, matched),
        resolvedSlug: def.slug,
        doctorCount: matched?.doctorCount ?? matched?.doctors_count,
        Icon: def.fallbackIcon,
        icon_svg: matched?.icon_svg || def.fallbackSvg || null,
      };
    });
  }, [data, i18n.language, t]);

  const filteredSpecializations = useMemo(() => {
    const query = mobileSearch.trim().toLowerCase();

    if (!query) {
      return preparedSpecializations;
    }

    return preparedSpecializations.filter((item) =>
      item.label.toLowerCase().includes(query)
    );
  }, [mobileSearch, preparedSpecializations]);

  const updateScrollState = () => {
    const element = scrollRef.current;
    if (!element) return;

    setCanScrollLeft(element.scrollLeft > 4);
    setCanScrollRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - 4
    );
  };

  useEffect(() => {
    updateScrollState();
  }, [preparedSpecializations]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const handleScroll = () => updateScrollState();
    element.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Subtle auto-scroll loop
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || preparedSpecializations.length === 0) return;

    const interval = window.setInterval(() => {
      if (isHoveringRef.current) return;

      const atEnd =
        element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;

      if (atEnd) {
        element.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        element.scrollBy({ left: 220, behavior: 'smooth' });
      }
    }, 3500);

    return () => {
      window.clearInterval(interval);
    };
  }, [preparedSpecializations.length]);

  useEffect(() => {
    if (!mobileDropdownOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(target)
      ) {
        setMobileDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileDropdownOpen]);

  useEffect(() => {
    if (!mobileDropdownOpen) return;

    const timeout = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [mobileDropdownOpen]);

  const scroll = (direction: 'left' | 'right') => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  const closeMobileDropdown = () => {
    setMobileDropdownOpen(false);
    setMobileSearch('');
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            {t('pages.landing.spec_eyebrow', {
              defaultValue: 'Browse by specialty',
            })}
          </p>

          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t('pages.landing.spec_title', {
              defaultValue: 'Specialities',
            })}
          </h2>
        </div>

        {/* Desktop navigation buttons */}
        <div className="hidden flex-shrink-0 items-center gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label={t('pages.landing.spec_scroll_left')}
            className="
              box-border flex h-[30px] w-[30px]
              items-center justify-center
              rounded-sm border border-border
              bg-card text-muted-foreground
              shadow-none
              transition-colors
              hover:shadow-none
              enabled:hover:bg-muted enabled:hover:border-primary/40
              disabled:cursor-not-allowed
              disabled:opacity-30
            "
          >
            <ChevronLeft size={15} />
          </button>

          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label={t('pages.landing.spec_scroll_right')}
            className="
              box-border flex h-[30px] w-[30px]
              items-center justify-center
              rounded-sm border border-border
              bg-card text-muted-foreground
              shadow-none
              transition-colors
              hover:shadow-none
              enabled:hover:bg-muted enabled:hover:border-primary/40
              disabled:cursor-not-allowed
              disabled:opacity-30
            "
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Loading state: skeleton with shadow-none */}
      {isLoading && (
        <div className="hidden gap-3 overflow-hidden md:flex">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="
                box-border relative h-[140px]
                w-[140px] flex-shrink-0
                overflow-hidden rounded-sm
                border border-border bg-muted/40 shadow-none
              "
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="box-border flex flex-col items-center gap-3 rounded-sm border border-border bg-card py-8 text-center shadow-none">
          <p className="text-sm text-muted-foreground">
            {t('pages.landing.spec_load_error', {
              defaultValue: 'Failed to load specialties',
            })}
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="
              box-border rounded-sm
              bg-primary px-4 py-1.5
              text-xs font-medium
              text-primary-foreground shadow-none
              transition-opacity
              hover:shadow-none
              disabled:opacity-60
            "
          >
            {isFetching
              ? t('pages.landing.spec_retrying', { defaultValue: 'Retrying...' })
              : t('pages.landing.try_again', { defaultValue: 'Try again' })}
          </button>
        </div>
      )}

      {/* Mobile searchable dropdown (box-border, shadow-none) */}
      <div ref={mobileDropdownRef} className="relative md:hidden">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={mobileDropdownOpen}
          onClick={() => setMobileDropdownOpen((current) => !current)}
          className="
            box-border flex min-h-12 w-full
            items-center justify-between gap-3
            rounded-sm border border-border
            bg-card px-4 py-3
            text-left text-sm
            text-foreground shadow-none
            transition-colors
            hover:border-primary/40
            hover:shadow-none
            focus-visible:outline-none
            focus-visible:ring-1
            focus-visible:ring-primary/40
          "
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="h-4 w-4" />
            </span>

            <span className="truncate font-medium">
              {t('pages.landing.spec_choose', {
                defaultValue: 'Find a specialization',
              })}
            </span>
          </span>

          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
              mobileDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {mobileDropdownOpen && (
          <div
            role="listbox"
            aria-label={t('pages.landing.spec_carousel_label', {
              defaultValue: 'Specialities',
            })}
            className="
              box-border absolute left-0 right-0
              top-[calc(100%+0.5rem)]
              z-50 overflow-hidden
              rounded-sm border border-border
              bg-popover shadow-none
            "
          >
            {/* Search input */}
            <div className="border-b border-border bg-popover p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  ref={mobileSearchInputRef}
                  type="search"
                  value={mobileSearch}
                  onChange={(event) => setMobileSearch(event.target.value)}
                  placeholder={t('pages.landing.spec_search_placeholder', {
                    defaultValue: 'Search specializations...',
                  })}
                  className="
                    box-border h-11 w-full rounded-sm
                    border border-border
                    bg-background
                    pl-9 pr-3
                    text-sm text-foreground shadow-none
                    outline-none
                    placeholder:text-muted-foreground
                    focus:border-primary
                  "
                />
              </div>
            </div>

            {/* Vertical results */}
            <div className="max-h-[320px] overflow-y-auto p-2">
              {filteredSpecializations.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {filteredSpecializations.map((item) => (
                    <Link
                      key={item.key}
                      role="option"
                      aria-selected={false}
                      to={item.href}
                      onClick={closeMobileDropdown}
                      className="
                        group box-border flex w-full
                        items-center gap-3
                        rounded-sm px-3 py-3
                        text-left shadow-none
                        transition-colors
                        hover:bg-muted/60
                        hover:shadow-none
                        focus-visible:outline-none
                      "
                    >
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <SpecialtyIcon
                          svg={item.icon_svg}
                          fallback={item.Icon}
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {item.label}
                        </span>

                        {typeof item.doctorCount === 'number' && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {t('pages.landing.spec_doctors_count', {
                              count: item.doctorCount,
                            })}
                          </span>
                        )}
                      </span>

                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <Search className="mb-2 h-7 w-7 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">
                    {t('pages.landing.spec_no_results', {
                      defaultValue: 'No specialization found',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop cards (pure borderbox, shadow-none, only the 9 services) */}
      <div className="relative hidden md:block">
        {canScrollLeft && (
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
        )}

        {canScrollRight && (
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          onMouseEnter={() => {
            isHoveringRef.current = true;
          }}
          onMouseLeave={() => {
            isHoveringRef.current = false;
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              scroll('left');
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              scroll('right');
            }
          }}
          tabIndex={0}
          role="region"
          aria-label={t('pages.landing.spec_carousel_label', {
            defaultValue: 'Specialities carousel',
          })}
          className="
            flex gap-3 overflow-x-auto
            pb-1 scroll-smooth
            [-ms-overflow-style:none]
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
            focus-visible:outline-none
          "
        >
          {preparedSpecializations.map((item) => (
            <Link
              key={item.key}
              to={item.href}
              title={item.label}
              className="
                group box-border flex h-[140px]
                w-[140px] flex-shrink-0
                flex-col items-center
                justify-center gap-2.5
                rounded-sm
                border border-border
                bg-card px-2.5
                text-center shadow-none
                transition-all duration-200
                hover:-translate-y-px
                hover:border-primary/50
                hover:shadow-none
              "
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <SpecialtyIcon
                  svg={item.icon_svg}
                  fallback={item.Icon}
                />
              </span>

              <span className="line-clamp-3 w-full text-[12px] font-medium leading-tight text-foreground break-words px-1">
                {item.label}
              </span>

              {typeof item.doctorCount === 'number' && (
                <span className="text-[11px] text-muted-foreground">
                  {t('pages.landing.spec_doctors_count', {
                    count: item.doctorCount,
                  })}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Specialities;