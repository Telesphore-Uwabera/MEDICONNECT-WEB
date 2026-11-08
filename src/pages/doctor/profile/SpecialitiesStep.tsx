import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { FormField } from "./UiPrimitives";
import { BrowseSpecialityPicker } from "@/components/auth/BrowseSpecialityPicker";
import {
  browseValueForLabel,
  findBrowseSpeciality,
  landingSpecialityLabels,
} from "@/lib/browse-specialities";
import type { SpecialitiesInfo } from "./Types";

interface SpecialitiesStepProps {
  data: SpecialitiesInfo;
  onChange: (v: SpecialitiesInfo) => void;
}

export const SpecialitiesStep = React.memo(function SpecialitiesStep({
  data,
  onChange,
}: SpecialitiesStepProps) {
  const { t } = useTranslation();
  const values = useMemo(() => {
    const labels = landingSpecialityLabels({
      specialization: data.primary,
      specialization_fee_id: data.specialization_fee_id,
    });
    return labels.flatMap((label) => {
      const value = browseValueForLabel(label);
      return value ? [value] : [];
    });
  }, [data.primary, data.specialization_fee_id]);

  return (
    <div className="grid grid-cols-1 gap-4">
      <FormField label={t("doctorProfile.speciality", { defaultValue: "Speciality" })}>
        <BrowseSpecialityPicker
          selected={values}
          onChange={(next) => {
            const items = next.map((value) => findBrowseSpeciality(value)).filter((item) => item != null);
            const labels = items.map((item) => item.label);
            onChange({
              ...data,
              primary: labels.join(", "),
              specialization_fee_id: items.find((item) => item.feeId != null)?.feeId ?? null,
              sub_specialization: labels.join(", "),
              fee_name: labels.join(", "),
              sub_specializations: [],
              sub_speciality_names: labels,
            });
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("doctorProfile.speciality_from_browse", {
            defaultValue: "These are the same specialities patients see under Browse by speciality.",
          })}
        </p>
      </FormField>

      <FormField label={t("doctorProfile.years_of_experience")}>
        <Input
          type="number"
          min={0}
          value={data.years_of_experience ?? ""}
          onChange={(event) => onChange({
            ...data,
            years_of_experience: Number(event.target.value) || 0,
          })}
          className="border-border focus-visible:ring-primary text-xs h-9"
        />
      </FormField>
    </div>
  );
});
