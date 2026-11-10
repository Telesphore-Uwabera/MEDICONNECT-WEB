/** Compact progress for a guided booking or care flow. */
export function FlowSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol data-testid="booking-steps" className="flex gap-1 overflow-x-auto px-4 pt-3 sm:px-6" aria-label="Progress">
      {steps.map((label, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              active ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {index + 1}. {label}
          </li>
        );
      })}
    </ol>
  );
}
