import { Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiDoctor } from "@/hooks/admin/use-admin-doctors";
import {
  getInitials,
  statusStyle,
  STATUS_DOT,
  consultationStyle,
  CONSULTATION_LABELS,
} from "./Types";
import { ConsultationIcon } from "./Constants";

// ─── DoctorRow (desktop table row) ───────────────────────────────────────────

export function DoctorRow({
  d,
  onManage,
}: {
  d: ApiDoctor;
  onManage: (d: ApiDoctor) => void;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
            {getInitials(d.user.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">
              {d.user.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {d.user.email ?? "—"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {d.specialization ?? <span className="text-muted-foreground/40">—</span>}
      </td>

      <td className="px-4 py-3">
        {d.consultation_type ? (
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium gap-1",
              consultationStyle[d.consultation_type] ?? "bg-muted text-muted-foreground border-border",
            )}
          >
            {ConsultationIcon[d.consultation_type]}
            {CONSULTATION_LABELS[d.consultation_type] ?? d.consultation_type}
          </Badge>
        ) : (
          <span className="text-muted-foreground/40 text-[11px]">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            statusStyle[d.status],
          )}
        >
          <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[d.status])} />
          {d.status}
        </Badge>
      </td>

      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {new Date(d.created_at).toLocaleDateString()}
      </td>

      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(d)}
        >
          Manage
        </Button>
      </td>
    </tr>
  );
}

// ─── DoctorCard (mobile card) ─────────────────────────────────────────────────

export function DoctorCard({
  d,
  onManage,
}: {
  d: ApiDoctor;
  onManage: (d: ApiDoctor) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-primary/20">
        {getInitials(d.user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">
              {d.user.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {d.user.email ?? "—"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
              statusStyle[d.status],
            )}
          >
            <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[d.status])} />
            {d.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {d.specialization && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
              <Stethoscope className="w-3 h-3" />
              {d.specialization}
            </span>
          )}
          {d.consultation_type && (
            <Badge
              variant="outline"
              className={cn(
                "border text-[9px] px-1.5 py-0 font-medium gap-1",
                consultationStyle[d.consultation_type] ?? "bg-muted text-muted-foreground border-border",
              )}
            >
              {ConsultationIcon[d.consultation_type]}
              {CONSULTATION_LABELS[d.consultation_type] ?? d.consultation_type}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/50">
            {new Date(d.created_at).toLocaleDateString()}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(d)}
        >
          Manage
        </Button>
      </div>
    </div>
  );
}
