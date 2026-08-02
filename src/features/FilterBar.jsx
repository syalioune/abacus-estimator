import React from "react";
import { CONF, DIRS, LEVELS, TYPES } from "../domain/index.js";
import { Btn, Chip, Select } from "../ui/primitives.jsx";

export function FilterBar({
  q,
  setQ,
  fTypes,
  setFTypes,
  fLevels,
  setFLevels,
  fConf,
  setFConf,
  fDirs,
  setFDirs,
  fComp,
  setFComp,
  fSub,
  setFSub,
  fTags,
  setFTags,
  fReviewed,
  setFReviewed,
  components,
  compName,
  subsystems,
  tags,
  count,
  total,
  onClear,
  filterActive,
  levelLabels,
}) {
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <div
      className="panel"
      style={{
        marginBottom: "var(--space-5)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: "var(--space-4)",
        rowGap: "var(--space-2)",
        padding: "var(--space-2) var(--gutter)",
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, tags, note"
        className="mini"
        style={{ width: 190, flex: "none" }}
      />
      <div style={{ display: "flex", gap: 3 }}>
        {TYPES.map((t) => (
          <Chip key={t.id} on={fTypes.includes(t.id)} onClick={() => toggle(fTypes, setFTypes, t.id)}>
            {t.plural}
          </Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {LEVELS.map((l) => (
          <Chip key={l.id} on={fLevels.includes(l.id)} onClick={() => toggle(fLevels, setFLevels, l.id)}>
            {levelLabels?.[l.id] ?? l.label}
          </Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {DIRS.map((d) => (
          <Chip key={d.id} on={fDirs.includes(d.id)} onClick={() => toggle(fDirs, setFDirs, d.id)}>
            {d.label}
          </Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {CONF.map((c) => (
          <Chip key={c.id} on={fConf.includes(c.id)} onClick={() => toggle(fConf, setFConf, c.id)}>
            {c.label} conf.
          </Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        <Chip on={fReviewed.includes("yes")} onClick={() => toggle(fReviewed, setFReviewed, "yes")}>
          Reviewed
        </Chip>
        <Chip on={fReviewed.includes("no")} onClick={() => toggle(fReviewed, setFReviewed, "no")}>
          Not reviewed
        </Chip>
      </div>
      {subsystems.length > 0 && (
        <Select value={fSub} onChange={setFSub}>
          <option value="">All subsystems</option>
          <option value="__none">No subsystem</option>
          {subsystems.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </Select>
      )}
      <Select value={fComp} onChange={setFComp}>
        <option value="">All components</option>
        <option value="__none">Unassigned</option>
        {components.map((c) => (
          <option key={c.id} value={c.id}>
            {compName[c.id]}
          </option>
        ))}
      </Select>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {tags.map((t) => (
            <Chip key={t} on={fTags.includes(t)} onClick={() => toggle(fTags, setFTags, t)}>
              {t}
            </Chip>
          ))}
        </div>
      )}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span className="mono-lbl num">
          {count} / {total} items
        </span>
        {filterActive && <Btn onClick={onClear}>Clear filters</Btn>}
      </div>
    </div>
  );
}

/* The backlog — the room where items are argued and sized. Components hold
   nothing themselves; their kind sections do. Bands and rules, not cards. */
