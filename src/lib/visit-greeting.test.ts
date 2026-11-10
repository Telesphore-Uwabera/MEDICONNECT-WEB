import { beforeEach, describe, expect, it } from "vitest";
import { hasEarlierVisit, hasPriorSignIn, noteSuccessfulLogin, welcomeMode } from "./visit-greeting";

describe("visit greeting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("treats the first sign-in as a first visit and the next sign-in as a return", () => {
    expect(hasPriorSignIn()).toBe(false);
    expect(welcomeMode({ priorSignIn: hasPriorSignIn() })).toBe("first");

    noteSuccessfulLogin("2026-11-01T08:00:00.000Z");
    expect(hasPriorSignIn()).toBe(false);
    expect(welcomeMode({ priorSignIn: hasPriorSignIn() })).toBe("first");

    noteSuccessfulLogin("2026-11-10T08:00:00.000Z");
    expect(hasPriorSignIn()).toBe(true);
    expect(welcomeMode({ priorSignIn: hasPriorSignIn() })).toBe("back");
  });

  it("uses a past visit as a return signal and ignores a future booking", () => {
    expect(hasEarlierVisit([
      { status: "confirmed", appointment_date: "2026-11-12" },
    ], "2026-11-10")).toBe(false);
    expect(welcomeMode({
      priorSignIn: false,
      earlierVisit: hasEarlierVisit([{ status: "pending", appointment_date: "2026-11-12" }], "2026-11-10"),
    })).toBe("first");

    expect(hasEarlierVisit([
      { status: "completed", appointment_date: "2026-11-12" },
    ], "2026-11-10")).toBe(true);
    expect(hasEarlierVisit([
      { status: "confirmed", appointment_date: "2026-11-01" },
    ], "2026-11-10")).toBe(true);
    expect(welcomeMode({ priorSignIn: false, earlierVisit: true })).toBe("back");
  });
});
