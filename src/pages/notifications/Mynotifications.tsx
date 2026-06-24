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
  ChevronDown,
  Filter,
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
  {
    value: "consultations",
    label: "Consultations",
    keywords: ["consult", "appointment", "booking", "doctor", "video", "call", "instant"],
  },
  {
    value: "payments",
    label: "Payments",
    keywords: ["payment", "wallet", "withdraw", "invoice", "payout", "paid", "billing"],
  },
  {
    value: "pharmacy",
    label: "Pharmacy",
    keywords: ["pharmacy", "prescription", "medicine", "drug"],
  },
  {
    value: "hospital",
    label: "Hospital",
    keywords: ["hospital", "facility", "service", "department"],
  },
  {
    value: "documents",
    label: "Documents",
    keywords: ["document", "file", "certificate", "record", "report", "medical"],
  },
  {
    value: "alerts",
    label: "Alerts",
    keywords: ["alert", "warning", "failed", "rejected", "cancelled", "urgent"],
  },
] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number]["value"];

function getCategoryOption(value: CategoryFilter | null) {
  return CATEGORY_FILTERS.find((option) => option.value === value) ?? null;
}

function matchesCategory(n: Notification, cat: CategoryFilter): boolean {
  const option = getCategoryOption(cat);
  if (!option) return true;
  const haystack = [
    n.type,
    n.resource?.type,
    n.title,
    n.message,
    getTypeConfig(n.type).label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return option.keywords.some((keyword) => haystack.includes(keyword));
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
        "group relative flex items-start gap-2.5 px-2.5 py-2 rounded-[6px] border transition-all duration-150 cursor-pointer",
        "bg-card border-border/40 hover:bg-muted/30 hover:border-border/70"
      )}
    >
      {/* Unread left accent bar */}
      {isUnread && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-[6px] bg-primary" />
      )}

      {/* Type icon */}
      <div
        className={cn(
          "shrink-0 h-7 w-7 rounded-[6px] flex items-center justify-center border",
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
            <span className="shrink-0 h-[6px] w-[6px] rounded-[6px] bg-primary mt-[3px]" />
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
              "text-[9.5px] px-1.5 py-0.5 rounded-[6px] font-medium",
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
            className="p-1.5 rounded-[6px] text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all"
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
          className="p-1.5 rounded-[6px] text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
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
            "text-[9px] font-medium px-1.5 py-0.5 rounded-[6px]",
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
          className="flex items-start gap-2.5 p-2 rounded-[6px] border border-border/30"
        >
          <div className="h-7 w-7 rounded-[6px] bg-muted/60 shrink-0 animate-pulse" />
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
          "text-[9px] px-1.5 py-0.5 rounded-[6px] font-semibold transition-all",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {count}
      </span>
      {active && (
        <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-[6px] bg-primary" />
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
  const [categoryOpen, setCategoryOpen] = useState(false);

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

  const selectedCategory = getCategoryOption(categoryFilter);
  const categoryCounts = useMemo(
    () =>
      CATEGORY_FILTERS.reduce<Record<CategoryFilter, number>>((acc, option) => {
        acc[option.value] = notifications.filter((n) => matchesCategory(n, option.value)).length;
        return acc;
      }, {} as Record<CategoryFilter, number>),
    [notifications]
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
        onClick={() => {
          setCategoryOpen(false);
          onClose();
        }}
      />

      {/* Dropdown */}
      <aside
        className={cn(
          "fixed top-[58px] right-3 sm:right-5 z-50",
          "w-[min(620px,calc(100vw-24px))] max-h-[calc(100vh-76px)]",
          "bg-card border border-border/70 rounded-[6px]",
          "flex flex-col overflow-hidden shadow-2xl",
          "origin-top-right transition-all duration-200 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-y-2 scale-[0.98] pointer-events-none"
        )}
        aria-label="Notifications"
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="px-4 pt-3.5 pb-0 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative p-1.5 rounded-[6px] bg-primary/10 border border-primary/20">
                <Bell className="h-3.5 w-3.5 text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-[6px] bg-red-500 text-[8.5px] font-bold text-white flex items-center justify-center border-2 border-card">
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
                      <span className="h-1.5 w-1.5 rounded-[6px] bg-primary animate-pulse" />
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
                  className="p-1.5 rounded-[6px] text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
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
                  className="p-1.5 rounded-[6px] text-muted-foreground/60 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all disabled:opacity-40"
                >
                  {deleteAll.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setCategoryOpen(false);
                  onClose();
                }}
                title="Close"
                className="p-1.5 rounded-[6px] text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all"
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
          <div className="relative py-2">
            <button
              type="button"
              onClick={() => setCategoryOpen((prev) => !prev)}
              className={cn(
                "w-full h-9 px-3 rounded-[6px] border border-border/60 bg-background",
                "flex items-center justify-between gap-3 text-left transition-all",
                "hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              )}
              aria-haspopup="menu"
              aria-expanded={categoryOpen}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-6 w-6 rounded-[6px] bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <Filter className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Filter
                  </span>
                  <span className="block text-[12px] font-semibold text-foreground truncate">
                    {selectedCategory?.label ?? "All notifications"}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="rounded-[6px] bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {filtered.length}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    categoryOpen && "rotate-180"
                  )}
                />
              </span>
            </button>

            {categoryOpen && (
              <div
                role="menu"
                className="absolute left-0 right-0 top-[46px] z-20 rounded-[6px] border border-border/70 bg-card shadow-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter(null);
                    setCategoryOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-secondary/50 transition-colors",
                    categoryFilter === null && "bg-primary/10"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-[6px] bg-secondary flex items-center justify-center">
                      <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <span className="text-[12px] font-semibold text-foreground">All notifications</span>
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{notifications.length}</span>
                </button>

                {CATEGORY_FILTERS.map((option) => {
                  const active = categoryFilter === option.value;
                  const count = categoryCounts[option.value] ?? 0;
                  const configKey =
                    option.value === "consultations"
                      ? "consultation"
                      : option.value === "payments"
                      ? "payment"
                      : option.value === "documents"
                      ? "document"
                      : option.value === "alerts"
                      ? "alert"
                      : option.value;
                  const cfg = TYPE_CONFIG[configKey] ?? FALLBACK_CONFIG;
                  const Icon = cfg.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(option.value);
                        setCategoryOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-secondary/50 transition-colors border-t border-border/40",
                        active && "bg-primary/10"
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={cn("h-7 w-7 rounded-[6px] border flex items-center justify-center shrink-0", cfg.bg, cfg.border)}>
                          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold text-foreground truncate">{option.label}</span>
                          <span className="block text-[10px] text-muted-foreground">Show matching notifications</span>
                        </span>
                      </span>
                      <span className={cn("text-[10px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable List ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="py-1.5">
            {isLoading && <SkeletonLoader />}

            {isError && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="h-9 w-9 rounded-[6px] bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-3 border border-red-200 dark:border-red-800">
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
                <div className="h-9 w-9 rounded-[6px] bg-secondary flex items-center justify-center mb-3 border border-border/30">
                  <BellOff className="h-4.5 w-4.5 text-muted-foreground/40" />
                </div>
                <p className="text-[11px] font-semibold text-foreground">
                  {readFilter === "unread"
                    ? "No unread notifications"
                    : categoryFilter
                    ? `No ${selectedCategory?.label.toLowerCase() ?? "matching"} notifications`
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
