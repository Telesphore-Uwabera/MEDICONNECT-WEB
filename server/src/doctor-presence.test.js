import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";
import {
  TURN_OFF_STALE_INSTANT_SQL,
  instantSeenIsStale,
  shouldDisableInstantOnLogout,
} from "./doctor-schedule.js";

describe("instant consultation stays off unless the doctor turns it on", () => {
  it("turns instant off for a real logout and for an expired token with no other session", () => {
    expect(shouldDisableInstantOnLogout({ expired: false, otherValidTokens: 0 })).toBe(true);
    expect(shouldDisableInstantOnLogout({ expired: false, otherValidTokens: 2 })).toBe(true);
    expect(shouldDisableInstantOnLogout({ expired: true, otherValidTokens: 0 })).toBe(true);
    expect(shouldDisableInstantOnLogout({ expired: true, otherValidTokens: 1 })).toBe(false);
  });

  it("treats a missing or old heartbeat as stale and a fresh one as present", () => {
    const now = Date.parse("2026-11-23T12:00:00Z");
    expect(instantSeenIsStale(null, now)).toBe(true);
    expect(instantSeenIsStale("2026-11-23T11:56:00Z", now)).toBe(true);
    expect(instantSeenIsStale("2026-11-23T11:58:30Z", now)).toBe(false);
  });

  it("only updates instant_consultation to 0", () => {
    expect(TURN_OFF_STALE_INSTANT_SQL).toMatch(/SET instant_consultation = 0/);
    expect(TURN_OFF_STALE_INSTANT_SQL).not.toMatch(/SET instant_consultation = 1/);
    expect(TURN_OFF_STALE_INSTANT_SQL).toMatch(/WHERE instant_consultation = 1/);
    expect(TURN_OFF_STALE_INSTANT_SQL).toMatch(/INTERVAL 3 MINUTE/);
  });

  it("switches off instant when leaving the doctor role and does not save it from the profile", () => {
    const app = fs.readFileSync(path.join(process.cwd(), "server/src/app.js"), "utf8");
    expect(app).toMatch(/leavingDoctor[\s\S]{0,120}disableInstantOnLogout/);
    expect(app).toMatch(/delete fields\.instant_consultation/);
    expect(app).toMatch(/router\.post\("\/doctor\/presence"/);
    expect(app).toMatch(/Only the doctor can turn instant consultation on/);
    const profile = fs.readFileSync(path.join(process.cwd(), "src/pages/doctor/DoctorProfile.tsx"), "utf8");
    expect(profile).not.toMatch(/instant_consultation: personal\.instant_consultation/);
    expect(profile).not.toMatch(/instant_consultation: data\.personal!\.instant_consultation/);
  });
});

describe("stale instant job when the heartbeat column is missing", () => {
  it("does not query and does not crash", async () => {
    vi.resetModules();
    vi.doMock("./db.js", () => ({
      tableExists: async () => true,
      hasColumn: async (_table, column) => column === "instant_consultation",
      pool: { query: async () => { throw new Error("should not run"); } },
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { autoDisableInstantOutsideSchedule } = await import("./doctor-schedule.js");
    const first = await autoDisableInstantOutsideSchedule();
    const second = await autoDisableInstantOutsideSchedule();
    expect(first).toEqual({ disabled: 0, missingColumn: true });
    expect(second).toEqual({ disabled: 0, missingColumn: true });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
    vi.doUnmock("./db.js");
    vi.resetModules();
  });
});
