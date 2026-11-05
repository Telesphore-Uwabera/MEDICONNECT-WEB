import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, normalizeStoredPhone, validatePhoneForCountry } from "./phone-validation";

describe("Rwandan phone numbers", () => {
  it("strips the trunk 0 when saving so the value is not +250 078…", () => {
    const result = validatePhoneForCountry("0789107304", "+250");
    expect(result.isValid).toBe(true);
    expect(result.normalizedPhone).toBe("789107304");
    expect(result.normalizedCountryCode).toBe("+250");
  });

  it("displays an existing trunk-zero number as E.164", () => {
    expect(formatPhoneDisplay("+250", "0789107304")).toBe("+250789107304");
    expect(normalizeStoredPhone("250789107304", "250").phone).toBe("789107304");
  });
});
