import { scaleKeyOf } from "./taxonomy.js";

/**
 * Effective days per item, once mutualisation is applied over a given set.
 *
 * Unit effort assumes every item is built from nothing. Once a design system or
 * a shared pipeline exists, the third table-with-pagination screen is not a
 * third full screen: the first few items of a pool pay full price and build the
 * shared parts, the rest are discounted.
 *
 * Within a pool the most expensive items pay full price first — the hard screen
 * is the one that creates the shared components, not the third easy one.
 *
 * This is a property of the SET, not of the item. Resolve it once over the whole
 * scenario; filtering a view afterwards must never re-price what is left.
 *
 * @param {Array<object>} list items in scope
 * @param {(item: object) => number} unitDays days for one unit of an item
 * @param {object} mut policy per scale key: { on, pct, free, by }
 * @returns {Map<string, {per:number, gross:number, net:number, saved:number, discounted:number}>}
 */
export function computeDays(list, unitDays, mut) {
  const map = new Map();
  const pools = new Map();

  for (const it of list) {
    const key = scaleKeyOf(it);
    const policy = mut?.[key];
    const per = unitDays(it);
    const qty = it.qty || 0;
    if (!policy?.on || !(policy.pct > 0)) {
      map.set(it.id, { per, gross: per * qty, net: per * qty, saved: 0, discounted: 0 });
      continue;
    }
    const pool = policy.by === "level" ? `${key}|${it.level}` : key;
    if (!pools.has(pool)) pools.set(pool, []);
    pools.get(pool).push(it);
  }

  for (const [, arr] of pools) {
    const policy = mut[scaleKeyOf(arr[0])];
    // Deterministic: most expensive first, id as tiebreak so the result does
    // not depend on backlog order.
    arr.sort((a, b) => unitDays(b) - unitDays(a) || String(a.id).localeCompare(String(b.id)));
    let free = Math.max(0, policy.free || 0);
    for (const it of arr) {
      const per = unitDays(it);
      const qty = it.qty || 0;
      const fullUnits = Math.min(qty, free);
      free -= fullUnits;
      const discUnits = qty - fullUnits;
      const gross = per * qty;
      const net = per * fullUnits + per * discUnits * (1 - policy.pct / 100);
      map.set(it.id, { per, gross, net, saved: gross - net, discounted: discUnits });
    }
  }

  return map;
}
