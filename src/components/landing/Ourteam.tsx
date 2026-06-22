import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ApiTeamMember, useGetOurTeam } from "@/hooks/use-our-team";
import { createPortal } from "react-dom";

// ── Helpers ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getYearsExperience(joinedAt: string): number {
  const diff = Date.now() - new Date(joinedAt).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
}

// ── Skeleton card ────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card animate-pulse">
      <div className="aspect-[4/5] w-full bg-muted" />
      <div className="px-3 pt-2.5 pb-3 space-y-1.5">
        <div className="h-3 w-3/4 rounded-sm bg-muted-foreground/20" />
        <div className="h-2.5 w-1/2 rounded-sm bg-muted-foreground/15" />
        <div className="mt-1.5 space-y-1">
          <div className="h-2.5 w-full rounded-sm bg-muted-foreground/10" />
          <div className="h-2.5 w-4/5 rounded-sm bg-muted-foreground/10" />
        </div>
      </div>
    </div>
  );
}

// ── Member Modal ─────────────────────────────────────────────

function MemberModal({
  member,
  onClose,
}: {
  member: ApiTeamMember;
  onClose: () => void;
}) {
  const yrs = getYearsExperience(member.joined_at);
  const joinYear = new Date(member.joined_at).getFullYear();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full sm:max-w-sm bg-card border border-border/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Photo area — changed to portrait-friendly 4/5 ratio */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
          {member.photo_url && !imgError ? (
            <>
              <img
                src={member.photo_url}
                alt={member.name}
                className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
              {/* Skeleton loader */}
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
              )}
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/10">
              <span className="text-5xl font-medium text-primary">
                {getInitials(member.name)}
              </span>
            </div>
          )}

          {/* Bottom gradient for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Name + title overlaid on photo */}
          <div className="absolute bottom-4 left-4 right-10">
            <h3 className="text-lg font-semibold text-white leading-tight drop-shadow-sm">
              {member.name}
            </h3>
            {member.title && (
              <span className="inline-block mt-1.5 rounded-md bg-white/15 border border-white/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                {member.title}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-3.5 pb-5">
          {/* Status pill */}
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full mb-3 ${
              member.is_active
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                member.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"
              }`}
            />
            {member.is_active ? "Active member" : "Inactive"}
          </span>

          {/* Description */}
          {member.bio ? (
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {member.bio}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground/40 italic">
              No description provided.
            </p>
          )}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/60 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                Joined
              </p>
              <p className="text-base font-medium text-foreground">{joinYear}</p>
              <p className="text-[11px] text-muted-foreground">
                {yrs} year{yrs !== 1 ? "s" : ""} ago
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                Experience
              </p>
              <p className="text-base font-medium text-foreground">
                {yrs} yr{yrs !== 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-muted-foreground">at MediConnect</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .animate-fadeIn { animation: fadeIn 0.15s ease; }
        .animate-slideUp { animation: slideUp 0.2s ease; }
      `}</style>
    </div>,
    document.body,
  );
}

// ── Member card ──────────────────────────────────────────────

function MemberCard({ member }: { member: ApiTeamMember }) {
  const [modalOpen, setModalOpen] = useState(false);
  const yrs = getYearsExperience(member.joined_at);
  const joinYear = new Date(member.joined_at).getFullYear();

  return (
    <>
      <div
        className="group flex flex-col overflow-hidden rounded-[6px] border border-border bg-card cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
        aria-label={`View ${member.name}'s profile`}
      >
        {/* Photo */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/10">
              <span className="text-xl font-medium text-primary">
                {getInitials(member.name)}
              </span>
            </div>
          )}

          {/* Active status dot */}
          <span
            className={`absolute top-2 right-2 h-2 w-2 rounded-full border-[1.5px] border-white/80 ${
              member.is_active ? "bg-emerald-500" : "bg-muted-foreground/50"
            }`}
            title={member.is_active ? "Active" : "Inactive"}
          />

          {/* Title badge — bottom left */}
          {member.title && (
            <span className="absolute bottom-2 left-2 rounded-[4px] bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {member.title}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="px-3 pt-2.5 pb-3 flex flex-col flex-1">
          <h3 className="text-[13px] capitalize font-medium text-foreground leading-tight truncate">
            {member.name}
          </h3>
          <p className="text-[11px]  text-muted-foreground mt-0.5">
            Since {joinYear} · {yrs} yr{yrs !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {modalOpen && (
        <MemberModal member={member} onClose={() => setModalOpen(false)} />
      )}
    </>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Meet the specialists
        </p>
        <h2 className="mt-1 font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Our Team
          <span className="ml-1 text-lg font-normal text-muted-foreground">+</span>
        </h2>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-5 py-8 text-center">
          <p className="text-sm text-destructive font-medium">
            Failed to load team members.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs text-destructive/70 underline underline-offset-2 hover:text-destructive transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Grid */}
      {!isError && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array(8)
                .fill(null)
                .map((_, i) => <SkeletonCard key={i} />)
            : members.length === 0
            ? (
              <p className="col-span-full text-sm text-muted-foreground text-center py-12">
                No team members found.
              </p>
            )
            : members.map((m) => <MemberCard key={m.id} member={m} />)}
        </div>
      )}
    </section>
  );
}

export default OurTeam;
