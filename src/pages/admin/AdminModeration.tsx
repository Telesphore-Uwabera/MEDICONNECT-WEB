import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  useAdminModeration,
  setModerationStatus,
  type ModerationItem,
} from "@/lib/admin-store";
import { useToast } from "@/hooks/use-toast";
import { Check, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

const statusVariant = (s: ModerationItem["status"]) =>
  s === "open" ? "secondary" : s === "approved" ? "default" : "destructive";

const AdminModeration = () => {
  const { t, i18n } = useTranslation();
  const items = useAdminModeration();
  const open = items.filter((i) => i.status === "open");
  const [selected, setSelected] = useState<ModerationItem | null>(null);
  const { toast } = useToast();

  const decide = (status: "approved" | "removed") => {
    if (!selected) return;
    setModerationStatus(selected.id, status);
    toast({
      title:
        status === "approved"
          ? t("admin.moderation.approved_toast")
          : t("admin.moderation.removed_toast"),
    });
    setSelected(null);
  };

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("admin.moderation.title")}
        subtitle={t("admin.moderation.subtitle", { count: open.length })}
      />
      <div className="p-8">
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.moderation.kind")}</TableHead>
                <TableHead>{t("admin.moderation.subject")}</TableHead>
                <TableHead>{t("admin.moderation.reported_by")}</TableHead>
                <TableHead>{t("admin.moderation.reason")}</TableHead>
                <TableHead>{t("admin.moderation.status")}</TableHead>
                <TableHead className="text-right">
                  {t("admin.users.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="capitalize">{i.kind}</TableCell>
                  <TableCell className="font-medium">{i.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {i.reportedBy}
                  </TableCell>
                  <TableCell className="text-sm">{i.reason}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(i.status)}>
                      {t(`admin.moderation.${i.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelected(i)}
                    >
                      {t("admin.moderation.review")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{t("admin.moderation.drawer_title")}</DrawerTitle>
              <DrawerDescription>
                {t("admin.moderation.drawer_sub")}
              </DrawerDescription>
            </DrawerHeader>
            {selected && (
              <div className="px-4 pb-4 space-y-3 text-sm">
                <Field
                  label={t("admin.moderation.kind")}
                  value={selected.kind}
                />
                <Field
                  label={t("admin.moderation.subject")}
                  value={selected.subject}
                />
                <Field
                  label={t("admin.moderation.reported_by")}
                  value={selected.reportedBy}
                />
                <Field
                  label={t("admin.moderation.reason")}
                  value={selected.reason}
                />
                <Field
                  label={t("admin.users.joined")}
                  value={new Date(selected.createdAt).toLocaleString()}
                />
              </div>
            )}
            <DrawerFooter>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  onClick={() => decide("approved")}
                >
                  <Check className="h-4 w-4" /> {t("admin.moderation.approve")}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => decide("removed")}
                >
                  <Trash2 className="h-4 w-4" /> {t("admin.moderation.remove")}
                </Button>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost">{t("admin.common.close")}</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b border-border last:border-0">
    <span className="text-muted-foreground capitalize">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default AdminModeration;
