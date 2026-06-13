import type { AppointmentApiStatus, AppointmentApiType } from "@/hooks/doctor/use-doctor-appointment";

export type UIStatus   = "pending" | "confirmed" | "in_progress" | "completed";
export type ViewMode   = "table" | "cards";
export type SortOption = "date-asc" | "date-desc" | "name";
export type TabId      = "appointments" | "instant" | "bookings";

export interface FilterState {
  search:   string;
  status:   AppointmentApiStatus | "All";
  type:     AppointmentApiType   | "All";
  date:     string;
  today:    boolean;
  upcoming: boolean;
  sort:     SortOption;
}

export const INITIAL_FILTERS: FilterState = {
  search: "", status: "All", type: "All",
  date: "", today: false, upcoming: false,
  sort: "date-asc",
};

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "date-asc",  label: "Date: Soonest first" },
  { value: "date-desc", label: "Date: Latest first"  },
  { value: "name",      label: "Patient name (A–Z)"  },
];

export const STATUS_STYLES: Record<UIStatus, string> = {
  pending:     "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950/30  dark:text-amber-400  dark:border-amber-900",
  confirmed:   "bg-sky-50    text-sky-700    border-sky-200    dark:bg-sky-950/30    dark:text-sky-400    dark:border-sky-900",
  in_progress: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
};

export const STATUS_DOT: Record<UIStatus, string> = {
  pending:     "bg-amber-500",
  confirmed:   "bg-sky-500",
  in_progress: "bg-violet-500",
  completed:   "bg-emerald-500",
};

export const DELAY_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
