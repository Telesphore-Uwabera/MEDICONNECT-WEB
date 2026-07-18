import { type CSSProperties, useEffect, useState } from "react";
import { BriefcaseBusiness, Users, UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

import { ApiTeamMember, useGetOurTeam } from "@/hooks/use-our-team";
import { cn } from "@/lib/utils";

const fallbackColors = ["#6D28D9", "#2563EB", "#0F766E", "#D97706", "#16A34A", "#DB2777", "#EA580C"];

function normalizeColor(color: string | null | undefined, index = 0): string {
  const fallback = fallbackColors[index % fallbackColors.length];
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return fallback;
  return color;
}

function colorSurface(color: string): string {
  return `${color}14`;
}

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
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
  const levelA = a.level ?? 99;
  const levelB = b.level ?? 99;
  if (levelA !== levelB) return levelA - levelB;
  const orderA = a.order ?? 999;
  const orderB = b.order ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name);
}

// Given a row's card count, returns the x-position (in %) of the card that
// should serve as the "hand-off point" down to the next row. For an odd
// count this is the true middle card (already correct, unchanged). For an
// even count there's no true middle card, so we pick the card just right of
// center — this guarantees the line always lands ON a real card, never on
// the gap/boundary between two cards.
function getAnchorPercent(count: number): number {
  if (count <= 0) return 50;
  const idx = Math.floor(count / 2);
  return ((idx + 0.5) / count) * 100;
}

// ─── Member Modal ────────────────────────────────────────────────────────────
// Same modal used for the photo-grid team view — reused here so clicking any
// org-chart card opens an identical profile popup.

function MemberModal({
  member,
  onClose,
}: {
  member: ApiTeamMember;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex max-h-[92vh] sm:max-h-[85vh] w-full sm:max-w-xl md:max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-[6px] border border-border/80 bg-card shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Photo area */}
        <div className="relative aspect-[4/3] sm:aspect-[5/3] w-full shrink-0 overflow-hidden bg-muted">
          {member.photo_url && !imgError ? (
            <>
              <img
                src={member.photo_url}
                alt={member.name}
                className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-300 ${
                  imgLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <span className="text-4xl sm:text-5xl font-medium text-primary">
                {getInitials(member.name)}
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-10">
            <h3 className="text-base sm:text-lg font-semibold text-white leading-tight drop-shadow-sm">
              {member.name}
            </h3>
            {member.title && (
              <span className="inline-block mt-1.5 rounded-[6px] bg-white/15 border border-white/25 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                {member.title}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 sm:px-6 pt-3.5 sm:pt-4 pb-5 sm:pb-6">
          {member.bio ? (
            <p className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {stripHtmlToText(member.bio)}
            </p>
          ) : (
            <p className="text-[13px] sm:text-sm text-muted-foreground/40 italic">
              {t("pages.landing.team_no_description", { defaultValue: "No description provided." })}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-[6px] bg-muted/60 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                {t("pages.landing.team_joined", { defaultValue: "Joined" })}
              </p>
              <p className="text-sm sm:text-base font-medium text-foreground">{joinYear}</p>
              <p className="text-[11px] text-muted-foreground">
                {yrs} {yrs !== 1 ? t("pages.landing.years_ago_plural", { defaultValue: "years ago" }) : t("pages.landing.year_ago", { defaultValue: "year ago" })}
              </p>
            </div>
            <div className="rounded-[6px] bg-muted/60 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                {t("pages.landing.team_experience", { defaultValue: "Experience" })}
              </p>
              <p className="text-sm sm:text-base font-medium text-foreground">
                {yrs} {yrs !== 1 ? t("pages.landing.years", { defaultValue: "yrs" }) : t("pages.landing.year", { defaultValue: "yr" })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("pages.landing.team_experience_at", { defaultValue: "at MediConnect" })}
              </p>
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

function MemberIcon({ member, color, index }: { member: ApiTeamMember; color: string; index: number }) {
  if (member.icon_url) {
    return (
      <span
        className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm"
        style={{ borderColor: `${color}55` }}
      >
        <img src={member.icon_url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }

  return (
    <span
      className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {index % 3 === 0 ? (
        <BriefcaseBusiness className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : (
        <Users className="h-4 w-4 sm:h-5 sm:w-5" />
      )}
    </span>
  );
}

function OrgCard({
  member,
  index,
  featured = false,
}: {
  member: ApiTeamMember;
  index: number;
  featured?: boolean;
}) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const color = normalizeColor(member.color_code, index);
  const style = featured
    ? ({ backgroundColor: "#0B3B82", borderColor: "#073E82" } as CSSProperties)
    : ({ borderColor: `${color}66`, backgroundColor: colorSurface(color) } as CSSProperties);

  return (
    <>
      <article
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
        aria-label={t("pages.landing.view_member_profile", { defaultValue: "View {{name}}'s profile", name: member.name })}
        className={cn(
          "mx-auto flex w-full max-w-full sm:max-w-[380px] cursor-pointer items-center gap-2 sm:gap-3 rounded-[6px] border px-2.5 sm:px-4 py-2.5 sm:py-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
          featured ? "min-h-[72px] sm:min-h-[84px] text-white shadow-lg" : "min-h-[74px] sm:min-h-[86px] bg-card",
        )}
        style={style}
      >
        {featured ? (
          <span className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
            <UserRound className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
        ) : (
          <MemberIcon member={member} color={color} index={index} />
        )}

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-[10px] sm:text-xs font-black uppercase leading-snug tracking-tight truncate",
              featured ? "text-white" : "text-foreground",
            )}
          >
            {member.title || t("pages.landing.team_member_fallback", { defaultValue: "Team Member" })}
          </h3>
          <p
            className={cn(
              "mt-1 sm:mt-1.5 text-xs sm:text-sm font-black leading-snug truncate",
              featured ? "text-white" : "text-foreground",
            )}
            style={featured ? undefined : { color }}
          >
            {member.name}
          </p>
        </div>
      </article>

      {modalOpen && (
        <MemberModal member={member} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mx-auto h-16 sm:h-20 max-w-[280px] sm:max-w-[400px] animate-pulse rounded-[6px] bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 sm:h-24 animate-pulse rounded-[6px] bg-muted" />
        ))}
      </div>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 sm:h-24 animate-pulse rounded-[6px] bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ─── Connector primitives ───────────────────────────────────────────────────
// Lines are black in light mode, white in dark mode.

function TrunkLine({ height, xPercent = 50 }: { height: number; xPercent?: number }) {
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
  const middleIndices = count > 2 ? Array.from({ length: count - 2 }, (_, i) => i + 1) : [];

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
  const members = (data?.data ?? []).filter((member) => member.is_active !== false).sort(sortMembers);
  const [leader, ...rest] = members;
  const rows = rest.reduce<Record<number, ApiTeamMember[]>>((acc, member) => {
    const level = member.level ?? 2;
    if (!acc[level]) acc[level] = [];
    acc[level].push(member);
    return acc;
  }, {});
  const rowEntries = Object.entries(rows)
    .map(([level, list]) => [Number(level), list.sort(sortMembers)] as const)
    .sort(([a], [b]) => a - b);

  // Chain each row's hand-off anchor into the next row's entry point.
  // Starts at 50 since the leader is always a single, centered card.
  let anchor = 50;
  const renderedRows = rowEntries.map(([level, list], rowIndex) => {
    const entryPercent = anchor;
    anchor = getAnchorPercent(list.length);
    return (
      <ConnectorRow key={level} count={list.length} entryPercent={entryPercent}>
        {list.map((member, index) => (
          <OrgCard key={member.id} member={member} index={index + rowIndex + 1} />
        ))}
      </ConnectorRow>
    );
  });

  return (
    <section id="team" className="bg-background py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="mb-5 sm:mb-6 text-center">
          <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.18em] sm:tracking-[0.22em] text-teal-700 dark:text-teal-400">
            {t("pages.landing.team_title", { defaultValue: "Meet Our Team" })}
          </p>
          <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-foreground md:text-3xl">
            {t("pages.landing.team_structure_title", { defaultValue: "Board and Leadership Structure" })}
          </h2>
        </div>

        {isError ? (
          <div className="rounded-[6px] border border-destructive/25 bg-destructive/5 px-4 sm:px-5 py-6 sm:py-8 text-center">
            <p className="text-sm font-medium text-destructive">
              {t("pages.landing.team_load_error")}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-xs font-semibold text-destructive/80 underline underline-offset-2 transition-colors hover:text-destructive"
            >
              {t("pages.landing.try_again", { defaultValue: "Try again" })}
            </button>
          </div>
        ) : isLoading ? (
          <TeamSkeleton />
        ) : members.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-border px-4 sm:px-5 py-8 sm:py-10 text-center text-sm text-muted-foreground">
            {t("pages.landing.team_empty")}
          </div>
        ) : (
          <div className="relative mx-auto max-w-6xl overflow-x-auto">
<div className="mx-auto flex w-full max-w-[240px] sm:max-w-[360px] items-center justify-center gap-2.5 sm:gap-3.5 rounded-[6px] bg-[#071F49] px-3.5 sm:px-6 py-3 sm:py-5 text-white shadow-lg">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
              <p className="text-sm sm:text-base uppercase tracking-tight">
                {t("pages.landing.board_of_directors", { defaultValue: "Board of Directors" })}
              </p>
            </div>

            {leader && (
              <div className="relative" style={{ paddingTop: 24 }}>
                <TrunkLine height={24} xPercent={50} />
                <OrgCard member={leader} index={0} featured />
              </div>
            )}

            {renderedRows}
          </div>
        )}
      </div>
    </section>
  );
}

export default OurTeam;