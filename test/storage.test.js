import { describe, expect, it, vi } from "vitest";
import { detectStorage, loadEstimate, localStorageAdapter, memoryStorage, saveEstimate } from "../src/state/storage.js";
import { emptyEstimate } from "../src/domain/schema.js";

const fakeLocal = () => {
  const m = new Map();
  return {
    localStorage: {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
    },
  };
};

describe("storage adapters", () => {
  it("round-trips an estimate through memory", async () => {
    const s = memoryStorage();
    await saveEstimate(s, emptyEstimate());
    expect((await loadEstimate(s)).project).toBe("New project");
  });

  it("round-trips through localStorage", async () => {
    const s = localStorageAdapter(fakeLocal());
    await saveEstimate(s, { project: "X" });
    expect(await loadEstimate(s)).toEqual({ project: "X" });
  });

  it("returns null when nothing is stored", async () => {
    expect(await loadEstimate(memoryStorage())).toBeNull();
  });

  it("returns null rather than throwing on corrupt JSON", async () => {
    const s = memoryStorage();
    await s.set("abacus:estimate", "{not json");
    expect(await loadEstimate(s)).toBeNull();
  });

  it("reports a failed save instead of losing the edit", async () => {
    const broken = {
      get: async () => null,
      set: async () => {
        throw new Error("quota");
      },
    };
    expect(await saveEstimate(broken, emptyEstimate())).toBe(false);
  });

  it("prefers a host store when one is injected", () => {
    expect(detectStorage({ storage: { get: () => {}, set: () => {} } }).name).toBe("host");
  });

  it("falls back to localStorage, then to memory", () => {
    expect(detectStorage(fakeLocal()).name).toBe("localStorage");
    const denied = {
      localStorage: {
        setItem: () => {
          throw new Error("denied");
        },
      },
    };
    expect(detectStorage(denied).name).toBe("memory");
  });

  it("survives a host store that throws on read", async () => {
    const win = {
      storage: {
        get: vi.fn(async () => {
          throw new Error("nope");
        }),
        set: async () => {},
      },
    };
    expect(await loadEstimate(detectStorage(win))).toBeNull();
  });
});
