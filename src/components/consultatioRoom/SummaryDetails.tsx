// Read-only renderer for a consultation summary (SOAP note). Shared by the
// doctor list page and the patient appointment/instant summary views.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Stethoscope } from "lucide-react";
import { RichTextRenderer } from "@/components/ui/rich-textarea";
import type { ConsultationSummary } from "@/hooks/doctor/use-consultation-summaries";

const pretty = (s: string) => s.replace(/_/g, " ");

export function SummaryDetails({ summary: s }: { summary: ConsultationSummary }) {
  const { t } = useTranslation();
  const ros = s.review_of_systems ?? {};
  const activeFlags = Object.entries(s.red_flag_screening ?? {}).filter(
    ([k, v]) => v && k !== "alert_triggered",
  );
  const hpi = s.history_of_present_illness;

  return (
    <div className="space-y-4">
      <Field label={t("consult.summary_details.chief_complaint")}>
        {s.chief_complaint?.main_complaint ? (
          <RichTextRenderer value={s.chief_complaint.main_complaint} className="text-sm text-foreground" />
        ) : (
          <Muted />
        )}
        {s.chief_complaint?.duration_value != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("consult.summary_details.duration", { value: s.chief_complaint.duration_value, unit: s.chief_complaint.duration_unit ?? "" })}
          </p>
        )}
      </Field>

      {hpi && (hpi.onset || hpi.location || hpi.severity != null) && (
        <Field label={t("consult.summary_details.history_present_illness")}>
          <p className="text-sm text-foreground">
            {[
              hpi.onset && t("consult.summary_details.onset", { value: hpi.onset }),
              hpi.location && t("consult.summary_details.location", { value: hpi.location }),
              hpi.severity != null && t("consult.summary_details.severity", { value: hpi.severity }),
            ]
              .filter(Boolean)
              .join(" · ") || <Muted />}
          </p>
        </Field>
      )}

      {Object.values(ros).some((l) => (l ?? []).length) && (
        <Field label={t("consult.summary_details.review_of_systems")}>
          <div className="space-y-1.5">
            {Object.entries(ros).map(([sys, list]) =>
              (list ?? []).length ? (
                <div key={sys} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">
                    {pretty(sys)}:
                  </span>
                  {(list ?? []).map((sym) => (
                    <span key={sym} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {pretty(sym)}
                    </span>
                  ))}
                </div>
              ) : null,
            )}
          </div>
        </Field>
      )}

      {activeFlags.length > 0 && (
        <Field label={t("consult.summary_details.red_flags")}>
          <div className="flex flex-wrap gap-1.5">
            {activeFlags.map(([k]) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                <AlertTriangle className="h-2.5 w-2.5" /> {pretty(k)}
              </span>
            ))}
          </div>
        </Field>
      )}

      {(s.clinical_assessment?.primary_diagnosis || s.clinical_assessment?.severity_classification) && (
        <Field label={t("consult.summary_details.clinical_assessment")}>
          <p className="text-sm text-foreground flex items-center gap-2 flex-wrap">
            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
            {s.clinical_assessment?.primary_diagnosis || "—"}
            {s.clinical_assessment?.severity_classification && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                {s.clinical_assessment.severity_classification}
              </span>
            )}
          </p>
        </Field>
      )}

      {s.management_plan?.followup_plan && (
        <Field label={t("consult.summary_details.follow_up_plan")}>
          <RichTextRenderer value={s.management_plan.followup_plan} className="text-sm text-foreground" />
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Muted() {
  return <span className="text-sm text-muted-foreground/60">—</span>;
}
