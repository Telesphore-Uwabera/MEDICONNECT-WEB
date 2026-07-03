// ─────────────────────────────────────────────────────────────────────────────
// QualificationsStep
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, Upload } from "lucide-react";
import { FormField, EntryCard } from "./UiPrimitives";
import type { QualificationEntry } from "./Types";

const uid = () => Math.random().toString(36).slice(2, 9);

interface QualificationsStepProps {
  entries: QualificationEntry[];
  onChange: (v: QualificationEntry[]) => void;
}

export const QualificationsStep = React.memo(function QualificationsStep({
  entries,
  onChange,
}: QualificationsStepProps) {
  const { t } = useTranslation();
  const addEntry = useCallback(() => {
    onChange([
      ...entries,
      {
        id: uid(),
        apiId: undefined,
        title: "",
        issuing_body: "",
        issued_at: "",
        expires_at: "",
        certificate_file: null,
      },
    ]);
  }, [entries, onChange]);

  const updateEntry = useCallback(
    (id: string, patch: Partial<QualificationEntry>) => {
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
          {t("doctorProfile.no_qualifications_yet")}
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
            <FormField
              label={`${t("doctorProfile.certification_title")} *`}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                value={entry.title}
                onChange={(e) =>
                  updateEntry(entry.id, { title: e.target.value })
                }
                placeholder="Advanced Cardiac Life Support"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={`${t("doctorProfile.issuing_body")} *`}
              className="col-span-1 sm:col-span-2"
            >
              <Input
                value={entry.issuing_body}
                onChange={(e) =>
                  updateEntry(entry.id, { issuing_body: e.target.value })
                }
                placeholder="American Heart Association"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label={`${t("doctorProfile.issued_date")} *`}>
              <Input
                type="date"
                value={entry.issued_at}
                onChange={(e) =>
                  updateEntry(entry.id, { issued_at: e.target.value })
                }
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label={t("doctorProfile.expiry_date")}>
              <Input
                type="date"
                value={entry.expires_at}
                onChange={(e) =>
                  updateEntry(entry.id, { expires_at: e.target.value })
                }
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField
              label={t("doctorProfile.certificate_file_optional")}
              className="col-span-1 sm:col-span-2"
            >
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-[6px] px-3 py-2 hover:border-primary hover:bg-primary/5 transition-colors">
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  className="sr-only"
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      certificate_file: e.target.files?.[0] ?? null,
                    })
                  }
                />
                {entry.certificate_file ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[11px] text-primary truncate">
                      {entry.certificate_file.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground">
                      {t("doctorProfile.upload_certificate_hint")}
                    </span>
                  </>
                )}
              </label>
            </FormField>
          </div>
        </EntryCard>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="w-full border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" /> {t("doctorProfile.add_qualification")}
      </Button>
    </div>
  );
});
