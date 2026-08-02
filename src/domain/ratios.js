/**
 * Activities priced as a percentage of development.
 *
 * A line applies either to development (`DEV`) or to the running total (`CUM`).
 * CUM lines compound with everything above them, so ORDER MATTERS: delivery
 * activities sit on development, then management, then the risk buffer last.
 *
 * `factor` is what carries a development figure through to a project figure,
 * and is applied identically to every point of the PERT range.
 *
 * @param {Array<object>} ratios cascade lines, in order
 * @param {number} dev development man-days
 */
export function applyRatios(ratios, dev) {
  let cum = dev;
  const lines = [];
  for (const r of ratios) {
    if (!r.on) {
      lines.push({ ...r, days: 0, base: 0 });
      continue;
    }
    const base = r.basis === "DEV" ? dev : cum;
    const days = (base * (r.pct || 0)) / 100;
    cum += days;
    lines.push({ ...r, days, base });
  }
  return { lines, total: cum, factor: dev ? cum / dev : 1 };
}

/**
 * Turning on a flat risk buffer while the P80 already prices uncertainty means
 * pricing it twice. The interface says so at the moment you do it.
 */
export const RISK_LINE = /buffer|risk|contingen|aléa|alea/i;
export const hasRiskBuffer = (lines) => lines.some((r) => r.on && RISK_LINE.test(r.label));
