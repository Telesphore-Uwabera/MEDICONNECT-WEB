import { hasColumn, one } from "./db.js";

const ALLOWED = new Set(["active", "approved", "verified", "published", ""]);

function statusOk(row) {
  if (!row) return false;
  if (row.deleted_at) return false;
  if (row.is_active === 0 || row.is_active === false) return false;
  return ALLOWED.has(String(row.status || "active").toLowerCase());
}

export async function requireRegisteredFacility(id) {
  const hospitalId = Number(id);
  if (!hospitalId) return { error: "Choose a clinic or hospital registered on MediConnect." };
  const row = await one("SELECT * FROM hospitals WHERE id = ?", [hospitalId]).catch(() => null);
  if (!row) return { error: "That health facility is not registered on MediConnect." };
  if (await hasColumn("hospitals", "deleted_at") && row.deleted_at) {
    return { error: "That health facility is no longer on MediConnect." };
  }
  if (!statusOk(row)) {
    return { error: "Only approved clinics and hospitals on MediConnect can receive patients." };
  }
  return { hospital: row };
}

export async function requireRegisteredPharmacy(id) {
  const pharmacyId = Number(id);
  if (!pharmacyId) return { error: "Choose a pharmacy registered on MediConnect." };
  const row = await one("SELECT * FROM pharmacies WHERE id = ?", [pharmacyId]).catch(() => null);
  if (!row) return { error: "That pharmacy is not registered on MediConnect." };
  if (await hasColumn("pharmacies", "deleted_at") && row.deleted_at) {
    return { error: "That pharmacy is no longer on MediConnect." };
  }
  if (!statusOk(row)) {
    return { error: "Only approved pharmacies on MediConnect can receive patients." };
  }
  return { pharmacy: row };
}
