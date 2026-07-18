import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import rawCountryCodes from "@/lib/CountryCodes.json";

export interface CountryCodeOption {
  name: string;
  dial_code: string;
  code: string;
}

const COUNTRIES = (rawCountryCodes as CountryCodeOption[]).map((c) => ({
  ...c,
  dial_code: c.dial_code.replace(/\s+/g, ""),
}));

/** Regional-indicator flag emoji from a 2-letter ISO country code. */
function flagEmoji(isoCode: string): string {
  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function findByDialCode(dialCode: string): CountryCodeOption | undefined {
  const normalized = String(dialCode ?? "").replace(/\s+/g, "");
  return COUNTRIES.find((c) => c.dial_code === normalized);
}

interface CountryCodeSelectProps {
  value: string;
  onChange: (dialCode: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CountryCodeSelect({ value, onChange, className, disabled }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => findByDialCode(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between gap-1 px-2 font-medium", className)}
        >
          <span className="flex items-center gap-1 truncate">
            {selected && <span>{flagEmoji(selected.code)}</span>}
            <span>{value || "+250"}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country or code..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.dial_code}`}
                  onSelect={() => {
                    onChange(country.dial_code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      selected?.code === country.code ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2">{flagEmoji(country.code)}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{country.dial_code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
