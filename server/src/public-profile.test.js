import express from "express";
import { describe, expect, it } from "vitest";
import { privateFileGuard } from "./private-documents.js";
import {
  containsPrivateKey,
  presentWithoutCallSecrets,
  publicDoctor,
  publicHospital,
  publicPharmacy,
  publicSlot,
  stripCallSecrets,
} from "./public-profile.js";

const PRIVATE = [
  "medical_license",
  "medical_license_document",
  "degree_document",
  "national_id",
  "national_id_document",
  "signature",
  "signature_image",
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
      user: { id: 9, name: "Aline Mukamana", email: "aline@example.com", avatar: "/minio/mediconnect-avatars/aline.webp" },
      image: "/minio/mediconnect-avatars/aline.webp",
      specialization: "Pediatrics",
      specialization_id: 7,
      years_of_experience: 8,
      preferred_language: "en",
      bio_en: "Children's clinic.",
      doctor_degree: "MD",
      designations: "Consultant",
      education: "University of Rwanda",
      consultation_fee: 5000,
      reviews_count: 12,
      verified_at: "2026-01-02",
      is_featured: 1,
      show_homepage: 0,
      instant_consultation: 1,
      city: "Kigali",
      specializations: [{ id: 7, name: "Pediatrics" }],
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
      insurances: [{ id: 4, name: "RSSB", code: "RSSB", logo: null, policy_number: "SECRET" }],
      departments: [{ id: 8, name_en: "Paediatrics", icon: "stethoscope" }],
    });
    const pharmacy = publicPharmacy({
      id: 3,
      name: "City Pharmacy",
      city: "Huye",
      address: null,
      email: "rx@example.com",
      phone: "0788222222",
      license_number: "PH-1",
      signature_image: "/storage/signature_pharmacy.webp",
      accepted_insurances: [{ id: 5, name: "MMI", code: "MMI" }],
    });
    for (const card of [doctor, hospital, pharmacy]) {
      expect(containsPrivateKey(card)).toBe(false);
      const dumped = JSON.stringify(card);
      for (const key of PRIVATE) expect(Object.keys(card)).not.toContain(key);
      expect(dumped).not.toMatch(/LIC-999|doctor_license|degree_document|national_id|signature_pharmacy|PH-1|SECRET/);
    }
    expect(doctor.name).toBe("Aline Mukamana");
    expect(doctor.display_name).toBe("Aline Mukamana");
    expect(doctor.user).toEqual({ name: "Aline Mukamana", avatar: "/minio/mediconnect-avatars/aline.webp" });
    expect(doctor.email).toBeUndefined();
    expect(doctor.phone).toBeUndefined();
    expect(doctor.photo).toBe("/minio/mediconnect-avatars/aline.webp");
    expect(doctor.instant_consultation).toBe(true);
    expect(doctor.reviews_count).toBe(12);
    expect(doctor.review_count).toBe(12);
    expect(doctor.is_verified).toBe(true);
    expect(doctor.verified_at).toBe("2026-01-02");
    expect(doctor.is_featured).toBe(true);
    expect(doctor.show_homepage).toBe(false);
    expect(doctor.doctor_degree).toBe("MD");
    expect(doctor.designations).toBe("Consultant");
    expect(doctor.education).toBe("University of Rwanda");
    expect(doctor.specialization_id).toBe(7);
    expect(doctor.specializations).toEqual([{ id: 7, name: "Pediatrics" }]);
    expect(doctor.hospitals).toEqual([{ id: 2, name: "Kigali Care", city: "Kigali" }]);
    expect(hospital.city).toBe("Kigali");
    expect(hospital.address).toBe("KG 12 Ave");
    expect(hospital.phone).toBe("0788111111");
    expect(hospital.email).toBe("clinic@example.com");
    expect(hospital.departments[0].icon).toBe("stethoscope");
    expect(hospital.insurances).toEqual([{ id: 4, name: "RSSB", code: "RSSB", logo: null }]);
    expect(hospital.medical_license).toBeUndefined();
    expect(pharmacy.name).toBe("City Pharmacy");
    expect(pharmacy.address).toBeNull();
    expect(pharmacy.phone).toBe("0788222222");
    expect(pharmacy.email).toBe("rx@example.com");
    expect(pharmacy.accepted_insurances).toEqual([{ id: 5, name: "MMI", code: "MMI", logo: null }]);
    expect(pharmacy.license_number).toBeUndefined();
  });

  it("keeps booking slot type, duration, hospital, and schedule days", () => {
    expect(publicSlot({
      id: 3,
      doctor_id: 9,
      slot_date: "2026-11-20",
      start_time: "09:00:00",
      end_time: "09:30:00",
      type: "in_person",
      duration_minutes: 30,
      hospital_id: 2,
      booked_by_me: false,
      status: "available",
      guest_token: "hidden",
    })).toMatchObject({
      type: "in_person",
      duration_minutes: 30,
      hospital_id: 2,
      booked_by_me: false,
    });
    expect(publicSlot({
      id: 4,
      day_of_week: "monday",
      days_of_week: ["monday", "wednesday"],
      from_date: "2026-11-01",
      to_date: "2026-12-01",
      slot_duration_minutes: 20,
      type: "online",
    })).toMatchObject({
      day_of_week: "monday",
      days_of_week: ["monday", "wednesday"],
      from_date: "2026-11-01",
      to_date: "2026-12-01",
      duration_minutes: 20,
      type: "online",
    });
  });

  it("removes call and guest tokens from list rows", () => {
    const row = stripCallSecrets({
      id: 4,
      status: "confirmed",
      guest_token: "guest-access",
      daily_guest_token: "video-guest",
      daily_doctor_token: "video-doctor",
      room_url: "/consultation/room-1",
      data: { guest_token: "nested-guest", daily_guest_token: "nested-video" },
    });
    expect(JSON.stringify(row)).not.toMatch(/guest-access|video-guest|video-doctor|nested-guest|nested-video/);
    expect(row.room_url).toBe("/consultation/room-1");
    expect(row.data.guest_token).toBeUndefined();
  });

  it("strips tokens from staff lists as well as patient reads", () => {
    const row = { id: 2, daily_guest_token: "staff-token", guest_token: "guest" };
    expect(presentWithoutCallSecrets("patient", "appointments", row).daily_guest_token).toBeUndefined();
    expect(presentWithoutCallSecrets("patient", "instant_consultation_requests", row).guest_token).toBeUndefined();
    expect(presentWithoutCallSecrets("admin", "appointments", row).daily_guest_token).toBeUndefined();
    expect(presentWithoutCallSecrets("admin", "appointments", row).guest_token).toBeUndefined();
    expect(presentWithoutCallSecrets("moderator", "instant_consultations", row).guest_token).toBeUndefined();
    expect(presentWithoutCallSecrets("doctor", "doctors", row).guest_token).toBe("guest");
  });

  it("keeps doctor private fields for that doctor and an admin only", () => {
    const row = {
      id: 4,
      user_id: 9,
      name: "Amina",
      medical_license: "LIC-1",
      national_id_document: "id.webp",
      documents: { degree_document: "degree.webp", city: "Kigali" },
    };
    expect(presentWithoutCallSecrets("admin", "doctors", row, { id: 1, active_role: "admin" }).medical_license).toBe("LIC-1");
    expect(presentWithoutCallSecrets("doctor", "doctors", row, { id: 9, active_role: "doctor" }).national_id_document).toBe("id.webp");
    for (const role of ["moderator", "finance", "help_desk"]) {
      const hidden = presentWithoutCallSecrets("admin", "doctors", { data: row, ...row }, { id: 3, active_role: role });
      expect(hidden.medical_license).toBeUndefined();
      expect(hidden.national_id_document).toBeUndefined();
      expect(hidden.documents.degree_document).toBeUndefined();
      expect(hidden.name).toBe("Amina");
      expect(hidden.data.name).toBe("Amina");
    }
    const otherDoctor = presentWithoutCallSecrets("doctor", "doctors", row, { id: 8, active_role: "doctor" });
    expect(otherDoctor.medical_license).toBeUndefined();
    expect(otherDoctor.name).toBe("Amina");
  });

  it("blocks a stored private file and still serves a portrait", async () => {
    const app = express();
    const stored = new Map([
      ["doctor_documents_171000.webp", { field: "national_id_document", doctorId: 4 }],
    ]);
    app.use("/api/v1/media", privateFileGuard(async (name) => stored.get(name) || null), (req, res) => {
      res.status(200).json({ ok: true, path: req.path });
    });
    const server = await new Promise((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    try {
      const { port } = server.address();
      const blocked = await fetch(`http://127.0.0.1:${port}/api/v1/media/doctor_documents_171000.webp`);
      expect(blocked.status).toBe(403);
      const portrait = await fetch(`http://127.0.0.1:${port}/api/v1/media/aline.webp`);
      expect(portrait.status).toBe(200);
      const phone = await fetch(`http://127.0.0.1:${port}/api/v1/media/phone_icon.webp`);
      expect(phone.status).toBe(200);
    } finally {
      server.close();
    }
  });
});
