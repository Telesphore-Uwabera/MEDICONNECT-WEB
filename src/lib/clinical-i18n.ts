import type { TFunction } from "i18next";
import { HOSPITAL_PROTOCOL, PHARMACY_PROTOCOL } from "@/pages/doctor/appointments/shared/clinical-catalog";

/** Stable catalog key for an English clinical name. The stored order still uses the English name. */
export function clinicalItemKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function clinicalItemLabel(t: TFunction, label: string) {
  const key = clinicalItemKey(label);
  if (!key) return label;
  return t(`clinical.items.${key}`, { defaultValue: label });
}

export function clinicalKindLabel(t: TFunction, kind: string, fallback: string) {
  return t(`clinical.catalog.${kind}`, { defaultValue: fallback });
}

export function clinicalStoredLabel(t: TFunction, text: string) {
  const hospitalIndex = HOSPITAL_PROTOCOL.indexOf(text);
  if (hospitalIndex >= 0) return clinicalProtocolLabel(t, "hospital", hospitalIndex, text);
  const pharmacyIndex = PHARMACY_PROTOCOL.indexOf(text);
  if (pharmacyIndex >= 0) return clinicalProtocolLabel(t, "pharmacy", pharmacyIndex, text);
  return clinicalItemLabel(t, text);
}

export function clinicalProtocolLabel(
  t: TFunction,
  scope: "hospital" | "pharmacy",
  index: number,
  fallback: string,
) {
  return t(`clinical.protocol.${scope}.${index}`, { defaultValue: fallback });
}
