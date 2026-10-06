import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout } from "@/components/DashboardLayout";

const AdminModeration = () => {
  const { t } = useTranslation();

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("admin.moderation.title")}
        subtitle={t("admin.moderation.subtitle", { count: 0 })}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                  <Badge variant="secondary">{t("admin.moderation.empty", { defaultValue: "No reports waiting for review." })}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminModeration;
