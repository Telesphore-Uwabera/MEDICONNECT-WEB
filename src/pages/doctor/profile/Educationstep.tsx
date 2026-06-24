// ─────────────────────────────────────────────────────────────────────────────
// EducationStep
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { FormField, EntryCard } from "./UiPrimitives";
import type { EducationEntry } from "./Types";

const uid = () => Math.random().toString(36).slice(2, 9);

interface EducationStepProps {
  entries: EducationEntry[];
  onChange: (v: EducationEntry[]) => void;
}

export const EducationStep = React.memo(function EducationStep({
  entries,
  onChange,
}: EducationStepProps) {
  const addEntry = useCallback(() => {
    onChange([
      ...entries,
      {
        id: uid(),
        apiId: undefined,
        degree: "",
        institution: "",
        country: "",
        start_year: new Date().getFullYear() - 6,
        end_year: new Date().getFullYear(),
      },
    ]);
  }, [entries, onChange]);

  const updateEntry = useCallback(
    (id: string, patch: Partial<EducationEntry>) => {
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
          No education entries yet. Click "Add education" below.
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
            <FormField label="Degree *">
              <Input
                value={entry.degree}
                onChange={(e) =>
                  updateEntry(entry.id, { degree: e.target.value })
                }
                placeholder="MBBS"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Institution *">
              <Input
                value={entry.institution}
                onChange={(e) =>
                  updateEntry(entry.id, { institution: e.target.value })
                }
                placeholder="University of Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <FormField label="Country *">
              <Input
                value={entry.country}
                onChange={(e) =>
                  updateEntry(entry.id, { country: e.target.value })
                }
                placeholder="Rwanda"
                className="border-border focus-visible:ring-primary text-xs h-9"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label="Start year *">
                <Input
                  type="number"
                  value={entry.start_year}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      start_year: parseInt(e.target.value, 10),
                    })
                  }
                  className="border-border focus-visible:ring-primary text-xs h-9"
                />
              </FormField>
              <FormField label="End year">
                <Input
                  type="number"
                  value={entry.end_year}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      end_year: parseInt(e.target.value, 10),
                    })
                  }
                  className="border-border focus-visible:ring-primary text-xs h-9"
                />
              </FormField>
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
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add education
      </Button>
    </div>
  );
});
