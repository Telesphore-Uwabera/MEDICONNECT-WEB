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
    <div className="flex flex-col overflow-hidden rounded-[6px] border border-border bg-card animate-pulse min-h-[300px] relative">
      <div className="absolute inset-0 bg-muted" />
      <div className="relative mt-auto p-4 md:p-5 flex flex-col w-full space-y-2">
        <div className="h-3 w-1/3 rounded-sm bg-muted-foreground/20" />
        <div className="h-4 w-3/4 rounded-sm bg-muted-foreground/30" />
        <div className="h-3 w-1/2 rounded-sm bg-muted-foreground/20" />
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
        className="relative w-full sm:max-w-lg bg-card border border-border/80 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
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
        <div className="relative aspect-[5/3] w-full overflow-hidden bg-muted">
          {member.photo_url && !imgError ? (
            <>
              <img
                src={member.photo_url}
                alt={member.name}
                className={`absolute inset-0 h-full w-full object-contain  object-center transition-opacity duration-300 ${
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
        className="group relative flex flex-col overflow-hidden rounded-[6px] border border-border bg-card cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 min-h-[300px] sm:min-h-[350px]"
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
        aria-label={`View ${member.name}'s profile`}
      >
        {/* Photo taking full card height */}
        <div className="absolute inset-0 bg-muted z-0">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/10">
              <span className="text-4xl font-bold text-primary/40">
                {getInitials(member.name)}
              </span>
            </div>
          )}
          {/* Gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E27]/90 via-[#0A0E27]/30 to-transparent transition-opacity duration-300" />
        </div>

        {/* Content overlaid at the bottom */}
        <div className="relative z-10 mt-auto p-4 md:p-5 flex flex-col w-full text-left">
           
          {member.title && (
            <span className="mb-2 self-start rounded-[4px] bg-white/20 border border-white/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
              {member.title}
            </span>
          )}
          <h3 className="text-lg font-bold text-white leading-tight drop-shadow-sm truncate">
            {member.name}
          </h3>
          <p className="text-[12px] text-white/70 mt-1.5 font-medium flex items-center gap-2">
            <span>Since {joinYear}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>{yrs} yr{yrs !== 1 ? "s" : ""} exp</span>
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
      <div className="mb-8 text-center sm:text-left">
        <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-primary mb-2">
          Meet the specialists
        </p> 
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
