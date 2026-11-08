import { describe, expect, it } from "vitest";
import { selectedBrowseSpecialities } from "./browse-specialities.js";

describe("home-page speciality matching", () => {
  it("matches a doctor speciality by fee id and by the landing label", () => {
    expect(selectedBrowseSpecialities({ specialization_fee_id: 4 }).map((item) => item.key)).toEqual(["pediatrics"]);
    expect(selectedBrowseSpecialities({ specialization: "Dental" }).map((item) => item.key)).toEqual(["stomatology-dental-surgery"]);
    expect(selectedBrowseSpecialities({ specialization: "Not a listed speciality" })).toEqual([]);
  });
});
