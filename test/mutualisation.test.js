import { describe, expect, it } from "vitest";
import { computeDays } from "../src/domain/mutualisation.js";

const scales = { GUI: { S: 3, M: 5, C: 8 }, FEATURE: { M: 8 }, API_EXPOSED: { M: 5 }, API_CONSUMED: { M: 3 } };
const unit = (i) => scales[i.type === "API" ? (i.direction === "CONSUMED" ? "API_CONSUMED" : "API_EXPOSED") : i.type][i.level];
const screen = (id, level = "M", qty = 1) => ({ id, type: "GUI", level, qty });
const mut = { GUI: { on: true, pct: 30, free: 2, by: "level" } };
const net = (m) => [...m.values()].reduce((a, x) => a + x.net, 0);

describe("computeDays", () => {
  it("charges full price when the policy is off", () => {
    const m = computeDays([screen("a"), screen("b"), screen("c")], unit, { GUI: { on: false, pct: 30, free: 2, by: "level" } });
    expect(net(m)).toBe(15);
  });

  it("charges the first N of a pool in full and discounts the rest", () => {
    const m = computeDays([screen("a"), screen("b"), screen("c"), screen("d")], unit, mut);
    expect(net(m)).toBeCloseTo(5 + 5 + 3.5 + 3.5);
  });

  it("pools by complexity level, so a hard screen does not subsidise an easy one", () => {
    // Two mediums and one complex: the complex is alone in its pool and pays full.
    const m = computeDays([screen("a"), screen("b"), screen("c", "C")], unit, mut);
    expect(m.get("c").net).toBe(8);
    expect(m.get("c").saved).toBe(0);
  });

  it("pools across the whole scale when asked to", () => {
    const m = computeDays([screen("a"), screen("b"), screen("c", "C")], unit, { GUI: { ...mut.GUI, by: "all" } });
    // Sorted most expensive first: the complex and one medium pay full, the last is discounted.
    expect(m.get("c").net).toBe(8);
    expect(net(m)).toBeCloseTo(8 + 5 + 3.5);
  });

  it("charges the most expensive items first, whatever the backlog order", () => {
    const forward = computeDays([screen("a", "S"), screen("b", "C"), screen("c", "M")], unit, {
      GUI: { ...mut.GUI, by: "all", free: 1 },
    });
    const reverse = computeDays([screen("c", "M"), screen("b", "C"), screen("a", "S")], unit, {
      GUI: { ...mut.GUI, by: "all", free: 1 },
    });
    expect(forward.get("b").saved).toBe(0);
    expect(net(forward)).toBeCloseTo(net(reverse));
  });

  it("treats a quantity as repetitions of the same item", () => {
    const m = computeDays([screen("z", "M", 5)], unit, mut);
    // 5 + 5 full, then three at 3.5
    expect(m.get("z").gross).toBe(25);
    expect(m.get("z").net).toBeCloseTo(20.5);
    expect(m.get("z").discounted).toBe(3);
  });

  it("never pools an exposed API with a consumed one", () => {
    const items = [
      { id: "e1", type: "API", direction: "EXPOSED", level: "M", qty: 1 },
      { id: "c1", type: "API", direction: "CONSUMED", level: "M", qty: 1 },
    ];
    const m = computeDays(items, unit, {
      API_EXPOSED: { on: true, pct: 50, free: 0, by: "level" },
      API_CONSUMED: { on: true, pct: 50, free: 0, by: "level" },
    });
    expect(m.get("e1").gross).toBe(5);
    expect(m.get("c1").gross).toBe(3);
  });

  it("prices a subset on the subset, which is why scope changes the margin", () => {
    const all = computeDays([screen("a"), screen("b"), screen("c"), screen("d")], unit, mut);
    const some = computeDays([screen("c"), screen("d")], unit, mut);
    expect(all.get("d").net).toBeCloseTo(3.5);
    expect(some.get("d").net).toBe(5); // alone in a smaller set, it pays full
  });

  it("reports gross, net and the saving consistently", () => {
    const m = computeDays([screen("a"), screen("b"), screen("c")], unit, mut);
    for (const v of m.values()) expect(v.saved).toBeCloseTo(v.gross - v.net);
  });
});
