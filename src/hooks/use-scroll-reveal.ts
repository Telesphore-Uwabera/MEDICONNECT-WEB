import { useEffect, useRef, useState } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/** A missed observation cannot leave a section blank. */
const REVEAL_FALLBACK_MS = 1200;

export function reducedMotionPreferred() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function observerAvailable() {
  return typeof window !== "undefined" && typeof IntersectionObserver !== "undefined";
}

/**
 * Returns a ref and a boolean `isVisible`.
 * The section is visible immediately when the user prefers reduced motion,
 * when the browser has no IntersectionObserver, or when observation is slow.
 * Any on-screen pixel reveals it, so a section taller than the viewport
 * cannot stay hidden behind a percentage threshold.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  once = true,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(
    () => reducedMotionPreferred() || !observerAvailable(),
  );

  useEffect(() => {
    if (reducedMotionPreferred() || !observerAvailable()) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let stopped = false;
    const show = () => {
      if (!stopped) setIsVisible(true);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          show();
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0, rootMargin: "0px" },
    );
    observer.observe(el);

    const frame = window.requestAnimationFrame(() => {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.bottom > 0 && box.top < window.innerHeight) show();
    });
    const fallback = window.setTimeout(show, REVEAL_FALLBACK_MS);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, [once]);

  return { ref, isVisible };
}
