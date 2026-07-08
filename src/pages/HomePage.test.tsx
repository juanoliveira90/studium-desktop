import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomePage } from "./HomePage";
import * as ipc from "../vault/ipc";
import type { DocPayload, ScheduleEntry } from "../vault/ipc";

vi.mock("../vault/ipc");

const entry = (frontmatter: Record<string, unknown>): ScheduleEntry => ({
  frontmatter,
  frontmatter_error: null,
});

/** sample-vault/schedule.md as the invoke layer returns it. */
const SCHEDULE: ScheduleEntry[] = [
  entry({ day: "mon", start: "09:30", end: "11:00", title: "calculus ii", plan: "[[calculus-ii]]" }),
  entry({ day: "mon", start: "17:00", end: "18:30", title: "gym" }),
  entry({ day: "tue", start: "10:00", end: "12:00", title: "linear algebra", plan: "[[linear-algebra]]" }),
  entry({ day: "thu", start: "14:00", end: "16:00", title: "sicp reading" }),
];

const doc = (
  path: string,
  frontmatter: Record<string, unknown>,
): DocPayload => ({ path, frontmatter, frontmatter_error: null, body: "" });

/** sample-vault/plans/ as the invoke layer returns it. */
const PLAN_DOCS: DocPayload[] = [
  doc("plans/calculus-ii/plan.md", { name: "Calculus II" }),
  doc("plans/calculus-ii/subjects/integrals.md", {
    tag: "integrals",
    subtasks: [
      { name: "u-substitution drills", done: true },
      { name: "partial fractions", done: false },
    ],
  }),
  doc("plans/linear-algebra/plan.md", { name: "Linear Algebra" }),
  doc("plans/linear-algebra/subjects/matrices.md", {
    tag: "matrices",
    subtasks: [{ name: "matrix factorizations (LU)", done: false }],
  }),
];

beforeEach(() => {
  // the page reads the real clock; pin it to Monday 2026-07-06, 13:00
  vi.useFakeTimers({ now: new Date(2026, 6, 6, 13, 0), shouldAdvanceTime: true });
  vi.mocked(ipc.vaultDefaultPath).mockResolvedValue("/vault");
  vi.mocked(ipc.vaultOpen).mockResolvedValue({ root: "/vault" });
  vi.mocked(ipc.scheduleList).mockResolvedValue(SCHEDULE);
  vi.mocked(ipc.docList).mockResolvedValue(PLAN_DOCS.map((d) => d.path));
  vi.mocked(ipc.docRead).mockImplementation(async (path) => {
    const found = PLAN_DOCS.find((d) => d.path === path);
    if (!found) throw new Error(`unexpected docRead(${path})`);
    return found;
  });
  vi.mocked(ipc.onVaultChanged).mockReturnValue(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  );
}

describe("HomePage", () => {
  it("builds today's checklist from today's blocks and pending subtasks", async () => {
    renderPage();

    const list = await screen.findByRole("list", { name: "today" });
    const items = within(list).getAllByRole("listitem");

    // Monday's two schedule blocks come first, with durations
    expect(items[0]).toHaveTextContent("calculus ii");
    expect(items[0]).toHaveTextContent("1h 30m");
    expect(items[1]).toHaveTextContent("gym");
    // then pending subtasks from the plans
    expect(list).toHaveTextContent("partial fractions");
    expect(list).toHaveTextContent("matrix factorizations (LU)");
    // done subtasks don't appear
    expect(list).not.toHaveTextContent("u-substitution drills");
  });

  it("marks blocks that are already over as done", async () => {
    renderPage();

    // now is 13:00: calculus ii (ended 11:00) done, gym (17:00) pending
    const calc = (await screen.findAllByText("calculus ii"))[0];
    expect(calc.closest("li")).toHaveClass("is-done");
    expect(screen.getAllByText("gym")[0].closest("li")).not.toHaveClass("is-done");
  });

  it("renders today's schedule events with their times", async () => {
    renderPage();

    const events = await screen.findByRole("list", { name: "today's events" });
    expect(events).toHaveTextContent("calculus ii");
    expect(events).toHaveTextContent("09:30–11:00");
    expect(events).toHaveTextContent("gym");
    expect(events).toHaveTextContent("17:00–18:30");
  });

  it("colors event dots by their block's linked plan", async () => {
    renderPage();

    const events = await screen.findByRole("list", { name: "today's events" });
    const calcDot = within(events)
      .getByText("calculus ii")
      .closest("li")!
      .querySelector(".dot");
    expect(calcDot).toHaveStyle({ color: "var(--block-1)" });
    const gymDot = within(events)
      .getByText("gym")
      .closest("li")!
      .querySelector(".dot");
    expect(gymDot).toHaveStyle({ color: "var(--fg-dim)" });
  });

  it("does not show schedule events from other days", async () => {
    renderPage();

    await screen.findByRole("list", { name: "today's events" });
    // "sicp reading" is Thursday's block (today is Monday)
    expect(screen.queryByText("sicp reading")).not.toBeInTheDocument();
  });

  it("derives up next from the first block after now", async () => {
    renderPage();

    const when = await screen.findByText("today 17:00");
    expect(when.closest(".entry")).toHaveTextContent("gym");
  });

  it("says nothing is scheduled on a free day", async () => {
    vi.setSystemTime(new Date(2026, 6, 12, 13, 0)); // Sunday: no blocks

    renderPage();

    expect(await screen.findByText("nothing scheduled")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "today" });
    expect(within(list).queryAllByText("calculus ii")).toEqual([]);
  });

  it("asks for a vault when none is remembered", async () => {
    vi.mocked(ipc.vaultDefaultPath).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByRole("button", { name: /open vault/ })).toBeInTheDocument();
    expect(ipc.scheduleList).not.toHaveBeenCalled();
  });
});
