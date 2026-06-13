import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/notifications";

/* ─── Types ──────────────────────────────────────────────────────── */

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  resource: { type: string; id: number } | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  meta: Record<string, unknown> | unknown[];
}

export interface NotificationsResponse {
  data: Notification[];
  unread: number;
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface UnreadCountResponse {
  count: number;
}

/* ─── Query Keys ─────────────────────────────────────────────────── */

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: { per_page?: number }) =>
    [...notificationKeys.all, "list", params] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

/* ─── useGetNotifications  GET /notifications ────────────────────── */

export function useGetNotifications(params?: { per_page?: number }) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => {
      const qs = params?.per_page ? `?per_page=${params.per_page}` : "";
      return apiFetch<NotificationsResponse>(`${BASE}${qs}`);
    },
  });
}

/* ─── useUnreadCount  GET /notifications/unread-count ───────────── */

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => apiFetch<UnreadCountResponse>(`${BASE}/unread-count`),
    refetchInterval: 60_000, // poll every 60s
  });
}

/* ─── useMarkOneRead  PUT /notifications/{id}/read ──────────────── */

export function useMarkOneRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`${BASE}/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/* ─── useMarkAllRead  PUT /notifications/read-all ───────────────── */

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`${BASE}/read-all`, { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/* ─── useDeleteNotification  DELETE /notifications/{id} ─────────── */

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/* ─── useDeleteAllNotifications  DELETE /notifications ───────────── */

export function useDeleteAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`${BASE}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
