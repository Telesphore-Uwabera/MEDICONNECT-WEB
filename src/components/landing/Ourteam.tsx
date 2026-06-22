import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ApiTeamMember, useGetOurTeam } from '@/hooks/use-our-team';





// ── Helpers ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function getYearsExperience(joinedAt: string): number {
  const diff = Date.now() - new Date(joinedAt).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
}

// ── Skeleton card ────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card animate-pulse">
      <div className="aspect-[4/5] w-full bg-muted flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="px-3.5 pt-3 pb-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-muted-foreground/20" />
        <div className="h-2.5 w-1/2 rounded bg-muted-foreground/20" />
        <div className="mt-3 h-8 rounded bg-muted-foreground/10" />
      </div>
    </div>
  );
}

// ── Member card ──────────────────────────────────────────────

function MemberCard({ member }: { member: ApiTeamMember }) {
  const yrs = getYearsExperience(member.joined_at);
  const joinYear = new Date(member.joined_at).getFullYear();

  return (
    <Link
      to={`/doctors/${member.id}`}
      className="group flex flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
    >
      {/* Photo / Avatar */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted flex items-center justify-center">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {getInitials(member.name)}
          </div>
        )}

        {/* Title badge */}
        {member.title && (
          <span className="absolute right-2 top-2 rounded-sm bg-card/95 border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
            {member.title}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-3.5 pt-3 pb-3">
        <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
          {member.name}
        </h3>

        {/* Active status */}
        <p className="text-xs mt-0.5 mb-3">
          {member.is_active ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Active
            </span>
          ) : (
            <span className="text-muted-foreground">Inactive</span>
          )}
        </p>

        {/* Stat row */}
        <div className="grid grid-cols-2 divide-x divide-border rounded-sm border border-border overflow-hidden">
          <div className="flex items-center justify-center gap-1.5 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-foreground">{joinYear}</span>
          </div>
          <div className="flex items-center justify-center gap-1 py-1.5">
            <span className="text-xs font-semibold text-foreground">{yrs}</span>
            <span className="text-[10px] text-muted-foreground">yrs</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main component ───────────────────────────────────────────

function OurTeam() {
  const { data, isLoading, isError, refetch } = useGetOurTeam();

  const members: ApiTeamMember[] = data?.data ?? [];

  return (
    <section className="w-full px-6 py-10 md:px-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-primary/90">
          Meet the specialists
        </p>
        <h2 className="mt-1 font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Our Team
          <span className="ml-1 text-base leading-none text-[hsl(var(--primary-glow))]">+</span>
        </h2>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          Failed to load team members.{' '}
          <button
            onClick={() => refetch()}
            className="underline underline-offset-2 hover:opacity-80"
          >
            Try again
          </button>
        </div>
      )}

      {/* Grid */}
      {!isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array(4)
              .fill(null)
              .map((_, i) => <SkeletonCard key={i} />)
          ) : members.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground text-center py-10">
              No team members found.
            </p>
          ) : (
            members.map((m) => <MemberCard key={m.id} member={m} />)
          )}
        </div>
      )}
    </section>
  );
}

export default OurTeam;
