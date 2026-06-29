import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Stethoscope,
  Award,
  Scissors,
  ChevronLeft,
  ChevronRight,
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
  if (!raw || !raw.toLowerCase().startsWith('<svg')) return null;
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return null;

  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return null;

  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') return null;

  root
    .querySelectorAll('script, foreignObject, iframe, object, embed')
    .forEach((node) => node.remove());
  root.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) {
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
        className="flex h-6 w-6 items-center justify-center [&_svg]:h-6 [&_svg]:w-6 [&_svg]:max-h-full [&_svg]:max-w-full"
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
      const res = await apiFetch<SpecializationFeesResponse>(
        '/public/specialization-fees?type=specialist'
      );
      return Array.isArray(res) ? res : res.data ?? res.specialization_fees ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function Specialities() {
  const { data = [], isLoading, isError, refetch, isFetching } =
    useLandingSpecializationFees();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
  }, [data]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => updateScrollState();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <section className="w-full px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Browse by specialty
          </p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-foreground">
            Specialities
          </h2>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll specialities left"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[var(--radius)] border border-border bg-card text-muted-foreground transition-colors enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll specialities right"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[var(--radius)] border border-border bg-card text-muted-foreground transition-colors enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="relative h-[172px] w-[130px] flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load specialities right now.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-[var(--radius)] bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {isFetching ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No specialities available yet.
        </p>
      )}

      {/* Cards */}
      {!isLoading && !isError && data.length > 0 && (
        <div className="relative">
          {canScrollLeft && (
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
          )}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') { e.preventDefault(); scroll('left'); }
              if (e.key === 'ArrowRight') { e.preventDefault(); scroll('right'); }
            }}
            tabIndex={0}
            role="region"
            aria-label="Specialities carousel"
            className="flex gap-3 overflow-x-auto pb-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none"
          >
            {data.map((item) => {
              const label =
                item.sub_specialization ??
                item.sub_specialization_en ??
                item.name ??
                item.specialization ??
                'Specialist';
              const slug = item.slug || slugify(label);
              const Icon = SPECIALTY_ICONS[slug] ?? Stethoscope;
              const doctorCount = item.doctorCount ?? item.doctors_count;

              return (
                <Link
                  key={item.id}
                  to={`/patient/search-doctors?type=booking&specialization_fee_id=${item.id}`}
                  title={label}
                  className="group flex h-[172px] w-[130px] flex-shrink-0 flex-col items-center justify-center gap-2.5 rounded-sm border border-border bg-card px-2.5 py-4 text-center shadow-none transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
                >
                  {/* Circular icon */}
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <SpecialtyIcon svg={item.icon_svg} fallback={Icon} />
                  </span>

                  {/* Two-line clamped label */}
                  <span className="line-clamp-2 w-full text-[13px] font-medium leading-snug text-foreground">
                    {label}
                  </span>

                  {/* Doctor count */}
                  {typeof doctorCount === 'number' && (
                    <span className="text-[11px] text-muted-foreground">
                      {doctorCount} doctors
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default Specialities;