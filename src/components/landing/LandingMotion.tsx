import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { reducedMotionPreferred } from "@/hooks/use-scroll-reveal";

/** Fade and slide into view. Reduced motion renders the content immediately. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce || reducedMotionPreferred()) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px", amount: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export const landingShell = "page-shell";
