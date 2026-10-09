/**
 * Centralized utility for resolving and sanitizing image and media URLs.
 * 
 * - Rewrites MinIO URLs (e.g. https://api.mediconnect.rw/minio/... -> /minio/...)
 * - Removes expired / host-dependent AWS signature params from public MinIO buckets
 * - Proxies storage and minio paths through the same origin to avoid SSL certificate errors
 */

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // 1. MinIO full URLs
  const minioMatch = url.match(
    /^https?:\/\/(?:api\.mediconnect\.rw|staging-api\.mediconnect\.rw|mediconnect\.rw|197\.243\.29\.114|10\.10\.141\.149|10\.10\.141\.148)(?::\d+)?\/minio\/([^?#]+)/i
  );
  if (minioMatch) {
    return `/minio/${minioMatch[1]}`;
  }

  if (url.startsWith("/minio/")) {
    return url.split("?")[0];
  }

  // 2. Storage full URLs
  const storageMatch = url.match(
    /^https?:\/\/(?:api\.mediconnect\.rw|staging-api\.mediconnect\.rw|mediconnect\.rw|197\.243\.29\.114|10\.10\.141\.149|10\.10\.141\.148)(?::\d+)?\/storage\/([^?#]+)/i
  );
  if (storageMatch) {
    return `/storage/${storageMatch[1]}`;
  }

  if (url.startsWith("/storage/")) {
    return url;
  }

  // 3. mediconnect.rw/api/v1/media/... URLs (written by saveUpload on the server)
  const mediaMatch = url.match(
    /^https?:\/\/(?:api\.mediconnect\.rw|mediconnect\.rw)(?::\d+)?\/api\/v1\/media\/([^?#]+)/i
  );
  if (mediaMatch) {
    return `/api/v1/media/${mediaMatch[1]}`;
  }

  // 3. Other third-party URLs (e.g. Google avatar, Unsplash)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // 4. Relative paths
  const cleanPath = url.replace(/^\/+/, "");
  if (cleanPath.startsWith("minio/")) {
    return `/${cleanPath.split("?")[0]}`;
  }
  if (cleanPath.startsWith("mediconnect-avatars/")) {
    return `/minio/${cleanPath.split("?")[0]}`;
  }
  if (cleanPath.startsWith("storage/")) {
    return `/${cleanPath}`;
  }

  if (
    cleanPath.startsWith("doctors/") ||
    cleanPath.startsWith("hospitals/") ||
    cleanPath.startsWith("users/") ||
    cleanPath.startsWith("pharmacies/") ||
    cleanPath.startsWith("team/") ||
    cleanPath.startsWith("patients/") ||
    cleanPath.startsWith("services/")
  ) {
    return `/minio/mediconnect-avatars/${cleanPath.split("?")[0]}`;
  }

  return `/storage/${cleanPath}`;
}

export function sanitizePayloadUrls<T>(data: T): T {
  if (!data || typeof data !== "object") {
    if (typeof data === "string") {
      const s = data as string;
      const minioMatch = s.match(
        /^https?:\/\/(?:api\.mediconnect\.rw|staging-api\.mediconnect\.rw|mediconnect\.rw|197\.243\.29\.114|10\.10\.141\.149|10\.10\.141\.148)(?::\d+)?\/minio\/([^?#]+)/i
      );
      if (minioMatch) {
        return `/minio/${minioMatch[1]}` as unknown as T;
      }

      const storageMatch = s.match(
        /^https?:\/\/(?:api\.mediconnect\.rw|staging-api\.mediconnect\.rw|mediconnect\.rw|197\.243\.29\.114|10\.10\.141\.149|10\.10\.141\.148)(?::\d+)?\/storage\/([^?#]+)/i
      );
      if (storageMatch) {
        return `/storage/${storageMatch[1]}` as unknown as T;
      }

      // mediconnect.rw/api/v1/media/... URLs (from saveUpload on the server)
      const mediaMatch = s.match(
        /^https?:\/\/(?:api\.mediconnect\.rw|mediconnect\.rw)(?::\d+)?\/api\/v1\/media\/([^?#]+)/i
      );
      if (mediaMatch) {
        return `/api/v1/media/${mediaMatch[1]}` as unknown as T;
      }
      return data;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayloadUrls(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    result[key] = sanitizePayloadUrls(value);
  }
  return result as T;
}
