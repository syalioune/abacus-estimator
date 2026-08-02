import { describe, expect, it } from "vitest";
import { pertOf, Z_P80 } from "../src/domain/pert.js";

const spreads = {
  H: { min: 0.9, max: 1.25 },
  M: { min: 0.8, max: 1.5 },
  L: { min: 0.6, max: 2 },
};
const days = (i) => i.d;
const item = (d, confidence = "M") => ({ id: String(Math.random()), d, confidence });

describe("pertOf", () => {
  it("returns zeroes for an empty set", () => {
    expect(pertOf([], days, spreads)).toMatchObject({ likely: 0, expected: 0, sd: 0, p80: 0 });
  });

  it("derives min and max from the confidence spread, not from the rung", () => {
    const r = pertOf([item(10, "L")], days, spreads);
    expect(r.likely).toBe(10);
    expect(r.min).toBeCloseTo(6);
    expect(r.max).toBeCloseTo(20);
  });

  it("puts the expected value above the likely one when the spread is asymmetric", () => {
    // Work overruns more readily than it underruns: E must exceed m.
    const r = pertOf([item(10, "L")], days, spreads);
    expect(r.expected).toBeCloseTo((6 + 40 + 20) / 6);
    expect(r.expected).toBeGreaterThan(r.likely);
  });

  it("leaves the likely value untouched whatever the confidence", () => {
    // Confidence widens the range; it never inflates the figure.
    const a = pertOf([item(10, "H")], days, spreads);
    const b = pertOf([item(10, "L")], days, spreads);
    expect(a.likely).toBe(b.likely);
    expect(b.sd).toBeGreaterThan(a.sd);
  });

  it("adds variances rather than deviations", () => {
    // Twenty small uncertain items are more predictable than one big one.
    const many = Array.from({ length: 20 }, () => item(10, "L"));
    const lump = [item(200, "L")];
    const m = pertOf(many, days, spreads);
    const l = pertOf(lump, days, spreads);
    expect(m.likely).toBeCloseTo(l.likely);
    expect(m.expected).toBeCloseTo(l.expected);
    expect(m.sd).toBeLessThan(l.sd);
    expect(m.p80).toBeLessThan(l.p80);
    expect(m.sd).toBeCloseTo(l.sd / Math.sqrt(20), 5);
  });

  it("makes a combined set cheaper at P80 than the sum of its parts", () => {
    const core = Array.from({ length: 15 }, () => item(8, "M"));
    const opt = Array.from({ length: 5 }, () => item(13, "L"));
    const a = pertOf(core, days, spreads);
    const b = pertOf(opt, days, spreads);
    const both = pertOf([...core, ...opt], days, spreads);
    expect(both.p80).toBeLessThan(a.p80 + b.p80);
    expect(both.likely).toBeCloseTo(a.likely + b.likely);
  });

  it("orders the five points", () => {
    const r = pertOf([item(10, "L"), item(5, "H")], days, spreads);
    expect(r.min).toBeLessThan(r.likely);
    expect(r.likely).toBeLessThanOrEqual(r.expected);
    expect(r.expected).toBeLessThan(r.p80);
    expect(r.p80).toBeLessThan(r.p90);
    expect(r.p90).toBeLessThan(r.max);
  });

  it("computes P80 as E + 0.84 sigma", () => {
    const r = pertOf([item(10, "M")], days, spreads);
    expect(r.p80).toBeCloseTo(r.expected + Z_P80 * r.sd, 10);
  });

  it("falls back to medium confidence for an unknown flag", () => {
    const r = pertOf([{ id: "x", d: 10, confidence: "???" }], days, spreads);
    expect(r.min).toBeCloseTo(8);
  });
});
