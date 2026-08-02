import { CONF, CONF_BY_ID, DIR_BY_ID, LEVELS, TYPES, TYPE_BY_ID, scaleKeyOf } from "./taxonomy.js";
import { uid } from "./schema.js";

/* Tolerant CSV reader: sniffs the separator, honours quotes and doubled quotes. */
export function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.split(/\r?\n/)[0] || "";
  const sep = [";", ",", "\t"].map((c) => [c, firstLine.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

/* Maps a CSV into the estimate, creating the components, subsystems and lots it
   references. Any day counts in the file are ignored on purpose: the abacus owns
   them, so an imported line cannot smuggle in a number nobody can justify. */
export function importItems(rows, state) {
  const head = (rows[0] || []).map(norm);
  const col = (...names) => {
    const i = head.findIndex((h) => names.includes(h));
    return i;
  };
  const idx = {
    name: col("name", "libellé", "libelle", "intitulé", "item"),
    type: col("type", "nature"),
    component: col("component", "composant"),
    subsystem: col("subsystem", "sous-système", "sous-systeme", "domain", "domaine"),
    direction: col("direction", "sens"),
    level: col("complexity", "complexité", "complexite", "level", "niveau"),
    conf: col("confidence", "confiance"),
    qty: col("qty", "quantity", "quantité", "quantite", "nb"),
    lot: col("lot", "scope", "option"),
    tag: col("tags", "tag", "étiquettes", "etiquettes", "étiquette", "etiquette"),
    note: col("note", "comment", "commentaire"),
  };
  if (idx.name < 0 || idx.type < 0) {
    return { error: "The header row must contain at least a Name column and a Type column." };
  }

  const next = {
    ...state,
    subsystems: [...state.subsystems],
    components: [...state.components],
    lots: [...state.lots],
    items: [...state.items],
  };
  const created = { components: 0, subsystems: 0, lots: 0 };
  const skipped = [];
  let imported = 0;

  const typeOf = (v) => {
    const n = norm(v);
    const t = TYPES.find((x) => norm(x.label) === n || norm(x.plural) === n || norm(x.id) === n);
    if (t) return t.id;
    if (["screen", "ui", "gui", "écran", "ecran", "page"].includes(n)) return "GUI";
    if (["flow", "flux", "file", "fichier", "interface fichier"].includes(n)) return "FLOW";
    if (["batch", "job", "traitement"].includes(n)) return "BATCH";
    if (["feature", "fonctionnalité", "fonctionnalite", "us", "story"].includes(n)) return "FEATURE";
    if (["api", "service", "endpoint"].includes(n)) return "API";
    return null;
  };
  const levelOf = (v) => {
    const n = norm(v);
    if (!n) return "M";
    const byLabel = LEVELS.find((l) => norm(state.levelLabels[l.id] ?? l.label) === n || norm(l.label) === n || norm(l.id) === n);
    if (byLabel) return byLabel.id;
    if (["s", "simple", "easy", "facile"].includes(n)) return "S";
    if (["m", "medium", "moyen", "moyenne"].includes(n)) return "M";
    if (["c", "complex", "complexe"].includes(n)) return "C";
    if (["v", "vc", "very complex", "très complexe", "tres complexe"].includes(n)) return "V";
    if (["x", "outstanding", "hors norme", "exceptionnel"].includes(n)) return "X";
    return null;
  };
  const confOf = (v) => {
    const n = norm(v);
    if (!n) return "M";
    const c = CONF.find((x) => norm(x.label) === n || norm(x.id) === n);
    if (c) return c.id;
    if (["haute", "élevée", "elevee", "high"].includes(n)) return "H";
    if (["faible", "basse", "low"].includes(n)) return "L";
    return "M";
  };
  const dirOf = (v) => {
    const n = norm(v);
    if (["consumed", "consommé", "consomme", "cons", "in", "inbound", "client"].includes(n)) return "CONSUMED";
    return "EXPOSED";
  };
  const findOrCreate = (list, name, make, counterKey) => {
    const n = String(name ?? "").trim();
    if (!n) return null;
    const found = list.find((x) => norm(x.name) === norm(n));
    if (found) return found.id;
    const made = make(n);
    list.push(made);
    created[counterKey]++;
    return made.id;
  };

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const name = (r[idx.name] ?? "").trim();
    if (!name) return skipped.push(`line ${line}: no name`);
    const type = typeOf(r[idx.type]);
    if (!type) return skipped.push(`line ${line}: unknown type "${(r[idx.type] ?? "").trim()}"`);
    const level = levelOf(idx.level >= 0 ? r[idx.level] : "");
    if (!level) return skipped.push(`line ${line}: unknown complexity "${(r[idx.level] ?? "").trim()}"`);

    const subId =
      idx.subsystem >= 0 ? findOrCreate(next.subsystems, r[idx.subsystem], (n) => ({ id: uid(), name: n }), "subsystems") : null;
    let compId = null;
    if (idx.component >= 0) {
      const cname = String(r[idx.component] ?? "").trim();
      if (cname && norm(cname) !== "unassigned") {
        const existing = next.components.find((c) => norm(c.name) === norm(cname));
        if (existing) {
          compId = existing.id;
          if (subId && !existing.subsystemId) {
            next.components = next.components.map((c) => (c.id === existing.id ? { ...c, subsystemId: subId } : c));
          }
        } else {
          const made = { id: uid(), name: cname, subsystemId: subId, note: "" };
          next.components.push(made);
          created.components++;
          compId = made.id;
        }
      }
    }
    const lotId =
      (idx.lot >= 0 ? findOrCreate(next.lots, r[idx.lot], (n) => ({ id: uid(), name: n }), "lots") : null) || next.lots[0].id;
    const qtyRaw = idx.qty >= 0 ? parseFloat(String(r[idx.qty]).replace(",", ".")) : 1;

    next.items.push({
      id: uid(),
      type,
      name,
      componentId: compId,
      level,
      qty: Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1,
      tags:
        idx.tag >= 0
          ? String(r[idx.tag] ?? "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      note: idx.note >= 0 ? String(r[idx.note] ?? "").trim() : "",
      confidence: confOf(idx.conf >= 0 ? r[idx.conf] : ""),
      lotId,
      direction: type === "API" ? dirOf(idx.direction >= 0 ? r[idx.direction] : "") : undefined,
    });
    imported++;
  });

  return { next, report: { imported, skipped, created } };
}

const round2 = (n) => Math.round(n * 100) / 100;

/** One CSV line per item. Round-trips with importItems. */
export function exportItemsCsv(state, { daysOf, grossOf }) {
  const head = [
    "Lot",
    "Subsystem",
    "Component",
    "Type",
    "Direction",
    "Name",
    "Complexity",
    "Confidence",
    "Days per unit",
    "Qty",
    "Gross days",
    "Days",
    "Min",
    "Max",
    "Tags",
    "Note",
  ];
  const subOf = Object.fromEntries(state.subsystems.map((x) => [x.id, x.name]));
  const compOf = Object.fromEntries(state.components.map((c) => [c.id, c]));
  const lotOf = Object.fromEntries(state.lots.map((l) => [l.id, l.name]));
  const rows = state.items.map((i) => {
    const d = daysOf(i);
    const sp = state.spreads[i.confidence] || state.spreads.M;
    const comp = compOf[i.componentId];
    return [
      lotOf[i.lotId] || "",
      comp ? subOf[comp.subsystemId] || "" : "",
      comp ? comp.name : "Unassigned",
      TYPE_BY_ID[i.type].label,
      i.type === "API" ? DIR_BY_ID[i.direction || "EXPOSED"].label : "",
      i.name,
      state.levelLabels[i.level] ?? i.level,
      CONF_BY_ID[i.confidence]?.label ?? i.confidence,
      state.scales[scaleKeyOf(i)][i.level].days,
      i.qty,
      round2(grossOf(i)),
      round2(d),
      round2(d * sp.min),
      round2(d * sp.max),
      (i.tags || []).join(", "),
      i.note || "",
    ];
  });
  return [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
}

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The header the importer expects, as a downloadable starting point. */
export function templateCsv() {
  const head = ["Lot", "Subsystem", "Component", "Type", "Direction", "Name", "Complexity", "Confidence", "Qty", "Tags", "Note"];
  const rows = [
    ["Core scope", "Backend", "order-service", "API", "Exposed", "POST /orders", "Complex", "High", 1, "public, v2", ""],
    ["Core scope", "Backend", "order-service", "Flow", "", "Accounting export to the ERP", "Complex", "Low", 1, "finance", ""],
    ["Core scope", "Frontend", "back-office-ui", "Screen", "", "Order list", "Medium", "High", 1, "back-office", ""],
  ];
  return [head, ...rows].map((r) => r.join(";")).join("\n");
}
