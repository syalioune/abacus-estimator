import React, { useState } from "react";
import { CONF_BY_ID, TYPES } from "../../domain/index.js";
import { Btn, Cell, Eyebrow, Chip, MiniBtn, NumInput, Select } from "../../ui/primitives.jsx";
import { PertCurve, RangeBar } from "../../ui/estimating.jsx";
import { IconPlus, IconTrash } from "../../ui/icons.jsx";
import { fmt } from "../../ui/format.js";

export function Effort({
  scopeItems,
  components,
  compName,
  sum,
  scopeDays,
  scopeGross,
  scopePert,
  spreads,
  ratioLines,
  scoped,
  setScoped,
  filterActive,
  onRatio,
  onAddRatio,
  onDelRatio,
}) {
  const [team, setTeam] = useState(4);
  const [split, setSplit] = useState("type");

  const rows =
    split === "type"
      ? TYPES.map((t) => {
          const list = scopeItems.filter((i) => i.type === t.id);
          return { key: t.id, label: t.plural, n: list.length, days: sum(list) };
        })
      : [
          ...components.map((c) => ({ c, list: scopeItems.filter((i) => i.componentId === c.id) })),
          { c: null, list: scopeItems.filter((i) => !i.componentId) },
        ]
          .filter((g) => g.list.length)
          .map((g) => ({
            key: g.c?.id ?? "__none",
            label: g.c ? compName[g.c.id] : "Unassigned",
            n: g.list.length,
            days: sum(g.list),
          }));

  const otherDays = ratioLines.total - scopeDays;
  const months = team > 0 ? ratioLines.total / (team * 18) : 0;
  const bufferOn = ratioLines.lines.some((r) => r.on && /buffer|risk|contingen|aléa|alea/i.test(r.label));

  /* Five identical figures are not a range, and the reason is always the same:
     the confidence levels in scope carry min = max, so σ is zero. Say it here,
     where the reader is looking at the collapsed table. */
  const flatConf = Array.from(new Set(scopeItems.map((i) => i.confidence)))
    .map((id) => ({ id, sp: spreads[id] || spreads.M }))
    .filter(({ sp }) => sp.min === sp.max);
  const flatRange = scopeDays > 0 && scopePert.max - scopePert.min < 1e-9;
  const noDays = scopeItems.length > 0 && scopeDays === 0;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--gutter)" }}>
      <div>
        <Eyebrow
          right={
            <div style={{ display: "flex", gap: 3 }}>
              <Chip on={split === "type"} onClick={() => setSplit("type")}>
                By type
              </Chip>
              <Chip on={split === "component"} onClick={() => setSplit("component")}>
                By component
              </Chip>
            </div>
          }
        >
          Development effort
        </Eyebrow>
        <table className="tbl panel">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="mono-lbl">{r.label}</td>
                <td className="r sm">{r.n}</td>
                <td style={{ width: "50%" }}>
                  <div style={{ height: 8, background: "var(--range-track)" }}>
                    <div
                      style={{
                        height: 8,
                        background: "var(--color-text)",
                        width: `${scopeDays ? (r.days / scopeDays) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="r">{fmt(r.days)} md</td>
              </tr>
            ))}
            {scopeGross > scopeDays && (
              <tr className="sm">
                <td colSpan={3} className="mono-lbl">
                  Mutualisation, already deducted above
                </td>
                <td className="r commit">−{fmt(scopeGross - scopeDays)} md</td>
              </tr>
            )}
            <tr className="totrow">
              <td colSpan={3} className="mono-lbl">
                Development
                {scopeGross > scopeDays ? `, net of ${Math.round(((scopeGross - scopeDays) / scopeGross) * 100)}%` : ""}
              </td>
              <td className="r commit">{fmt(scopeDays)} md</td>
            </tr>
          </tbody>
        </table>

        <label className="sm" style={{ marginTop: "var(--space-3)", display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={scoped}
            onChange={(e) => setScoped(e.target.checked)}
            style={{ accentColor: "var(--color-accent)" }}
          />
          Estimate the filtered scope only
          {!filterActive && <span className="mono-lbl">no filter set</span>}
        </label>

        <div className="panel" style={{ marginTop: "var(--space-6)", padding: "var(--space-4) var(--gutter)" }}>
          <div className="mono-lbl">Elapsed time check</div>
          <p className="prose" style={{ margin: 0 }}>
            With <NumInput value={team} onChange={setTeam} min={1} /> people at 18 productive days per month, the project runs
            about{" "}
            <span className="num" style={{ fontWeight: 600 }}>
              {months.toFixed(1)} months
            </span>
            . If that clashes with the target date, the answer is scope or parallelism, not a smaller abacus.
          </p>
        </div>
      </div>

      <div>
        <Eyebrow
          right={
            <Btn icon={<IconPlus />} onClick={onAddRatio}>
              Add line
            </Btn>
          }
        >
          Ratios on top of development
        </Eyebrow>
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr className="hdrow">
                <th className="l">Activity</th>
                <th className="r" style={{ width: 64 }}>
                  %
                </th>
                <th className="l" style={{ width: 128 }}>
                  Applied to
                </th>
                <th className="r" style={{ width: 84 }}>
                  Days
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "var(--surface-subgroup)" }}>
                <td className="mono-lbl">Development</td>
                <td colSpan={2} />
                <td className="r">{fmt(scopeDays)}</td>
                <td />
              </tr>
              {ratioLines.lines.map((r) => (
                <tr key={r.id} style={{ opacity: r.on ? 1 : 0.45 }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={r.on}
                        onChange={(e) => onRatio(r.id, { on: e.target.checked })}
                        style={{ accentColor: "var(--color-accent)" }}
                      />
                      <input value={r.label} onChange={(e) => onRatio(r.id, { label: e.target.value })} className="mini" />
                    </div>
                  </td>
                  <td className="r">
                    <NumInput value={r.pct} onChange={(v) => onRatio(r.id, { pct: v })} width={40} suffix="%" />
                  </td>
                  <td>
                    <Select value={r.basis} onChange={(v) => onRatio(r.id, { basis: v })} style={{ width: "100%" }}>
                      <option value="DEV">Development</option>
                      <option value="CUM">Running total</option>
                    </Select>
                  </td>
                  <td className="r">{fmt(r.days)}</td>
                  <td className="r">
                    <MiniBtn danger icon={<IconTrash />} title="Delete line" onClick={() => onDelRatio(r.id)}>
                      del
                    </MiniBtn>
                  </td>
                </tr>
              ))}
              <tr className="totrow">
                <td className="mono-lbl">Project total</td>
                <td colSpan={2} className="r sm">
                  {scopeDays ? `+${Math.round((otherDays / scopeDays) * 100)}%` : ""}
                </td>
                <td className="r commit">{fmt(ratioLines.total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: "var(--space-4)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            background: "var(--color-divider)",
            border: "1px solid var(--color-divider)",
          }}
        >
          <Cell label="Total, likely" v={`${fmt(ratioLines.total)} md`} />
          <Cell label="Total, expected" v={`${fmt(scopePert.expected * ratioLines.factor)} md`} />
          <Cell label="Total, P80" v={`${fmt(scopePert.p80 * ratioLines.factor)} md`} strong />
        </div>

        <div className="panel" style={{ marginTop: "var(--space-4)", padding: "var(--space-4) var(--gutter)" }}>
          <div className="mono-lbl">Range, three-point</div>
          <RangeBar pert={scopePert} factor={ratioLines.factor} />
          <table className="tbl" style={{ marginTop: "var(--space-3)" }}>
            <tbody>
              {[
                [
                  "Optimistic, every item at its min",
                  scopePert.min,
                  "Only defensible if nothing surprises you. Do not commit to it.",
                ],
                ["Most likely, the abacus read straight", scopePert.likely, "What the sum of the levels says."],
                [
                  "Expected, PERT weighted mean",
                  scopePert.expected,
                  "Pulled up by the low-confidence items, since their upside is wider than their downside.",
                ],
                ["P80, four times out of five", scopePert.p80, "The number to commit to externally."],
                [
                  "Pessimistic, every item at its max",
                  scopePert.max,
                  "Everything goes wrong at once. Useful as a ceiling, not as a plan.",
                ],
              ].map(([label, days, note]) => (
                <tr key={label} style={{ verticalAlign: "baseline" }}>
                  <td style={{ paddingRight: 12 }}>
                    {label}
                    <div className="sm tert">{note}</div>
                  </td>
                  <td className="r" style={{ width: 96 }}>
                    {fmt(days * ratioLines.factor)} md
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sm" style={{ marginTop: "var(--space-3)" }}>
            Development figures carried through the same ratio factor of ×{ratioLines.factor.toFixed(2)}, so the range covers the
            whole project and not just the build.
          </p>
          {noDays && (
            <p
              className="sm"
              style={{ marginTop: 8, borderLeft: "3px solid var(--conf-med-bd)", paddingLeft: 10, color: "var(--conf-med-fg)" }}
            >
              Every figure is zero because the rungs these {scopeItems.length} items sit on are worth 0 md. Set the days per rung
              in the Abacus room before reading anything here.
            </p>
          )}
          {flatRange && (
            <p
              className="sm"
              style={{ marginTop: 8, borderLeft: "3px solid var(--conf-med-bd)", paddingLeft: 10, color: "var(--conf-med-fg)" }}
            >
              All five figures are the same because every confidence level in scope carries min = max
              {flatConf.length ? ` (${flatConf.map((c) => `${CONF_BY_ID[c.id]?.label ?? c.id} ×${c.sp.min}`).join(", ")})` : ""},
              so σ is zero and there is nothing for the P80 to add. Widen the multipliers in the Abacus room — even high
              confidence is a range, not a promise.
            </p>
          )}
          {bufferOn && (
            <p
              className="sm"
              style={{ marginTop: 8, borderLeft: "3px solid var(--conf-med-bd)", paddingLeft: 10, color: "var(--conf-med-fg)" }}
            >
              A risk buffer line is active while the P80 already prices uncertainty. Pick one: keep the flat buffer for a
              fixed-price bid, or turn it off and commit to the P80.
            </p>
          )}
        </div>
        <p className="sm" style={{ marginTop: "var(--space-2)" }}>
          Ratio lines applied to the running total compound with the lines above them, so their order matters. Management sits
          after the delivery activities, the risk buffer sits last.
        </p>

        <PertPanel pert={scopePert} factor={ratioLines.factor} spreads={spreads} />
      </div>
    </section>
  );
}

/* The distribution the P80 actually comes from: a normal centred on the PERT
   mean. Drawn from the project's own numbers so the shape is not decorative. */

function PertPanel({ pert, factor, spreads, sample = 10 }) {
  const [open, setOpen] = useState(true);
  const low = spreads.L,
    mn = sample * low.min,
    mx = sample * low.max;
  const e = (mn + 4 * sample + mx) / 6;
  const sd = (mx - mn) / 6;
  return (
    <div className="panel" style={{ marginTop: "var(--space-4)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "var(--rule-hair)",
          padding: "var(--space-2) var(--gutter)",
        }}
      >
        <span className="mono-lbl">How the range is computed</span>
        <Btn onClick={() => setOpen(!open)}>{open ? "Hide" : "Explain"}</Btn>
      </div>
      {open && (
        <div
          className="prose"
          style={{ padding: "var(--space-3) var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <p>
            Every item is three numbers, not one. The abacus gives the most likely value <b>m</b>. Confidence gives the other two
            as multipliers of it — it never moves <b>m</b>, it only says how wrong <b>m</b> could be.
          </p>
          <div
            className="num"
            style={{
              borderLeft: "3px solid var(--color-accent)",
              background: "var(--surface-subgroup)",
              padding: "var(--space-2) var(--space-3)",
              fontSize: "var(--text-small)",
            }}
          >
            <div>
              min = m × {low.min} max = m × {low.max} (low confidence, current settings)
            </div>
            <div style={{ marginTop: 4 }}>E = (min + 4m + max) / 6 σ = (max − min) / 6</div>
          </div>
          <p>
            The weighting keeps <b>m</b> dominant but lets the tails pull. A {sample} md item at low confidence can shrink by{" "}
            {fmt(sample - mn)} md and grow by {fmt(mx - sample)} md, so its expected effort is <b>{fmt(e)} md</b> with σ {fmt(sd)}
            , not a flat {sample}. That gap is the part of an estimate people forget to price: uncertainty is not symmetric, work
            overruns more readily than it underruns.
          </p>
          <p>
            At project level the expected values add up, but the <b>variances</b> add up, not the deviations: σ<sub>total</sub> =
            √(Σσ²). That square root is why a project made of many small uncertain items is more predictable than one made of
            three big ones — the overruns and the underruns partly cancel. It is the same reason a combined scenario has a lower
            P80 than the sum of the P80s of its parts.
          </p>
          <p>
            <b>P80 = E + 0.84 σ</b> and P90 = E + 1.28 σ. Read the P80 as: four times out of five the real figure lands at or
            below it. Commit externally at the P80, plan the team at E, and never sell the optimistic sum — it assumes every item
            goes your way at once, which is why it sits far off the left of this curve.
          </p>
          <PertCurve pert={pert} factor={factor} />
          <p className="sm">
            One assumption to keep in mind: variances are added as if the items were independent. A single unknown driving ten
            items — a framework decision, a partner who has not signed — breaks that, and the real spread is wider than the curve.
            Model it as one low-confidence item of its own, or keep an explicit risk line for it.
          </p>
        </div>
      )}
    </div>
  );
}
