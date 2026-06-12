import type { ApiHospital } from "@/hooks/admin/use-admin-hospitals";

// ─── Filter types ──────────────────────────────────────────────────────────────

export type StatusFilter = "all" | "active" | "pending" | "suspended" | "rejected";
export type TypeFilter   = "all" | "private" | "public" | "ngo";
export type SortOption   = "name" | "joined-desc" | "joined-asc";

export interface FilterState {
  search: string;
  status: StatusFilter;
  type:   TypeFilter;
  sort:   SortOption;
  page:   number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "joined-desc", label: "Joined: Newest first" },
  { value: "joined-asc",  label: "Joined: Oldest first" },
  { value: "name",        label: "Name (A–Z)" },
];

export const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  type:   "all",
  sort:   "joined-desc",
  page:   1,
};

// ─── Panel action props ────────────────────────────────────────────────────────

export interface HospitalPanelProps {
  hospital:  ApiHospital | null;
  onClose:   () => void;
  onApprove: (h: ApiHospital) => void;
  onReject:  (h: ApiHospital) => void;
  onSuspend: (h: ApiHospital) => void;
  isActing:  boolean;
}
