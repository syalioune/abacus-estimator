import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";

/** A smoke test per room: the app must mount and every tab must render. */
describe("App", () => {
  beforeEach(() => window.localStorage.clear());

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
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Backlog" }));
    expect(screen.getAllByDisplayValue("order-service").some((el) => el.tagName === "INPUT")).toBe(true);
    // The header must show a P80 the moment there is work to price.
    expect(screen.getByText("Total, P80")).toBeTruthy();
  });

  it("hides every figure under blind sizing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Backlog" }));
    await user.click(screen.getByRole("button", { name: /^Blind sizing/ }));
    expect(document.body.textContent).not.toMatch(/\d+\s*md/);
  });

  it("marks an item reviewed in workshop mode and reflects it in the group badge", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Backlog" }));
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

  it("shows rung words, never day counts, on the ladder", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByDisplayValue("New project");
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Load example" }));
    await user.click(screen.getByRole("button", { name: "Backlog" }));
    const rungs = document.querySelectorAll(".lad .seg-opt");
    expect(rungs.length).toBeGreaterThan(0);
    expect([...rungs].slice(0, 5).map((b) => b.textContent)).toEqual([
      "Simple",
      "Medium",
      "Complex",
      "Very complex",
      "Outstanding",
    ]);
  });
});
