import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import allowlist from "./identical-allowlist.json";

const root = path.resolve(process.cwd(), "src/locales");

function flatten(value: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      Object.assign(out, flatten(child, next));
    } else if (typeof child === "string") {
      out[next] = child;
    } else if (Array.isArray(child)) {
      child.forEach((item, index) => {
        if (typeof item === "string") out[`${next}.${index}`] = item;
      });
    }
  }
  return out;
}

function load(lang: string) {
  const flat: Record<string, string> = {};
  for (const file of fs.readdirSync(path.join(root, lang)).filter((name) => name.endsWith(".json"))) {
    const json = JSON.parse(fs.readFileSync(path.join(root, lang, file), "utf8"));
    const entries = flatten(json);
    for (const [key, value] of Object.entries(entries)) flat[`${file}::${key}`] = value;
  }
  return flat;
}

function allowed(lang: "fr" | "rw", value: string) {
  if (allowlist.any.includes(value)) return true;
  if (allowlist[lang].includes(value)) return true;
  if (/^[\d\s.+%*/:#+\-–—…*]+$/.test(value)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  if (/^https?:\/\//.test(value)) return true;
  if (/^\+\d[\d\s()-]+$/.test(value)) return true;
  return false;
}

describe("locale catalogs", () => {
  it("keeps French and Kinyarwanda in parity with English", () => {
    const en = load("en");
    const problems: string[] = [];
    for (const lang of ["fr", "rw"] as const) {
      const locale = load(lang);
      for (const [key, value] of Object.entries(en)) {
        if (!(key in locale)) {
          problems.push(`${lang} missing ${key}`);
          continue;
        }
        if (value.trim() && locale[key] === value && !allowed(lang, value)) {
          problems.push(`${lang} still English ${key} = ${JSON.stringify(value)}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
