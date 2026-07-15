const DATE_TIME_TEXT_PATTERN =
  /\b(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(?:\.\d+)?Z?\b/g;

const toDateParts = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const toTimeParts = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  const time = raw.includes("T") ? raw.slice(11, 16) : raw.slice(0, 5);
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
};

export const formatDisplayDate = (value?: string | null, locale = "en-US") => {
  const parts = toDateParts(value);
  if (!parts) return String(value ?? "").trim();

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parts.year, parts.month - 1, parts.day));
};

export const formatDisplayTime = (value?: string | null, locale = "en-US") => {
  const parts = toTimeParts(value);
  if (!parts) return String(value ?? "").trim();

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, parts.hour, parts.minute));
};

export const formatAppointmentDateTime = (
  date?: string | null,
  time?: string | null,
  locale = "en-US",
) =>
  [formatDisplayDate(date, locale), formatDisplayTime(time, locale)]
    .filter(Boolean)
    .join(" - ");

export const normalizeDateTimeText = (value?: string | null, locale = "en-US") => {
  if (!value) return value;

  return value.replace(DATE_TIME_TEXT_PATTERN, (_match, date: string, time: string) =>
    formatAppointmentDateTime(date, time, locale),
  );
};
