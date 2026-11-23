import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

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
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export const landingShell =
  "mx-auto w-full min-w-0 max-w-[1200px] px-4 sm:px-6 lg:px-8";
