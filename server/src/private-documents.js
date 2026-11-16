import crypto from "crypto";
import fs from "fs";
import path from "path";
import { hasColumn, one, q, tableExists } from "./db.js";
import { loadOwnedId } from "./auth.js";

/** Identity scans. A patient must not receive these. */
export const IDENTITY_FIELDS = [
  "medical_license_document",
  "degree_document",
  "national_id_document",
  "cv_document",
];

/** Signature images stay off public listings, but a signed-in clinical viewer may see them. */
export const SIGNATURE_FIELDS = ["signature", "signature_image"];

export const PRIVATE_DOC_FIELDS = [...IDENTITY_FIELDS, ...SIGNATURE_FIELDS];

const SIGNED_TTL_MS = 10 * 60 * 1000;

export function fileNameOf(urlPath) {
  const relative = storedRelativePath(urlPath);
  const name = relative.split("/").filter(Boolean).pop() || "";
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return "";
  return name;
}

/** Path under a storage root. Keeps subfolders and rejects anything that climbs out. */
export function storedRelativePath(urlPath) {
  let text = String(urlPath || "").split("?")[0].split("#")[0];
  try { text = decodeURIComponent(text); } catch { /* keep the raw path */ }
  text = text.replace(/\\/g, "/").replace(/^https?:\/\/[^/]+/i, "");
  const markers = ["/minio/", "/storage/", "/doctors-webp/", "/webp/", "/media/"];
  let cut = -1;
  let markerLength = 0;
  const lower = text.toLowerCase();
  for (const marker of markers) {
    const at = lower.lastIndexOf(marker);
    if (at > cut) {
      cut = at;
      markerLength = marker.length;
    }
  }
  if (cut >= 0) text = text.slice(cut + markerLength);
  text = text.replace(/^\/+/, "");
  const parts = text.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) return "";
  if (!parts.every((part) => /^[A-Za-z0-9._-]+$/.test(part))) return "";
  return parts.join("/");
}

export function documentSecret() {
  return String(process.env.CALL_TOKEN_SECRET || process.env.DEPLOY_SECRET || "").trim();
}

export function decideDocumentAccess({ field, isAdmin, isOwner, hasClinicalLink }) {
  if (IDENTITY_FIELDS.includes(field)) return isAdmin || isOwner ? "allow" : "forbid";
  if (SIGNATURE_FIELDS.includes(field)) return isAdmin || isOwner || hasClinicalLink ? "allow" : "forbid";
  return "missing";
}

export function signDocumentAccess({ doctorId, field, ttlMs = SIGNED_TTL_MS, now = Date.now(), secret }) {
  const exp = now + ttlMs;
  const sig = crypto.createHmac("sha256", String(secret)).update(`${doctorId}.${field}.${exp}`).digest("base64url");
  return { exp, sig };
}

export function verifyDocumentAccess({ doctorId, field, exp, sig, secret, now = Date.now() }) {
  const expiry = Number(exp);
  if (!secret || !sig || !Number.isFinite(expiry) || expiry < now) return false;
  if (!PRIVATE_DOC_FIELDS.includes(field)) return false;
  const expected = crypto.createHmac("sha256", String(secret)).update(`${doctorId}.${field}.${expiry}`).digest("base64url");
  const left = Buffer.from(String(sig));
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function signedDocumentPath(doctorId, field, access) {
  return `/api/v1/documents/file/${doctorId}/${field}?exp=${access.exp}&sig=${encodeURIComponent(access.sig)}`;
}

function likeExact(filename) {
  return `%${filename.replace(/[\\%_]/g, (char) => `\\${char}`)}`;
}

export async function findDoctorByStoredFile(filename) {
  const name = fileNameOf(filename);
  if (!name || !(await tableExists("doctors"))) return null;
  const fields = [];
  for (const field of PRIVATE_DOC_FIELDS) {
    if (await hasColumn("doctors", field)) fields.push(field);
  }
  if (!fields.length) return null;
  const rows = await q(
    `SELECT id, user_id, ${fields.map((field) => `\`${field}\``).join(", ")}
     FROM doctors
     WHERE ${fields.map((field) => `\`${field}\` LIKE ? ESCAPE '\\\\'`).join(" OR ")}
     LIMIT 20`,
    fields.map(() => likeExact(name)),
  );
  for (const row of rows) {
    for (const field of fields) {
      if (fileNameOf(row[field]) === name) {
        return {
          doctorId: row.id,
          userId: row.user_id,
          field,
          filename: storedRelativePath(row[field]) || name,
        };
      }
    }
  }
  return null;
}

function uploadRoots() {
  const uploadDir = process.env.UPLOAD_DIR || path.resolve("storage");
  return [
    process.env.MINIO_DIR,
    path.join(uploadDir, "doctors-webp"),
    path.join(uploadDir, "webp"),
    uploadDir,
  ].filter(Boolean);
}

export function readStoredUpload(filename) {
  const relative = storedRelativePath(filename);
  const baseName = fileNameOf(filename);
  const candidates = [...new Set([relative, baseName].filter(Boolean))];
  if (!candidates.length) return null;
  for (const root of uploadRoots()) {
    for (const name of candidates) {
      const full = path.resolve(root, name);
      const base = path.resolve(root);
      if (full !== base && !full.startsWith(`${base}${path.sep}`)) continue;
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
      return fs.readFileSync(full);
    }
  }
  return null;
}

async function linkedRow(table, column, value, doctorId) {
  if (!value || !(await tableExists(table))) return false;
  if (!(await hasColumn(table, column)) || !(await hasColumn(table, "doctor_id"))) return false;
  const row = await one(
    `SELECT id FROM \`${table}\` WHERE \`${column}\` = ? AND doctor_id = ? LIMIT 1`,
    [value, doctorId],
  ).catch(() => null);
  return Boolean(row);
}

async function linkedAny(table, column, values, doctorId) {
  for (const value of values) {
    if (await linkedRow(table, column, value, doctorId)) return true;
  }
  return false;
}

/** A pharmacy sees a signature when a prescription request ties that pharmacy to the doctor. */
async function pharmacyHasDoctor(pharmacyId, doctorId) {
  if (!pharmacyId || !(await tableExists("pharmacy_prescription_requests"))) return false;
  if (!(await hasColumn("pharmacy_prescription_requests", "pharmacy_id"))) return false;
  if (await hasColumn("pharmacy_prescription_requests", "doctor_id")) {
    const direct = await one(
      "SELECT id FROM pharmacy_prescription_requests WHERE pharmacy_id = ? AND doctor_id = ? LIMIT 1",
      [pharmacyId, doctorId],
    ).catch(() => null);
    if (direct) return true;
  }
  if (
    await tableExists("prescriptions")
    && await hasColumn("pharmacy_prescription_requests", "prescription_id")
    && await hasColumn("prescriptions", "doctor_id")
  ) {
    const joined = await one(
      `SELECT r.id
       FROM pharmacy_prescription_requests r
       JOIN prescriptions p ON p.id = r.prescription_id
       WHERE r.pharmacy_id = ? AND p.doctor_id = ?
       LIMIT 1`,
      [pharmacyId, doctorId],
    ).catch(() => null);
    if (joined) return true;
  }
  return false;
}

export async function hasClinicalLink(user, doctorId) {
  if (!user?.id || !doctorId) return false;
  const patientId = await loadOwnedId(user.id, "patients").catch(() => null);
  const pharmacyId = await loadOwnedId(user.id, "pharmacies").catch(() => null);
  const hospitalId = await loadOwnedId(user.id, "hospitals").catch(() => null);
  // appointments.patient_id is the user account id. Older rows and the other
  // clinical tables may store the patient profile id instead. user_id is not
  // on every live appointments table, so linkedRow skips a missing column.
  const eitherId = [...new Set([user.id, patientId].filter((id) => Number(id) > 0))];
  const checks = [
    linkedAny("appointments", "patient_id", eitherId, doctorId),
    linkedRow("appointments", "user_id", user.id, doctorId),
    linkedAny("instant_consultation_requests", "patient_id", eitherId, doctorId),
    linkedRow("instant_consultation_requests", "user_id", user.id, doctorId),
    linkedAny("instant_consultations", "patient_id", eitherId, doctorId),
    linkedRow("instant_consultations", "user_id", user.id, doctorId),
    linkedAny("prescriptions", "patient_id", eitherId, doctorId),
    linkedRow("prescriptions", "user_id", user.id, doctorId),
    linkedAny("consultation_summaries", "patient_id", eitherId, doctorId),
    linkedRow("consultation_summaries", "user_id", user.id, doctorId),
    pharmacyHasDoctor(pharmacyId, doctorId),
    linkedRow("appointments", "hospital_id", hospitalId, doctorId),
  ];
  const found = await Promise.all(checks);
  if (found.some(Boolean)) return true;
  if (user.email && await tableExists("instant_consultation_requests") && await hasColumn("instant_consultation_requests", "guest_email")) {
    const guest = await one(
      "SELECT id FROM instant_consultation_requests WHERE guest_email = ? AND doctor_id = ? LIMIT 1",
      [user.email, doctorId],
    ).catch(() => null);
    if (guest) return true;
  }
  return false;
}

export async function loadDocumentAccess(user, match) {
  const current = user?.active_role || user?.role;
  const available = Array.isArray(user?.available_roles) ? user.available_roles : [];
  const isAdmin = current === "admin" || current === "moderator" || available.includes("admin") || available.includes("moderator") || Boolean(user?.can_be_admin);
  const isOwner = Number(user?.id) > 0 && Number(user.id) === Number(match?.userId);
  const hasLink = !isAdmin && !isOwner && SIGNATURE_FIELDS.includes(match?.field)
    ? await hasClinicalLink(user, match.doctorId)
    : false;
  return { isAdmin, isOwner, hasClinicalLink: hasLink };
}

function contentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function sendBytes(res, filename, bytes) {
  res.setHeader("Content-Type", contentType(filename));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).send(bytes);
}

/** Block files that are stored in a private doctor column. Avatars that are not in those columns stay public. */
export function privateFileGuard(lookup) {
  return function guard(req, res, next) {
    const name = fileNameOf(req.path);
    if (!name) return next();
    Promise.resolve()
      .then(() => lookup(name))
      .then((match) => {
        if (match) return res.status(403).json({ message: "This document is not public." });
        return next();
      })
      .catch(() => {
        if (!res.headersSent) res.status(503).json({ message: "Document storage is unavailable." });
      });
  };
}

async function storedField(doctorId, field) {
  if (!PRIVATE_DOC_FIELDS.includes(field)) return null;
  const row = await one(`SELECT id, user_id, \`${field}\` AS stored FROM doctors WHERE id = ?`, [doctorId]).catch(() => null);
  const filename = storedRelativePath(row?.stored) || fileNameOf(row?.stored);
  if (!row || !filename) return null;
  return { doctorId: row.id, userId: row.user_id, field, filename };
}

export function registerPrivateDocumentRoutes(router, {
  requireAuth,
  lookup = findDoctorByStoredFile,
  readFile = readStoredUpload,
  loadAccess = loadDocumentAccess,
  loadStoredField = storedField,
  loadOwnedDoctor = async (userId) => one("SELECT id, user_id FROM doctors WHERE user_id = ? ORDER BY id DESC LIMIT 1", [userId]).catch(() => null),
  secret = documentSecret,
} = {}) {
  async function streamMatch(res, match) {
    const bytes = await Promise.resolve(readFile(match.filename));
    if (!bytes) return res.status(404).json({ message: "Document not found." });
    return sendBytes(res, match.filename, bytes);
  }

  async function matchFor(doctorId, field) {
    return loadStoredField(doctorId, field);
  }

  router.get("/documents/open", requireAuth, async (req, res, next) => {
    try {
      const filename = fileNameOf(req.query.path || req.query.src || "");
      if (!filename) return res.status(404).json({ message: "Document not found." });
      const match = await lookup(filename);
      if (!match) return res.status(404).json({ message: "Document not found." });
      const access = await loadAccess(req.user, match);
      if (decideDocumentAccess({ field: match.field, ...access }) !== "allow") {
        return res.status(403).json({ message: "You do not have access to this document." });
      }
      return streamMatch(res, match);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/documents/link", requireAuth, async (req, res, next) => {
    try {
      const key = secret();
      if (!key) return res.status(409).json({ message: "Signed document links are not configured." });
      const filename = fileNameOf(req.query.path || "");
      const match = filename ? await lookup(filename) : null;
      if (!match) return res.status(404).json({ message: "Document not found." });
      const access = await loadAccess(req.user, match);
      if (decideDocumentAccess({ field: match.field, ...access }) !== "allow") {
        return res.status(403).json({ message: "You do not have access to this document." });
      }
      const signed = signDocumentAccess({ doctorId: match.doctorId, field: match.field, secret: key });
      return res.json({
        url: signedDocumentPath(match.doctorId, match.field, signed),
        expires_at: new Date(signed.exp).toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/documents/file/:doctorId/:field", async (req, res, next) => {
    try {
      const field = String(req.params.field || "");
      const doctorId = Number(req.params.doctorId);
      const key = secret();
      const signed = verifyDocumentAccess({
        doctorId,
        field,
        exp: req.query.exp,
        sig: req.query.sig,
        secret: key,
      });
      if (!signed) return res.status(403).json({ message: "This document link is not valid." });
      const match = await matchFor(doctorId, field);
      if (!match) return res.status(404).json({ message: "Document not found." });
      return streamMatch(res, match);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/doctor/documents/:field", requireAuth, async (req, res, next) => {
    try {
      const doctor = await loadOwnedDoctor(req.user.id);
      if (!doctor) return res.status(404).json({ message: "Document not found." });
      const match = await matchFor(doctor.id, String(req.params.field || ""));
      if (!match) return res.status(404).json({ message: "Document not found." });
      const access = await loadAccess(req.user, match);
      if (decideDocumentAccess({ field: match.field, ...access }) !== "allow") {
        return res.status(403).json({ message: "You do not have access to this document." });
      }
      return streamMatch(res, match);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/admin/doctors/:doctorId/documents/:field", requireAuth, async (req, res, next) => {
    try {
      const match = await matchFor(req.params.doctorId, String(req.params.field || ""));
      if (!match) return res.status(404).json({ message: "Document not found." });
      const access = await loadAccess(req.user, match);
      if (!access.isAdmin) return res.status(403).json({ message: "You do not have access to this document." });
      return streamMatch(res, match);
    } catch (error) {
      return next(error);
    }
  });
}
