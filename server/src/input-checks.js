/**
 * File type from the leading bytes, not the name the browser sent.
 * This only distinguishes PDF, PNG, JPEG, and WEBP. It does not scan for
 * malware, scripts inside an otherwise valid file, or polyglot payloads.
 */
export function sniffedUploadExtension(buffer) {
  if (!buffer || buffer.length < 3) return null;
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return ".pdf";
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return ".png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return ".webp";
  return null;
}

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
