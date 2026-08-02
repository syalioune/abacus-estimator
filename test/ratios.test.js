import { describe, expect, it } from "vitest";
import { applyRatios, hasRiskBuffer } from "../src/domain/ratios.js";
import { DEFAULT_RATIOS } from "../src/domain/defaults.js";

describe("applyRatios", () => {
  it("returns development itself when nothing is enabled", () => {
    const r = applyRatios(
      DEFAULT_RATIOS.map((x) => ({ ...x, on: false })),
      100,
    );
    expect(r.total).toBe(100);
    expect(r.factor).toBe(1);
  });

  it("applies a DEV line to development only", () => {
    const r = applyRatios([{ id: "a", label: "Specs", pct: 20, basis: "DEV", on: true }], 100);
    expect(r.total).toBe(120);
  });

  it("compounds a CUM line over everything above it", () => {
    const r = applyRatios(
      [
        { id: "a", label: "Specs", pct: 20, basis: "DEV", on: true },
        { id: "b", label: "PM", pct: 10, basis: "CUM", on: true },
      ],
      100,
    );
    expect(r.total).toBeCloseTo(132); // 120 + 10% of 120
  });

  it("makes order matter for CUM lines", () => {
    const a = { id: "a", label: "Specs", pct: 20, basis: "DEV", on: true };
    const b = { id: "b", label: "PM", pct: 10, basis: "CUM", on: true };
    expect(applyRatios([a, b], 100).total).not.toBeCloseTo(applyRatios([b, a], 100).total);
  });

  it("keeps the default cascade near a factor of two", () => {
    const r = applyRatios(DEFAULT_RATIOS, 100);
    expect(r.factor).toBeGreaterThan(2);
    expect(r.factor).toBeLessThan(2.3);
  });

  it("survives a zero development total without dividing by zero", () => {
    expect(applyRatios(DEFAULT_RATIOS, 0)).toMatchObject({ total: 0, factor: 1 });
  });

  it("flags a risk buffer, in English or French", () => {
    expect(hasRiskBuffer(DEFAULT_RATIOS)).toBe(true);
    expect(hasRiskBuffer([{ label: "Aléas", on: true }])).toBe(true);
    expect(hasRiskBuffer([{ label: "Risk buffer", on: false }])).toBe(false);
    expect(hasRiskBuffer([{ label: "Specifications", on: true }])).toBe(false);
  });
});
