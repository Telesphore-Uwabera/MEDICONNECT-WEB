import { BROWSE_SPECIALITIES, browseSpecialityValue } from "@/lib/browse-specialities";

export function BrowseSpecialityPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {BROWSE_SPECIALITIES.map((item) => {
        const value = browseSpecialityValue(item);
        const on = selected.includes(value);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={on}
            onClick={() => {
              onChange(on ? selected.filter((entry) => entry !== value) : [...selected, value]);
            }}
            className={`rounded-[6px] border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              on
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
