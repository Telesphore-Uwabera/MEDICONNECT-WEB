import { hasColumn, insert, one, presentRow, q, tableExists, update } from "./db.js";
import { loadOwnedId } from "./auth.js";
import { requireRegisteredFacility, requireRegisteredPharmacy } from "./care-partners.js";
import { onReferralCreated } from "./clinical-episodes.js";

async function notifyUser(userId, title, message) {
  if (!userId || !(await hasColumn("notifications", "notifiable_id"))) return;
  const fields = {
    notifiable_id: userId,
    data: JSON.stringify({ title, message, body: message, type: "care.referral" }),
  };
  if (await hasColumn("notifications", "type")) fields.type = "care.referral";
  if (await hasColumn("notifications", "notifiable_type")) {
    fields.notifiable_type = "App\\Models\\User";
  }
  const now = new Date();
  if (await hasColumn("notifications", "created_at")) fields.created_at = now;
  if (await hasColumn("notifications", "updated_at")) fields.updated_at = now;
  await insert("notifications", fields).catch(() => {});
}

async function resolvePatient(rawId) {
  const id = Number(rawId);
  if (!id) return null;
  return (
    (await one("SELECT * FROM patients WHERE id = ? OR user_id = ? LIMIT 1", [id, id]).catch(() => null)) ||
    null
  );
}

async function doctorCard(id) {
  if (!id) return null;
  const doctor = await one("SELECT id, user_id, specialization, image FROM doctors WHERE id = ?", [id]).catch(() => null);
  if (!doctor) return null;
  const user = doctor.user_id
    ? await one("SELECT id, name, email, phone, avatar FROM users WHERE id = ?", [doctor.user_id]).catch(() => null)
    : null;
  return {
    id: doctor.id,
    name: user?.name || `Doctor #${doctor.id}`,
    specialization: doctor.specialization || null,
    image: doctor.image || user?.avatar || null,
    email: user?.email || null,
    phone: user?.phone || null,
  };
}

async function hospitalCard(id) {
  if (!id) return null;
  const hospital = await one(
    "SELECT id, name_en, slug, city, address, phone, logo, image FROM hospitals WHERE id = ?",
    [id],
  ).catch(() => null);
  if (!hospital) return null;
  return {
    id: hospital.id,
    name: hospital.name_en || `Facility #${hospital.id}`,
    slug: hospital.slug || null,
    city: hospital.city || null,
    address: hospital.address || null,
    phone: hospital.phone || null,
    image: hospital.logo || hospital.image || null,
  };
}

async function pharmacyCard(id) {
  if (!id) return null;
  const pharmacy = await one(
    "SELECT id, name_en, name, slug, city, address, phone, logo FROM pharmacies WHERE id = ?",
    [id],
  ).catch(() => null);
  if (!pharmacy) return null;
  return {
    id: pharmacy.id,
    name: pharmacy.name_en || pharmacy.name || `Pharmacy #${pharmacy.id}`,
    slug: pharmacy.slug || null,
    city: pharmacy.city || null,
    address: pharmacy.address || null,
    phone: pharmacy.phone || null,
    image: pharmacy.logo || null,
  };
}

async function patientCard(id) {
  if (!id) return null;
  const patient = await one("SELECT id, user_id FROM patients WHERE id = ?", [id]).catch(() => null);
  const userId = patient?.user_id || id;
  const user = await one("SELECT id, name, email, phone, avatar FROM users WHERE id = ?", [userId]).catch(() => null);
  if (!user && !patient) return null;
  return {
    id: patient?.id || id,
    user_id: user?.id || userId,
    name: user?.name || `Patient #${id}`,
    email: user?.email || null,
    phone: user?.phone || null,
    avatar: user?.avatar || null,
  };
}

export async function shapeReferral(row) {
  if (!row) return null;
  const presented = await presentRow("referrals", row);
  const hospitalId = presented.hospital_id || presented.referred_hospital_id;
  const pharmacyId = presented.pharmacy_id || presented.referred_pharmacy_id;
  const toDoctorId = presented.referred_to_doctor_id || presented.referred_doctor_id;
  const fromDoctorId = presented.referring_doctor_id || presented.doctor_id;
  return {
    ...presented,
    patient: await patientCard(presented.patient_id),
    referring_doctor: await doctorCard(fromDoctorId),
    referred_to_doctor: await doctorCard(toDoctorId),
    hospital: await hospitalCard(hospitalId),
    pharmacy: await pharmacyCard(pharmacyId),
    target_type: toDoctorId ? "doctor" : hospitalId ? "hospital" : pharmacyId ? "pharmacy" : "unknown",
  };
}

async function referralWhere(scope, req) {
  const clauses = [];
  const params = [];
  const push = async (column, value) => {
    if (value && (await hasColumn("referrals", column))) {
      clauses.push(`\`${column}\` = ?`);
      params.push(value);
    }
  };
  if (scope === "doctor") {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    const parts = [];
    const add = async (column) => {
      if (await hasColumn("referrals", column)) {
        parts.push(`\`${column}\` = ?`);
        params.push(doctorId || 0);
      }
    };
    await add("doctor_id");
    await add("referring_doctor_id");
    await add("referred_to_doctor_id");
    if (parts.length) clauses.push(`(${parts.join(" OR ")})`);
  } else if (scope === "patient") {
    const patient = await resolvePatient(await loadOwnedId(req.user.id, "patients"));
    const ids = [...new Set([patient?.id, patient?.user_id, req.user.id].filter(Boolean))];
    if (await hasColumn("referrals", "patient_id") && ids.length) {
      clauses.push(`\`patient_id\` IN (${ids.map(() => "?").join(",")})`);
      params.push(...ids);
    }
  } else if (scope === "hospital") {
    const hospitalId = await loadOwnedId(req.user.id, "hospitals");
    const parts = [];
    for (const column of ["hospital_id", "referred_hospital_id"]) {
      if (hospitalId && (await hasColumn("referrals", column))) {
        parts.push(`\`${column}\` = ?`);
        params.push(hospitalId);
      }
    }
    if (parts.length) clauses.push(`(${parts.join(" OR ")})`);
  } else if (scope === "pharmacy") {
    const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
    await push("pharmacy_id", pharmacyId);
    await push("referred_pharmacy_id", pharmacyId);
  }
  if (req.query?.status && (await hasColumn("referrals", "status"))) {
    clauses.push("`status` = ?");
    params.push(req.query.status);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "WHERE 1=1",
    params,
  };
}

export async function handleCareReferrals(req, res, parts) {
  if (parts[1] !== "referrals" || !(await tableExists("referrals"))) return false;
  const scope = parts[0];
  if (!["doctor", "patient", "hospital", "pharmacy"].includes(scope)) return false;

  if (req.method === "GET" && !parts[2]) {
    const owned = await referralWhere(scope, req);
    const rows = await q(`SELECT * FROM referrals ${owned.sql} ORDER BY id DESC LIMIT 100`, owned.params).catch(() => []);
    const referrals = [];
    for (const row of rows) referrals.push(await shapeReferral(row));
    res.json({ referrals, data: referrals, total: referrals.length });
    return true;
  }

  if (req.method === "GET" && parts[2] && !parts[3]) {
    const row = await findReferral(parts[2]);
    if (!row || !(await referralMatchesScope(scope, req, row))) {
      return res.status(404).json({ message: "Referral not found." }) || true;
    }
    const referral = await shapeReferral(row);
    res.json({ referral, data: referral, referral_id: referral.id, ...referral });
    return true;
  }

  if (req.method === "POST" && scope === "doctor" && !parts[2]) {
    const doctorId = await loadOwnedId(req.user.id, "doctors");
    if (!doctorId) return res.status(403).json({ message: "A doctor profile is required." }) || true;
    const body = req.body || {};
    const patient = await resolvePatient(body.patient_id);
    if (!patient) return res.status(422).json({ message: "Choose a patient for this referral." }) || true;
    const toDoctorId = Number(body.referred_to_doctor_id || body.doctor_id || 0) || null;
    const hospitalId = Number(body.hospital_id || body.referred_hospital_id || 0) || null;
    const pharmacyId = Number(body.pharmacy_id || body.referred_pharmacy_id || 0) || null;
    if (!hospitalId && !pharmacyId && !toDoctorId) {
      return res.status(422).json({ message: "Choose a registered clinic/hospital, pharmacy, or specialist doctor." }) || true;
    }
    if (hospitalId) {
      const facility = await requireRegisteredFacility(hospitalId);
      if (facility.error) return res.status(422).json({ message: facility.error }) || true;
    }
    if (pharmacyId) {
      const pharmacy = await requireRegisteredPharmacy(pharmacyId);
      if (pharmacy.error) return res.status(422).json({ message: pharmacy.error }) || true;
    }
    const reason = String(body.reason || "").trim();
    if (!reason) return res.status(422).json({ message: "Add a reason so the next provider knows what to do." }) || true;

    const payload = {
      patient_id: patient.id,
      doctor_id: doctorId,
      referring_doctor_id: doctorId,
      referred_to_doctor_id: toDoctorId,
      referred_doctor_id: toDoctorId,
      hospital_id: hospitalId,
      referred_hospital_id: hospitalId,
      pharmacy_id: pharmacyId,
      referred_pharmacy_id: pharmacyId,
      appointment_id: body.appointment_id || null,
      instant_consultation_id: body.instant_consultation_id || null,
      reason,
      notes: body.notes || null,
      urgency: body.urgency || "medium",
      status: "pending",
      referred_at: new Date(),
      type: hospitalId ? "hospital" : "pharmacy",
    };
    const id = await insert("referrals", payload);
    const referral = await shapeReferral(await one("SELECT * FROM referrals WHERE id = ?", [id]));
    await onReferralCreated(await one("SELECT * FROM referrals WHERE id = ?", [id])).catch(() => null);
    const patientUserId = patient.user_id;
    const target =
      referral.hospital?.name || referral.pharmacy?.name || referral.referred_to_doctor?.name || "a MediConnect partner";
    await notifyUser(
      patientUserId,
      "Your doctor sent you a next step",
      `You were referred to ${target}. Open Care from your doctor in your dashboard to continue inside MediConnect.`,
    );
    if (hospitalId) {
      const hospital = await one("SELECT user_id FROM hospitals WHERE id = ?", [hospitalId]).catch(() => null);
      await notifyUser(hospital?.user_id, "New patient referral", `${referral.patient?.name || "A patient"} was referred to your facility.`);
    }
    if (pharmacyId) {
      const pharmacy = await one("SELECT user_id FROM pharmacies WHERE id = ?", [pharmacyId]).catch(() => null);
      await notifyUser(pharmacy?.user_id, "New pharmacy referral", `${referral.patient?.name || "A patient"} was referred to your pharmacy.`);
    }
    if (toDoctorId) {
      const other = await one("SELECT user_id FROM doctors WHERE id = ?", [toDoctorId]).catch(() => null);
      await notifyUser(other?.user_id, "New specialist referral", `${referral.patient?.name || "A patient"} was referred to you.`);
    }
    res.status(201).json({ message: "Referral sent. The patient can continue inside MediConnect.", referral, data: referral });
    return true;
  }

  if ((req.method === "POST" && parts[2] && parts[3]) || (req.method === "DELETE" && parts[2] && !parts[3])) {
    const action = req.method === "DELETE" ? "cancel" : parts[3];
    if (!["accept", "complete", "reject", "cancel"].includes(action)) {
      return res.status(422).json({ message: "Unknown referral action." }) || true;
    }
    const row = await findReferral(parts[2]);
    if (!row || !(await referralMatchesScope(scope, req, row))) {
      return res.status(404).json({ message: "Referral not found." }) || true;
    }
    if (scope === "doctor" && action !== "cancel") {
      return res.status(403).json({ message: "The assigned clinic/hospital or pharmacy updates this referral." }) || true;
    }
    const status = { accept: "accepted", complete: "completed", reject: "rejected", cancel: "cancelled" }[action];
    await update("referrals", row.id, { status });
    const referral = await shapeReferral(await one("SELECT * FROM referrals WHERE id = ?", [row.id]));
    res.json({ message: "Referral updated.", referral, data: referral, referral_id: referral.id });
    return true;
  }

  return false;
}

async function findReferral(referralId) {
  const raw = String(referralId || "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return one("SELECT * FROM referrals WHERE id = ?", [Number(raw)]).catch(() => null);
}

async function referralMatchesScope(scope, req, row) {
  if (!row) return false;
  const owned = await referralWhere(scope, { ...req, query: {} });
  const match = await one(`SELECT id FROM referrals ${owned.sql} AND id = ? LIMIT 1`, [...owned.params, row.id]).catch(() => null);
  return Boolean(match);
}

function dispatchReferral(handler) {
  return async (req, res, next) => {
    try {
      const parts = req.path.split("/").filter(Boolean);
      const handled = await handler(req, res, parts);
      if (!handled) return next();
    } catch (error) {
      next(error);
    }
  };
}

export function registerCareReferralRoutes(router, { requireAuth, requireRole }) {
  const run = dispatchReferral(handleCareReferrals);
  for (const scope of ["doctor", "patient", "hospital", "pharmacy"]) {
    router.get(`/${scope}/referrals`, requireAuth, requireRole(scope), run);
    router.get(`/${scope}/referrals/:referralId`, requireAuth, requireRole(scope), run);
    router.post(`/${scope}/referrals/:referralId/:action`, requireAuth, requireRole(scope), run);
    router.delete(`/${scope}/referrals/:referralId`, requireAuth, requireRole(scope), run);
  }
  router.post("/doctor/referrals", requireAuth, requireRole("doctor"), run);
}

export async function referralsOwnedFilter(scope, req) {
  return referralWhere(scope, req);
}
