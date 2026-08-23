import { uid } from "../domain/index.js";

/**
 * Every mutation of an estimate, as pure state → state functions. Keeping them
 * out of the components means the rules that matter — an item always belongs to
 * a lot, deleting a component never deletes its work — are testable and stated
 * once.
 */

const withItems = (s, fn) => ({ ...s, items: fn(s.items) });

export const setProject = (s, project) => ({ ...s, project });

export const addSubsystem = (s, name) => {
  const n = (name || "").trim();
  return n ? { ...s, subsystems: [...s.subsystems, { id: uid(), name: n }] } : s;
};
export const updateSubsystem = (s, id, patch) => ({
  ...s,
  subsystems: s.subsystems.map((x) => (x.id === id ? { ...x, ...patch } : x)),
});
/** Deleting a subsystem never deletes components: they simply lose their group. */
export const removeSubsystem = (s, id) => ({
  ...s,
  subsystems: s.subsystems.filter((x) => x.id !== id),
  components: s.components.map((c) => (c.subsystemId === id ? { ...c, subsystemId: null } : c)),
});

export const addComponent = (s, name) => {
  const n = (name || "").trim();
  return n ? { ...s, components: [...s.components, { id: uid(), name: n, subsystemId: null, note: "" }] } : s;
};
export const updateComponent = (s, id, patch) => ({
  ...s,
  components: s.components.map((c) => (c.id === id ? { ...c, ...patch } : c)),
});
/** Deleting a component never deletes its work: the items become unassigned. */
export const removeComponent = (s, id) => ({
  ...s,
  components: s.components.filter((c) => c.id !== id),
  items: s.items.map((i) => (i.componentId === id ? { ...i, componentId: null } : i)),
});

export const addItem = (s, draft) => {
  if (!draft.name?.trim()) return s;
  return withItems(s, (xs) => [
    ...xs,
    {
      id: uid(),
      type: draft.type,
      name: draft.name.trim(),
      componentId: draft.componentId || null,
      level: draft.level || "M",
      qty: draft.qty || 1,
      tags: draft.tags || [],
      note: draft.note || "",
      reviewed: false,
      lotId: draft.lotId || s.lots[0].id,
      confidence: draft.confidence || "M",
      direction: draft.type === "API" ? draft.direction || "EXPOSED" : undefined,
    },
  ]);
};
export const updateItem = (s, id, patch) => withItems(s, (xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
export const removeItem = (s, id) => withItems(s, (xs) => xs.filter((x) => x.id !== id));
export const duplicateItem = (s, id) =>
  withItems(s, (xs) => {
    const src = xs.find((x) => x.id === id);
    return src ? [...xs, { ...src, id: uid(), name: `${src.name} (copy)`, reviewed: false }] : xs;
  });
export const attachItems = (s, ids, componentId) => {
  const set = new Set(ids);
  return withItems(s, (xs) => xs.map((x) => (set.has(x.id) ? { ...x, componentId } : x)));
};
/** A workshop reviews a whole band at a time — a kind of work, or a component. */
export const reviewItems = (s, ids, reviewed) => {
  const set = new Set(ids);
  return withItems(s, (xs) => xs.map((x) => (set.has(x.id) ? { ...x, reviewed } : x)));
};

export const addLot = (s, name) => {
  const n = (name || "").trim();
  return n ? { ...s, lots: [...s.lots, { id: uid(), name: n }] } : s;
};
export const updateLot = (s, id, patch) => ({ ...s, lots: s.lots.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
/** There is always at least one lot, and its items move rather than vanish. */
export const removeLot = (s, id) => {
  if (s.lots.length <= 1) return s;
  const fallback = s.lots.find((l) => l.id !== id).id;
  return {
    ...s,
    lots: s.lots.filter((l) => l.id !== id),
    items: s.items.map((i) => (i.lotId === id ? { ...i, lotId: fallback } : i)),
    scenarios: s.scenarios.map((sc) => ({ ...sc, lotIds: sc.lotIds.filter((x) => x !== id) })),
  };
};

export const addScenario = (s) => {
  const base = s.scenarios.find((x) => x.id === s.baselineId) || s.scenarios[0];
  return { ...s, scenarios: [...s.scenarios, { id: uid(), name: "New scenario", lotIds: [...(base?.lotIds || [])] }] };
};
export const updateScenario = (s, id, patch) => ({
  ...s,
  scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)),
});
export const removeScenario = (s, id) => {
  if (s.scenarios.length <= 1) return s;
  const left = s.scenarios.filter((sc) => sc.id !== id);
  return { ...s, scenarios: left, baselineId: s.baselineId === id ? left[0].id : s.baselineId };
};
export const setBaseline = (s, baselineId) => ({ ...s, baselineId });

export const setScale = (s, key, level, patch) => ({
  ...s,
  scales: { ...s.scales, [key]: { ...s.scales[key], [level]: { ...s.scales[key][level], ...patch } } },
});
export const setSpread = (s, conf, patch) => ({ ...s, spreads: { ...s.spreads, [conf]: { ...s.spreads[conf], ...patch } } });
export const setMut = (s, key, patch) => ({ ...s, mut: { ...s.mut, [key]: { ...s.mut[key], ...patch } } });
export const setLevelLabel = (s, id, label) => ({ ...s, levelLabels: { ...s.levelLabels, [id]: label } });

export const updateRatio = (s, id, patch) => ({ ...s, ratios: s.ratios.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
export const addRatio = (s) => ({
  ...s,
  ratios: [...s.ratios, { id: uid(), label: "New line", pct: 10, basis: "DEV", on: true }],
});
export const removeRatio = (s, id) => ({ ...s, ratios: s.ratios.filter((r) => r.id !== id) });
