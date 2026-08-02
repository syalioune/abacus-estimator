import React, { useEffect, useState } from "react";
import { CONF, DIRS, TYPES, scaleKeyOf } from "../../domain/index.js";
import { Btn, Chip, ConfirmModal, Eyebrow, MiniBtn, NumInput, Select, TagInput } from "../../ui/primitives.jsx";
import { ConfDot, ConfPicker, Ladder, MixBar } from "../../ui/estimating.jsx";
import { fmt } from "../../ui/format.js";
import { IconComment, IconCopy, IconPlus, IconTrash } from "../../ui/icons.jsx";

/* The backlog — the room where items are argued and sized. Components hold
   nothing themselves; their kind sections do. Bands and rules, not cards. */
export function Backlog({
  blind,
  setBlind,
  posture,
  setPosture,
  items,
  components,
  compName,
  subsystems,
  scales,
  spreads,
  levelLabels,
  daysOf,
  effOf,
  sum,
  pert,
  filterActive,
  onUpd,
  onDel,
  onDup,
  onUpdComponent,
  onDelComponent,
  onAttachAll,
  onOpenAdd,
}) {
  const [groupBy, setGroupBy] = useState("component");
  const [attachTo, setAttachTo] = useState("");
  const [selected, setSelected] = useState(null);
  const [closedGroups, setClosedGroups] = useState(() => new Set());
  const [closedSections, setClosedSections] = useState(() => new Set());
  const [closedSubsystems, setClosedSubsystems] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null);

  const askConfirm = (message, run) => setConfirm({ message, run });

  const toggleGroup = (key) =>
    setClosedGroups((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  const toggleSubsystem = (key) =>
    setClosedSubsystems((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  const toggleSection = (key) =>
    setClosedSections((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  const setSectionsClosed = (keys, closed) =>
    setClosedSections((s) => {
      const n = new Set(s);
      keys.forEach((k) => (closed ? n.add(k) : n.delete(k)));
      return n;
    });

  const total = sum(items);
  const unassigned = items.filter((i) => !i.componentId || !components.some((c) => c.id === i.componentId));
  const shop = posture === "workshop";

  /* Workshop is a group review: numbers stay hidden by default so the room
     argues the rung, not the day count. Prepare has no audience, so the
     figures come back the moment you leave the workshop. */
  useEffect(() => {
    setBlind(shop);
  }, [shop, setBlind]);

  const groups =
    groupBy === "component"
      ? [
          ...components.map((c) => ({ key: c.id, component: c, rows: items.filter((i) => i.componentId === c.id) })),
          ...(unassigned.length ? [{ key: "__none", component: null, rows: unassigned }] : []),
        ].filter((g) => g.rows.length > 0 || (!filterActive && g.component))
      : TYPES.map((t) => ({ key: t.id, type: t, rows: items.filter((i) => i.type === t.id) })).filter((g) => g.rows.length);

  /* Components band together under their subsystem once at least one is declared —
     otherwise the extra band is pure overhead for the common, subsystem-less case. */
  const useSubsystemGrouping = groupBy === "component" && subsystems.length > 0;
  const noneGroup = groups.find((g) => g.key === "__none") || null;
  const subsystemBuckets = useSubsystemGrouping
    ? [
        ...subsystems.map((s) => ({
          key: `sub:${s.id}`,
          subsystem: s,
          groups: groups.filter((g) => g.component && g.component.subsystemId === s.id),
        })),
        {
          key: "sub:__none",
          subsystem: null,
          groups: groups.filter((g) => g.component && !g.component.subsystemId),
        },
      ].filter((b) => b.groups.length > 0)
    : [];

  const collapseAll = () => {
    setClosedGroups(new Set(groups.map((g) => g.key)));
    setClosedSubsystems(new Set(subsystemBuckets.map((b) => b.key)));
    setClosedSections(
      new Set(
        groupBy === "component"
          ? groups.flatMap((g) => TYPES.filter((t) => g.rows.some((i) => i.type === t.id)).map((t) => `${g.key}:${t.id}`))
          : [],
      ),
    );
  };
  const expandAll = () => {
    setClosedGroups(new Set());
    setClosedSubsystems(new Set());
    setClosedSections(new Set());
  };

  /* Column budget. Workshop drops direction, lot and the range: same table,
     same state, same widgets — only the type and the targets grow. */
  const cols = [
    "minmax(200px, 1fr)",
    shop ? "170px" : null,
    "150px",
    shop ? null : "78px",
    shop ? "minmax(220px, 1fr)" : "300px",
    shop ? "150px" : "108px",
    "54px",
    blind ? null : "76px",
    blind || shop ? null : "92px",
    "132px",
  ]
    .filter(Boolean)
    .join(" ");

  const sel = items.find((i) => i.id === selected) || items[0] || null;

  const rowFor = (it) => {
    const eff = effOf(it);
    const sp = spreads[it.confidence] || spreads.M;
    const on = sel && sel.id === it.id;
    return (
      <div
        key={it.id}
        className="row"
        style={{
          gridTemplateColumns: cols,
          background: on ? "var(--surface-subgroup)" : shop && it.reviewed ? "var(--heat-2)" : undefined,
        }}
      >
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <input
            value={it.name}
            onFocus={() => setSelected(it.id)}
            onChange={(e) => onUpd(it.id, { name: e.target.value })}
            style={{ width: "100%", background: "transparent", border: 0, padding: 0, font: "inherit", color: "inherit" }}
          />
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconComment style={{ color: "var(--text-tertiary)", flex: "none" }} title="Rationale" />
            <input
              value={it.note || ""}
              onFocus={() => setSelected(it.id)}
              onChange={(e) => onUpd(it.id, { note: e.target.value })}
              placeholder="Add rationale for this level…"
              className="sm"
              style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, padding: 0, font: "inherit" }}
            />
          </span>
          <span onFocus={() => setSelected(it.id)}>
            <TagInput value={it.tags || []} onChange={(tags) => onUpd(it.id, { tags })} />
          </span>
        </span>

        {shop && (
          <span>
            <MiniBtn
              onClick={() => onUpd(it.id, { reviewed: !it.reviewed })}
              title={it.reviewed ? "Mark as not reviewed" : "Mark as reviewed"}
            >
              {it.reviewed ? "✓ reviewed" : "mark reviewed"}
            </MiniBtn>
          </span>
        )}

        <span>
          <Select
            value={it.componentId || ""}
            onChange={(v) => onUpd(it.id, { componentId: v || null })}
            style={{ width: "100%" }}
            title="Reassign to another component"
          >
            <option value="">Unassigned</option>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {compName[c.id]}
              </option>
            ))}
          </Select>
        </span>

        {!shop && (
          <span className="c-dir">
            {it.type === "API" ? (
              <span className="seg dir">
                {DIRS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    title={
                      d.id === "EXPOSED"
                        ? "Exposed — you publish the contract and own its compatibility"
                        : "Consumed — someone else publishes it, you integrate against it"
                    }
                    onClick={() => onUpd(it.id, { direction: d.id })}
                    className={"seg-opt" + ((it.direction || "EXPOSED") === d.id ? " on" : "")}
                  >
                    {d.short}
                  </button>
                ))}
              </span>
            ) : (
              <span style={{ color: "var(--text-disabled)" }}>—</span>
            )}
          </span>
        )}

        <span onFocus={() => setSelected(it.id)}>
          <Ladder
            scale={scales[scaleKeyOf(it)]}
            value={it.level}
            labels={levelLabels}
            blind={blind}
            onPick={(l) => {
              setSelected(it.id);
              onUpd(it.id, { level: l });
            }}
          />
        </span>

        <span onFocus={() => setSelected(it.id)}>
          <ConfPicker
            value={it.confidence}
            onChange={(v) => {
              setSelected(it.id);
              onUpd(it.id, { confidence: v });
            }}
            spreads={spreads}
          />
        </span>

        <span className="r">
          <NumInput value={it.qty} onChange={(v) => onUpd(it.id, { qty: v })} width={40} />
        </span>

        {!blind && (
          <span className="num r">
            {fmt(daysOf(it))} md
            {eff.saved > 0 && (
              <span className="commit" title={`Gross ${fmt(eff.gross)} md, mutualised with the other items of its pool`}>
                {" "}
                ▼
              </span>
            )}
          </span>
        )}

        {!blind && !shop && (
          <span className="num r sm c-range">
            {fmt(daysOf(it) * sp.min)}–{fmt(daysOf(it) * sp.max)}
          </span>
        )}

        <span style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
          <MiniBtn onClick={() => onDup(it.id)} title="Duplicate" icon={<IconCopy />}>
            dup
          </MiniBtn>
          <MiniBtn
            onClick={() => askConfirm(`Delete "${it.name}"? This cannot be undone.`, () => onDel(it.id))}
            title="Delete"
            danger
            icon={<IconTrash />}
          >
            del
          </MiniBtn>
        </span>
      </div>
    );
  };

  const renderGroup = (g) => {
    const gDays = sum(g.rows);
    const mix = TYPES.map((t) => ({ ...t, days: sum(g.rows.filter((i) => i.type === t.id)) }));
    const sections =
      groupBy === "component"
        ? TYPES.map((t) => ({ key: t.id, type: t, rows: g.rows.filter((i) => i.type === t.id) })).filter((x) => x.rows.length)
        : [{ key: "all", type: null, rows: g.rows }];
    return (
      <React.Fragment key={g.key}>
        <div className="grouphd">
          <button
            type="button"
            onClick={() => toggleGroup(g.key)}
            className="btn-mini"
            title={closedGroups.has(g.key) ? "Expand" : "Collapse"}
            style={{ flex: "none" }}
          >
            {closedGroups.has(g.key) ? "▸" : "▾"}
          </button>
          {groupBy === "component" && g.component ? (
            <>
              <input
                value={g.component.name}
                onChange={(e) => onUpdComponent(g.component.id, { name: e.target.value })}
                className="ttl"
                style={{
                  flex: "none",
                  width: 220,
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  fontSize: "var(--text-subtitle)",
                  color: "inherit",
                }}
              />
              <Select
                value={g.component.subsystemId || ""}
                onChange={(v) => onUpdComponent(g.component.id, { subsystemId: v || null })}
              >
                <option value="">No subsystem</option>
                {subsystems.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <span className="ttl" style={{ fontSize: "var(--text-subtitle)" }}>
              {groupBy === "component" ? "Unassigned" : g.type.plural}
            </span>
          )}
          <span className="num sm">
            {g.rows.length} items{blind ? "" : ` · ${fmt(gDays)} md · P80 ${fmt(pert(g.rows).p80)} md`}
          </span>
          {shop &&
            g.rows.length > 0 &&
            (() => {
              const done = g.rows.filter((r) => r.reviewed).length;
              return (
                <span className={"reviewed-badge num " + (done === g.rows.length ? "done" : "pending")}>
                  {done}/{g.rows.length} reviewed
                </span>
              );
            })()}
          {sections.length > 0 && (
            <span style={{ display: "flex", gap: 3 }}>
              <MiniBtn
                onClick={() => {
                  setClosedGroups((s) => {
                    if (!s.has(g.key)) return s;
                    const n = new Set(s);
                    n.delete(g.key);
                    return n;
                  });
                  setSectionsClosed(
                    sections.map((sec) => `${g.key}:${sec.key}`),
                    false,
                  );
                }}
                title="Expand every type band in this group"
              >
                expand all
              </MiniBtn>
              <MiniBtn
                onClick={() =>
                  setSectionsClosed(
                    sections.map((sec) => `${g.key}:${sec.key}`),
                    true,
                  )
                }
                title="Collapse every type band in this group"
              >
                collapse all
              </MiniBtn>
            </span>
          )}
          {g.key === "__none" && g.rows.length > 0 && (
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span className="mono-lbl">Attach all to</span>
              <Select value={attachTo} onChange={setAttachTo}>
                <option value="">Pick a component</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {compName[c.id]}
                  </option>
                ))}
              </Select>
              <Btn
                onClick={() => {
                  if (!attachTo) return;
                  onAttachAll(
                    g.rows.map((r) => r.id),
                    attachTo,
                  );
                  setAttachTo("");
                }}
              >
                Attach
              </Btn>
            </span>
          )}
          {groupBy === "component" && g.component && (
            <MiniBtn
              danger
              icon={<IconTrash />}
              onClick={() =>
                askConfirm(`Delete ${g.component.name}? Its ${g.rows.length} items become unassigned.`, () =>
                  onDelComponent(g.component.id),
                )
              }
            >
              delete component
            </MiniBtn>
          )}
          {groupBy === "component" && !blind && gDays > 0 && (
            <span style={{ width: "100%", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <MixBar parts={mix} total={gDays} />
              <span className="mono-lbl num" style={{ flex: "none" }}>
                {mix
                  .filter((m) => m.days)
                  .map((m) => `${m.label} ${fmt(m.days)}`)
                  .join(" · ")}
              </span>
            </span>
          )}
        </div>

        {closedGroups.has(g.key) ? null : g.rows.length === 0 ? (
          <div className="sm" style={{ padding: "var(--space-3) var(--gutter)", borderBottom: "var(--rule-hair)" }}>
            Nothing attached yet. Add a feature, an API, a flow, a batch or a screen above.
          </div>
        ) : (
          sections.map((sec) => {
            const secKey = `${g.key}:${sec.key}`;
            const secClosed = closedSections.has(secKey);
            return (
              <React.Fragment key={sec.key}>
                {sec.type && (
                  <div className="typehd">
                    <button
                      type="button"
                      onClick={() => toggleSection(secKey)}
                      className="btn-mini"
                      title={secClosed ? "Expand" : "Collapse"}
                      style={{ flex: "none" }}
                    >
                      {secClosed ? "▸" : "▾"}
                    </button>
                    <span
                      style={{
                        flex: "none",
                        fontSize: "var(--text-label)",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--color-neutral-800)",
                      }}
                    >
                      {sec.type.plural}
                    </span>
                    <span className="num" style={{ flex: "none", fontSize: "var(--text-small)", color: "var(--text-tertiary)" }}>
                      {sec.rows.length}
                      {blind ? "" : ` · ${fmt(sum(sec.rows))} md`}
                    </span>
                    <span
                      className="sm"
                      style={{
                        marginLeft: "auto",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {sec.type.hint}
                    </span>
                  </div>
                )}
                {!secClosed && sec.rows.map(rowFor)}
              </React.Fragment>
            );
          })
        )}
      </React.Fragment>
    );
  };

  return (
    <section>
      {/* posture, legend, blind sizing */}
      <div
        className="panel"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-4)",
          padding: "var(--space-3) var(--gutter)",
          marginBottom: "var(--space-4)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span className="mono-lbl">Posture</span>
          <span className="seg">
            {[
              ["prepare", "Prepare"],
              ["workshop", "Workshop"],
            ].map(([v, label]) => (
              <button key={v} type="button" onClick={() => setPosture(v)} className={"seg-opt" + (posture === v ? " on" : "")}>
                {label}
              </button>
            ))}
          </span>
          <span className="sm" style={{ maxWidth: 340 }}>
            {shop
              ? "Same table, same state, larger type and targets."
              : "Dense rows, every dimension in reach. Nobody is watching."}
          </span>
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {CONF.map((c) => (
              <ConfDot key={c.id} value={c.id} label={c.label} />
            ))}
          </span>
          <Chip on={blind} onClick={() => setBlind(!blind)}>
            {blind ? "Blind sizing — on" : "Blind sizing"}
          </Chip>
        </span>
      </div>

      <Eyebrow
        right={
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", gap: 3 }}>
              <Chip on={groupBy === "component"} onClick={() => setGroupBy("component")}>
                By component
              </Chip>
              <Chip on={groupBy === "type"} onClick={() => setGroupBy("type")}>
                By type
              </Chip>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              <MiniBtn onClick={expandAll} title="Expand every component and type band">
                expand all
              </MiniBtn>
              <MiniBtn onClick={collapseAll} title="Collapse every component and type band">
                collapse all
              </MiniBtn>
            </div>
            <span className="mono-lbl num">{blind ? `${items.length} items listed` : `${fmt(total)} md listed`}</span>
          </div>
        }
      >
        Scope
      </Eyebrow>

      {/* always-reachable add: floating trigger, never scrolls away */}
      <button
        type="button"
        className="btn btn-primary btn-fab"
        onClick={() => onOpenAdd("item")}
        title="Add a feature, API, flow, batch, screen, component, subsystem or lot"
        style={{
          position: "fixed",
          right: "var(--space-6)",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 40,
        }}
      >
        <IconPlus />
        Add
      </button>

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

      {groups.length === 0 ? (
        <div className="panel" style={{ padding: "var(--space-7) var(--gutter)" }}>
          <p className="mono-lbl">{filterActive ? "No item matches these filters" : "Nothing listed yet"}</p>
          <p className="prose" style={{ margin: 0, maxWidth: 560 }}>
            {filterActive
              ? "Clear the filters to see the full backlog."
              : "Declare the components first, then attach features, APIs, flows, batches and screens to them. Load the example project from the Data room to see the shape of a filled backlog."}
          </p>
        </div>
      ) : (
        <div className={"panel backlog" + (shop ? " shop" : "")}>
          {useSubsystemGrouping
            ? subsystemBuckets.map((b) => {
                const subClosed = closedSubsystems.has(b.key);
                const subDays = sum(b.groups.flatMap((g) => g.rows));
                return (
                  <React.Fragment key={b.key}>
                    <div className="subhd">
                      <button
                        type="button"
                        onClick={() => toggleSubsystem(b.key)}
                        className="btn-mini"
                        title={subClosed ? "Expand" : "Collapse"}
                        style={{ flex: "none" }}
                      >
                        {subClosed ? "▸" : "▾"}
                      </button>
                      <span className="ttl" style={{ fontSize: "var(--text-title)" }}>
                        {b.subsystem ? b.subsystem.name : "No subsystem"}
                      </span>
                      <span className="num sm">
                        {b.groups.length} component{b.groups.length === 1 ? "" : "s"}
                        {blind ? "" : ` · ${fmt(subDays)} md`}
                      </span>
                    </div>
                    {!subClosed && b.groups.map(renderGroup)}
                  </React.Fragment>
                );
              })
            : groups.map(renderGroup)}
          {useSubsystemGrouping && noneGroup && renderGroup(noneGroup)}
        </div>
      )}
    </section>
  );
}
