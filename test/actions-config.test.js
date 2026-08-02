import { describe, expect, it } from "vitest";
import * as A from "../src/state/actions.js";
import { emptyEstimate } from "../src/domain/schema.js";
import { applyRatios } from "../src/domain/ratios.js";

describe("estimate metadata", () => {
  it("renames the project", () => {
    expect(A.setProject(emptyEstimate(), "Order platform").project).toBe("Order platform");
  });

  it("renames a rung without changing what it costs", () => {
    const s = A.setLevelLabel(emptyEstimate(), "V", "Gnarly");
    expect(s.levelLabels.V).toBe("Gnarly");
    expect(s.scales.GUI.V.days).toBe(emptyEstimate().scales.GUI.V.days);
  });
});

describe("confidence spreads", () => {
  it("widens a spread without touching the ladder", () => {
    const s = A.setSpread(emptyEstimate(), "L", { min: 0.5, max: 2.5 });
    expect(s.spreads.L).toMatchObject({ min: 0.5, max: 2.5 });
    expect(s.spreads.L.why).toBeTruthy();
    expect(s.scales.FEATURE.C.days).toBe(13);
  });

  it("leaves the other levels alone", () => {
    const s = A.setSpread(emptyEstimate(), "L", { max: 3 });
    expect(s.spreads.H).toEqual(emptyEstimate().spreads.H);
  });
});

describe("mutualisation policy", () => {
  it("toggles a scale independently of the others", () => {
    const s = A.setMut(emptyEstimate(), "FEATURE", { on: true, pct: 40 });
    expect(s.mut.FEATURE).toMatchObject({ on: true, pct: 40, free: 2 });
    expect(s.mut.GUI).toEqual(emptyEstimate().mut.GUI);
  });
});

describe("ratio cascade", () => {
  it("adds a line that is on by default and priced on development", () => {
    const s = A.addRatio(emptyEstimate());
    const added = s.ratios[s.ratios.length - 1];
    expect(added).toMatchObject({ on: true, basis: "DEV", pct: 10 });
  });

  it("edits a line and moves the total", () => {
    const before = applyRatios(emptyEstimate().ratios, 100).total;
    const s = A.updateRatio(emptyEstimate(), "r1", { pct: 40 });
    expect(applyRatios(s.ratios, 100).total).toBeGreaterThan(before);
  });

  it("removes a line", () => {
    const s = A.removeRatio(emptyEstimate(), "r7");
    expect(s.ratios.find((r) => r.id === "r7")).toBeUndefined();
  });

  it("switching a line off is not the same as deleting it", () => {
    const off = A.updateRatio(emptyEstimate(), "r7", { on: false });
    const gone = A.removeRatio(emptyEstimate(), "r7");
    expect(applyRatios(off.ratios, 100).total).toBeCloseTo(applyRatios(gone.ratios, 100).total);
    expect(off.ratios).toHaveLength(gone.ratios.length + 1);
  });
});

describe("lots and scenarios", () => {
  it("renames a lot", () => {
    const s = emptyEstimate();
    expect(A.updateLot(s, s.lots[0].id, { name: "Phase 1" }).lots[0].name).toBe("Phase 1");
  });

  it("ignores a blank lot or component or subsystem name", () => {
    const s = emptyEstimate();
    expect(A.addLot(s, "  ").lots).toHaveLength(1);
    expect(A.addComponent(s, "").components).toHaveLength(0);
    expect(A.addSubsystem(s, "   ").subsystems).toHaveLength(0);
  });

  it("moves the baseline", () => {
    const s = A.addScenario(emptyEstimate());
    const second = s.scenarios[1].id;
    expect(A.setBaseline(s, second).baselineId).toBe(second);
  });

  it("renames a subsystem", () => {
    let s = A.addSubsystem(emptyEstimate(), "Back");
    s = A.updateSubsystem(s, s.subsystems[0].id, { name: "Backend" });
    expect(s.subsystems[0].name).toBe("Backend");
  });
});
