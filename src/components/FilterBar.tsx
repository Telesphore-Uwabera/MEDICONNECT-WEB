import { ReactNode } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomSelect } from "./ui/custom-select";

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
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
  open?: boolean;
  /** Keep the panel visible — patients do not have to click Filters */
  alwaysOpen?: boolean;
  /** Called when the Filters toggle button is clicked */
  onToggle?: () => void;
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
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  };
}

/* ─── Shared classNames ──────────────────────────────────────────────── */

const inputCls =
  "w-full h-8 pl-7 pr-2.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all";

const labelCls =
  "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80";

/* ─── FilterField ────────────────────────────────────────────────────── */

function FilterField({
  field,
  compact = false,
}: {
  field: FilterFieldDef;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        compact && field.type === "search"
          ? "w-full"
          : compact
            ? "w-full min-w-0"
            : "space-y-1.5",
      )}
    >
      <p className={compact ? "sr-only" : labelCls}>{field.label}</p>

      {field.type === "search" && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            placeholder={field.placeholder ?? `Search…`}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            className={cn(inputCls, compact && "h-9 text-[12px]")}
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
        <CustomSelect
          value={field.value}
          options={field.options}
          onChange={field.onChange}
          label={field.label}
          compact={compact}
          className="w-full"
        />
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
  const { default: d = 1, sm = 2, md = 3, lg = 4, xl, xxl } = cols;
  const resolvedXl = xl ?? Math.min(fields.length + (extraSlot ? 1 : 0), 5);
  const resolvedXxl = xxl ?? Math.min(fields.length + (extraSlot ? 1 : 0), 7);
  const searchFields = fields.filter((field) => field.type === "search");
  const compactFields = fields.filter((field) => field.type !== "search");

  const gridCls = cn(
    "grid gap-x-3 gap-y-3 lg:gap-x-5 lg:gap-y-4",
    d === 1 && "grid-cols-1",
    d === 2 && "grid-cols-2",
    sm === 2 && "sm:grid-cols-2",
    sm === 3 && "sm:grid-cols-3",
    md === 2 && "md:grid-cols-2",
    md === 3 && "md:grid-cols-3",
    lg === 3 && "lg:grid-cols-3",
    lg === 4 && "lg:grid-cols-4",
    resolvedXl === 4 && "xl:grid-cols-4",
    resolvedXl === 5 && "xl:grid-cols-5",
    resolvedXl === 6 && "xl:grid-cols-6",
    resolvedXl === 7 && "xl:grid-cols-7",
    resolvedXxl === 5 && "2xl:grid-cols-5",
    resolvedXxl === 6 && "2xl:grid-cols-6",
    resolvedXxl === 7 && "2xl:grid-cols-7",
  );

  return (
    <div className="border-b border-border/60 bg-card/60 backdrop-blur-sm px-3 py-3 sm:px-4 sm:py-4">
      <div className="space-y-2 md:hidden">
        {searchFields.map((f) => (
          <FilterField key={f.key} field={f} compact />
        ))}

        {(compactFields.length > 0 || extraSlot) && (
          <div className="grid grid-cols-2 gap-2">
            {compactFields.map((f) => (
              <div
                key={f.key}
                className={cn("min-w-0", f.type === "custom" && "col-span-2")}
              >
                <FilterField field={f} compact />
              </div>
            ))}
            {extraSlot && <div className="col-span-2 min-w-0">{extraSlot}</div>}
          </div>
        )}
      </div>

      <div className={cn(gridCls, "hidden md:grid")}>
        {fields.map((f) => (
          <FilterField key={f.key} field={f} />
        ))}
        {extraSlot && <div className="min-w-0 md:col-span-2 xl:col-span-1 2xl:col-span-1">{extraSlot}</div>}
      </div>

      {hasActiveFilters && onClearAll && (
        <div className="mt-2 sm:mt-3 flex justify-end">
          <button
            onClick={onClearAll}
            className="text-[11px] sm:text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
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
        "flex h-8 items-center gap-1.5 px-2.5 rounded-[6px] border text-[11px] transition-all duration-200 font-medium whitespace-nowrap",
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
  alwaysOpen = false,
  onToggle: _onToggle,
  hasActiveFilters,
  onClearAll,
  extraSlot,
  cols,
}: FilterBarProps) {
  const visible = alwaysOpen || open;
  return (
    <div
      className={cn(
        "flex-shrink-0",
        alwaysOpen
          ? "overflow-visible"
          : "transition-all duration-300 ease-in-out",
        !alwaysOpen && (visible ? "max-h-[700px] overflow-visible" : "max-h-0 overflow-hidden"),
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
