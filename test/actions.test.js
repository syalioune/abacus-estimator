import { describe, expect, it } from "vitest";
import * as A from "../src/state/actions.js";
import { emptyEstimate } from "../src/domain/schema.js";
import { itemsInScenario } from "../src/domain/estimate.js";

const withItem = () => {
  const s = A.addComponent(emptyEstimate(), "svc");
  const c = s.components[0].id;
  return { s: A.addItem(s, { type: "API", name: "POST /orders", componentId: c, level: "C" }), c };
};

describe("items", () => {
  it("always assigns a lot", () => {
    const { s } = withItem();
    expect(s.items[0].lotId).toBe(s.lots[0].id);
  });

  it("ignores an item with no name", () => {
    const s = A.addItem(emptyEstimate(), { type: "API", name: "   " });
    expect(s.items).toHaveLength(0);
  });

  it("only gives a direction to APIs", () => {
    const s = A.addItem(emptyEstimate(), { type: "GUI", name: "Login" });
    expect(s.items[0].direction).toBeUndefined();
  });

  it("duplicates under a new id", () => {
    const { s } = withItem();
    const d = A.duplicateItem(s, s.items[0].id);
    expect(d.items).toHaveLength(2);
    expect(d.items[1].id).not.toBe(d.items[0].id);
    expect(d.items[1].name).toMatch(/copy/);
  });

  it("starts unreviewed", () => {
    const { s } = withItem();
    expect(s.items[0].reviewed).toBe(false);
  });

  it("reviews a whole band at once, and leaves everything outside it alone", () => {
    let s = A.addItem(emptyEstimate(), { type: "API", name: "POST /orders" });
    s = A.addItem(s, { type: "API", name: "GET /orders" });
    s = A.addItem(s, { type: "GUI", name: "Order list" });
    const apis = s.items.filter((i) => i.type === "API").map((i) => i.id);

    const marked = A.reviewItems(s, apis, true);
    expect(marked.items.filter((i) => i.reviewed).map((i) => i.type)).toEqual(["API", "API"]);
    expect(marked.items.find((i) => i.type === "GUI").reviewed).toBe(false);

    // The same band unmarks: one button, both directions.
    expect(A.reviewItems(marked, apis, false).items.some((i) => i.reviewed)).toBe(false);
  });

  it("resets review status on duplicate, since a copy has not itself been looked at", () => {
    const { s } = withItem();
    const reviewed = A.updateItem(s, s.items[0].id, { reviewed: true });
    const d = A.duplicateItem(reviewed, reviewed.items[0].id);
    expect(d.items[0].reviewed).toBe(true);
    expect(d.items[1].reviewed).toBe(false);
  });

  it("attaches many items at once", () => {
    let { s } = withItem();
    s = A.addItem(s, { type: "GUI", name: "Order list" });
    const target = s.components[0].id;
    const out = A.attachItems(
      s,
      s.items.map((i) => i.id),
      target,
    );
    expect(out.items.every((i) => i.componentId === target)).toBe(true);
  });
});

describe("containers", () => {
  it("orphans items rather than deleting them with their component", () => {
    const { s, c } = withItem();
    const out = A.removeComponent(s, c);
    expect(out.components).toHaveLength(0);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].componentId).toBeNull();
  });

  it("ungroups components rather than deleting them with their subsystem", () => {
    let s = A.addSubsystem(emptyEstimate(), "Backend");
    s = A.addComponent(s, "svc");
    s = A.updateComponent(s, s.components[0].id, { subsystemId: s.subsystems[0].id });
    const out = A.removeSubsystem(s, s.subsystems[0].id);
    expect(out.components).toHaveLength(1);
    expect(out.components[0].subsystemId).toBeNull();
  });

  it("moves an item to another lot, and it leaves the scenarios that lot is out of", () => {
    let s = A.addLot(emptyEstimate(), "Option A");
    const [core, optional] = s.lots.map((l) => l.id);
    s = A.addItem(s, { type: "API", name: "POST /orders" });
    const item = s.items[0].id;
    expect(itemsInScenario(s, s.scenarios[0].id)).toHaveLength(1);

    const out = A.updateItem(s, item, { lotId: optional });
    expect(out.items[0].lotId).toBe(optional);
    expect(out.items.filter((i) => i.lotId === core)).toHaveLength(0);
    // The baseline scenario holds the core lot only, so the item has left it.
    expect(itemsInScenario(out, out.scenarios[0].id)).toHaveLength(0);
  });

  it("refuses to delete the last lot", () => {
    const s = emptyEstimate();
    expect(A.removeLot(s, s.lots[0].id).lots).toHaveLength(1);
  });

  it("moves items off a deleted lot instead of dropping them", () => {
    let s = A.addLot(emptyEstimate(), "Option A");
    const optional = s.lots[1].id;
    s = A.addItem(s, { type: "API", name: "x", lotId: optional });
    s = A.updateScenario(s, s.scenarios[0].id, { lotIds: [s.lots[0].id, optional] });
    const out = A.removeLot(s, optional);
    expect(out.items[0].lotId).toBe(out.lots[0].id);
    expect(out.scenarios[0].lotIds).not.toContain(optional);
  });

  it("refuses to delete the last scenario and re-points the baseline", () => {
    let s = A.addScenario(emptyEstimate());
    const first = s.scenarios[0].id;
    expect(A.removeScenario(emptyEstimate(), first).scenarios).toHaveLength(1);
    s = A.setBaseline(s, first);
    const out = A.removeScenario(s, first);
    expect(out.baselineId).toBe(out.scenarios[0].id);
  });

  it("copies the baseline's lots into a new scenario", () => {
    const s = A.addScenario(emptyEstimate());
    expect(s.scenarios[1].lotIds).toEqual(s.scenarios[0].lotIds);
  });
});

describe("abacus", () => {
  it("edits one rung without disturbing its neighbours", () => {
    const s = A.setScale(emptyEstimate(), "GUI", "M", { days: 7 });
    expect(s.scales.GUI.M.days).toBe(7);
    expect(s.scales.GUI.C.days).toBe(8);
    expect(s.scales.GUI.M.why).toBeTruthy();
  });

  it("does not mutate the previous state", () => {
    const before = emptyEstimate();
    const days = before.scales.GUI.M.days;
    A.setScale(before, "GUI", "M", { days: 99 });
    expect(before.scales.GUI.M.days).toBe(days);
  });
});
