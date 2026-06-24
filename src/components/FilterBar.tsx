import { ReactNode } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

export type FilterFieldDef =
  | {
    type: "search";
    key: string;
    label: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
  }
  | {
    type: "select";
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (v: string) => void;
  }
  | {
    type: "custom";
    key: string;
    label: string;
    render: () => ReactNode;
  };

export interface FilterBarProps {
  /** Array of filter field definitions rendered in a responsive grid */
  fields: FilterFieldDef[];
  /** Whether the filter panel is currently expanded */
  open: boolean;
  /** Called when the Filters toggle button is clicked */
  onToggle: () => void;
  /** Whether any filter is currently active (used to highlight the button) */
  hasActiveFilters?: boolean;
  /** Called when the user clicks "Reset all" */
  onClearAll?: () => void;
  /** Extra content rendered after the fields grid (e.g. a SpecializationSelect) */
  extraSlot?: ReactNode;
  /** Override grid column count at each breakpoint */
  cols?: {
    default?: number;
    sm?: number;
    lg?: number;
    xl?: number;
  };
}

/* ─── Select className ───────────────────────────────────────────────── */

const selectCls =
  "w-full px-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer transition-all";

const inputCls =
  "w-full pl-7 pr-2.5 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all";

const labelCls =
  "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80";

/* ─── FilterField ────────────────────────────────────────────────────── */

function FilterField({ field }: { field: FilterFieldDef }) {
  return (
    <div className="space-y-1.5">
      <p className={labelCls}>{field.label}</p>

      {field.type === "search" && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            placeholder={field.placeholder ?? `Search…`}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            className={inputCls}
          />
          {field.value && (
            <button
              onClick={() => field.onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {field.type === "select" && (
        <select
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          className={selectCls}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "custom" && field.render()}
    </div>
  );
}

/* ─── Collapse panel ─────────────────────────────────────────────────── */

function FilterPanel({
  fields,
  extraSlot,
  cols = {},
  hasActiveFilters,
  onClearAll,
}: {
  fields: FilterFieldDef[];
  extraSlot?: ReactNode;
  cols?: FilterBarProps["cols"];
  hasActiveFilters?: boolean;
  onClearAll?: () => void;
}) {
  const { default: d = 1, sm = 2, lg = 3, xl } = cols;
  const resolvedXl = xl ?? Math.min(fields.length + (extraSlot ? 1 : 0), 6);

  const gridCls = cn(
    "grid gap-x-5 gap-y-4",
    d === 1 && "grid-cols-1",
    d === 2 && "grid-cols-2",
    sm === 2 && "sm:grid-cols-2",
    sm === 3 && "sm:grid-cols-3",
    lg === 3 && "lg:grid-cols-3",
    lg === 4 && "lg:grid-cols-4",
    resolvedXl === 4 && "xl:grid-cols-4",
    resolvedXl === 5 && "xl:grid-cols-5",
    resolvedXl === 6 && "xl:grid-cols-6",
    resolvedXl === 7 && "xl:grid-cols-7",
  );

  return (
    <div className="border-b border-border/60 bg-card/60 backdrop-blur-sm px-4 py-4">
      <div className={gridCls}>
        {fields.map((f) => (
          <FilterField key={f.key} field={f} />
        ))}
        {extraSlot}
      </div>

      {hasActiveFilters && onClearAll && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onClearAll}
            className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── FilterBar toggle button ────────────────────────────────────────── */

/**
 * A small button you can drop into any Meta Bar / toolbar to toggle the panel.
 */
export function FilterToggleButton({
  open,
  onToggle,
  hasActiveFilters,
}: {
  open: boolean;
  onToggle: () => void;
  hasActiveFilters?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border text-[11px] transition-all duration-200 font-medium",
        open || hasActiveFilters
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "border-border/60 text-muted-foreground bg-card hover:border-primary/40 hover:text-foreground",
      )}
    >
      <SlidersHorizontal className="w-3 h-3" />
      Filters
      {hasActiveFilters && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />
      )}
    </button>
  );
}

/* ─── FilterBar (collapsible wrapper) ───────────────────────────────── */

/**
 * A collapsible filter bar that slides open/closed.
 *
 * Usage:
 * ```tsx
 * <FilterBar
 *   open={filterOpen}
 *   onToggle={() => setFilterOpen(p => !p)}
 *   hasActiveFilters={hasActiveFilters}
 *   onClearAll={clearAll}
 *   fields={[
 *     { type: "search", key: "q", label: "Search", value: filters.q, onChange: v => set("q", v) },
 *     { type: "select", key: "gender", label: "Gender", value: filters.gender, options: GENDER_OPTIONS, onChange: v => set("gender", v) },
 *   ]}
 * />
 * ```
 */
export function FilterBar({
  fields,
  open,
  onToggle: _onToggle,
  hasActiveFilters,
  onClearAll,
  extraSlot,
  cols,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out flex-shrink-0",
        open ? "max-h-[700px] overflow-visible" : "max-h-0 overflow-hidden",
      )}
    >
      <FilterPanel
        fields={fields}
        extraSlot={extraSlot}
        cols={cols}
        hasActiveFilters={hasActiveFilters}
        onClearAll={onClearAll}
      />
    </div>
  );
}
