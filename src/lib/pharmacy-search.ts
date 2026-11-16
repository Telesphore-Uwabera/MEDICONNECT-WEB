export function pharmacyMatchesSearch(
  pharmacy: { name?: string | null; city?: string | null; address?: string | null },
  term: string,
) {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [pharmacy.name, pharmacy.city, pharmacy.address].some((value) =>
    (value || "").toLowerCase().includes(needle),
  );
}
