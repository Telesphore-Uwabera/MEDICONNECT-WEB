import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { TablePager, TABLE_PAGE_SIZE } from "@/components/TablePager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dependentsFrom,
  useDeleteDependent,
  usePatientDependents,
  useSaveDependent,
  type PatientDependent,
} from "@/hooks/patient/use-patient-dependents";
import { formatDateOnly } from "@/lib/date";

const EMPTY = { full_name: "", relationship: "", date_of_birth: "", phone: "", notes: "" };

export default function PatientFamily() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const list = usePatientDependents(page, TABLE_PAGE_SIZE);
  const save = useSaveDependent();
  const remove = useDeleteDependent();
  const rows = dependentsFrom(list.data);
  const total = list.data?.total ?? rows.length;
  const lastPage = list.data?.last_page ?? 1;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.relationship.trim()) {
      toast.error(t("pages.patient.family_required"));
      return;
    }
    try {
      await save.mutateAsync({ ...form, id: editingId ?? undefined });
      toast.success(editingId ? t("pages.patient.family_updated") : t("pages.patient.family_saved"));
      setForm(EMPTY);
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("pages.patient.family_save_failed"));
    }
  };

  const edit = (row: PatientDependent) => {
    setEditingId(row.id);
    setForm({
      full_name: row.full_name,
      relationship: row.relationship,
      date_of_birth: row.date_of_birth?.slice(0, 10) ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
    });
  };

  return (
    <DashboardLayout role="patient">
      <div className="flex h-full w-full flex-col">
        <PageHeader title={t("pages.patient.family_title")} subtitle={t("pages.patient.family_sub")} />
        <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
          <StatCard label={t("pages.patient.family_count")} value={total} icon={Users} />

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <form onSubmit={onSubmit} className="space-y-3 rounded-[6px] border border-border/70 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold">{editingId ? t("pages.patient.family_edit") : t("pages.patient.family_add")}</h3>
              <Input
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                placeholder={t("pages.patient.family_name")}
              />
              <Input
                value={form.relationship}
                onChange={(event) => setForm((prev) => ({ ...prev, relationship: event.target.value }))}
                placeholder={t("pages.patient.family_relationship")}
              />
              <Input
                type="date"
                value={form.date_of_birth}
                onChange={(event) => setForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
              />
              <Input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder={t("pages.patient.family_phone")}
              />
              <Input
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder={t("pages.patient.family_notes")}
              />
              <div className="flex gap-2">
                <Button type="submit" className="rounded-[6px]" disabled={save.isPending}>
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("pages.patient.family_save")}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-[6px]"
                    onClick={() => {
                      setEditingId(null);
                      setForm(EMPTY);
                    }}
                  >
                    {t("pages.patient.family_cancel")}
                  </Button>
                ) : null}
              </div>
            </form>

            <section className="overflow-hidden rounded-[6px] border border-border/70 bg-card shadow-sm">
              {list.isLoading ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.patient.family_loading")}</p>
              ) : rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("pages.patient.family_empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 font-semibold">{t("pages.patient.family_name")}</th>
                        <th className="px-5 py-3 font-semibold">{t("pages.patient.family_relationship")}</th>
                        <th className="px-5 py-3 font-semibold">{t("pages.patient.family_dob")}</th>
                        <th className="px-5 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-t border-border/50">
                          <td className="px-5 py-3 font-medium">{row.full_name}</td>
                          <td className="px-5 py-3 capitalize text-muted-foreground">{row.relationship}</td>
                          <td className="px-5 py-3 text-muted-foreground">{row.date_of_birth ? formatDateOnly(row.date_of_birth) : "—"}</td>
                          <td className="px-5 py-3 text-right">
                            <button type="button" className="mr-3 text-xs font-semibold text-primary" onClick={() => edit(row)}>
                              {t("pages.patient.family_edit")}
                            </button>
                            <button
                              type="button"
                              className="text-xs text-destructive"
                              onClick={async () => {
                                try {
                                  await remove.mutateAsync(row.id);
                                  toast.success(t("pages.patient.family_removed"));
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : t("pages.patient.family_remove_failed"));
                                }
                              }}
                            >
                              <Trash2 className="inline h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <TablePager page={page} lastPage={lastPage} total={total} onPageChange={setPage} className="border-t border-border/60 px-5 py-3" />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
