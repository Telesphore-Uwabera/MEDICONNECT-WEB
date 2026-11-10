import { describe, expect, it } from "vitest";
import { greeting, normalizeLang, pick } from "./user-text.js";

describe("user-facing language", () => {
  it("keeps English greetings and switches when the account language is known", () => {
    expect(normalizeLang("fr-FR")).toBe("fr");
    expect(normalizeLang("kinyarwanda")).toBe("rw");
    expect(normalizeLang(null)).toBe("en");
    expect(greeting("en", "Amina Uwase")).toBe("Hello, Amina!");
    expect(greeting("fr", "Dr. Jane Doe")).toBe("Bonjour, Jane !");
    expect(greeting("rw", "Keza")).toBe("Muraho, Keza!");
    expect(greeting("fr", "patient")).toBe("Bonjour !");
    expect(pick("rw", { en: "Ready", fr: "Prêt", rw: "Biteguye" })).toBe("Biteguye");
    expect(pick("de", { en: "Ready", fr: "Prêt", rw: "Biteguye" })).toBe("Ready");
  });
});
