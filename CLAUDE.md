# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Abacus: a single-page, backend-free tool that turns a decomposed backlog into a
man-day estimate with the reasoning attached. It computes **effort only** —
never money, never a day rate. Read `AGENTS.md` in full before the first edit;
it is short and every rule in it has a reason.

## Commands

```bash
npm install
npm run dev            # Vite dev server on :5173
npm test               # vitest, run once (137 tests)
npm run test:watch
npm run test:coverage  # thresholds enforced on src/domain and src/state
npm run lint           # eslint, zero warnings tolerated
npm run format         # prettier --write
npm run check          # lint + format:check + test — run before pushing, mirrors CI
npm run build          # static bundle into dist/
```

Run a single test file: `npx vitest run test/pert.test.js`.
Equivalent `make` targets exist (`make dev`, `make test`, `make check`, `make build`, plus `make image`/`make run` for the container) — see `Makefile`.

## Architecture

Layered, with the boundary between the bottom two layers enforced by ESLint,
not just convention:

```
src/domain/    pure functions and data. No React, no DOM, no I/O.
src/state/     mutations (state → state) and the persistence port. No React, no DOM.
src/ui/        design-system primitives (plain CSS + custom properties, no framework).
src/features/  one folder per room. Composition only.
src/App.jsx    wiring: state, scope, selectors, tab routing.
```

`src/domain/**` and `src/state/**` are lint-blocked from importing `react`,
`react-dom`, or anything under `ui/`/`features/` (see `eslint.config.js`). This
is what keeps 121 of 137 tests running renderer-free in ~100ms, and why the
estimation rules are reviewable on their own.

**Where a change belongs:**

| Change                                    | Goes in                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| A new kind of work, a new complexity rung | `src/domain/taxonomy.js` (+ `defaults.js`)                         |
| How days are computed                     | `src/domain/{mutualisation,pert,ratios}.js`                        |
| A new field on an item                    | `taxonomy.js` → `schema.js` migration → `actions.js` → the screens |
| A new screen                              | `src/features/<room>/`                                             |
| A new visual primitive                    | `src/ui/` — only if two rooms need it                              |

### Domain modules (`src/domain/`)

| Module             | Responsibility                                                         |
| ------------------ | ---------------------------------------------------------------------- |
| `taxonomy.js`      | Vocabulary: levels, kinds of work, directions, confidence, scale keys. |
| `defaults.js`      | Shipped abacus, spreads, mutualisation policy, ratio cascade.          |
| `mutualisation.js` | Effective days over a set; pooling and discount order.                 |
| `pert.js`          | Three-point estimate, variance combination, P80/P90.                   |
| `ratios.js`        | DEV/CUM cascade and the double-counting check.                         |
| `schema.js`        | `emptyEstimate()`, `SCHEMA_VERSION`, and every migration.              |
| `estimate.js`      | Selectors: scenario scoping, `priceSet`, roll-ups.                     |
| `csv.js`           | Tolerant CSV parse, import mapping, export, template.                  |
| `example.js`       | Realistic fixture used by the demo button and tests.                   |

`priceSet(state, items)` is the single pricing entry point: applies
mutualisation over that exact set, computes the three-point range, runs the
ratio cascade. Two callers with the same state and set always get the same
numbers — call it, don't reimplement a piece of it.

### Data model

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
container never deletes work: items become unassigned or move to the
surviving lot.

### State and persistence

State is a single object owned by `App.jsx`. Mutations live in
`src/state/actions.js` as pure `state → state` functions. `src/state/storage.js`
is a port with three adapters — `localStorage`, a host-injected
`window.storage`, and an in-memory fallback — selected by `detectStorage()`
probing rather than sniffing. Saves are debounced and best-effort; a failed
write must never lose the edit in front of the user.

### The five kinds of work

`Feature`, `API`, `Flow`, `Batch`, `Screen`. APIs split by direction:
**consume** vs **expose** are different ladders (2/3/5/8/21 vs 3/5/8/13/50),
not a coefficient on one ladder.

### PERT math

```
min = m × spread.min          max = m × spread.max
E   = (min + 4m + max) / 6    σ   = (max − min) / 6
P80 = E + 0.84 σ
```

Confidence sets `min`/`max` only — it must never move the mean. At project
level, expected values add but **variances** add (`σ_total = √(Σσ²)`), which
is why a combined scenario's P80 sits below the sum of its parts. Full
derivation: `docs/estimation-method.md`.

## Non-negotiables

These have been broken before and cost real accuracy — don't undo them without
justifying why in the PR:

1. **No money.** No day rate, currency, or cost column, ever.
2. **The ladder shows words, not numbers.** Day counts live only in the Abacus
   room and totals; rungs stay equal-width (proportional width would leak the
   number geometrically).
3. **Blind sizing hides every derived figure** — rows, roll-ups, header, and
   the rationale panel's day counts. A new figure in the backlog needs the
   blind check too.
4. **Confidence never moves the mean** — it sets `min`/`max` only.
5. **Mutualisation is a property of the set**, resolved once over the whole
   scenario. Filtering a view must never re-price what's left.
6. **Every rung and confidence level carries a falsifiable rationale** —
   "existing data to migrate, backward compatibility to hold," not "fairly
   involved." New defaults ship with prose or they don't ship.
7. **Migrations are additive and idempotent.** Bump `SCHEMA_VERSION`, handle
   the old shape in `migrate()`, add a test that opens the old shape.
8. **Every figure gets a caveat** — a number never ships alone in the UI.

## Design system

Visual layer = Estimator Design System on Modernist, tokens in
`src/ui/styles/app.css`. Take every colour/size/space from a token, never
hard-code a hex or px the tokens already carry.

- Red is spent on exactly three things: the chosen rung, the P80 figure, the
  primary action. Nothing else — a destructive-confirm button stays ink with
  red text, never a fourth red fill.
- Confidence's green/amber/red tokens are the only hue scale in the system.
  Anything else that needs a hue — the workshop reviewed-count badge, for
  instance — reuses those same tokens rather than adding a new one. The
  letter or word (H/M/L, "N/M reviewed") is always shown too, so meaning
  never rests on colour alone.
- Cross-table heat is ink, never accent. A big cell is not a warning.
- Zero radius anywhere. No animation. Every affordance is a word first — an
  icon may sit next to the word (destructive and creating actions: delete,
  duplicate, add; marking a field as commentary), never replace it.
- Sentence case, except labels: uppercase, `0.12em` tracking, never bold.

## Writing style

Interface and comments share one voice: declarative, second person, present
tense, no hedging, no apology. Comments explain **why**, never what — if a
line needs a comment to say what it does, rename something instead.

Domain words are used exactly: man-days (never "MD" or "points"), rung,
ladder, abacus, lot, scenario, exposed/consumed, P80. No emoji anywhere.

## Tests

Domain and state changes need tests. The bar: **would this test have caught
the bug?** — not coverage percentage. Prefer testing the property over the
implementation — "a combined set is cheaper at P80 than the sum of its parts,"
not "p80 equals 204.03." Several existing tests are written that way on
purpose; treat them as the spec.

UI changes need at most a smoke test in `test/app.test.jsx`. Don't snapshot
the DOM — the design system changes deliberately and often.

## Pull requests

Small and single-purpose. Description says what changed, and — when a
non-negotiable above is touched — why that's now correct. Keep `npm run check`
green; never commit `dist/` or `coverage/`.
