# The estimation method

The tool implements one method. This is it, in full, including where it is
weakest.

## 1. Decompose

List the work as items of five kinds — **Feature**, **API**, **Flow**, **Batch**,
**Screen** — and attach each to a **component**. A component holds no effort of
its own; it is a container, and its figure is the roll-up of what is in it.

A **Flow** is anything that leaves the component without a caller waiting on the
answer: a file, a data export, or an asynchronous event on a topic. The ladder
names all three at every rung, so a published event is sized as the exchange it
is rather than borrowed from the API ladder.

APIs carry a **direction**. An interface you _consume_ is cheaper than one you
_expose_: the contract already exists, nobody depends on your version, and you
break nobody. That is a separate ladder rather than a coefficient, so both
directions keep their own rationales.

## 2. Size against a ladder

Each item gets one of five rungs. The rung carries a **word**, never a number,
and the tool deliberately does not show the day counts at the point of choice:
seeing "8 or 13?" anchors a room that should be arguing "Complex or Very
complex?".

Each rung ships with a falsifiable rationale. The test of a good one is whether
two architects reading it independently land on the same rung.

> Complex — _Orchestrates several services or systems. Transactional
> consistency, retry and fallback, fine-grained authorization._

The abacus turns the word into days once, in one place. Re-tune a rung and every
item on it re-prices.

## 3. Rate confidence

Complexity says how big the job is. **Confidence says how much you trust that
number today.** They are independent: a well-understood large job is
high-confidence, a small job against an unsigned third party is not.

Confidence sets the spread and nothing else:

| Level  | min  | max   | When                                                    |
| ------ | ---- | ----- | ------------------------------------------------------- |
| High   | ×0.9 | ×1.25 | Built here before. Requirement stable, no third party.  |
| Medium | ×0.8 | ×1.5  | Understood, details open or one dependency unconfirmed. |
| Low    | ×0.6 | ×2.0  | New ground, or the requirement is still moving.         |

## 4. Mutualise

Unit effort assumes every item is built from nothing. Once a design system or a
shared pipeline exists, that is false: the third table-with-pagination screen
reuses what the first two built.

Each scale has a policy — how many items pay full price (`free`), the discount
on the rest (`pct`), and the pool they are counted in (`by`). Pooling by
complexity level is the default and the safe one: two medium screens reuse each
other; a medium screen and an outstanding one do not.

Within a pool, **the most expensive items pay full price first** — the hard
screen is the one that creates the shared components, not the third easy one.

Two consequences worth stating out loud:

- Splitting a line of "5 similar screens" into five items changes nothing;
  quantity counts as repetition.
- **Mutualisation is a property of the set.** A lot added to a larger scope
  mutualises against everything already there, so an option is genuinely cheaper
  at the margin than it is priced standalone. That is the honest answer when a
  customer asks "what if we take analytics too?".

_The design system itself is not free._ Declare it as its own feature, or you are
discounting reuse you never built.

## 5. Compute the range

Every item is three numbers, not one:

```
min = m × spread.min
max = m × spread.max
E   = (min + 4m + max) / 6      σ = (max − min) / 6
```

The 4× weighting keeps `m` dominant while letting the tails pull. **E sits above
m** whenever the spread is asymmetric — which it is by default, because work
overruns more readily than it underruns. A 10 md item at low confidence can
shrink by 4 and grow by 10, so its expected effort is 11.7, not 10. That gap is
the part of an estimate people habitually forget to price.

At set level the expected values add, but the **variances** add, not the
deviations:

```
E_total = ΣE          σ_total = √(Σσ²)          P80 = E + 0.84 σ
```

That square root has two visible consequences:

- Twenty uncertain 10 md items give a P80 of 229 md; one uncertain 200 md lump
  gives 259 md. Decomposing an unknown genuinely tightens the estimate.
- A combined scenario's P80 is **below** the sum of its parts' P80s. Aggregating
  risk beats stacking buffers.

### Where this is weakest

Variances are summed **as if the items were independent**. One unknown driving
ten items — a framework decision, a partner who has not signed — breaks that,
and the real spread is wider than the curve shows.

The honest fix is to model that unknown as its own low-confidence item, or to
keep an explicit risk line for it. Do not quietly widen every spread to
compensate; that destroys the information the confidence flags carry.

## 6. Apply the ratios

Development is not the project. Each ratio line applies either to development
(`DEV`) or to the running total (`CUM`). CUM lines compound with everything
above them, so **order matters**: delivery activities sit on development, then
management, then the risk buffer last.

Defaults: specs 20%, design 10%, testing 25%, integration 10%, documentation 5%,
all on development; then project management 12% and risk buffer 15% on the
running total. Factor ≈ ×2.19.

The same factor is applied to every point of the range, so the P80 you commit to
covers the whole project, not just the build.

### Pricing uncertainty twice

If a flat risk buffer is on while you are presenting a P80, you are charging for
doubt twice. The tool says so in the interface. Pick one: keep the flat buffer
for a fixed-price bid, or turn it off and commit to the P80.

## 7. Read the result

- **Optimistic** — only defensible if nothing surprises you. Do not commit.
- **Most likely** — the abacus read straight.
- **Expected** — pulled up by the low-confidence items.
- **P80** — four projects in five come in at or below this. Commit here.
- **Pessimistic** — everything goes wrong at once. A ceiling, not a plan.

Commit externally at P80, plan the team at E, never sell the min.

Then check the elapsed time. If the total divided by your team does not fit the
target date, the answer is scope or parallelism — not a smaller abacus.
