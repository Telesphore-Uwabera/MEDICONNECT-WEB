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
  Filter,
  Inbox,
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
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    border: "border-emerald-500/20 dark:border-emerald-500/20",
    label: "Consultations",
  },
  pharmacy: {
    icon: Pill,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    border: "border-violet-500/20 dark:border-violet-500/20",
    label: "Pharmacy",
  },
  hospital: {
    icon: Building2,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    border: "border-amber-500/20 dark:border-amber-500/20",
    label: "Hospital",
  },
  payment: {
    icon: CreditCard,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/20 dark:border-blue-500/20",
    label: "Payments",
  },
  document: {
    icon: FileText,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    border: "border-sky-500/20 dark:border-sky-500/20",
    label: "Documents",
  },
  alert: {
    icon: AlertCircle,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    border: "border-rose-500/20 dark:border-rose-500/20",
    label: "Alerts",
  },
};

const FALLBACK_CONFIG: TypeConfigEntry = {
  icon: Info,
  color: "text-slate-600 dark:text-slate-400",
  bg: "bg-slate-500/10 dark:bg-slate-500/15",
  border: "border-slate-500/20 dark:border-slate-500/20",
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
        "group relative flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer border",
        isUnread
          ? "bg-white dark:bg-slate-900/50 border-blue-200/60 dark:border-blue-800/40 shadow-sm hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-700/50"
          : "bg-white/50 dark:bg-slate-900/20 border-transparent hover:bg-white dark:hover:bg-slate-900/40 hover:border-slate-200/60 dark:hover:border-slate-700/40 hover:shadow-sm"
      )}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-blue-500 dark:bg-blue-400" />
      )}

      {/* Type icon with colored ring */}
      <div
        className={cn(
          "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border",
          cfg.bg,
          cfg.border
        )}
      >
        <Icon className={cn("h-4.5 w-4.5", cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-[13px] leading-snug",
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/70"
            )}
          >
            {getTitle(notification)}
          </p>
          {isUnread && (
            <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5" />
          )}
        </div>
        
        {getBody(notification) && (
          <p className="text-[12px] text-muted-foreground/80 mt-1 leading-relaxed line-clamp-2">
            {getBody(notification)}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-muted-foreground/50 font-medium">
            {moment(notification.created_at).fromNow()}
          </span>
          <span className="text-[10px] text-muted-foreground/30">•</span>
          <span 
            className="text-[11px] text-muted-foreground/40"
            title={formatNotificationDate(notification.created_at)}
          >
            {moment(notification.created_at).format("h:mm A")}
          </span>
        </div>
      </div>

      {/* Hover actions - appear on hover */}
      <div className={cn(
        "shrink-0 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        isUnread ? "mt-0" : "mt-1"
      )}>
        {isUnread && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-blue-600 hover:bg-blue-500/10 transition-all"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Delete"
          className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
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
    <div className="mb-2">
      <div className="flex items-center gap-3 px-4 py-2.5 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">
          {group}
        </span>
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-[10px] text-muted-foreground/40 font-medium">
          {items.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3">
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
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/20">
          <div className="h-10 w-10 rounded-xl bg-muted/60 shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3 bg-muted/60 rounded-md w-3/4 animate-pulse" />
            <div className="h-2.5 bg-muted/60 rounded-md w-1/2 animate-pulse" />
            <div className="h-2 bg-muted/60 rounded-md w-1/4 animate-pulse" />
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
  const [readFilter, setReadFilter] = useState<<ReadFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<<CategoryFilter | null>(null);

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
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-all duration-300",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[480px] max-w-[calc(100vw-16px)]",
          "bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl",
          "border-l border-border/40 shadow-2xl shadow-black/20",
          "flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ borderRadius: "16px 0 0 16px" }}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-border/30 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/15">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-slate-950">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-foreground leading-tight">
                  Notifications
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {unreadCount > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {unreadCount} unread message{unreadCount === 1 ? "" : "s"}
                    </span>
                  ) : (
                    "All caught up"
                  )}
                </p>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  title="Mark all as read"
                  className="p-2 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-all disabled:opacity-50"
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
                  className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-50"
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
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReadFilter(f)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all duration-200 border",
                  readFilter === f
                    ? "bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/20"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-800 hover:border-border hover:shadow-sm"
                )}
              >
                {f === "all" ? <Inbox className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                {f}
                <span
                  className={cn(
                    "px-1.5 min-w-[18px] text-center rounded-full text-[10px] font-bold leading-[18px]",
                    readFilter === f
                      ? "bg-white/20 text-white"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {f === "unread" ? unreadCount : notifications.length}
                </span>
              </button>
            ))}

            <div className="w-px h-5 bg-border/50 shrink-0" />

            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setCategoryFilter((prev) => (prev === cat ? null : cat))
                }
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 border",
                  categoryFilter === cat
                    ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-slate-800 dark:border-white shadow-sm"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-800 hover:border-border hover:shadow-sm"
                )}
              >
                {cat}
              </button>
            ))}
            {categoryFilter && (
              <button
                onClick={() => setCategoryFilter(null)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-rose-500 border border-border/40 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable List ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="py-2">
            {isLoading && <SkeletonLoader />}

            {isError && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/15">
                  <AlertCircle className="h-6 w-6 text-rose-500/70" />
                </div>
                <p className="text-[13px] font-semibold text-foreground">
                  Failed to load
                </p>
                <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[220px]">
                  Check your connection and try again.
                </p>
              </div>
            )}

            {!isLoading && !isError && grouped.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 border border-border/20">
                  <BellOff className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-[13px] font-semibold text-foreground">
                  {readFilter === "unread"
                    ? "No unread notifications"
                    : categoryFilter
                    ? `No ${categoryFilter.toLowerCase()} notifications`
                    : "All caught up"}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">
                  {readFilter === "unread"
                    ? "Switch to 'All' to see your notification history."
                    : "New notifications will appear here when you receive them."}
                </p>
              </div>
            )}

            {grouped.map(({ group, items }, i) => (
              <div key={group}>
                {i > 0 && (
                  <div className="mx-5 my-3 border-t border-border/20" />
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
