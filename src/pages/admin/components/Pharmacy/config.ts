import { useState, useCallback, useEffect, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
export type SortOption   = "name" | "joined-desc" | "joined-asc";

export interface FilterState {
  search: string;
  status: StatusFilter;
  city:   string;
  sort:   SortOption;
  page:   number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "joined-desc", label: "Joined: Newest first" },
  { value: "joined-asc",  label: "Joined: Oldest first" },
  { value: "name",        label: "Name (A–Z)" },
];

export const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  city:   "",
  sort:   "joined-desc",
  page:   1,
};

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
  active:    "bg-emerald-500",
  pending:   "bg-amber-500",
  suspended: "bg-red-500",
  rejected:  "bg-muted-foreground",
};

// ─── Utils ────────────────────────────────────────────────────────────────────

export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePharmacyFilters() {
  const [filters, setFilters]       = useState<FilterState>(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const set = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key !== "page" ? { page: 1 } : {}),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchInput("");
  }, []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  return { filters, set, clearAll, hasActiveFilters, searchInput, setSearchInput };
}
