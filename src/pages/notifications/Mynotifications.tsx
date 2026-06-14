import { useState } from "react";
import moment from "moment";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  BellOff,
  Loader2,
  ChevronRight,
  Stethoscope,
  Pill,
  Building2,
  CreditCard,
  FileText,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetNotifications,
  useMarkOneRead,
  useMarkAllRead,
  useDeleteNotification,
  useDeleteAllNotifications,
  type Notification,
} from "@/hooks/use-notifications";

/* ─── Type config ─────────────────────────────────────────────────── */

type TypeConfigEntry = {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
};

const TYPE_CONFIG: Record<string, TypeConfigEntry> = {
  consultation: {
    icon: Stethoscope,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    label: "Consultations",
  },
  pharmacy: {
    icon: Pill,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    label: "Pharmacy",
  },
  hospital: {
    icon: Building2,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    label: "Hospital",
  },
  payment: {
    icon: CreditCard,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    label: "Payments",
  },
  document: {
    icon: FileText,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    label: "Documents",
  },
  alert: {
    icon: AlertCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    label: "Alerts",
  },
};

const FALLBACK_CONFIG: TypeConfigEntry = {
  icon: Info,
  color: "text-primary",
  bg: "bg-primary/10",
  label: "Other",
};

function getTypeConfig(type: string): TypeConfigEntry {
  const lower = type.toLowerCase();
  const key = Object.keys(TYPE_CONFIG).find((k) => lower.includes(k));
  return key ? TYPE_CONFIG[key] : FALLBACK_CONFIG;
}

function getTitle(n: Notification): string {
  return (
    n.title ||
    n.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function getBody(n: Notification): string | undefined {
  return n.message || undefined;
}

/* ─── Date helpers ─────────────────────────────────────────────────── */

const DATE_FORMAT = "MMM D, YYYY, h:mm A";

function formatNotificationDate(dateStr: string): string {
  return moment(dateStr).format(DATE_FORMAT);
}

type DateGroup = "Today" | "Yesterday" | "Earlier";

function getDateGroup(dateStr: string): DateGroup {
  const date = moment(dateStr);
  const now = moment();
  if (date.isSame(now, "day")) return "Today";
  if (date.isSame(now.clone().subtract(1, "day"), "day")) return "Yesterday";
  return "Earlier";
}

function groupNotifications(
  notifications: Notification[]
): { group: DateGroup; items: Notification[] }[] {
  const order: DateGroup[] = ["Today", "Yesterday", "Earlier"];
  const map: Record<DateGroup, Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };
  for (const n of notifications) {
    map[getDateGroup(n.created_at)].push(n);
  }
  return order
    .filter((g) => map[g].length > 0)
    .map((group) => ({ group, items: map[group] }));
}

/* ─── Category filters ────────────────────────────────────────────── */

const CATEGORY_FILTERS = ["Consultations", "Payments", "Pharmacy", "Alerts"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

function matchesCategory(n: Notification, cat: CategoryFilter): boolean {
  const cfg = getTypeConfig(n.type);
  return cfg.label === cat;
}

/* ─── NotificationItem ───────────────────────────────────────────── */

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isUnread = !notification.is_read;
  const cfg = getTypeConfig(notification.type);
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2.5 px-3 py-2.5 mx-1.5 rounded-md transition-colors duration-150 cursor-pointer",
        isUnread
          ? "bg-blue-50/60 dark:bg-blue-950/25 hover:bg-blue-100/60 dark:hover:bg-blue-950/35"
          : "hover:bg-secondary/60"
      )}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
      )}

      {/* Type icon */}
      <div
        className={cn(
          "shrink-0 h-8 w-8 rounded-md flex items-center justify-center mt-0.5",
          cfg.bg
        )}
      >
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <p
          className={cn(
            "text-[12.5px] leading-snug",
            isUnread
              ? "font-semibold text-foreground"
              : "font-medium text-foreground/80"
          )}
        >
          {getTitle(notification)}
        </p>
        {getBody(notification) && (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
            {getBody(notification)}
          </p>
        )}
        <p
          className="text-[10px] text-muted-foreground/60 mt-1"
          title={formatNotificationDate(notification.created_at)}
        >
          {moment(notification.created_at).fromNow()}
        </p>
      </div>

      {/* Hover actions */}
<div className="shrink-0 flex items-center gap-1 mt-0.5">
        {isUnread && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
            className="p-1 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-colors"
          >
            <Check className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Delete"
          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ─── DateGroupSection ───────────────────────────────────────────── */

function DateGroupSection({
  group,
  items,
  onMarkRead,
  onDelete,
}: {
  group: string;
  items: Notification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {group}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onMarkRead={onMarkRead}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Skeleton loader ─────────────────────────────────────────────── */

function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-md bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-muted rounded-md w-3/4" />
            <div className="h-2 bg-muted rounded-md w-1/2" />
            <div className="h-2 bg-muted rounded-md w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MyNotifications Drawer ─────────────────────────────────────── */

type ReadFilter = "all" | "unread";

interface MyNotificationsProps {
  open: boolean;
  onClose: () => void;
}

export function MyNotifications({ open, onClose }: MyNotificationsProps) {
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter | null>(null);

  const { data, isLoading, isError } = useGetNotifications({ per_page: 50 });
  const markOne = useMarkOneRead();
  const markAll = useMarkAllRead();
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();

  const notifications: Notification[] = data?.data ?? [];
  const unreadCount =
    data?.unread ?? notifications.filter((n) => !n.is_read).length;

  /* ── Filtering ── */
  const filtered = notifications.filter((n) => {
    if (readFilter === "unread" && n.is_read) return false;
    if (categoryFilter && !matchesCategory(n, categoryFilter)) return false;
    return true;
  });

  const grouped = groupNotifications(filtered);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[520px] max-w-[calc(100vw-24px)]",
          "bg-card border-l border-border/50 shadow-2xl shadow-black/15",
          "flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ borderRadius: "5px 0 0 5px" }}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-[13px] font-bold text-foreground leading-tight">
                  Notifications
                </h2>
                {unreadCount > 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    {unreadCount} unread message{unreadCount === 1 ? "" : "s"}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    All caught up
                  </p>
                )}
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  title="Mark all as read"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                >
                  {markAll.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => deleteAll.mutate()}
                  disabled={deleteAll.isPending}
                  title="Clear all"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  {deleteAll.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                title="Close"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter pills — single scrollable row */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-0.5 px-0.5 pb-0.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReadFilter(f)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all duration-150 border whitespace-nowrap",
                  readFilter === f
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {f}
                <span
                  className={cn(
                    "px-1 min-w-[16px] text-center rounded-full text-[10px] font-bold leading-[16px]",
                    f === "unread"
                      ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {f === "unread" ? unreadCount : notifications.length}
                </span>
              </button>
            ))}

            <div className="w-px h-4 bg-border/50 shrink-0 mx-0.5" />

            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setCategoryFilter((prev) => (prev === cat ? null : cat))
                }
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 border whitespace-nowrap",
                  categoryFilter === cat
                    ? "bg-secondary border-border text-foreground"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {cat}
              </button>
            ))}
            {categoryFilter && (
              <button
                onClick={() => setCategoryFilter(null)}
                className="shrink-0 px-2 py-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-destructive border border-border/40 hover:border-destructive/30 transition-all whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── List ── */}
        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {isLoading && <SkeletonLoader />}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-10 w-10 rounded-md bg-destructive/10 flex items-center justify-center mb-3">
                <AlertCircle className="h-5 w-5 text-destructive/60" />
              </div>
              <p className="text-[12px] font-semibold text-foreground">
                Failed to load
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Check your connection and try again.
              </p>
            </div>
          )}

          {!isLoading && !isError && grouped.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-3">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[12px] font-semibold text-foreground">
                {readFilter === "unread"
                  ? "No unread notifications"
                  : categoryFilter
                  ? `No ${categoryFilter.toLowerCase()} notifications`
                  : "All caught up"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                {readFilter === "unread"
                  ? "Switch to 'All' to see your history."
                  : "New notifications will appear here."}
              </p>
            </div>
          )}

          {grouped.map(({ group, items }, i) => (
            <div key={group}>
              {i > 0 && (
                <div className="mx-4 my-1 border-t border-border/30" />
              )}
              <DateGroupSection
                group={group}
                items={items}
                onMarkRead={(id) => markOne.mutate(id)}
                onDelete={(id) => deleteOne.mutate(id)}
              />
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40 shrink-0">
            <button className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors py-1.5 rounded-md hover:bg-primary/5">
              View full notification history
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default MyNotifications;
