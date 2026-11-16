import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIdleLogout } from "./useIdleLogout";

const apiFetch = vi.fn();
const clearAuthToken = vi.fn();
const goToSignIn = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

vi.mock("@/lib/auth-session", () => ({
  getAuthToken: () => "doctor-token",
  clearAuthToken: () => clearAuthToken(),
  goToSignIn: (...args: unknown[]) => goToSignIn(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useIdleLogout", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    clearAuthToken.mockReset();
    goToSignIn.mockReset();
    apiFetch.mockResolvedValue({});
  });

  it("keeps the logout request alive before leaving the page", async () => {
    vi.useFakeTimers();
    renderHook(() => useIdleLogout(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });
    expect(apiFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST", keepalive: true });
    expect(goToSignIn).toHaveBeenCalledWith(undefined, { reason: "idle_timeout" });
    expect(clearAuthToken).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
