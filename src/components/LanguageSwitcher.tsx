import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LANGS = [
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "rw", label: "Kinyarwanda", short: "RW" },
] as const;

export const LanguageSwitcher = ({
  variant = "ghost",
  compact = false,
}: {
  variant?: "ghost" | "outline";
  compact?: boolean;
}) => {
  const { i18n, t } = useTranslation();
  const current = LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5" aria-label={t("common.language")}>
          <Languages className="h-4 w-4" />
          {!compact && <span className="text-xs font-semibold">{current.short}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className={cn("cursor-pointer", current.code === l.code && "bg-primary-soft text-primary")}
          >
            <span className="font-mono text-xs w-7 opacity-60">{l.short}</span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
