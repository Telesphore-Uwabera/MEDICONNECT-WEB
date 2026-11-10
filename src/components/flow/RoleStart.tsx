import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

export interface StartAction {
  to: string;
  title: string;
  hint: string;
}

/** Primary actions so a dashboard is never a dead end. */
export function RoleStart({ actions }: { actions: StartAction[] }) {
  const { t } = useTranslation();
  return (
    <section aria-label={t("clinical.flow.start_here")} data-testid="role-start" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={`${action.to}-${action.title}`}
          to={action.to}
          className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-soft transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">{action.title}</span>
            <span className="mt-1 block text-xs leading-snug text-muted-foreground">{action.hint}</span>
          </span>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        </Link>
      ))}
    </section>
  );
}
