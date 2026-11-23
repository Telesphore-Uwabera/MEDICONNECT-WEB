import { afterEach, describe, expect, it, vi } from "vitest";
import { DOCTOR_HEARTBEAT_MS, startDoctorHeartbeat } from "./doctor-heartbeat";

afterEach(() => {
  vi.useRealTimers();
});

describe("doctor heartbeat", () => {
  it("sends one beat immediately and another every minute while the tab is visible", () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const stop = startDoctorHeartbeat(send, DOCTOR_HEARTBEAT_MS, () => true);
    expect(send).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(DOCTOR_HEARTBEAT_MS);
    expect(send).toHaveBeenCalledTimes(2);
    stop();
    vi.advanceTimersByTime(DOCTOR_HEARTBEAT_MS);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not count a hidden tab as presence", () => {
    const send = vi.fn();
    const stop = startDoctorHeartbeat(send, DOCTOR_HEARTBEAT_MS, () => false);
    expect(send).not.toHaveBeenCalled();
    stop();
  });
});
