// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusFilter       = "all" | "active" | "pending" | "suspended" | "rejected";
export type ConsultationFilter = "all" | "online" | "in_person" | "both";
export type SortOption         = "name" | "joined-desc" | "joined-asc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "joined-desc", label: "Joined: Newest first" },
  { value: "joined-asc",  label: "Joined: Oldest first" },
  { value: "name",        label: "Name (A–Z)" },
];

export const CONSULTATION_LABELS: Record<string, string> = {
  online:    "Online",
  in_person: "In-person",
  both:      "Both",
};

export interface FilterState {
  search:            string;
  status:            StatusFilter;
  specialization:    string;
  consultation_type: ConsultationFilter;
  sort:              SortOption;
  page:              number;
}

export const INITIAL_FILTERS: FilterState = {
  search:            "",
  status:            "all",
  specialization:    "",
  consultation_type: "all",
  sort:              "joined-desc",
  page:              1,
};

// ─── Style maps ───────────────────────────────────────────────────────────────

export const statusStyle: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  suspended:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  rejected: "bg-muted text-muted-foreground border-border",
};

export const STATUS_DOT: Record<string, string> = {
  active:    "bg-emerald-500",
  pending:   "bg-amber-500",
  suspended: "bg-red-500",
  rejected:  "bg-muted-foreground",
};

export const consultationStyle: Record<string, string> = {
  online:    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  in_person: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  both:      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
