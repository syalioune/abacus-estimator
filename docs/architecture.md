# Architecture

A single-page app with no backend. The interesting decision is the one boundary
that is enforced by lint rather than by convention.

## Layers

```
┌──────────────────────────────────────────────┐
│ src/App.jsx        wiring, scope, tab routing │
├──────────────────────────────────────────────┤
│ src/features/      one folder per room        │
│ src/ui/            design-system primitives   │
├──────────────────────────────────────────────┤
│ src/state/         mutations, persistence port│
├──────────────────────────────────────────────┤
│ src/domain/        pure estimation rules      │
└──────────────────────────────────────────────┘
```

`src/domain` and `src/state` may not import React, the DOM, or anything from
`ui/` or `features/`. ESLint fails the build if they do.

The point is not tidiness. The estimation rules — how a rung becomes days, how
mutualisation is pooled, how variances combine — are the part that has to be
right, and they are the part a reviewer needs to be able to read on its own.
Keeping them framework-free means 120 of the 130 tests run without a renderer, in
about 100 ms, so there is no excuse for not testing a change to them.

## The domain

| Module             | Responsibility                                                             |
| ------------------ | -------------------------------------------------------------------------- |
| `taxonomy.js`      | The vocabulary: levels, kinds of work, directions, confidence, scale keys. |
| `defaults.js`      | The shipped abacus, spreads, mutualisation policy and ratio cascade.       |
| `mutualisation.js` | Effective days over a set. Pooling and the discount order.                 |
| `pert.js`          | Three-point estimate, variance combination, P80/P90.                       |
| `ratios.js`        | The DEV/CUM cascade and the double-counting check.                         |
| `schema.js`        | `emptyEstimate()`, `SCHEMA_VERSION`, and every migration.                  |
| `estimate.js`      | Selectors: scenario scoping, `priceSet`, roll-ups.                         |
| `csv.js`           | Tolerant CSV parse, import mapping, export, template.                      |
| `example.js`       | A realistic fixture, used by the demo button and the tests.                |

`priceSet(state, items)` is the single entry point for pricing: it applies
mutualisation over exactly that set, computes the three-point range, runs the
ratio cascade, and returns every figure the interface shows. Two callers with
the same state and the same set always get the same numbers.

## Data model

```
Estimate
├── subsystems[]     { id, name }
├── components[]     { id, name, subsystemId }        ← containers, no effort
├── lots[]           { id, name }
├── scenarios[]      { id, name, lotIds[] }           ← a selection of lots
├── items[]          { id, type, name, componentId, lotId,
│                      level, confidence, qty, direction?, tag, note }
├── scales           per scale key → per rung → { days, why }
├── spreads          per confidence → { min, max, why }
├── mut              per scale key → { on, pct, free, by }
├── ratios[]         { id, label, pct, basis: DEV|CUM, on }   ← order matters
└── levelLabels      per rung → display name
```

An item belongs to exactly one lot and at most one component. Deleting a
container never deletes work: the items become unassigned, or move to the
surviving lot.

## State and persistence

State is a single object in `App.jsx`. Mutations live in `src/state/actions.js`
as pure `state → state` functions, so the invariants that matter (an item always
has a lot; deleting a component orphans rather than destroys) are stated once
and tested directly.

`src/state/storage.js` is a port with three adapters: `localStorage` for the
static build, a host-injected `window.storage` when one exists, and an in-memory
fallback for private browsing and tests. `detectStorage()` probes rather than
sniffs, so a browser with storage disabled degrades to memory instead of
throwing on load.

Saves are debounced and best-effort. A failed write must never lose the edit in
front of the user.

## Rendering

React 18 with `useState` and `useMemo` — no state library. The tree is small and
the expensive work (`priceSet`) is memoised on the scenario set, which is the
only input that changes it.

The design system is plain CSS with custom properties in
`src/ui/styles/app.css`; there is no CSS framework and no runtime style engine.

## Build and runtime

Vite produces a static bundle. The container is a two-stage build: Node compiles,
`nginx-unprivileged` serves on port 8080 as UID 101 with no capabilities and a
read-only filesystem. `BASE_PATH` lets the same source serve from a sub-path.

There is no API, so the CSP has no `connect-src` beyond `self`: the page cannot
exfiltrate an estimate even if a dependency tried to.
