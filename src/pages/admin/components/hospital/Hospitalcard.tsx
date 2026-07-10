import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";
import type { ApiHospital } from "@/hooks/admin/use-admin-hospitals";
import { cn } from "@/lib/utils";
import { getInitials } from "./Utils";
import { statusStyle, STATUS_DOT, typeStyle } from "./Styles";
import { formatDateOnly } from "@/lib/date";

interface HospitalCardProps {
  h: ApiHospital;
  onManage: (h: ApiHospital) => void;
}

export function HospitalCard({ h, onManage }: HospitalCardProps) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-[6px] border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-9 w-9 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-primary/20">
        {getInitials(h.name_en)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{h.name_en}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{h.user?.name ?? "â€”"}</p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
              statusStyle[h.status],
            )}
          >
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[h.status])} />
            {h.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {h.type && (
            <Badge
              variant="outline"
              className={cn(
                "border text-[9px] px-1.5 py-0 font-medium capitalize",
                typeStyle[h.type] ?? "bg-muted text-muted-foreground border-border",
              )}
            >
              {h.type}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Stethoscope className="w-3 h-3" />
            {h.doctors_count} doctors
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {formatDateOnly(h.created_at)}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-[6px] border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(h)}
        >
          Manage
        </Button>
      </div>
    </div>
  );
}

