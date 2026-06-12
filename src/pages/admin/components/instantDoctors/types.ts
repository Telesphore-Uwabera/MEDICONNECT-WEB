import type { ApiDoctorConsultation } from "@/hooks/admin/use-doctor-insitant";

// ─── Filter / Sort types ──────────────────────────────────────────────────────

export type StatusFilter   = "all" | "active" | "inactive";
export type OverrideFilter = "all" | "overridden" | "base_rate";
export type InstantFilter  = "all" | "instant" | "non_instant";
export type SortOption     = "name" | "fee-asc" | "fee-desc";
export type PanelTab       = "details" | "override";

export interface FilterState {
  search: string;
  status: StatusFilter;
  override: OverrideFilter;
  instant: InstantFilter;
  sort: SortOption;
  page: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;

export const INITIAL_FILTERS: FilterState = {
  search: "", status: "all", override: "all", instant: "all", sort: "name", page: 1,
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name",     label: "Name (A–Z)" },
  { value: "fee-asc",  label: "Online fee: Low → High" },
  { value: "fee-desc", label: "Online fee: High → Low" },
];

// ─── Style maps ───────────────────────────────────────────────────────────────

export const activeStyle = {
  true:  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  false: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
} as const;

export const activeDot = {
  true:  "bg-emerald-500",
  false: "bg-red-500",
} as const;

export const instantStyle = {
  true:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  false: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/30 dark:text-slate-500 dark:border-slate-800",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function resolvedFee(c: ApiDoctorConsultation) {
  return {
    online:   c.online_fee_override   ?? c.specialization_fee?.online_fee   ?? null,
    inPerson: c.in_person_fee_override ?? c.specialization_fee?.in_person_fee ?? null,
  };
}

export function fmt(n: number | null) {
  return n === null ? "—" : n.toLocaleString() + " RWF";
}
