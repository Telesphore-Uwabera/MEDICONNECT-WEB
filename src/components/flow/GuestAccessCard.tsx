import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

/** Temporary password plus the next steps after a guest books. */
export function GuestAccessCard({ email, password }: { email: string; password: string }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success(t("clinical.flow.password_copied"));
    } catch {
      toast.error(t("clinical.flow.password_copy_failed"));
    }
  };

  const steps = [
    t("clinical.flow.next_email"),
    t("clinical.flow.next_join"),
    t("clinical.flow.next_video"),
  ];

  return (
    <section data-testid="guest-confirmation" className="mx-4 mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 sm:mx-6">
      <div>
        <p className="text-sm font-semibold text-foreground">{t("clinical.chart.guest_access_title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("clinical.chart.guest_access_body")}</p>
      </div>
      <Input value={email} readOnly aria-label={t("clinical.flow.email_label")} />
      <div className="flex gap-2">
        <Input
          data-testid="guest-temp-password"
          type={shown ? "text" : "password"}
          value={password}
          readOnly
          aria-label={t("clinical.flow.password_label")}
          className="font-mono tracking-wide"
        />
        <button
          type="button"
          onClick={() => setShown((value) => !value)}
          className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {shown ? t("clinical.flow.hide") : t("clinical.flow.show")}
        </button>
        <button
          type="button"
          data-testid="guest-copy-password"
          onClick={copy}
          className="inline-flex h-10 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {t("clinical.flow.copy")}
        </button>
      </div>
      <ol className="space-y-1.5 text-xs leading-relaxed text-foreground">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
