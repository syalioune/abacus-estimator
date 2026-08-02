# Contributing

Thanks for taking the time. This project is small and opinionated; the fastest
route to a merged change is to read [`AGENTS.md`](AGENTS.md) first — it lists the
conventions and the handful of decisions that are deliberately not up for
casual reversal.

## Getting set up

```bash
git clone https://github.com/syalioune/abacus-estimator.git
cd abacus-estimator
npm install
npm run dev
```

Node 20 or 22. No other toolchain.

## Before you push

```bash
npm run check    # lint + format + tests. This is what CI runs.
```

## What makes a good change

- **One purpose per pull request.** A refactor and a feature in the same diff
  take four times as long to review.
- **Tests for domain and state changes.** Test the property, not the
  implementation: _"a combined set is cheaper at P80 than the sum of its parts"_
  rather than _"p80 equals 204.03"_. The existing tests are written that way on
  purpose — they are the specification.
- **Prose for new defaults.** Every complexity rung and confidence level carries
  a falsifiable rationale. "Fairly involved" is not one.
- **A migration for any schema change.** Bump `SCHEMA_VERSION`, handle the old
  shape in `migrate()`, and add a test that opens the old shape. Opening an old
  file must never lose work.

## Proposing a change to the method

Changes to how days are computed are welcome, and held to a higher bar than
changes to the interface. Say in the PR what the current behaviour gets wrong,
with a worked example, and what the new behaviour does instead. Estimation
methods are opinions; the ones in this tool are documented in
[`docs/estimation-method.md`](docs/estimation-method.md) so they can be argued
with rather than inherited.

If your team calibrates the abacus differently, you probably want to change the
defaults in your own export rather than in the repository — every scale value in
the tool is editable at runtime.

## Reporting a bug

Include the estimate that reproduces it if you can (Data → Export JSON — it
contains only what you typed). A number that looks wrong is much easier to
diagnose with the state that produced it.

## Code of conduct

Be decent. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
