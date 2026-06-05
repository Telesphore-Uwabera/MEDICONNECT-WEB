import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Appointment } from "@/hooks/doctor/use-doctor-appointment";

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
  return dayjs(iso).format("h:mm A");
};

/** "3 hours ago" / "in 2 days" */
export const fmtRelative = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return dayjs(iso).fromNow();
};

// ─── Appointment helpers ──────────────────────────────────────────────────────

export const apptLabel     = (a: Appointment) => a.patient?.name ?? "Patient";
export const apptSpecialty = (_a: Appointment) => "General";

export const statusLabel = (status: string): string =>
  ({
    pending:     "Pending",
    confirmed:   "Confirmed",
    in_progress: "In progress",
    completed:   "Completed",
  }[status] ?? status);

// ─── API error helper ─────────────────────────────────────────────────────────

interface ApiError { message?: string }

export function getErrMsg(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    return (err as ApiError).message ?? fallback;
  }
  return fallback;
}
