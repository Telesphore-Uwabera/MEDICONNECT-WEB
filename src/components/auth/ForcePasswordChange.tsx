import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useUpdatePassword } from "@/hooks/admin/use-admin-settings";

/** Shown after a guest signs in with the temporary password. */
export function ForcePasswordChange({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const update = useUpdatePassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const save = () => {
    if (password.length < 8 || password !== confirm) {
      toast.error(t("clinical.chart.password_rules"));
      return;
    }
    update.mutate(
      { current_password: "", password, password_confirmation: password },
      {
        onSuccess: () => onDone(),
        onError: (error: unknown) => toast.error(error instanceof Error ? error.message : t("clinical.chart.password_failed")),
      },
    );
  };

  return (
    <div className="space-y-3" data-testid="force-password-change">
      <div>
        <p className="text-sm font-semibold text-foreground">{t("clinical.chart.must_change_title")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("clinical.chart.must_change_body")}</p>
      </div>
      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("clinical.chart.new_password")} />
      <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t("clinical.chart.confirm_password")} />
      <button
        type="button"
        onClick={save}
        disabled={update.isPending}
        className="h-10 w-full rounded-[6px] bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {t("clinical.chart.save_password")}
      </button>
    </div>
  );
}
