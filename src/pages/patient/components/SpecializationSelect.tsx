// SpecializationSelect.tsx

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X, Search, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import {
  useSpecializationSelect,
  type SpecializationValue,
} from "@/hooks/use-specialization-select";

export type { SpecializationValue };

export function SpecializationSelect({
  value,
  onChange,
}: {
  value: SpecializationValue;
  onChange: (v: SpecializationValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    step,
    query,
    setQuery,
    specializations,
    loadingSpecializations,
    errorSpecializations,
    fees,
    loadingFees,
    errorFees,
    selectSpecialization,
    selectFee,
    clear,
    backToSpecialization,
    openDropdown,
    resetQuery,
    triggerLabel,
  } = useSpecializationSelect();

  // Sync internal hook value → parent onChange
  // (hook owns local state; parent gets notified on each selection)
  // If you need controlled behaviour (parent drives value), lift
  // value/setValue out of the hook and pass them as props instead.

  const handleOpen = () => {
    openDropdown(!!value.specialization);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectSpecialization = (spec: Parameters<typeof selectSpecialization>[0]) => {
    selectSpecialization(spec);
    onChange({ specialization: spec, fee: null });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectFee = (fee: Parameters<typeof selectFee>[0]) => {
    selectFee(fee);
    onChange({ specialization: value.specialization, fee });
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clear();
    onChange({ specialization: null, fee: null });
    setOpen(false);
  };

  const handleBack = () => {
    backToSpecialization();
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        resetQuery();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [resetQuery]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className={cn(
          "w-full px-2.5 py-1.5 text-[11px] bg-background border rounded-sm flex items-center justify-between gap-1.5 transition-all",
          open
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-border/60 hover:border-primary/40",
          triggerLabel ? "text-foreground" : "text-muted-foreground/40"
        )}
      >
        <span className="truncate">{triggerLabel ?? "Any specialization…"}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {triggerLabel && (
            <span
              role="button"
              onClick={handleClear}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronRight
            className={cn(
              "w-3 h-3 text-muted-foreground/50 transition-transform duration-200",
              open && "rotate-90"
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border/60 rounded-sm shadow-lg overflow-hidden">
          {/* Back header on fee step */}
          {step === "fee" && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/60 bg-secondary/20">
              <button
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
              </button>
              <span className="text-[10px] font-semibold text-foreground truncate">
                {value.specialization?.name}
              </span>
              <span className="text-[9px] text-muted-foreground/60 ml-auto">
                Select sub-specialization
              </span>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/60">
            <Search className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={
                step === "specialization"
                  ? "Search specializations…"
                  : "Search sub-specializations…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {step === "specialization" ? (
              <>
                {!query && (
                  <button
                    onClick={() => { onChange({ specialization: null, fee: null }); clear(); setOpen(false); }}
                    className={cn(
                      "w-full px-2.5 py-1.5 text-left text-[11px] transition-colors",
                      !value.specialization
                        ? "text-primary font-medium bg-primary/5"
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    )}
                  >
                    Any specialization
                  </button>
                )}

                {loadingSpecializations ? (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-muted-foreground/60">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </div>
                ) : errorSpecializations ? (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-destructive/70">
                    <AlertCircle className="w-3 h-3" /> Failed to load
                  </div>
                ) : specializations.length === 0 ? (
                  <p className="px-2.5 py-4 text-[11px] text-muted-foreground/60 text-center">
                    No results for "{query}"
                  </p>
                ) : (
                  specializations.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() => handleSelectSpecialization(spec)}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-left text-[11px] flex items-center justify-between transition-colors",
                        value.specialization?.id === spec.id
                          ? "text-primary font-medium bg-primary/5"
                          : "text-foreground hover:bg-secondary/40"
                      )}
                    >
                      <span>{spec.name}</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    </button>
                  ))
                )}
              </>
            ) : (
              <>
                {loadingFees ? (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-muted-foreground/60">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </div>
                ) : errorFees ? (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-destructive/70">
                    <AlertCircle className="w-3 h-3" /> Failed to load
                  </div>
                ) : fees.length === 0 ? (
                  <p className="px-2.5 py-4 text-[11px] text-muted-foreground/60 text-center">
                    {query ? `No results for "${query}"` : "No sub-specializations available"}
                  </p>
                ) : (
                  fees.map((fee) => (
                    <button
                      key={fee.id}
                      onClick={() => handleSelectFee(fee)}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-left text-[11px] transition-colors",
                        value.fee?.id === fee.id
                          ? "bg-primary/5"
                          : "hover:bg-secondary/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("font-medium", value.fee?.id === fee.id ? "text-primary" : "text-foreground")}>
                          {fee.sub_specialization}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 bg-secondary/50 px-1.5 py-0.5 rounded-sm">
                          {fee.tier_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground/60">
                        <span>Online: {Number(fee.online_fee).toLocaleString()} {fee.currency}</span>
                        <span>In-person: {Number(fee.in_person_fee).toLocaleString()} {fee.currency}</span>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
