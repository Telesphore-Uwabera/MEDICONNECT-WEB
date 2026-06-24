// ─────────────────────────────────────────────────────────────────────────────
// SpecializationsStep — Modern Split-Panel Selection
// Two-column layout: Specializations (left) → Sub-specializations (right)
// Inline summary chip with animated selection confirmation
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Check,
  Search,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  Stethoscope,
  Layers,
  Sparkles,
} from "lucide-react";
import { FormField } from "./UiPrimitives";
import {
  useSpecializationSelect,
  type Specialization,
  type SpecializationFee,
} from "@/hooks/use-specialization-select";
import type { SpecializationsInfo } from "./Types";

interface SpecializationsStepProps {
  data: SpecializationsInfo;
  onChange: (v: SpecializationsInfo) => void;
}

/* ── Animated counter for selection feedback ─────────────────────────────── */
function AnimatedPrice({ value, currency }: { value: number; currency: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 400;
    const start = performance.now();
    const from = display;
    const to = value;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span>
      {currency} {display.toLocaleString()}
    </span>
  );
}

/* ── Selection summary chip ──────────────────────────────────────────────── */
function SelectionChip({
  spec,
  fee,
  onClear,
}: {
  spec: Specialization;
  fee: SpecializationFee;
  onClear: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[6px] border border-primary/20 bg-primary/[0.03] p-3 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span>{spec.name}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-primary">{fee.sub_specialization}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {fee.tier_name}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <AnimatedPrice value={Number(fee.in_person_fee)} currency={fee.currency} />
              <span className="text-muted-foreground font-normal">in-person</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <AnimatedPrice value={Number(fee.online_fee)} currency={fee.currency} />
              <span className="text-muted-foreground font-normal">online</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-[6px] p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export const SpecializationsStep = React.memo(function SpecializationsStep({
  data,
  onChange,
}: SpecializationsStepProps) {
  const [specQuery, setSpecQuery] = useState("");
  const [feeQuery, setFeeQuery] = useState("");
  const [highlightedSpec, setHighlightedSpec] = useState<number>(-1);
  const [highlightedFee, setHighlightedFee] = useState<number>(-1);

  const specListRef = useRef<HTMLUListElement>(null);
  const feeListRef = useRef<HTMLUListElement>(null);
  const specInputRef = useRef<HTMLInputElement>(null);

  const {
    value,
    specializations,
    loadingSpecializations,
    errorSpecializations,
    fees,
    loadingFees,
    errorFees,
    selectSpecialization,
    selectFee,
    clear,
  } = useSpecializationSelect();

  // Sync hook → parent
  useEffect(() => {
    onChange({
      primary: value.specialization?.name ?? "",
      specialization_fee_id: value.fee?.id ?? null,
      years_of_experience: data.years_of_experience,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.specialization?.id, value.fee?.id]);

  // Scroll highlighted items into view
  useEffect(() => {
    if (highlightedSpec < 0 || !specListRef.current) return;
    const item = specListRef.current.children[highlightedSpec] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedSpec]);

  useEffect(() => {
    if (highlightedFee < 0 || !feeListRef.current) return;
    const item = feeListRef.current.children[highlightedFee] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedFee]);

  // Filtered lists
  const filteredSpecs = specializations.filter((s) =>
    s.name.toLowerCase().includes(specQuery.toLowerCase())
  );
  const filteredFees = fees.filter((f) =>
    f.sub_specialization.toLowerCase().includes(feeQuery.toLowerCase())
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectSpec = useCallback(
    (spec: Specialization) => {
      selectSpecialization(spec);
      setHighlightedSpec(-1);
      setFeeQuery(""); // reset fee search on new spec
      // Focus fee search after a brief delay for animation
      setTimeout(() => {
        const feeInput = document.getElementById("fee-search") as HTMLInputElement;
        feeInput?.focus();
      }, 150);
    },
    [selectSpecialization]
  );

  const handleSelectFee = useCallback(
    (fee: SpecializationFee) => {
      selectFee(fee);
      setHighlightedFee(-1);
    },
    [selectFee]
  );

  const handleClear = useCallback(() => {
    clear();
    setSpecQuery("");
    setFeeQuery("");
    setHighlightedSpec(-1);
    setHighlightedFee(-1);
    setTimeout(() => specInputRef.current?.focus(), 0);
  }, [clear]);

  const handleSpecKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedSpec((h) => Math.min(h + 1, filteredSpecs.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedSpec((h) => Math.max(h - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedSpec >= 0 && filteredSpecs[highlightedSpec]) {
            handleSelectSpec(filteredSpecs[highlightedSpec]);
          }
          break;
      }
    },
    [filteredSpecs, highlightedSpec, handleSelectSpec]
  );

  const handleFeeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedFee((h) => Math.min(h + 1, filteredFees.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedFee((h) => Math.max(h - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedFee >= 0 && filteredFees[highlightedFee]) {
            handleSelectFee(filteredFees[highlightedFee]);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          specInputRef.current?.focus();
          break;
      }
    },
    [filteredFees, highlightedFee, handleSelectFee]
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderEmpty = (query: string, type: "spec" | "fee") => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground">
        {query
          ? `No ${type === "spec" ? "specializations" : "sub-specializations"} match "${query}"`
          : type === "spec"
            ? "Start typing to search specializations"
            : value.specialization
              ? "No sub-specializations available"
              : "Select a specialization first"}
      </p>
    </div>
  );

  const renderError = () => (
    <div className="flex items-center gap-2 px-3 py-4 text-xs text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      Failed to load. Please try again.
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading...
    </div>
  );

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Split-Panel Selection ─────────────────────────────────────────── */}
      <FormField label="Specialization & Sub-specialization *">
        <div className="rounded-[6px] border border-border bg-card shadow-sm overflow-hidden">

          {/* Panel Header */}
          <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>Step 1: Specialization</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              value.specialization ? "text-primary" : "text-muted-foreground/50"
            )}>
              <Layers className="h-3.5 w-3.5" />
              <span>Step 2: Sub-specialization</span>
            </div>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">

            {/* LEFT: Specializations */}
            <div className="flex flex-col">
              <div className="p-3 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    ref={specInputRef}
                    type="text"
                    value={specQuery}
                    onChange={(e) => {
                      setSpecQuery(e.target.value);
                      setHighlightedSpec(-1);
                    }}
                    onKeyDown={handleSpecKeyDown}
                    placeholder="Search specializations..."
                    className="w-full h-8 rounded-[6px] border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    disabled={loadingSpecializations}
                  />
                  {specQuery && (
                    <button
                      type="button"
                      onClick={() => { setSpecQuery(""); specInputRef.current?.focus(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-[200px] max-h-[280px] overflow-y-auto">
                {loadingSpecializations ? renderLoading() :
                  errorSpecializations ? renderError() :
                    filteredSpecs.length === 0 ? renderEmpty(specQuery, "spec") : (
                      <ul ref={specListRef} className="py-1">
                        {filteredSpecs.map((spec, i) => {
                          const isSelected = value.specialization?.id === spec.id;
                          const isHighlighted = highlightedSpec === i;
                          return (
                            <li
                              key={spec.id}
                              onClick={() => handleSelectSpec(spec)}
                              onMouseEnter={() => setHighlightedSpec(i)}
                              className={cn(
                                "group flex items-center justify-between gap-2 px-3 py-2.5 text-xs cursor-pointer select-none transition-all duration-150",
                                isHighlighted && "bg-accent text-accent-foreground",
                                isSelected && !isHighlighted && "bg-primary/8 text-primary border-l-2 border-l-primary",
                                !isHighlighted && !isSelected && "text-foreground hover:bg-muted/50 border-l-2 border-l-transparent",
                              )}
                            >
                              <span className="font-medium">{spec.name}</span>
                              <ChevronRight className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-colors",
                                isSelected ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              )} />
                            </li>
                          );
                        })}
                      </ul>
                    )}
              </div>
            </div>

            {/* RIGHT: Sub-specializations */}
            <div className="flex flex-col">
              <div className="p-3 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    id="fee-search"
                    type="text"
                    value={feeQuery}
                    onChange={(e) => {
                      setFeeQuery(e.target.value);
                      setHighlightedFee(-1);
                    }}
                    onKeyDown={handleFeeKeyDown}
                    placeholder={value.specialization
                      ? `Search in ${value.specialization.name}...`
                      : "Select specialization first..."}
                    className="w-full h-8 rounded-[6px] border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!value.specialization || loadingFees}
                  />
                  {feeQuery && value.specialization && (
                    <button
                      type="button"
                      onClick={() => { setFeeQuery(""); document.getElementById("fee-search")?.focus(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-[200px] max-h-[280px] overflow-y-auto">
                {!value.specialization ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Layers className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-xs">Select a specialization to see options</p>
                  </div>
                ) : loadingFees ? renderLoading() :
                  errorFees ? renderError() :
                    filteredFees.length === 0 ? renderEmpty(feeQuery, "fee") : (
                      <ul ref={feeListRef} className="py-1">
                        {filteredFees.map((fee, i) => {
                          const isSelected = value.fee?.id === fee.id;
                          const isHighlighted = highlightedFee === i;
                          return (
                            <li
                              key={fee.id}
                              onClick={() => handleSelectFee(fee)}
                              onMouseEnter={() => setHighlightedFee(i)}
                              className={cn(
                                "group px-3 py-3 cursor-pointer select-none transition-all duration-150 border-l-2",
                                isHighlighted && "bg-accent text-accent-foreground border-l-accent",
                                isSelected && !isHighlighted && "bg-primary/8 border-l-primary",
                                !isHighlighted && !isSelected && "hover:bg-muted/50 border-l-transparent",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground mb-1">
                                    {fee.sub_specialization}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted font-medium">
                                      {fee.tier_name}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium text-foreground">
                                        {fee.currency} {Number(fee.in_person_fee).toLocaleString()}
                                      </span>
                                      <span className="opacity-60">in-person</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="font-medium text-foreground">
                                        {fee.currency} {Number(fee.online_fee).toLocaleString()}
                                      </span>
                                      <span className="opacity-60">online</span>
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
              </div>
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        {value.specialization && value.fee ? (
          <div className="mt-3">
            <SelectionChip
              spec={value.specialization}
              fee={value.fee}
              onClear={handleClear}
            />
          </div>
        ) : value.specialization && !value.fee ? (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="font-medium">Almost there!</span> Pick a sub-specialization to complete your selection.
          </p>
        ) : null}
      </FormField>

      {/* ── Years of experience ─────────────────────────────────────────────── */}
      <FormField label="Years of experience">
        <div className="relative max-w-[160px]">
          <Input
            type="number"
            value={data.years_of_experience ?? ""}
            onChange={(e) =>
              onChange({ ...data, years_of_experience: +e.target.value })
            }
            placeholder="10"
            min={0}
            max={60}
            className="border-border focus-visible:ring-primary text-xs h-9 pl-3 pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
            yrs
          </span>
        </div>
      </FormField>
    </div>
  );
});
