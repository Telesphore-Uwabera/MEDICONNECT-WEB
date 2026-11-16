import express from "express";
import { describe, expect, it } from "vitest";
import {
  containsPrivateKey,
  isPrivateStoragePath,
  publicDoctor,
  publicHospital,
  publicPharmacy,
} from "./public-profile.js";

const PRIVATE = [
  "email",
  "phone",
  "medical_license",
  "medical_license_document",
  "degree_document",
  "national_id",
  "national_id_document",
  "signature",
  "signature_image",
  "user",
  "user_id",
];

describe("public profile allow-list", () => {
  it("drops private doctor, hospital, and pharmacy fields", () => {
    const doctor = publicDoctor({
      id: 4,
      slug: "aline",
      user_name: "Aline Mukamana",
      user_email: "aline@example.com",
      email: "aline@example.com",
      phone: "0788000000",
      user_id: 9,
      medical_license: "LIC-999",
      medical_license_document: "https://mediconnect.rw/api/v1/media/doctor_license_1.webp",
      degree_document: "/storage/degree_document_1.webp",
      national_id_document: "/storage/national_id_1.webp",
      signature: "/storage/signature_1.webp",
      user: { id: 9, name: "Aline Mukamana", email: "aline@example.com" },
      image: "/minio/mediconnect-avatars/aline.webp",
      specialization: "Pediatrics",
      years_of_experience: 8,
      preferred_language: "en",
      bio_en: "Children's clinic.",
      consultation_fee: 5000,
      instant_consultation: 1,
      city: "Kigali",
      hospitals: [{ id: 2, name: "Kigali Care", city: "Kigali", address: "KG 12 Ave" }],
    });
    const hospital = publicHospital({
      id: 2,
      name: "Kigali Care",
      city: "Kigali",
      email: "clinic@example.com",
      phone: "0788111111",
      medical_license: "HOSP-1",
      address: "KG 12 Ave",
    });
    const pharmacy = publicPharmacy({
      id: 3,
      name: "City Pharmacy",
      city: "Huye",
      email: "rx@example.com",
      phone: "0788222222",
      license_number: "PH-1",
      signature_image: "/storage/signature_pharmacy.webp",
    });
    for (const card of [doctor, hospital, pharmacy]) {
      expect(containsPrivateKey(card)).toBe(false);
      const dumped = JSON.stringify(card);
      for (const key of PRIVATE) expect(Object.keys(card)).not.toContain(key);
      expect(dumped).not.toMatch(/example\.com|0788|LIC-999|doctor_license|degree_document|national_id|signature|KG 12/);
    }
    expect(doctor.name).toBe("Aline Mukamana");
    expect(doctor.photo).toBe("/minio/mediconnect-avatars/aline.webp");
    expect(doctor.instant_consultation).toBe(true);
    expect(doctor.hospitals).toEqual([{ name: "Kigali Care", city: "Kigali" }]);
    expect(hospital.city).toBe("Kigali");
    expect(pharmacy.name).toBe("City Pharmacy");
  });

  it("treats licence, national id, and signature files as private", () => {
    expect(isPrivateStoragePath("/doctors-webp/doctor_license_9.webp")).toBe(true);
    expect(isPrivateStoragePath("/national_id_document_3.webp")).toBe(true);
    expect(isPrivateStoragePath("/signature_1.webp")).toBe(true);
    expect(isPrivateStoragePath("/degree_document_2.webp")).toBe(true);
    expect(isPrivateStoragePath("/mediconnect-avatars/aline.webp")).toBe(false);
  });

  it("refuses an anonymous read of a licence file and serves a portrait", async () => {
    const app = express();
    app.use("/api/v1/media", (req, res) => {
      if (isPrivateStoragePath(req.path)) return res.status(401).json({ message: "Unauthenticated." });
      res.status(200).json({ ok: true });
    });
    const server = await new Promise((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    try {
      const { port } = server.address();
      const blocked = await fetch(`http://127.0.0.1:${port}/api/v1/media/doctor_license_1.webp`);
      expect(blocked.status).toBe(401);
      const portrait = await fetch(`http://127.0.0.1:${port}/api/v1/media/aline.webp`);
      expect(portrait.status).toBe(200);
    } finally {
      server.close();
    }
  });
});
