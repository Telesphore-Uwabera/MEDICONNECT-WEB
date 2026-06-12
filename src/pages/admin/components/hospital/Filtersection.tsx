interface FilterSectionProps {
  title:    string;
  children: React.ReactNode;
}

export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}
