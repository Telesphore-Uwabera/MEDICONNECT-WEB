import express from "express";
import { describe, expect, it } from "vitest";
import {
  decideDocumentAccess,
  fileNameOf,
  registerPrivateDocumentRoutes,
  signDocumentAccess,
  verifyDocumentAccess,
} from "./private-documents.js";
import { profileFormBody } from "./visit-rules.js";

const files = new Map([
  ["doctor_documents_171000.webp", { doctorId: 31, userId: 1003, field: "national_id_document", filename: "doctor_documents_171000.webp" }],
  ["doctor_license_9.webp", { doctorId: 31, userId: 1003, field: "medical_license_document", filename: "doctor_license_9.webp" }],
  ["signature_31.webp", { doctorId: 31, userId: 1003, field: "signature", filename: "signature_31.webp" }],
]);

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function appFor({ clinical = false } = {}) {
  const app = express();
  const router = express.Router();
  router.use((req, _res, next) => {
    req.user = req.headers["x-user"] ? JSON.parse(req.headers["x-user"]) : null;
    next();
  });
  registerPrivateDocumentRoutes(router, {
    requireAuth(req, res, next) {
      if (!req.user) return res.status(401).json({ message: "Unauthenticated." });
      return next();
    },
    lookup: async (name) => files.get(name) || null,
    readFile: (name) => Buffer.from(`bytes:${name}`),
    loadAccess: async (user, match) => ({
      isAdmin: user?.role === "admin",
      isOwner: Number(user?.id) === Number(match.userId),
      hasClinicalLink: clinical && user?.role === "patient",
    }),
    loadStoredField: async (doctorId, field) => {
      for (const match of files.values()) {
        if (Number(match.doctorId) === Number(doctorId) && match.field === field) return match;
      }
      return null;
    },
    secret: () => "test-document-secret",
  });
  app.use("/api/v1", router);
  return app;
}

describe("private doctor documents", () => {
  it("classifies a website upload by the stored field, not the file name", () => {
    expect(fileNameOf("https://mediconnect.rw/api/v1/media/doctor_documents_171000.webp")).toBe("doctor_documents_171000.webp");
    expect(fileNameOf("/storage/phone_icon.webp")).toBe("phone_icon.webp");
    expect(fileNameOf("../../secret.webp")).toBe("");
    expect(fileNameOf("bad name.webp")).toBe("");
    expect(decideDocumentAccess({ field: "national_id_document", isAdmin: false, isOwner: false, hasClinicalLink: true })).toBe("forbid");
    expect(decideDocumentAccess({ field: "medical_license_document", isAdmin: false, isOwner: true, hasClinicalLink: false })).toBe("allow");
    expect(decideDocumentAccess({ field: "signature", isAdmin: false, isOwner: false, hasClinicalLink: true })).toBe("allow");
    expect(decideDocumentAccess({ field: "signature", isAdmin: false, isOwner: false, hasClinicalLink: false })).toBe("forbid");
  });

  it("refuses identity documents to patients and serves them to the doctor and an admin", async () => {
    const server = await listen(appFor());
    try {
      const { port } = server.address();
      const base = `http://127.0.0.1:${port}/api/v1/documents/open?path=${encodeURIComponent("https://mediconnect.rw/api/v1/media/doctor_documents_171000.webp")}`;
      const patient = await fetch(base, { headers: { "x-user": JSON.stringify({ id: 1004, role: "patient" }) } });
      const stranger = await fetch(base, { headers: { "x-user": JSON.stringify({ id: 50, role: "doctor" }) } });
      const owner = await fetch(base, { headers: { "x-user": JSON.stringify({ id: 1003, role: "doctor" }) } });
      const admin = await fetch(base, { headers: { "x-user": JSON.stringify({ id: 1, role: "admin" }) } });
      const anon = await fetch(base);
      expect(patient.status).toBe(403);
      expect(stranger.status).toBe(403);
      expect(owner.status).toBe(200);
      expect(await owner.text()).toBe("bytes:doctor_documents_171000.webp");
      expect(admin.status).toBe(200);
      expect(anon.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("embeds a signature for a clinical viewer through a short-lived signed url", async () => {
    const server = await listen(appFor({ clinical: true }));
    const secret = "test-document-secret";
    try {
      const { port } = server.address();
      const blocked = await fetch(`http://127.0.0.1:${port}/api/v1/documents/open?path=signature_31.webp`, {
        headers: { "x-user": JSON.stringify({ id: 1004, role: "patient" }) },
      });
      expect(blocked.status).toBe(200);
      const link = await fetch(`http://127.0.0.1:${port}/api/v1/documents/link?path=signature_31.webp`, {
        headers: { "x-user": JSON.stringify({ id: 1003, role: "doctor" }) },
      });
      const body = await link.json();
      expect(link.status).toBe(200);
      const signed = await fetch(`http://127.0.0.1:${port}${body.url}`);
      expect(signed.status).toBe(200);
      expect(await signed.text()).toBe("bytes:signature_31.webp");
      const expired = signDocumentAccess({ doctorId: 31, field: "signature", now: Date.now() - 60_000, ttlMs: 1, secret });
      const stale = await fetch(`http://127.0.0.1:${port}/api/v1/documents/file/31/signature?exp=${expired.exp}&sig=${expired.sig}`);
      expect(stale.status).toBe(403);
      expect(verifyDocumentAccess({ doctorId: 31, field: "signature", exp: expired.exp, sig: expired.sig, secret })).toBe(false);
      const patientLink = await fetch(`http://127.0.0.1:${port}/api/v1/documents/link?path=doctor_license_9.webp`, {
        headers: { "x-user": JSON.stringify({ id: 1004, role: "patient" }) },
      });
      expect(patientLink.status).toBe(403);
    } finally {
      server.close();
    }
  });

  it("does not let a profile save replace a stored document with a signed url", () => {
    const body = profileFormBody({
      bio_en: "Clinic",
      medical_license_document: "/api/v1/documents/file/31/medical_license_document?exp=1&sig=abc",
      signature: "/api/v1/documents/file/31/signature?exp=1&sig=abc",
    }, { doctor: true });
    expect(body.bio_en).toBe("Clinic");
    expect(body.medical_license_document).toBeUndefined();
    expect(body.signature).toBeUndefined();
  });
});
