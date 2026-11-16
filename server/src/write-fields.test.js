import { describe, expect, it } from "vitest";
import { partitionWrite, unknownFieldError } from "./write-fields.js";

describe("write field checks", () => {
  it("keeps known columns and lists the rest", () => {
    const split = partitionWrite(
      { user_id: 4, name: "Amina", name_en: "Amina", slug: "amina" },
      ["user_id", "name"],
    );
    expect(split.payload).toEqual({ user_id: 4, name: "Amina" });
    expect(split.unknown).toEqual(["name_en", "slug"]);
  });

  it("reports an unknown field as a 422", () => {
    const error = unknownFieldError("patients", ["slug"]);
    expect(error.status).toBe(422);
    expect(error.fields).toEqual(["slug"]);
    expect(error.message).toMatch(/slug/);
  });
});
