import { scaleKeyOf } from "./taxonomy.js";
import { computeDays } from "./mutualisation.js";
import { pertOf } from "./pert.js";
import { applyRatios } from "./ratios.js";

/**
 * Selectors over an estimate. Pure: given the same state and the same scope,
 * these always return the same numbers, which is what makes them testable and
 * what makes an estimate defensible.
 */

/** Days for one unit of an item, straight off the abacus. */
export const unitDaysOf = (scales) => (item) => scales[scaleKeyOf(item)]?.[item.level]?.days ?? 0;

/** Items belonging to a scenario, or all of them when no scenario is active. */
export function itemsInScenario(state, scenarioId) {
  if (!scenarioId || scenarioId === "__all") return state.items;
  const sc = state.scenarios.find((s) => s.id === scenarioId);
  if (!sc) return state.items;
  const lots = new Set(sc.lotIds);
  return state.items.filter((i) => lots.has(i.lotId));
}

/**
 * Price a set of items end to end: mutualisation, three-point range, then the
 * ratio cascade. Mutualisation is resolved over exactly this set, which is why
 * a lot added to a larger scope is cheaper at the margin than priced alone.
 */
export function priceSet(state, list) {
  const unit = unitDaysOf(state.scales);
  const map = computeDays(list, unit, state.mut);
  const daysOf = (it) => map.get(it.id)?.net ?? 0;
  const grossOf = (it) => map.get(it.id)?.gross ?? 0;

  const gross = list.reduce((a, i) => a + grossOf(i), 0);
  const pert = pertOf(list, daysOf, state.spreads);
  const cascade = applyRatios(state.ratios, pert.likely);

  return {
    map,
    daysOf,
    grossOf,
    gross,
    saved: gross - pert.likely,
    pert,
    cascade,
    totalLikely: cascade.total,
    totalExpected: pert.expected * cascade.factor,
    totalP80: pert.p80 * cascade.factor,
  };
}

/** Roll a set up by an arbitrary key, for the cross table and the summaries. */
export function groupBy(list, keyOf) {
  const out = new Map();
  for (const it of list) {
    const k = keyOf(it);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(it);
  }
  return out;
}

/** Elapsed months for a team, the sanity check on any total. */
export const monthsFor = (days, team, daysPerMonth = 18) => (team > 0 ? days / (team * daysPerMonth) : 0);
