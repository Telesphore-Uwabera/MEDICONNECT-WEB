import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Link2, Loader2 } from "lucide-react";
import { FormField } from "./UiPrimitives";
import { SOCIAL_PLATFORMS } from "./Constants";
import type { SocialLinksInfo } from "./Types";
import {
  checkSocialLink,
  type SocialCheckResult,
  type SocialPlatform,
} from "@/lib/social-link";
import { cn } from "@/lib/utils";

interface SocialLinksStepProps {
  data: SocialLinksInfo;
  onChange: (v: SocialLinksInfo) => void;
}

function statusMessage(
  result: SocialCheckResult | undefined,
  t: (key: string, options?: Record<string, string>) => string,
) {
  if (!result || result.code === "empty" || result.code === "ok") {
    return result?.code === "ok" ? t("doctorProfile.social_working") : "";
  }
  if (result.code === "wrong_platform") {
    return t("doctorProfile.social_wrong_platform", { platform: result.label || result.platform || "" });
  }
  if (result.code === "missing") return t("doctorProfile.social_missing");
  if (result.code === "unreachable") return t("doctorProfile.social_unreachable");
  return t("doctorProfile.social_invalid");
}

export const SocialLinksStep = React.memo(function SocialLinksStep({
  data,
  onChange,
}: SocialLinksStepProps) {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<Partial<Record<SocialPlatform, SocialCheckResult>>>({});
  const [pending, setPending] = useState<Partial<Record<SocialPlatform, boolean>>>({});

  useEffect(() => {
    let cancelled = false;
    const timers = SOCIAL_PLATFORMS.map(({ key }) => {
      const value = data[key];
      if (!value.trim()) {
        setChecks((current) => ({ ...current, [key]: { ok: true, code: "empty" } }));
        setPending((current) => ({ ...current, [key]: false }));
        return undefined;
      }
      setPending((current) => ({ ...current, [key]: true }));
      return window.setTimeout(async () => {
        const result = await checkSocialLink(key, value);
        if (cancelled) return;
        setChecks((current) => ({ ...current, [key]: result }));
        setPending((current) => ({ ...current, [key]: false }));
      }, 700);
    });
    return () => {
      cancelled = true;
      timers.forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
        {t("doctorProfile.social_optional")}
      </p>

      <div className="grid grid-cols-1 gap-3">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => {
          const result = checks[key];
          const waiting = !!pending[key] && !!data[key].trim();
          const failed = !!result && !result.ok;
          const working = result?.code === "ok" && !waiting;
          const message = waiting ? t("doctorProfile.social_checking") : statusMessage(result, t);
          return (
            <FormField key={key} label={label} error={failed && !waiting ? message : undefined}>
              <div className="flex items-center gap-2">
                {waiting ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Link2 className={cn("h-3.5 w-3.5 shrink-0", working ? "text-primary" : "text-muted-foreground")} />
                )}
                <Input
                  value={data[key]}
                  onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                  placeholder={placeholder}
                  aria-invalid={failed && !waiting}
                  className={cn(
                    "h-9 text-xs focus-visible:ring-primary",
                    failed && !waiting && "border-destructive focus-visible:ring-destructive",
                    working && "border-primary",
                  )}
                  type="text"
                  inputMode="url"
                />
              </div>
              {waiting && <p className="text-[10px] text-muted-foreground">{message}</p>}
              {working && <p className="text-[10px] text-primary">{message}</p>}
            </FormField>
          );
        })}
      </div>
    </div>
  );
});
