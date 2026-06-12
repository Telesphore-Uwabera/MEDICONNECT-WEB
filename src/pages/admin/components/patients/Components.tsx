import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiPatient } from "@/hooks/admin/use-admin-patients";
import {
  STATUS_STYLE,
  STATUS_DOT,
  getInitials,
  formatDob,
  calcAge,
  type StatusFilter,
} from "./Types";

// ─── FilterSection ────────────────────────────────────────────────────────────

export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── PillGroup ────────────────────────────────────────────────────────────────

export function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left flex items-center justify-between",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          <span>{o.label}</span>
          {o.count !== undefined && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              value === o.value ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground",
            )}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── StatusBadge (shared) ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={cn("border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0", STATUS_STYLE[status])}
    >
      <span className={cn("w-1 h-1 rounded-full mr-1", STATUS_DOT[status])} />
      {t(`admin.status.${status}`)}
    </Badge>
  );
}

// ─── Avatar (shared) ──────────────────────────────────────────────────────────

function Avatar({ name, avatar, size = "sm" }: { name: string; avatar?: string | null; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-16 w-16 text-lg font-bold" : "h-9 w-9 text-xs font-semibold";
  return avatar ? (
    <img src={avatar} alt={name} className={cn(dim, "rounded-full object-cover flex-shrink-0 border border-border/40")} />
  ) : (
    <div className={cn(dim, "rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0")}>
      {getInitials(name)}
    </div>
  );
}

// ─── PatientRow (desktop table) ───────────────────────────────────────────────

export function PatientRow({ p, onManage }: { p: ApiPatient; onManage: (p: ApiPatient) => void }) {
  const { t } = useTranslation();
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} avatar={p.avatar} />
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{p.name}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{p.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">{p.phone}</td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {p.patient?.date_of_birth ? (
          <span>
            {formatDob(p.patient.date_of_birth)}{" "}
            <span className="text-muted-foreground/50">({calcAge(p.patient.date_of_birth)})</span>
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/80 whitespace-nowrap">
        {new Date(p.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm" variant="outline"
          className="h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200"
          onClick={() => onManage(p)}
        >
          {t("admin.users.manage")}
        </Button>
      </td>
    </tr>
  );
}

// ─── PatientCard (mobile) ─────────────────────────────────────────────────────

export function PatientCard({ p, onManage }: { p: ApiPatient; onManage: (p: ApiPatient) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="mt-0.5"><Avatar name={p.name} avatar={p.avatar} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{p.name}</p>
            <p className="text-[10px] text-muted-foreground/70 truncate">{p.email}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground/60">{p.phone}</span>
          {p.patient?.date_of_birth && (
            <span className="text-[10px] text-muted-foreground/50">{calcAge(p.patient.date_of_birth)}</span>
          )}
          <span className="text-[10px] text-muted-foreground/50">{new Date(p.created_at).toLocaleDateString()}</span>
        </div>
        <Button
          size="sm" variant="outline"
          className="mt-2.5 h-7 px-3 text-[10px] rounded-sm border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all duration-200 w-full"
          onClick={() => onManage(p)}
        >
          {t("admin.users.manage")}
        </Button>
      </div>
    </div>
  );
}

// ─── SkeletonRows ─────────────────────────────────────────────────────────────

export function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "140px" : j === 5 ? "60px" : "80px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── InfoTile ─────────────────────────────────────────────────────────────────

export function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border/60 bg-secondary/30">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className="text-[13px] font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

// ─── Re-export for panel use ──────────────────────────────────────────────────
export { Avatar, StatusBadge };
export type { StatusFilter };
