import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as db from "./db.js";
import { sendMail } from "./mail.js";
import { ensureVerifierColumns } from "./verification.js";

const { columns, hasColumn, insert, one, pool, q, update } = db;
const forgetColumns = db.forgetColumns || (() => {});

const APPROVED = new Set(["active", "approved", "verified"]);

export function plainText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function profileIsComplete(doctor) {
  if (!doctor) return false;
  return Boolean(
    plainText(doctor.doctor_degree) &&
    plainText(doctor.medical_license) &&
    plainText(doctor.bio_en) &&
    plainText(doctor.bio_fr) &&
    plainText(doctor.bio_kiny),
  );
}

export function doctorIsApproved(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return true;
  return APPROVED.has(value);
}

export async function ensureReviewColumn() {
  if (!(await hasColumn("doctors", "review_message"))) {
    await pool.query("ALTER TABLE doctors ADD COLUMN review_message TEXT NULL").catch(() => {});
    forgetColumns("doctors");
  }
  if (!(await hasColumn("doctors", "license_expires_at"))) {
    await pool.query("ALTER TABLE doctors ADD COLUMN license_expires_at DATE NULL").catch(() => {});
    forgetColumns("doctors");
  }
  if (!(await hasColumn("doctors", "license_expiry_reminded_for"))) {
    await pool.query("ALTER TABLE doctors ADD COLUMN license_expiry_reminded_for DATE NULL").catch(() => {});
    forgetColumns("doctors");
  }
}

async function adminRecipients() {
  const rows = await q(
    `SELECT DISTINCT u.id, u.email, u.name
     FROM users u
     INNER JOIN model_has_roles m ON m.model_id = u.id
     INNER JOIN roles r ON r.id = m.role_id
     WHERE r.name IN ('admin', 'super-admin', 'super_admin')
       AND u.email IS NOT NULL AND u.email <> ''`,
  ).catch(() => []);
  if (rows.length) return rows;
  const fallback = process.env.ADMIN_NOTIFY_EMAIL || process.env.MAIL_FROM_ADDRESS || "";
  return fallback ? [{ id: null, email: fallback, name: "Admin" }] : [];
}

async function notifyInApp(userId, title, message) {
  if (!userId || !(await hasColumn("notifications", "notifiable_id"))) return;
  const fields = {
    notifiable_id: userId,
    data: JSON.stringify({ title, message, body: message }),
  };
  if (await hasColumn("notifications", "id")) {
    const idColumn = (await columns("notifications")).get("id");
    if (!String(idColumn?.EXTRA || "").includes("auto_increment")) {
      fields.id = crypto.randomUUID();
    }
  }
  if (await hasColumn("notifications", "type")) fields.type = "doctor.review";
  if (await hasColumn("notifications", "notifiable_type")) {
    fields.notifiable_type = "App\\Models\\User";
  }
  const now = new Date();
  if (await hasColumn("notifications", "created_at")) fields.created_at = now;
  if (await hasColumn("notifications", "updated_at")) fields.updated_at = now;
  await insert("notifications", fields).catch(() => {});
}

export async function notifyAdminsProfileReady(doctor) {
  const user = doctor.user_id
    ? await one("SELECT id, name, email FROM users WHERE id = ?", [doctor.user_id])
    : null;
  const name = user?.name || `Doctor #${doctor.id}`;
  const subject = `Doctor profile ready for review: ${name}`;
  const text = [
    `${name} saved a complete profile and is waiting for review.`,
    user?.email ? `Email: ${user.email}` : "",
    "",
    "Open Admin → Doctors to approve, reject, or request changes.",
    "If you reject or request changes, include a message. The doctor receives that message by email.",
  ].filter(Boolean).join("\n");
  const admins = await adminRecipients();
  for (const admin of admins) {
    await sendMail({ to: admin.email, subject, text });
    await notifyInApp(admin.id, subject, text);
  }
}

export async function notifyDoctorReview(doctor, { subject, message }) {
  const user = doctor.user_id
    ? await one("SELECT id, name, email FROM users WHERE id = ?", [doctor.user_id])
    : null;
  const text = [`Hello ${user?.name || "Doctor"},`, "", message].join("\n");
  if (user?.email) await sendMail({ to: user.email, subject, text });
  await notifyInApp(user?.id, subject, message);
}

export async function submitProfileForReview(doctorId) {
  await ensureReviewColumn();
  const before = await one(
    "SELECT id, user_id, status, doctor_degree, medical_license, bio_en, bio_fr, bio_kiny FROM doctors WHERE id = ?",
    [doctorId],
  );
  if (!before || doctorIsApproved(before.status) || !profileIsComplete(before)) {
    return { review_submitted: false };
  }
  const was = String(before.status || "").toLowerCase();
  const patch = { status: "pending" };
  if (await hasColumn("doctors", "review_message")) patch.review_message = null;
  if (await hasColumn("doctors", "is_active")) patch.is_active = 0;
  await update("doctors", doctorId, patch);
  if (was !== "pending") await notifyAdminsProfileReady(before);
  return { review_submitted: was !== "pending" };
}

export async function reviewDoctor(id, action, message, adminUserId = null) {
  await ensureReviewColumn();
  await ensureVerifierColumns("doctors");
  const doctor = await one("SELECT * FROM doctors WHERE id = ?", [id]);
  if (!doctor) return null;
  const note = plainText(message);
  if (action !== "approve" && !note) {
    const error = new Error("Add a message for the doctor.");
    error.status = 422;
    throw error;
  }
  const patch = {};
  if (action === "approve") {
    patch.status = "active";
    if (await hasColumn("doctors", "is_active")) patch.is_active = 1;
    if (await hasColumn("doctors", "review_message")) patch.review_message = null;
    if (await hasColumn("doctors", "verified_at")) patch.verified_at = new Date();
    if (adminUserId && await hasColumn("doctors", "verified_by")) patch.verified_by = adminUserId;
  } else if (action === "reject") {
    patch.status = "rejected";
    if (await hasColumn("doctors", "is_active")) patch.is_active = 0;
    if (await hasColumn("doctors", "review_message")) patch.review_message = note;
    if (await hasColumn("doctors", "rejection_reason")) patch.rejection_reason = note;
  } else {
    patch.status = "action_requested";
    if (await hasColumn("doctors", "is_active")) patch.is_active = 0;
    if (await hasColumn("doctors", "review_message")) patch.review_message = note;
  }
  await update("doctors", id, patch);
  const updated = await one("SELECT * FROM doctors WHERE id = ?", [id]);
  if (action === "approve") {
    await notifyDoctorReview(updated, {
      subject: "Your MediConnect profile is approved",
      message: "An admin approved your profile. You can now use your doctor tools, including appointments, consultations, and your wallet.",
    });
  } else if (action === "reject") {
    await notifyDoctorReview(updated, {
      subject: "Your MediConnect profile was not approved",
      message: `An admin did not approve your profile.\n\nMessage: ${note}\n\nUpdate your profile and save it again to send it back for review.`,
    });
  } else {
    await notifyDoctorReview(updated, {
      subject: "Action needed on your MediConnect profile",
      message: `An admin asked you to update your profile before it can be approved.\n\nMessage: ${note}`,
    });
  }
  return updated;
}

export function saveUploadedFile(file, prefix) {
  const dir = process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, "doctors-webp")
    : path.resolve("storage", "doctors-webp");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${prefix}_${Date.now()}.webp`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `https://mediconnect.rw/api/v1/media/${filename}`;
}

export async function assertScheduleAllowed(doctorId) {
  const doctor = await one(
    "SELECT doctor_degree, medical_license, bio_en, bio_fr, bio_kiny FROM doctors WHERE id = ?",
    [doctorId],
  );
  if (!profileIsComplete(doctor)) {
    const error = new Error("Fill in your degree, medical license, and biography in English, French, and Kinyarwanda before scheduling availability.");
    error.status = 422;
    throw error;
  }
}

function daysUntil(dateValue) {
  const expiry = new Date(`${String(dateValue).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

export async function setLicenseExpiry(id, rawDate) {
  await ensureReviewColumn();
  const doctor = await one("SELECT id FROM doctors WHERE id = ?", [id]);
  if (!doctor) return null;
  const value = rawDate ? String(rawDate).slice(0, 10) : null;
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error("Choose a valid expiry date.");
    error.status = 422;
    throw error;
  }
  const patch = { license_expires_at: value, license_expiry_reminded_for: null };
  await update("doctors", id, patch);
  return one("SELECT * FROM doctors WHERE id = ?", [id]);
}

export async function remindExpiringLicenses() {
  await ensureReviewColumn();
  if (!(await hasColumn("doctors", "license_expires_at"))) return;
  const rows = await q(
    `SELECT id, user_id, medical_license, license_expires_at, license_expiry_reminded_for
     FROM doctors
     WHERE license_expires_at IS NOT NULL
       AND license_expires_at <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       AND (license_expiry_reminded_for IS NULL OR license_expiry_reminded_for <> license_expires_at)`,
  ).catch(() => []);
  for (const doctor of rows) {
    const when = String(doctor.license_expires_at).slice(0, 10);
    const days = daysUntil(when);
    const timing = days < 0
      ? `expired on ${when}`
      : days === 0
        ? `expires today (${when})`
        : `expires on ${when} (${days} day${days === 1 ? "" : "s"} left)`;
    const user = doctor.user_id
      ? await one("SELECT name, email FROM users WHERE id = ?", [doctor.user_id])
      : null;
    const name = user?.name || `Doctor #${doctor.id}`;
    const admins = await adminRecipients();
    const adminSubject = `License renewal needed: ${name}`;
    const adminText = [
      `${name}'s medical license ${timing}.`,
      doctor.medical_license ? `License number: ${doctor.medical_license}` : "",
      "",
      "Upload the renewed license and set the new expiry date. Only an admin can change the expiry date.",
    ].filter(Boolean).join("\n");
    for (const admin of admins) {
      await sendMail({ to: admin.email, subject: adminSubject, text: adminText });
      await notifyInApp(admin.id, adminSubject, adminText);
    }
    await notifyDoctorReview(doctor, {
      subject: "Your medical license needs renewal",
      message: `Your medical license ${timing}. Please contact an admin so they can upload the renewed license and update the expiry date. You cannot change the expiry date yourself.`,
    });
    await update("doctors", doctor.id, { license_expiry_reminded_for: when });
  }
}
