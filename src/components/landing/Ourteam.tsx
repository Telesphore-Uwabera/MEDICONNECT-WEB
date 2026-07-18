import { type CSSProperties } from "react";
import { BriefcaseBusiness, Users, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

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

function sortMembers(a: ApiTeamMember, b: ApiTeamMember): number {
  const levelA = a.level ?? 99;
  const levelB = b.level ?? 99;
  if (levelA !== levelB) return levelA - levelB;
  const orderA = a.order ?? 999;
  const orderB = b.order ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name);
}

function MemberIcon({ member, color, index }: { member: ApiTeamMember; color: string; index: number }) {
  if (member.icon_url) {
    return (
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm"
        style={{ borderColor: `${color}55` }}
      >
        <img src={member.icon_url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }

  return (
    <span
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {index % 3 === 0 ? <BriefcaseBusiness className="h-7 w-7" /> : <Users className="h-7 w-7" />}
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
  const color = normalizeColor(member.color_code, index);
  const style = featured
    ? ({ background: "linear-gradient(135deg, #082A62, #064A9A)", borderColor: "#073E82" } as CSSProperties)
    : ({ borderColor: `${color}66`, backgroundColor: colorSurface(color) } as CSSProperties);

  return (
    <article
      className={cn(
        "mx-auto flex w-full max-w-[390px] items-center gap-4 rounded-[14px] border px-5 py-5 text-left shadow-sm",
        featured ? "min-h-[116px] text-white shadow-lg" : "min-h-[124px] bg-card",
      )}
      style={style}
    >
      {featured ? (
        member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="h-16 w-16 shrink-0 rounded-full border border-white/20 object-cover object-top"
            loading="lazy"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-black text-white">
            {getInitials(member.name) || <UserRound className="h-8 w-8" />}
          </span>
        )
      ) : (
        <MemberIcon member={member} color={color} index={index} />
      )}

      <div className="min-w-0 flex-1">
        <h3 className={cn("text-sm font-black uppercase leading-snug tracking-tight", featured ? "text-white" : "text-foreground")}>
          {member.title || t("pages.landing.team_member_fallback", { defaultValue: "Team Member" })}
        </h3>
        <p className={cn("mt-2 text-base font-black leading-snug", featured ? "text-white" : "text-foreground")} style={featured ? undefined : { color }}>
          {member.name}
        </p>
      </div>
    </article>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-8">
      <div className="mx-auto h-24 max-w-[420px] animate-pulse rounded-[14px] bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[14px] bg-muted" />
        ))}
      </div>
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[14px] bg-muted" />
        ))}
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

  return (
    <section id="team" className="bg-background py-8 lg:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700 dark:text-teal-400">
            {t("pages.landing.team_title", { defaultValue: "Meet Our Team" })}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            {t("pages.landing.team_structure_title", { defaultValue: "Board and Leadership Structure" })}
          </h2>
        </div>

        {isError ? (
          <div className="rounded-[10px] border border-destructive/25 bg-destructive/5 px-5 py-8 text-center">
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
          <div className="rounded-[10px] border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            {t("pages.landing.team_empty")}
          </div>
        ) : (
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto flex w-full max-w-[430px] items-center justify-center gap-5 rounded-[14px] bg-[#071F49] px-8 py-7 text-white shadow-lg">
              <Users className="h-11 w-11 shrink-0" />
              <p className="text-md  uppercase tracking-tight md:text-lg">
                {t("pages.landing.board_of_directors", { defaultValue: "Board of Directors" })}
              </p>
            </div>

            <div className="mx-auto h-9 w-px bg-slate-300 dark:bg-slate-700" />

            {leader && (
              <>
                <OrgCard member={leader} index={0} featured />
                {rowEntries.length > 0 && <div className="mx-auto h-9 w-px bg-slate-300 dark:bg-slate-700" />}
              </>
            )}

            {rowEntries.map(([level, list], rowIndex) => (
              <div key={level} className="relative pb-8 last:pb-0">
                <div className="pointer-events-none absolute left-1/2 top-0 hidden h-8 w-px -translate-x-1/2 bg-slate-300 dark:bg-slate-700 lg:block" />
                <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 hidden h-px bg-slate-300 dark:bg-slate-700 lg:block" />
                <div className={cn("grid gap-4 pt-8", list.length >= 4 ? "lg:grid-cols-4" : list.length === 3 ? "lg:grid-cols-3" : list.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1") }>
                  {list.map((member, index) => (
                    <div key={member.id} className="relative">
                      <div className="pointer-events-none absolute left-1/2 top-[-32px] hidden h-8 w-px -translate-x-1/2 bg-slate-300 dark:bg-slate-700 lg:block" />
                      <OrgCard member={member} index={index + rowIndex + 1} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default OurTeam;


