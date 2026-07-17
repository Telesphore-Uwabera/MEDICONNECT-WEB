import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ApiTeamMember, useGetOurTeam } from "@/hooks/use-our-team";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

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
        <div className="h-3 w-1/3 rounded-[6px] bg-muted-foreground/20" />
        <div className="h-4 w-3/4 rounded-[6px] bg-muted-foreground/30" />
        <div className="h-3 w-1/2 rounded-[6px] bg-muted-foreground/20" />
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
        className="relative w-full sm:max-w-lg bg-card border border-border/80 rounded-t-2xl sm:rounded-[6px] shadow-2xl overflow-hidden animate-slideUp"
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
                className={`absolute inset-0 h-full w-full object-contain  object-center transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"
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
              <span className="inline-block mt-1.5 rounded-[6px] bg-white/15 border border-white/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
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
            <div className="rounded-[6px] bg-muted/60 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                Joined
              </p>
              <p className="text-base font-medium text-foreground">{joinYear}</p>
              <p className="text-[11px] text-muted-foreground">
                {yrs} year{yrs !== 1 ? "s" : ""} ago
              </p>
            </div>
            <div className="rounded-[6px] bg-muted/60 px-3 py-2.5">
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
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="group rounded-[10px] border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
        onClick={() => setModalOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
        aria-label={t("pages.landing.team_view_profile", { name: member.name })}
      >
        <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-primary/10 ring-8 ring-muted/40">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-black text-primary">
              {getInitials(member.name)}
            </div>
          )}
        </div>
        <h3 className="mt-5 line-clamp-1 text-base font-black text-foreground">
          {member.name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-[40px] text-sm font-medium text-muted-foreground">
          {member.title || t("pages.landing.team_member_fallback")}
        </p>
        <span className="mt-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          in
        </span>
      </button>

      {modalOpen && (
        <MemberModal member={member} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

function OurTeam() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetOurTeam();
  const members: ApiTeamMember[] = data?.data ?? [];
  const visibleMembers = members.slice(0, 4);

  return (
    <div className="w-full">
      {isError && (
        <div className="rounded-[10px] border border-destructive/25 bg-destructive/5 px-5 py-8 text-center">
          <p className="text-sm font-medium text-destructive">
            {t("pages.landing.team_load_error")}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs text-destructive/70 underline underline-offset-2 transition-colors hover:text-destructive"
          >
            {t("pages.landing.try_again")}
          </button>
        </div>
      )}

      {!isError && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array(4)
                .fill(null)
                .map((_, i) => <SkeletonCard key={i} />)
            : visibleMembers.length === 0
              ? (
                <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  {t("pages.landing.team_empty")}
                </p>
              )
              : visibleMembers.map((m) => <MemberCard key={m.id} member={m} />)}
        </div>
      )}
    </div>
  );
}

export default OurTeam;
