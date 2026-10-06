import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateOnly } from "@/lib/date";
import { Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGetAdminUsers, useActivateUser, useSuspendUser } from "@/hooks/admin/use-admin-users";
import { useGetAdminDoctors, useApproveDoctor, useRejectDoctor } from "@/hooks/admin/use-admin-doctors";
import { useGetAdminHospitals, useApproveHospital, useRejectHospital } from "@/hooks/admin/use-admin-hospitals";
import { useGetAdminPharmacies, useApprovePharmacy, useRejectPharmacy } from "@/hooks/admin/use-admin-pharmacies";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye, Stethoscope, Hospital, Pill } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

const roleIcon = {
  doctor: Stethoscope,
  hospital: Hospital,
  pharmacy: Pill,
  patient: Stethoscope,
} as const;

type QueueUser = {
  id: number;
  kind: "doctor" | "hospital" | "pharmacy" | "user";
  name: string;
  email: string;
  phone: string;
  role: keyof typeof roleIcon;
  status: string;
  createdAt: string;
  meta?: Record<string, string>;
};

const PENDING = new Set(["pending", "action_requested"]);

const AdminApprovals = () => {
  const { t } = useTranslation();
  const doctors = useGetAdminDoctors({ status: "pending" });
  const hospitals = useGetAdminHospitals({ status: "pending" });
  const pharmacies = useGetAdminPharmacies({ status: "pending" });
  const users = useGetAdminUsers({ status: "pending" });
  const approveDoctor = useApproveDoctor();
  const rejectDoctor = useRejectDoctor();
  const approveHospital = useApproveHospital();
  const rejectHospital = useRejectHospital();
  const approvePharmacy = useApprovePharmacy();
  const rejectPharmacy = useRejectPharmacy();
  const activateUser = useActivateUser();
  const suspendUser = useSuspendUser();
  const pending: QueueUser[] = [
    ...(doctors.data?.data ?? [])
      .filter((doctor) => PENDING.has(doctor.status))
      .map((doctor) => ({
        id: doctor.id,
        kind: "doctor" as const,
        name: doctor.user?.name || "Doctor",
        email: doctor.user?.email || "",
        phone: doctor.user?.phone || "",
        role: "doctor" as const,
        status: doctor.status,
        createdAt: doctor.created_at || "",
        meta: doctor.specialization
          ? { specialty: typeof doctor.specialization === "string" ? doctor.specialization : doctor.specialization.name_en || "" }
          : undefined,
      })),
    ...(hospitals.data?.data ?? [])
      .filter((hospital) => PENDING.has(hospital.status))
      .map((hospital) => ({
        id: hospital.id,
        kind: "hospital" as const,
        name: hospital.name_en || "Health facility",
        email: hospital.email || hospital.user?.email || "",
        phone: hospital.phone || "",
        role: "hospital" as const,
        status: hospital.status,
        createdAt: hospital.created_at || "",
        meta: hospital.city ? { city: hospital.city } : undefined,
      })),
    ...(pharmacies.data?.data ?? [])
      .filter((pharmacy) => PENDING.has(pharmacy.status))
      .map((pharmacy) => ({
        id: pharmacy.id,
        kind: "pharmacy" as const,
        name: pharmacy.name_en || "Pharmacy",
        email: pharmacy.email || pharmacy.user?.email || "",
        phone: pharmacy.phone || "",
        role: "pharmacy" as const,
        status: pharmacy.status,
        createdAt: pharmacy.created_at || "",
        meta: pharmacy.city ? { city: pharmacy.city } : undefined,
      })),
    ...(users.data?.data ?? [])
      .filter((user) => user.status === "pending")
      .map((user) => ({
        id: user.id,
        kind: "user" as const,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: (user.roles?.find((role) => role.name === "doctor" || role.name === "hospital" || role.name === "pharmacy" || role.name === "patient")?.name || "patient") as QueueUser["role"],
        status: user.status,
        createdAt: user.created_at,
      })),
  ];
  const isLoading = doctors.isLoading || hospitals.isLoading || pharmacies.isLoading || users.isLoading;
  const [selected, setSelected] = useState<QueueUser | null>(null);
  const [confirm, setConfirm] = useState<{
    user: QueueUser;
    action: "approve" | "reject";
  } | null>(null);
  const { toast } = useToast();

  const apply = () => {
    if (!confirm) return;
    const { user, action } = confirm;
    const onSuccess = () => {
      toast({
        title:
          action === "approve"
            ? t("admin.approvals.approved_toast", { name: user.name })
            : t("admin.approvals.rejected_toast", { name: user.name }),
      });
      setConfirm(null);
      setSelected(null);
    };
    const onError = (error: Error) => {
      toast({ title: error.message || "Could not update this account." });
    };
    if (user.kind === "doctor") {
      if (action === "approve") approveDoctor.mutate(user.id, { onSuccess, onError });
      else rejectDoctor.mutate({ id: user.id }, { onSuccess, onError });
      return;
    }
    if (user.kind === "hospital") {
      if (action === "approve") approveHospital.mutate(user.id, { onSuccess, onError });
      else rejectHospital.mutate({ id: user.id }, { onSuccess, onError });
      return;
    }
    if (user.kind === "pharmacy") {
      if (action === "approve") approvePharmacy.mutate(user.id, { onSuccess, onError });
      else rejectPharmacy.mutate({ id: user.id }, { onSuccess, onError });
      return;
    }
    if (action === "approve") activateUser.mutate(user.id, { onSuccess, onError });
    else suspendUser.mutate(user.id, { onSuccess, onError });
  };

  return (
    <DashboardLayout role="admin">
      <PageHeader
        title={t("admin.approvals.title")}
        subtitle={t("admin.approvals.subtitle", {
          count: pending.length,
          defaultValue_plural: t("admin.approvals.subtitle_plural", {
            count: pending.length,
          }),
        })}
      />
      <div className="p-8">
        {isLoading ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              {t("common.loading")}
            </CardContent>
          </Card>
        ) : pending.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              {t("admin.approvals.empty")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pending.map((u) => {
              const Icon = roleIcon[u.role];
              return (
                <Card
                  key={u.id}
                  className="hover:shadow-medium transition-smooth"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-[6px] bg-primary-soft text-primary flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {t(`admin.roles.${u.role}`)}
                      </Badge>
                    </div>
                    {u.meta && (
                      <div className="mt-4 text-xs text-muted-foreground space-y-1">
                        {Object.entries(u.meta).map(([k, v]) => (
                          <div key={k}>
                            <span className="capitalize">{k}:</span>{" "}
                            <span className="text-foreground">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-5 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelected(u)}
                      >
                        <Eye className="h-3.5 w-3.5" />{" "}
                        {t("admin.approvals.view")}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-primary hover:opacity-90"
                        onClick={() =>
                          setConfirm({ user: u, action: "approve" })
                        }
                      >
                        <Check className="h-3.5 w-3.5" />{" "}
                        {t("admin.approvals.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setConfirm({ user: u, action: "reject" })
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{t("admin.approvals.drawer_title")}</DrawerTitle>
              <DrawerDescription>
                {t("admin.approvals.drawer_sub")}
              </DrawerDescription>
            </DrawerHeader>
            {selected && (
              <div className="px-4 pb-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t("admin.users.name")} value={selected.name} />
                  <Field
                    label={t("admin.users.role")}
                    value={t(`admin.roles.${selected.role}`)}
                  />
                  <Field label="Email" value={selected.email} />
                  <Field
                    label={t("admin.users.contact")}
                    value={selected.phone}
                  />
                  <Field
                    label={t("admin.users.joined")}
                    value={formatDateOnly(selected.createdAt)}
                  />
                  <Field
                    label={t("admin.users.status")}
                    value={t(`admin.status.${selected.status}`)}
                  />
                </div>
                {selected.meta && (
                  <div className="rounded-[6px] border border-border p-4 bg-secondary/30">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Details
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(selected.meta).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground capitalize">
                            {k}:{" "}
                          </span>
                          {v}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DrawerFooter>
              {selected && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                    onClick={() =>
                      setConfirm({ user: selected, action: "approve" })
                    }
                  >
                    <Check className="h-4 w-4" /> {t("admin.approvals.approve")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      setConfirm({ user: selected, action: "reject" })
                    }
                  >
                    <X className="h-4 w-4" /> {t("admin.approvals.reject")}
                  </Button>
                </div>
              )}
              <DrawerClose asChild>
                <Button variant="ghost">{t("admin.common.close")}</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "approve"
                ? t("admin.approvals.confirm_approve_title")
                : t("admin.approvals.confirm_reject_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "approve"
                ? t("admin.approvals.confirm_approve_desc", {
                  role: confirm ? t(`admin.roles.${confirm.user.role}`) : "",
                })
                : t("admin.approvals.confirm_reject_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={apply}>
              {t("admin.common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 text-sm font-medium">{value}</div>
  </div>
);

export default AdminApprovals;

