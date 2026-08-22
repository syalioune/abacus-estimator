import React, { useEffect, useRef, useState } from "react";
import { IconTrash, IconX } from "./icons.jsx";

export const Eyebrow = ({ children, right }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
    <span className="mono-lbl">{children}</span>
    <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
    {right}
  </div>
);

export function NumInput({ value, onChange, width = 56, min = 0, suffix }) {
  const [buf, setBuf] = useState(String(value ?? ""));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setBuf(String(value ?? ""));
  }, [value]);
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline" }}>
      <input
        type="text"
        inputMode="decimal"
        value={buf}
        style={{ width }}
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          setBuf(e.target.value);
          const n = parseFloat(e.target.value.replace(",", "."));
          onChange(Number.isFinite(n) ? Math.max(min, n) : min);
        }}
        onBlur={() => {
          focused.current = false;
          setBuf(String(value ?? ""));
        }}
        className="numin"
      />
      {suffix ? (
        <span className="mono-lbl" style={{ marginLeft: 5 }}>
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

/* The accent is spent on three things only: the chosen rung, the P80 figure,
   and the primary action. Everything else is ink on ground. */

/* The accent is spent on three things only: the chosen rung, the P80 figure,
   and the primary action. Everything else is ink on ground. */
export const Btn = ({ children, onClick, tone = "ghost", title, icon }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={"btn " + (tone === "solid" ? "btn-primary" : tone === "danger" ? "btn-danger" : "btn-secondary")}
  >
    {icon}
    {children}
  </button>
);

export const MiniBtn = ({ children, onClick, title, danger, icon }) => (
  <button type="button" title={title} onClick={onClick} className={"btn-mini" + (danger ? " danger" : "")}>
    {icon}
    {children}
  </button>
);

/* Free-text tags, any number of them. Each is its own chip so a long list
   never reads as one run-on word — that's what forced "Outstanding" to
   overflow its box earlier, and tags share the same row. */
export function TagInput({ value = [], onChange, placeholder = "add a tag…" }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const t = draft.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
      {value.map((t) => (
        <span key={t} className="tag tag-outline" style={{ gap: 4 }}>
          {t}
          <MiniBtn icon={<IconX />} title={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} />
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="sm"
        style={{ background: "transparent", border: 0, padding: 0, font: "inherit", flex: "1 0 70px", minWidth: 70 }}
      />
    </span>
  );
}

/* A name is never worth cropping. This grows downwards instead of scrolling
   sideways, so a long title wraps and stays whole while you edit it. Enter
   commits rather than opening a second line: these are names, not prose. */
export function GrowText({ value, onChange, className, style, title, label, placeholder }) {
  const ref = useRef(null);
  const fit = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => fit(ref.current), [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      title={title}
      aria-label={label}
      placeholder={placeholder}
      spellCheck={false}
      onChange={(e) => {
        fit(e.target);
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.currentTarget.blur();
      }}
      className={"growtext" + (className ? " " + className : "")}
      style={style}
    />
  );
}

export const Select = ({ value, onChange, children, style, title }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="sel" style={style} title={title}>
    {children}
  </select>
);

export const Chip = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick} className={"chip" + (on ? " on" : "")}>
    {children}
  </button>
);

export const Field = ({ label, children, grow }) => (
  <label
    style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: grow ? 220 : undefined, flex: grow ? 1 : undefined }}
  >
    <span className="mono-lbl">{label}</span>
    {children}
  </label>
);

/* The ladder. Five named rungs, equal width, no colour cue and no number:
   the argument in the room is "Complex or Very complex?", never "8 or 13?".
   The days live in the abacus and in the totals, in one place. */

/* A headline figure with its label and, where it matters, its caveat.
   The P80 is one of the three things allowed to be red. */
export const Figure = ({ label, value, commit, note }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 3,
      paddingLeft: commit ? "var(--space-4)" : undefined,
      borderLeft: commit ? "var(--rule-strong)" : undefined,
    }}
  >
    <span className="mono-lbl" style={commit ? { color: "var(--emphasis-commit)" } : undefined}>
      {label}
    </span>
    <span
      className="ttl num"
      style={{ fontSize: "var(--text-figure)", lineHeight: 1, color: commit ? "var(--emphasis-commit)" : undefined }}
    >
      {value}
    </span>
    {note ? <span className="mono-lbl">{note}</span> : null}
  </div>
);

export const Cell = ({ label, v, strong }) => (
  <div style={{ background: "var(--color-surface)", padding: "var(--space-3)" }}>
    <div className="mono-lbl">{label}</div>
    <div className={"ttl num" + (strong ? " commit" : "")} style={{ fontSize: "var(--text-figure-sm)" }}>
      {v}
    </div>
  </div>
);

/* One overlay for the whole app. No animation, no radius — the panel
   underneath it looks the same as everywhere else, it's just on top. */
export const Modal = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--color-text) 45%, transparent)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "var(--space-7) var(--gutter)",
        zIndex: 100,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel"
        style={{ width: "100%", maxWidth: 640, background: "var(--color-bg)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--gutter)",
            borderBottom: "var(--rule-hair)",
          }}
        >
          <span className="ttl" style={{ fontSize: "var(--text-subtitle)" }}>
            {title}
          </span>
          <MiniBtn onClick={onClose} title="Close" icon={<IconX />}>
            close
          </MiniBtn>
        </div>
        <div style={{ padding: "var(--space-4) var(--gutter)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* Every destructive action confirms through this, never a native window.confirm —
   the browser dialog can't carry the design system or explain what breaks. */
export const ConfirmModal = ({ open, title = "Confirm", message, confirmLabel = "Delete", onConfirm, onCancel }) => (
  <Modal open={open} onClose={onCancel} title={title}>
    <p className="prose" style={{ margin: 0 }}>
      {message}
    </p>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
      <Btn onClick={onCancel}>Cancel</Btn>
      <Btn tone="danger" icon={<IconTrash />} onClick={onConfirm}>
        {confirmLabel}
      </Btn>
    </div>
  </Modal>
);

export const Row = ({ title, desc, children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-6)",
      background: "var(--color-surface)",
      padding: "var(--space-3) var(--gutter)",
    }}
  >
    <div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div className="sm">{desc}</div>
    </div>
    <div style={{ flex: "none" }}>{children}</div>
  </div>
);
