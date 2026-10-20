import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { useEpisodeTimeline, usePatientEpisodes } from "@/hooks/doctor/use-clinical-episodes";

export default function PatientEpisodes() {
  const { t } = useTranslation();
  const { data, isLoading } = usePatientEpisodes();
  const [openId, setOpenId] = useState<number | null>(null);
  const timeline = useEpisodeTimeline("patient", openId);
  const episodes = data ?? [];

  return (
    <DashboardLayout role="patient">
      <PageHeader
        title={t("pages.patient.episodes_title", "Your care timeline")}
        subtitle={t(
          "pages.patient.episodes_sub",
          "Each consult stays open until every clinical next step is done — not when a result file is uploaded.",
        )}
      />
      <div className="space-y-3 p-4 sm:p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading", "Loading…")}</p>
        ) : episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("pages.patient.episodes_empty", "After a doctor finalizes your consult note, the episode and next steps appear here.")}
          </p>
        ) : (
          episodes.map((episode) => (
            <article key={episode.id} className="rounded-[6px] border border-border bg-card p-4">
              <button
                type="button"
                onClick={() => setOpenId(openId === episode.id ? null : episode.id)}
                className="flex w-full items-start gap-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    Episode #{episode.id}
                  </span>
                  <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-muted-foreground">
                    {episode.episode_status}
                    {episode.next_action ? ` · next: ${episode.next_action.task_type.replace(/_/g, " ")}` : ""}
                  </span>
                </span>
              </button>
              {openId === episode.id && (
                <ol className="mt-3 space-y-2 border-t border-border/60 pt-3">
                  {timeline.isLoading ? (
                    <li className="text-xs text-muted-foreground">Loading timeline…</li>
                  ) : (timeline.data ?? []).length === 0 ? (
                    <li className="text-xs text-muted-foreground">No timeline events yet.</li>
                  ) : (
                    (timeline.data ?? []).map((event, index) => (
                      <li key={`${event.kind}-${index}`} className="text-xs text-foreground">
                        <span className="font-semibold">{event.label}</span>
                        {event.at ? (
                          <span className="ml-2 text-muted-foreground">{new Date(event.at).toLocaleString()}</span>
                        ) : null}
                      </li>
                    ))
                  )}
                </ol>
              )}
            </article>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
