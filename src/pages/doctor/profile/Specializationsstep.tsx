// // ─────────────────────────────────────────────────────────────────────────────
// // SpecializationsStep
// // ─────────────────────────────────────────────────────────────────────────────
// import React, { useState, useCallback, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { cn } from "@/lib/utils";
// import { Check, ChevronRight, Plus, X } from "lucide-react";
// import { SPECIALIZATION_MAP, PRIMARY_SPECIALIZATIONS } from "./Constants";
// import { FormField } from "./UiPrimitives";
// import type { SpecializationsInfo } from "./Types";

// interface SpecializationsStepProps {
//   data: SpecializationsInfo;
//   onChange: (v: SpecializationsInfo) => void;
// }

// export const SpecializationsStep = React.memo(function SpecializationsStep({
//   data,
//   onChange,
// }: SpecializationsStepProps) {
//   const [tagInput, setTagInput] = useState("");

//   const subspecialties = useMemo(
//     () => (data.primary ? (SPECIALIZATION_MAP[data.primary] ?? []) : []),
//     [data.primary],
//   );

//   const handlePrimaryChange = useCallback(
//     (value: string) => {
//       const validSubs = SPECIALIZATION_MAP[value] ?? [];
//       onChange({
//         ...data,
//         primary: value,
//         secondary: data.secondary.filter((s) => validSubs.includes(s)),
//       });
//     },
//     [data, onChange],
//   );

//   const toggleSecondary = useCallback(
//     (spec: string) => {
//       onChange({
//         ...data,
//         secondary: data.secondary.includes(spec)
//           ? data.secondary.filter((s) => s !== spec)
//           : [...data.secondary, spec],
//       });
//     },
//     [data, onChange],
//   );

//   const addTag = useCallback(() => {
//     const trimmed = tagInput.trim();
//     if (!trimmed || data.custom_tags?.includes(trimmed)) return;
//     onChange({ ...data, custom_tags: [...(data.custom_tags ?? []), trimmed] });
//     setTagInput("");
//   }, [tagInput, data, onChange]);

//   const removeTag = useCallback(
//     (tag: string) => {
//       onChange({
//         ...data,
//         custom_tags: (data.custom_tags ?? []).filter((t) => t !== tag),
//       });
//     },
//     [data, onChange],
//   );

//   return (
//     <div className="space-y-6">
//       {/* Primary */}
//       <FormField label="Primary specialization *">
//         <Select value={data.primary ?? ""} onValueChange={handlePrimaryChange}>
//           <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
//             <SelectValue placeholder="Select primary specialization" />
//           </SelectTrigger>
//           <SelectContent className="max-h-72">
//             {PRIMARY_SPECIALIZATIONS.map((s) => (
//               <SelectItem key={s} value={s} className="text-xs">
//                 {s}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </FormField>

//       {/* Subspecialties panel */}
//       {data.primary && (
//         <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-4">
//           <div className="flex items-center gap-2 mb-1">
//             <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
//             <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
//               {subspecialties.length > 0
//                 ? `Subspecialties of ${data.primary}`
//                 : `No registered subspecialties for ${data.primary}`}
//             </span>
//             {data.secondary.length > 0 && (
//               <span className="ml-auto text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/15 text-primary">
//                 {data.secondary.length} selected
//               </span>
//             )}
//           </div>

//           {subspecialties.length > 0 ? (
//             <div className="flex flex-wrap gap-1.5">
//               {subspecialties.map((spec) => {
//                 const selected = data.secondary.includes(spec);
//                 return (
//                   <button
//                     key={spec}
//                     type="button"
//                     onClick={() => toggleSecondary(spec)}
//                     className={cn(
//                       "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 font-medium cursor-pointer select-none",
//                       selected
//                         ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
//                         : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/60",
//                     )}
//                   >
//                     {selected && <Check className="h-2.5 w-2.5 shrink-0" />}
//                     {spec}
//                   </button>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="text-[11px] text-muted-foreground italic">
//               You can add custom tags below to describe your subspecialties.
//             </p>
//           )}

//           {data.secondary.length > 0 && (
//             <div className="mt-3 pt-3 border-t border-border/60">
//               <p className="text-[10px] text-muted-foreground mb-1.5">
//                 Selected subspecialties:
//               </p>
//               <div className="flex flex-wrap gap-1">
//                 {data.secondary.map((s) => (
//                   <span
//                     key={s}
//                     className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
//                   >
//                     {s}
//                     <button
//                       type="button"
//                       onClick={() => toggleSecondary(s)}
//                       className="hover:text-destructive transition-colors"
//                     >
//                       <X className="h-2.5 w-2.5" />
//                     </button>
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Years of experience */}
//       <FormField label="Years of experience">
//         <Input
//           type="number"
//           value={data.years_of_experience ?? ""}
//           onChange={(e) =>
//             onChange({ ...data, years_of_experience: +e.target.value })
//           }
//           placeholder="10"
//           min={0}
//           max={60}
//           className="border-border focus-visible:ring-primary text-xs h-9 w-full sm:w-40"
//         />
//       </FormField>

//       {/* Subspecialties free-text */}
//       <FormField label="Subspecialties / areas of focus (free text)">
//         <Input
//           value={data.subspecialties ?? ""}
//           onChange={(e) =>
//             onChange({ ...data, subspecialties: e.target.value })
//           }
//           placeholder="e.g. Pediatric cardiology, rare coagulopathies"
//           className="border-border focus-visible:ring-primary text-xs h-9"
//         />
//       </FormField>

//       {/* Custom tags */}
//       <div className="space-y-2">
//         <Label className="text-[10px] text-muted-foreground">Custom tags</Label>
//         <div className="flex gap-2">
//           <Input
//             value={tagInput}
//             onChange={(e) => setTagInput(e.target.value)}
//             onKeyDown={(e) => {
//               if (e.key === "Enter") {
//                 e.preventDefault();
//                 addTag();
//               }
//             }}
//             placeholder="Type a tag and press Enter"
//             className="border-border focus-visible:ring-primary text-xs h-9 flex-1"
//           />
//           <Button
//             type="button"
//             variant="outline"
//             onClick={addTag}
//             className="text-xs h-9 px-3 border-border"
//           >
//             <Plus className="h-3.5 w-3.5" />
//           </Button>
//         </div>
//         {(data.custom_tags ?? []).length > 0 && (
//           <div className="flex flex-wrap gap-1.5 pt-1">
//             {(data.custom_tags ?? []).map((tag) => (
//               <span
//                 key={tag}
//                 className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20"
//               >
//                 {tag}
//                 <button
//                   type="button"
//                   onClick={() => removeTag(tag)}
//                   className="hover:text-destructive transition-colors"
//                 >
//                   <X className="h-2.5 w-2.5" />
//                 </button>
//               </span>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// });



// ─────────────────────────────────────────────────────────────────────────────
// SpecializationsStep
// Primary: search-and-select combobox
// Secondary: toggle chips based on primary's subspecialties
// Years of experience: number input
// Removed: custom_tags, subspecialties free-text
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { SPECIALIZATION_MAP, PRIMARY_SPECIALIZATIONS } from "./Constants";
import { FormField } from "./UiPrimitives";
import type { SpecializationsInfo } from "./Types";

interface SpecializationsStepProps {
  data: SpecializationsInfo;
  onChange: (v: SpecializationsInfo) => void;
}

export const SpecializationsStep = React.memo(function SpecializationsStep({
  data,
  onChange,
}: SpecializationsStepProps) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const comboRef              = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const listRef               = useRef<HTMLUListElement>(null);
  const [highlighted, setHighlighted] = useState<number>(-1);

  // Filtered list based on search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRIMARY_SPECIALIZATIONS;
    return PRIMARY_SPECIALIZATIONS.filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  // Subspecialties driven by the selected primary
  const subspecialties = useMemo(
    () => (data.primary ? SPECIALIZATION_MAP[data.primary] ?? [] : []),
    [data.primary],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setHighlighted(-1);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => { setHighlighted(-1); }, [filtered]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const selectPrimary = useCallback(
    (value: string) => {
      const validSubs = SPECIALIZATION_MAP[value] ?? [];
      onChange({
        ...data,
        primary: value,
        secondary: data.secondary.filter((s) => validSubs.includes(s)),
      });
      setOpen(false);
      setQuery("");
      setHighlighted(-1);
    },
    [data, onChange],
  );

  const clearPrimary = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange({ ...data, primary: "", secondary: [] });
      setQuery("");
      setOpen(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [data, onChange],
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  }, []);

  const handleInputFocus = useCallback(() => {
    setOpen(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) { setOpen(true); return; }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlighted((h) => Math.max(h - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlighted >= 0 && filtered[highlighted]) {
            selectPrimary(filtered[highlighted]);
          }
          break;
        case "Escape":
          setOpen(false);
          setQuery("");
          setHighlighted(-1);
          break;
      }
    },
    [open, filtered, highlighted, selectPrimary],
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

  // Display value in the input: if a primary is selected and not actively searching, show it
  const displayValue = open ? query : (data.primary || query);

  return (
    <div className="space-y-6">
      {/* ── Primary: search-and-select combobox ───────────────────────── */}
      <FormField label="Primary specialization *">
        <div ref={comboRef} className="relative">
          {/* Input trigger */}
          <div className={cn(
            "flex items-center gap-2 h-9 rounded-md border bg-background px-3 transition-colors",
            open
              ? "border-primary ring-1 ring-primary/30"
              : "border-border hover:border-border/80",
          )}>
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              value={displayValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder="Search specialization…"
              className={cn(
                "flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground min-w-0",
                data.primary && !open ? "font-medium text-foreground" : "text-foreground",
              )}
            />
            {data.primary && (
              <button
                type="button"
                onClick={clearPrimary}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-0.5 rounded"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown list */}
          {open && (
            <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
              {filtered.length === 0 ? (
                <p className="py-3 px-3 text-[11px] text-muted-foreground text-center">
                  No specializations match "{query}"
                </p>
              ) : (
                <ul
                  ref={listRef}
                  role="listbox"
                  className="max-h-60 overflow-y-auto py-1"
                >
                  {filtered.map((spec, i) => {
                    const isSelected    = data.primary === spec;
                    const isHighlighted = highlighted === i;
                    return (
                      <li
                        key={spec}
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => { e.preventDefault(); selectPrimary(spec); }}
                        onMouseEnter={() => setHighlighted(i)}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer select-none transition-colors",
                          isHighlighted && "bg-accent text-accent-foreground",
                          isSelected && !isHighlighted && "bg-primary/8 text-primary",
                          !isHighlighted && !isSelected && "text-foreground",
                        )}
                      >
                        <span>{spec}</span>
                        {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </FormField>

      {/* ── Subspecialties toggle chips ────────────────────────────────── */}
      {data.primary && (
        <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {subspecialties.length > 0
                ? `Subspecialties of ${data.primary}`
                : `No subspecialties for ${data.primary}`}
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
              This specialization has no registered subspecialties.
            </p>
          )}

          {/* Selected summary strip */}
          {data.secondary.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground mb-1.5">Selected:</p>
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

      {/* ── Years of experience ────────────────────────────────────────── */}
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
    </div>
  );
});

