/**
 * The shipped abacus, spreads, mutualisation policy and ratio cascade.
 * These are starting values: a team is expected to re-tune them against its
 * own delivery history. Every rung carries a falsifiable rationale, so two
 * architects reading the same sentence land on the same rung.
 */

export const DEFAULT_SCALES = {
  FEATURE: {
    S: {
      days: 3,
      why: "One rule, one place. No data model change, no impact on another component, covered by the existing tests.",
    },
    M: {
      days: 8,
      why: "Real behaviour to specify: small data model change, a few edge cases, one integration point already contracted.",
    },
    C: {
      days: 13,
      why: "Stateful workflow inside the component. Existing data to migrate, backward compatibility to hold, several edge cases.",
    },
    V: {
      days: 21,
      why: "Spans components: saga or compensation, idempotency, replay and reconciliation. A live contract with another team moves.",
    },
    X: {
      days: 50,
      why: "Reshapes the domain model or a normative one (ODA, eTOM). Modelling workshops come before any line of code.",
    },
  },
  API_EXPOSED: {
    S: {
      days: 3,
      why: "One resource, CRUD, no orchestration, no downstream call. Bean validation only, straight DTO to entity mapping.",
    },
    M: {
      days: 5,
      why: "2 to 3 entities or one downstream call. Business rules, pagination, filtering and sorting, error mapping.",
    },
    C: {
      days: 8,
      why: "Orchestrates several services or systems. Transactional consistency, retry and fallback, fine-grained authorization.",
    },
    V: {
      days: 13,
      why: "Async or event-driven contract, exactly-once or idempotency guarantees, deep polymorphic payload, latency budget to hold.",
    },
    X: {
      days: 50,
      why: "New API surface to specify and negotiate: protocol choice, normative alignment, mocks and contract tests for consumers.",
    },
  },
  API_CONSUMED: {
    S: {
      days: 2,
      why: "Client generated from a published contract. One operation, no orchestration, errors passed straight through.",
    },
    M: { days: 3, why: "A few operations, mapping into the domain model, timeout and retry policy, one stub for the tests." },
    C: {
      days: 5,
      why: "Several calls to orchestrate, pagination or partial results, circuit breaker and degraded mode, contract still moving.",
    },
    V: {
      days: 8,
      why: "Async or streaming consumption, ordering and duplicates to handle, resynchronisation after an outage, non-trivial authentication.",
    },
    X: {
      days: 21,
      why: "Undocumented or uncooperative third party: reverse engineering, sandbox to obtain, certification campaign before production.",
    },
  },
  /* A published topic and a nightly file are the same kind of work: something
     leaves this component and lands somewhere else without a caller waiting.
     The rungs name both, so an event stream is never sized as an API by
     default. */
  FLOW: {
    S: {
      days: 3,
      why: "One file or one event, one direction, schema already agreed. Existing transport or existing topic, field mapping only, order and duplicates carry no consequence.",
    },
    M: {
      days: 5,
      why: "Format or event schema to specify, or a real transformation. Naming, scheduling or partitioning conventions, functional acknowledgement, reject file or dead-letter queue.",
    },
    C: {
      days: 8,
      why: "Several files or event types with a functional dependency between them, restartable and replayable, ordering or at-least-once duplicates to absorb, volume that forces streaming over a full load.",
    },
    V: {
      days: 13,
      why: "New transport, broker or partner: connectivity, key exchange, schema registry and compatibility policy, reference data alignment, reconciliation and repair procedure.",
    },
    X: {
      days: 50,
      why: "New exchange framework, event backbone or normative format. Interoperability campaign with the third party before go-live.",
    },
  },
  BATCH: {
    S: {
      days: 3,
      why: "Single step on local data, idempotent, no execution window. Scheduling and alerting inherited from the template.",
    },
    M: { days: 5, why: "A few steps, chunking and commit interval, restart from the last checkpoint, moderate volume." },
    C: {
      days: 8,
      why: "Multi-source with lookups, a real execution window, partitioned or parallel processing, side effects to make idempotent.",
    },
    V: {
      days: 13,
      why: "Large volume or hard window, catch-up and replay strategy, runs alongside online traffic, dedicated performance testing.",
    },
    X: {
      days: 50,
      why: "New processing chain or migration engine: dry run, functional reconciliation, rollback and dual run beside the legacy.",
    },
  },
  GUI: {
    S: { days: 3, why: "No API call, presentation only. At most 5 simple UI components, no branching state." },
    M: { days: 5, why: "1 or 2 API calls, form with field validation, table with sort and filter, one route." },
    C: { days: 8, why: "Several API calls to combine, cross-field validation, multi-step flow or charts, shared state store." },
    V: {
      days: 13,
      why: "Live updates over WebSocket or SSE, drag and drop, schema-driven rendering, full accessibility conformance.",
    },
    X: { days: 50, why: "New design system, editor or canvas. Interaction design and prototyping are part of the ticket." },
  },
};

/* Confidence is not complexity. Complexity says how big the job is, confidence
   says how much you trust that number today. It drives the spread, not the mean. */

export const DEFAULT_SPREADS = {
  H: {
    min: 0.9,
    max: 1.25,
    why: "Built here before on this stack. Requirement stable, no third party in the loop. The level is not in doubt.",
  },
  M: {
    min: 0.8,
    max: 1.5,
    why: "Understood, but details are open or one dependency is unconfirmed. The level could move by one segment.",
  },
  L: {
    min: 0.6,
    max: 2,
    why: "New ground for the team, or the requirement or contract is still moving. Needs a spike before the number can be defended.",
  },
};

/* Mutualisation. Unit effort assumes every item is built from nothing. Once a
   design system or a shared pipeline exists, the second table-with-pagination
   screen is not a second full screen. The first few pay for the shared parts,
   the rest are discounted. */
export const DEFAULT_MUT = {
  FEATURE: { on: false, pct: 20, free: 2, by: "level" },
  API_EXPOSED: { on: false, pct: 20, free: 2, by: "level" },
  API_CONSUMED: { on: false, pct: 20, free: 2, by: "level" },
  FLOW: { on: true, pct: 25, free: 1, by: "level" },
  BATCH: { on: true, pct: 20, free: 1, by: "level" },
  GUI: { on: true, pct: 30, free: 2, by: "level" },
};

export const DEFAULT_RATIOS = [
  { id: "r1", label: "Detailed specifications", pct: 20, basis: "DEV", on: true },
  { id: "r2", label: "Technical design and tech lead", pct: 10, basis: "DEV", on: true },
  { id: "r3", label: "Functional and end-to-end testing", pct: 25, basis: "DEV", on: true },
  { id: "r4", label: "Integration, CI/CD and environments", pct: 10, basis: "DEV", on: true },
  { id: "r5", label: "Documentation and handover", pct: 5, basis: "DEV", on: true },
  { id: "r6", label: "Project management", pct: 12, basis: "CUM", on: true },
  { id: "r7", label: "Risk buffer", pct: 15, basis: "CUM", on: true },
];

/** Productive days per person-month, used only for the elapsed-time check. */
export const DAYS_PER_MONTH = 18;
