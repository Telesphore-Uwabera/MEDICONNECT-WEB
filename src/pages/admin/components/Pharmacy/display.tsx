import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_STYLE, STATUS_DOT, getInitials } from "./config";
import type { ApiPharmacy } from "@/hooks/admin/use-admin-pharmacies";
import { formatDateOnly } from "@/lib/date";

 
export function InfoTile({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
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

 
export function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "140px" : j === 4 ? "60px" : "80px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
 
export function PharmacyRow({ p, onManage }: { p: ApiPharmacy; onManage: (p: ApiPharmacy) => void }) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
            {getInitials(p.name_en)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{p.name_en}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{p.user?.name ?? "-"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {p.city
          ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{p.city}</span>
          : <span className="text-muted-foreground/40">-</span>}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize", STATUS_STYLE[p.status])}>
          <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[p.status])} />{p.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {formatDateOnly(p.created_at)}
      </td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="outline"
          className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(p)}>
          Manage
        </Button>
      </td>
    </tr>
  );
}

 
export function PharmacyCard({ p, onManage }: { p: ApiPharmacy; onManage: (p: ApiPharmacy) => void }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[6px] border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-9 w-9 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-primary/20">
        {getInitials(p.name_en)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{p.name_en}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{p.user?.name ?? "-"}</p>
          </div>
          <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0", STATUS_STYLE[p.status])}>
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[p.status])} />{p.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {p.city && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{p.city}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/50">
            {formatDateOnly(p.created_at)}
          </span>
        </div>
        <Button size="sm" variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(p)}>
          Manage
        </Button>
      </div>
    </div>
  );
}

