import { hasColumn, one, tableExists } from "./db.js";
import { languageFromUserRow, normalizeLang } from "./user-text.js";

/**
 * Where the app stores a person's language:
 * - users.preferred_language, written by PUT /settings/profile when that column exists
 * - doctors.preferred_language, which public doctor search already filters on
 * - the same column on patients, hospitals, or pharmacies when present
 * There is no schema change here. A missing column or blank value falls back to English.
 */
const PROFILE_TABLES = ["doctors", "patients", "hospitals", "pharmacies"];

async function profileLanguage(userId) {
  for (const table of PROFILE_TABLES) {
    try {
      if (!(await tableExists(table))) continue;
      if (!(await hasColumn(table, "preferred_language")) || !(await hasColumn(table, "user_id"))) continue;
      const row = await one(
        `SELECT preferred_language FROM \`${table}\` WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId],
      );
      if (row?.preferred_language) return normalizeLang(row.preferred_language);
    } catch {
      // This profile table is not readable. Try the next one.
    }
  }
  return "en";
}

export async function languageForUserId(userId) {
  const id = Number(userId);
  if (!id) return "en";
  try {
    if (await hasColumn("users", "preferred_language")) {
      const row = await one("SELECT preferred_language FROM users WHERE id = ? LIMIT 1", [id]);
      if (row?.preferred_language) return languageFromUserRow(row);
    }
  } catch {
    // The users table could not be read. Try profile tables, then English.
  }
  return profileLanguage(id);
}
