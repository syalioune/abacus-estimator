import React from "react";
import { CONF, LEVELS } from "../domain/index.js";
import { fmt } from "./format.js";

/* The ladder. Five named rungs, equal width, no colour cue and no number:
   the argument in the room is "Complex or Very complex?", never "8 or 13?".
   The days live in the abacus and in the totals, in one place. */
export function Ladder({ scale, value, onPick, labels, showDays = false, blind = false }) {
  return (
    <span className="seg lad">
      {LEVELS.map((l) => {
        const d = scale?.[l.id]?.days;
        const name = labels?.[l.id] ?? l.label;
        return (
          <button
            key={l.id}
            type="button"
            onClick={onPick ? () => onPick(l.id) : undefined}
            title={`${name}${!blind && d != null ? ` — ${d} md` : ""} — ${scale?.[l.id]?.why ?? ""}`}
            className={"seg-opt" + (value === l.id ? " on" : "")}
            style={{ cursor: onPick ? "pointer" : "default" }}
          >
            {showDays ? <span className="num">{d}</span> : name}
          </button>
        );
      })}
    </span>
  );
}

/* Confidence — the one dimension in the system allowed a hue scale, because a
   low-confidence row is the thing a reader must find without reading. The
   letter is always present, so the meaning never rests on colour. */

/* Confidence — the one dimension in the system allowed a hue scale, because a
   low-confidence row is the thing a reader must find without reading. The
   letter is always present, so the meaning never rests on colour. */
export const ConfPicker = ({ value, onChange, spreads }) => (
  <span className="seg conf">
    {CONF.map((c) => (
      <button
        key={c.id}
        type="button"
        onClick={() => onChange(c.id)}
        title={`${c.label} confidence — ${spreads?.[c.id]?.why ?? ""}`}
        className={`seg-opt cf-${c.id.toLowerCase()}` + (value === c.id ? " on" : "")}
      >
        {c.id}
      </button>
    ))}
  </span>
);

export const ConfDot = ({ value, label }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <span className={"conf-dot " + value} />
    {label ? <span className="mono-lbl">{label}</span> : null}
  </span>
);

/* The kind mix of a roll-up, drawn to scale in steps of ink. */
export const MixBar = ({ parts, total }) => (
  <div style={{ display: "flex", height: 6, width: "100%", background: "var(--range-track)" }}>
    {parts.map((p, i) => (
      <div
        key={p.id}
        style={{
          width: `${total ? (p.days / total) * 100 : 0}%`,
          background: `color-mix(in srgb, var(--color-text) ${72 - i * 13}%, transparent)`,
        }}
        title={`${p.label}: ${fmt(p.days)} md`}
      />
    ))}
  </div>
);

/* The distribution the P80 actually comes from: a normal centred on the PERT
   mean. Drawn from the project's own numbers so the shape is not decorative. */
/* The distribution the P80 actually comes from: a normal centred on the PERT
   mean. Drawn from the project's own numbers so the shape is not decorative. */

/* The five-number range bar. The P80 boundary and its caption read the same
   position, so the tick and the label cannot drift apart. */
export function RangeBar({ pert, factor = 1 }) {
  const lo = pert.min * factor,
    hi = pert.max * factor;
  const span = hi - lo;
  if (!span) return <div style={{ marginTop: 12, height: 8, background: "var(--range-track)" }} />;
  const pos = (raw) => ((raw * factor - lo) / span) * 100;
  const ticks = [
    { v: pert.likely, label: "likely", color: "var(--color-neutral-600)" },
    { v: pert.expected, label: "expected", color: "var(--color-text)" },
    { v: pert.p80, label: "P80", color: "var(--color-accent)" },
  ];
  return (
    <div style={{ position: "relative", marginTop: 16, height: 40 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 8, height: 8, background: "var(--range-track)" }} />
      <div
        style={{
          position: "absolute",
          top: 8,
          height: 8,
          background: "var(--color-accent-200)",
          left: `${pos(pert.likely)}%`,
          width: `${pos(pert.p80) - pos(pert.likely)}%`,
        }}
      />
      {ticks.map((t) => (
        <div key={t.label} style={{ position: "absolute", top: 0, left: `${pos(t.v)}%` }}>
          <div style={{ height: 24, width: 2, background: t.color }} />
          <div className="mono-lbl" style={{ transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* The distribution the P80 comes from: a normal centred on the PERT mean,
   drawn from the project's own numbers so the shape is not decorative. */
export function PertCurve({ pert, factor = 1 }) {
  const E = pert.expected * factor,
    sd = pert.sd * factor,
    likely = pert.likely * factor,
    p80 = pert.p80 * factor;
  if (!sd) return null;
  const W = 620,
    H = 130,
    pad = 8;
  const lo = E - 3.2 * sd,
    hi = E + 3.2 * sd;
  const x = (v) => pad + ((v - lo) / (hi - lo)) * (W - 2 * pad);
  const y = (z) => H - 22 - Math.exp(-0.5 * z * z) * (H - 46);
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const z = -3.2 + (6.4 * i) / 120;
    pts.push(`${x(E + z * sd).toFixed(1)},${y(z).toFixed(1)}`);
  }
  const shade = [];
  for (let i = 0; i <= 120; i++) {
    const z = -3.2 + ((0.8416 + 3.2) * i) / 120;
    shade.push(`${x(E + z * sd).toFixed(1)},${y(z).toFixed(1)}`);
  }
  const mark = (v, label, color) =>
    v > lo && v < hi ? (
      <g key={label}>
        <line x1={x(v)} y1={22} x2={x(v)} y2={H - 22} stroke={color} strokeWidth="1" />
        <text x={x(v)} y={16} textAnchor="middle" fill={color} fontSize="10" fontFamily="ui-monospace, monospace">
          {label} {fmt(v)}
        </text>
      </g>
    ) : null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ marginTop: 12, width: "100%" }}
      role="img"
      aria-label="Distribution of the project estimate"
    >
      <polygon points={`${x(E - 3.2 * sd)},${H - 22} ${shade.join(" ")} ${x(E + 3.2 * sd)},${H - 22}`} fill="#ccfbf1" />
      <polyline points={pts.join(" ")} fill="none" stroke="#0f766e" strokeWidth="1.5" />
      <line x1={pad} y1={H - 22} x2={W - pad} y2={H - 22} stroke="#cbd5e1" strokeWidth="1" />
      {mark(likely, "likely", "#0f172a")}
      {mark(E, "expected", "#0f766e")}
      {mark(p80, "P80", "#134e4a")}
      <text x={pad} y={H - 8} fill="#94a3b8" fontSize="10" fontFamily="ui-monospace, monospace">
        shaded: the 80% you commit to
      </text>
      <text x={W - pad} y={H - 8} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="ui-monospace, monospace">
        md
      </text>
    </svg>
  );
}
