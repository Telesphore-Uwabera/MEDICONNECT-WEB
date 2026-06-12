import type { ApiPatient } from "@/hooks/admin/use-admin-patients";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
export type SortOption = "name" | "joined-desc" | "joined-asc";

export interface FilterState {
  search: string;
  status: StatusFilter;
  sort: SortOption;
  page: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "joined-desc", label: "Joined: Newest first" },
  { value: "joined-asc", label: "Joined: Oldest first" },
  { value: "name", label: "Name (A–Z)" },
];

export const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  sort: "joined-desc",
  page: 1,
};

// ─── Style maps ───────────────────────────────────────────────────────────────

export const STATUS_STYLE: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  suspended:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  rejected: "bg-muted text-muted-foreground border-border",
};

export const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  suspended: "bg-red-500",
  rejected: "bg-muted-foreground",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function formatDob(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function calcAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} yrs`;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function buildStatusCounts(patients: ApiPatient[]): Record<string, number> {
  const counts: Record<string, number> = {};
  patients.forEach((p) => {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  });
  return counts;
}
