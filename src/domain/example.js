import { uid } from "./schema.js";

/**
 * A small order platform, already sized. Used by the demo button and by the
 * tests as a realistic fixture. Not part of the domain contract.
 */
export function exampleData() {
  const c1 = uid(),
    c2 = uid(),
    c3 = uid(),
    c4 = uid(),
    c5 = uid();
  const core = "core",
    optA = uid(),
    optB = uid();
  const sBack = uid(),
    sFront = uid(),
    sShared = uid(),
    sData = uid();
  const mk = (type, name, componentId, level, tag, confidence = "M", lotId = core, direction) => ({
    id: uid(),
    type,
    name,
    componentId,
    level,
    qty: 1,
    tag,
    note: "",
    confidence,
    lotId,
    direction: type === "API" ? direction || "EXPOSED" : undefined,
  });
  return {
    subsystems: [
      { id: sBack, name: "Backend" },
      { id: sFront, name: "Frontend" },
      { id: sShared, name: "Shared platform" },
      { id: sData, name: "Data" },
    ],
    components: [
      { id: c1, name: "order-service", subsystemId: sBack, note: "" },
      { id: c2, name: "catalog-api", subsystemId: sBack, note: "" },
      { id: c3, name: "back-office-ui", subsystemId: sFront, note: "" },
      { id: c4, name: "platform", subsystemId: sShared, note: "" },
      { id: c5, name: "analytics-pipeline", subsystemId: sData, note: "" },
    ],
    lots: [
      { id: core, name: "Core scope" },
      { id: optA, name: "Option A — Analytics" },
      { id: optB, name: "Option B — Customer portal" },
    ],
    scenarios: [
      { id: "sc1", name: "Baseline", lotIds: [core] },
      { id: "sc2", name: "Baseline + analytics", lotIds: [core, optA] },
      { id: "sc3", name: "Full scope", lotIds: [core, optA, optB] },
    ],
    baselineId: "sc1",
    items: [
      mk("FEATURE", "Order lifecycle and state machine", c1, "V", "core", "M"),
      mk("FEATURE", "Audit trail", c1, "M", "compliance", "H"),
      mk("API", "POST /orders", c1, "C", "public", "H"),
      mk("API", "GET /orders/{id}", c1, "S", "public", "H"),
      mk("API", "PATCH /orders/{id}/status", c1, "M", "public", "H"),
      mk("API", "Order events publication", c1, "V", "async", "L"),
      mk("FEATURE", "Catalog search and faceting", c2, "C", "core", "M"),
      mk("API", "GET /products", c2, "M", "public", "H"),
      mk("API", "GET /products/{id}", c2, "S", "public", "H"),
      mk("GUI", "Order list", c3, "M", "back-office", "H"),
      mk("GUI", "Order detail and timeline", c3, "C", "back-office", "M"),
      mk("GUI", "Login and error screens", c3, "S", "back-office", "H"),
      mk("GUI", "Product list", c3, "M", "back-office", "H"),
      mk("GUI", "Customer list", c3, "M", "back-office", "H"),
      mk("GUI", "Shipment list", c3, "M", "back-office", "H"),
      mk("FEATURE", "Service skeleton, pipeline and environments", c4, "C", "setup", "H"),
      mk("FEATURE", "Authentication and authorization", c4, "C", "security", "M"),
      mk("FEATURE", "Observability: logs, metrics, traces", c4, "M", "ops", "H"),
      mk("API", "Payment provider — authorise and capture", c1, "C", "partner", "M", core, "CONSUMED"),
      mk("API", "Address normalisation service", c2, "S", "partner", "H", core, "CONSUMED"),
      mk("FLOW", "Daily supplier catalogue import (CSV)", c2, "M", "partner", "M"),
      mk("FLOW", "Accounting export to the ERP", c1, "C", "finance", "L"),
      mk("FLOW", "Carrier tracking events (SFTP)", c1, "V", "partner", "L"),
      mk("BATCH", "Nightly order reconciliation", c1, "C", "ops", "M"),
      mk("BATCH", "Catalogue reindexing", c2, "M", "ops", "H"),
      mk("BATCH", "Retention and purge job", c4, "S", "compliance", "H"),
      mk("FEATURE", "Event ingestion and replay", c5, "V", "data", "L", optA),
      mk("FEATURE", "Aggregates and retention", c5, "C", "data", "L", optA),
      mk("API", "GET /analytics/orders", c5, "M", "public", "M", optA),
      mk("GUI", "Analytics dashboard", c3, "C", "back-office", "L", optA),
      mk("FEATURE", "Self-service customer account", c1, "V", "portal", "L", optB),
      mk("GUI", "Customer order tracking", c3, "V", "portal", "L", optB),
      mk("API", "GET /me/orders", c1, "M", "public", "M", optB),
    ],
  };
}
