import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";

/** A smoke test per room: the app must mount and every tab must render. */
describe("App", () => {
  beforeEach(() => window.localStorage.clear());

  /* The backlog opens collapsed, so anything that argues about rows opens it
     first — the same button a user reaches for. */
  const openBacklog = async (user) => {
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Backlog" }));
    await user.click(screen.getByTitle("Expand every component and type band"));
  };

  it("mounts with an empty estimate", async () => {
    render(<App />);
    expect(await screen.findByDisplayValue("New project")).toBeTruthy();
  });

  it("opens every room without crashing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    for (const room of ["Home", "Abacus", "Cross table", "Scenarios", "Effort", "Data", "Backlog"]) {
      await user.click(screen.getByRole("button", { name: room }));
      expect(screen.getByRole("button", { name: room })).toBeTruthy();
    }
  });

  it("loads the example project and prices it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await openBacklog(user);
    // The component name is editable in place, and it wraps rather than crops.
    expect(screen.getAllByDisplayValue("order-service").some((el) => el.tagName === "TEXTAREA")).toBe(true);
    // The header must show a P80 the moment there is work to price.
    expect(screen.getByText("Total, P80")).toBeTruthy();
  });

  it("hides every figure under blind sizing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await openBacklog(user);
    await user.click(screen.getByRole("button", { name: /^Blind sizing/ }));
    expect(document.body.textContent).not.toMatch(/\d+\s*md/);
  });

  it("marks an item reviewed in workshop mode and reflects it in the group badge", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await openBacklog(user);
    await user.click(screen.getByRole("button", { name: "Workshop" }));
    const [markBtn] = screen.getAllByRole("button", { name: "mark reviewed" });
    await user.click(markBtn);
    expect(screen.getAllByRole("button", { name: "✓ reviewed" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^\d+\/\d+ reviewed$/).length).toBeGreaterThan(0);
  });

  it("lands on Home and opens the add modal on the right tab from its buttons", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    expect(screen.getByRole("button", { name: "Home" }).className).toMatch(/\bon\b/);
    await user.click(screen.getByRole("button", { name: "Lot" }));
    expect(await screen.findByPlaceholderText("Phase 2")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "close" }));
    await user.click(screen.getByRole("button", { name: "Component" }));
    expect(await screen.findByPlaceholderText("order-service")).toBeTruthy();
  });

  it("says what each item is, not only what it could be", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await openBacklog(user);
    const readouts = [...document.querySelectorAll(".picked")].map((el) => el.textContent);
    expect(readouts.some((t) => /^Complexity/.test(t))).toBe(true);
    expect(readouts.some((t) => /^Confidence/.test(t))).toBe(true);
    // The words, not the letters: "Complex", not the highlighted rung alone.
    expect(readouts.some((t) => t.includes("Very complex"))).toBe(true);
  });

  it("moves an existing item to another lot from the backlog", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await openBacklog(user);
    const [lotSel] = screen.getAllByTitle(/Move this item to another lot/);
    const target = [...lotSel.options].find((o) => o.textContent !== lotSel.selectedOptions[0].textContent);
    await user.selectOptions(lotSel, target.value);
    expect(screen.getAllByTitle(/Move this item to another lot/)[0].value).toBe(target.value);
  });

  it("shows the landscape as a tree on Home", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByText("Landscape")).toBeTruthy();
    expect(screen.getByText("Backend")).toBeTruthy();
    expect(screen.getByText("order-service")).toBeTruthy();
    expect(screen.getByText("Option A — Analytics")).toBeTruthy();
    expect(screen.getAllByText(/Baseline/).length).toBeGreaterThan(0);
  });

  it("shows rung initials in the dense row, and never a day count", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await openBacklog(user);
    const rungs = [...document.querySelectorAll(".lad .seg-opt")];
    expect(rungs.length).toBeGreaterThan(0);
    expect(rungs.slice(0, 5).map((b) => b.textContent)).toEqual(["S", "M", "C", "VC", "O"]);
    // The word is never lost: it labels the control and the row says it in full.
    expect(rungs.slice(0, 5).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Simple",
      "Medium",
      "Complex",
      "Very complex",
      "Outstanding",
    ]);
    expect(rungs.some((b) => /\d/.test(b.textContent))).toBe(false);
  });

  it("keeps the initials in the workshop, with the word still on the row", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await openBacklog(user);
    await user.click(screen.getByRole("button", { name: "Workshop" }));
    const rungs = [...document.querySelectorAll(".lad .seg-opt")];
    expect(rungs.slice(0, 5).map((b) => b.textContent)).toEqual(["S", "M", "C", "VC", "O"]);
    expect(rungs[3].getAttribute("aria-label")).toBe("Very complex");
    const readouts = [...document.querySelectorAll(".picked")].map((el) => el.textContent);
    expect(readouts.some((t) => t.includes("Very complex"))).toBe(true);
  });

  it("opens with every band collapsed, and expands on request", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Backlog" }));
    // Subsystem bands are there to be opened; nothing under them is rendered yet.
    expect(screen.getAllByText("Backend").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".row").length).toBe(0);
    await user.click(screen.getByTitle("Expand every component and type band"));
    expect(document.querySelectorAll(".row").length).toBeGreaterThan(0);
    await user.click(screen.getByTitle("Collapse every component and type band"));
    expect(document.querySelectorAll(".row").length).toBe(0);
  });
});
