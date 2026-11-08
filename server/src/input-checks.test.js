import { describe, expect, it } from "vitest";
import { plausibleDateOfBirth } from "./input-checks.js";
import { validateIncomingPhone } from "./phone.js";

describe("input checks", () => {
  it("accepts a real birth date and rejects a calendar fiction", () => {
    expect(plausibleDateOfBirth("1990-02-28").ok).toBe(true);
    expect(plausibleDateOfBirth("1990-02-31").ok).toBe(false);
    expect(plausibleDateOfBirth("1899-01-01").ok).toBe(false);
    expect(plausibleDateOfBirth("").ok).toBe(true);
  });

  it("normalizes a Rwandan trunk zero and rejects a short number", () => {
    expect(validateIncomingPhone("0789107304", "+250")).toMatchObject({ ok: true, phone: "789107304", e164: "+250789107304" });
    expect(validateIncomingPhone("0712345678", "+250").ok).toBe(false);
    expect(validateIncomingPhone("123456", "+1").ok).toBe(true);
  });

  it("accepts 72, 73, 78, and 79 and drops a trunk 0 before checking", () => {
    for (const prefix of ["72", "73", "78", "79"]) {
      const result = validateIncomingPhone(`${prefix}1234567`, "+250");
      expect(result.ok).toBe(true);
      expect(result.phone.startsWith("0")).toBe(false);
    }
    expect(validateIncomingPhone("0701234567", "+250").ok).toBe(false);
    expect(validateIncomingPhone("701234567", "+250").ok).toBe(false);
  });
});
