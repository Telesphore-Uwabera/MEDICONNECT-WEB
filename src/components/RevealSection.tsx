import { ReactNode, useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;        // ms
  duration?: number;     // ms
  distance?: number;     // px — how far to slide from
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
}

const TRANSLATE: Record<Direction, string> = {
  up:    "translateY(VAR)",
  down:  "translateY(-VAR)",
  left:  "translateX(VAR)",
  right: "translateX(-VAR)",
  none:  "translate(0,0)",
};

/**
 * Wraps any content in a scroll-triggered fade + slide animation.
 * Children are only rendered once visible (lazy mount via `isVisible`).
 *
 * Usage:
 *   <RevealSection direction="up" delay={100}>
 *     <MyComponent />
 *   </RevealSection>
 */
export function RevealSection({
  children,
  className,
  direction = "up",
  delay = 0,
  duration = 600,
  distance = 36,
  threshold = 0.1,
  as: Tag = "div",
}: RevealSectionProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold });
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setSettled(false);
      return;
    }

    const timer = window.setTimeout(() => setSettled(true), duration + delay + 50);
    return () => window.clearTimeout(timer);
  }, [isVisible, duration, delay]);

  const hiddenTransform = TRANSLATE[direction].replace("VAR", `${distance}px`);

  return (
    <Tag
      // @ts-expect-error — generic ref works at runtime
      ref={ref}
      className={cn(className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: settled ? "none" : isVisible ? "translate(0,0)" : hiddenTransform,
        transition: settled
          ? undefined
          : `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: settled ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
