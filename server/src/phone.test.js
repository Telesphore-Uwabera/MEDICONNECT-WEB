import { describe, expect, it } from "vitest";
import { normalizeStoredPhone } from "./phone.js";

describe("normalizeStoredPhone", () => {
  it("turns +250 0789107304 into E.164 local digits", () => {
    expect(normalizeStoredPhone("0789107304", "+250")).toEqual({
      phone: "789107304",
      country_code: "+250",
      e164: "+250789107304",
    });
  });
});
