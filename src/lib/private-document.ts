import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";

const BASE_URL = import.meta.env.VITE_APP_BASE_URL || "";

function signaturePaths(record: unknown): string[] {
  if (!record || typeof record !== "object") return [];
  const source = record as Record<string, unknown>;
  const doctor = source.doctor as Record<string, unknown> | undefined;
  const profile = doctor?.profile as Record<string, unknown> | undefined;
  return [
    doctor?.signature_url,
    doctor?.signature,
    profile?.signature_url,
    profile?.signature,
    source.signature_url,
    source.signature,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function useAuthorizedFileUrl(url?: string | null) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!url) {
      setSrc("");
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    fetchPrivateDocumentBlob(url).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setSrc(url);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return src;
}

export async function fetchPrivateDocumentBlob(pathOrUrl: string): Promise<Blob | null> {
  const token = getAuthToken();
  if (!token || !pathOrUrl || pathOrUrl.startsWith("data:")) return null;
  const response = await fetch(
    `${BASE_URL}/documents/open?path=${encodeURIComponent(pathOrUrl)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "*/*" } },
  );
  if (!response.ok) return null;
  return response.blob();
}

export async function privateDocumentDataUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("data:")) return pathOrUrl;
  const blob = await fetchPrivateDocumentBlob(pathOrUrl);
  if (!blob) return "";
  const buffer = typeof blob.arrayBuffer === "function"
    ? await blob.arrayBuffer()
    : await new Response(blob).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const type = blob.type || "application/octet-stream";
  return `data:${type};base64,${btoa(binary)}`;
}

export async function openPrivateDocument(pathOrUrl: string): Promise<boolean> {
  const blob = await fetchPrivateDocumentBlob(pathOrUrl);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

function putSignature(target: Record<string, unknown> | undefined, value: string) {
  if (!target) return;
  if ("signature" in target || value) target.signature = value;
  if ("signature_url" in target || value) target.signature_url = value;
}

/** Replace a remote signature with bytes loaded through the signed-in document route. */
export async function withEmbeddedSignature<T>(record: T): Promise<T> {
  const remote = signaturePaths(record).find((value) => !value.startsWith("data:"));
  if (!remote) return record;
  const dataUrl = await privateDocumentDataUrl(remote);
  const next = { ...(record as object) } as Record<string, unknown>;
  if (next.doctor && typeof next.doctor === "object") {
    const doctor = { ...(next.doctor as Record<string, unknown>) };
    putSignature(doctor, dataUrl);
    if (doctor.profile && typeof doctor.profile === "object") {
      doctor.profile = { ...(doctor.profile as Record<string, unknown>) };
      putSignature(doctor.profile as Record<string, unknown>, dataUrl);
    }
    next.doctor = doctor;
  }
  putSignature(next, dataUrl);
  return next as T;
}
