import { describe, expect, it } from "vitest";
import { pharmacyMatchesSearch } from "@/lib/pharmacy-search";

describe("pharmacy search", () => {
  it("does not throw when the address is missing", () => {
    const pharmacy = { name: "City Pharmacy", city: "Huye", address: null };
    expect(pharmacyMatchesSearch(pharmacy, "city")).toBe(true);
    expect(pharmacyMatchesSearch(pharmacy, "huye")).toBe(true);
    expect(pharmacyMatchesSearch(pharmacy, "kg")).toBe(false);
  });
});
