import { describe, expect, it } from "vitest";
import { LEVELS, SCALE_KEYS, TYPE_BY_ID } from "../src/domain/taxonomy.js";
import { DEFAULT_SCALES } from "../src/domain/defaults.js";

/** The vocabulary is the contract the rooms and the CSV both resolve against. */
describe("kinds of work", () => {
  it("treats an asynchronous event as a flow, not as an API", () => {
    const flowHint = SCALE_KEYS.find((s) => s.key === "FLOW").hint;
    expect(TYPE_BY_ID.FLOW.hint).toMatch(/asynchronous event/i);
    expect(flowHint).toMatch(/asynchronous event/i);
  });

  it("sizes an event stream on every rung of the flow ladder, not only the top one", () => {
    // A ladder whose events only appear at "Very complex" pushes every topic to
    // the wrong rung; the whole ladder has to speak about them.
    const rungs = LEVELS.map((l) => DEFAULT_SCALES.FLOW[l.id].why);
    expect(rungs.filter((why) => /event|topic|queue|broker|backbone/i.test(why))).toHaveLength(LEVELS.length);
  });

  it("gives every rung of every ladder a rationale to argue with", () => {
    for (const { key } of SCALE_KEYS) {
      for (const l of LEVELS) {
        expect(DEFAULT_SCALES[key][l.id].why.length).toBeGreaterThan(40);
      }
    }
  });
});
