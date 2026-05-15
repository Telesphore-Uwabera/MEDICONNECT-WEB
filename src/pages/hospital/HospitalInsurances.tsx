import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Globe,
  Calendar,
  Star,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type InsuranceStatus = "active" | "pending" | "suspended" | "expired";
type InsuranceTier = "basic" | "standard" | "premium" | "enterprise";
type CoverageType = "inpatient" | "outpatient" | "both" | "emergency";

interface InsuranceProvider {
  id: string;
  name: string;
  code: string;
  status: InsuranceStatus;
  tier: InsuranceTier;
  coverageType: CoverageType;
  coveragePercent: number;
  contactEmail: string;
  contactPhone: string;
  website: string;
  contractStart: string;
  contractEnd: string;
  enrolledPatients: number;
  claimsProcessed: number;
  pendingClaims: number;
  preferredProvider: boolean;
  notes: string;
  createdAt: string;
}

interface FilterState {
  search: string;
  status: InsuranceStatus | "all";
  tier: InsuranceTier | "all";
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed data
// ─────────────────────────────────────────────────────────────────────────────
const SEED_INSURANCES: InsuranceProvider[] = [
  {
    id: "ins-001",
    name: "Rwanda Medical Aid Society",
    code: "RMAS-001",
    status: "active",
    tier: "enterprise",
    coverageType: "both",
    coveragePercent: 90,
    contactEmail: "contracts@rmas.rw",
    contactPhone: "+250788100001",
    website: "https://rmas.rw",
    contractStart: "2024-01-01",
    contractEnd: "2026-12-31",
    enrolledPatients: 4820,
    claimsProcessed: 1340,
    pendingClaims: 23,
    preferredProvider: true,
    notes: "Primary government scheme partner. Priority billing cycle",
    createdAt: "2024-01-01",
  },
  {
    id: "ins-002",
    name: "Radiant Health Insurance",
    code: "RHI-044",
    status: "active",
    tier: "premium",
    coverageType: "both",
    coveragePercent: 80,
    contactEmail: "hospital@radiant.co.rw",
    contactPhone: "+250788200002",
    website: "https://radiant.co.rw",
    contractStart: "2024-03-01",
    contractEnd: "2025-02-28",
    enrolledPatients: 2105,
    claimsProcessed: 780,
    pendingClaims: 14,
    preferredProvider: true,
    notes: "Strong corporate client base. Quarterly review meetings",
    createdAt: "2024-03-01",
  },
  {
    id: "ins-003",
    name: "Mutuelle de Santé",
    code: "MUSA-RW",
    status: "active",
    tier: "standard",
    coverageType: "outpatient",
    coveragePercent: 60,
    contactEmail: "partnerships@mutuelle.gov.rw",
    contactPhone: "+250788300003",
    website: "https://mutuelle.gov.rw",
    contractStart: "2023-07-01",
    contractEnd: "2025-06-30",
    enrolledPatients: 9340,
    claimsProcessed: 3200,
    pendingClaims: 67,
    preferredProvider: false,
    notes: "Community health program. High volume, lower margin",
    createdAt: "2023-07-01",
  },
  {
    id: "ins-004",
    name: "AfriCare Premium Plans",
    code: "ACP-22B",
    status: "pending",
    tier: "premium",
    coverageType: "inpatient",
    coveragePercent: 75,
    contactEmail: "network@africare.com",
    contactPhone: "+250788400004",
    website: "https://africare.com",
    contractStart: "2025-02-01",
    contractEnd: "2027-01-31",
    enrolledPatients: 0,
    claimsProcessed: 0,
    pendingClaims: 0,
    preferredProvider: false,
    notes: "Contract under legal review. Awaiting compliance clearance",
    createdAt: "2025-01-10",
  },
  {
    id: "ins-005",
    name: "Saham Insurance Rwanda",
    code: "SIR-009",
    status: "suspended",
    tier: "basic",
    coverageType: "emergency",
    coveragePercent: 50,
    contactEmail: "rw@saham.com",
    contactPhone: "+250788500005",
    website: "https://saham.rw",
    contractStart: "2023-01-01",
    contractEnd: "2024-12-31",
    enrolledPatients: 310,
    claimsProcessed: 88,
    pendingClaims: 5,
    preferredProvider: false,
    notes: "Suspended pending dispute resolution on claim #RW-4492",
    createdAt: "2023-01-01",
  },
];

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  tier: "all",
};

const EMPTY_FORM: Omit<
  InsuranceProvider,
  "id" | "createdAt" | "claimsProcessed" | "pendingClaims" | "enrolledPatients"
> = {
  name: "",
  code: "",
  status: "pending",
  tier: "standard",
  coverageType: "both",
  coveragePercent: 80,
  contactEmail: "",
  contactPhone: "",
  website: "",
  contractStart: "",
  contractEnd: "",
  preferredProvider: false,
  notes: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers & constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  InsuranceStatus,
  {
    label: string;
    icon: React.ElementType;
    badge: string;
    dot: string;
    pill: string;
  }
> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    pill: "bg-emerald-950/30 text-emerald-400 border-emerald-900",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    badge:
      "border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
    pill: "bg-amber-950/30 text-amber-400 border-amber-900",
  },
  suspended: {
    label: "Suspended",
    icon: AlertCircle,
    badge: "border-rose-400/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    pill: "bg-red-950/30 text-red-400 border-red-900",
  },
  expired: {
    label: "Expired",
    icon: X,
    badge: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    pill: "bg-muted/60 text-muted-foreground border-border",
  },
};

const TIER_CONFIG: Record<InsuranceTier, { label: string; badge: string }> = {
  basic: {
    label: "Basic",
    badge: "border-border bg-muted/60 text-muted-foreground",
  },
  standard: {
    label: "Standard",
    badge: "border-blue-400/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  premium: {
    label: "Premium",
    badge:
      "border-violet-400/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  enterprise: {
    label: "Enterprise",
    badge: "border-primary/30 bg-primary/10 text-primary",
  },
};

const COVERAGE_LABELS: Record<CoverageType, string> = {
  inpatient: "Inpatient",
  outpatient: "Outpatient",
  both: "In + Outpatient",
  emergency: "Emergency only",
};

const fmtNum = (n: number) => n.toLocaleString();
const fmtDate = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("en-RW", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const isExpiringSoon = (end: string) => {
  if (!end) return false;
  const diff = new Date(end).getTime() - Date.now();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared sidebar atoms — mirrors HospitalAppointments
// ─────────────────────────────────────────────────────────────────────────────
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-sm text-[11px] border transition-all duration-200 text-left",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-soft flex items-start gap-3">
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          accent
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-xl font-semibold tabular-nums truncate mt-0.5",
            accent ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form field wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage bar
// ─────────────────────────────────────────────────────────────────────────────
function CoverageBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-400";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-foreground shrink-0">
        {pct}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / Edit modal
// ─────────────────────────────────────────────────────────────────────────────
function InsuranceModal({
  mode,
  initial,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: Partial<InsuranceProvider>;
  onSave: (data: Partial<InsuranceProvider>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<InsuranceProvider>>({
    ...EMPTY_FORM,
    ...initial,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof InsuranceProvider, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = "Required";
    if (!form.code?.trim()) e.code = "Required";
    if (!form.contactEmail?.trim()) e.contactEmail = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(form.contactEmail))
      e.contactEmail = "Invalid email";
    if (!form.contractStart) e.contractStart = "Required";
    if (!form.contractEnd) e.contractEnd = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-large overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {mode === "add"
                  ? "Add Insurance Provider"
                  : "Edit Insurance Provider"}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {mode === "add"
                  ? "Register a new insurance partner"
                  : `Editing ${initial.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />{" "}
              Provider identity
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Provider name"
                error={errors.name}
                className="col-span-2"
              >
                <Input
                  value={form.name ?? ""}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Rwanda Medical Aid Society"
                  className="h-9 text-xs border-border focus-visible:ring-primary"
                />
              </Field>
              <Field label="Provider code" error={errors.code}>
                <Input
                  value={form.code ?? ""}
                  onChange={(e) => set("code", e.target.value)}
                  placeholder="RMAS-001"
                  className="h-9 text-xs border-border focus-visible:ring-primary font-mono"
                />
              </Field>
              <Field label="Tier">
                <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
                  <SelectTrigger className="h-9 text-xs border-border focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "basic",
                        "standard",
                        "premium",
                        "enterprise",
                      ] as InsuranceTier[]
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIER_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v)}
                >
                  <SelectTrigger className="h-9 text-xs border-border focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "active",
                        "pending",
                        "suspended",
                        "expired",
                      ] as InsuranceStatus[]
                    ).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Coverage type">
                <Select
                  value={form.coverageType}
                  onValueChange={(v) => set("coverageType", v)}
                >
                  <SelectTrigger className="h-9 text-xs border-border focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "inpatient",
                        "outpatient",
                        "both",
                        "emergency",
                      ] as CoverageType[]
                    ).map((c) => (
                      <SelectItem key={c} value={c}>
                        {COVERAGE_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label={`Coverage % (${form.coveragePercent ?? 80}%)`}
                className="col-span-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={form.coveragePercent ?? 80}
                    onChange={(e) =>
                      set("coveragePercent", Number(e.target.value))
                    }
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs font-semibold tabular-nums text-primary w-9 text-right">
                    {form.coveragePercent}%
                  </span>
                </div>
              </Field>
              <div className="col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Preferred provider
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Shown first in patient plan selection
                  </p>
                </div>
                <Switch
                  checked={form.preferredProvider ?? false}
                  onCheckedChange={(v) => set("preferredProvider", v)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />{" "}
              Contact information
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Email"
                error={errors.contactEmail}
                className="col-span-2"
              >
                <Input
                  type="email"
                  value={form.contactEmail ?? ""}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  placeholder="contracts@provider.rw"
                  className="h-9 text-xs border-border focus-visible:ring-primary"
                />
              </Field>
              <Field label="Phone">
                <Input
                  type="tel"
                  value={form.contactPhone ?? ""}
                  onChange={(e) => set("contactPhone", e.target.value)}
                  placeholder="+250788100001"
                  className="h-9 text-xs border-border focus-visible:ring-primary"
                />
              </Field>
              <Field label="Website">
                <Input
                  type="url"
                  value={form.website ?? ""}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://provider.rw"
                  className="h-9 text-xs border-border focus-visible:ring-primary"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />{" "}
              Contract period
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" error={errors.contractStart}>
                <Input
                  type="date"
                  value={form.contractStart ?? ""}
                  onChange={(e) => set("contractStart", e.target.value)}
                  className="h-9 text-xs border-border focus-visible:ring-primary"
                />
              </Field>
              <Field label="End date" error={errors.contractEnd}>
                <Input
                  type="date"
                  value={form.contractEnd ?? ""}
                  onChange={(e) => set("contractEnd", e.target.value)}
                  className="h-9 text-xs border-border focus-visible:ring-primary"
                />
              </Field>
              <Field label="Notes" className="col-span-2">
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any additional notes about this partnership…"
                  rows={3}
                  className="w-full rounded-md border border-border bg-background text-xs px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/30">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {mode === "add" ? "Add provider" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expanded row detail
// ─────────────────────────────────────────────────────────────────────────────
function ExpandedRow({ ins }: { ins: InsuranceProvider }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-4 bg-muted/30 border-t border-border">
      <div className="space-y-0.5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Contact
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-foreground truncate">
            {ins.contactEmail}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-foreground font-mono">
            {ins.contactPhone}
          </span>
        </div>
        {ins.website && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
            <a
              href={ins.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline truncate"
            >
              {ins.website.replace("https://", "")}
            </a>
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Contract
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-foreground">
            {fmtDate(ins.contractStart)} → {fmtDate(ins.contractEnd)}
          </span>
        </div>
        {isExpiringSoon(ins.contractEnd) && (
          <div className="inline-flex items-center gap-1 mt-1 rounded-full bg-amber-500/10 border border-amber-400/30 px-2 py-0.5">
            <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              Expiring soon
            </span>
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Claims
        </p>
        <div className="mt-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Processed</span>
            <span className="text-[11px] font-semibold text-foreground tabular-nums">
              {fmtNum(ins.claimsProcessed)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Pending</span>
            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums",
                ins.pendingClaims > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground",
              )}
            >
              {ins.pendingClaims}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          Notes
        </p>
        <p className="text-[11px] text-foreground leading-relaxed mt-1">
          {ins.notes || "No notes"}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
function HospitalInsurances() {
  const { t } = useTranslation();
  const [insurances, setInsurances] =
    useState<InsuranceProvider[]>(SEED_INSURANCES);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sortKey, setSortKey] = useState<
    "name" | "enrolledPatients" | "coveragePercent" | "contractEnd"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    mode: "add" | "edit";
    data: Partial<InsuranceProvider>;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () =>
      filters.search !== "" ||
      filters.status !== "all" ||
      filters.tier !== "all",
    [filters],
  );

  // Lock body scroll when mobile filter drawer is open
  useEffect(() => {
    if (filterOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filterOpen]);

  // ── Derived stats ──
  const stats = useMemo(
    () => ({
      total: insurances.length,
      active: insurances.filter((i) => i.status === "active").length,
      totalPatients: insurances.reduce((s, i) => s + i.enrolledPatients, 0),
      pendingClaims: insurances.reduce((s, i) => s + i.pendingClaims, 0),
      avgCoverage: Math.round(
        insurances.reduce((s, i) => s + i.coveragePercent, 0) /
          (insurances.length || 1),
      ),
    }),
    [insurances],
  );

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    let list = [...insurances];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q),
      );
    }
    if (filters.status !== "all")
      list = list.filter((i) => i.status === filters.status);
    if (filters.tier !== "all")
      list = list.filter((i) => i.tier === filters.tier);
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp =
        typeof va === "string"
          ? va.localeCompare(vb as string)
          : (va as number) - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [insurances, filters, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : null;

  // ── CRUD ──
  const handleSave = (data: Partial<InsuranceProvider>) => {
    if (modal?.mode === "add") {
      const newEntry: InsuranceProvider = {
        ...EMPTY_FORM,
        ...data,
        id: `ins-${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
        enrolledPatients: 0,
        claimsProcessed: 0,
        pendingClaims: 0,
      } as InsuranceProvider;
      setInsurances((prev) => [newEntry, ...prev]);
    } else {
      setInsurances((prev) =>
        prev.map((ins) =>
          ins.id === data.id ? ({ ...ins, ...data } as InsuranceProvider) : ins,
        ),
      );
    }
    setModal(null);
  };

  const handleDelete = (id: string) => {
    setInsurances((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  };

  // ── Sidebar content — shared between desktop rail and mobile drawer ──
  const sidebarContent = (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">
            Filters
          </span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<InsuranceStatus | "all">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
              { value: "suspended", label: "Suspended" },
              { value: "expired", label: "Expired" },
            ]}
          />
        </FilterSection>

        <FilterSection title="Tier">
          <PillGroup<InsuranceTier | "all">
            value={filters.tier}
            onChange={(v) => set("tier", v)}
            options={[
              { value: "all", label: "All tiers" },
              { value: "enterprise", label: "Enterprise" },
              { value: "premium", label: "Premium" },
              { value: "standard", label: "Standard" },
              { value: "basic", label: "Basic" },
            ]}
          />
        </FilterSection>
      </div>
    </>
  );

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title="Insurance Partners"
          subtitle="Manage insurance providers, contracts, and coverage agreements"
        />

        {/* ── Stats ── */}
        <div className="px-6 pt-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard
              icon={Shield}
              label="Total providers"
              value={stats.total}
              accent
            />
            <StatCard
              icon={CheckCircle2}
              label="Active"
              value={stats.active}
              sub={`${stats.total - stats.active} inactive`}
            />
            <StatCard
              icon={Users}
              label="Enrolled patients"
              value={fmtNum(stats.totalPatients)}
              sub="across all plans"
            />
            <StatCard
              icon={AlertCircle}
              label="Pending claims"
              value={stats.pendingClaims}
              sub="awaiting processing"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg. coverage"
              value={`${stats.avgCoverage}%`}
              sub="across active plans"
            />
          </div>
        </div>

        {/* ── Body: sidebar + results ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-r border-border/60 bg-card/50 overflow-y-auto">
            {sidebarContent}
          </aside>

          {/* Mobile overlay: backdrop */}
          <div
            onClick={() => setFilterOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
              filterOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
          />

          {/* Mobile overlay: bottom-sheet drawer */}
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 md:hidden",
              "bg-card rounded-t-2xl border-t border-border",
              "max-h-[85dvh] flex flex-col overflow-hidden",
              "transition-transform duration-300 ease-out",
              filterOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="overflow-y-auto flex-1">{sidebarContent}</div>
            <div className="flex-shrink-0 px-4 py-4 border-t border-border">
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors"
              >
                Show results
              </button>
            </div>
          </div>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto">
            {/* Sticky meta bar */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  {filtered.length === 1 ? "provider" : "providers"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset filters
                    </button>
                  )}
                </p>

                {stats.pendingClaims > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {stats.pendingClaims} pending claims
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Desktop search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Search by name or code…"
                    className="w-52 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                </div>

                {/* Add provider button */}
                <Button
                  onClick={() => setModal({ mode: "add", data: {} })}
                  className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add provider
                </Button>

                {/* Mobile filter button */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className={cn(
                    "md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[11px] transition-colors",
                    hasActiveFilters
                      ? "bg-primary text-white border-primary"
                      : "border-border/60 text-muted-foreground bg-card",
                  )}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-soft">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
                  {[
                    { key: "name" as const, label: "Provider" },
                    { key: null, label: "Status / Tier" },
                    { key: "coveragePercent" as const, label: "Coverage" },
                    { key: "enrolledPatients" as const, label: "Patients" },
                    { key: "contractEnd" as const, label: "Contract end" },
                    { key: null, label: "" },
                  ].map(({ key, label }, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                        key
                          ? "cursor-pointer select-none hover:text-foreground"
                          : "",
                      )}
                      onClick={() => key && toggleSort(key)}
                    >
                      {label}
                      {key && <SortIcon k={key} />}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <Shield className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">
                      No insurance providers match your filters.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs mt-1"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((ins) => {
                      const statusCfg = STATUS_CONFIG[ins.status];
                      const tierCfg = TIER_CONFIG[ins.tier];
                      const isExpanded = expanded === ins.id;
                      const expiring = isExpiringSoon(ins.contractEnd);

                      return (
                        <li key={ins.id}>
                          <div
                            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() =>
                              setExpanded(isExpanded ? null : ins.id)
                            }
                          >
                            {/* Provider name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  statusCfg.dot,
                                )}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-foreground truncate">
                                    {ins.name}
                                  </p>
                                  {ins.preferredProvider && (
                                    <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {ins.code}
                                </p>
                              </div>
                            </div>

                            {/* Status / Tier */}
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] w-fit",
                                  statusCfg.badge,
                                )}
                              >
                                {statusCfg.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] w-fit",
                                  tierCfg.badge,
                                )}
                              >
                                {tierCfg.label}
                              </Badge>
                            </div>

                            {/* Coverage */}
                            <div className="pr-2">
                              <CoverageBar pct={ins.coveragePercent} />
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {COVERAGE_LABELS[ins.coverageType]}
                              </p>
                            </div>

                            {/* Patients */}
                            <div>
                              <p className="text-xs font-semibold tabular-nums text-foreground">
                                {fmtNum(ins.enrolledPatients)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                enrolled
                              </p>
                            </div>

                            {/* Contract end */}
                            <div>
                              <p
                                className={cn(
                                  "text-xs font-medium",
                                  expiring
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-foreground",
                                )}
                              >
                                {fmtDate(ins.contractEnd)}
                              </p>
                              {expiring && (
                                <p className="text-[10px] text-amber-500">
                                  Expiring soon
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  setModal({ mode: "edit", data: ins })
                                }
                                className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {deleteConfirm === ins.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(ins.id)}
                                    className="text-[10px] font-semibold text-destructive hover:underline px-1"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="text-[10px] text-muted-foreground hover:underline px-1"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(ins.id)}
                                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && <ExpandedRow ins={ins} />}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Table footer */}
                {filtered.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
                    <p className="text-[10px] text-muted-foreground">
                      Showing {filtered.length} of {insurances.length} providers
                    </p>
                    <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      <Download className="h-3 w-3" /> Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <InsuranceModal
          mode={modal.mode}
          initial={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </DashboardLayout>
  );
}

export default HospitalInsurances;
