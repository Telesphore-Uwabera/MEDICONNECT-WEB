/** Calendar date that is not in the future and not before 1900. No minimum age. */
export function plausibleDateOfBirth(value) {
  if (value == null || value === "") return { ok: true, value: null };
  const text = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false, message: "Enter a real date of birth." };
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (!real || year < 1900 || date.getTime() > todayUtc) {
    return { ok: false, message: "Enter a real date of birth." };
  }
  return { ok: true, value: text };
}
