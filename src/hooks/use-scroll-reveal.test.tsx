import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RevealSection } from "@/components/RevealSection";
import { reducedMotionPreferred, useScrollReveal } from "./use-scroll-reveal";
import { renderHook } from "@testing-library/react";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function matchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matches && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("scroll reveal", () => {
  it("shows the section immediately when the browser cannot observe intersection", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    matchMedia(false);
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current.isVisible).toBe(true);
    expect(reducedMotionPreferred()).toBe(false);
  });

  it("shows the section immediately when the user prefers reduced motion", () => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    matchMedia(true);
    render(
      <RevealSection>
        <h2>Healthcare in 3 Simple Steps</h2>
      </RevealSection>,
    );
    const heading = screen.getByRole("heading", { name: "Healthcare in 3 Simple Steps" });
    expect(heading.closest("div")?.style.opacity).toBe("1");
  });

  it("shows a section that the observer never reports, so slow JavaScript cannot leave it blank", () => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    matchMedia(false);
    render(
      <RevealSection>
        <h2>Consult With Expert Doctors</h2>
      </RevealSection>,
    );
    const heading = screen.getByRole("heading", { name: "Consult With Expert Doctors" });
    expect(heading.closest("div")?.style.opacity).toBe("0");
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(heading.closest("div")?.style.opacity).toBe("1");
  });
});
