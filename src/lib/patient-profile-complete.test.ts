import { beforeEach, describe, expect, it } from "vitest";
import {
  REQUIRED_PROFILE_FIELDS,
  appointmentProfileRequired,
  clearAppointmentProfileRequirement,
  isPatientRecordComplete,
  requireAppointmentProfile,
} from "./patient-profile-complete";

describe("patient profile completion", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("does not require blood type", () => {
    expect(REQUIRED_PROFILE_FIELDS).not.toContain("blood_type");
  });

  it("treats a complete record without blood type as complete", () => {
    const record: Record<string, string> = {
      date_of_birth: "2000-01-01",
      gender: "male",
      national_id: "A123456",
      address: "KG 1 Ave",
      city: "Kigali",
      province: "Kigali City",
      country: "Rwanda",
      emergency_contact_name: "Jane",
      emergency_contact_relation: "Spouse",
      emergency_contact_phone: "+250788000000",
    };
    expect(isPatientRecordComplete(record)).toBe(true);
  });

  it("tracks the appointment-payment profile requirement flag", () => {
    expect(appointmentProfileRequired()).toBe(false);
    requireAppointmentProfile();
    expect(appointmentProfileRequired()).toBe(true);
    clearAppointmentProfileRequirement();
    expect(appointmentProfileRequired()).toBe(false);
  });
});
