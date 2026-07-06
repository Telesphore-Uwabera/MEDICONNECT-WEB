import { type PrescriptionApiStatus } from "@/hooks/patient/use-patient-prescriptions";
import type { TFunction } from "i18next";

const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = "table" | "cards";

export interface FilterState {
  search: string;
  status: PrescriptionApiStatus | "all";
  from: string;
  to: string;
  is_signed: boolean | "all";
  sort: "date-asc" | "date-desc";
}

export const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
  from: "",
  to: "",
  is_signed: "all",
  sort: "date-desc",
};

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUS_STYLES: Record<string, string> = {
  issued: "bg-primary/10 text-primary border-primary/20",
  sent_to_pharmacy:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  dispensed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  expired: "bg-muted text-muted-foreground border-border",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
};

export const STATUS_DOT: Record<string, string> = {
  issued: "bg-primary",
  sent_to_pharmacy: "bg-violet-500",
  dispensed: "bg-emerald-500",
  cancelled: "bg-red-500",
  expired: "bg-muted-foreground",
  pending: "bg-amber-500",
};

export const getPrescriptionStatusLabel = (t: TFunction, status: string): string => {
  const map: Record<string, string> = {
    issued: t("pages.patient.rxp_status_issued"),
    sent_to_pharmacy: t("pages.patient.rxp_status_sent_to_pharmacy"),
    dispensed: t("pages.patient.rxp_status_dispensed"),
    cancelled: t("pages.patient.rxp_status_cancelled"),
    expired: t("pages.patient.rxp_status_expired"),
    pending: t("pages.patient.rxp_status_pending"),
  };
  return map[status] ?? status;
};

export const ALL_STATUSES: PrescriptionApiStatus[] = [
  "issued",
  "sent_to_pharmacy",
  "pending",
  "dispensed",
  "expired",
  "cancelled",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isExpiringSoon(validUntil: string): boolean {
  const diff = new Date(validUntil).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

export function isExpired(validUntil: string): boolean {
  return new Date(validUntil).getTime() < Date.now();
}

export function getPdfUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // PDFs are served from the host root, NOT under /api/v1. Strip the API prefix
  // (matching the doctor prescription drawer) and guard the leading slash so we
  // never produce ".../api/v1prescriptions/..." or "...rwprescriptions/...".
  const host = String(BASE_URL ?? "").replace("/api/v1", "").replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${host}${p}`;
}

export { BASE_URL };
