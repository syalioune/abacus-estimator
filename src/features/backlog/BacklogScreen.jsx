import React, { useEffect, useRef, useState } from "react";
import { CONF, CONF_BY_ID, DIRS, LEVEL_BY_ID, TYPES, scaleKeyOf } from "../../domain/index.js";
import { Btn, Chip, ConfirmModal, Eyebrow, GrowText, MiniBtn, NumInput, Select, TagInput } from "../../ui/primitives.jsx";
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
  lots,
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
  /* Open bands, not closed ones: the room opens closed. A filled backlog is
     three hundred rows and you come to it for one component, so a band is shut
     until you say otherwise — and anything arriving later, an import or a new
     component, arrives shut too, with no bookkeeping to keep it that way. */
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [openSections, setOpenSections] = useState(() => new Set());
  const [openSubsystems, setOpenSubsystems] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null);

  const askConfirm = (message, run) => setConfirm({ message, run });

  const flip = (setter) => (key) =>
    setter((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  const toggleGroup = flip(setOpenGroups);
  const toggleSubsystem = flip(setOpenSubsystems);
  const toggleSection = flip(setOpenSections);
  const setSectionsOpen = (keys, open) =>
    setOpenSections((s) => {
      const n = new Set(s);
      keys.forEach((k) => (open ? n.add(k) : n.delete(k)));
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

  const subKeys = subsystemBuckets.map((b) => b.key);
  const groupKeys = groups.map((g) => g.key);
  const sectionKeys =
    groupBy === "component"
      ? groups.flatMap((g) => TYPES.filter((t) => g.rows.some((i) => i.type === t.id)).map((t) => `${g.key}:${t.id}`))
      : [];

  const collapseAll = () => {
    setOpenGroups(new Set());
    setOpenSubsystems(new Set());
    setOpenSections(new Set());
  };
  const expandAll = () => {
    setOpenGroups(new Set(groupKeys));
    setOpenSubsystems(new Set(subKeys));
    setOpenSections(new Set(sectionKeys));
  };

  /* A filter is already a narrowing: it opens what it found rather than leaving
     you to hunt through closed bands. Clearing it returns the room to closed. */
  const wasFiltering = useRef(filterActive);
  useEffect(() => {
    if (wasFiltering.current === filterActive) return;
    wasFiltering.current = filterActive;
    if (filterActive) expandAll();
    else collapseAll();
  });

  /* The lot only becomes a choice once there is a second one to move an item to. */
  const showLot = !shop && lots.length > 1;

  /* Column budget. Workshop drops direction, lot and the range: same table,
     same state, same widgets — only the type and the targets grow. Component
     and lot share one column, and the ladder shows initials in both postures,
     so the row keeps its own actions on screen instead of pushing them past
     the edge — and the name gets the room the ladder gave up. */
  const cols = [
    "minmax(200px, 1fr)",
    shop ? "170px" : null,
    "158px",
    shop ? null : "72px",
    shop ? "212px" : "176px",
    shop ? "150px" : "126px",
    shop ? "64px" : "54px",
    blind ? null : "72px",
    blind || shop ? null : "86px",
    "118px",
  ]
    .filter(Boolean)
    .join(" ");

  /* One depth ladder for the whole room: subsystem, component, kind of work,
     item. Without declared subsystems the whole table climbs one step. */
  const compDepth = useSubsystemGrouping ? 1 : 0;

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
          "--depth": compDepth + 2,
          background: on ? "var(--surface-subgroup)" : shop && it.reviewed ? "var(--heat-2)" : undefined,
        }}
      >
        <span onFocus={() => setSelected(it.id)} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <GrowText value={it.name} onChange={(v) => onUpd(it.id, { name: v })} label="Item name" />
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconComment style={{ color: "var(--text-tertiary)", flex: "none" }} title="Rationale" />
            <input
              value={it.note || ""}
              onChange={(e) => onUpd(it.id, { note: e.target.value })}
              placeholder="Add rationale for this level…"
              className="sm"
              style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, padding: 0, font: "inherit" }}
            />
          </span>
          <TagInput value={it.tags || []} onChange={(tags) => onUpd(it.id, { tags })} />
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

        {/* Where this item belongs, in one column: the component that totals it and
            the lot that scopes it. An item's lot is a decision that keeps moving,
            so it is editable here and not only at creation. */}
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="picked">Component</span>
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
          {showLot && (
            <>
              <span className="picked">Lot</span>
              <Select
                value={it.lotId}
                onChange={(v) => onUpd(it.id, { lotId: v })}
                style={{ width: "100%" }}
                title="Move this item to another lot — it changes which scenarios include it"
              >
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </>
          )}
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

        {/* The pickers show what you could choose; the line under each says what
            this item is, so a row is readable without decoding a highlight. */}
        <span onFocus={() => setSelected(it.id)} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Ladder
            scale={scales[scaleKeyOf(it)]}
            value={it.level}
            labels={levelLabels}
            blind={blind}
            compact
            onPick={(l) => {
              setSelected(it.id);
              onUpd(it.id, { level: l });
            }}
          />
          <span className="picked">
            Complexity
            <span className="v">{levelLabels[it.level] ?? LEVEL_BY_ID[it.level]?.label ?? it.level}</span>
          </span>
        </span>

        <span onFocus={() => setSelected(it.id)} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ConfPicker
            value={it.confidence}
            onChange={(v) => {
              setSelected(it.id);
              onUpd(it.id, { confidence: v });
            }}
            spreads={spreads}
          />
          <span
            className="picked"
            title="Confidence widens or narrows the range around the figure — it never moves the figure itself. Low confidence is the risk to argue about."
          >
            Confidence
            <span className={"v " + it.confidence}>{CONF_BY_ID[it.confidence]?.label ?? it.confidence}</span>
          </span>
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
        <div className="grouphd" style={{ "--depth": compDepth }}>
          <button
            type="button"
            onClick={() => toggleGroup(g.key)}
            className="btn-mini"
            title={openGroups.has(g.key) ? "Collapse" : "Expand"}
            style={{ flex: "none" }}
          >
            {openGroups.has(g.key) ? "▾" : "▸"}
          </button>
          <span className="mono-lbl" style={{ flex: "none" }}>
            {groupBy === "component" ? "Component" : "Kind"}
          </span>
          {groupBy === "component" && g.component ? (
            <>
              <span style={{ flex: "1 1 240px", minWidth: 0 }}>
                <GrowText
                  value={g.component.name}
                  onChange={(v) => onUpdComponent(g.component.id, { name: v })}
                  label="Component name"
                  className="ttl"
                  style={{ fontSize: "var(--text-subtitle)" }}
                />
              </span>
              <Select
                value={g.component.subsystemId || ""}
                onChange={(v) => onUpdComponent(g.component.id, { subsystemId: v || null })}
                title="Move this component to another subsystem"
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
            <span className="ttl" style={{ flex: "1 1 240px", minWidth: 0, fontSize: "var(--text-subtitle)" }}>
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
                  setOpenGroups((s) => (s.has(g.key) ? s : new Set([...s, g.key])));
                  setSectionsOpen(
                    sections.map((sec) => `${g.key}:${sec.key}`),
                    true,
                  );
                }}
                title="Expand every type band in this group"
              >
                expand all
              </MiniBtn>
              <MiniBtn
                onClick={() =>
                  setSectionsOpen(
                    sections.map((sec) => `${g.key}:${sec.key}`),
                    false,
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
              title={`Delete the component ${g.component.name} — its items become unassigned`}
              onClick={() =>
                askConfirm(`Delete ${g.component.name}? Its ${g.rows.length} items become unassigned.`, () =>
                  onDelComponent(g.component.id),
                )
              }
            >
              delete
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

        {!openGroups.has(g.key) ? null : g.rows.length === 0 ? (
          <div
            className="sm"
            style={{
              padding: "var(--space-3) var(--gutter)",
              paddingLeft: `calc(var(--gutter) + ${compDepth + 2} * var(--indent-step))`,
              borderBottom: "var(--rule-hair)",
            }}
          >
            Nothing attached yet. Add a feature, an API, a flow, a batch or a screen above.
          </div>
        ) : (
          sections.map((sec) => {
            const secKey = `${g.key}:${sec.key}`;
            const secOpen = openSections.has(secKey);
            return (
              <React.Fragment key={sec.key}>
                {sec.type && (
                  <div className="typehd" style={{ "--depth": compDepth + 1 }}>
                    <button
                      type="button"
                      onClick={() => toggleSection(secKey)}
                      className="btn-mini"
                      title={secOpen ? "Collapse" : "Expand"}
                      style={{ flex: "none" }}
                    >
                      {secOpen ? "▾" : "▸"}
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
                {secOpen && sec.rows.map(rowFor)}
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
        /* Docked at the foot of the window, not across the middle of it: a row's
           own actions live at the right-hand end and must stay clickable. */
        style={{ position: "fixed", right: "var(--space-6)", bottom: "var(--space-6)", zIndex: 40 }}
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
                const subOpen = openSubsystems.has(b.key);
                const subDays = sum(b.groups.flatMap((g) => g.rows));
                return (
                  <React.Fragment key={b.key}>
                    <div className="subhd" style={{ "--depth": 0 }}>
                      <button
                        type="button"
                        onClick={() => toggleSubsystem(b.key)}
                        className="btn-mini"
                        title={subOpen ? "Collapse" : "Expand"}
                        style={{ flex: "none" }}
                      >
                        {subOpen ? "▾" : "▸"}
                      </button>
                      <span className="mono-lbl" style={{ flex: "none" }}>
                        Subsystem
                      </span>
                      <span className="ttl" style={{ flex: "1 1 240px", minWidth: 0, fontSize: "var(--text-title)" }}>
                        {b.subsystem ? b.subsystem.name : "No subsystem"}
                      </span>
                      <span className="num sm">
                        {b.groups.length} component{b.groups.length === 1 ? "" : "s"}
                        {blind ? "" : ` · ${fmt(subDays)} md`}
                      </span>
                    </div>
                    {subOpen && b.groups.map(renderGroup)}
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
