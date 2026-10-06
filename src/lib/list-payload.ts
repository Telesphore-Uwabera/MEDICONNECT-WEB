/** Read a list from either `{ key: [] }`, a Laravel `{ data: [] }` page, or a bare array. */
export function listFrom<T>(payload: unknown, key?: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const body = payload as Record<string, unknown>;
  if (key && Array.isArray(body[key])) return body[key] as T[];
  if (Array.isArray(body.data)) return body.data as T[];
  return [];
}
