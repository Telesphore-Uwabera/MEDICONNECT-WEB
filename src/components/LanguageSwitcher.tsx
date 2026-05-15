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
  {
    code: "en",
    label: "English",
    short: "ENG",
    flag: "https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg",
  },
  {
    code: "fr",
    label: "Français",
    short: "FRE",
    flag: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/960px-Flag_of_France.svg.png",
  },
  {
    code: "rw",
    label: "Kinyarwanda",
    short: "KINY",
    flag: "https://upload.wikimedia.org/wikipedia/commons/1/17/Flag_of_Rwanda.svg",
  },
] as const;

const FlagCircle = ({ flag, label, className }: { flag: string; label: string; className?: string }) => (
  <span
    className={cn(
      "rounded-full overflow-hidden w-5 h-5 inline-flex items-center justify-center shrink-0 border-2 border-border",
      className
    )}
  >
    <img
      src={flag}
      alt={label}
      className="w-full h-full object-cover"
    />
  </span>
);

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
          <FlagCircle flag={current.flag} label={current.label} />
          {!compact && <span className="text-xs font-semibold">{current.short}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className={cn("cursor-pointer gap-2", current.code === l.code && "bg-primary-soft text-primary")}
          >
            <FlagCircle flag={l.flag} label={l.label} />
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};