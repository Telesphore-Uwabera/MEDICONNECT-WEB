import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useGetAdminPatients,
  useSuspendPatient,
  useActivatePatient,
  type ApiPatient,
} from "@/hooks/admin/use-admin-patients";
import { useToast } from "@/hooks/use-toast";
import {
  INITIAL_FILTERS,
  buildStatusCounts,
  getErrorMessage,
  type FilterState,
  type SortOption,
} from "./Types";

export function useManagePatients() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<ApiPatient | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  // Debounce search input into filters
  useEffect(() => {
    const timer = setTimeout(() => set("search", searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Lock body scroll when mobile filter sheet or panel is open
  useEffect(() => {
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  // ── Data ──
  const { data, isLoading, isError } = useGetAdminPatients({
    status: filters.status !== "all" ? filters.status : undefined,
    search: filters.search || undefined,
    page: filters.page,
  });

  const patients = data?.data ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 20;
  const totalPages = Math.ceil(total / perPage);

  const statusCounts = useMemo(() => buildStatusCounts(patients), [patients]);

  const sorted = useMemo(() => {
    return [...patients].sort((a, b) => {
      switch (filters.sort) {
        case "joined-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [patients, filters.sort]);

  // ── Filter helpers ──
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

  // ── Mutations ──
  const suspendMutation = useSuspendPatient();
  const activateMutation = useActivatePatient();
  const isActing = suspendMutation.isPending || activateMutation.isPending;

  const toggleStatus = useCallback(async (p: ApiPatient) => {
    try {
      if (p.status === "active") {
        await suspendMutation.mutateAsync(p.id);
        setSelected((prev) => prev ? { ...prev, status: "suspended" } : null);
      } else {
        await activateMutation.mutateAsync(p.id);
        setSelected((prev) => prev ? { ...prev, status: "active" } : null);
      }
      toast({ title: t("admin.users.status_changed") });
    } catch (error: unknown) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  }, [suspendMutation, activateMutation, t, toast]);

  return {
    // state
    filters, sorted, selected, setSelected,
    filterOpen, setFilterOpen,
    searchInput, setSearchInput,
    // derived
    total, totalPages, statusCounts, isActing,
    hasActiveFilters, pendingCount: statusCounts["pending"] ?? 0,
    // query state
    isLoading, isError,
    // actions
    set, clearAll, toggleStatus,
  };
}
