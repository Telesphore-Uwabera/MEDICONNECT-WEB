import { describe, expect, it, vi } from "vitest";
import {
  CHUNK_RELOAD_GUARD_MS,
  claimChunkReload,
  installChunkReloadGuard,
  isChunkLoadError,
  reloadForChunkError,
} from "./chunk-reload";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("chunk reload guard", () => {
  it("recognizes a stale dynamic import and ignores other errors", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module: /assets/Page-abc.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(Object.assign(new Error("Loading chunk 12 failed"), { name: "ChunkLoadError" }))).toBe(true);
    expect(isChunkLoadError(new Error("Server error"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it("allows one reload, then blocks another until the timestamp window passes", () => {
    const storage = memoryStorage();
    const now = 1_700_000_000_000;
    expect(claimChunkReload(now, storage)).toBe(true);
    expect(claimChunkReload(now + 1_000, storage)).toBe(false);
    expect(claimChunkReload(now + CHUNK_RELOAD_GUARD_MS, storage)).toBe(true);
  });

  it("reloads once for a chunk error and does not reload a normal error", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    expect(reloadForChunkError(new Error("Failed to fetch dynamically imported module"), 10, storage, reload)).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(reloadForChunkError(new Error("Failed to fetch dynamically imported module"), 11, storage, reload)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
    expect(reloadForChunkError(new Error("Something else"), 20, memoryStorage(), reload)).toBe(false);
  });

  it("handles vite:preloadError once and lets a second event through to the page", () => {
    const reload = vi.fn();
    const listeners = new Map<string, (event: Event) => void>();
    const target = {
      addEventListener: (type: string, listener: (event: Event) => void) => {
        listeners.set(type, listener);
      },
    };
    installChunkReloadGuard(target as unknown as Window, reload);
    const first = new Event("vite:preloadError", { cancelable: true });
    listeners.get("vite:preloadError")?.(first);
    expect(first.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();

    const second = new Event("vite:preloadError", { cancelable: true });
    listeners.get("vite:preloadError")?.(second);
    expect(second.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });
});
