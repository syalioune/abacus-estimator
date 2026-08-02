import React, { useState } from "react";
import { applyRatios, pertOf } from "../../domain/index.js";
import { Btn, ConfirmModal, Eyebrow, MiniBtn } from "../../ui/primitives.jsx";
import { IconPlus, IconTrash } from "../../ui/icons.jsx";
import { fmt } from "../../ui/format.js";

export function ScenarioBoard({
  items,
  lots,
  scenarios,
  baselineId,
  ratios,
  spreads,
  daysMapFor,
  activeScenario,
  setActiveScenario,
  onAddLot,
  onUpdLot,
  onDelLot,
  onAddScenario,
  onUpdScenario,
  onDelScenario,
  onBaseline,
}) {
  const [newLot, setNewLot] = useState("");
  const [confirm, setConfirm] = useState(null);
  const askConfirm = (message, run) => setConfirm({ message, run });

  /* Each scenario is re-priced on its own set: a lot added to a bigger scope
     mutualises against everything already there, so it is cheaper in days at the margin. */
  const fullMap = daysMapFor(items);
  const lotStats = lots.map((l) => {
    const list = items.filter((i) => i.lotId === l.id);
    return { ...l, n: list.length, days: list.reduce((a, i) => a + (fullMap.get(i.id)?.net ?? 0), 0) };
  });

  const cols = scenarios.map((sc) => {
    const list = items.filter((i) => sc.lotIds.includes(i.lotId));
    const m = daysMapFor(list);
    const d = (it) => m.get(it.id)?.net ?? 0;
    const p = pertOf(list, d, spreads);
    const gross = list.reduce((a, i) => a + (m.get(i.id)?.gross ?? 0), 0);
    const b = applyRatios(ratios, p.likely);
    return { sc, list, p, gross, factor: b.factor, totalLikely: b.total, totalP80: p.p80 * b.factor };
  });
  const base = cols.find((c) => c.sc.id === baselineId) || cols[0];
  const maxTotal = Math.max(1, ...cols.map((c) => c.totalP80));

  const metric = (label, get, hint) => ({ label, get, hint });
  const metrics = [
    metric("Items", (c) => String(c.list.length)),
    metric("Development, before mutualisation", (c) => `${fmt(c.gross)} md`),
    metric("Mutualisation", (c) => (c.gross > c.p.likely ? `−${fmt(c.gross - c.p.likely)} md` : "—")),
    metric("Development, likely", (c) => `${fmt(c.p.likely)} md`),
    metric("Development, P80", (c) => `${fmt(c.p.p80)} md`),
    metric("Ratio factor", (c) => `×${c.factor.toFixed(2)}`),
    metric("Project total, likely", (c) => `${fmt(c.totalLikely)} md`),
    metric("Project total, P80", (c) => `${fmt(c.totalP80)} md`, "strong"),
    metric("Project total, P80 per person-month", (c) => `${fmt(c.totalP80 / 18)} pm`),
  ];

  return (
    <section>
      <Eyebrow
        right={
          <Btn tone="solid" icon={<IconPlus />} onClick={onAddScenario}>
            Add scenario
          </Btn>
        }
      >
        Scenarios
      </Eyebrow>
      <p className="prose" style={{ maxWidth: 720, marginBottom: "var(--space-6)" }}>
        Every item belongs to a lot. A scenario is a selection of lots, so an option is priced once and reused in every
        combination you want to put in front of the customer. Set one scenario as the baseline and the others are read as deltas
        against it.
      </p>

      {/* lots */}
      <div className="panel" style={{ marginBottom: "var(--space-6)" }}>
        <div
          className="mono-lbl"
          style={{
            borderBottom: "var(--rule-hair)",
            background: "var(--surface-subgroup)",
            padding: "var(--space-2) var(--gutter)",
          }}
        >
          Lots
        </div>
        <table className="tbl">
          <tbody>
            {lotStats.map((l) => (
              <tr key={l.id}>
                <td>
                  <input value={l.name} onChange={(e) => onUpdLot(l.id, { name: e.target.value })} className="mini" />
                </td>
                <td className="r sm" style={{ width: 96 }}>
                  {l.n} items
                </td>
                <td className="r" style={{ width: 96 }}>
                  {fmt(l.days)} md
                </td>
                <td className="r" style={{ width: 64 }}>
                  {lots.length > 1 && (
                    <MiniBtn
                      danger
                      icon={<IconTrash />}
                      title="Delete lot"
                      onClick={() =>
                        askConfirm(`Delete ${l.name}? Its ${l.n} items move to ${lots.find((x) => x.id !== l.id).name}.`, () =>
                          onDelLot(l.id),
                        )
                      }
                    >
                      del
                    </MiniBtn>
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    value={newLot}
                    placeholder="Option B — customer portal"
                    onChange={(e) => setNewLot(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onAddLot(newLot);
                        setNewLot("");
                      }
                    }}
                    className="mini"
                    style={{ width: 240 }}
                  />
                  <Btn
                    icon={<IconPlus />}
                    onClick={() => {
                      onAddLot(newLot);
                      setNewLot("");
                    }}
                  >
                    Add lot
                  </Btn>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* comparison */}
      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr style={{ borderBottom: "var(--rule-strong)", background: "var(--surface-subgroup)", verticalAlign: "top" }}>
              <th className="mono-lbl" style={{ width: 224 }}>
                Scenario
              </th>
              {cols.map((c) => (
                <th key={c.sc.id} style={{ minWidth: 208 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      value={c.sc.name}
                      onChange={(e) => onUpdScenario(c.sc.id, { name: e.target.value })}
                      className="ttl mini"
                      style={{ fontSize: "var(--text-subtitle)" }}
                    />
                    {scenarios.length > 1 && (
                      <MiniBtn
                        danger
                        icon={<IconTrash />}
                        title="Delete scenario"
                        onClick={() => askConfirm(`Delete "${c.sc.name}"? This cannot be undone.`, () => onDelScenario(c.sc.id))}
                      >
                        del
                      </MiniBtn>
                    )}
                  </div>
                  <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <label className="mono-lbl" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <input
                        type="radio"
                        checked={base?.sc.id === c.sc.id}
                        onChange={() => onBaseline(c.sc.id)}
                        style={{ accentColor: "var(--color-accent)" }}
                      />
                      baseline
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveScenario(activeScenario === c.sc.id ? "__all" : c.sc.id)}
                      className={"chip" + (activeScenario === c.sc.id ? " on" : "")}
                    >
                      {activeScenario === c.sc.id ? "in scope" : "set as scope"}
                    </button>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                    {lots.map((l) => (
                      <label key={l.id} className="sm" style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={c.sc.lotIds.includes(l.id)}
                          onChange={(e) =>
                            onUpdScenario(c.sc.id, {
                              lotIds: e.target.checked ? [...c.sc.lotIds, l.id] : c.sc.lotIds.filter((x) => x !== l.id),
                            })
                          }
                          style={{ accentColor: "var(--color-accent)" }}
                        />
                        {l.name}
                      </label>
                    ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.label}>
                <td className="mono-lbl">{m.label}</td>
                {cols.map((c) => (
                  <td key={c.sc.id} className={"v" + (m.hint === "strong" ? " commit" : "")}>
                    {m.get(c)}
                  </td>
                ))}
              </tr>
            ))}
            <tr style={{ background: "var(--surface-subgroup)" }}>
              <td className="mono-lbl">Δ vs baseline</td>
              {cols.map((c) => {
                const d = c.totalLikely - (base?.totalLikely ?? 0);
                return (
                  <td key={c.sc.id} className="v">
                    {c.sc.id === base?.sc.id ? (
                      <span className="tert">reference</span>
                    ) : (
                      <span style={{ color: d > 0 ? "var(--color-text)" : "var(--conf-high-fg)" }}>
                        {d > 0 ? "+" : ""}
                        {fmt(d)} md
                        {base?.totalLikely ? ` · ${d > 0 ? "+" : ""}${Math.round((d / base.totalLikely) * 100)}%` : ""}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="mono-lbl">Relative size</td>
              {cols.map((c) => (
                <td key={c.sc.id}>
                  <div className="sbar">
                    <div className="p80" style={{ width: `${(c.totalP80 / maxTotal) * 100}%` }} />
                    <div className="lk" style={{ width: `${(c.totalLikely / maxTotal) * 100}%` }} />
                  </div>
                  <div className="mono-lbl" style={{ marginTop: 4 }}>
                    solid likely · pale P80
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sm" style={{ marginTop: "var(--space-2)" }}>
        Each scenario runs the full ratio cascade on its own development total, so a scenario is never a straight multiple of the
        baseline. The P80 of a combination is below the sum of the P80s of its parts — that is the point of aggregating risk
        rather than stacking buffers.
      </p>

      <ConfirmModal
        open={!!confirm}
        title="Confirm deletion"
        message={confirm?.message}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          confirm.run();
          setConfirm(null);
        }}
      />
    </section>
  );
}
