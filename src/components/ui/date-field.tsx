import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseIsoDate(value?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDisplay(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export interface DateFieldProps {
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onValueChange?: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  placeholder?: string;
}

export function DateField({
  value = "",
  onChange,
  onBlur,
  onValueChange,
  min,
  max,
  disabled,
  className,
  id,
  name,
  placeholder = "dd/mm/yyyy",
}: DateFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  const emit = (next: string) => {
    onValueChange?.(next);
    const event = {
      target: { value: next, name: name ?? "" },
      currentTarget: { value: next, name: name ?? "" },
    } as ChangeEvent<HTMLInputElement>;
    onChange?.(event);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          name={name}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-[6px] border bg-background px-3 text-left text-xs outline-none transition-all",
            open
              ? "border-primary ring-2 ring-primary/20"
              : "border-border/60 hover:border-primary/50",
            selected ? "text-foreground" : "text-muted-foreground/50",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <span className="truncate">{selected ? formatDisplay(selected) : placeholder}</span>
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[9999] w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            emit(date ? toIsoDate(date) : "");
            if (date) setOpen(false);
          }}
          disabled={(date) => {
            const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            if (minDate && day < minDate) return true;
            if (maxDate && day > maxDate) return true;
            return false;
          }}
          weekStartsOn={1}
          fromDate={minDate}
          toDate={maxDate}
          initialFocus
        />
        <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              emit("");
              setOpen(false);
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("consult.notes.clear", { defaultValue: "Clear" })}
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              if ((minDate && day < minDate) || (maxDate && day > maxDate)) return;
              emit(toIsoDate(today));
              setOpen(false);
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("common.notifications.today", { defaultValue: "Today" })}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
