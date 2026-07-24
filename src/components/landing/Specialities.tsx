import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Scissors,
  Search,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface LandingSpecializationFee {
  id: number;
  slug?: string | null;
  name?: string | null;
  specialization?: string | null;
  sub_specialization?: string | null;
  sub_specialization_en?: string | null;
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

interface PreparedSpecialization extends LandingSpecializationFee {
  label: string;
  resolvedSlug: string;
  doctorCount?: number;
  Icon: LucideIcon;
}

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  cardiology: Heart,
  'general-practitioner': Stethoscope,
  specialist: Award,
  surgery: Scissors,
  surgeon: Scissors,
  sugerylist: Scissors,
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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
    queryKey: ['landing-specialization-fees', 'specialist'],
    queryFn: async () => {
      const response = await apiFetch<SpecializationFeesResponse>(
        '/public/specialization-fees?type=specialist'
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

function Specialities() {
  const { t } = useTranslation();

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
  const [mobileDropdownOpen, setMobileDropdownOpen] =
    useState(false);
  const [mobileSearch, setMobileSearch] = useState('');

  const preparedSpecializations =
    useMemo<PreparedSpecialization[]>(() => {
      return data.map((item) => {
        const label =
          item.sub_specialization ??
          item.sub_specialization_en ??
          item.name ??
          item.specialization ??
          t('pages.landing.spec_fallback_label');

        const resolvedSlug =
          item.slug || slugify(label);

        return {
          ...item,
          label,
          resolvedSlug,
          doctorCount:
            item.doctorCount ?? item.doctors_count,
          Icon:
            SPECIALTY_ICONS[resolvedSlug] ??
            Stethoscope,
        };
      });
    }, [data, t]);

  const filteredSpecializations = useMemo(() => {
    const query = mobileSearch
      .trim()
      .toLowerCase();

    if (!query) {
      return preparedSpecializations;
    }

    return preparedSpecializations.filter((item) => {
      const searchableText = [
        item.label,
        item.specialization,
        item.tier_name,
        item.resolvedSlug,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [
    mobileSearch,
    preparedSpecializations,
  ]);

  const updateScrollState = () => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    setCanScrollLeft(element.scrollLeft > 4);

    setCanScrollRight(
      element.scrollLeft + element.clientWidth <
        element.scrollWidth - 4
    );
  };

  useEffect(() => {
    updateScrollState();
  }, [preparedSpecializations]);

useEffect(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const handleScroll = () =>
      updateScrollState();

    element.addEventListener(
      'scroll',
      handleScroll,
      { passive: true }
    );

    window.addEventListener(
      'resize',
      handleScroll
    );

    return () => {
      element.removeEventListener(
        'scroll',
        handleScroll
      );

      window.removeEventListener(
        'resize',
        handleScroll
      );
    };
  }, []);

  useEffect(() => {
    const element = scrollRef.current;

    if (!element || preparedSpecializations.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      if (isHoveringRef.current) {
        return;
      }

      const atEnd =
        element.scrollLeft + element.clientWidth >=
        element.scrollWidth - 4;

      if (atEnd) {
        element.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        element.scrollBy({ left: 220, behavior: 'smooth' });
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [preparedSpecializations.length]);

  useEffect(() => {
    if (!mobileDropdownOpen) {
      return;
    }

    const handleOutsideClick = (
      event: MouseEvent
    ) => {
      const target = event.target as Node;

      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(
          target
        )
      ) {
        setMobileDropdownOpen(false);
      }
    };

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        setMobileDropdownOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    document.addEventListener(
      'keydown',
      handleEscape
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );

      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [mobileDropdownOpen]);

  useEffect(() => {
    if (!mobileDropdownOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [mobileDropdownOpen]);

  const scroll = (
    direction: 'left' | 'right'
  ) => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left:
        direction === 'left'
          ? -320
          : 320,
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
            {t(
              'pages.landing.spec_eyebrow'
            )}
          </p>

          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t(
              'pages.landing.spec_title'
            )}
          </h2>
        </div>

        {/* Desktop navigation buttons */}
        <div className="hidden flex-shrink-0 items-center gap-1.5 md:flex">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label={t(
              'pages.landing.spec_scroll_left'
            )}
            className="
              flex h-[30px] w-[30px]
              items-center justify-center
              rounded-[var(--radius)]
              border border-border
              bg-card text-muted-foreground
              transition-colors
              enabled:hover:bg-muted
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
            aria-label={t(
              'pages.landing.spec_scroll_right'
            )}
            className="
              flex h-[30px] w-[30px]
              items-center justify-center
              rounded-[var(--radius)]
              border border-border
              bg-card text-muted-foreground
              transition-colors
              enabled:hover:bg-muted
              disabled:cursor-not-allowed
              disabled:opacity-30
            "
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <>
          {/* Mobile loading */}
          <div className="md:hidden">
            <div className="h-12 animate-pulse rounded-lg border border-border bg-muted" />
          </div>

          {/* Desktop loading */}
          <div className="hidden gap-3 overflow-hidden md:flex">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="
                  relative h-[172px]
                  w-[130px] flex-shrink-0
                  overflow-hidden rounded-lg
                  border border-border bg-muted
                "
              >
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t(
              'pages.landing.spec_load_error'
            )}
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="
              rounded-[var(--radius)]
              bg-primary px-4 py-1.5
              text-xs font-medium
              text-primary-foreground
              transition-opacity
              disabled:opacity-60
            "
          >
            {isFetching
              ? t(
                  'pages.landing.spec_retrying'
                )
              : t(
                  'pages.landing.try_again'
                )}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading &&
        !isError &&
        preparedSpecializations.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t(
              'pages.landing.spec_empty'
            )}
          </p>
        )}

      {!isLoading &&
        !isError &&
        preparedSpecializations.length > 0 && (
          <>
            {/* Mobile searchable dropdown */}
            <div
              ref={mobileDropdownRef}
              className="relative md:hidden"
            >
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={
                  mobileDropdownOpen
                }
                onClick={() =>
                  setMobileDropdownOpen(
                    (current) => !current
                  )
                }
                className="
                  flex min-h-12 w-full
                  items-center justify-between gap-3
                  rounded-lg border border-border
                  bg-card px-4 py-3
                  text-left text-sm
                  text-foreground
                  transition-colors
                  hover:border-primary/40
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-primary/30
                "
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Search className="h-4 w-4" />
                  </span>

                  <span className="truncate font-medium">
                    {t(
                      'pages.landing.spec_choose',
                      {
                        defaultValue:
                          'Find a specialization',
                      }
                    )}
                  </span>
                </span>

                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
                    mobileDropdownOpen
                      ? 'rotate-180'
                      : ''
                  }`}
                />
              </button>

              {mobileDropdownOpen && (
                <div
                  role="listbox"
                  aria-label={t(
                    'pages.landing.spec_carousel_label'
                  )}
                  className="
                    absolute left-0 right-0
                    top-[calc(100%+0.5rem)]
                    z-50 overflow-hidden
                    rounded-xl border border-border
                    bg-popover shadow-xl
                  "
                >
                  {/* Search input */}
                  <div className="border-b border-border bg-popover p-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        ref={
                          mobileSearchInputRef
                        }
                        type="search"
                        value={mobileSearch}
                        onChange={(event) =>
                          setMobileSearch(
                            event.target.value
                          )
                        }
                        placeholder={t(
                          'pages.landing.spec_search_placeholder',
                          {
                            defaultValue:
                              'Search specializations...',
                          }
                        )}
                        className="
                          h-11 w-full rounded-lg
                          border border-border
                          bg-background
                          pl-9 pr-3
                          text-sm text-foreground
                          outline-none
                          placeholder:text-muted-foreground
                          focus:border-primary
                          focus:ring-2
                          focus:ring-primary/20
                        "
                      />
                    </div>
                  </div>

                  {/* Vertical results */}
                  <div className="max-h-[320px] overflow-y-auto p-2">
                    {filteredSpecializations.length >
                    0 ? (
                      <div className="flex flex-col gap-1">
                        {filteredSpecializations.map(
                          (item) => (
                            <Link
                              key={item.id}
                              role="option"
                              aria-selected={false}
                              to={`/patient/search-doctors?type=booking&specialization=Specialist&specialization_fee_id=${item.id}`}
                              onClick={
                                closeMobileDropdown
                              }
                              className="
                                group flex w-full
                                items-center gap-3
                                rounded-lg px-3 py-3
                                text-left
                                transition-colors
                                hover:bg-muted
                                focus-visible:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-primary/30
                              "
                            >
                              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <SpecialtyIcon
                                  svg={
                                    item.icon_svg
                                  }
                                  fallback={
                                    item.Icon
                                  }
                                />
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {item.label}
                                </span>

                                {typeof item.doctorCount ===
                                  'number' && (
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {t(
                                      'pages.landing.spec_doctors_count',
                                      {
                                        count:
                                          item.doctorCount,
                                      }
                                    )}
                                  </span>
                                )}
                              </span>

                              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </Link>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                        <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />

                        <p className="text-sm font-medium text-foreground">
                          {t(
                            'pages.landing.spec_no_results',
                            {
                              defaultValue:
                                'No specialization found',
                            }
                          )}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {t(
                            'pages.landing.spec_try_another_search',
                            {
                              defaultValue:
                                'Try using another search term.',
                            }
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop cards */}
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
                  if (
                    event.key ===
                    'ArrowLeft'
                  ) {
                    event.preventDefault();
                    scroll('left');
                  }

                  if (
                    event.key ===
                    'ArrowRight'
                  ) {
                    event.preventDefault();
                    scroll('right');
                  }
                }}
                tabIndex={0}
                role="region"
                aria-label={t(
                  'pages.landing.spec_carousel_label'
                )}
                className="
                  flex gap-3 overflow-x-auto
                  pb-1 scroll-smooth
                  [-ms-overflow-style:none]
                  [scrollbar-width:none]
                  [&::-webkit-scrollbar]:hidden
                  focus-visible:outline-none
                "
              >
                {preparedSpecializations.map(
                  (item) => (
                    <Link
                      key={item.id}
                      to={`/patient/search-doctors?type=booking&specialization=Specialist&specialization_fee_id=${item.id}`}
                      title={item.label}
                      className="
                        group flex h-[172px]
                        w-[130px] flex-shrink-0
                        flex-col items-center
                        justify-center gap-2.5
                        rounded-sm
                        border border-border
                        bg-card px-2.5 py-4
                        text-center shadow-none
                        transition-all duration-200
                        hover:-translate-y-px
                        hover:border-primary/40
                        hover:shadow-md
                      "
                    >
                      <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <SpecialtyIcon
                          svg={item.icon_svg}
                          fallback={item.Icon}
                        />
                      </span>

                      <span className="line-clamp-2 w-full text-[13px] font-medium leading-snug text-foreground">
                        {item.label}
                      </span>

                      {typeof item.doctorCount ===
                        'number' && (
                        <span className="text-[11px] text-muted-foreground">
                          {t(
                            'pages.landing.spec_doctors_count',
                            {
                              count:
                                item.doctorCount,
                            }
                          )}
                        </span>
                      )}
                    </Link>
                  )
                )}
              </div>
            </div>
          </>
        )}
    </div>
  );
}

export default Specialities;