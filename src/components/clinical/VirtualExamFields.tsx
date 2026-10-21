import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const VIRTUAL_EXAM_FINDINGS: { group: string; items: { value: string; label: string }[] }[] = [
  {
    group: "General appearance",
    items: [
      { value: "appears_well", label: "Appears well" },
      { value: "appears_unwell", label: "Appears unwell" },
      { value: "distress", label: "Apparent distress" },
      { value: "diaphoresis", label: "Sweating" },
      { value: "pallor", label: "Pallor" },
      { value: "jaundice", label: "Jaundice" },
      { value: "cyanosis", label: "Cyanosis" },
    ],
  },
  {
    group: "Respiratory",
    items: [
      { value: "sob", label: "Shortness of breath (reported)" },
      { value: "respiratory_distress", label: "Visible respiratory distress" },
      { value: "cannot_speak_sentences", label: "Cannot speak in complete sentences" },
      { value: "cough", label: "Cough" },
      { value: "wheeze", label: "Audible wheeze" },
    ],
  },
  {
    group: "Neuro / speech",
    items: [
      { value: "slurred_speech", label: "Slurred speech" },
      { value: "facial_droop", label: "Facial droop" },
      { value: "weakness", label: "Observable weakness" },
      { value: "confusion", label: "Confusion / dizziness (reported)" },
    ],
  },
  {
    group: "Skin / limbs",
    items: [
      { value: "rash", label: "Rash" },
      { value: "swelling", label: "Visible swelling" },
      { value: "wound", label: "Wound / ulcer" },
      { value: "deformity", label: "Suspected deformity / injury" },
    ],
  },
];

interface Props {
  selected: string[];
  onToggle: (value: string) => void;
  onPreset: (kind: "none" | "unable") => void;
}

export function VirtualExamFields({ selected, onToggle, onPreset }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-[6px] border border-border bg-background/60 p-3 md:col-span-2">
      <div>
        <h4 className="text-xs font-semibold text-foreground">
          {t("clinical.exam.title", "Virtual examination findings")}
        </h4>
        <p className="text-[10px] text-muted-foreground">
          {t(
            "clinical.exam.hint",
            "Remote assessment only. This does not record a complete physical examination.",
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onPreset("none")} className="rounded-[5px] border border-border px-2 py-1 text-[10px] font-semibold hover:bg-muted">
          {t("clinical.exam.none", "No relevant abnormality observed")}
        </button>
        <button type="button" onClick={() => onPreset("unable")} className="rounded-[5px] border border-border px-2 py-1 text-[10px] font-semibold hover:bg-muted">
          {t("clinical.exam.unable", "Unable to assess virtually")}
        </button>
      </div>
      {VIRTUAL_EXAM_FINDINGS.map((group) => (
        <div key={group.group}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t(`clinical.exam.group_${group.group}`, group.group)}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              const active = selected.includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onToggle(item.value)}
                  className={cn(
                    "rounded-[5px] border px-2 py-1 text-[11px]",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t(`clinical.exam.${item.value}`, item.label)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
