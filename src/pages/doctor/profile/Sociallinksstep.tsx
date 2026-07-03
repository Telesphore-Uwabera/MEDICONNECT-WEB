// ─────────────────────────────────────────────────────────────────────────────
// SocialLinksStep
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Link2 } from "lucide-react";
import { FormField } from "./UiPrimitives";
import { SOCIAL_PLATFORMS } from "./Constants";
import type { SocialLinksInfo } from "./Types";

interface SocialLinksStepProps {
  data: SocialLinksInfo;
  onChange: (v: SocialLinksInfo) => void;
}

export const SocialLinksStep = React.memo(function SocialLinksStep({
  data,
  onChange,
}: SocialLinksStepProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground -mt-1 mb-2">
        {t("doctorProfile.social_optional")}
      </p>

      <div className="grid grid-cols-1 gap-3">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
          <FormField key={key} label={label}>
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={data[key]}
                onChange={(e) => onChange({ ...data, [key]: e.target.value })}
                placeholder={placeholder}
                className="border-border focus-visible:ring-primary text-xs h-9"
                type="url"
              />
            </div>
          </FormField>
        ))}
      </div>
    </div>
  );
});
