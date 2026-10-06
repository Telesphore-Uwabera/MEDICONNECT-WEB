import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "./UiPrimitives";
import {
  BROWSE_SPECIALTIES,
  browseSpecialtyValue,
  matchBrowseSpecialty,
} from "@/lib/browse-specialties";
import type { SpecializationsInfo } from "./Types";

interface SpecializationsStepProps {
  data: SpecializationsInfo;
  onChange: (v: SpecializationsInfo) => void;
}

export const SpecializationsStep = React.memo(function SpecializationsStep({
  data,
  onChange,
}: SpecializationsStepProps) {
  const { t } = useTranslation();
  const selected = useMemo(
    () => matchBrowseSpecialty({
      specialization_fee_id: data.specialization_fee_id,
      primary: data.primary,
      sub_specialization: data.sub_specialization,
    }),
    [data.specialization_fee_id, data.primary, data.sub_specialization],
  );

  return (
    <div className="grid grid-cols-1 gap-4">
      <FormField label={t("doctorProfile.specialization", { defaultValue: "Specialization" })}>
        <Select
          value={selected ? browseSpecialtyValue(selected) : undefined}
          onValueChange={(value) => {
            const item = BROWSE_SPECIALTIES.find((entry) => browseSpecialtyValue(entry) === value);
            if (!item) return;
            onChange({
              ...data,
              primary: item.subSpecializationName || item.specializationName || item.label,
              specialization_fee_id: item.feeId ?? null,
              sub_specialization: item.alsoMatch || item.subSpecializationName || item.specializationName || item.label,
              fee_name: item.label,
              sub_specializations: [],
              sub_specialization_names: [],
            });
          }}
        >
          <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
            <SelectValue placeholder={t("doctorProfile.choose_specialty", { defaultValue: "Choose a specialty" })} />
          </SelectTrigger>
          <SelectContent>
            {BROWSE_SPECIALTIES.map((item) => (
              <SelectItem key={item.key} value={browseSpecialtyValue(item)}>
                {item.subSpecializationName || item.specializationName || item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("doctorProfile.specialty_from_browse", {
            defaultValue: "These are the same specialties patients see under Browse by specialty.",
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
