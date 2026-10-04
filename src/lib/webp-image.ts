const RASTER_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/bmp",
  "image/gif",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/x-png",
]);

function isConvertibleImage(file: File) {
  const type = file.type.toLowerCase();
  if (!type && !file.name) return false;
  if (type === "image/webp" || type === "image/svg+xml") return false;
  if (RASTER_TYPES.has(type)) return true;
  return /\.(jpe?g|png|gif|bmp|tiff?|heic|heif)$/i.test(file.name);
}

/** Encode a raster upload as WebP. Non-images and files that cannot be decoded are left unchanged. */
export async function fileToWebp(file: File, quality = 0.82): Promise<File> {
  if (!isConvertibleImage(file) || typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });
    if (!blob || blob.size === 0) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function formDataToWebp(form: FormData): Promise<FormData> {
  const next = new FormData();
  for (const [key, value] of form.entries()) {
    next.append(key, value instanceof File ? await fileToWebp(value) : value);
  }
  return next;
}
