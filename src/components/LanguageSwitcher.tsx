import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePublicSettings } from "@/hooks/use-public-settings";

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

const normalizeLanguageCode = (code?: string | null) => {
  if (!code) return null;
  const normalized = code.toLowerCase().split("-")[0];
  if (normalized === "kiny" || normalized === "kinyarwanda") return "rw";
  return normalized;
};

export const LanguageSwitcher = ({
  variant = "ghost",
  compact = false,
}: {
  variant?: "ghost" | "outline";
  compact?: boolean;
}) => {
  const { i18n, t } = useTranslation();
  const { data: publicSettings } = usePublicSettings();

  const configuredCodes = useMemo(
    () =>
      publicSettings?.general?.supported_languages
        ?.map(normalizeLanguageCode)
        .filter((code): code is string => Boolean(code)) ?? [],
    [publicSettings?.general?.supported_languages],
  );

  const enabledLanguages = useMemo(() => {
    if (configuredCodes.length === 0) return [...LANGS];
    const enabled = LANGS.filter((lang) => configuredCodes.includes(lang.code));
    return enabled.length > 0 ? enabled : [...LANGS];
  }, [configuredCodes]);

  const defaultLanguage =
    normalizeLanguageCode(publicSettings?.general?.default_language) ||
    enabledLanguages[0]?.code ||
    "en";
  const current =
    enabledLanguages.find((l) => i18n.language?.startsWith(l.code)) ??
    enabledLanguages.find((l) => l.code === defaultLanguage) ??
    enabledLanguages[0] ??
    LANGS[0];

  useEffect(() => {
    const activeCode = normalizeLanguageCode(i18n.language);
    if (enabledLanguages.some((lang) => lang.code === activeCode)) return;

    const nextLanguage =
      enabledLanguages.find((lang) => lang.code === defaultLanguage)?.code ??
      enabledLanguages[0]?.code;

    if (nextLanguage) {
      i18n.changeLanguage(nextLanguage);
    }
  }, [defaultLanguage, enabledLanguages, i18n]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5" aria-label={t("common.language")}>
          <FlagCircle flag={current.flag} label={current.label} />
          {!compact && <span className="text-xs font-semibold">{current.short}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {enabledLanguages.map((l) => (
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
