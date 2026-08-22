/**
 * The vocabulary of the tool. Everything downstream — scales, filters, pivot
 * dimensions, CSV parsing — resolves against these lists, so adding a kind of
 * work is a change in one place.
 */

/** Complexity rungs. The room argues the word; the abacus turns it into days. */
export const LEVELS = [
  { id: "S", label: "Simple" },
  { id: "M", label: "Medium" },
  { id: "C", label: "Complex" },
  { id: "V", label: "Very complex" },
  { id: "X", label: "Outstanding" },
];
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

/** Kinds of work. A component holds none of them itself; it contains them. */
export const TYPES = [
  { id: "FEATURE", label: "Feature", plural: "Features", hint: "Business capability carried by this component" },
  { id: "API", label: "API", plural: "APIs", hint: "Synchronous interface, exposed or consumed" },
  {
    id: "FLOW",
    label: "Flow",
    plural: "Flows",
    hint: "File, data or asynchronous event exchanged with another system",
  },
  { id: "BATCH", label: "Batch", plural: "Batches", hint: "Scheduled or triggered processing job" },
  { id: "GUI", label: "Screen", plural: "Screens", hint: "UI screen or self-contained UI block" },
];
export const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

/**
 * An interface you consume is cheaper than one you expose: the contract
 * already exists, nobody depends on your version of it, and you break nobody.
 */
export const DIRS = [
  { id: "EXPOSED", label: "Exposed", short: "exp" },
  { id: "CONSUMED", label: "Consumed", short: "cons" },
];
export const DIR_BY_ID = Object.fromEntries(DIRS.map((d) => [d.id, d]));

/**
 * Confidence is not complexity. Complexity says how big the job is, confidence
 * says how much you trust that number today. It drives the spread, not the mean.
 */
export const CONF = [
  { id: "H", label: "High" },
  { id: "M", label: "Medium" },
  { id: "L", label: "Low" },
];
export const CONF_BY_ID = Object.fromEntries(CONF.map((c) => [c.id, c]));

/** Scale keys are not types: APIs carry one scale per direction. */
export const SCALE_KEYS = [
  { key: "FEATURE", label: "Feature", hint: "Business capability carried by this component" },
  { key: "API_EXPOSED", label: "API — exposed", hint: "You publish the contract and you own its compatibility" },
  { key: "API_CONSUMED", label: "API — consumed", hint: "Someone else publishes the contract, you integrate against it" },
  {
    key: "FLOW",
    label: "Flow",
    hint: "File, data or asynchronous event exchanged with another system — a published topic and a nightly file are sized on the same ladder",
  },
  { key: "BATCH", label: "Batch", hint: "Scheduled or triggered processing job" },
  { key: "GUI", label: "Screen", hint: "UI screen or self-contained UI block" },
];
export const SCALE_LABEL = Object.fromEntries(SCALE_KEYS.map((s) => [s.key, s.label]));

/** Which ladder an item is sized on. */
export const scaleKeyOf = (item) =>
  item.type === "API" ? (item.direction === "CONSUMED" ? "API_CONSUMED" : "API_EXPOSED") : item.type;
