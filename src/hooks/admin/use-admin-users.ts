import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/users";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  country_code?: string;
  phone_verified_at?: string | null;
  email_verified_at?: string | null;
  is_verified?: boolean;
  status: "active" | "pending" | "suspended" | "rejected";
  roles: { id: number; name: string }[];
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  avatar?: string | null;
  preferred_language?: string;
}

export interface AdminUsersResponse {
  current_page: number;
  data: ApiUser[];
  per_page: number;
  total: number;
}

export interface AdminUsersParams {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  enabled?: boolean;
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  phone?: string;
  country_code?: string;
  role: string;
  gender?: string;
  preferred_language?: string;
}

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status?: "active" | "pending" | "suspended" | "rejected";
  roles: { id: number; name: string }[];
  created_at?: string;
}

export interface StaffResponse {
  current_page: number;
  data: StaffUser[];
  total: number;
  per_page?: number;
}

export interface StaffParams {
  role?: string;
  search?: string;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  role: "moderator" | "finance" | "help_desk";
}

export interface AdminRole {
  id: number;
  name: string;
}

export interface AdminPermission {
  id: number;
  name: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useGetAdminUsers(params?: AdminUsersParams) {
  const query = new URLSearchParams();
  if (params?.role)   query.set("role",   params.role);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  query.set("page", String(params?.page ?? 1));
  query.set("per_page", "10");

  const queryString = query.toString();

  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () =>
      apiFetch<AdminUsersResponse>(`${BASE}${queryString ? `?${queryString}` : ""}`).then(
        (res) => { 
          return res;
        }
      ),
    enabled: params?.enabled ?? true,
  });
}

export interface DirectoryStatusCounts {
  active: number | null;
  pending: number | null;
  suspended: number | null;
  rejected: number | null;
}

const PROFILE_LIST: Record<string, string> = {
  patient: "/admin/patients",
  doctor: "/admin/doctors",
  hospital: "/admin/hospitals",
  pharmacy: "/admin/pharmacies",
};

function shownStatus(value: unknown): ApiUser["status"] {
  const status = String(value || "active").toLowerCase();
  if (status === "approved") return "active";
  if (status === "submitted" || status === "action_requested") return "pending";
  if (status === "pending" || status === "suspended" || status === "rejected" || status === "active") return status;
  return "active";
}

function directoryUser(role: string, row: Record<string, any>): ApiUser {
  const account = row.user && typeof row.user === "object" ? row.user : {};
  const nested = row.patient && typeof row.patient === "object" ? row.patient : {};
  return {
    id: Number(account.id || row.user_id || nested.user_id || row.id),
    name: String(account.name || row.name || row.name_en || row.name_rw || "Account"),
    email: String(account.email || row.email || ""),
    phone: String(account.phone || row.phone || ""),
    country_code: account.country_code || row.country_code || undefined,
    status: shownStatus(nested.status || row.status || account.status),
    roles: [{ id: 0, name: role }],
    created_at: row.created_at || account.created_at || "",
    avatar: account.avatar || row.avatar || row.image || row.logo || null,
  };
}

function collectRoleNames(row: Record<string, any>): string[] {
  const names: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === "string") {
      const name = value.trim().toLowerCase();
      if (name) names.push(name);
      return;
    }
    if (value && typeof value === "object") {
      const named = value as { name?: unknown; role?: unknown };
      if (typeof named.name === "string") add(named.name);
      else if (typeof named.role === "string") add(named.role);
    }
  };
  if (Array.isArray(row.roles)) row.roles.forEach(add);
  if (Array.isArray(row.available_roles)) row.available_roles.forEach(add);
  add(row.role);
  add(row.active_role);
  add(row.role_name);
  if (row.can_be_admin) names.push("admin");
  return [...new Set(names)];
}

function accountId(row: Record<string, any>): number {
  const account = row.user && typeof row.user === "object" ? row.user : {};
  const nested = row.patient && typeof row.patient === "object" ? row.patient : {};
  return Number(account.id || row.user_id || nested.user_id || row.id) || 0;
}

type ProfileRoleIndex = { byId: Map<number, string[]>; byEmail: Map<string, string[]> };

/** The users list often omits roles. Profile lists are what define patient, doctor, facility, and pharmacy. */
async function loadProfileRoles(): Promise<ProfileRoleIndex> {
  const byId = new Map<number, string[]>();
  const byEmail = new Map<string, string[]>();
  const add = (key: number | string, role: string, target: Map<number | string, string[]>) => {
    if (!key) return;
    const current = target.get(key) ?? [];
    if (!current.includes(role)) current.push(role);
    target.set(key, current);
  };
  const sources = [
    ["/admin/patients", "patient"],
    ["/admin/doctors", "doctor"],
    ["/admin/hospitals", "hospital"],
    ["/admin/pharmacies", "pharmacy"],
  ] as const;
  await Promise.all(sources.map(async ([path, role]) => {
    for (let page = 1; page <= 8; page += 1) {
      let res: { data: unknown[] };
      try {
        res = unwrapPage(await apiFetch(`${path}?page=${page}&per_page=100`));
      } catch {
        break;
      }
      for (const row of res.data as Record<string, any>[]) {
        add(accountId(row), role, byId);
        const email = String(row.email || row.user?.email || "").trim().toLowerCase();
        if (email) add(email, role, byEmail);
      }
      if (res.data.length < 100) break;
    }
  }));
  return { byId, byEmail };
}

function withKnownRoles(row: Record<string, any>, known?: ProfileRoleIndex): ApiUser {
  const own = collectRoleNames(row);
  const email = String(row.email || "").trim().toLowerCase();
  const extra = [
    ...(known?.byId.get(Number(row.id)) ?? []),
    ...(known?.byId.get(accountId(row)) ?? []),
    ...(email ? known?.byEmail.get(email) ?? [] : []),
  ];
  const names = [...new Set([...own, ...extra])];
  return { ...(row as ApiUser), roles: names.map((name, index) => ({ id: index, name })) };
}

function unwrapPage(res: { data?: unknown; total?: number; per_page?: number }) {
  const nested = res?.data && !Array.isArray(res.data) && typeof res.data === "object"
    ? res.data as { data?: unknown; total?: number; per_page?: number }
    : null;
  const page = nested && Array.isArray(nested.data) ? nested : res;
  const data = Array.isArray(page.data) ? page.data : [];
  return {
    data,
    total: Number(page.total ?? 0),
    per_page: Number(page.per_page ?? 10),
  };
}

/** One count per account. Deleted rows are not users we still have. */
async function countSystemUsers(): Promise<DirectoryStatusCounts & { total: number }> {
  const byId = new Map<number, ApiUser["status"]>();
  const take = (rows: Array<Record<string, unknown>>) => {
    for (const row of rows) {
      if (row?.deleted_at) continue;
      const id = Number(row?.id);
      if (!Number.isFinite(id) || id <= 0 || byId.has(id)) continue;
      byId.set(id, shownStatus(row.status));
    }
  };
  const first = unwrapPage(await apiFetch("/admin/users?page=1&per_page=100"));
  take(first.data as Array<Record<string, unknown>>);
  const pageSize = first.data.length || 100;
  const reported = first.total || first.data.length;
  const pages = pageSize > 0 ? Math.ceil(reported / pageSize) : 1;
  const rest: number[] = [];
  for (let page = 2; page <= pages && page <= 120; page += 1) rest.push(page);
  for (let index = 0; index < rest.length; index += 6) {
    const batch = rest.slice(index, index + 6);
    const pagesData = await Promise.all(batch.map(async (page) => {
      try {
        return unwrapPage(await apiFetch(`/admin/users?page=${page}&per_page=100`));
      } catch {
        return { data: [], total: 0, per_page: pageSize };
      }
    }));
    for (const page of pagesData) take(page.data as Array<Record<string, unknown>>);
  }
  const counts = { total: byId.size, active: 0, pending: 0, suspended: 0, rejected: 0 };
  for (const status of byId.values()) {
    if (status === "pending") counts.pending += 1;
    else if (status === "suspended") counts.suspended += 1;
    else if (status === "rejected") counts.rejected += 1;
    else counts.active += 1;
  }
  return counts;
}

async function readTotal(path: string, query: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  qs.set("page", "1");
  qs.set("per_page", "1");
  try {
    const page = unwrapPage(await apiFetch(`${path}?${qs.toString()}`));
    return page.total;
  } catch {
    return null;
  }
}

async function statusBreakdown(
  path: string,
  base: Record<string, string | undefined>,
  profile: boolean,
): Promise<DirectoryStatusCounts> {
  const read = (status?: string) => readTotal(path, { ...base, status });
  const [all, active, approved, pending, submitted, suspended, rejected] = await Promise.all([
    read(),
    read("active"),
    profile ? read("approved") : Promise.resolve(-1),
    read("pending"),
    profile ? read("submitted") : Promise.resolve(-1),
    read("suspended"),
    read("rejected"),
  ]);
  if ([all, active, pending, suspended, rejected].some((count) => count == null)) {
    return { active: null, pending: null, suspended: null, rejected: null };
  }
  const ignored = [active, pending, suspended, rejected].every((count) => count === all);
  if (ignored) return { active: null, pending: null, suspended: null, rejected: null };
  const extra = (count: number, sameAs: number) =>
    count > 0 && count !== all && count !== sameAs ? count : 0;
  return {
    active: active + extra(approved, active),
    pending: pending + extra(submitted, pending),
    suspended,
    rejected,
  };
}

/** Tab totals and the visible page each come from the list that defines that tab. */
export function useUserDirectory(params: {
  role: "all" | "patient" | "doctor" | "hospital" | "pharmacy" | "admin" | "staff";
  status?: string;
  search?: string;
  page?: number;
  enabled?: boolean;
}) {
  const role = params.role;
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const search = params.search || undefined;
  const page = params.page ?? 1;
  const enabled = params.enabled ?? true;
  const qc = useQueryClient();
  const path = role === "staff" ? "/admin/staff" : PROFILE_LIST[role] || "/admin/users";
  const profile = Boolean(PROFILE_LIST[role]);
  const baseQuery: Record<string, string | undefined> = profile ? {} : role === "admin" ? { role: "admin" } : {};

  const list = useQuery({
    queryKey: ["admin-directory", role, status ?? "all", search ?? "", page, "with-roles"],
    enabled,
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(baseQuery).forEach(([key, value]) => {
        if (value) qs.set(key, value);
      });
      if (status) qs.set("status", status);
      if (search) qs.set("search", search);
      qs.set("page", String(page));
      qs.set("per_page", "10");
      const pageResult = unwrapPage(await apiFetch(`${path}?${qs.toString()}`));
      const known = profile ? null : await qc.fetchQuery({
        queryKey: ["admin-profile-roles"],
        staleTime: 60_000,
        queryFn: loadProfileRoles,
      });
      return {
        ...pageResult,
        data: profile
          ? pageResult.data.map((row) => directoryUser(role, row as Record<string, any>))
          : pageResult.data.map((row) => withKnownRoles(row as Record<string, any>, known)),
      };
    },
  });

  const roleTotals = useQuery({
    queryKey: ["admin-directory-roles", "by-status"],
    enabled: true,
    staleTime: 30_000,
    queryFn: async () => {
      const [census, patient, doctor, hospital, pharmacy, admin] = await Promise.all([
        countSystemUsers().catch(async () => {
          const total = await readTotal("/admin/users", {});
          return { total, active: null, pending: null, suspended: null, rejected: null };
        }),
        readTotal("/admin/patients", {}),
        readTotal("/admin/doctors", {}),
        readTotal("/admin/hospitals", {}),
        readTotal("/admin/pharmacies", {}),
        readTotal("/admin/users", { role: "admin" }),
      ]);
      const all = census.total;
      const roleFilterIgnored = (count: number | null) => all != null && all > 20 && count === all;
      return {
        all,
        patient,
        doctor,
        hospital,
        pharmacy,
        admin: roleFilterIgnored(admin) ? null : admin,
        systemStatus: {
          active: census.active,
          pending: census.pending,
          suspended: census.suspended,
          rejected: census.rejected,
        },
      };
    },
  });

  const statusTotals = useQuery({
    queryKey: ["admin-directory-status", role, search ?? ""],
    enabled: enabled && role !== "all",
    queryFn: () => statusBreakdown(path, { ...baseQuery, search }, profile),
  });

  return {
    data: list.data,
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: () => Promise.all([list.refetch(), roleTotals.refetch(), statusTotals.refetch()]),
    roleCounts: (roleTotals.data ?? {}) as Record<string, number | null>,
    statusCounts: (role === "all" ? roleTotals.data?.systemStatus : statusTotals.data) ?? { active: null, pending: null, suspended: null, rejected: null },
  };
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminUserPayload) =>
      apiFetch<{ message: string; user: ApiUser }>(BASE, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: number | { id: number; reason?: string }) => {
      const id = typeof input === "number" ? input : input.id;
      const reason = typeof input === "number" ? undefined : input.reason;
      return apiFetch(`${BASE}/${id}/suspend`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}/activate`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

// ─── Credential & session management ─────────────────────────────────────────
// Backend contract (agreed frontend-first; implement these routes to match):
//   POST /admin/users/{id}/reset-password      → { message, temporary_password? }
//        If the backend generates a temporary password it returns it ONCE here;
//        otherwise it emails the user a reset link/OTP and returns { message }.
//   POST /admin/users/{id}/revoke-sessions     → { message }
//        Revokes every active token for the user (they must sign in again).
//   POST /admin/users/{id}/resend-verification → { message }
//        body: { channel: "email" | "phone" } — re-sends the verification.
//   PUT  /admin/staff/{id}/password            → { message }
//        body: { password, password_confirmation } — admin sets a new staff
//        password directly (staff passwords are always admin-managed).

export interface ResetPasswordResponse {
  message: string;
  /** Present when the backend generates a temporary password instead of
   *  emailing a reset link — display it once to the admin. */
  temporary_password?: string;
}

// POST /admin/users/{id}/reset-credentials
// body: at least one of { email, phone, country_code, password } — password
// alone, email+phone together, or all four at once are all valid.
// Response: { message, user: {...}, changes: ("email"|"phone"|"password")[] }
export interface ResetUserCredentialsPayload {
  email?: string;
  phone?: string;
  country_code?: string;
  password?: string;
}

export interface ResetUserCredentialsResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    country_code?: string;
  };
  changes: string[];
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ResetUserCredentialsPayload }) =>
      apiFetch<ResetUserCredentialsResponse>(`${BASE}/${id}/reset-credentials`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useRevokeUserSessions() {
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ message: string }>(`${BASE}/${id}/revoke-sessions`, { method: "POST" }),
  });
}

export function useResendVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channel }: { id: number; channel: "email" | "phone" }) =>
      apiFetch<{ message: string }>(`${BASE}/${id}/resend-verification`, {
        method: "POST",
        body: { channel },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({
      id,
      password,
      password_confirmation,
    }: {
      id: number;
      password: string;
      password_confirmation: string;
    }) =>
      apiFetch<{ message: string }>(`/admin/staff/${id}/password`, {
        method: "PUT",
        body: { password, password_confirmation },
      }),
  });
}

const STAFF_ROLES = ["moderator", "finance", "help_desk"] as const;

function staffRoleOf(member: { roles?: { name: string }[] }) {
  const names = (member.roles ?? []).map((role) => role.name);
  return STAFF_ROLES.find((role) => names.includes(role)) ?? null;
}

export function useGetAdminStaff(params?: StaffParams & { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-staff", params?.role ?? "all", params?.search ?? ""],
    enabled: params?.enabled ?? true,
    queryFn: async () => {
      const collected: StaffUser[] = [];
      let page = 1;
      let reported = 0;
      for (let guard = 0; guard < 30; guard += 1) {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        qs.set("page", String(page));
        qs.set("per_page", "100");
        const res = await apiFetch<StaffResponse>(`/admin/staff?${qs.toString()}`);
        const rows = res.data ?? [];
        reported = Number(res.total ?? rows.length);
        collected.push(...rows);
        if (rows.length < 100 || collected.length >= reported) break;
        page += 1;
      }
      const data = collected.filter((member) => {
        const role = staffRoleOf(member);
        if (!role) return false;
        return !params?.role || params.role === role;
      });
      return { current_page: 1, data, total: data.length, per_page: data.length || 10 };
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) =>
      apiFetch<{ message: string; user: StaffUser }>("/admin/staff", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useUpdateStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: CreateStaffPayload["role"] }) =>
      apiFetch<{ message: string; user: StaffUser }>(`/admin/staff/${id}/role`, {
        method: "PUT",
        body: { role },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useSuspendStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: number | { id: number; reason?: string }) => {
      const id = typeof input === "number" ? input : input.id;
      const reason = typeof input === "number" ? undefined : input.reason;
      return apiFetch(`/admin/staff/${id}/suspend`, {
        method: "PUT",
        body: reason ? { reason } : undefined,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useActivateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/staff/${id}/activate`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/staff/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => apiFetch<{ roles: AdminRole[] }>("/admin/roles").then((r) => r.roles),
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () =>
      apiFetch<{ permissions: AdminPermission[] }>("/admin/permissions").then(
        (r) => r.permissions,
      ),
  });
}

export function useRolePermissions(roleId: number | null) {
  return useQuery({
    queryKey: ["admin-role-permissions", roleId],
    queryFn: () =>
      apiFetch<{ role: string; permissions: string[] }>(
        `/admin/roles/${roleId}/permissions`,
      ),
    enabled: roleId !== null,
  });
}

export function useReplaceRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: number; permissions: string[] }) =>
      apiFetch<{ message: string; role: string; permissions: string[] }>(
        `/admin/roles/${roleId}/permissions`,
        { method: "PUT", body: { permissions } },
      ),
    onSuccess: (_, { roleId }) => {
      qc.invalidateQueries({ queryKey: ["admin-role-permissions", roleId] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
  });
}

