import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { REQUIRED_PROFILE_FIELDS } from "@/lib/patient-profile-complete";

function filled(value: unknown) {
  const text = String(value ?? "").trim();
  return Boolean(text) && !text.startsWith("0000-00-00");
}

/** Shows which of the 11 required profile fields are still missing, and why. */
export function ProfileProgress({ profile }: { profile?: object | null }) {
  const { t } = useTranslation();
  const record = (profile ?? {}) as Record<string, unknown>;
  const done = REQUIRED_PROFILE_FIELDS.filter((field) => filled(record[field]));
  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => !filled(record[field]));
  const percent = Math.round((done.length / REQUIRED_PROFILE_FIELDS.length) * 100);

  return (
    <section data-testid="profile-progress" className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("clinical.flow.profile_title")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("clinical.flow.profile_why")}</p>
        </div>
        <p className="text-sm font-semibold text-primary">{percent}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      {missing.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {missing.map((field) => (
            <li key={field} className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
              {t(`clinical.flow.field.${field}`)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">{t("clinical.flow.profile_done")}</p>
      )}
      <Link
        to="/patient/profile"
        className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {missing.length ? t("clinical.flow.profile_continue") : t("clinical.flow.profile_review")}
      </Link>
    </section>
  );
}
