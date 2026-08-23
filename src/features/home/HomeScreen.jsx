import React from "react";
import { Btn, Cell, Eyebrow, Figure } from "../../ui/primitives.jsx";
import { IconPlus } from "../../ui/icons.jsx";
import { fmt } from "../../ui/format.js";

const CREATORS = [
  ["lot", "Lot", "A slice of scope a scenario can include or leave out."],
  ["subsystem", "Subsystem", "Groups components. Pick one on each component band."],
  ["component", "Component", "Carries no effort of its own — it totals what is attached to it."],
  ["item", "Item", "A feature, API, flow, batch or screen — the thing that actually gets sized."],
];

/* The landing room: where the estimate stands right now, the shape of the
   landscape it covers, and the four things it's built from. Nothing here is
   derived beyond counts and the top-line figures already shown in the header —
   this room orients, it doesn't argue. */
export function Home({ state, devDays, totalLikely, totalP80, onOpenAdd }) {
  const counts = [
    { label: "Items", v: state.items.length },
    { label: "Components", v: state.components.length },
    { label: "Subsystems", v: state.subsystems.length },
    { label: "Lots", v: state.lots.length },
    { label: "Scenarios", v: state.scenarios.length },
  ];

  const known = new Set(state.components.map((c) => c.id));
  const itemsIn = (id) => state.items.filter((i) => i.componentId === id).length;
  const orphans = state.items.filter((i) => !known.has(i.componentId)).length;

  /* Same order as the backlog: declared subsystems first, then whatever was
     never grouped. A bucket with no component still shows, so an empty
     subsystem is visible rather than silently absent. */
  const buckets = [
    ...state.subsystems.map((s) => ({
      key: s.id,
      name: s.name,
      components: state.components.filter((c) => c.subsystemId === s.id),
    })),
    { key: "__none", name: "No subsystem", components: state.components.filter((c) => !c.subsystemId) },
  ].filter((b) => b.key !== "__none" || b.components.length > 0);

  const lotName = Object.fromEntries(state.lots.map((l) => [l.id, l.name]));

  return (
    <section>
      <Eyebrow>{state.project}</Eyebrow>
      <p className="prose" style={{ maxWidth: 720, marginBottom: "var(--space-6)" }}>
        Backlog decomposed into man-days, with the reasoning attached. Start below if this estimate is still empty, or head to the
        Backlog room to argue the items already on it.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-7)", marginBottom: "var(--space-5)" }}>
        <Figure label="Development" value={`${fmt(devDays)} md`} />
        <Figure label="Total, likely" value={`${fmt(totalLikely)} md`} />
        <Figure label="Total, P80" value={`${fmt(totalP80)} md`} commit note="Commit here" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 1,
          background: "var(--color-divider)",
          border: "1px solid var(--color-divider)",
          marginBottom: "var(--space-6)",
        }}
      >
        {counts.map((c) => (
          <Cell key={c.label} label={c.label} v={c.v} />
        ))}
      </div>

      <Eyebrow right={<span className="mono-lbl">Containers only — effort lives on the items inside them</span>}>
        Landscape
      </Eyebrow>
      <div className="panel" style={{ marginBottom: "var(--space-6)" }}>
        {state.components.length === 0 ? (
          <p className="prose" style={{ margin: 0, padding: "var(--space-4) var(--gutter)" }}>
            No component declared yet. A component is where the work hangs: declare one, then attach features, APIs, flows,
            batches and screens to it.
          </p>
        ) : (
          buckets.map((b) => (
            <React.Fragment key={b.key}>
              <div className="tree-row parent" style={{ "--depth": 0 }}>
                <span className="mono-lbl">Subsystem</span>
                <span className="ttl" style={{ flex: "1 1 200px", minWidth: 0, fontSize: "var(--text-subtitle)" }}>
                  {b.name}
                </span>
                <span className="mono-lbl num">
                  {b.components.length} component{b.components.length === 1 ? "" : "s"}
                </span>
              </div>
              {b.components.length === 0 ? (
                <div className="tree-row child sm" style={{ "--depth": 1 }}>
                  No component attached to this subsystem yet.
                </div>
              ) : (
                b.components.map((c) => (
                  <div key={c.id} className="tree-row child" style={{ "--depth": 1 }}>
                    <span style={{ flex: "1 1 200px", minWidth: 0 }}>{c.name}</span>
                    <span className="mono-lbl num">{itemsIn(c.id)} items</span>
                  </div>
                ))
              )}
            </React.Fragment>
          ))
        )}
        {orphans > 0 && (
          <div className="tree-row parent" style={{ "--depth": 0 }}>
            <span className="mono-lbl">Unassigned</span>
            <span style={{ flex: "1 1 200px", minWidth: 0 }}>Items attached to no component</span>
            <span className="mono-lbl num">{orphans} items</span>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-6)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div>
          <Eyebrow>Lots</Eyebrow>
          <div className="panel">
            {state.lots.map((l) => (
              <div key={l.id} className="tree-row" style={{ "--depth": 0 }}>
                <span style={{ flex: "1 1 160px", minWidth: 0 }}>{l.name}</span>
                <span className="mono-lbl num">{state.items.filter((i) => i.lotId === l.id).length} items</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Eyebrow>Scenarios</Eyebrow>
          <div className="panel">
            {state.scenarios.map((sc) => (
              <div key={sc.id} className="tree-row" style={{ "--depth": 0 }}>
                <span style={{ flex: "1 1 160px", minWidth: 0 }}>
                  {sc.name}
                  {sc.id === state.baselineId ? <span className="mono-lbl"> · baseline</span> : null}
                </span>
                <span className="sm" style={{ flex: "1 1 160px", minWidth: 0 }}>
                  {sc.lotIds.length ? sc.lotIds.map((id) => lotName[id]).join(" · ") : "No lot selected"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Eyebrow>Add to the estimate</Eyebrow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
        {CREATORS.map(([tab, label, hint]) => (
          <Btn key={tab} icon={<IconPlus />} title={hint} onClick={() => onOpenAdd(tab)}>
            {label}
          </Btn>
        ))}
      </div>
    </section>
  );
}
