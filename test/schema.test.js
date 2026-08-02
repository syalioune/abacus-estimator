import { describe, expect, it } from "vitest";
import {
  ABACUS_KEYS,
  SCHEMA_VERSION,
  applyAbacus,
  emptyEstimate,
  estimateJsonSchema,
  migrate,
  pickAbacus,
} from "../src/domain/schema.js";

describe("migrate", () => {
  it("stamps the current version", () => {
    expect(migrate({}).version).toBe(SCHEMA_VERSION);
  });

  it("lifts v1 component-items into containers without losing their work", () => {
    const v1 = {
      items: [
        { id: "c1", type: "COMPONENT", name: "order-service", level: "C", qty: 1, tag: "backend" },
        { id: "i1", type: "API", name: "POST /orders", componentId: "c1", level: "C", qty: 1 },
      ],
    };
    const out = migrate(v1);
    expect(out.components).toHaveLength(1);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].componentId).toBe("c1");
  });

  it("promotes v3 free-text subsystems to declared entities, case-insensitively", () => {
    const out = migrate({
      components: [
        { id: "a", name: "svc-a", tag: "Backend" },
        { id: "b", name: "svc-b", tag: "backend" },
      ],
    });
    expect(out.subsystems).toHaveLength(1);
    expect(out.components[0].subsystemId).toBe(out.components[1].subsystemId);
  });

  it("defaults lot, confidence and direction on legacy items", () => {
    const out = migrate({ items: [{ id: "i", type: "API", name: "x", level: "M", qty: 1 }] });
    expect(out.items[0].lotId).toBe(out.lots[0].id);
    expect(out.items[0].confidence).toBe("M");
    expect(out.items[0].direction).toBe("EXPOSED");
  });

  it("carries a v3 single API scale into the exposed ladder", () => {
    const custom = {
      S: { days: 4, why: "" },
      M: { days: 6, why: "" },
      C: { days: 9, why: "" },
      V: { days: 15, why: "" },
      X: { days: 60, why: "" },
    };
    const out = migrate({ scales: { API: custom } });
    expect(out.scales.API_EXPOSED.M.days).toBe(6);
    expect(out.scales.API_CONSUMED.M.days).toBe(3); // the shipped consumed ladder
  });

  it("drops money, because this tool estimates effort", () => {
    const out = migrate({ rate: 600, currency: "EUR" });
    expect(out.rate).toBeUndefined();
    expect(out.currency).toBeUndefined();
  });

  it("repairs a scenario pointing at a deleted lot", () => {
    const out = migrate({
      lots: [{ id: "l1", name: "Core" }],
      scenarios: [{ id: "s1", name: "S", lotIds: ["l1", "ghost"] }],
      baselineId: "missing",
    });
    expect(out.scenarios[0].lotIds).toEqual(["l1"]);
    expect(out.baselineId).toBe("s1");
  });

  it("lifts a v5 legacy single tag into a list", () => {
    const out = migrate({ items: [{ id: "i", type: "API", name: "x", level: "M", qty: 1, tag: "public" }] });
    expect(out.items[0].tags).toEqual(["public"]);
    expect(out.items[0].tag).toBeUndefined();
  });

  it("leaves an item with no tag with an empty list", () => {
    const out = migrate({ items: [{ id: "i", type: "API", name: "x", level: "M", qty: 1 }] });
    expect(out.items[0].tags).toEqual([]);
  });

  it("drops items of an unknown type rather than crashing on them", () => {
    const out = migrate({ items: [{ id: "x", type: "WIDGET", name: "?", level: "M" }] });
    expect(out.items).toHaveLength(0);
  });

  it("is idempotent", () => {
    const once = migrate(emptyEstimate());
    expect(migrate(once)).toEqual(once);
  });
});

describe("pickAbacus / applyAbacus", () => {
  it("carries only the abacus keys, nothing about items or structure", () => {
    const picked = pickAbacus(emptyEstimate());
    expect(Object.keys(picked).sort()).toEqual([...ABACUS_KEYS].sort());
  });

  it("round-trips into a different estimate without touching its items", () => {
    const source = migrate({ ratios: [{ id: "custom", label: "Custom", pct: 42, basis: "DEV", on: true }] });
    const target = migrate({ items: [{ id: "i", type: "API", name: "keep me", level: "M", qty: 1 }] });
    const merged = applyAbacus(target, pickAbacus(source));
    expect(merged.ratios).toEqual(source.ratios);
    expect(merged.items).toEqual(target.items);
  });

  it("leaves keys missing from a partial file untouched", () => {
    const target = migrate({});
    const merged = applyAbacus(target, { spreads: target.spreads });
    expect(merged.scales).toBe(target.scales);
    expect(merged.ratios).toBe(target.ratios);
  });
});

describe("estimateJsonSchema", () => {
  it("produces a schema whose own version matches SCHEMA_VERSION", () => {
    const schema = estimateJsonSchema();
    expect(schema.properties.version.const).toBe(SCHEMA_VERSION);
  });

  it("enumerates the same rungs the ladder shows", () => {
    const schema = estimateJsonSchema();
    expect(schema.properties.items.items.properties.level.enum).toEqual(["S", "M", "C", "V", "X"]);
  });
});
