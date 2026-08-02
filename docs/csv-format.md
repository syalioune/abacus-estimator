# CSV import and export

CSV goes both ways, so an existing spreadsheet backlog can come straight in.

A JSON import **replaces** the estimate; a CSV import **adds** its lines to
whatever is on screen, creating the subsystems, components and lots it names.

## What the importer reads

Only **Name** and **Type** are required. Everything else falls back to a
sensible default.

| Column       | Aliases                       | Default             |
| ------------ | ----------------------------- | ------------------- |
| `Name`       | Libellé, Intitulé, Item       | _required_          |
| `Type`       | Nature                        | _required_          |
| `Component`  | Composant                     | Unassigned          |
| `Subsystem`  | Sous-système, Domain, Domaine | none                |
| `Direction`  | Sens                          | Exposed (APIs only) |
| `Complexity` | Complexité, Level, Niveau     | Medium              |
| `Confidence` | Confiance                     | Medium              |
| `Qty`        | Quantity, Quantité, Nb        | 1                   |
| `Lot`        | Scope, Option                 | the first lot       |
| `Tag`        | Étiquette                     | empty               |
| `Note`       | Comment, Commentaire          | empty               |

Header matching is case- and accent-tolerant. Values are matched in English and
French: `Flux`, `Écran`, `Complexe`, `Faible`, `Haute`, `Consommé` all resolve.

The parser sniffs `;`, `,` or tab, handles quoted fields containing the
separator, doubled quotes, a BOM and CRLF.

## What it deliberately ignores

**Any day count or cost in the file.** The abacus owns those. If a spreadsheet
could inject its own day values, you would lose the property that every figure
traces back to a rung and a rationale — which is the reason to use this tool
rather than the spreadsheet.

If you need historical actuals for calibration, that is a different feature: a
measured column beside the estimate, not a value smuggled through the import.

## Errors

Bad rows are skipped individually, with a line-numbered reason shown in the
import report. A file missing the Name or Type column is refused whole, because
guessing at that point does more harm than stopping.

## Example

```csv
Lot;Subsystem;Component;Type;Direction;Name;Complexity;Confidence;Qty;Tag
Core scope;Backend;order-service;API;Exposed;POST /orders;Complex;High;1;public
Core scope;Backend;order-service;Flow;;Accounting export to the ERP;Complex;Low;1;finance
Core scope;Frontend;back-office-ui;Screen;;Order list;Medium;High;1;back-office
Option A;Data;analytics;Batch;;Nightly rollup;Very complex;Medium;2;ops
```

The **Data** room ships this as a downloadable template.
