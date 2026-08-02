/**
 * Persistence port.
 *
 * The tool keeps everything on the machine it runs on: there is no server and
 * no account, so an estimate never leaves the browser unless someone exports
 * it. Adapters exist so the same app can run as a static site, inside a
 * sandboxed host that injects its own store, or headless in tests.
 */

const KEY = "abacus:estimate";

/** In-memory: the fallback when nothing else is available, and the test double. */
export function memoryStorage() {
  const map = new Map();
  return {
    name: "memory",
    async get(key) {
      return map.has(key) ? { key, value: map.get(key) } : null;
    },
    async set(key, value) {
      map.set(key, value);
      return { key, value };
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

/** Browser localStorage, the default for the static build. */
export function localStorageAdapter(win = globalThis) {
  return {
    name: "localStorage",
    async get(key) {
      const value = win.localStorage.getItem(key);
      return value == null ? null : { key, value };
    },
    async set(key, value) {
      win.localStorage.setItem(key, value);
      return { key, value };
    },
    async remove(key) {
      win.localStorage.removeItem(key);
    },
  };
}

/** A host-injected key-value store (window.storage), if one is present. */
export function hostStorageAdapter(win = globalThis) {
  return {
    name: "host",
    async get(key) {
      try {
        return await win.storage.get(key);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      return win.storage.set(key, value);
    },
    async remove(key) {
      return win.storage.delete?.(key);
    },
  };
}

/** Pick the best available adapter without throwing in odd environments. */
export function detectStorage(win = globalThis) {
  try {
    if (win.storage && typeof win.storage.get === "function") return hostStorageAdapter(win);
  } catch {
    /* fall through */
  }
  try {
    const probe = "__abacus_probe__";
    win.localStorage.setItem(probe, "1");
    win.localStorage.removeItem(probe);
    return localStorageAdapter(win);
  } catch {
    // Private browsing, disabled storage, or a non-browser host.
    return memoryStorage();
  }
}

export const STORAGE_KEY = KEY;

/** Load an estimate, returning null when nothing is stored or it is unreadable. */
export async function loadEstimate(storage, key = KEY) {
  try {
    const rec = await storage.get(key);
    if (!rec?.value) return null;
    return JSON.parse(rec.value);
  } catch {
    return null;
  }
}

/** Best-effort save. A failure here must never lose the user's current edit. */
export async function saveEstimate(storage, state, key = KEY) {
  try {
    await storage.set(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
