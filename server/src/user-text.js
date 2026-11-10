/** User-facing copy for mail and notifications. Unknown languages stay in English. */

export function normalizeLang(value) {
  const code = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  if (code === "rw" || code === "kiny" || code === "kinyarwanda") return "rw";
  if (code === "fr" || code === "french" || code === "francais") return "fr";
  return "en";
}

export function pick(lang, copy) {
  const code = normalizeLang(lang);
  return copy[code] || copy.en;
}

export function fill(template, vars = {}) {
  return String(template ?? "").replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] == null ? "" : String(vars[key])));
}

const phrases = {
  en: {
    hello: "Hello!",
    hello_name: "Hello, {{name}}!",
    tagline: "Bringing Care to Your Fingertips",
    rights: "All rights reserved.",
    received: "You received this email because you have an account on MediConnect. If you believe this was sent in error, please contact us at",
  },
  fr: {
    hello: "Bonjour !",
    hello_name: "Bonjour, {{name}} !",
    tagline: "Des soins à portée de main",
    rights: "Tous droits réservés.",
    received: "Vous recevez cet e-mail parce que vous avez un compte MediConnect. Si vous pensez qu'il s'agit d'une erreur, écrivez-nous à",
  },
  rw: {
    hello: "Muraho!",
    hello_name: "Muraho, {{name}}!",
    tagline: "Ubuvuzi buje ku ntoki zawe",
    rights: "Uburenganzira bwose burabitswe.",
    received: "Wakiriye iyi imeri kuko ufite konti kuri MediConnect. Niba utekereza ko yoherejwe kubwo ikosa, twandikire kuri",
  },
};

export function phrase(lang, key, vars) {
  const code = normalizeLang(lang);
  const template = phrases[code]?.[key] || phrases.en[key] || key;
  return fill(template, vars);
}

/** Language already loaded on a user row. Missing column or blank value stays English. */
export function languageFromUserRow(row) {
  const value = row?.preferred_language;
  if (value == null || String(value).trim() === "") return "en";
  return normalizeLang(value);
}

export function greeting(lang, name) {
  const parts = String(name || "").replace(/\s+/g, " ").trim().split(" ").filter((part) => part && !/^dr\.?$/i.test(part));
  const first = parts[0] || "";
  if (!first || first.toLowerCase() === "patient" || first.includes("@")) return phrase(lang, "hello");
  return phrase(lang, "hello_name", { name: first });
}
