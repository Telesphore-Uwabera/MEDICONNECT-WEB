/** How long a reload blocks another one, so a still-missing chunk cannot loop. */
export const CHUNK_RELOAD_GUARD_MS = 10_000;

const STORAGE_KEY = "mc:chunk-reload-at";

const CHUNK_LOAD_MESSAGES = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
];

type ReloadStorage = Pick<Storage, "getItem" | "setItem">;

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (error && typeof error === "object") {
    const record = error as { name?: unknown; message?: unknown };
    return `${String(record.name || "")} ${String(record.message || "")}`;
  }
  return "";
}

export function isChunkLoadError(error: unknown): boolean {
  const text = errorText(error);
  if (text.includes("ChunkLoadError")) return true;
  return CHUNK_LOAD_MESSAGES.some((message) => text.includes(message));
}

/**
 * Returns true only for the first claim inside the guard window.
 * The stored value is the timestamp of that claim.
 */
export function claimChunkReload(now = Date.now(), storage: ReloadStorage = sessionStorage): boolean {
  try {
    const previous = Number(storage.getItem(STORAGE_KEY) || "");
    if (Number.isFinite(previous) && previous > 0 && now - previous < CHUNK_RELOAD_GUARD_MS) {
      return false;
    }
    storage.setItem(STORAGE_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

export function reloadForChunkError(
  error: unknown,
  now = Date.now(),
  storage: ReloadStorage = sessionStorage,
  reload: () => void = () => window.location.reload(),
): boolean {
  if (!isChunkLoadError(error) || !claimChunkReload(now, storage)) return false;
  reload();
  return true;
}

export function installChunkReloadGuard(
  target: Pick<Window, "addEventListener"> = window,
  reload: () => void = () => window.location.reload(),
): void {
  target.addEventListener("vite:preloadError", (event) => {
    const claimed = claimChunkReload();
    if (!claimed) return;
    if (event instanceof Event) event.preventDefault();
    reload();
  });
}
