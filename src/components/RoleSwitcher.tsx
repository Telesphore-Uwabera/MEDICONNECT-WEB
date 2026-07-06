// Multi-role account switcher. Lists the roles this account can hold:
//  - current active role → marked "Current"
//  - a role the account already has → "Switch"
//  - a role not yet on the account → "Add & switch" (add-role then switch-role)

import { useEffect, useState } from "react";
import {
  X, Check, Loader2, User, Stethoscope, Building2, Pill, ArrowRightLeft, Plus, ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe } from "@/hooks/useAuth";
import { useGoToRole, type GoRole } from "@/hooks/useRoleManagement";

const ROLES: { key: GoRole; label: string; icon: LucideIcon; desc: string }[] = [
  { key: "patient", label: "Patient", icon: User, desc: "Book and attend consultations" },
  { key: "doctor", label: "Doctor", icon: Stethoscope, desc: "See patients and manage care" },
  { key: "hospital", label: "Hospital", icon: Building2, desc: "Manage facility services" },
  { key: "pharmacy", label: "Pharmacy", icon: Pill, desc: "Fulfil prescriptions and orders" },
];

const ADMIN_ROLE: { key: GoRole; label: string; icon: LucideIcon; desc: string } = {
  key: "admin", label: "Admin", icon: ShieldCheck, desc: "Manage the platform",
};

export function RoleSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: user, isLoading } = useMe();
  const { go } = useGoToRole();
  const [busy, setBusy] = useState<GoRole | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = (user?.active_role ?? user?.role ?? "") as string;
  const available = user?.available_roles ?? (user?.role ? [user.role] : []);
  const anyBusy = busy != null;

  // Admin never appears in available_roles — the backend signals it separately
  // via can_be_admin so admins who switched away can always switch back.
  const canBeAdmin = !!user?.can_be_admin || active === "admin";
  const roles = canBeAdmin ? [ADMIN_ROLE, ...ROLES] : ROLES;

  // From the sidebar we do a full switch (reload into the role's workspace).
  // go() adds the role first if the account doesn't have it yet.
  const handleGo = (role: GoRole) => {
    setBusy(role);
    void go(role).finally(() => setBusy(null));
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !anyBusy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-[8px] border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[6px] bg-primary/10 flex items-center justify-center text-primary">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">Switch role</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Use one account across different roles
              </p>
            </div>
          </div>
          <button
            onClick={() => !anyBusy && onClose()}
            aria-label="Close"
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
            disabled={anyBusy}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            roles.map(({ key, label, icon: Icon, desc }) => {
              const isActive = key === active;
              // Admin is switchable (not addable) whenever the account holds it.
              const has = key === "admin" ? canBeAdmin : available.includes(key);
              const rowBusy = busy === key;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-3 rounded-[6px] border px-3 py-2.5 transition-colors",
                    isActive ? "border-primary/40 bg-primary/5" : "border-border/70",
                  )}
                >
                  <span className={cn(
                    "h-9 w-9 rounded-[6px] flex items-center justify-center border shrink-0",
                    isActive ? "bg-primary/15 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground",
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">{label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight truncate">{desc}</p>
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary shrink-0">
                      <Check className="h-3 w-3" /> Current
                    </span>
                  ) : has ? (
                    <button
                      onClick={() => handleGo(key)}
                      disabled={anyBusy}
                      className="h-8 px-3 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                      Switch
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGo(key)}
                      disabled={anyBusy}
                      className="h-8 px-3 rounded-[6px] border border-border text-[12px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Add & switch
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p className="px-5 pb-4 pt-1 text-[10px] text-muted-foreground">
          Switching signs you into the selected role and reloads the workspace.
        </p>
      </div>
    </div>
  );
}
