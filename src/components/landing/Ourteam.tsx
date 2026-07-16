import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Linkedin, X } from "lucide-react";

import { ApiTeamMember, useGetOurTeam } from "@/hooks/use-our-team";

function getInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function getYearsExperience(joinedAt: string): number {
  const diff = Date.now() - new Date(joinedAt).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
}

function SkeletonCard() {
  return (
    <div className="rounded-[6px] border border-border bg-card p-6 text-center shadow-sm animate-pulse">
      <div className="mx-auto h-28 w-28 rounded-full bg-muted" />
      <div className="mx-auto mt-5 h-4 w-36 rounded bg-muted" />
      <div className="mx-auto mt-3 h-3 w-28 rounded bg-muted" />
      <div className="mx-auto mt-5 h-5 w-5 rounded bg-muted" />
    </div>
  );
}

function MemberModal({
  member,
  onClose,
}: {
  member: ApiTeamMember;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const years = getYearsExperience(member.joined_at);
  const joinYear = new Date(member.joined_at).getFullYear();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full overflow-hidden rounded-t-[12px] border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-[6px]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative aspect-[5/3] w-full overflow-hidden bg-muted">
          {member.photo_url && !imgError ? (
            <>
              <img
                src={member.photo_url}
                alt={member.name}
                className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
              {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <span className="text-5xl font-semibold text-primary">{getInitials(member.name)}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
            {member.title && (
              <p className="mt-1 text-sm font-medium text-primary">{member.title}</p>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <div
                className="overflow-hidden text-[12px] "
                dangerouslySetInnerHTML={{ __html: member.bio }}
              /> 
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-[6px] border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("pages.landing.team_joined")}
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">{joinYear}</p>
            </div>
            <div className="rounded-[6px] border border-border bg-muted/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("pages.landing.team_experience")}
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {t("pages.landing.team_yrs", { count: years })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MemberCard({ member }: { member: ApiTeamMember }) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="group flex min-h-[270px] flex-col items-center rounded-[6px] border border-border bg-card px-5 py-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={t("pages.landing.team_view_profile", { name: member.name })}
      >
        <div className="relative h-32 w-32 overflow-hidden rounded-full border border-border bg-muted shadow-sm">
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <span className="text-3xl font-semibold text-primary">{getInitials(member.name)}</span>
            </div>
          )}
        </div>

        <h3 className="mt-5 max-w-full truncate text-base font-semibold text-foreground">
          {member.name}
        </h3>
        {member.title && (
          <p className="mt-1 max-w-full truncate text-sm text-muted-foreground">
            {member.title}
          </p>
        )}
 
      </button>

      {modalOpen && <MemberModal member={member} onClose={() => setModalOpen(false)} />}
    </>
  );
}

function OurTeam() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useGetOurTeam();
  const members: ApiTeamMember[] = data?.data ?? [];

  if (isError) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {isLoading
        ? Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
        : members.length === 0
          ? (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
              {t("pages.landing.team_empty")}
            </p>
          )
          : members.slice(0, 4).map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
    </div>
  );
}

export default OurTeam;
