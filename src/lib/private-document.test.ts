import { describe, expect, it, vi } from "vitest";
import { withEmbeddedSignature } from "./private-document";

vi.mock("@/lib/auth-session", () => ({
  getAuthToken: () => "token",
}));

describe("printed signatures", () => {
  it("embeds the signature bytes instead of the public file url", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["sig"]), { status: 200 })));
    const ready = await withEmbeddedSignature({
      doctor: { signature: "https://mediconnect.rw/api/v1/media/signature_31.webp" },
    });
    expect(ready.doctor.signature.startsWith("data:")).toBe(true);
    expect(ready.doctor.signature).not.toContain("signature_31.webp");
  });

  it("drops a signature the viewer is not allowed to read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
    const ready = await withEmbeddedSignature({
      signature: "https://mediconnect.rw/api/v1/media/doctor_documents_1.webp",
    });
    expect(ready.signature).toBe("");
  });
});
