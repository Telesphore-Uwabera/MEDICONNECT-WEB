type LocalizedText = Partial<Record<"en" | "fr" | "kiny" | "rw", string>>;

export function languageKey(language: string): "en" | "fr" | "kiny" {
  const normalized = language.toLowerCase();
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("rw") || normalized.startsWith("kiny")) return "kiny";
  return "en";
}

export function parseLocalizedText(value: unknown): LocalizedText {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as LocalizedText;

  if (typeof value !== "string") return {};
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LocalizedText;
    }
  } catch {
    return { en: trimmed };
  }

  return { en: trimmed };
}

export function stringifyLocalizedText(value: LocalizedText): string {
  const cleaned = {
    en: value.en?.trim() ?? "",
    fr: value.fr?.trim() ?? "",
    kiny: value.kiny?.trim() ?? value.rw?.trim() ?? "",
  };

  return JSON.stringify(cleaned);
}

export function localizedText(value: unknown, language: string, fallback = ""): string {
  const parsed = parseLocalizedText(value);
  const key = languageKey(language);

  return (
    parsed[key]?.trim() ||
    parsed.en?.trim() ||
    parsed.fr?.trim() ||
    parsed.kiny?.trim() ||
    parsed.rw?.trim() ||
    fallback
  );
}
