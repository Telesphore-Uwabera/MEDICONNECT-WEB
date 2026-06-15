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
  AlertCircle,
  Info,
  Inbox,
  Stethoscope,
  Pill,
  Building2,
  CreditCard,
  FileText,
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
  border: string;
  label: string;
};

const TYPE_CONFIG: Record<string, TypeConfigEntry> = {
  consultation: {
    icon: Stethoscope,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    label: "Consultations",
  },
  pharmacy: {
    icon: Pill,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    label: "Pharmacy",
  },
  hospital: {
    icon: Building2,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "Hospital",
  },
  payment: {
    icon: CreditCard,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Payments",
  },
  document: {
    icon: FileText,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    label: "Documents",
  },
  alert: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    label: "Alerts",
  },
};

const FALLBACK_CONFIG: TypeConfigEntry = {
  icon: Info,
  color: "text-muted-foreground",
  bg: "bg-secondary",
  border: "border-border/40",
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

function formatNotificationDate(dateStr: string): string {
  return moment(dateStr).format("MMM D, YYYY, h:mm A");
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

const CATEGORY_FILTERS = [
  "Consultations",
  "Payments",
  "Pharmacy",
  "Alerts",
] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

function matchesCategory(n: Notification, cat: CategoryFilter): boolean {
  return getTypeConfig(n.type).label === cat;
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
        "group relative flex items-start gap-2.5 px-3 py-2.5 transition-all duration-150 cursor-pointer border",
        "rounded-[5px]",
        isUnread
          ? "bg-primary/5 border-primary/15 hover:bg-primary/8 hover:border-primary/25"
          : "bg-card border-border/40 hover:bg-secondary/40 hover:border-border/60"
      )}
    >
      {/* Unread left accent */}
      {isUnread && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-[2px] bg-primary" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "shrink-0 h-8 w-8 rounded-[5px] flex items-center justify-center border",
          cfg.bg,
          cfg.border
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-[11px] leading-snug",
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/60"
            )}
          >
            {getTitle(notification)}
          </p>
          {isUnread && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-primary mt-1" />
          )}
        </div>

        {getBody(notification) && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed line-clamp-2">
            {getBody(notification)}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-muted-foreground/50 font-medium">
            {moment(notification.created_at).fromNow()}
          </span>
          <span className="text-[9px] text-muted-foreground/30">·</span>
          <span
            className="text-[10px] text-muted-foreground/40"
            title={formatNotificationDate(notification.created_at)}
          >
            {moment(notification.created_at).format("h:mm A")}
          </span>
        </div>
      </div>

      {/* Hover actions */}
      <div className="shrink-0 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {isUnread && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
            className="p-1 rounded-[5px] text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
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
          className="p-1 rounded-[5px] text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
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
    <div className="mb-1.5">
      <div className="flex items-center gap-2 px-3 py-2 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
          {group}
        </span>
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-[9px] text-muted-foreground/35 font-medium tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 px-3">
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

/* ─── Skeleton ────────────────────────────────────────────────────── */

function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-1.5 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 p-2.5 rounded-[5px] border border-border/30"
        >
          <div className="h-8 w-8 rounded-[5px] bg-muted/60 shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-muted/60 rounded w-3/4 animate-pulse" />
            <div className="h-2 bg-muted/60 rounded w-1/2 animate-pulse" />
            <div className="h-1.5 bg-muted/60 rounded w-1/4 animate-pulse" />
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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter | null>(
    null
  );

  const { data, isLoading, isError } = useGetNotifications({ per_page: 50 });
  const markOne = useMarkOneRead();
  const markAll = useMarkAllRead();
  const deleteOne = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();

  const notifications: Notification[] = data?.data ?? [];
  const unreadCount =
    data?.unread ?? notifications.filter((n) => !n.is_read).length;

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
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-all duration-200",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[420px] max-w-[calc(100vw-16px)]",
        "bg-card border-l border-border/50",
        "flex flex-col transition-transform duration-300 ease-in-out shadow-large",
        open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ borderRadius: "8px 0 0 8px" }}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 rounded-[5px] bg-primary/10 border border-primary/20">
                <Bell className="h-4 w-4 text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center border-2 border-card">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-foreground leading-tight">
                  Notifications
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {unreadCount > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {unreadCount} unread
                    </span>
                  ) : (
                    "All caught up"
                  )}
                </p>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-0.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  title="Mark all as read"
                  className="p-1.5 rounded-[5px] text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
                >
                  {markAll.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => deleteAll.mutate()}
                  disabled={deleteAll.isPending}
                  title="Clear all"
                  className="p-1.5 rounded-[5px] text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-40"
                >
                  {deleteAll.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                title="Close"
                className="p-1.5 rounded-[5px] text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReadFilter(f)}
                className={cn(
                  "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-[10px] font-semibold capitalize transition-all duration-150 border",
                  readFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border"
                )}
              >
                {f === "all" ? (
                  <Inbox className="h-3 w-3" />
                ) : (
                  <Bell className="h-3 w-3" />
                )}
                {f}
                <span
                  className={cn(
                    "px-1 min-w-[16px] text-center rounded-[3px] text-[9px] font-bold leading-[16px]",
                    readFilter === f
                      ? "bg-white/20 text-white"
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
                  "shrink-0 px-2.5 py-1 rounded-[5px] text-[10px] font-semibold transition-all duration-150 border",
                  categoryFilter === cat
                    ? "bg-foreground text-background border-foreground"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border"
                )}
              >
                {cat}
              </button>
            ))}

            {categoryFilter && (
              <button
                onClick={() => setCategoryFilter(null)}
                className="shrink-0 px-2 py-1 rounded-[5px] text-[10px] font-semibold text-muted-foreground hover:text-destructive border border-border/40 hover:border-destructive/30 hover:bg-destructive/5 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable List ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="py-2">
            {isLoading && <SkeletonLoader />}

            {isError && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-10 w-10 rounded-[5px] bg-destructive/10 flex items-center justify-center mb-3 border border-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive/60" />
                </div>
                <p className="text-[12px] font-semibold text-foreground">
                  Failed to load
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                  Check your connection and try again.
                </p>
              </div>
            )}

            {!isLoading && !isError && grouped.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-10 w-10 rounded-[5px] bg-muted/60 flex items-center justify-center mb-3 border border-border/30">
                  <BellOff className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-[12px] font-semibold text-foreground">
                  {readFilter === "unread"
                    ? "No unread notifications"
                    : categoryFilter
                    ? `No ${categoryFilter.toLowerCase()} notifications`
                    : "All caught up"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                  {readFilter === "unread"
                    ? "Switch to 'All' to see your history."
                    : "New notifications will appear here."}
                </p>
              </div>
            )}

            {grouped.map(({ group, items }, i) => (
              <div key={group}>
                {i > 0 && (
                  <div className="mx-4 my-2 border-t border-border/20" />
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
        </div>
      </aside>
    </>
  );
}

export default MyNotifications;