import React, { useRef, useState } from "react";
import {
  applyAbacus,
  estimateJsonSchema,
  exportItemsCsv,
  importItems,
  migrate,
  parseCsv,
  pickAbacus,
  templateCsv,
} from "../../domain/index.js";
import { Btn, ConfirmModal, Eyebrow, Row } from "../../ui/primitives.jsx";
import { IconTrash } from "../../ui/icons.jsx";
import { download } from "../../ui/format.js";

export function DataTab({ state, setState, daysOf, grossOf, flash, onExample, onReset }) {
  const fileRef = useRef(null);
  const abacusFileRef = useRef(null);
  const [report, setReport] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const exportJson = () => {
    download(
      `${(state.project || "estimate").replace(/\s+/g, "-").toLowerCase()}.json`,
      JSON.stringify(state, null, 2),
      "application/json",
    );
    flash("Estimate exported");
  };
  const exportItems = () => {
    download("scope-items.csv", exportItemsCsv(state, { daysOf, grossOf }), "text/csv");
    flash("Items exported");
  };
  const exportAbacus = () => {
    download(
      `${(state.project || "estimate").replace(/\s+/g, "-").toLowerCase()}-abacus.json`,
      JSON.stringify(pickAbacus(state), null, 2),
      "application/json",
    );
    flash("Abacus exported");
  };
  const exportSchema = () => {
    download("abacus-schema.json", JSON.stringify(estimateJsonSchema(), null, 2), "application/json");
    flash("Schema exported");
  };
  const importAbacusFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        if (!parsed.scales && !parsed.spreads && !parsed.mut && !parsed.ratios && !parsed.levelLabels) {
          throw new Error("not an abacus");
        }
        setState((s) => applyAbacus(s, parsed));
        flash("Abacus loaded");
      } catch {
        flash("That file is not an abacus export");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const importFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isJson = /\.json$/i.test(f.name);
    const r = new FileReader();
    r.onload = () => {
      const text = String(r.result);
      if (isJson) {
        try {
          const parsed = JSON.parse(text);
          if (!parsed.items) throw new Error("no items");
          setState(migrate(parsed));
          setReport(null);
          flash("Estimate loaded");
        } catch {
          flash("That file is not an estimate export");
        }
      } else {
        const rows = parseCsv(text);
        const res = importItems(rows, state);
        if (res.error) {
          setReport({ error: res.error });
          flash("Import refused");
          return;
        }
        setState(migrate(res.next));
        setReport(res.report);
        flash(`${res.report.imported} items imported`);
      }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const template = () => download("scope-template.csv", templateCsv(), "text/csv");

  return (
    <section style={{ maxWidth: 760 }}>
      <Eyebrow>Data</Eyebrow>
      <p className="prose" style={{ maxWidth: 720, marginBottom: "var(--space-6)" }}>
        The estimate is saved in this artifact as you type. Export the JSON to version it next to the architecture files, or to
        hand it to someone else. The CSV files are for people who still want a spreadsheet at the end.
      </p>

      {report && (
        <div className="panel" style={{ marginBottom: "var(--space-4)", padding: "var(--space-3) var(--gutter)" }}>
          <div className="mono-lbl">Last import</div>
          {report.error ? (
            <p className="prose" style={{ margin: 0, color: "var(--emphasis-commit)" }}>
              {report.error}
            </p>
          ) : (
            <>
              <p className="prose" style={{ margin: 0 }}>
                {report.imported} items imported
                {report.created.components ? `, ${report.created.components} components created` : ""}
                {report.created.subsystems ? `, ${report.created.subsystems} subsystems created` : ""}
                {report.created.lots ? `, ${report.created.lots} lots created` : ""}
                {report.skipped.length ? `, ${report.skipped.length} lines skipped` : ""}.
              </p>
              {report.skipped.length > 0 && (
                <ul className="sm" style={{ marginTop: 8, maxHeight: 160, overflowY: "auto", paddingLeft: 18 }}>
                  {report.skipped.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ display: "grid", gap: 1, background: "var(--color-divider)", border: "1px solid var(--color-divider)" }}>
        <Row
          title="Export the estimate"
          desc="Full JSON: subsystems, components, items, abacus, ratios, scenarios. Re-importable here."
        >
          <Btn tone="solid" onClick={exportJson}>
            Export JSON
          </Btn>
        </Row>
        <Row
          title="Import"
          desc="A JSON export replaces everything on screen. A CSV adds its lines to the current estimate, creating the subsystems, components and lots it names."
        >
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv,.tsv,.txt,application/json,text/csv"
            onChange={importFile}
            className="hidden"
          />
          <Btn onClick={() => fileRef.current?.click()}>Choose file</Btn>
        </Row>
        <Row title="CSV template" desc="Header the import expects. Name and Type are required, everything else is optional.">
          <Btn onClick={template}>Download</Btn>
        </Row>
        <Row title="Export the items" desc="One CSV line per item, with its component and its man-days. Semicolon separated.">
          <Btn onClick={exportItems}>Export CSV</Btn>
        </Row>
        <Row
          title="Export the abacus"
          desc="Rungs, spreads, mutualisation policy and ratio cascade only — no items, no components. Portable to another estimate."
        >
          <Btn onClick={exportAbacus}>Export JSON</Btn>
        </Row>
        <Row
          title="Import an abacus"
          desc="Replaces the rungs, spreads, mutualisation policy and ratio cascade with the file's. Items and structure are untouched."
        >
          <input ref={abacusFileRef} type="file" accept=".json,application/json" onChange={importAbacusFile} className="hidden" />
          <Btn onClick={() => abacusFileRef.current?.click()}>Choose file</Btn>
        </Row>
        <Row
          title="Export the JSON schema"
          desc="The shape of the estimate file, generated from this tool's own vocabulary. Hand it to an AI agent to generate a valid import."
        >
          <Btn onClick={exportSchema}>Export schema</Btn>
        </Row>
        <Row
          title="Load the example project"
          desc="A small order platform, already sized. Replaces the current components and items."
        >
          <Btn onClick={onExample}>Load example</Btn>
        </Row>
        <Row title="Start over" desc="Clears everything and restores the default abacus and ratios.">
          <Btn tone="danger" icon={<IconTrash />} onClick={() => setConfirmReset(true)}>
            Reset
          </Btn>
        </Row>
      </div>

      <ConfirmModal
        open={confirmReset}
        title="Confirm reset"
        message="Clear this estimate and start over? Every subsystem, component and item is lost."
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          onReset();
          setConfirmReset(false);
        }}
      />
    </section>
  );
}
