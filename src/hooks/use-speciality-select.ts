import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface Speciality {
  id: number;
  name: string;
  name_fr: string;
  name_kiny: string | null;
  slug: string;
   doctorCount?: number;
}

export interface SpecialityFee {
  id: number;
  specialization_id: number;
  sub_specialization: string;
  sub_specialization_fr: string;
  sub_specialization_kiny: string | null;
  tier_name: string;
  slug: string;
  online_fee: string;
  in_person_fee: string;
  currency: string;
}

export interface SpecialityValue {
  specialization: Speciality | null;
  fee: SpecialityFee | null;
}

/** A selectable sub-type under a Specialist sub-speciality (e.g. under
 *  Cardiology: "Interventional Cardiology", "Electrophysiology", …). */
export interface SpecialitySubType {
  id: number;
  name: string;
  name_fr: string;
  name_kiny: string | null;
  slug: string;
  requires_approval: boolean;
}

export interface SpecialitySubTypesResponse {
  specialization: { id: number; name: string; slug: string };
  sub_types: SpecialitySubType[];
}

/* ─────────────────────────────────────────────
   Raw API hooks
───────────────────────────────────────────── */

export function useGetSpecialities(search = "") {
  return useQuery<Speciality[]>({
    queryKey: ["dropdowns-specializations", search],
    queryFn: () =>
      apiFetch(
        `/public/dropdowns/specializations${
          search ? `?search=${encodeURIComponent(search)}` : ""
        }`
      ),
  });
}

export function useGetSpecialityFees(
  specialityId: number | null,
  search = ""
) {
  return useQuery<SpecialityFee[]>({
    queryKey: ["dropdowns-specialization-fees", specialityId, search],
    queryFn: () =>
      apiFetch(
        `/public/dropdowns/specialization-fees?specialization_id=${specialityId}${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`
      ),
    enabled: specialityId !== null,
  });
}

/** Sub-types under a given sub-speciality slug (Specialist only). */
export function useGetSpecialitySubTypes(slug: string | null) {
  return useQuery<SpecialitySubTypesResponse>({
    queryKey: ["dropdowns-specialization-sub-types", slug],
    queryFn: () =>
      apiFetch(`/public/dropdowns/specialization-sub-types/${slug}`),
    enabled: !!slug,
  });
}



/* ─────────────────────────────────────────────
   Composed hook — used directly by the component
───────────────────────────────────────────── */

export function useSpecialitySelect() {
  const [step, setStep] = useState<"specialization" | "fee">("specialization");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [value, setValue] = useState<SpecialityValue>({
    specialization: null,
    fee: null,
  });

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const specialitiesQuery = useGetSpecialities(
    step === "specialization" ? debouncedQuery : ""
  );

  const feesQuery = useGetSpecialityFees(
    step === "fee" ? (value.specialization?.id ?? null) : null,
    step === "fee" ? debouncedQuery : ""
  );

  // ── Actions ───────────────────────────────

  const selectSpeciality = (spec: Speciality) => {
    setValue({ specialization: spec, fee: null });
    setQuery("");
    setStep("fee");
  };

  const selectFee = (fee: SpecialityFee) => {
    setValue((prev) => ({ ...prev, fee }));
    setQuery("");
  };

  const clear = () => {
    setValue({ specialization: null, fee: null });
    setQuery("");
    setStep("specialization");
  };

  const backToSpeciality = () => {
    setQuery("");
    setStep("specialization");
  };

  const openDropdown = (hasSpeciality: boolean) => {
    setStep(hasSpeciality ? "fee" : "specialization");
  };

  const resetQuery = () => setQuery("");

  // ── Derived ───────────────────────────────

  const triggerLabel = value.fee
    ? `${value.specialization?.name} › ${value.fee.sub_specialization} (${value.fee.tier_name})`
    : value.specialization
    ? value.specialization.name
    : null;

  return {
    // state
    step,
    query,
    setQuery,
    value,

    // data
    specializations: specialitiesQuery.data ?? [],
    loadingSpecialities: specialitiesQuery.isLoading,
    errorSpecialities: specialitiesQuery.isError,

    fees: feesQuery.data ?? [],
    loadingFees: feesQuery.isLoading,
    errorFees: feesQuery.isError,

    // actions
    selectSpeciality,
    selectFee,
    clear,
    backToSpeciality,
    openDropdown,
    resetQuery,

    // derived
    triggerLabel,
  };
}
