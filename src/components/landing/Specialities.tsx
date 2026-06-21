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
import { useGetSpecializations } from '@/hooks/use-specialization-select';

const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  cardiology: Heart,
  'general-practitioner': Stethoscope,
  specialist: Award,
  surgery: Scissors, // Fixed typo
  surgeon: Scissors,
  sugerylist: Scissors, // Keep backward compat
};

function Specialities() {
  const { data, isLoading, isError, refetch, isFetching } = useGetSpecializations();
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
      {/* Header — matches SECTION_EYEBROW / SECTION_TITLE pattern used on the landing page */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-primary/90">
            Browse by specialty
          </p>
          <h2 className="mt-1 font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Specialities
            <span className="ml-1 text-base leading-none text-[hsl(var(--primary-glow))]">+</span>
          </h2>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll specialities left"
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-all enabled:hover:border-primary/40 enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll specialities right"
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-all enabled:hover:border-primary/40 enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Loading skeleton — rounded-sm to match card radius elsewhere */}
      {isLoading && (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[112px] w-[124px] flex-shrink-0 rounded-sm border border-border bg-muted relative overflow-hidden"
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-border bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load specialities right now.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-sm bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {isFetching ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data?.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No specialities available yet.
        </p>
      )}

      {/* Cards */}
      {!isLoading && !isError && data && data.length > 0 && (
        <div className="relative">
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
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
            className="flex gap-3 overflow-x-auto pb-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
          >
            {data.map((item) => {
              const Icon = SPECIALTY_ICONS[item.slug] ?? Stethoscope;
              return (
                <Link
                  key={item.id}
                  to={`/specialities/${item.slug}`}
                  className="group flex w-[124px] flex-shrink-0 flex-col items-center gap-2 rounded-sm border border-border bg-card p-3.5 text-center shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/15 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-foreground">
                    {item.name}
                  </span>
                  {/* doctorCount is optional on Specialization — render only when the API provides it,
                      so this never throws even if some specializations omit the field */}
                  {typeof item.doctorCount === 'number' && (
                    <span className="text-[10px] text-muted-foreground">
                      {item.doctorCount} doctors
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
