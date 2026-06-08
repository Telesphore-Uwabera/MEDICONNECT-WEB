// ─────────────────────────────────────────────────────────────────────────────
// SpecializationsStep
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Plus, X } from "lucide-react";
import { SPECIALIZATION_MAP, PRIMARY_SPECIALIZATIONS } from "./Constants";
import { FormField } from "./ui-primitives";
import type { SpecializationsInfo } from "./Types";

interface SpecializationsStepProps {
  data: SpecializationsInfo;
  onChange: (v: SpecializationsInfo) => void;
}

export const SpecializationsStep = React.memo(function SpecializationsStep({
  data,
  onChange,
}: SpecializationsStepProps) {
  const [tagInput, setTagInput] = useState("");

  const subspecialties = useMemo(
    () => (data.primary ? SPECIALIZATION_MAP[data.primary] ?? [] : []),
    [data.primary],
  );

  const handlePrimaryChange = useCallback(
    (value: string) => {
      const validSubs = SPECIALIZATION_MAP[value] ?? [];
      onChange({
        ...data,
        primary: value,
        secondary: data.secondary.filter((s) => validSubs.includes(s)),
      });
    },
    [data, onChange],
  );

  const toggleSecondary = useCallback(
    (spec: string) => {
      onChange({
        ...data,
        secondary: data.secondary.includes(spec)
          ? data.secondary.filter((s) => s !== spec)
          : [...data.secondary, spec],
      });
    },
    [data, onChange],
  );

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed || data.custom_tags?.includes(trimmed)) return;
    onChange({ ...data, custom_tags: [...(data.custom_tags ?? []), trimmed] });
    setTagInput("");
  }, [tagInput, data, onChange]);

  const removeTag = useCallback(
    (tag: string) => {
      onChange({
        ...data,
        custom_tags: (data.custom_tags ?? []).filter((t) => t !== tag),
      });
    },
    [data, onChange],
  );

  return (
    <div className="space-y-6">
      {/* Primary */}
      <FormField label="Primary specialization *">
        <Select value={data.primary ?? ""} onValueChange={handlePrimaryChange}>
          <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
            <SelectValue placeholder="Select primary specialization" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {PRIMARY_SPECIALIZATIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Subspecialties panel */}
      {data.primary && (
        <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {subspecialties.length > 0
                ? `Subspecialties of ${data.primary}`
                : `No registered subspecialties for ${data.primary}`}
            </span>
            {data.secondary.length > 0 && (
              <span className="ml-auto text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/15 text-primary">
                {data.secondary.length} selected
              </span>
            )}
          </div>

          {subspecialties.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {subspecialties.map((spec) => {
                const selected = data.secondary.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSecondary(spec)}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 font-medium cursor-pointer select-none",
                      selected
                        ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {selected && <Check className="h-2.5 w-2.5 shrink-0" />}
                    {spec}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              You can add custom tags below to describe your subspecialties.
            </p>
          )}

          {data.secondary.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground mb-1.5">Selected subspecialties:</p>
              <div className="flex flex-wrap gap-1">
                {data.secondary.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => toggleSecondary(s)}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Years of experience */}
      <FormField label="Years of experience">
        <Input
          type="number"
          value={data.years_of_experience ?? ""}
          onChange={(e) => onChange({ ...data, years_of_experience: +e.target.value })}
          placeholder="10"
          min={0}
          max={60}
          className="border-border focus-visible:ring-primary text-xs h-9 w-full sm:w-40"
        />
      </FormField>

      {/* Subspecialties free-text */}
      <FormField label="Subspecialties / areas of focus (free text)">
        <Input
          value={data.subspecialties ?? ""}
          onChange={(e) => onChange({ ...data, subspecialties: e.target.value })}
          placeholder="e.g. Pediatric cardiology, rare coagulopathies"
          className="border-border focus-visible:ring-primary text-xs h-9"
        />
      </FormField>

      {/* Custom tags */}
      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground">Custom tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTag(); }
            }}
            placeholder="Type a tag and press Enter"
            className="border-border focus-visible:ring-primary text-xs h-9 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTag}
            className="text-xs h-9 px-3 border-border"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {(data.custom_tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(data.custom_tags ?? []).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
