# AGENTS.md

Conventions for anyone changing this repository — human or coding agent. Read
this before the first edit; it is short on purpose.

## What this project is

An estimation tool that produces **man-days**, never money. It exists because a
number is only worth as much as the sentence behind it. Most rules below are
downstream of that.

## Commands

```bash
npm install
npm run dev            # Vite dev server on :5173
npm test               # vitest, run once
npm run test:watch
npm run test:coverage  # thresholds enforced on src/domain and src/state
npm run lint           # eslint, zero warnings tolerated
npm run format         # prettier --write
npm run check          # lint + format:check + test — run this before pushing
npm run build          # static bundle into dist/
```

`npm run check` is what CI runs first. If it is green locally it will be green
there.

## Layer rules

```
src/domain/    pure functions and data. No React, no DOM, no I/O.
src/state/     mutations and the persistence port. No React, no DOM.
src/ui/        design-system primitives. No domain rules.
src/features/  one folder per room. Composition only.
src/App.jsx    wiring: state, scope, selectors, tab routing.
```

ESLint enforces the first two: importing `react` or anything from `ui/` or
`features/` inside `domain/` or `state/` is an error. This is not decoration —
it is what keeps the estimation rules testable without a renderer, and it is why
the test suite runs in milliseconds.

**Where a change belongs:**

| Change                                    | Goes in                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| A new kind of work, a new complexity rung | `src/domain/taxonomy.js` (+ `defaults.js`)                         |
| How days are computed                     | `src/domain/{mutualisation,pert,ratios}.js`                        |
| A new field on an item                    | `taxonomy.js` → `schema.js` migration → `actions.js` → the screens |
| A new screen                              | `src/features/<room>/`                                             |
| A new visual primitive                    | `src/ui/` — and only if two rooms need it                          |

## Non-negotiables

These have been broken before and cost real accuracy. Do not undo them without
saying why in the PR.

1. **No money.** No day rate, no currency, no cost column. If a figure would be
   expressed in euros, it does not belong here.
2. **The ladder shows words, not numbers.** Day counts live in the Abacus room
   and in totals. Showing them at the point of choice anchors the room. The
   equal-width rungs are part of this: proportional widths leak the same
   information geometrically.
3. **Blind sizing hides every derived figure** — rows, roll-ups, header, and the
   rationale panel's day counts. Adding a new figure to the backlog means adding
   it to the blind check too.
4. **Confidence never moves the mean.** It sets `min` and `max` only. If a
   change makes High confidence produce a smaller _likely_ figure, it is wrong.
5. **Mutualisation is a property of the set.** Resolve it once over the scenario.
   Filtering a view must never re-price what is left.
6. **Every rung and every confidence level carries a falsifiable rationale.**
   "Fairly involved" is not one. "Existing data to migrate, backward
   compatibility to hold" is. New defaults ship with prose or they do not ship.
7. **Migrations are additive and idempotent.** Bump `SCHEMA_VERSION`, handle the
   old shape in `migrate()`, add a test that opens the old shape. Opening an old
   file must never lose work.
8. **Every figure gets a caveat.** A number never ships alone in the interface.
   Under "Optimistic" sits the sentence that stops someone quoting it.

## Design system

The visual layer is the Estimator Design System on Modernist, in
`src/ui/styles/app.css`. Take every colour, size and space from a token —
never hard-code a hex or a px the tokens already carry.

- **The accent budget: red is spent on exactly three things** — the chosen rung,
  the P80 figure, and the primary action. Nothing else — a destructive-confirm
  button stays ink with red text, never a fourth red fill.
- **Confidence's green/amber/red tokens are the only hue scale** in the
  system. Anything else that needs a hue — the workshop reviewed-count
  badge, for instance — reuses those same tokens rather than adding a new
  one. The letter or word (H/M/L, "N/M reviewed") is always present, so
  meaning never rests on colour.
- **Cross-table heat is ink, never accent.** A big cell is not a warning.
- Zero radius anywhere. No animation. Every affordance is a word first — an
  icon may sit next to the word (destructive and creating actions: delete,
  duplicate, add; marking a field as commentary), never replace it.
- Sentence case, except labels: uppercase, `0.12em` tracking, never bold.

## Writing style

The interface and the comments share a voice: declarative, second person,
present tense, no hedging and no apology. Comments explain **why**, never what —
if a line needs a comment to say what it does, rename something instead. State
the reasoning that is not recoverable from the code: why variances are summed
independently, why the expensive items pay full price first.

Domain words are used exactly: man-days (never "MD" or "points"), rung, ladder,
abacus, lot, scenario, exposed/consumed, P80. No emoji anywhere.

## Tests

Domain and state changes need tests. The bar is not coverage percentage, it is:
**would this test have caught the bug?**

Test the property, not the implementation — "a combined set is cheaper at P80
than the sum of its parts" rather than "p80 equals 204.03". Several existing
tests are written that way on purpose; they are the specification.

UI changes need at most a smoke test in `test/app.test.jsx`. Do not snapshot the
DOM: this design system changes deliberately and often.

## Pull requests

Small and single-purpose. The description says what changed and, when a
non-negotiable above is touched, why that is now correct. Keep `npm run check`
green and do not commit `dist/` or `coverage/`.
