import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Appointment } from "@/hooks/doctor/use-doctor-appointment";
import type { TFunction } from "i18next";

dayjs.extend(relativeTime);

// ─── Time / date formatting ───────────────────────────────────────────────────

/** MM:SS elapsed timer */
export const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** "Xm Ys" since a unix-ms timestamp */
export const fmtWait = (since: number) => {
  const s = Math.floor((Date.now() - since) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

/** "Jun 15, 2026" */
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, YYYY");
};

/** "Jun 15, 2026 · 11:00 AM" */
export const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, YYYY · h:mm A");
};

/** "11:00 AM" */
export const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  // If it's a time-only string (e.g., "14:30:00"), prepend a dummy date so dayjs can parse it
  const isTimeOnly = /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(iso);
  const parseStr = isTimeOnly ? `1970-01-01T${iso}` : iso;
  return dayjs(parseStr).format("h:mm A");
};

/** "3 hours ago" / "in 2 days" */
export const fmtRelative = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return dayjs(iso).fromNow();
};

// ─── Appointment helpers ──────────────────────────────────────────────────────

export const apptLabel     = (a: Appointment) => a.patient?.name ?? "Patient";
export const apptSpecialty = (_a: Appointment) => "General";

export const statusLabel = (status: string, t?: TFunction): string => {
  const keys: Record<string, string> = {
    pending: "pages.doctor.status_pending",
    confirmed: "pages.doctor.status_confirmed",
    in_progress: "pages.doctor.status_in_progress",
    completed: "pages.doctor.status_completed",
    accepted: "pages.doctor.status_accepted",
    rejected: "pages.doctor.status_rejected",
    cancelled: "pages.doctor.status_cancelled",
  };
  const fallback: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In progress",
    completed: "Completed",
    accepted: "Accepted",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  return keys[status] && t ? t(keys[status]) : (fallback[status] ?? status);
};

// ─── API error helper ─────────────────────────────────────────────────────────

interface ApiError { message?: string }

export function getErrMsg(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    return (err as ApiError).message ?? fallback;
  }
  return fallback;
}
