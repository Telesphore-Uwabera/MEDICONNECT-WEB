// ─────────────────────────────────────────────────────────────────────────────
// SpecializationsStep — Modern Split-Panel Selection
// Two-column layout: Specializations (left) → Sub-specializations (right)
// Inline summary chip with animated selection confirmation
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  useGetSpecializationSubTypes,
  type Specialization,
  type SpecializationFee,
} from "@/hooks/use-specialization-select";
import type { SpecializationsInfo } from "./Types";

interface SpecializationsStepProps {
  data: SpecializationsInfo;
  onChange: (v: SpecializationsInfo) => void;
}

// Sentinel id for the synthetic "Other" sub-specialization. Selecting it saves
// a null specialization_fee_id (no fee tier) while keeping the chosen
// specialization (General Practitioner / Specialist) as `primary`.
const OTHER_FEE_ID = -1;

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
  const { t } = useTranslation();
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

          {fee.id === OTHER_FEE_ID && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("doctorProfile.other_fee_note")}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-[6px] p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label={t("doctorProfile.clear_selection")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Specialist sub-types (multi-select under a sub-specialization) ───────── */
function SubTypePicker({
  slug,
  selectedIds,
  onToggle,
}: {
  slug: string;
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetSpecializationSubTypes(slug);
  const subTypes = data?.sub_types ?? [];

  return (
    // Stop clicks here from bubbling to the parent row (which would re-toggle
    // the sub-specialization selection).
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 rounded-[6px] border border-border/60 bg-muted/20 p-2"
    >
      <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("doctorProfile.sub_specialties_pick")}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("doctorProfile.loading")}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {t("doctorProfile.couldnt_load_subspecialties")}
        </div>
      ) : subTypes.length === 0 ? (
        <p className="px-1 py-2 text-[11px] text-muted-foreground">
          {t("doctorProfile.no_subspecialties_available")}
        </p>
      ) : (
        <div className="space-y-0.5">
          {subTypes.map((st) => {
            const checked = selectedIds.includes(st.id);
            return (
              <label
                key={st.id}
                className={cn(
                  "flex items-center gap-2 rounded-[5px] px-2 py-1.5 cursor-pointer transition-colors",
                  checked ? "bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(st.id)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                <span className="flex-1 text-[11px] font-medium text-foreground">
                  {st.name}
                </span>
                {st.requires_approval && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                    {t("doctorProfile.needs_approval")}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const SpecializationsStep = React.memo(function SpecializationsStep({
  data,
  onChange,
}: SpecializationsStepProps) {
  const { t } = useTranslation();
  const [specQuery, setSpecQuery] = useState("");
  const [feeQuery, setFeeQuery] = useState("");
  const [highlightedSpec, setHighlightedSpec] = useState<number>(-1);
  const [highlightedFee, setHighlightedFee] = useState<number>(-1);
  // Specialist-only: ids of the selected sub-types under the chosen
  // sub-specialization (e.g. under Cardiology).
  const [subTypeIds, setSubTypeIds] = useState<number[]>([]);

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
    selectSpecialization,
    selectFee,
    clear,
  } = useSpecializationSelect();

  // Sub-types only apply to "Specialist" (not General Practitioner).
  const isSpecialist = (value.specialization?.name ?? "")
    .toLowerCase()
    .includes("specialist");

  // Synthetic "Other" sub-specialization (General Practitioner / Specialist).
  // Selecting it saves specialization_fee_id: null + sub_specialization: "other".
  const otherFee: SpecializationFee = {
    id: OTHER_FEE_ID,
    specialization_id: value.specialization?.id ?? 0,
    sub_specialization: t("doctorProfile.other_label"),
    sub_specialization_fr: "Autre",
    sub_specialization_kiny: null,
    tier_name: "Custom",
    slug: "other",
    online_fee: "0",
    in_person_fee: "0",
    currency: fees[0]?.currency ?? "RWF",
  };

  // Pre-select the previously saved choice when opening the editor, by matching
  // the saved name/id against the freshly fetched dropdown lists. Runs once.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!data.primary) {
      seededRef.current = true;
      return;
    }
    // 1) specialization — match by name
    if (!value.specialization) {
      if (specializations.length) {
        const spec = specializations.find(
          (s) => s.name.trim().toLowerCase() === data.primary.trim().toLowerCase(),
        );
        if (spec) selectSpecialization(spec);
        else seededRef.current = true; // saved spec not in the list
      }
      return;
    }
    // 2a) "Other" was saved
    if (data.sub_specialization === "other" && !value.fee) {
      selectFee(otherFee);
      seededRef.current = true;
      return;
    }
    // 2b) real sub-specialization — match by id, then restore its sub-types
    if (data.specialization_fee_id != null && !value.fee) {
      if (fees.length) {
        const fee = fees.find((f) => f.id === data.specialization_fee_id);
        if (fee) {
          selectFee(fee);
          setSubTypeIds((data.sub_specializations ?? []).map((x) => x.id));
        }
        seededRef.current = true; // fees loaded — done either way
      }
      return;
    }
    seededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data.primary,
    data.sub_specialization,
    data.specialization_fee_id,
    specializations,
    fees,
    value.specialization,
    value.fee,
  ]);

  // Push the selection up to the parent — but ONLY after the user actually
  // changes something. This avoids blanking the saved data on mount (which was
  // hiding the saved selection when re-opening the editor) and avoids fighting
  // the seeding effect above. "Other" saves a null fee id.
  const interactedRef = useRef(false);
  useEffect(() => {
    if (!interactedRef.current) return;
    const isOther = value.fee?.id === OTHER_FEE_ID;
    const subList =
      isSpecialist && value.fee && !isOther
        ? subTypeIds.map((id) => ({ id }))
        : [];
    onChange({
      primary: value.specialization?.name ?? "",
      specialization_fee_id: isOther ? null : (value.fee?.id ?? null),
      sub_specialization: isOther ? "other" : null,
      sub_specializations: subList,
      years_of_experience: data.years_of_experience,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.specialization?.id, value.fee?.id, subTypeIds]);

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
  // Real sub-specialization fees (filtered by the fee search). The synthetic
  // "Other" is NOT mixed into this list — it's pinned separately below the
  // scroll area so it's always visible, never buried under a long fee list.
  const filteredFees = fees.filter((f) =>
    f.sub_specialization.toLowerCase().includes(feeQuery.toLowerCase())
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectSpec = useCallback(
    (spec: Specialization) => {
      interactedRef.current = true;
      selectSpecialization(spec);
      setHighlightedSpec(-1);
      setFeeQuery(""); // reset fee search on new spec
      setSubTypeIds([]); // new specialization → drop any picked sub-types
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
      interactedRef.current = true;
      selectFee(fee);
      setHighlightedFee(-1);
      setSubTypeIds([]); // new sub-specialization → reset its sub-types
    },
    [selectFee]
  );

  const toggleSubType = useCallback((id: number) => {
    interactedRef.current = true;
    setSubTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleClear = useCallback(() => {
    interactedRef.current = true;
    clear();
    setSpecQuery("");
    setFeeQuery("");
    setHighlightedSpec(-1);
    setHighlightedFee(-1);
    setSubTypeIds([]);
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
          ? t(type === "spec" ? "doctorProfile.no_match_specializations" : "doctorProfile.no_match_subspecializations", { query })
          : type === "spec"
            ? t("doctorProfile.start_typing_search")
            : value.specialization
              ? t("doctorProfile.no_subspecializations_available")
              : t("doctorProfile.select_specialization_first")}
      </p>
    </div>
  );

  const renderError = () => (
    <div className="flex items-center gap-2 px-3 py-4 text-xs text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {t("doctorProfile.failed_to_load_retry")}
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {t("doctorProfile.loading")}
    </div>
  );

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Split-Panel Selection ─────────────────────────────────────────── */}
      <FormField label={`${t("doctorProfile.spec_sub_label")} *`}>
        <div className="rounded-[6px] border border-border bg-card shadow-sm overflow-hidden">

          {/* Panel Header */}
          <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>{t("doctorProfile.step1_specialization")}</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              value.specialization ? "text-primary" : "text-muted-foreground/50"
            )}>
              <Layers className="h-3.5 w-3.5" />
              <span>{t("doctorProfile.step2_subspecialization")}</span>
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
                    placeholder={t("doctorProfile.search_specializations_placeholder")}
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
                      ? t("doctorProfile.search_in", { name: value.specialization.name })
                      : t("doctorProfile.select_specialization_first_placeholder")}
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
                    <p className="text-xs">{t("doctorProfile.select_specialization_to_see_options")}</p>
                  </div>
                ) : loadingFees ? renderLoading() :
                    filteredFees.length === 0 ? (
                      feeQuery ? (
                        renderEmpty(feeQuery, "fee")
                      ) : (
                        <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                          {t("doctorProfile.no_preset_subspecializations")}
                        </div>
                      )
                    ) : (
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
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground">
                                    {fee.tier_name}
                                  </span>
                                </div>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                )}
                              </div>

                              {/* Specialist only: pick sub-types under this
                                  sub-specialization once it's selected. */}
                              {isSelected && isSpecialist && (
                                <SubTypePicker
                                  slug={fee.slug}
                                  selectedIds={subTypeIds}
                                  onToggle={toggleSubType}
                                />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
              </div>

              {/* PINNED "Other" — always visible once a specialization is chosen,
                  so it's never buried below a long fee list or hidden on a fetch
                  error. Saves specialization_fee_id: null + sub_specialization: "other". */}
              {value.specialization && (
                <button
                  type="button"
                  onClick={() => handleSelectFee(otherFee)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 border-t border-border px-3 py-3 text-left transition-colors",
                    value.fee?.id === OTHER_FEE_ID
                      ? "bg-primary/8 border-l-2 border-l-primary"
                      : "border-l-2 border-l-transparent hover:bg-muted/50",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{t("doctorProfile.other_label")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("doctorProfile.not_listed_note")}
                    </p>
                  </div>
                  {value.fee?.id === OTHER_FEE_ID ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                </button>
              )}
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
            <span className="font-medium">{t("doctorProfile.almost_there")}</span> {t("doctorProfile.pick_subspecialization_note")}
          </p>
        ) : null}
      </FormField>

      {/* ── Years of experience ─────────────────────────────────────────────── */}
      <FormField label={t("doctorProfile.years_of_experience")}>
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
            {t("doctorProfile.yrs_suffix")}
          </span>
        </div>
      </FormField>
    </div>
  );
});
