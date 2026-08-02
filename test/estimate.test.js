import { describe, expect, it } from "vitest";
import { itemsInScenario, monthsFor, priceSet, unitDaysOf } from "../src/domain/estimate.js";
import { emptyEstimate, migrate } from "../src/domain/schema.js";
import { exampleData } from "../src/domain/example.js";

const demo = () => migrate({ ...emptyEstimate(), ...exampleData() });

describe("priceSet", () => {
  it("prices the example project into an ordered range", () => {
    const s = demo();
    const p = priceSet(s, s.items);
    expect(p.pert.likely).toBeGreaterThan(0);
    expect(p.totalLikely).toBeGreaterThan(p.pert.likely);
    expect(p.totalP80).toBeGreaterThan(p.totalLikely);
  });

  it("applies the same cascade factor to every point of the range", () => {
    const s = demo();
    const p = priceSet(s, s.items);
    expect(p.totalExpected / p.pert.expected).toBeCloseTo(p.cascade.factor, 10);
    expect(p.totalP80 / p.pert.p80).toBeCloseTo(p.cascade.factor, 10);
  });

  it("reports a mutualisation saving on the shipped policy", () => {
    const s = demo();
    const p = priceSet(s, s.items);
    expect(p.gross).toBeGreaterThan(p.pert.likely);
    expect(p.saved).toBeCloseTo(p.gross - p.pert.likely);
  });

  it("re-prices each scenario on its own set", () => {
    const s = demo();
    const core = priceSet(s, itemsInScenario(s, s.scenarios[0].id));
    const full = priceSet(s, itemsInScenario(s, s.scenarios[2].id));
    expect(full.pert.likely).toBeGreaterThan(core.pert.likely);
    // A combination is never the sum of its parts' P80s.
    const optOnly = priceSet(
      s,
      s.items.filter((i) => !s.scenarios[0].lotIds.includes(i.lotId)),
    );
    expect(full.pert.p80).toBeLessThan(core.pert.p80 + optOnly.pert.p80);
  });

  it("is stable under reordering of the backlog", () => {
    const s = demo();
    const a = priceSet(s, s.items);
    const b = priceSet(s, [...s.items].reverse());
    expect(b.pert.likely).toBeCloseTo(a.pert.likely, 10);
    expect(b.totalP80).toBeCloseTo(a.totalP80, 10);
  });

  it("handles an empty scope", () => {
    const p = priceSet(emptyEstimate(), []);
    expect(p.totalLikely).toBe(0);
    expect(p.totalP80).toBe(0);
  });
});

describe("itemsInScenario", () => {
  it("returns everything when no scenario is active", () => {
    const s = demo();
    expect(itemsInScenario(s, "__all")).toHaveLength(s.items.length);
    expect(itemsInScenario(s, undefined)).toHaveLength(s.items.length);
  });

  it("filters to the lots a scenario selects", () => {
    const s = demo();
    const core = itemsInScenario(s, s.scenarios[0].id);
    expect(core.length).toBeGreaterThan(0);
    expect(core.length).toBeLessThan(s.items.length);
  });

  it("falls back to everything for an unknown scenario", () => {
    const s = demo();
    expect(itemsInScenario(s, "nope")).toHaveLength(s.items.length);
  });
});

describe("unitDaysOf", () => {
  it("reads the exposed or the consumed ladder as the direction says", () => {
    const s = emptyEstimate();
    const unit = unitDaysOf(s.scales);
    expect(unit({ type: "API", direction: "EXPOSED", level: "M" })).toBe(5);
    expect(unit({ type: "API", direction: "CONSUMED", level: "M" })).toBe(3);
  });

  it("returns zero rather than throwing on an unknown rung", () => {
    expect(unitDaysOf(emptyEstimate().scales)({ type: "GUI", level: "??" })).toBe(0);
  });
});

describe("monthsFor", () => {
  it("divides by team and productive days", () => {
    expect(monthsFor(360, 2)).toBeCloseTo(10);
  });
  it("returns zero for an empty team rather than infinity", () => {
    expect(monthsFor(360, 0)).toBe(0);
  });
});
