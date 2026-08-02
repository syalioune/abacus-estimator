## What this changes

<!-- One paragraph. If it changes a figure the tool produces, say which. -->

## Why

<!-- The problem, not the solution. -->

## Checks

- [ ] `npm run check` is green
- [ ] Domain or state changes come with tests that would have caught the bug
- [ ] Any new complexity rung or confidence level carries a falsifiable rationale
- [ ] Any schema change bumps `SCHEMA_VERSION`, handles the old shape in
      `migrate()`, and has a test that opens it
- [ ] No money reintroduced: no day rate, no currency, no cost column

## Non-negotiables touched

<!--
AGENTS.md lists eight decisions that cost accuracy when broken. If this PR
changes one of them, name it here and say why the new behaviour is correct.
Delete this section if it touches none.
-->
