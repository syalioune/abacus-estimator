/** P80 and P90 z-scores for a normal distribution. */
export const Z_P80 = 0.8416;
export const Z_P90 = 1.2816;

/**
 * Three-point estimate over a set of items.
 *
 * Each item is three numbers, not one. The abacus gives the most likely value
 * `m`; confidence gives min and max as multipliers of it. Confidence never
 * moves `m` — it only says how wrong `m` could be.
 *
 *   min = m × spread.min      max = m × spread.max
 *   E   = (min + 4m + max) / 6
 *   σ   = (max − min) / 6
 *
 * E sits above m whenever the spread is asymmetric, which it is by default:
 * work overruns more readily than it underruns.
 *
 * At set level the expected values add, but the VARIANCES add — not the
 * deviations. σ_total = √(Σσ²). That square root is why many small uncertain
 * items are more predictable than three big ones, and why a combined scenario
 * has a lower P80 than the sum of its parts' P80s.
 *
 * Caveat, stated where it belongs: variances are summed as if items were
 * independent. One unknown driving ten items breaks that. Model such an unknown
 * as its own low-confidence item, or keep an explicit risk line for it.
 *
 * @param {Array<object>} list items in scope
 * @param {(item: object) => number} daysOf effective (post-mutualisation) days
 * @param {object} spreads confidence multipliers keyed by confidence id
 */
export function pertOf(list, daysOf, spreads) {
  let likely = 0;
  let expected = 0;
  let variance = 0;
  let min = 0;
  let max = 0;

  for (const it of list) {
    const m = daysOf(it);
    const s = spreads[it.confidence] || spreads.M;
    const lo = m * s.min;
    const hi = m * s.max;
    likely += m;
    min += lo;
    max += hi;
    expected += (lo + 4 * m + hi) / 6;
    const sd = (hi - lo) / 6;
    variance += sd * sd;
  }

  const sd = Math.sqrt(variance);
  return { likely, expected, sd, min, max, p80: expected + Z_P80 * sd, p90: expected + Z_P90 * sd };
}
