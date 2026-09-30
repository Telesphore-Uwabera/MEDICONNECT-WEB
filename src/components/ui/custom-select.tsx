/**
 * CustomSelect — site-styled dropdown to replace bare <select> elements.
 * Matches the SpecializationSelect aesthetic:
 *  - Custom button trigger with border-primary focus ring
 *  - Portal dropdown rendered via createPortal (escapes overflow:hidden)
 *  - Hover/selected states using primary / secondary tokens
 *  - Keyboard navigation: ArrowUp/Down, Enter, Space, Escape
 */

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional icon element or component rendered before the label */
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
}

function renderSelectIcon(
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>,
) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (
    typeof icon === "function" ||
    (typeof icon === "object" && icon !== null && "$$typeof" in icon)
  ) {
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="h-3.5 w-3.5" />;
  }
  return icon as React.ReactNode;
}

export interface CustomSelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible label forwarded to aria-label */
  label?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  /** compact = h-9 + bolder font, for meta / toolbar use */
  compact?: boolean;
  id?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  options,
  onChange,
  label,
  disabled = false,
  className,
  triggerClassName,
  dropdownClassName,
  compact = false,
  id,
}: CustomSelectProps<T>) {
  const uid = useId();
  const triggerId = id ?? uid;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? label ?? "Select…";

  const calcPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const goUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    setDropStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 160),
      zIndex: 9999,
      ...(goUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (open) calcPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => calcPosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!containerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((p) => !p);
    }
    if (e.key === "Escape") setOpen(false);
    if (open && e.key === "ArrowDown") {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const next = options[Math.min(idx + 1, options.length - 1)];
      if (next) onChange(next.value);
    }
    if (open && e.key === "ArrowUp") {
      e.preventDefault();
      const idx = options.findIndex((o) => o.value === value);
      const prev = options[Math.max(idx - 1, 0)];
      if (prev) onChange(prev.value);
    }
  };

  const handleSelect = (v: T) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between gap-1.5 px-2.5 rounded-[6px] border outline-none cursor-pointer transition-all duration-150 select-none",
          compact ? "h-9 text-[12px] font-semibold bg-secondary/70 shadow-sm" : "h-8 text-[11px] bg-background",
          "text-foreground",
          open
            ? "border-primary ring-2 ring-primary/20 shadow-sm"
            : "border-border/60 hover:border-primary/50",
          disabled && "pointer-events-none opacity-50 cursor-not-allowed",
          triggerClassName,
        )}
      >
        <span className="truncate flex items-center gap-1.5 min-w-0">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-muted-foreground/70">
              {renderSelectIcon(selectedOption.icon)}
            </span>
          )}
          <span className={cn("truncate", selectedOption ? "text-foreground" : "text-muted-foreground/50")}>
            {displayLabel}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50 transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {/* Dropdown — portal to escape any overflow:hidden ancestor */}
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            aria-label={label}
            style={dropStyle}
            className={cn(
              "bg-card border border-border/60 rounded-[6px] shadow-xl overflow-hidden",
              dropdownClassName,
            )}
          >
            <div className="max-h-56 overflow-y-auto py-0.5">
              {options.map((opt) => {
                const isSel = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors duration-100",
                      isSel
                        ? "text-primary font-semibold bg-primary/5"
                        : "text-foreground hover:bg-secondary/40 hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-1.5 truncate min-w-0">
                      {opt.icon && (
                        <span className="flex-shrink-0 text-muted-foreground/60">
                          {renderSelectIcon(opt.icon)}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSel && <Check className="h-3 w-3 flex-shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
