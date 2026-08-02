import { describe, expect, it } from "vitest";
import { exportItemsCsv, importItems, parseCsv, templateCsv } from "../src/domain/csv.js";
import { emptyEstimate } from "../src/domain/schema.js";

const base = () => emptyEstimate();

describe("parseCsv", () => {
  it("sniffs the separator", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("honours quoted fields containing the separator", () => {
    const rows = parseCsv('a;b\n"x; y";2');
    expect(rows[1][0]).toBe("x; y");
  });

  it("honours doubled quotes", () => {
    expect(parseCsv('a\n"say ""hi"""')[1][0]).toBe('say "hi"');
  });

  it("strips a BOM and tolerates CRLF", () => {
    expect(parseCsv("\uFEFFa;b\r\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a;b\n\n1;2\n")).toHaveLength(2);
  });
});

describe("importItems", () => {
  it("refuses a file without name and type columns", () => {
    expect(importItems(parseCsv("foo;bar\n1;2"), base()).error).toMatch(/Name column/);
  });

  it("imports with only the required columns and sensible defaults", () => {
    const res = importItems(parseCsv("name,type\nGET /products,api\nCustomer list,screen"), base());
    expect(res.report.imported).toBe(2);
    expect(res.next.items[0]).toMatchObject({ type: "API", level: "M", confidence: "M", qty: 1, direction: "EXPOSED" });
    expect(res.next.items[1].type).toBe("GUI");
  });

  it("creates the subsystems, components and lots the file names", () => {
    const csv = [
      "Lot;Subsystem;Component;Type;Direction;Name;Complexity;Confidence;Qty",
      "Option A;Data;analytics;Batch;;Nightly rollup;Very complex;Medium;2",
    ].join("\n");
    const res = importItems(parseCsv(csv), base());
    expect(res.report.created).toMatchObject({ components: 1, subsystems: 1, lots: 1 });
    expect(res.next.items[0]).toMatchObject({ type: "BATCH", level: "V", qty: 2 });
  });

  it("reads French values", () => {
    const csv = "Type;Name;Complexity;Confidence\nFlux;Export comptable;Complexe;Faible\nÉcran;Liste;Moyen;Haute";
    const res = importItems(parseCsv(csv), base());
    expect(res.next.items.map((i) => [i.type, i.level, i.confidence])).toEqual([
      ["FLOW", "C", "L"],
      ["GUI", "M", "H"],
    ]);
  });

  it("distinguishes a consumed interface", () => {
    const res = importItems(parseCsv("Type;Direction;Name\nAPI;Consommé;Payment provider"), base());
    expect(res.next.items[0].direction).toBe("CONSUMED");
  });

  it("skips bad rows individually and says why", () => {
    const csv = "Type;Name;Complexity\nWidget;Broken;Medium\nAPI;;Medium\nAPI;Fine;Medium";
    const res = importItems(parseCsv(csv), base());
    expect(res.report.imported).toBe(1);
    expect(res.report.skipped).toHaveLength(2);
    expect(res.report.skipped[0]).toMatch(/line 2/);
    expect(res.report.skipped[1]).toMatch(/line 3: no name/);
  });

  it("reuses an existing component rather than duplicating it", () => {
    const state = importItems(parseCsv("Component;Type;Name\nsvc;API;a"), base()).next;
    const again = importItems(parseCsv("Component;Type;Name\nsvc;API;b"), state).next;
    expect(again.components).toHaveLength(1);
    expect(again.items).toHaveLength(2);
  });

  it("ignores day counts in the file, because the abacus owns them", () => {
    const res = importItems(parseCsv("Type;Name;Days;Cost\nAPI;x;999;12345"), base());
    expect(res.next.items[0].days).toBeUndefined();
    expect(JSON.stringify(res.next.items[0])).not.toContain("999");
  });

  it("adds to the current estimate rather than replacing it", () => {
    const first = importItems(parseCsv("Type;Name\nAPI;a"), base()).next;
    const second = importItems(parseCsv("Type;Name\nAPI;b"), first).next;
    expect(second.items).toHaveLength(2);
  });

  it("ships a template that imports cleanly", () => {
    const res = importItems(parseCsv(templateCsv()), base());
    expect(res.report.imported).toBe(3);
    expect(res.report.skipped).toHaveLength(0);
  });
});

describe("exportItemsCsv", () => {
  it("round-trips the rationale note through export and re-import", () => {
    const imported = importItems(parseCsv("Type;Name\nAPI;Checkout"), base()).next;
    const withNote = { ...imported, items: [{ ...imported.items[0], note: "Legacy contract to hold" }] };
    const csv = exportItemsCsv(withNote, { daysOf: () => 1, grossOf: () => 1 });
    expect(csv).toContain("Legacy contract to hold");

    const reimported = importItems(parseCsv(csv), base());
    expect(reimported.next.items[0].note).toBe("Legacy contract to hold");
  });
});
