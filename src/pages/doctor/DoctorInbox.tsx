import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TablePager, paginateRows, tablePageCount } from "@/components/TablePager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listFrom } from "@/lib/list-payload";
import { normalizeDateTimeText } from "@/lib/display-dates";
import {
  useGetNotifications,
  useMarkAllRead,
  useMarkOneRead,
  type Notification,
} from "@/hooks/use-notifications";

export default function DoctorInbox() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const list = useGetNotifications({ per_page: 50 });
  const markOne = useMarkOneRead();
  const markAll = useMarkAllRead();
  const rows = listFrom<Notification>(list.data);
  const unread = rows.filter((item) => !item.is_read).length;
  const paged = paginateRows(rows, page);
  const lastPage = tablePageCount(rows.length);
  const titleOf = (item: Notification) =>
    normalizeDateTimeText(item.title) || t("common.notifications.title", "Notification");

  const empty = useMemo(() => !list.isLoading && rows.length === 0, [list.isLoading, rows.length]);

  return (
    <DashboardLayout role="doctor">
      <div className="flex h-full w-full flex-col">
        <PageHeader title={t("pages.doctor.inbox_title")} subtitle={t("pages.doctor.inbox_sub")} />
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <StatCard label={t("pages.doctor.inbox_all")} value={rows.length} icon={Inbox} />
              <StatCard label={t("pages.doctor.inbox_unread")} value={unread} icon={Bell} accent="warning" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-[6px]"
              disabled={!unread || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              {t("pages.doctor.inbox_mark_all")}
            </Button>
          </div>

          <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
            {list.isLoading ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.doctor.loading")}</p>
            ) : empty ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.doctor.inbox_empty")}</p>
            ) : (
              <>
                <div className="divide-y divide-border/60">
                  {paged.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (!item.is_read) markOne.mutate(item.id);
                      }}
                      className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left hover:bg-secondary/30"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{titleOf(item)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{normalizeDateTimeText(item.message)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {!item.is_read ? (
                          <Badge className="rounded-[6px]">{t("pages.doctor.inbox_unread")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-[6px]">{item.type}</Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <TablePager page={page} lastPage={lastPage} total={rows.length} onPageChange={setPage} className="border-t border-border/60 px-5 py-3" />
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
