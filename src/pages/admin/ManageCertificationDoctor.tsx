import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Trash2,
  UserPlus,
  Star,
  Mail,
} from "lucide-react";
import {
  useGetCertificationDoctors,
  useAddCertificationDoctor,
  useUpdateCertificationDoctor,
  useRemoveCertificationDoctor,
  useGetAdminDoctors,
  type ApiCertificationDoctor,
} from "@/hooks/admin/use-admin-doctors";

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function getErrMsg(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message || fallback;
}

function ManageCertificationDoctor() {
  const { t } = useTranslation();

  const { data: team, isLoading: teamLoading } = useGetCertificationDoctors();
  const addMutation = useAddCertificationDoctor();
  const updateMutation = useUpdateCertificationDoctor();
  const removeMutation = useRemoveCertificationDoctor();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: doctorSearch, isFetching: searching } = useGetAdminDoctors({
    status: "active",
    search: debounced || undefined,
  });

  const [pendingId, setPendingId] = useState<number | null>(null);

  const teamList = team ?? [];
  const activeEntry = teamList.find((cd) => cd.status === "active") ?? null;
  const otherEntries = teamList.filter((cd) => cd.id !== activeEntry?.id);
  const onTeamIds = new Set(teamList.map((cd) => cd.doctor.id));
  const searchResults = (doctorSearch?.data ?? []).filter((d) => !onTeamIds.has(d.id));

  const handleMakeActive = (doctorId: number) => {
    setPendingId(doctorId);
    addMutation.mutate(
      { doctor_id: doctorId },
      {
        onSuccess: () => {
          toast.success(t("pages.admin.cert_doctor.toast_set_active", { defaultValue: "Doctor is now in charge of fitness certificates." }));
          setSearch("");
        },
        onError: (err: unknown) =>
          toast.error(getErrMsg(err, t("pages.admin.cert_doctor.toast_set_failed", { defaultValue: "Failed to set certification doctor." }))),
        onSettled: () => setPendingId(null),
      },
    );
  };

  const handleReactivate = (entry: ApiCertificationDoctor) => {
    updateMutation.mutate(
      { id: entry.id, status: "active" },
      {
        onSuccess: () =>
          toast.success(
            t("pages.admin.cert_doctor.toast_reactivated", {
              defaultValue: "{{name}} is now the active certification doctor.",
              name: entry.doctor.user.name,
            }),
          ),
        onError: (err: unknown) =>
          toast.error(getErrMsg(err, t("pages.admin.cert_doctor.toast_activate_failed", { defaultValue: "Failed to activate doctor." }))),
      },
    );
  };

  const handleDeactivate = (entry: ApiCertificationDoctor) => {
    updateMutation.mutate(
      { id: entry.id, status: "inactive" },
      {
        onError: (err: unknown) =>
          toast.error(getErrMsg(err, t("pages.admin.cert_doctor.toast_deactivate_failed", { defaultValue: "Failed to deactivate doctor." }))),
      },
    );
  };

  const handleToggleAvailability = (entry: ApiCertificationDoctor) => {
    updateMutation.mutate(
      { id: entry.id, is_available: !entry.is_available },
      {
        onError: (err: unknown) =>
          toast.error(getErrMsg(err, t("pages.admin.cert_doctor.toast_availability_failed", { defaultValue: "Failed to update availability." }))),
      },
    );
  };

  const handleRemove = (entry: ApiCertificationDoctor) => {
    const confirmMsg = t("pages.admin.cert_doctor.confirm_remove", {
      defaultValue: "Remove {{name}} from the certification team?",
      name: entry.doctor.user.name,
    });
    if (!window.confirm(confirmMsg)) return;
    removeMutation.mutate(entry.id, {
      onError: (err: unknown) =>
        toast.error(getErrMsg(err, t("pages.admin.cert_doctor.toast_remove_failed", { defaultValue: "Failed to remove doctor." }))),
    });
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.cert_doctor.title", { defaultValue: "Certification Doctor" })}
          subtitle={t("pages.admin.cert_doctor.subtitle", {
            defaultValue: "Choose the doctor in charge of reviewing fitness certificates. Only one doctor can be active at a time.",
          })}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 max-w-3xl">
          {/* ── Active doctor ── */}
          <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">
                {t("pages.admin.cert_doctor.active_heading", { defaultValue: "Active certification doctor" })}
              </p>
            </div>
            <div className="p-4">
              {teamLoading ? (
                <div className="h-16 rounded-[6px] bg-muted/50 animate-pulse" />
              ) : activeEntry ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-[6px] border border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/10">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-[6px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {initials(activeEntry.doctor.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-foreground truncate">
                        {activeEntry.doctor.user.name}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground/70 truncate flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5" /> {activeEntry.doctor.user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={cn(
                            "text-[9.5px] px-1.5 py-0.5 rounded-[6px] font-medium border",
                            activeEntry.is_available
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
                              : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
                          )}
                        >
                          {activeEntry.is_available
                            ? t("pages.admin.cert_doctor.available", { defaultValue: "Available" })
                            : t("pages.admin.cert_doctor.unavailable", { defaultValue: "Unavailable" })}
                        </span>
                        <span className="text-[9.5px] text-muted-foreground/60">
                          {t("pages.admin.cert_doctor.counts", {
                            defaultValue: "{{pending}} pending · {{inReview}} in review",
                            pending: activeEntry.pending_count,
                            inReview: activeEntry.in_review_count,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-[11px] rounded-[6px] gap-1.5"
                      onClick={() => handleToggleAvailability(activeEntry)}
                      disabled={updateMutation.isPending}
                    >
                      {activeEntry.is_available ? <PauseCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      {activeEntry.is_available
                        ? t("pages.admin.cert_doctor.mark_unavailable", { defaultValue: "Mark unavailable" })
                        : t("pages.admin.cert_doctor.mark_available", { defaultValue: "Mark available" })}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-[11px] rounded-[6px] gap-1.5"
                      onClick={() => handleDeactivate(activeEntry)}
                      disabled={updateMutation.isPending}
                    >
                      <XCircle className="w-3 h-3" />
                      {t("pages.admin.cert_doctor.deactivate", { defaultValue: "Deactivate" })}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <div className="h-10 w-10 rounded-[6px] bg-muted flex items-center justify-center">
                    <ShieldCheck className="w-4.5 h-4.5 text-muted-foreground/50" />
                  </div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {t("pages.admin.cert_doctor.no_active", { defaultValue: "No active certification doctor" })}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 max-w-[280px]">
                    {t("pages.admin.cert_doctor.no_active_hint", {
                      defaultValue: "Search for a doctor below and set them as the certification doctor.",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Picker ── */}
          <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-[6px] bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <UserPlus className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {t("pages.admin.cert_doctor.set_heading", { defaultValue: "Set a doctor" })}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {t("pages.admin.cert_doctor.set_hint", {
                    defaultValue: "Activating a doctor here will replace the current one.",
                  })}
                </p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("pages.admin.cert_doctor.search_placeholder", { defaultValue: "Search doctors by name or email…" })}
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {searching ? (
                  <div className="flex items-center gap-2 px-2 py-3 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t("pages.admin.cert_doctor.searching", { defaultValue: "Searching…" })}
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="px-2 py-3 text-[11px] text-muted-foreground/60">
                    {debounced
                      ? t("pages.admin.cert_doctor.no_matches", { defaultValue: "No matching doctors." })
                      : t("pages.admin.cert_doctor.search_hint", { defaultValue: "Type to search for a doctor to assign." })}
                  </p>
                ) : (
                  searchResults.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-[6px] border border-border/50 hover:border-primary/30 hover:bg-secondary/20 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-[6px] bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground/70 shrink-0">
                        {initials(d.user?.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{d.user?.name}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{d.user?.email}</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 px-2.5 text-[10.5px] rounded-[6px] gap-1.5 shrink-0"
                        onClick={() => handleMakeActive(d.id)}
                        disabled={addMutation.isPending && pendingId === d.id}
                      >
                        {addMutation.isPending && pendingId === d.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Star className="w-3 h-3" />
                        )}
                        {t("pages.admin.cert_doctor.make_active", { defaultValue: "Make active" })}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Previously assigned (inactive) ── */}
          {otherEntries.length > 0 && (
            <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border/50">
                <p className="text-[13px] font-semibold text-foreground">
                  {t("pages.admin.cert_doctor.previous_heading", { defaultValue: "Previously assigned" })}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {t("pages.admin.cert_doctor.previous_hint", { defaultValue: "Inactive certification-team members." })}
                </p>
              </div>
              <div className="divide-y divide-border/40">
                {otherEntries.map((entry) => (
                  <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-[6px] bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                        {initials(entry.doctor.user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-foreground truncate">{entry.doctor.user.name}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{entry.doctor.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[10.5px] rounded-[6px] gap-1.5"
                        onClick={() => handleReactivate(entry)}
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {t("pages.admin.cert_doctor.set_active", { defaultValue: "Set active" })}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[10.5px] rounded-[6px] gap-1.5 border-red-300/60 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/20"
                        onClick={() => handleRemove(entry)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                        {t("pages.admin.cert_doctor.remove", { defaultValue: "Remove" })}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}

export default ManageCertificationDoctor;
