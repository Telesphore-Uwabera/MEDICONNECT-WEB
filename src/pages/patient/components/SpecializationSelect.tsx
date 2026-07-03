// SpecializationSelect.tsx

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
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
  className
}: {
  value: SpecializationValue;
  onChange: (v: SpecializationValue) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

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

  // Recalculate dropdown position whenever it opens or window resizes/scrolls
  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

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
      const target = e.target as Node;
      const dropdown = document.getElementById("spec-select-portal");
      if (
        !containerRef.current?.contains(target) &&
        !dropdown?.contains(target)
      ) {
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
          "w-full px-2.5 py-1.5   outline-none shadow-sm  text-xs bg-background border rounded-[6px] flex items-center justify-between gap-1.5 transition-all",
          open
            ? "border-primary dark:border-border ring-2 ring-primary/20"
            : "border-primary dark:border-border hover:border-primary/80 dark:hover:border-border/80",
          triggerLabel ? "text-foreground" : "text-muted-foreground/40",
          className
        )}
      >
        <span className="truncate">{triggerLabel ?? t("common.specSelect.anySpecializationPlaceholder")}</span>
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

      {/* Dropdown — rendered via portal to escape any overflow:hidden ancestor */}
      {open && createPortal(
        <div
          id="spec-select-portal"
          style={dropdownStyle}
          className="bg-card border border-border/60 rounded-[6px] shadow-xl overflow-hidden"
        >
          {/* Back header on fee step */}
          {step === "fee" && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/60 bg-secondary/20">
              <button
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
              </button>
              <span className="text-xs font-semibold text-foreground truncate">
                {value.specialization?.name}
              </span>
              <span className="text-xs text-muted-foreground/60 ml-auto">
                {t("common.specSelect.selectSubSpecialization")}
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
                  ? t("common.specSelect.searchSpecializationsPlaceholder")
                  : t("common.specSelect.searchSubSpecializationsPlaceholder")
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/40"
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
                      "w-full px-2.5 py-1.5 text-left text-xs transition-colors",
                      !value.specialization
                        ? "text-primary font-medium bg-primary/5"
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    )}
                  >
                    {t("common.specSelect.anySpecialization")}
                  </button>
                )}

                {loadingSpecializations ? (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted-foreground/60">
                    <Loader2 className="w-3 h-3 animate-spin" /> {t("common.loading")}
                  </div>
                ) : errorSpecializations ? (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-destructive/70">
                    <AlertCircle className="w-3 h-3" /> {t("common.specSelect.failedToLoad")}
                  </div>
                ) : specializations.length === 0 ? (
                  <p className="px-2.5 py-4 text-xs text-muted-foreground/60 text-center">
                    {t("common.specSelect.noResultsFor", { query })}
                  </p>
                ) : (
                  specializations.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() => handleSelectSpecialization(spec)}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors",
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
                  <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted-foreground/60">
                    <Loader2 className="w-3 h-3 animate-spin" /> {t("common.loading")}
                  </div>
                ) : errorFees ? (
                  <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-destructive/70">
                    <AlertCircle className="w-3 h-3" /> {t("common.specSelect.failedToLoad")}
                  </div>
                ) : fees.length === 0 ? (
                  <p className="px-2.5 py-4 text-xs text-muted-foreground/60 text-center">
                    {query ? t("common.specSelect.noResultsFor", { query }) : t("common.specSelect.noSubSpecializations")}
                  </p>
                ) : (
                  fees.map((fee) => (
                    <button
                      key={fee.id}
                      onClick={() => handleSelectFee(fee)}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-left text-xs transition-colors",
                        value.fee?.id === fee.id
                          ? "bg-primary/5"
                          : "hover:bg-secondary/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("font-medium", value.fee?.id === fee.id ? "text-primary" : "text-foreground")}>
                          {fee.sub_specialization}
                        </span>
                        <span className="text-xs text-muted-foreground/60 flex-shrink-0 bg-secondary/50 px-1.5 py-0.5 rounded-[6px]">
                          {fee.tier_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground/60">
                        <span>{t("common.specSelect.onlineFee", { amount: Number(fee.online_fee).toLocaleString(), currency: fee.currency })}</span>
                        <span>{t("common.specSelect.inPersonFee", { amount: Number(fee.in_person_fee).toLocaleString(), currency: fee.currency })}</span>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
