import React from "react";
import { CONF, LEVELS, Z_P80 } from "../domain/index.js";
import { fmt } from "./format.js";

/* Initials for the dense posture: "Very complex" reads "VC" in the row and
   stays a word everywhere it is argued — the tooltip, the readout under the
   ladder, and the abacus all spell it out. */
const initialsOf = (name) =>
  (name || "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 3);

/* The ladder. Five named rungs, equal width, no colour cue and no number:
   the argument in the room is "Complex or Very complex?", never "8 or 13?".
   The days live in the abacus and in the totals, in one place. */
export function Ladder({ scale, value, onPick, labels, showDays = false, blind = false, compact = false }) {
  return (
    <span className={"seg lad" + (compact ? " compact" : "")}>
      {LEVELS.map((l) => {
        const d = scale?.[l.id]?.days;
        const name = labels?.[l.id] ?? l.label;
        return (
          <button
            key={l.id}
            type="button"
            onClick={onPick ? () => onPick(l.id) : undefined}
            title={`${name}${!blind && d != null ? ` — ${d} md` : ""} — ${scale?.[l.id]?.why ?? ""}`}
            aria-label={name}
            className={"seg-opt" + (value === l.id ? " on" : "")}
            style={{ cursor: onPick ? "pointer" : "default" }}
          >
            {showDays ? <span className="num">{d}</span> : compact ? initialsOf(name) : name}
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

/* The five-number range bar. Optimistic and pessimistic flank the plot, so the
   track never has to carry a label at its own ends; likely, expected and P80
   are marked on it, each with its figure. The three often crowd into a tenth of
   the span — that is the point of the picture — so captions alternate sides and
   the two that share a side are nudged apart rather than printed on top of each
   other. Only the captions move; every mark stays where its figure falls. */
export function RangeBar({ pert, factor = 1 }) {
  const lo = pert.min * factor;
  const hi = pert.max * factor;
  const span = hi - lo;
  const at = (v) => (span > 0 ? Math.max(0, Math.min(100, ((v * factor - lo) / span) * 100)) : 50);

  const likely = at(pert.likely);
  const expected = at(pert.expected);
  const p80 = at(pert.p80);

  /* Likely and P80 share the upper side. Nudge the captions apart when the
     marks nearly touch; the marks themselves never move. */
  const GAP = 14;
  let likelyCap = likely;
  let p80Cap = p80;
  if (p80Cap - likelyCap < GAP) {
    const mid = (likelyCap + p80Cap) / 2;
    likelyCap = mid - GAP / 2;
    p80Cap = mid + GAP / 2;
  }
  const clamp = (x) => Math.max(GAP / 2, Math.min(100 - GAP / 2, x));

  const cap = (label, value, tone) => (
    <>
      <span className="mono-lbl" style={tone ? { color: tone } : undefined}>
        {label}
      </span>
      <span className="v" style={tone ? { color: tone } : undefined}>
        {fmt(value)} md
      </span>
    </>
  );

  return (
    <div className="rangebar">
      <span className="end lo">{cap("Optimistic", lo)}</span>
      <span className="plot">
        <span className="track" />
        <span className="band" style={{ left: `${likely}%`, width: `${Math.max(0, p80 - likely)}%` }} />
        <span className="mk" style={{ left: `${likely}%`, background: "var(--range-likely)" }} />
        <span className="mk" style={{ left: `${expected}%`, background: "var(--range-tick)" }} />
        <span className="mk" style={{ left: `${p80}%`, background: "var(--color-accent)" }} />
        <span className="cap above" style={{ left: `${clamp(likelyCap)}%` }}>
          {cap("Likely", pert.likely * factor)}
        </span>
        <span className="cap above" style={{ left: `${clamp(p80Cap)}%` }}>
          {cap("P80", pert.p80 * factor, "var(--emphasis-commit)")}
        </span>
        <span className="cap below" style={{ left: `${clamp(expected)}%` }}>
          {cap("Expected", pert.expected * factor)}
        </span>
      </span>
      <span className="end hi">{cap("Pessimistic", hi)}</span>
    </div>
  );
}

/* The distribution the P80 comes from: a normal centred on the PERT mean,
   drawn from the project's own numbers so the shape is not decorative. The
   shaded area is the 80% you commit to, so it stops at the P80 — closing it
   anywhere else would shade a claim the figure does not make. */
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
  const base = H - 22;
  const x = (v) => pad + ((v - lo) / (hi - lo)) * (W - 2 * pad);
  const y = (z) => base - Math.exp(-0.5 * z * z) * (H - 46);
  const arc = (from, to) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const z = from + ((to - from) * i) / 120;
      pts.push(`${x(E + z * sd).toFixed(1)},${y(z).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const mark = (v, label, cls) =>
    v > lo && v < hi ? (
      <g key={label} className={cls}>
        <line x1={x(v)} y1={22} x2={x(v)} y2={base} strokeWidth="1" />
        <text x={x(v)} y={16} textAnchor="middle" fontSize="10">
          {label} {fmt(v)}
        </text>
      </g>
    ) : null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="pcurve"
      style={{ marginTop: 12, width: "100%" }}
      role="img"
      aria-label="Distribution of the project estimate"
    >
      <polygon className="shade" points={`${x(lo)},${base} ${arc(-3.2, Z_P80)} ${x(E + Z_P80 * sd)},${base}`} />
      <polyline className="line" points={arc(-3.2, 3.2)} />
      <line className="axis" x1={pad} y1={base} x2={W - pad} y2={base} />
      {mark(likely, "likely", "mk-likely")}
      {mark(E, "expected", "mk-expected")}
      {mark(p80, "P80", "mk-p80")}
      <text className="foot" x={pad} y={H - 8} fontSize="10">
        shaded: the 80% you commit to, up to the P80
      </text>
      <text className="foot" x={W - pad} y={H - 8} textAnchor="end" fontSize="10">
        md
      </text>
    </svg>
  );
}
