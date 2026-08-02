import { describe, expect, it } from "vitest";
import { exportItemsCsv, importItems, parseCsv } from "../src/domain/csv.js";
import { emptyEstimate, migrate } from "../src/domain/schema.js";
import { exampleData } from "../src/domain/example.js";
import { groupBy, priceSet } from "../src/domain/estimate.js";

const demo = () => migrate({ ...emptyEstimate(), ...exampleData() });

describe("exportItemsCsv", () => {
  const state = demo();
  const priced = priceSet(state, state.items);
  const csv = () => exportItemsCsv(state, { daysOf: priced.daysOf, grossOf: priced.grossOf });

  it("writes one line per item plus a header", () => {
    expect(parseCsv(csv())).toHaveLength(state.items.length + 1);
  });

  it("names the component, subsystem and lot rather than their ids", () => {
    const rows = parseCsv(csv());
    const [lot, subsystem, component] = rows[1];
    expect(lot).toBe("Core scope");
    expect(component).not.toMatch(/^[a-z0-9]{7}$/);
    expect(state.subsystems.map((s) => s.name)).toContain(subsystem);
  });

  it("labels direction only for APIs", () => {
    const rows = parseCsv(csv()).slice(1);
    const idx = { type: 3, direction: 4 };
    for (const r of rows) {
      if (r[idx.type] === "API") expect(["Exposed", "Consumed"]).toContain(r[idx.direction]);
      else expect(r[idx.direction]).toBe("");
    }
  });

  it("shows gross above net wherever mutualisation applied", () => {
    const rows = parseCsv(csv()).slice(1);
    const discounted = rows.filter((r) => Number(r[10]) > Number(r[11]));
    expect(discounted.length).toBeGreaterThan(0);
  });

  it("carries no money column", () => {
    expect(parseCsv(csv())[0].join(" ").toLowerCase()).not.toMatch(/cost|price|rate|eur|€/);
  });

  it("quotes a field containing the separator", () => {
    const s = { ...state, items: [{ ...state.items[0], name: "GET /a; GET /b" }] };
    const p = priceSet(s, s.items);
    const out = exportItemsCsv(s, { daysOf: p.daysOf, grossOf: p.grossOf });
    expect(out).toContain('"GET /a; GET /b"');
    expect(parseCsv(out)[1][5]).toBe("GET /a; GET /b");
  });

  it("round-trips back through the importer", () => {
    const reimported = importItems(parseCsv(csv()), emptyEstimate());
    expect(reimported.report.imported).toBe(state.items.length);
    expect(reimported.report.skipped).toHaveLength(0);
    // The rungs survive, which is what makes the round trip worth anything.
    const levels = reimported.next.items.map((i) => i.level).sort();
    expect(levels).toEqual(state.items.map((i) => i.level).sort());
  });
});

describe("groupBy", () => {
  it("buckets by an arbitrary key and keeps every item", () => {
    const s = demo();
    const byType = groupBy(s.items, (i) => i.type);
    expect([...byType.values()].flat()).toHaveLength(s.items.length);
    expect(byType.get("API").every((i) => i.type === "API")).toBe(true);
  });

  it("returns an empty map for an empty set", () => {
    expect(groupBy([], (i) => i.type).size).toBe(0);
  });
});
