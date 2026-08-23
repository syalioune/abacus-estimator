# Abacus

**Software estimation in man-days, with the reasoning attached.**

Abacus turns a decomposed backlog into a number you can defend in front of a
customer. It replaces the spreadsheet most architects rebuild at the start of
every project: a list of components, features, interfaces and screens, a
complexity abacus, and a set of ratios on top of development.

It estimates **effort only**. There is no day rate and no currency — the
commercial conversation happens downstream, where your terms live.

```bash
docker compose up          # http://localhost:8080
```

---

## The idea

**A number is only worth as much as the sentence behind it.** Every design
decision follows from that:

- A complexity rung carries a **word**, never a number. The room argues "Complex or Very complex?", and the abacus turns that word into days once, in one place. Re-tune the abacus and every item re-prices; no row can smuggle in a figure nobody can justify.
- Every rung ships with a **falsifiable rationale** — _"existing data to
  migrate, backward compatibility to hold"_, not _"fairly involved"_. Two
  architects reading the same sentence should land on the same rung.
- An estimate is a **range**, not a figure. Confidence widens the range; it
  never inflates the number. The tool commits at P80 and says why.
- Uncertainty is priced **once**. Turn on a flat risk buffer while confidence
  already prices doubt and the tool tells you, at the moment you do it.

## What it does

| Room            | What it is for                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home**        | Where the estimate stands, and the landscape as a tree: subsystems and their components, the lots, the scenarios and what each one includes.         |
| **Backlog**     | Components → kind sections → items. Ladder, confidence, direction, lot, quantity, and the rationale panel you read out loud when the room disagrees. |
| **Abacus**      | The six ladders, the confidence spreads, and the mutualisation policy. Edit a rung's days and everything re-prices.                                  |
| **Cross table** | Rows × columns × measure over eight dimensions, with ink heat and drill-down to the underlying items.                                                |
| **Scenarios**   | Lots and scenarios side by side, with Δ against a baseline. An option is sized once and reused in every combination.                                 |
| **Effort**      | The ratio cascade, the five-number range, the distribution it comes from, and an elapsed-time sanity check.                                          |
| **Data**        | JSON round-trip, CSV in and out, the example project.                                                                                                |

### Five kinds of work

`Feature`, `API`, `Flow`, `Batch`, `Screen`. APIs are further split by
direction: an interface you **consume** is cheaper than one you **expose**,
because the contract already exists and nobody depends on your version of it.
That is a different ladder, not a coefficient — 2/3/5/8/21 against 3/5/8/13/50.

`Flow` covers **asynchronous events** as well as files: a published topic and a
nightly export are the same kind of work — something leaves the component and
lands elsewhere with nobody waiting on the answer. Every rung of the Flow ladder
names both, so an event stream is never sized as an API by default.

A **component holds no effort of its own.** It is a container; its cost is the
roll-up of what is attached to it.

### Confidence, and the range it produces

Complexity says how big the job is. Confidence says how much you trust that
number today. It drives the spread, never the mean:

```
min = m × spread.min          max = m × spread.max
E   = (min + 4m + max) / 6    σ   = (max − min) / 6
P80 = E + 0.84 σ
```

`E` sits above `m` whenever the spread is asymmetric — which it is by default,
because work overruns more readily than it underruns. At project level the
expected values add but the **variances** add, so `σ_total = √(Σσ²)`. That
square root is why many small uncertain items are more predictable than three
big ones, and why a combined scenario's P80 is below the sum of its parts'.

Full derivation and the independence caveat: [`docs/estimation-method.md`](docs/estimation-method.md).

### Mutualisation

Unit effort assumes every item is built from nothing. Once a design system or a
shared pipeline exists, the third table-with-pagination screen is not a third
full screen. Each scale has a policy — how many items pay full price, the
discount on the rest, and the pool they are counted in — and within a pool the
**most expensive items pay full price first**, because the hard screen is the
one that creates the shared components.

Mutualisation is resolved once over the whole scenario, so filtering a view
never silently re-prices what is left.

### Blind sizing and postures

**Blind sizing** hides every derived figure — rows, roll-ups, header and the
rationale panel's day counts — so a room argues the words without anchoring on
the numbers. **Posture** switches the backlog between _Prepare_ (dense, every
dimension in reach) and _Workshop_ (larger type and targets for a projector).

## Running it

### Docker

```bash
docker compose up                       # http://localhost:8080
docker compose --profile dev up dev     # hot reload on http://localhost:5173
```

The published image runs as a non-root user on port 8080, needs no
capabilities, and works read-only:

```bash
docker run --rm -p 8080:8080 --read-only \
  --tmpfs /tmp --tmpfs /var/cache/nginx --tmpfs /var/run \
  ghcr.io/syalioune/abacus-estimator:latest
```

Also published to Docker Hub as `syalioune/abacus-estimator:latest`.

### From source

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # 132 tests, domain + smoke
npm run build     # static bundle in dist/
```

Node 20 or 22. To serve from a sub-path, build with `BASE_PATH=/abacus/`.

## Your data

Everything stays on the machine it runs on. There is no server, no account and
no telemetry; an estimate lives in `localStorage` until you export it. The
container ships a Content-Security-Policy with no outbound `connect-src`, so
the page cannot phone anywhere even if it wanted to.

Export the JSON to version an estimate next to your architecture files. CSV
goes both ways, so an existing spreadsheet backlog can come straight in — any
day counts in the file are ignored, because the abacus owns those.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — how the code is arranged and why
- [`docs/estimation-method.md`](docs/estimation-method.md) — the method, the maths, the caveats
- [`docs/csv-format.md`](docs/csv-format.md) — the import contract
- [`AGENTS.md`](AGENTS.md) — conventions for humans and coding agents
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to propose a change

## Licence

Apache-2.0. See [LICENSE](LICENSE).
