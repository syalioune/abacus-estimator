import React from "react";
import { CONF, LEVELS, SCALE_KEYS, scaleKeyOf } from "../../domain/index.js";
import { Btn, Eyebrow, NumInput, Select } from "../../ui/primitives.jsx";
import { Ladder } from "../../ui/estimating.jsx";
import { fmt } from "../../ui/format.js";

export function Abacus({
  scales,
  spreads,
  mut,
  levelLabels,
  items,
  sum,
  grossOf,
  onScale,
  onSpread,
  onMut,
  onLevelLabel,
  onReset,
}) {
  return (
    <section>
      <Eyebrow right={<Btn onClick={onReset}>Restore defaults</Btn>}>Abacus — days per complexity level</Eyebrow>
      <p className="prose" style={{ maxWidth: 720, marginBottom: "var(--space-6)" }}>
        One scale per type of work. The rationale is what you read out loud during the estimation workshop: it decides the level,
        the level decides the days. Keep each rationale falsifiable, so two architects sizing the same item land on the same
        segment.
      </p>

      <div
        className="panel"
        style={{
          marginBottom: "var(--space-6)",
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          alignItems: "center",
          padding: "var(--space-3) var(--gutter)",
        }}
      >
        <span className="mono-lbl">Level names</span>
        {LEVELS.map((l) => (
          <input
            key={l.id}
            value={levelLabels[l.id] ?? l.label}
            onChange={(e) => onLevelLabel(l.id, e.target.value)}
            className="mini"
            style={{ width: 128 }}
          />
        ))}
      </div>

      <div className="panel" style={{ marginBottom: "var(--space-7)" }}>
        <div
          style={{
            borderBottom: "var(--rule-hair)",
            background: "var(--surface-subgroup)",
            padding: "var(--space-3) var(--gutter)",
          }}
        >
          <h3 className="ttl" style={{ fontSize: "var(--text-subtitle)" }}>
            Confidence
          </h3>
          <p className="sm">
            How far the number can move, as a multiplier of the abacus value. Confidence never changes the most likely figure,
            only the width of the range around it — which is what feeds the three-point estimate on the Effort tab. Note that a
            wider spread raises the expected value too, because the upside is longer than the downside.
          </p>
        </div>
        <table className="tbl">
          <thead>
            <tr className="hdrow">
              <th className="l" style={{ width: 128 }}>
                Level
              </th>
              <th className="r" style={{ width: 84 }}>
                Min ×
              </th>
              <th className="r" style={{ width: 84 }}>
                Max ×
              </th>
              <th className="l">When to pick it</th>
              <th className="r" style={{ width: 176 }}>
                On a 10 md item
              </th>
              <th className="r" style={{ width: 64 }}>
                Used
              </th>
            </tr>
          </thead>
          <tbody>
            {CONF.map((c) => (
              <tr key={c.id} style={{ verticalAlign: "top" }}>
                <td>
                  <span className={"pill " + c.id}>{c.label}</span>
                </td>
                <td className="r">
                  <NumInput value={spreads[c.id].min} onChange={(v) => onSpread(c.id, { min: v })} width={40} />
                </td>
                <td className="r">
                  <NumInput value={spreads[c.id].max} onChange={(v) => onSpread(c.id, { max: v })} width={40} />
                </td>
                <td>
                  <textarea
                    value={spreads[c.id].why}
                    onChange={(e) => onSpread(c.id, { why: e.target.value })}
                    rows={2}
                    className="why"
                  />
                </td>
                <td className="r sm">
                  {fmt(10 * spreads[c.id].min)}–{fmt(10 * spreads[c.id].max)} md
                  {/* min = max is a point estimate: σ is zero, so the P80 of a
                      project made only of this level equals its likely figure. */}
                  {spreads[c.id].min === spreads[c.id].max ? (
                    <div style={{ color: "var(--conf-med-fg)" }}>No range: σ 0, P80 = likely</div>
                  ) : (
                    <div className="tert">
                      E {fmt((10 * spreads[c.id].min + 40 + 10 * spreads[c.id].max) / 6)} · σ{" "}
                      {fmt((10 * spreads[c.id].max - 10 * spreads[c.id].min) / 6)}
                    </div>
                  )}
                </td>
                <td className="r sm">{items.filter((i) => i.confidence === c.id).length || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginBottom: "var(--space-7)" }}>
        <div
          style={{
            borderBottom: "var(--rule-hair)",
            background: "var(--surface-subgroup)",
            padding: "var(--space-3) var(--gutter)",
          }}
        >
          <h3 className="ttl" style={{ fontSize: "var(--text-subtitle)" }}>
            Mutualisation
          </h3>
          <p className="sm">
            Unit effort assumes every item is built from nothing. Once a design system or a shared pipeline exists, the third
            table-with-pagination screen is not a third full screen. The first items of a pool pay full price and build the shared
            parts, the rest are discounted.
          </p>
        </div>
        <table className="tbl">
          <thead>
            <tr className="hdrow">
              <th className="l">Scale</th>
              <th className="r" style={{ width: 84 }}>
                Full price
              </th>
              <th className="r" style={{ width: 84 }}>
                Discount
              </th>
              <th className="l" style={{ width: 160 }}>
                Pooled by
              </th>
              <th className="r" style={{ width: 176 }}>
                Gross → net
              </th>
            </tr>
          </thead>
          <tbody>
            {SCALE_KEYS.map(({ key, label }) => {
              const m = mut[key];
              const used = items.filter((i) => scaleKeyOf(i) === key);
              const gross = used.reduce((a, i) => a + grossOf(i), 0);
              const net = sum(used);
              return (
                <tr key={key} style={{ opacity: m.on ? 1 : 0.45 }}>
                  <td>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={m.on}
                        onChange={(e) => onMut(key, { on: e.target.checked })}
                        style={{ accentColor: "var(--color-accent)" }}
                      />
                      {label}
                    </label>
                  </td>
                  <td className="r">
                    <NumInput value={m.free} onChange={(v) => onMut(key, { free: Math.round(v) })} suffix="first" />
                  </td>
                  <td className="r">
                    <NumInput value={m.pct} onChange={(v) => onMut(key, { pct: v })} suffix="%" />
                  </td>
                  <td>
                    <Select value={m.by} onChange={(v) => onMut(key, { by: v })} style={{ width: "100%" }}>
                      <option value="level">Complexity level</option>
                      <option value="all">Whole scale</option>
                    </Select>
                  </td>
                  <td className="r">
                    {fmt(gross)} → {fmt(net)} md
                    {gross > net && (
                      <span className="commit" style={{ marginLeft: 4, fontSize: "var(--text-label)" }}>
                        −{Math.round(((gross - net) / gross) * 100)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="sm" style={{ borderTop: "var(--rule-hair)", padding: "var(--space-2) var(--gutter)", margin: 0 }}>
          Pooled by complexity level is the safe default: two medium screens reuse each other, a medium screen and an outstanding
          one do not. Within a pool the most expensive items pay full price first, since the hard screen is the one that creates
          the shared components. The design system itself is not free — declare it as its own feature.
        </p>
      </div>

      <div className="space-y-8">
        {SCALE_KEYS.map((t) => {
          const used = items.filter((i) => scaleKeyOf(i) === t.key);
          return (
            <div key={t.key} className="panel">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                  borderBottom: "var(--rule-hair)",
                  background: "var(--surface-subgroup)",
                  padding: "var(--space-3) var(--gutter)",
                }}
              >
                <div>
                  <h3 className="ttl" style={{ fontSize: "var(--text-subtitle)" }}>
                    {t.label}
                  </h3>
                  <p className="sm">{t.hint}</p>
                </div>
                <span className="mono-lbl num">
                  {used.length} items · {fmt(sum(used))} md
                </span>
              </div>
              <div className="p-3">
                <Ladder scale={scales[t.key]} labels={levelLabels} showDays />
                <table className="tbl" style={{ marginTop: "var(--space-3)" }}>
                  <tbody>
                    {LEVELS.map((l) => {
                      const n = used.filter((i) => i.level === l.id).length;
                      return (
                        <tr key={l.id} style={{ verticalAlign: "top" }}>
                          <td style={{ width: 160 }}>
                            <span className="tag tag-outline">{levelLabels[l.id] ?? l.label}</span>
                          </td>
                          <td className="r" style={{ width: 96 }}>
                            <NumInput
                              value={scales[t.key][l.id].days}
                              onChange={(v) => onScale(t.key, l.id, { days: v })}
                              width={48}
                              suffix="md"
                            />
                          </td>
                          <td>
                            <textarea
                              value={scales[t.key][l.id].why}
                              onChange={(e) => onScale(t.key, l.id, { why: e.target.value })}
                              rows={2}
                              className="why"
                            />
                          </td>
                          <td className="r sm">{n ? `${n}×` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Cross table
 * ------------------------------------------------------------------ */

/* Heat is ink, never accent. A big cell is not a warning; it is a big cell. */
