import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  Department,
  DepartmentFilters,
  DepartmentPayload,
  Service,
  ServicePayload,
} from "@/types/Hospital";

const DEPT_BASE = "/hospital/departments";
const SVC_BASE = "/hospital/services";

// ─── Query Keys ───────────────────────────────────────────────────────────────


export const deptKeys = {
  all: ["hospital-departments"] as const,
  list: (filters?: DepartmentFilters) =>
    [...deptKeys.all, "list", filters ?? {}] as const,
  detail: (id: number) => [...deptKeys.all, "detail", id] as const,
};

export const svcKeys = {
  all: ["hospital-services"] as const,
  byDept: (departmentId: number) =>
    [...svcKeys.all, "dept", departmentId] as const,
  detail: (id: number) => [...svcKeys.all, "detail", id] as const,
};

// ─── Departments ──────────────────────────────────────────────────────────────

export function useGetDepartments(filters?: DepartmentFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.is_emergency !== undefined)
    params.set("is_emergency", String(filters.is_emergency));
  if (filters?.floor) params.set("floor", filters.floor);
  if (filters?.active_only !== undefined)
    params.set("active_only", String(filters.active_only));
  if (filters?.sort_by) params.set("sort_by", filters.sort_by);
  if (filters?.sort_dir) params.set("sort_dir", filters.sort_dir);

  const qs = params.toString();
  const url = qs ? `${DEPT_BASE}?${qs}` : DEPT_BASE;

  return useQuery({
    queryKey: deptKeys.list(filters),
    queryFn: () =>
      apiFetch<{ departments: Department[] }>(url).then((r) => r.departments),
  });
}

export function useGetDepartment(id: number | null) {
  return useQuery({
    queryKey: deptKeys.detail(id!),
    queryFn: () =>
      apiFetch<{ department: Department }>(`${DEPT_BASE}/${id}`).then(
        (r) => r.department,
      ),
    enabled: id !== null,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DepartmentPayload) =>
      apiFetch<{ message: string; department: Department }>(DEPT_BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deptKeys.all });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<DepartmentPayload>;
    }) =>
      apiFetch<{ message: string; department: Department }>(
        `${DEPT_BASE}/${id}`,
        { method: "PUT", body: payload },
      ),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: deptKeys.all });
      qc.invalidateQueries({ queryKey: deptKeys.detail(id) });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`${DEPT_BASE}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deptKeys.all });
    },
  });
}

// ─── Services ─────────────────────────────────────────────────────────────────

export function useGetServicesByDepartment(departmentId: number | null) {
  return useQuery({
    queryKey: svcKeys.byDept(departmentId!),
    queryFn: () =>
      apiFetch<{ services: Service[] }>(
        `${SVC_BASE}?department_id=${departmentId}`,
      ).then((r) => r.services),
    enabled: departmentId !== null,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServicePayload) =>
      apiFetch<{ message: string; service: Service }>(SVC_BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: svcKeys.byDept(payload.department_id) });
      qc.invalidateQueries({ queryKey: deptKeys.detail(payload.department_id) });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      departmentId,
      payload,
    }: {
      id: number;
      departmentId: number;
      payload: Partial<ServicePayload>;
    }) =>
      apiFetch<{ message: string; service: Service }>(`${SVC_BASE}/${id}`, {
        method: "PUT",
        body: payload,
      }),
    onSuccess: (_, { departmentId }) => {
      qc.invalidateQueries({ queryKey: svcKeys.byDept(departmentId) });
      qc.invalidateQueries({ queryKey: deptKeys.detail(departmentId) });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      departmentId,
    }: {
      id: number;
      departmentId: number;
    }) =>
      apiFetch<{ message: string }>(`${SVC_BASE}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_, { departmentId }) => {
      qc.invalidateQueries({ queryKey: svcKeys.byDept(departmentId) });
      qc.invalidateQueries({ queryKey: deptKeys.detail(departmentId) });
    },
  });
}
