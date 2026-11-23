import { describe, expect, it } from "vitest";
import { publicMediaUrl } from "./image-url";

describe("publicMediaUrl", () => {
  it("loads stored doctor files from the live site", () => {
    expect(publicMediaUrl("doctors/doctor_14_1791111470_bftvtjqC.webp")).toBe(
      "https://mediconnect.rw/minio/mediconnect-avatars/doctors/doctor_14_1791111470_bftvtjqC.webp",
    );
    expect(publicMediaUrl("https://mediconnect.rw/api/v1/media/doctor_photo_31_1791508287423.webp")).toBe(
      "https://mediconnect.rw/api/v1/media/doctor_photo_31_1791508287423.webp",
    );
    expect(publicMediaUrl("/minio/mediconnect-avatars/team/team_1_1791111483_dRK9gy2u.webp")).toBe(
      "https://mediconnect.rw/minio/mediconnect-avatars/team/team_1_1791111483_dRK9gy2u.webp",
    );
  });

  it("leaves an empty photo empty so the initials fallback can show", () => {
    expect(publicMediaUrl(null)).toBeUndefined();
    expect(publicMediaUrl("")).toBeUndefined();
  });
});
