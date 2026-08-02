# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — first open-source release

The tool was previously a single-file prototype. This release is the same
behaviour, restructured to be maintainable.

### Added

- Modular source: a framework-free `src/domain` (estimation rules),
  `src/state` (mutations and a persistence port), `src/ui` (design-system
  primitives) and `src/features` (one folder per room).
- 88 tests covering the PERT combination, mutualisation pooling, the ratio
  cascade, schema migrations, CSV import and every state invariant.
- Container runtime: a two-stage Docker build serving through
  `nginx-unprivileged` on port 8080, non-root, read-only, with a CSP that
  forbids outbound connections.
- GitHub Actions: lint, format, coverage and build on Node 20 and 22; a
  container build with a running smoke test; CodeQL; Dependabot; multi-arch
  publishing to GHCR on tag; GitHub Pages deployment.
- Documentation: architecture, the estimation method in full including its
  weakest assumption, and the CSV contract.
- A storage port with `localStorage`, host and in-memory adapters, so the app
  degrades rather than throws when storage is unavailable.

### Fixed

- Effort-by-type bars rendered at zero width because of a duplicate `style`
  prop introduced during the design-system migration.
- Blind sizing leaked day counts through the rationale panel.
- An unknown cross-table dimension key crashed the room instead of falling back
  to a single total column.

### Changed

- Estimates are expressed in man-days only. The day rate and currency were
  removed; migration drops both from stored estimates.
