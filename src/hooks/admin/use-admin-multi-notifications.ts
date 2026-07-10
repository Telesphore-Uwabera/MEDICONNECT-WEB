import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const BASE = "/admin/multi-notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MultiNotificationTarget = "roles" | "users";

export type MultiNotificationRole = "all" | "doctor" | "patient" | "pharmacy" | "hospital";

export interface SendMultiNotificationPayload {
  target: MultiNotificationTarget;
  roles?: MultiNotificationRole[];
  user_ids?: number[];
  subject: string;
  message: string;
}

export interface SendMultiNotificationResponse {
  message: string;
  target: MultiNotificationTarget;
  total_matched: number;
  emails_sent: number;
  emails_failed: number;
}

// The documented contract returns total_matched/emails_sent/emails_failed at
// the top level, but we've seen responses miss those fields (or nest them
// under `data`, or use shorter names like `sent`/`failed`). Normalize
// defensively so the UI never has to render a literal "undefined".
interface RawSendMultiNotificationResponse {
  message?: string;
  target?: MultiNotificationTarget;
  total_matched?: number;
  matched?: number;
  emails_sent?: number;
  total_recipients?:number;
  sent?: number;
  emails_failed?: number;
  failed?: number;
  data?: Omit<RawSendMultiNotificationResponse, "data">;
}

function normalizeSendResponse(
  raw: RawSendMultiNotificationResponse,
  fallbackTarget: MultiNotificationTarget,
): SendMultiNotificationResponse {
  const src = raw?.data ?? raw ?? {};
  console.log(src)
  return {
    message: src.message ?? "Notification processed.",
    target: src.target ?? fallbackTarget,
    total_matched: src.total_matched ?? src.matched ?? 0,
    emails_sent: src.total_recipients ?? src.sent ?? 0,
    emails_failed: src.emails_failed ?? src.failed ?? 0,
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSendMultiNotification() {
  return useMutation({
    mutationFn: async (payload: SendMultiNotificationPayload) => {
      const raw = await apiFetch<RawSendMultiNotificationResponse>(`${BASE}/send`, {
        method: "POST",
        body: payload,
      }); 
   
      return normalizeSendResponse(raw, payload.target);
    },
  });
}