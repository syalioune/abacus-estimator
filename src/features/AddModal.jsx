import React, { useEffect, useRef, useState } from "react";
import { DIRS, SCALE_LABEL, TYPES, TYPE_BY_ID, scaleKeyOf } from "../domain/index.js";
import { Btn, ConfirmModal, Field, MiniBtn, Modal, Select, TagInput } from "../ui/primitives.jsx";
import { ConfPicker, Ladder } from "../ui/estimating.jsx";
import { IconTrash } from "../ui/icons.jsx";

const emptyDraft = {
  type: "API",
  name: "",
  componentId: "",
  level: "M",
  qty: 1,
  tags: [],
  lotId: "",
  confidence: "M",
  direction: "EXPOSED",
};

/* One creation surface for the four things a room can be missing: a lot, a
   subsystem, a component or an item. Shared by the Backlog's floating trigger
   and the Home room's four buttons, so there is exactly one place that knows
   how to create each of them. */
export function AddModal({
  open,
  tab,
  onTabChange,
  onClose,
  components,
  subsystems,
  lots,
  compName,
  scales,
  spreads,
  levelLabels,
  blind,
  onAdd,
  onAddComponent,
  onAddSubsystem,
  onUpdSubsystem,
  onDelSubsystem,
  onAddLot,
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [newComp, setNewComp] = useState("");
  const [newSub, setNewSub] = useState("");
  const [newLot, setNewLot] = useState("");
  const [confirm, setConfirm] = useState(null);
  const nameRef = useRef(null);

  const askConfirm = (message, run) => setConfirm({ message, run });

  useEffect(() => {
    if (lots.length && !lots.some((l) => l.id === draft.lotId)) setDraft((d) => ({ ...d, lotId: lots[0].id }));
  }, [lots, draft.lotId]);

  useEffect(() => {
    if (open && tab === "item") nameRef.current?.focus();
  }, [open, tab]);

  const submit = () => {
    if (!draft.name.trim()) return;
    onAdd(draft);
    setDraft((d) => ({ ...d, name: "" }));
    nameRef.current?.focus();
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Add to the estimate">
        <span className="seg">
          {[
            ["lot", "Lot"],
            ["subsystem", "Subsystem"],
            ["component", "Component"],
            ["item", "Item"],
          ].map(([v, label]) => (
            <button key={v} type="button" onClick={() => onTabChange(v)} className={"seg-opt" + (tab === v ? " on" : "")}>
              {label}
            </button>
          ))}
        </span>

        {tab === "lot" && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-3)" }}>
            <Field label="New lot" grow>
              <input
                value={newLot}
                placeholder="Phase 2"
                onChange={(e) => setNewLot(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onAddLot(newLot);
                    setNewLot("");
                  }
                }}
                className="mini"
              />
            </Field>
            <Btn
              tone="solid"
              onClick={() => {
                onAddLot(newLot);
                setNewLot("");
              }}
            >
              Add lot
            </Btn>
            <p className="sm" style={{ margin: 0, width: "100%" }}>
              A lot is a slice of scope a scenario can include or leave out.
            </p>
          </div>
        )}

        {tab === "subsystem" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {subsystems.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {subsystems.map((x) => (
                  <span key={x.id} className="tag tag-outline" style={{ gap: 6 }}>
                    <input
                      value={x.name}
                      onChange={(e) => onUpdSubsystem(x.id, { name: e.target.value })}
                      style={{
                        width: 104,
                        background: "transparent",
                        border: 0,
                        padding: 0,
                        font: "inherit",
                        color: "inherit",
                      }}
                    />
                    <MiniBtn
                      onClick={() =>
                        askConfirm(`Delete subsystem "${x.name}"? Its components keep their data but lose this grouping.`, () =>
                          onDelSubsystem(x.id),
                        )
                      }
                      title="Delete subsystem"
                      danger
                      icon={<IconTrash />}
                    />
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-3)" }}>
              <Field label="New subsystem" grow>
                <input
                  value={newSub}
                  placeholder="new subsystem"
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onAddSubsystem(newSub);
                      setNewSub("");
                    }
                  }}
                  className="mini"
                />
              </Field>
              <Btn
                tone="solid"
                onClick={() => {
                  onAddSubsystem(newSub);
                  setNewSub("");
                }}
              >
                Add subsystem
              </Btn>
            </div>
            <p className="sm" style={{ margin: 0 }}>
              A subsystem groups components. Pick one on each component band.
            </p>
          </div>
        )}

        {tab === "component" && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-3)" }}>
            <Field label="New component" grow>
              <input
                value={newComp}
                placeholder="order-service"
                onChange={(e) => setNewComp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onAddComponent(newComp);
                    setNewComp("");
                  }
                }}
                className="mini"
              />
            </Field>
            <Btn
              tone="solid"
              onClick={() => {
                onAddComponent(newComp);
                setNewComp("");
              }}
            >
              Add component
            </Btn>
            <p className="sm" style={{ margin: 0, width: "100%" }}>
              A component carries no effort of its own — it totals what is attached to it.
            </p>
          </div>
        )}

        {tab === "item" && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-3)" }}>
            <Field label="Type">
              <Select value={draft.type} onChange={(v) => setDraft({ ...draft, type: v })}>
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" grow>
              <input
                ref={nameRef}
                value={draft.name}
                placeholder={TYPE_BY_ID[draft.type].hint}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="mini"
              />
            </Field>
            <Field label="Component">
              <Select value={draft.componentId} onChange={(v) => setDraft({ ...draft, componentId: v })}>
                <option value="">Unassigned</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {compName[c.id]}
                  </option>
                ))}
              </Select>
            </Field>
            {draft.type === "API" && (
              <Field label="Direction">
                <span className="seg dir">
                  {DIRS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, direction: d.id })}
                      className={"seg-opt" + (draft.direction === d.id ? " on" : "")}
                    >
                      {d.label}
                    </button>
                  ))}
                </span>
              </Field>
            )}
            {lots.length > 1 && (
              <Field label="Lot">
                <Select value={draft.lotId} onChange={(v) => setDraft({ ...draft, lotId: v })}>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Confidence">
              <ConfPicker value={draft.confidence} onChange={(v) => setDraft({ ...draft, confidence: v })} spreads={spreads} />
            </Field>
            <Field label="Tags">
              <TagInput value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} />
            </Field>
            <Field label={SCALE_LABEL[scaleKeyOf(draft)]} grow>
              <Ladder
                scale={scales[scaleKeyOf(draft)]}
                value={draft.level}
                labels={levelLabels}
                onPick={(l) => setDraft({ ...draft, level: l })}
                blind={blind}
              />
            </Field>
            <Btn tone="solid" onClick={submit}>
              Add item
            </Btn>
          </div>
        )}
      </Modal>

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
    </>
  );
}
