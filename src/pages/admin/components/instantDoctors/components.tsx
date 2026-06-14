
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useToggleInstantConsultation, type ApiDoctorConsultation } from "@/hooks/admin/use-doctor-insitant";
import { cn } from "@/lib/utils";
import { activeStyle, activeDot, instantStyle, getInitials, resolvedFee, fmt, getErrorMessage } from "./types";
import { Loader2, Zap, ToggleLeft, ToggleRight } from "lucide-react";
// ─── FilterSection ────────────────────────────────────────────────────────────

export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">{title}</p>
      {children}
    </div>
  );
}

// ─── PillGroup ────────────────────────────────────────────────────────────────

export function PillGroup<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center justify-between",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}>
          <span>{o.label}</span>
          {o.count !== undefined && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
              value === o.value ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── InfoTile ─────────────────────────────────────────────────────────────────

export function InfoTile({ icon, label, value, highlight }: {
  icon: React.ReactNode; label: string; value: string | number; highlight?: boolean;
}) {
  return (
    <div className={cn("p-3 rounded-lg border bg-secondary/30",
      highlight
        ? "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60"
        : "border-border/60")}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">{icon}{label}</div>
      <p className={cn("text-[13px] font-medium truncate",
        highlight ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>{value}</p>
    </div>
  );
}

// ─── SkeletonRows ─────────────────────────────────────────────────────────────

export function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "140px" : j === 6 ? "60px" : "90px" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── InstantToggleButton ──────────────────────────────────────────────────────

export function InstantToggleButton({ doctorId, isInstant, compact = false }: {
  doctorId: number; isInstant: boolean; compact?: boolean;
}) {
  const { toast } = useToast();
  const toggleMutation = useToggleInstantConsultation();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleMutation.mutateAsync({ doctor_id: doctorId, active: !isInstant });
      toast({ title: res.message });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const isPending = toggleMutation.isPending;

  if (compact) {
    return (
      <button onClick={handleToggle} disabled={isPending}
        title={isInstant ? "Disable instant consultation" : "Enable instant consultation"}
        className={cn(
          "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm border font-medium transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isInstant
            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900"
            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
        )}>
        {isPending
          ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
          : <Zap className={cn("w-2.5 h-2.5", isInstant && "fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400")} />
        }
        {isInstant ? "Instant" : "Off"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-secondary/30">
      <div>
        <p className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
          <Zap className={cn("w-3.5 h-3.5", isInstant ? "text-blue-500 fill-blue-500" : "text-muted-foreground/40")} />
          Instant Consultation
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {isInstant ? "Doctor appears in instant consultation pool" : "Doctor is not available for instant calls"}
        </p>
      </div>
      <button onClick={handleToggle} disabled={isPending} className="disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {isPending
          ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          : isInstant
            ? <ToggleRight className="w-8 h-8 text-blue-500" />
            : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />
        }
      </button>
    </div>
  );
}

// ─── ConsultationRow (desktop) ────────────────────────────────────────────────

export function ConsultationRow({ c, onManage }: { c: ApiDoctorConsultation; onManage: (c: ApiDoctorConsultation) => void }) {
  const fees = resolvedFee(c);
  const hasOverride = c.online_fee_override !== null || c.in_person_fee_override !== null;
  const key = String(c.is_active) as "true" | "false";

  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 border border-primary/20">
            {getInitials(c.doctor.user.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{c.doctor.user.name}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate">{c.doctor.user.phone ?? "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-[11px] text-foreground truncate">{c.primary_specialization ?? <span className="text-muted-foreground/40">—</span>}</p>
        {c.secondary_specialization && <p className="text-[10px] text-muted-foreground/60 truncate">{c.secondary_specialization}</p>}
      </td>
      <td className="px-4 py-3">
        <p className={cn("font-mono text-[11px] font-medium", hasOverride && c.online_fee_override !== null ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{fmt(fees.online)}</p>
        {hasOverride && c.online_fee_override !== null && c.specialization_fee && (
          <p className="text-[10px] text-muted-foreground/50 line-through font-mono">{fmt(c.specialization_fee.online_fee)}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className={cn("font-mono text-[11px] font-medium", hasOverride && c.in_person_fee_override !== null ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>{fmt(fees.inPerson)}</p>
        {hasOverride && c.in_person_fee_override !== null && c.specialization_fee && (
          <p className="text-[10px] text-muted-foreground/50 line-through font-mono">{fmt(c.specialization_fee.in_person_fee)}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <InstantToggleButton doctorId={c.doctor_id} isInstant={c.doctor.instant_consultation} compact />
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium", activeStyle[key])}>
          <span className={cn("w-1 h-1 rounded-full mr-1", activeDot[key])} />
          {c.is_active ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(c)}>
          Manage
        </Button>
      </td>
    </tr>
  );
}

// ─── ConsultationCard (mobile) ────────────────────────────────────────────────

export function ConsultationCard({ c, onManage }: { c: ApiDoctorConsultation; onManage: (c: ApiDoctorConsultation) => void }) {
  const fees = resolvedFee(c);
  const hasOverride = c.online_fee_override !== null || c.in_person_fee_override !== null;
  const key = String(c.is_active) as "true" | "false";

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border border-primary/20">
        {getInitials(c.doctor.user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{c.doctor.user.name}</p>
            <p className="text-[10px] text-muted-foreground/60">{c.primary_specialization ?? "—"}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <InstantToggleButton doctorId={c.doctor_id} isInstant={c.doctor.instant_consultation} compact />
            <Badge variant="outline" className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize", activeStyle[key])}>
              <span className={cn("w-1 h-1 rounded-full mr-1", activeDot[key])} />
              {c.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className={cn("font-mono text-[10px] font-medium", hasOverride ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70")}>
            Online: {fmt(fees.online)}
          </span>
          <span className={cn("font-mono text-[10px] font-medium", hasOverride ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/70")}>
            In-person: {fmt(fees.inPerson)}
          </span>
          {hasOverride && (
            <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-1.5 py-0.5 rounded-sm">
              Override
            </span>
          )}
        </div>
        <Button size="sm" variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(c)}>
          Manage
        </Button>
      </div>
    </div>
  );
}
