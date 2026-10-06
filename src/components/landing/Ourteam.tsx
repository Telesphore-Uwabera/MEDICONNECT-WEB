import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ApiTeamMember, useGetOurTeam } from "@/hooks/use-our-team";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { resolveMediaUrl } from "@/lib/image-url";

// ── Helpers ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getYearsExperience(joinedAt: string): number {
  const diff = Date.now() - new Date(joinedAt).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
}

function sortMembers(a: ApiTeamMember, b: ApiTeamMember): number {
  const levelDiff = (a.level ?? 999) - (b.level ?? 999);
  if (levelDiff !== 0) return levelDiff;

  const orderDiff = (a.order ?? 999) - (b.order ?? 999);
  if (orderDiff !== 0) return orderDiff;

  return a.name.localeCompare(b.name);
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

// ── Member Modal ─────────────────────────────────────────────

function OrgCard({
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
        className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/80 bg-card shadow-2xl animate-slideUp sm:max-h-[85vh] sm:max-w-lg sm:rounded-[6px]"
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
        <div className="relative h-28 w-full shrink-0 overflow-hidden bg-muted sm:h-44 sm:max-h-[32vh]">
          {(resolveMediaUrl(member.photo_url || member.photo)) && !imgError ? (
            <>
              <img
                src={resolveMediaUrl(member.photo_url || member.photo)}
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
              <span className="inline-block mt-1.5 rounded-[6px] bg-white/15 border border-white/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                {member.title}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3.5 pb-5">
          {/* Description */}
          {member.bio ? (
            <div
              className="text-[13px] text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: member.bio }}
            />
          ) : (
            <></>
          )}

          {/* Stats */}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {member.joined_at && (
              <div className="rounded-[6px] bg-muted/60 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                  Joined
                </p>
                <p className="text-base font-medium text-foreground">
                  {joinYear}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {yrs} year{yrs !== 1 ? "s" : ""} ago
                </p>
              </div>
            )}
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

function MemberCard({
  member,
  interactive = true,
}: {
  member: ApiTeamMember;
  interactive?: boolean;
}) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="group flex h-full w-full flex-col items-center rounded-[6px] border border-border bg-card px-3 py-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
        onClick={interactive ? () => setModalOpen(true) : undefined}
        tabIndex={interactive ? 0 : -1}
        aria-hidden={interactive ? undefined : true}
        aria-label={t("pages.landing.team_view_profile", { name: member.name })}
      >
        <div className="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-8 ring-muted/40">
          {resolveMediaUrl(member.photo_url || member.photo) ? (
            <img
              src={resolveMediaUrl(member.photo_url || member.photo)}
              alt={member.name}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-black text-primary">
              {getInitials(member.name)}
            </div>
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 h-8 w-full text-[13px] font-bold leading-4 text-foreground">
          {member.name}
        </h3>
        <p className="mt-1 line-clamp-3 h-[3.15rem] w-full text-[11px] font-medium leading-[1.05rem] text-muted-foreground">
          {member.title || t("pages.landing.team_member_fallback")}
        </p>
      </button>

      {modalOpen && (
        <OrgCard member={member} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

// ─── Connector primitives ───────────────────────────────────────────────────
// Lines are black in light mode, white in dark mode.

function TrunkLine({
  height,
  xPercent = 50,
}: {
  height: number;
  xPercent?: number;
}) {
  return (
    <div
      className="absolute w-[2px] -translate-x-1/2 bg-black dark:bg-white"
      style={{ height, left: `${xPercent}%`, top: 0 }}
    />
  );
}

// Renders the connectors for one row of N cards, then the cards themselves.
// `entryPercent` is where the incoming trunk (coming from whatever is above)
// attaches — it's supplied by the caller based on the ROW ABOVE's own anchor,
// so it always lands on a real card up there, never on a gap.
function ConnectorRow({
  count,
  entryPercent = 50,
  children,
}: {
  count: number;
  entryPercent?: number;
  children: React.ReactNode[];
}) {
  const trunkHeight = 24;
  const dropHeight = 20;
  const curveRadius = 12;
  const inset = count > 1 ? 50 / count : 50;
  const middleIndices =
    count > 2 ? Array.from({ length: count - 2 }, (_, i) => i + 1) : [];

  return (
    <div className="relative" style={{ paddingTop: trunkHeight + dropHeight }}>
      <TrunkLine height={trunkHeight} xPercent={entryPercent} />

      {count > 1 ? (
        <>
          {/* bracket: horizontal bar with rounded corners curving down into the outer columns */}
          <div
            className="absolute border-black dark:border-white"
            style={{
              top: trunkHeight,
              left: `${inset}%`,
              right: `${inset}%`,
              height: dropHeight,
              borderStyle: "solid",
              borderWidth: "2px 2px 0 2px",
              borderTopLeftRadius: curveRadius,
              borderTopRightRadius: curveRadius,
            }}
          />
          {/* straight drops for any middle columns */}
          {middleIndices.map((i) => (
            <div
              key={i}
              className="absolute w-[2px] -translate-x-1/2 bg-black dark:bg-white"
              style={{
                top: trunkHeight,
                left: `${((i + 0.5) / count) * 100}%`,
                height: dropHeight,
              }}
            />
          ))}
        </>
      ) : (
        <TrunkLine height={trunkHeight + dropHeight} xPercent={entryPercent} />
      )}

      <div
        className="grid gap-2 sm:gap-3 md:gap-4"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  );
}

function OurTeam() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetOurTeam({ per_page: 50 });
  const members = (data?.data ?? [])
    .filter((member) => member.is_active !== false)
    .sort(sortMembers);

  return (
    <div className="w-full">
      {isError && (
        <div className="rounded-[6px] border border-destructive/25 bg-destructive/5 px-5 py-8 text-center">
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
        <>
          {/* Inject marquee keyframes once */}
          <style>{`
            @keyframes marquee-scroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-track {
              animation: marquee-scroll 30s linear infinite;
            }
            .marquee-track:hover {
              animation-play-state: paused;
            }
            @media (prefers-reduced-motion: reduce) {
              .marquee-track { animation: none; }
            }
          `}</style>

          {/* Overflow mask */}
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]">
            {/* Track — duplicated list for seamless loop */}
            <div className="marquee-track flex w-max gap-4">
              {isLoading
                ? Array(8).fill(null).map((_, i) => (
                    <div
                      key={i}
                      className="w-48 shrink-0 flex flex-col items-center gap-3 rounded-[6px] border border-border bg-card p-5 animate-pulse"
                    >
                      <div className="h-24 w-24 rounded-full bg-muted" />
                      <div className="h-3 w-28 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />
                    </div>
                  ))
                : members.length === 0
                  ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      {t("pages.landing.team_empty")}
                    </p>
                  )
                  : (
                    <>
                      {/* First copy */}
                      {members.map((m) => (
                        <div key={`a-${m.id}`} className="flex w-52 shrink-0">
                          <MemberCard member={m} />
                        </div>
                      ))}
                      {/* Duplicate copy for seamless wrap */}
                      {members.map((m) => (
                        <div key={`b-${m.id}`} className="flex w-52 shrink-0" aria-hidden="true">
                          <MemberCard member={m} interactive={false} />
                        </div>
                      ))}
                    </>
                  )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OurTeam;
