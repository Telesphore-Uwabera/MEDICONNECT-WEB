interface InfoTileProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

export function InfoTile({ icon, label, value }: InfoTileProps) {
  return (
    <div className="p-3 rounded-[6px] border border-border/60 bg-secondary/30">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
