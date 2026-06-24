import { cn } from "@/lib/utils";

export const SignalBars = ({ strength }: { strength: number }) => (
  <div className="flex items-end gap-0.5 h-3.5">
    {[1, 2, 3, 4].map((b) => (
      <div
        key={b}
        style={{ height: `${b * 3}px` }}
        className={cn("w-1 rounded-[6px] transition-colors", b <= strength ? "bg-emerald-400" : "bg-white/20")}
      />
    ))}
  </div>
);
