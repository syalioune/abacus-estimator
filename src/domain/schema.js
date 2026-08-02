import { CONF, CONF_BY_ID, DIR_BY_ID, DIRS, LEVEL_BY_ID, LEVELS, SCALE_KEYS, TYPE_BY_ID, TYPES } from "./taxonomy.js";
import { DEFAULT_MUT, DEFAULT_RATIOS, DEFAULT_SCALES, DEFAULT_SPREADS } from "./defaults.js";

export const SCHEMA_VERSION = 5;

export const uid = () => Math.random().toString(36).slice(2, 9);

/** A blank estimate. One lot and one scenario, so the tool is usable at once. */
export const emptyEstimate = () => ({
  version: SCHEMA_VERSION,
  project: "New project",
  scales: DEFAULT_SCALES,
  mut: DEFAULT_MUT,
  ratios: DEFAULT_RATIOS,
  spreads: DEFAULT_SPREADS,
  subsystems: [],
  components: [],
  items: [],
  lots: [{ id: "core", name: "Core scope" }],
  scenarios: [{ id: "sc1", name: "Baseline", lotIds: ["core"] }],
  baselineId: "sc1",
  levelLabels: Object.fromEntries(Object.values(LEVEL_BY_ID).map((l) => [l.id, l.label])),
});

/**
 * Bring any stored estimate up to the current schema. Every version bump is
 * handled here so that opening an old file never loses work.
 *
 *  v1 → components were estimable items; lift them into containers.
 *  v2 → no lots, no confidence; default both.
 *  v3 → subsystem was free text on the component; promote to declared entities.
 *       APIs gain a direction and the single API scale becomes API_EXPOSED.
 *  v4 → day rate and currency removed; this tool estimates effort only.
 *  v5 → an item's single free-text tag becomes a list of tags.
 */
export function migrate(raw) {
  const s = { ...emptyEstimate(), ...raw };

  // v1: components carried effort of their own.
  const legacy = (s.items || []).filter((i) => i.type === "COMPONENT");
  if (legacy.length) {
    const known = new Set((s.components || []).map((c) => c.id));
    s.components = [
      ...(s.components || []),
      ...legacy.filter((c) => !known.has(c.id)).map((c) => ({ id: c.id, name: c.name, tag: c.tag || "", note: "" })),
    ];
    s.items = s.items.filter((i) => i.type !== "COMPONENT");
  }

  // v3: subsystem as free text on the component.
  s.subsystems = s.subsystems || [];
  s.components = (s.components || []).map((c) => {
    if (c.subsystemId !== undefined || !c.tag) return { ...c, subsystemId: c.subsystemId ?? null };
    let sub = s.subsystems.find((x) => x.name.toLowerCase() === String(c.tag).toLowerCase());
    if (!sub) {
      sub = { id: uid(), name: c.tag };
      s.subsystems.push(sub);
    }
    return { ...c, subsystemId: sub.id };
  });
  const subIds = new Set(s.subsystems.map((x) => x.id));
  s.components = s.components.map((c) => ({ ...c, subsystemId: subIds.has(c.subsystemId) ? c.subsystemId : null }));

  // v2: lots and confidence.
  s.lots = s.lots?.length ? s.lots : [{ id: "core", name: "Core scope" }];
  const lotIds = new Set(s.lots.map((l) => l.id));
  s.items = (s.items || [])
    .filter((i) => TYPE_BY_ID[i.type])
    .map(({ tag, ...i }) => ({
      ...i,
      lotId: lotIds.has(i.lotId) ? i.lotId : s.lots[0].id,
      level: LEVEL_BY_ID[i.level] ? i.level : "M",
      qty: Number.isFinite(i.qty) && i.qty > 0 ? i.qty : 1,
      confidence: CONF_BY_ID[i.confidence] ? i.confidence : "M",
      direction: i.type === "API" ? (DIR_BY_ID[i.direction] ? i.direction : "EXPOSED") : undefined,
      // v5: a single free-text tag becomes a list of tags.
      tags: Array.isArray(i.tags) ? i.tags : tag ? [String(tag)] : [],
    }));

  s.scenarios = s.scenarios?.length
    ? s.scenarios.map((sc) => ({ ...sc, lotIds: (sc.lotIds || []).filter((id) => lotIds.has(id)) }))
    : [{ id: "sc1", name: "Baseline", lotIds: [s.lots[0].id] }];
  s.baselineId = s.scenarios.some((sc) => sc.id === s.baselineId) ? s.baselineId : s.scenarios[0].id;

  s.spreads = {
    H: s.spreads?.H || DEFAULT_SPREADS.H,
    M: s.spreads?.M || DEFAULT_SPREADS.M,
    L: s.spreads?.L || DEFAULT_SPREADS.L,
  };

  // v3: one API scale became two.
  const oldApi = s.scales?.API;
  s.scales = Object.fromEntries(
    SCALE_KEYS.map(({ key }) => [key, s.scales?.[key] || (key === "API_EXPOSED" && oldApi) || DEFAULT_SCALES[key]]),
  );
  s.mut = Object.fromEntries(SCALE_KEYS.map(({ key }) => [key, { ...DEFAULT_MUT[key], ...(s.mut?.[key] || {}) }]));

  // v4: this tool estimates effort, not money.
  delete s.rate;
  delete s.currency;

  s.version = SCHEMA_VERSION;
  return s;
}

/** The abacus alone: rungs, spreads, mutualisation policy, ratio cascade and
 * rung labels. None of it references a specific item, component or lot, so
 * it is portable between estimates on its own. */
export const ABACUS_KEYS = ["scales", "spreads", "mut", "ratios", "levelLabels"];

export const pickAbacus = (state) => Object.fromEntries(ABACUS_KEYS.map((k) => [k, state[k]]));

/** Merge an imported abacus into an estimate. A key missing from the file is
 * left as it is — a partial export (spreads only, say) never blanks the rest. */
export const applyAbacus = (state, abacus) => ({
  ...state,
  ...Object.fromEntries(ABACUS_KEYS.filter((k) => abacus?.[k] !== undefined).map((k) => [k, abacus[k]])),
});

/**
 * A JSON Schema (draft-07) for the estimate file this tool reads and writes.
 * Built from the same taxonomy the app validates against, so it can never
 * drift from what the app actually accepts — hand this to an AI agent and it
 * has the exact vocabulary, not a guess at it.
 */
export function estimateJsonSchema() {
  const levelIds = LEVELS.map((l) => l.id);
  const typeIds = TYPES.map((t) => t.id);
  const confIds = CONF.map((c) => c.id);
  const dirIds = DIRS.map((d) => d.id);
  const scaleKeys = SCALE_KEYS.map((s) => s.key);

  const rung = {
    type: "object",
    required: ["days", "why"],
    properties: {
      days: { type: "number", minimum: 0, description: "Man-days for one unit at this rung." },
      why: { type: "string", description: 'Falsifiable rationale — "fairly involved" does not qualify.' },
    },
  };
  const scaleTable = {
    type: "object",
    required: levelIds,
    properties: Object.fromEntries(levelIds.map((id) => [id, rung])),
    additionalProperties: false,
  };
  const spread = {
    type: "object",
    required: ["min", "max", "why"],
    properties: {
      min: { type: "number", description: "Multiplier on the rung's days, optimistic end." },
      max: { type: "number", description: "Multiplier on the rung's days, pessimistic end." },
      why: { type: "string" },
    },
  };
  const mutPolicy = {
    type: "object",
    required: ["on", "pct", "free", "by"],
    properties: {
      on: { type: "boolean" },
      pct: { type: "number", minimum: 0, maximum: 100, description: "Discount applied past the free allowance." },
      free: { type: "number", minimum: 0, description: "Units in a pool that pay full price before the discount starts." },
      by: {
        type: "string",
        description: '"level" pools same-rung items separately; any other value pools the whole scale together.',
      },
    },
  };
  const ratio = {
    type: "object",
    required: ["id", "label", "pct", "basis", "on"],
    properties: {
      id: { type: "string" },
      label: { type: "string" },
      pct: { type: "number" },
      basis: {
        type: "string",
        enum: ["DEV", "CUM"],
        description: "DEV applies to development days; CUM applies to the running total, compounding on the lines above it.",
      },
      on: { type: "boolean" },
    },
  };
  const item = {
    type: "object",
    required: ["id", "type", "name", "level", "confidence", "qty", "lotId"],
    properties: {
      id: { type: "string" },
      type: { type: "string", enum: typeIds, description: "The five kinds of work." },
      name: { type: "string" },
      componentId: { type: ["string", "null"], description: "Null means unassigned." },
      lotId: { type: "string" },
      level: { type: "string", enum: levelIds, description: "The chosen rung." },
      confidence: { type: "string", enum: confIds, description: "Sets min/max only — it never moves the mean." },
      qty: { type: "number", minimum: 1 },
      direction: { type: "string", enum: dirIds, description: "APIs only: exposed (you own the contract) or consumed." },
      tags: { type: "array", items: { type: "string" } },
      note: { type: "string", description: "Rationale for why this item sits at this level." },
      reviewed: { type: "boolean", description: "Workshop review marker." },
    },
    additionalProperties: false,
  };

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Abacus estimate",
    description:
      "The full state of an Abacus estimation — effort only, never money, never a day rate. " +
      "Generated from the tool's own vocabulary, so it always matches what the app accepts.",
    type: "object",
    required: [
      "version",
      "project",
      "scales",
      "spreads",
      "mut",
      "ratios",
      "subsystems",
      "components",
      "items",
      "lots",
      "scenarios",
      "baselineId",
      "levelLabels",
    ],
    properties: {
      version: { const: SCHEMA_VERSION },
      project: { type: "string" },
      scales: {
        type: "object",
        required: scaleKeys,
        properties: Object.fromEntries(scaleKeys.map((k) => [k, scaleTable])),
        additionalProperties: false,
        description: "One rung table per scale key — APIs carry one scale per direction, not one scale with a coefficient.",
      },
      spreads: {
        type: "object",
        required: confIds,
        properties: Object.fromEntries(confIds.map((k) => [k, spread])),
        additionalProperties: false,
      },
      mut: {
        type: "object",
        required: scaleKeys,
        properties: Object.fromEntries(scaleKeys.map((k) => [k, mutPolicy])),
        additionalProperties: false,
        description: "A property of the set: resolved once over a scenario, never re-derived per filtered view.",
      },
      ratios: { type: "array", items: ratio, description: "Order matters: a CUM line compounds on every line above it." },
      subsystems: {
        type: "array",
        items: { type: "object", required: ["id", "name"], properties: { id: { type: "string" }, name: { type: "string" } } },
      },
      components: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            subsystemId: { type: ["string", "null"] },
            note: { type: "string" },
          },
          description: "A component carries no effort of its own — it totals what is attached to it.",
        },
      },
      items: { type: "array", items: item },
      lots: {
        type: "array",
        items: { type: "object", required: ["id", "name"], properties: { id: { type: "string" }, name: { type: "string" } } },
      },
      scenarios: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "name", "lotIds"],
          properties: { id: { type: "string" }, name: { type: "string" }, lotIds: { type: "array", items: { type: "string" } } },
        },
        description: "A scenario is a selection of lots — priced once, reused in every combination.",
      },
      baselineId: { type: "string", description: "Must match the id of one of the scenarios." },
      levelLabels: {
        type: "object",
        required: levelIds,
        properties: Object.fromEntries(levelIds.map((id) => [id, { type: "string" }])),
        additionalProperties: false,
        description: "Display name per rung. The ladder shows these words, never the day count.",
      },
    },
    additionalProperties: false,
  };
}
