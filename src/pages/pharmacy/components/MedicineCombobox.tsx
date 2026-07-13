// components/MedicineCombobox.tsx
import { useState, useRef, useEffect, useMemo, useId } from "react";
import { Search, Check, ChevronDown, X, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

interface Medicine {
  id: number;
  name: string;
  generic_name?: string | null;
  category?: { name: string } | null;
}

interface MedicineComboboxProps {
  medicines: Medicine[];
  value: number;           // medicine_id (0 = none)
  onChange: (id: number) => void;
  disabled?: boolean;
}

export function MedicineCombobox({
  medicines,
  value,
  onChange,
  disabled,
}: MedicineComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = medicines.find((m) => m.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return medicines;
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.generic_name ?? "").toLowerCase().includes(q) ||
        (m.category?.name ?? "").toLowerCase().includes(q),
    );
  }, [medicines, query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIdx(-1);
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const selectMed = (med: Medicine) => {
    onChange(med.id);
    setOpen(false);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && focusedIdx >= 0 && filtered[focusedIdx]) {
      e.preventDefault();
      selectMed(filtered[focusedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIdx < 0) return;
    listRef.current?.querySelectorAll("[data-item]")[focusedIdx]?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

  return (
    <div ref={wrapRef} className="relative">
      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className={cn(
          "w-full flex items-center gap-2 h-8 px-2.5 rounded-[6px] border transition-all duration-200 text-left",
          "bg-background text-[11px] text-foreground",
          open
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-border/60 hover:border-primary/40",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <Pill className="w-3 h-3 text-muted-foreground/50 shrink-0" />

        {selected ? (
          <span className="flex-1 flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-foreground truncate">
              {selected.name}
            </span>
            {selected.generic_name && (
              <span className="text-muted-foreground/50 truncate hidden sm:inline">
                · {selected.generic_name}
              </span>
            )}
          </span>
        ) : (
          <span className="flex-1 text-muted-foreground/40">
            Select a medicine…
          </span>
        )}

        {selected ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={clearSelection}
            className="p-0.5 rounded-[6px] text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-colors"
            aria-label={t("pages.pharmacy.combo_clear_selection")}
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown
            className={cn(
              "w-3 h-3 text-muted-foreground/50 transition-transform duration-200 shrink-0",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          id={`${id}-list`}
          className={cn(
            "absolute z-50 mt-1 w-full rounded-[6px] border border-border/60",
            "bg-card shadow-lg overflow-hidden",
          )}
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/40">
            <Search className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIdx(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by name or generic…"
              className={cn(
                "flex-1 bg-transparent text-[11px] text-foreground outline-none",
                "placeholder:text-muted-foreground/40",
              )}
              aria-label={t("pages.pharmacy.combo_search_aria")}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setQuery("")}
                className="text-muted-foreground/40 hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-48 overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground/60">
                {t("pages.pharmacy.combo_no_match", { query })}
              </p>
            ) : (
              filtered.map((med, i) => {
                const isSelected = med.id === value;
                const isFocused = i === focusedIdx;
                return (
                  <button
                    key={med.id}
                    data-item
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMed(med);
                    }}
                    onMouseEnter={() => setFocusedIdx(i)}
                    className={cn(
                      "w-full text-left px-2.5 py-2 text-[11px] flex items-center gap-2",
                      "border-b border-border/30 last:border-b-0 transition-colors duration-100",
                      isFocused || isSelected
                        ? "bg-secondary/40"
                        : "hover:bg-secondary/20",
                    )}
                  >
                    {/* Check column */}
                    <span className="w-3.5 shrink-0 flex items-center justify-center">
                      {isSelected && (
                        <Check className="w-3 h-3 text-emerald-500" />
                      )}
                    </span>

                    {/* Name + generic */}
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground block truncate">
                        {med.name}
                      </span>
                      {(med.generic_name || med.category?.name) && (
                        <span className="text-muted-foreground/60 block truncate">
                          {med.generic_name}
                          {med.generic_name && med.category?.name && " · "}
                          {med.category?.name}
                        </span>
                      )}
                    </span>

                    {/* ID */}
                    <span className="text-[10px] text-muted-foreground/40 shrink-0 tabular-nums">
                      #{med.id}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="px-2.5 py-1.5 border-t border-border/40 bg-secondary/10">
              <p className="text-[10px] text-muted-foreground/50">
                {filtered.length} of {medicines.length} medicines
                {query && ` matching "${query}"`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
