import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeDays,
  applyRatios,
  emptyEstimate,
  exampleData,
  migrate,
  pertOf,
  scaleKeyOf,
  DEFAULT_MUT,
  DEFAULT_SCALES,
  DEFAULT_SPREADS,
} from "./domain/index.js";
import * as A from "./state/actions.js";
import { STORAGE_KEY, detectStorage, loadEstimate, saveEstimate } from "./state/storage.js";
import { Figure, Select } from "./ui/primitives.jsx";
import { fmt } from "./ui/format.js";
import { FilterBar } from "./features/FilterBar.jsx";
import { AddModal } from "./features/AddModal.jsx";
import { Home } from "./features/home/HomeScreen.jsx";
import { Backlog } from "./features/backlog/BacklogScreen.jsx";
import { Abacus } from "./features/abacus/AbacusScreen.jsx";
import { Pivot } from "./features/crosstable/CrossTableScreen.jsx";
import { ScenarioBoard } from "./features/scenarios/ScenariosScreen.jsx";
import { Effort } from "./features/effort/EffortScreen.jsx";
import { DataTab } from "./features/data/DataScreen.jsx";
import "./ui/styles/app.css";

const storage = detectStorage();

export default function App() {
  const [state, setState] = useState(emptyEstimate);
  const [tab, setTab] = useState("home");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState("item");

  const [q, setQ] = useState("");
  const [fTypes, setFTypes] = useState([]);
  const [fLevels, setFLevels] = useState([]);
  const [fConf, setFConf] = useState([]);
  const [fDirs, setFDirs] = useState([]);
  const [fComp, setFComp] = useState("");
  const [fSub, setFSub] = useState("");
  const [fTags, setFTags] = useState([]);
  const [fReviewed, setFReviewed] = useState([]);
  const [scoped, setScoped] = useState(false);
  const [activeScenario, setActiveScenario] = useState("__all");
  const [blind, setBlind] = useState(false);
  const [posture, setPosture] = useState("prepare");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await loadEstimate(storage, STORAGE_KEY);
        if (alive && stored) setState(migrate(stored));
      } catch {
        /* first run: nothing stored yet */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => (alive = false);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveEstimate(storage, state, STORAGE_KEY);
    }, 400);
    return () => clearTimeout(t);
  }, [state, loaded]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const patch = (p) => setState((s) => ({ ...s, ...p }));

  const compName = useMemo(() => {
    const m = { __none: "Unassigned" };
    state.components.forEach((c) => (m[c.id] = c.name || "(unnamed)"));
    return m;
  }, [state.components]);
  const subName = useMemo(
    () => Object.fromEntries(state.subsystems.map((x) => [x.id, x.name || "(unnamed)"])),
    [state.subsystems],
  );
  const compSub = useMemo(
    () => Object.fromEntries(state.components.map((c) => [c.id, c.subsystemId || null])),
    [state.components],
  );
  const tags = useMemo(() => Array.from(new Set(state.items.flatMap((i) => i.tags || []))).sort(), [state.items]);

  const unitDays = useCallback((it) => state.scales[scaleKeyOf(it)]?.[it.level]?.days ?? 0, [state.scales]);
  const daysMapFor = useCallback((list) => computeDays(list, unitDays, state.mut), [unitDays, state.mut]);

  const activeLots = useMemo(() => {
    if (activeScenario === "__all") return null;
    const sc = state.scenarios.find((s) => s.id === activeScenario);
    return sc ? new Set(sc.lotIds) : null;
  }, [activeScenario, state.scenarios]);
  const scenarioItems = useMemo(
    () => (activeLots ? state.items.filter((i) => activeLots.has(i.lotId)) : state.items),
    [state.items, activeLots],
  );
  const hiddenByScenario = state.items.length - scenarioItems.length;

  /* Mutualisation is a property of the set, so it is resolved once over the whole
     scenario. Filtering the view afterwards never re-prices what is left. */
  const dayMap = useMemo(() => daysMapFor(scenarioItems), [daysMapFor, scenarioItems]);
  const effOf = useCallback(
    (it) =>
      dayMap.get(it.id) || {
        per: unitDays(it),
        gross: unitDays(it) * (it.qty || 0),
        net: unitDays(it) * (it.qty || 0),
        saved: 0,
        discounted: 0,
      },
    [dayMap, unitDays],
  );
  const daysOf = useCallback((it) => effOf(it).net, [effOf]);
  const sum = useCallback((list) => list.reduce((a, i) => a + daysOf(i), 0), [daysOf]);
  const sumGross = useCallback((list) => list.reduce((a, i) => a + effOf(i).gross, 0), [effOf]);
  const pert = useCallback((list) => pertOf(list, daysOf, state.spreads), [daysOf, state.spreads]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scenarioItems.filter((i) => {
      if (fTypes.length && !fTypes.includes(i.type)) return false;
      if (fLevels.length && !fLevels.includes(i.level)) return false;
      if (fConf.length && !fConf.includes(i.confidence)) return false;
      if (fDirs.length && !(i.type === "API" && fDirs.includes(i.direction || "EXPOSED"))) return false;
      if (fComp && (i.componentId || "__none") !== fComp) return false;
      if (fSub && (compSub[i.componentId] || "__none") !== fSub) return false;
      if (fTags.length && !(i.tags || []).some((t) => fTags.includes(t))) return false;
      if (fReviewed.length && !fReviewed.includes(i.reviewed ? "yes" : "no")) return false;
      if (needle && !`${i.name} ${(i.tags || []).join(" ")} ${i.note}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [scenarioItems, q, fTypes, fLevels, fConf, fDirs, fComp, fSub, compSub, fTags, fReviewed]);

  const filterActive =
    q.trim() !== "" ||
    fTypes.length > 0 ||
    fLevels.length > 0 ||
    fConf.length > 0 ||
    fDirs.length > 0 ||
    fComp !== "" ||
    fSub !== "" ||
    fTags.length > 0 ||
    fReviewed.length > 0;
  const scopeItems = scoped && filterActive ? filtered : scenarioItems;

  const devDays = useMemo(() => sum(scenarioItems), [scenarioItems, sum]);
  const scopeDays = useMemo(() => sum(scopeItems), [scopeItems, sum]);
  const scopeGross = useMemo(() => sumGross(scopeItems), [scopeItems, sumGross]);
  const scopePert = useMemo(() => pert(scopeItems), [scopeItems, pert]);
  const ratioLines = useMemo(() => applyRatios(state.ratios, scopeDays), [state.ratios, scopeDays]);
  const totalP80 = scopePert.p80 * ratioLines.factor;

  /* ---------- operations ---------- */
  /* Every mutation rule — an item always belongs to a lot, deleting a
     component never deletes its work — is stated once in state/actions.js.
     These are thin setState wrappers around it, not a second copy of it. */
  const addSubsystem = (name) => setState((s) => A.addSubsystem(s, name));
  const updSubsystem = (id, p) => setState((s) => A.updateSubsystem(s, id, p));
  const delSubsystem = (id) => setState((s) => A.removeSubsystem(s, id));

  const addComponent = (name) => setState((s) => A.addComponent(s, name));
  const updComponent = (id, p) => setState((s) => A.updateComponent(s, id, p));
  const delComponent = (id) => setState((s) => A.removeComponent(s, id));

  const addItem = (draft) => setState((s) => A.addItem(s, draft));
  const updItem = (id, p) => setState((s) => A.updateItem(s, id, p));
  const attachAll = (ids, componentId) => setState((s) => A.attachItems(s, ids, componentId));
  const delItem = (id) => setState((s) => A.removeItem(s, id));
  const dupItem = (id) => setState((s) => A.duplicateItem(s, id));

  const addLot = (name) => setState((s) => A.addLot(s, name));
  const updLot = (id, p) => setState((s) => A.updateLot(s, id, p));
  const delLot = (id) => setState((s) => A.removeLot(s, id));
  const addScenario = () => setState((s) => A.addScenario(s));
  const updScenario = (id, p) => setState((s) => A.updateScenario(s, id, p));
  const delScenario = (id) => setState((s) => A.removeScenario(s, id));

  const openAdd = (t) => {
    setAddTab(t);
    setAddOpen(true);
  };

  const tabs = [
    ["home", "Home"],
    ["backlog", "Backlog"],
    ["abacus", "Abacus"],
    ["pivot", "Cross table"],
    ["scenarios", "Scenarios"],
    ["effort", "Effort"],
    ["data", "Data"],
  ];

  return (
    <div className="es">
      <header style={{ borderBottom: "var(--rule-strong)", background: "var(--color-surface)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "var(--space-5) var(--gutter) 0" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "var(--space-6)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="mono-lbl">Development effort</div>
              <input
                value={state.project}
                onChange={(e) => setState((s) => A.setProject(s, e.target.value))}
                className="ttl"
                style={{
                  width: "100%",
                  maxWidth: 560,
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  fontSize: "var(--text-figure-xl)",
                  color: "inherit",
                }}
              />
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span className="mono-lbl">Scope</span>
                <Select value={activeScenario} onChange={setActiveScenario}>
                  <option value="__all">All lots</option>
                  {state.scenarios.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </Select>
                {hiddenByScenario > 0 && <span className="mono-lbl">{hiddenByScenario} items out of scope</span>}
              </div>
            </div>
            {blind && tab === "backlog" ? (
              <div className="mono-lbl" style={{ paddingBottom: "var(--space-2)" }}>
                Blind sizing — figures hidden
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: "var(--space-7)",
                  paddingBottom: "var(--space-2)",
                }}
              >
                <Figure label="Development" value={`${fmt(devDays)} md`} />
                <Figure
                  label={scoped && filterActive ? "Total, filtered" : "Total, likely"}
                  value={`${fmt(ratioLines.total)} md`}
                />
                <Figure label="Total, P80" value={`${fmt(totalP80)} md`} commit note="Commit here" />
              </div>
            )}
          </div>

          <nav className="tabbar" style={{ marginTop: "var(--space-5)" }}>
            {tabs.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={"tabbtn" + (tab === id ? " on" : "")}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "var(--space-6) var(--gutter)" }}>
        {(tab === "backlog" || tab === "pivot") && (
          <FilterBar
            {...{
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
              compName,
              tags,
              filterActive,
            }}
            subsystems={state.subsystems}
            components={state.components}
            count={filtered.length}
            total={scenarioItems.length}
            levelLabels={state.levelLabels}
            onClear={() => {
              setQ("");
              setFTypes([]);
              setFLevels([]);
              setFConf([]);
              setFDirs([]);
              setFComp("");
              setFSub("");
              setFTags([]);
              setFReviewed([]);
            }}
          />
        )}

        {tab === "home" && (
          <Home state={state} devDays={devDays} totalLikely={ratioLines.total} totalP80={totalP80} onOpenAdd={openAdd} />
        )}

        {tab === "backlog" && (
          <Backlog
            blind={blind}
            setBlind={setBlind}
            posture={posture}
            setPosture={setPosture}
            items={filtered}
            components={state.components}
            compName={compName}
            subsystems={state.subsystems}
            scales={state.scales}
            spreads={state.spreads}
            levelLabels={state.levelLabels}
            daysOf={daysOf}
            effOf={effOf}
            sum={sum}
            pert={pert}
            filterActive={filterActive}
            onUpd={updItem}
            onDel={delItem}
            onDup={dupItem}
            onUpdComponent={updComponent}
            onDelComponent={delComponent}
            onAttachAll={attachAll}
            onOpenAdd={openAdd}
          />
        )}

        {tab === "abacus" && (
          <Abacus
            scales={state.scales}
            spreads={state.spreads}
            mut={state.mut}
            levelLabels={state.levelLabels}
            items={scenarioItems}
            sum={sum}
            grossOf={(it) => effOf(it).gross}
            onScale={(type, level, p) => setState((s) => A.setScale(s, type, level, p))}
            onSpread={(conf, p) => setState((s) => A.setSpread(s, conf, p))}
            onMut={(key, p) => setState((s) => A.setMut(s, key, p))}
            onLevelLabel={(id, v) => setState((s) => A.setLevelLabel(s, id, v))}
            onReset={() => patch({ scales: DEFAULT_SCALES, spreads: DEFAULT_SPREADS, mut: DEFAULT_MUT })}
          />
        )}

        {tab === "pivot" && (
          <Pivot
            items={filtered}
            components={state.components}
            compName={compName}
            compSub={compSub}
            subName={subName}
            subsystems={state.subsystems}
            lots={state.lots}
            levelLabels={state.levelLabels}
            daysOf={daysOf}
            pert={pert}
            flash={flash}
          />
        )}

        {tab === "scenarios" && (
          <ScenarioBoard
            items={state.items}
            lots={state.lots}
            scenarios={state.scenarios}
            baselineId={state.baselineId}
            ratios={state.ratios}
            spreads={state.spreads}
            daysMapFor={daysMapFor}
            activeScenario={activeScenario}
            setActiveScenario={setActiveScenario}
            onAddLot={addLot}
            onUpdLot={updLot}
            onDelLot={delLot}
            onAddScenario={addScenario}
            onUpdScenario={updScenario}
            onDelScenario={delScenario}
            onBaseline={(id) => setState((s) => A.setBaseline(s, id))}
          />
        )}

        {tab === "effort" && (
          <Effort
            scopeItems={scopeItems}
            components={state.components}
            compName={compName}
            sum={sum}
            scopeDays={scopeDays}
            scopeGross={scopeGross}
            scopePert={scopePert}
            spreads={state.spreads}
            ratioLines={ratioLines}
            scoped={scoped}
            setScoped={setScoped}
            filterActive={filterActive}
            onRatio={(id, p) => setState((s) => A.updateRatio(s, id, p))}
            onAddRatio={() => setState((s) => A.addRatio(s))}
            onDelRatio={(id) => setState((s) => A.removeRatio(s, id))}
          />
        )}

        {tab === "data" && (
          <DataTab
            state={state}
            setState={setState}
            daysOf={daysOf}
            grossOf={(it) => effOf(it).gross}
            compName={compName}
            flash={flash}
            onExample={() => {
              setState((s) => ({ ...s, project: s.project === "New project" ? "Order platform" : s.project, ...exampleData() }));
              setActiveScenario("__all");
            }}
            onReset={() => {
              setState(emptyEstimate());
              setActiveScenario("__all");
            }}
          />
        )}
      </main>

      <AddModal
        open={addOpen}
        tab={addTab}
        onTabChange={setAddTab}
        onClose={() => setAddOpen(false)}
        components={state.components}
        subsystems={state.subsystems}
        lots={state.lots}
        compName={compName}
        scales={state.scales}
        spreads={state.spreads}
        levelLabels={state.levelLabels}
        blind={blind}
        onAdd={addItem}
        onAddComponent={addComponent}
        onAddSubsystem={addSubsystem}
        onUpdSubsystem={updSubsystem}
        onDelSubsystem={delSubsystem}
        onAddLot={addLot}
      />

      {toast && (
        <div
          className="mono-lbl"
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-text)",
            color: "var(--color-bg)",
            padding: "8px 16px",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* A headline figure with its label and, where it matters, its caveat.
   The P80 is one of the three things allowed to be red. */
