import { q, tableExists, update } from "./db.js";

export function normalizeCountryCode(countryCode) {
  const digits = String(countryCode ?? "").trim().replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "+250";
}

/** Drop a leading 0 after the country code. +250 0789107304 becomes +250789107304. */
export function normalizeStoredPhone(phone, countryCode) {
  const code = normalizeCountryCode(countryCode);
  let digits = String(phone ?? "").trim().replace(/[^\d]/g, "");
  const codeDigits = code.replace(/\D/g, "");
  if (codeDigits && digits.startsWith(codeDigits) && digits.length > codeDigits.length + 5) {
    digits = digits.slice(codeDigits.length);
  }
  if (code === "+250" && digits.startsWith("0")) digits = digits.slice(1);
  return { phone: digits, country_code: code, e164: digits ? `${code}${digits}` : "" };
}

/** One-time tidy of numbers already stored with a trunk 0 or a repeated country code. */
export async function normalizeStoredPhones() {
  if (!(await tableExists("users")) ) return 0;
  const rows = await q(
    `SELECT id, phone, country_code FROM users
     WHERE phone IS NOT NULL AND phone <> ''
       AND (phone LIKE '0%' OR phone LIKE '+%' OR phone LIKE '250%' OR country_code IS NULL OR country_code = '')`,
  ).catch(() => []);
  let changed = 0;
  for (const row of rows) {
    const next = normalizeStoredPhone(row.phone, row.country_code);
    if (!next.phone || (next.phone === String(row.phone) && next.country_code === row.country_code)) continue;
    await update("users", row.id, { phone: next.phone, country_code: next.country_code }).catch(() => null);
    changed += 1;
  }
  return changed;
}
