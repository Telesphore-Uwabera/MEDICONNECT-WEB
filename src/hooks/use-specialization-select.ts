import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

export interface Specialization {
  id: number;
  name: string;
  name_fr: string;
  name_kiny: string | null;
  slug: string;
   doctorCount?: number;
}

export interface SpecializationFee {
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

export interface SpecializationValue {
  specialization: Specialization | null;
  fee: SpecializationFee | null;
}

/** A selectable sub-type under a Specialist sub-specialization (e.g. under
 *  Cardiology: "Interventional Cardiology", "Electrophysiology", …). */
export interface SpecializationSubType {
  id: number;
  name: string;
  name_fr: string;
  name_kiny: string | null;
  slug: string;
  requires_approval: boolean;
}

export interface SpecializationSubTypesResponse {
  specialization: { id: number; name: string; slug: string };
  sub_types: SpecializationSubType[];
}

/* ─────────────────────────────────────────────
   Raw API hooks
───────────────────────────────────────────── */

export function useGetSpecializations(search = "") {
  return useQuery<Specialization[]>({
    queryKey: ["dropdowns-specializations", search],
    queryFn: () =>
      apiFetch(
        `/public/dropdowns/specializations${
          search ? `?search=${encodeURIComponent(search)}` : ""
        }`
      ),
  });
}

export function useGetSpecializationFees(
  specializationId: number | null,
  search = ""
) {
  return useQuery<SpecializationFee[]>({
    queryKey: ["dropdowns-specialization-fees", specializationId, search],
    queryFn: () =>
      apiFetch(
        `/public/dropdowns/specialization-fees?specialization_id=${specializationId}${
          search ? `&search=${encodeURIComponent(search)}` : ""
        }`
      ),
    enabled: specializationId !== null,
  });
}

/** Sub-types under a given sub-specialization slug (Specialist only). */
export function useGetSpecializationSubTypes(slug: string | null) {
  return useQuery<SpecializationSubTypesResponse>({
    queryKey: ["dropdowns-specialization-sub-types", slug],
    queryFn: () =>
      apiFetch(`/public/dropdowns/specialization-sub-types/${slug}`),
    enabled: !!slug,
  });
}



/* ─────────────────────────────────────────────
   Composed hook — used directly by the component
───────────────────────────────────────────── */

export function useSpecializationSelect() {
  const [step, setStep] = useState<"specialization" | "fee">("specialization");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [value, setValue] = useState<SpecializationValue>({
    specialization: null,
    fee: null,
  });

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const specializationsQuery = useGetSpecializations(
    step === "specialization" ? debouncedQuery : ""
  );

  const feesQuery = useGetSpecializationFees(
    step === "fee" ? (value.specialization?.id ?? null) : null,
    step === "fee" ? debouncedQuery : ""
  );

  // ── Actions ───────────────────────────────

  const selectSpecialization = (spec: Specialization) => {
    setValue({ specialization: spec, fee: null });
    setQuery("");
    setStep("fee");
  };

  const selectFee = (fee: SpecializationFee) => {
    setValue((prev) => ({ ...prev, fee }));
    setQuery("");
  };

  const clear = () => {
    setValue({ specialization: null, fee: null });
    setQuery("");
    setStep("specialization");
  };

  const backToSpecialization = () => {
    setQuery("");
    setStep("specialization");
  };

  const openDropdown = (hasSpecialization: boolean) => {
    setStep(hasSpecialization ? "fee" : "specialization");
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
    specializations: specializationsQuery.data ?? [],
    loadingSpecializations: specializationsQuery.isLoading,
    errorSpecializations: specializationsQuery.isError,

    fees: feesQuery.data ?? [],
    loadingFees: feesQuery.isLoading,
    errorFees: feesQuery.isError,

    // actions
    selectSpecialization,
    selectFee,
    clear,
    backToSpecialization,
    openDropdown,
    resetQuery,

    // derived
    triggerLabel,
  };
}
