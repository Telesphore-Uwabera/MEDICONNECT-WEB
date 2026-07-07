import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stethoscope, LayoutGrid } from "lucide-react";
import type { ApiHospital } from "@/hooks/admin/use-admin-hospitals";
import { cn } from "@/lib/utils";
import { getInitials } from "./Utils";
import { statusStyle, STATUS_DOT, typeStyle } from "./Styles";
import { formatDateOnly } from "@/lib/date";

interface HospitalRowProps {
  h: ApiHospital;
  onManage: (h: ApiHospital) => void;
}

export function HospitalRow({ h, onManage }: HospitalRowProps) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      {/* Name + admin */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
            {getInitials(h.name_en)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{h.name_en}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{h.user?.name ?? "-"}</p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        {h.type ? (
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize",
              typeStyle[h.type] ?? "bg-muted text-muted-foreground border-border",
            )}
          >
            {h.type}
          </Badge>
        ) : (
          <span className="text-muted-foreground/40 text-[11px]">-</span>
        )}
      </td>

      {/* Staff counts */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80">
          <span className="flex items-center gap-1">
            <Stethoscope className="w-3 h-3" />
            {h.doctors_count}
          </span>
          <span className="flex items-center gap-1">
            <LayoutGrid className="w-3 h-3" />
            {h.departments_count}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize", statusStyle[h.status])}
        >
          <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[h.status])} />
          {h.status}
        </Badge>
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {formatDateOnly(h.created_at)}
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(h)}
        >
          Manage
        </Button>
      </td>
    </tr>
  );
}

