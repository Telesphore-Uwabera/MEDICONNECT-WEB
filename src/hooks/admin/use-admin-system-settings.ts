import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/settings";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettingsGroup =
  | "general"
  | "sms"
  | "email"
  | "payment"
  | "video"
  | "notifications"
  | "security";

export type SettingValue = string | number | boolean | string[] | null;

export interface SettingItem {
  value: SettingValue;
  type: "string" | "boolean" | "integer" | "number" | "array" | string;
  is_public: boolean;
  description?: string | null;
}

export interface PublicSettingsResponse {
  settings: Record<string, string>;
}

export interface SettingsGroupResponse {
  group: SettingsGroup;
  settings: Record<string, SettingItem>;
}

export interface UpdateSettingsPayload {
  group: SettingsGroup;
  payload: Record<string, SettingValue>;
}

export interface UpdateSettingsResponse {
  message: string;
  updated: string[];
  skipped: string[];
}

export interface SettingsAuditLog {
  id: number;
  admin_id: number | null;
  setting_group: SettingsGroup | string;
  setting_key: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin?: {
    id: number;
    name: string;
  } | null;
}

export interface SettingsAuditLogParams {
  group?: SettingsGroup;
  action?: string;
  per_page?: number;
  page?: number;
}

export interface SettingsAuditLogsResponse {
  data: SettingsAuditLog[];
  current_page: number;
  per_page: number;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toQueryString(params?: SettingsAuditLogParams) {
  const query = new URLSearchParams();
  if (params?.group) query.set("group", params.group);
  if (params?.action) query.set("action", params.action);
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.page) query.set("page", String(params.page));
  return query.toString();
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useGetPublicSettings() {
  return useQuery({
    queryKey: ["admin-settings", "public"],
    queryFn: () => apiFetch<PublicSettingsResponse>(`${BASE}/public`),
    staleTime: 60_000,
  });
}

export function useGetSettingsGroup(group: SettingsGroup) {
  return useQuery({
    queryKey: ["admin-settings", group],
    queryFn: () => apiFetch<SettingsGroupResponse>(`${BASE}/${group}`),
    placeholderData: (prev) => prev,
  });
}

export function useUpdateSettingsGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ group, payload }: UpdateSettingsPayload) =>
      apiFetch<UpdateSettingsResponse>(`${BASE}/${group}`, {
        method: "PUT",
        body: payload,
      }),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-settings", variables.group] });
      qc.invalidateQueries({ queryKey: ["admin-settings", "public"] });
      qc.invalidateQueries({ queryKey: ["admin-settings", "audit-logs"] });
    },
  });
}

export function useGetSettingsAuditLogs(params?: SettingsAuditLogParams) {
  const queryString = toQueryString(params);

  return useQuery({
    queryKey: ["admin-settings", "audit-logs", params],
    queryFn: () =>
      apiFetch<SettingsAuditLogsResponse>(
        `${BASE}/audit-logs${queryString ? `?${queryString}` : ""}`,
      ),
    placeholderData: (prev) => prev,
  });
}
