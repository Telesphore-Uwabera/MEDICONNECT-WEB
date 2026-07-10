export const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseLocalDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const match = DATE_ONLY_RE.exec(value);
  if (match && !value.includes("T")) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateOnly(
  value: string | Date | null | undefined,
  locales?: Intl.LocalesArgument,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString(locales, options) : "-";
}

export function toLocalDateInputValue(value: string | Date | null | undefined = new Date()): string {
  if (typeof value === "string") {
    const match = DATE_ONLY_RE.exec(value);
    if (match) return match[0];
  }

  const date = parseLocalDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}
