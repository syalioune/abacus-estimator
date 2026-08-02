import React, { useCallback, useMemo, useState } from "react";
import { CONF, CONF_BY_ID, DIRS, DIR_BY_ID, LEVELS, LEVEL_BY_ID, TYPES, TYPE_BY_ID } from "../../domain/index.js";
import { Btn, Field, Eyebrow, Select } from "../../ui/primitives.jsx";
import { download, fmt } from "../../ui/format.js";

/* Heat is ink, never accent. A big cell is not a warning; it is a big cell. */
const HEAT = ["", "h1c", "h2c", "h3c", "h4c", "h5c"];

export function Pivot({ items, components, compName, compSub, subName, subsystems, lots, levelLabels, daysOf, pert, flash }) {
  const [rowDim, setRowDim] = useState("component");
  const [subDim, setSubDim] = useState("type");
  const [colDim, setColDim] = useState("level");
  const [measure, setMeasure] = useState("days");
  const [drill, setDrill] = useState(null);

  const lotName = useMemo(() => Object.fromEntries(lots.map((l) => [l.id, l.name])), [lots]);

  const dims = useMemo(
    () => ({
      none: { label: "None", keys: () => ["__all"], get: () => "__all", name: () => "Total" },
      type: { label: "Type", keys: () => TYPES.map((t) => t.id), get: (i) => i.type, name: (k) => TYPE_BY_ID[k]?.label ?? k },
      component: {
        label: "Component",
        keys: () => [...components.map((c) => c.id), "__none"],
        get: (i) => i.componentId || "__none",
        name: (k) => compName[k] ?? "Unassigned",
      },
      subsystem: {
        label: "Subsystem",
        keys: () => [...subsystems.map((x) => x.id), "__none"],
        get: (i) => compSub[i.componentId] || "__none",
        name: (k) => (k === "__none" ? "No subsystem" : (subName[k] ?? k)),
      },
      direction: {
        label: "Direction",
        keys: () => [...DIRS.map((d) => d.id), "__na"],
        get: (i) => (i.type === "API" ? i.direction || "EXPOSED" : "__na"),
        name: (k) => (k === "__na" ? "Not an API" : (DIR_BY_ID[k]?.label ?? k)),
      },
      level: {
        label: "Complexity",
        keys: () => LEVELS.map((l) => l.id),
        get: (i) => i.level,
        name: (k) => levelLabels?.[k] ?? LEVEL_BY_ID[k]?.label ?? k,
      },
      confidence: {
        label: "Confidence",
        keys: () => CONF.map((c) => c.id),
        get: (i) => i.confidence || "M",
        name: (k) => CONF_BY_ID[k]?.label ?? k,
      },
      lot: { label: "Lot", keys: () => lots.map((l) => l.id), get: (i) => i.lotId, name: (k) => lotName[k] ?? k },
      // An item can carry several tags; the pivot buckets it by the first one
      // rather than fanning it into every tag's column, so totals never double-count.
      tag: {
        label: "Tag",
        keys: null,
        get: (i) => i.tags?.[0] || "__none",
        name: (k) => (k === "__none" ? "No tag" : k),
      },
    }),
    [components, compName, compSub, subName, subsystems, levelLabels, lots, lotName],
  );

  /* Never trust a dimension key blindly: an unknown one must degrade to a
     single total column, not take the whole tab down. */
  const D = useCallback((k) => dims[k] || dims.none, [dims]);

  const keysFor = useCallback(
    (dim) => {
      const d = D(dim);
      const present = new Set(items.map(d.get));
      if (d.keys) return d.keys().filter((k) => present.has(k));
      return Array.from(present).sort((a, b) => String(d.name(a)).localeCompare(String(d.name(b))));
    },
    [D, items],
  );

  const agg = useCallback(
    (list) => {
      const p = pert(list);
      return { days: p.likely, expected: p.expected, p80: p.p80, count: list.length };
    },
    [pert],
  );

  const model = useMemo(() => {
    const rowKeys = keysFor(rowDim);
    const colKeys = colDim === "none" ? [] : keysFor(colDim);
    const rGet = D(rowDim).get,
      cGet = D(colDim).get,
      sGet = D(subDim).get;
    const rows = rowKeys.map((rk) => {
      const rItems = items.filter((i) => rGet(i) === rk);
      const subKeys = subDim === "none" ? [] : keysFor(subDim).filter((sk) => rItems.some((i) => sGet(i) === sk));
      return {
        key: rk,
        label: D(rowDim).name(rk),
        cells: colKeys.map((ck) => agg(rItems.filter((i) => cGet(i) === ck))),
        total: agg(rItems),
        subs: subKeys.map((sk) => {
          const sItems = rItems.filter((i) => sGet(i) === sk);
          return {
            key: sk,
            label: D(subDim).name(sk),
            cells: colKeys.map((ck) => agg(sItems.filter((i) => cGet(i) === ck))),
            total: agg(sItems),
          };
        }),
      };
    });
    return {
      rowKeys,
      colKeys,
      rows,
      colTotals: colKeys.map((ck) => agg(items.filter((i) => cGet(i) === ck))),
      grand: agg(items),
    };
  }, [items, rowDim, colDim, subDim, D, keysFor, agg]);

  const val = (c) => (measure === "days" ? c.days : measure === "expected" ? c.expected : measure === "p80" ? c.p80 : c.count);
  const show = (c) => {
    const v = val(c);
    if (!v) return <span className="zero">·</span>;
    return fmt(v);
  };
  const max = Math.max(1, ...model.rows.flatMap((r) => r.cells.map(val)));
  const heat = (c) => {
    const v = val(c);
    return v ? HEAT[Math.min(HEAT.length - 1, Math.ceil((v / max) * (HEAT.length - 1)))] : "";
  };

  const openDrill = (rowKey, colKey, subKey) => {
    const rGet = D(rowDim).get,
      cGet = D(colDim).get,
      sGet = D(subDim).get;
    const list = items.filter(
      (i) =>
        (rowKey == null || rGet(i) === rowKey) &&
        (colKey == null || cGet(i) === colKey) &&
        (subKey == null || sGet(i) === subKey),
    );
    const parts = [
      rowKey != null ? D(rowDim).name(rowKey) : null,
      subKey != null ? D(subDim).name(subKey) : null,
      colKey != null && colDim !== "none" ? D(colDim).name(colKey) : null,
    ].filter(Boolean);
    setDrill({ title: parts.join(" · ") || "All items", list });
  };

  const exportCsv = () => {
    const head = [
      "Row",
      subDim !== "none" ? D(subDim).label : null,
      ...model.colKeys.map((k) => D(colDim).name(k)),
      "Total",
    ].filter(Boolean);
    const lines = [head.join(";")];
    model.rows.forEach((r) => {
      lines.push([r.label, subDim !== "none" ? "" : null, ...r.cells.map(val), val(r.total)].filter((x) => x !== null).join(";"));
      r.subs.forEach((s) => lines.push(["", s.label, ...s.cells.map(val), val(s.total)].join(";")));
    });
    lines.push(
      ["Total", subDim !== "none" ? "" : null, ...model.colTotals.map(val), val(model.grand)].filter((x) => x !== null).join(";"),
    );
    download("crosstable.csv", lines.join("\n"), "text/csv");
    flash("Cross table exported");
  };

  const dimOptions = (exclude) =>
    Object.entries(dims)
      .filter(([k]) => k !== exclude)
      .map(([k, d]) => (
        <option key={k} value={k}>
          {d.label}
        </option>
      ));

  return (
    <section>
      <Eyebrow right={<Btn onClick={exportCsv}>Export CSV</Btn>}>Cross table</Eyebrow>

      <div
        className="panel"
        style={{
          marginBottom: "var(--space-4)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--gutter)",
        }}
      >
        <Field label="Rows">
          <Select value={rowDim} onChange={setRowDim}>
            {dimOptions("none")}
          </Select>
        </Field>
        <Field label="Then by">
          <Select value={subDim} onChange={setSubDim}>
            {dimOptions()}
          </Select>
        </Field>
        <Field label="Columns">
          <Select value={colDim} onChange={setColDim}>
            {dimOptions()}
          </Select>
        </Field>
        <Field label="Measure">
          <Select value={measure} onChange={setMeasure}>
            <option value="days">Man-days, likely</option>
            <option value="expected">Man-days, expected</option>
            <option value="p80">Man-days, P80</option>
            <option value="count">Item count</option>
          </Select>
        </Field>
        <div className="mono-lbl" style={{ marginLeft: "auto", paddingBottom: 4 }}>
          Click a cell to list its items
        </div>
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr className="hdrow">
              <th className="l">{D(rowDim).label}</th>
              {subDim !== "none" && <th className="l">{D(subDim).label}</th>}
              {model.colKeys.map((ck) => (
                <th key={ck}>{D(colDim).name(ck)}</th>
              ))}
              <th style={{ color: "var(--color-text)" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {model.rows.map((r) => (
              <React.Fragment key={r.key}>
                <tr className="grp">
                  <td>{r.label}</td>
                  {subDim !== "none" && <td />}
                  {r.cells.map((c, i) => (
                    <td key={i} onClick={() => openDrill(r.key, model.colKeys[i], null)} className={"n " + heat(c)}>
                      {show(c)}
                    </td>
                  ))}
                  <td onClick={() => openDrill(r.key, null, null)} className="n" style={{ borderLeft: "var(--rule-hair)" }}>
                    {show(r.total)}
                  </td>
                </tr>
                {r.subs.map((s) => (
                  <tr key={s.key} className="sub">
                    <td />
                    <td className="l mono-lbl">{s.label}</td>
                    {s.cells.map((c, i) => (
                      <td key={i} onClick={() => openDrill(r.key, model.colKeys[i], s.key)} className={"n " + heat(c)}>
                        {show(c)}
                      </td>
                    ))}
                    <td onClick={() => openDrill(r.key, null, s.key)} className="n" style={{ borderLeft: "var(--rule-hair)" }}>
                      {show(s.total)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            <tr className="tot">
              <td className="l mono-lbl">Total</td>
              {subDim !== "none" && <td />}
              {model.colTotals.map((c, i) => (
                <td key={i} className="n">
                  {show(c)}
                </td>
              ))}
              <td className="n commit" style={{ borderLeft: "var(--rule-hair)" }}>
                {show(model.grand)}
              </td>
            </tr>
          </tbody>
        </table>
        {model.rows.length === 0 && (
          <div className="sm" style={{ padding: "var(--space-7)" }}>
            No item in the current filter.
          </div>
        )}
      </div>

      {drill && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 30,
            display: "flex",
            justifyContent: "flex-end",
            background: "color-mix(in srgb, var(--color-neutral-900) 50%, transparent)",
          }}
          onClick={() => setDrill(null)}
        >
          <div
            className="panel"
            style={{ height: "100%", width: "100%", maxWidth: 560, overflowY: "auto", padding: "var(--space-4) var(--gutter)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                marginBottom: "var(--space-3)",
              }}
            >
              <div>
                <div className="mono-lbl">Items in cell</div>
                <h3 className="ttl" style={{ fontSize: "var(--text-title)", margin: 0 }}>
                  {drill.title}
                </h3>
              </div>
              <Btn onClick={() => setDrill(null)}>Close</Btn>
            </div>
            <table className="tbl">
              <tbody>
                {drill.list.map((i) => (
                  <tr key={i.id}>
                    <td className="mono-lbl">{TYPE_BY_ID[i.type].label}</td>
                    <td>{i.name}</td>
                    <td className="sm">{compName[i.componentId || "__none"]}</td>
                    <td>
                      <span className="tag tag-outline">{levelLabels?.[i.level]}</span>
                    </td>
                    <td className="r">{fmt(daysOf(i))} md</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="mono-lbl r">
                    Subtotal
                  </td>
                  <td className="r commit" style={{ paddingTop: 8 }}>
                    {fmt(drill.list.reduce((a, i) => a + daysOf(i), 0))} md
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
