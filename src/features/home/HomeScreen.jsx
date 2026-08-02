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

/* The landing room: where the estimate stands right now, and the four things
   it's built from. Nothing here is derived beyond counts and the top-line
   figures already shown in the header — this room orients, it doesn't argue. */
export function Home({ state, devDays, totalLikely, totalP80, onOpenAdd }) {
  const counts = [
    { label: "Items", v: state.items.length },
    { label: "Components", v: state.components.length },
    { label: "Subsystems", v: state.subsystems.length },
    { label: "Lots", v: state.lots.length },
    { label: "Scenarios", v: state.scenarios.length },
  ];

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
