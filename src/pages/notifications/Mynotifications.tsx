import { useState, useMemo, useCallback } from "react";
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
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
    label: "Consultations",
  },
  pharmacy: {
    icon: Pill,
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
    label: "Pharmacy",
  },
  hospital: {
    icon: Building2,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    label: "Hospital",
  },
  payment: {
    icon: CreditCard,
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800",
    label: "Payments",
  },
  document: {
    icon: FileText,
    color: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    border: "border-teal-200 dark:border-teal-800",
    label: "Documents",
  },
  alert: {
    icon: AlertCircle,
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
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

/* ─── NotificationCard ───────────────────────────────────────────── */

function NotificationCard({
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
        "group relative flex items-start gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-150 cursor-pointer",
        "bg-card border-border/40 hover:bg-muted/30 hover:border-border/70"
      )}
    >
      {/* Unread left accent bar */}
      {isUnread && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
      )}

      {/* Type icon */}
      <div
        className={cn(
          "shrink-0 h-7 w-7 rounded-md flex items-center justify-center border",
          cfg.bg,
          cfg.border
        )}
      >
        <Icon className={cn("h-3 w-3", cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-[11px] leading-snug",
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/55"
            )}
          >
            {getTitle(notification)}
          </p>
          {isUnread && (
            <span className="shrink-0 h-[6px] w-[6px] rounded-full bg-primary mt-[3px]" />
          )}
        </div>

        {getBody(notification) && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed line-clamp-2">
            {getBody(notification)}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[9.5px] text-muted-foreground/50">
            {moment(notification.created_at).fromNow()}
          </span>
          <span className="text-[9px] text-muted-foreground/30">·</span>
          <span
            className={cn(
              "text-[9.5px] px-1.5 py-0.5 rounded-sm font-medium",
              cfg.bg,
              cfg.color,
              "opacity-80"
            )}
          >
            {cfg.label}
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
            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
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
          className="p-1.5 rounded-md text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ─── StatusSection — separates unread from read ─────────────────── */

function StatusSection({
  label,
  count,
  isUnread,
  children,
}: {
  label: string;
  count: number;
  isUnread: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-widest",
            isUnread ? "text-primary" : "text-muted-foreground/40"
          )}
        >
          {label}
        </span>
        <div
          className={cn(
            "flex-1 h-px",
            isUnread ? "bg-primary/20" : "bg-border/30"
          )}
        />
        <span
          className={cn(
            "text-[9px] font-medium px-1.5 py-0.5 rounded-sm",
            isUnread
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground/50"
          )}
        >
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-1 px-3">{children}</div>
    </div>
  );
}

/* ─── DateGroupSection (inside each status section) ──────────────── */

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
    <div className="mb-0.5">
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/30">
          {group}
        </span>
        <div className="flex-1 h-px bg-border/20" />
      </div>
      <div className="flex flex-col gap-1">
        {items.map((n) => (
          <NotificationCard
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

/* ─── Skeleton ─────────────────────────────────────────────────────── */

function SkeletonLoader() {
  return (
    <div className="flex flex-col gap-1 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 p-2 rounded-lg border border-border/30"
        >
          <div className="h-7 w-7 rounded-md bg-muted/60 shrink-0 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 bg-muted/60 rounded w-3/4 animate-pulse" />
            <div className="h-1.5 bg-muted/60 rounded w-full animate-pulse" />
            <div className="h-1.5 bg-muted/60 rounded w-1/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tab button ────────────────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex-1 flex items-center justify-center gap-1.5 py-2 text-[10.5px] font-medium transition-all duration-150",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground/80"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      <span
        className={cn(
          "text-[9px] px-1.5 py-0.5 rounded-full font-semibold transition-all",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {count}
      </span>
      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-t-full bg-primary" />
      )}
    </button>
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

  const filtered = useMemo(
    () =>
      notifications.filter((n) => {
        if (readFilter === "unread" && n.is_read) return false;
        if (categoryFilter && !matchesCategory(n, categoryFilter)) return false;
        return true;
      }),
    [notifications, readFilter, categoryFilter]
  );

  const unreadItems = useMemo(() => filtered.filter((n) => !n.is_read), [filtered]);
  const readItems = useMemo(() => filtered.filter((n) => n.is_read), [filtered]);

  const groupedUnread = useMemo(() => groupNotifications(unreadItems), [unreadItems]);
  const groupedRead = useMemo(() => groupNotifications(readItems), [readItems]);

  const handleMarkRead = useCallback((id: string) => markOne.mutate(id), [markOne]);
  const handleDelete = useCallback((id: string) => deleteOne.mutate(id), [deleteOne]);

  const isEmpty = unreadItems.length === 0 && readItems.length === 0;

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
          "fixed top-0 right-0 z-50 h-full w-[500px] max-w-[calc(100vw-16px)]",
          "bg-card border-l border-border/50",
          "flex flex-col transition-transform duration-300 ease-in-out shadow-xl",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ borderRadius: "12px 0 0 12px" }}
        aria-label="Notifications"
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="px-4 pt-3.5 pb-0 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Bell className="h-3.5 w-3.5 text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-[8.5px] font-bold text-white flex items-center justify-center border-2 border-card">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-[12.5px] font-semibold text-foreground leading-tight">
                  Notifications
                </h2>
                <p className="text-[9.5px] text-muted-foreground mt-0.5">
                  {unreadCount > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {unreadCount} unread
                    </span>
                  ) : (
                    "All caught up"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  title="Mark all as read"
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
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
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all disabled:opacity-40"
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
                className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── Read/Unread Tabs ── */}
          <div className="flex border-b border-border/40 -mx-4 px-1">
            <TabButton
              active={readFilter === "all"}
              onClick={() => setReadFilter("all")}
              icon={Inbox}
              label="All"
              count={notifications.length}
            />
            <TabButton
              active={readFilter === "unread"}
              onClick={() => setReadFilter("unread")}
              icon={Bell}
              label="Unread"
              count={unreadCount}
            />
          </div>

          {/* ── Category Filter Pills ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2">
            <button
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-md text-[9.5px] font-semibold transition-all border",
                categoryFilter === null
                  ? "bg-foreground text-background border-foreground"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border"
              )}
            >
              All types
            </button>

            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setCategoryFilter((prev) => (prev === cat ? null : cat))
                }
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-md text-[9.5px] font-semibold transition-all border",
                  categoryFilter === cat
                    ? "bg-foreground text-background border-foreground"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable List ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="py-1.5">
            {isLoading && <SkeletonLoader />}

            {isError && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-3 border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4.5 w-4.5 text-red-500" />
                </div>
                <p className="text-[11px] font-semibold text-foreground">
                  Failed to load
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                  Check your connection and try again.
                </p>
              </div>
            )}

            {!isLoading && !isError && isEmpty && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center mb-3 border border-border/30">
                  <BellOff className="h-4.5 w-4.5 text-muted-foreground/40" />
                </div>
                <p className="text-[11px] font-semibold text-foreground">
                  {readFilter === "unread"
                    ? "No unread notifications"
                    : categoryFilter
                    ? `No ${categoryFilter.toLowerCase()} notifications`
                    : "All caught up"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                  {readFilter === "unread"
                    ? "Switch to 'All' to see your history."
                    : "New notifications will appear here."}
                </p>
              </div>
            )}

            {!isLoading && !isError && !isEmpty && (
              <>
                {/* ── Unread section ── */}
                {unreadItems.length > 0 && (
                  <StatusSection
                    label="Unread"
                    count={unreadItems.length}
                    isUnread={true}
                  >
                    {groupedUnread.map(({ group, items }) => (
                      <DateGroupSection
                        key={group}
                        group={group}
                        items={items}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </StatusSection>
                )}

                {/* ── Divider between sections ── */}
                {unreadItems.length > 0 && readItems.length > 0 && (
                  <div className="mx-4 my-1.5 border-t border-border/20" />
                )}

                {/* ── Read section (hidden on Unread tab) ── */}
                {readItems.length > 0 && readFilter !== "unread" && (
                  <StatusSection
                    label="Read"
                    count={readItems.length}
                    isUnread={false}
                  >
                    {groupedRead.map(({ group, items }) => (
                      <DateGroupSection
                        key={group}
                        group={group}
                        items={items}
                        onMarkRead={handleMarkRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </StatusSection>
                )}
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default MyNotifications;
