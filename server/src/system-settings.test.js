import { describe, expect, it } from "vitest";
import { coerceSetting, knownGroups } from "./system-settings.js";

describe("system settings", () => {
  it("covers the groups the admin page edits", () => {
    expect(knownGroups()).toEqual([
      "general", "sms", "email", "payment", "video", "notifications", "security",
    ]);
  });

  it("coerces booleans, integers and comma lists", () => {
    expect(coerceSetting("boolean", "true")).toBe(true);
    expect(coerceSetting("boolean", "0")).toBe(false);
    expect(coerceSetting("integer", "25")).toBe(25);
    expect(coerceSetting("array", "en, fr, rw")).toEqual(["en", "fr", "rw"]);
  });
});
