// ─────────────────────────────────────────────────────────────────────────────
// ExperienceStep
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { Plus } from "lucide-react";
import { FormField, EntryCard } from "./UiPrimitives";
import type { ExperienceEntry } from "./Types";

const uid = () => Math.random().toString(36).slice(2, 9);

interface ExperienceStepProps {
  entries: ExperienceEntry[];
  onChange: (v: ExperienceEntry[]) => void;
}

export const ExperienceStep = React.memo(function ExperienceStep({
  entries,
  onChange,
}: ExperienceStepProps) {
  const { t } = useTranslation();
  const addEntry = useCallback(() => {
    onChange([
      ...entries,
      {
        id: uid(),
        apiId: undefined,
        job_title: "",
        workplace: "",
        description: "",
        country: "",
        start_date: "",
        end_date: null,
        is_current: false,
      },
    ]);
  }, [entries, onChange]);

  const updateEntry = useCallback(
    (id: string, patch: Partial<ExperienceEntry>) => {
      onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [entries, onChange],
  );

  const removeEntry = useCallback(
    (id: string) => {
      onChange(entries.filter((e) => e.id !== id));
    },
    [entries, onChange],
  );

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-[6px] px-4 py-3 border border-dashed border-border">
          {t("doctorProfile.no_experience_yet")}
        </p>
      )}

      {entries.map((entry) => (
        <EntryCard key={entry.id} onRemove={() => removeEntry(entry.id)}>
          {entry.apiId && (
            <p className="text-[10px] text-muted-foreground mb-2 font-mono">
              ID: {entry.apiId}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={`${t("doctorProfile.job_title")} *`}>
              <Input
                value={entry.job_title}
                onChange={(e) =>
                  updateEntry(entry.id, { job_title: e.target.value })
                }
                placeholder="General Practitioner"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label={`${t("doctorProfile.workplace")} *`}>
              <Input
                value={entry.workplace}
                onChange={(e) =>
                  updateEntry(entry.id, { workplace: e.target.value })
                }
                placeholder="King Faisal Hospital"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label={t("doctorProfile.description_label")} className="sm:col-span-2">
              <RichTextarea
                value={entry.description}
                onChange={(value) =>
                  updateEntry(entry.id, { description: value })
                }
                placeholder={t("doctorProfile.description_placeholder")}
                minHeight={96}
                editorClassName="text-xs"
              />
            </FormField>

            <FormField label={`${t("doctorProfile.country_label")} *`}>
              <Input
                value={entry.country}
                onChange={(e) =>
                  updateEntry(entry.id, { country: e.target.value })
                }
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label={`${t("doctorProfile.start_date")} *`}>
              <Input
                type="date"
                value={entry.start_date}
                onChange={(e) =>
                  updateEntry(entry.id, { start_date: e.target.value })
                }
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            {!entry.is_current && (
              <FormField label={t("doctorProfile.end_date")}>
                <Input
                  type="date"
                  value={entry.end_date ?? ""}
                  onChange={(e) =>
                    updateEntry(entry.id, { end_date: e.target.value || null })
                  }
                  className="border-border focus-visible:ring-primary text-xs h-9"
                />
              </FormField>
            )}

            <div className="col-span-1 sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id={`current-${entry.id}`}
                checked={entry.is_current}
                onChange={(e) =>
                  updateEntry(entry.id, {
                    is_current: e.target.checked,
                    end_date: e.target.checked ? null : entry.end_date,
                  })
                }
                className="accent-primary"
              />
              <label
                htmlFor={`current-${entry.id}`}
                className="text-xs text-muted-foreground"
              >
                {t("doctorProfile.currently_working")}
              </label>
            </div>
          </div>
        </EntryCard>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> {t("doctorProfile.add_experience")}
      </Button>
    </div>
  );
});
