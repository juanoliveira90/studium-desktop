import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlansPage } from "./PlansPage";
import * as ipc from "../vault/ipc";
import type { DocPayload, ScheduleEntry } from "../vault/ipc";

vi.mock("../vault/ipc");

const doc = (
  path: string,
  frontmatter: Record<string, unknown>,
  body = "",
): DocPayload => ({ path, frontmatter, frontmatter_error: null, body });

/** sample-vault/plans/ as the invoke layer returns it. */
const SAMPLE_DOCS: DocPayload[] = [
  doc("plans/calculus-ii/plan.md", {
    name: "Calculus II",
    start: "2026-06-01",
    end: "2026-07-20",
    schedule_block: "[[calculus-ii]]",
  }),
  doc("plans/calculus-ii/subjects/integrals.md", {
    tag: "integrals",
    subtasks: [
      { name: "u-substitution drills", done: true },
      { name: "integration by parts", done: true },
      { name: "partial fractions", done: false },
      { name: "improper integrals", done: false },
    ],
  }),
  doc("plans/calculus-ii/subjects/series.md", {
    tag: "series",
    subtasks: [
      { name: "convergence tests summary sheet", done: true },
      { name: "power series exercises", done: false },
      { name: "taylor series exercises", done: false },
    ],
  }),
  doc("plans/linear-algebra/plan.md", {
    name: "Linear Algebra",
    start: "2026-07-01",
    end: "2026-08-30",
    schedule_block: "[[linear-algebra]]",
  }),
  doc("plans/linear-algebra/subjects/matrices.md", {
    tag: "matrices",
    subtasks: [
      { name: "gaussian elimination practice", done: true },
      { name: "matrix factorizations (LU)", done: false },
    ],
  }),
];

/** Enough of schedule.md to link both plans to blocks (colors 1 and 2). */
const SCHEDULE: ScheduleEntry[] = [
  { frontmatter: { day: "mon", start: "09:30", end: "11:00", title: "calculus ii", plan: "[[calculus-ii]]" }, frontmatter_error: null },
  { frontmatter: { day: "tue", start: "10:00", end: "12:00", title: "linear algebra", plan: "[[linear-algebra]]" }, frontmatter_error: null },
];

function mockDocs(docs: DocPayload[]) {
  vi.mocked(ipc.docList).mockResolvedValue(docs.map((d) => d.path));
  vi.mocked(ipc.docRead).mockImplementation(async (path) => {
    const found = docs.find((d) => d.path === path);
    if (!found) throw new Error(`unexpected docRead(${path})`);
    return found;
  });
}

beforeEach(() => {
  // the page derives today from the clock; pin it inside the sample ranges
  vi.useFakeTimers({ now: new Date(2026, 6, 7), shouldAdvanceTime: true });
  vi.mocked(ipc.vaultDefaultPath).mockResolvedValue("/vault");
  vi.mocked(ipc.vaultOpen).mockResolvedValue({ root: "/vault" });
  vi.mocked(ipc.scheduleList).mockResolvedValue(SCHEDULE);
  vi.mocked(ipc.docWrite).mockResolvedValue(undefined);
  vi.mocked(ipc.onVaultChanged).mockReturnValue(() => {});
  mockDocs(SAMPLE_DOCS);
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
      <PlansPage />
    </QueryClientProvider>,
  );
}

describe("PlansPage", () => {
  it("lists the vault's plans with their formatted date ranges", async () => {
    renderPage();

    expect(await screen.findByText("Calculus II")).toBeInTheDocument();
    expect(screen.getByText("Jun 1 — Jul 20")).toBeInTheDocument();
    expect(screen.getByText("Linear Algebra")).toBeInTheDocument();
    expect(screen.getByText("Jul 1 — Aug 30")).toBeInTheDocument();
  });

  it("computes progress from the plans' subject subtasks", async () => {
    renderPage();

    // calculus-ii: 3 of 7 subtasks done; linear-algebra: 1 of 2
    expect(await screen.findByText("43%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("colors each plan's dot by its schedule wiki-link", async () => {
    renderPage();

    const calc = await screen.findByText("Calculus II");
    const calcDot = calc.closest("li")!.querySelector(".dot");
    expect(calcDot).toHaveStyle({ color: "var(--block-1)" });
    const linalg = screen.getByText("Linear Algebra");
    const linalgDot = linalg.closest("li")!.querySelector(".dot");
    expect(linalgDot).toHaveStyle({ color: "var(--block-2)" });
  });

  it("files plans under active/upcoming/archive tabs by their date range", async () => {
    mockDocs([
      ...SAMPLE_DOCS,
      doc("plans/last-term/plan.md", {
        name: "Last Term",
        start: "2026-01-01",
        end: "2026-02-01",
      }),
      doc("plans/next-term/plan.md", {
        name: "Next Term",
        start: "2026-08-01",
        end: "2026-09-01",
      }),
    ]);
    const user = userEvent.setup();
    renderPage();

    // today is 2026-07-07: sample plans are active, the others are not
    expect(await screen.findByText("Calculus II")).toBeInTheDocument();
    expect(screen.queryByText("Last Term")).not.toBeInTheDocument();
    expect(screen.queryByText("Next Term")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "upcoming" }));
    expect(screen.getByText("Next Term")).toBeInTheDocument();
    expect(screen.queryByText("Calculus II")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "archive" }));
    expect(screen.getByText("Last Term")).toBeInTheDocument();
    expect(screen.queryByText("Next Term")).not.toBeInTheDocument();
  });

  it("creates plans/<slug>/plan.md when a new plan is named", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "+ new plan" }));
    await user.type(screen.getByLabelText("new plan name"), "Real Analysis I{Enter}");

    expect(ipc.docWrite).toHaveBeenCalledWith(
      "plans/real-analysis-i/plan.md",
      { name: "Real Analysis I", start: "2026-07-07" },
      "",
    );
  });

  it("opens a plan's subjects and toggles a subtask back into its file", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Calculus II"));
    expect(screen.getByText("integrals")).toBeInTheDocument();
    expect(screen.getByText("series")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /u-substitution drills/ })).toHaveTextContent("☑");
    const partial = screen.getByRole("button", { name: /partial fractions/ });
    expect(partial).toHaveTextContent("☐");

    await user.click(partial);
    expect(ipc.docWrite).toHaveBeenCalledWith(
      "plans/calculus-ii/subjects/integrals.md",
      {
        tag: "integrals",
        subtasks: [
          { name: "u-substitution drills", done: true },
          { name: "integration by parts", done: true },
          { name: "partial fractions", done: true },
          { name: "improper integrals", done: false },
        ],
      },
      "",
    );
  });

  it("creates plans/<slug>/subjects/<tag>.md when a new subject is named", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Calculus II"));
    await user.click(screen.getByRole("button", { name: "+ new subject" }));
    await user.type(screen.getByLabelText("new subject name"), "Improper Integrals{Enter}");

    expect(ipc.docWrite).toHaveBeenCalledWith(
      "plans/calculus-ii/subjects/improper-integrals.md",
      { tag: "Improper Integrals", subtasks: [] },
      "",
    );
  });

  it("keeps the plan detail open when escape cancels the new-subject input", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Calculus II"));
    await user.click(screen.getByRole("button", { name: "+ new subject" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("new subject name")).not.toBeInTheDocument();
    expect(screen.getByText("integrals")).toBeInTheDocument();
  });

  it("appends a new task to its subject file when named", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Linear Algebra"));
    await user.click(screen.getByRole("button", { name: "+ new task" }));
    await user.type(screen.getByLabelText("new task in matrices"), "eigenvalues{Enter}");

    expect(ipc.docWrite).toHaveBeenCalledWith(
      "plans/linear-algebra/subjects/matrices.md",
      {
        tag: "matrices",
        subtasks: [
          { name: "gaussian elimination practice", done: true },
          { name: "matrix factorizations (LU)", done: false },
          { name: "eigenvalues", done: false },
        ],
      },
      "",
    );
  });

  it("offers no task creation on subjects with broken frontmatter", async () => {
    mockDocs([
      ...SAMPLE_DOCS,
      {
        path: "plans/linear-algebra/subjects/broken.md",
        frontmatter: {},
        frontmatter_error: "bad YAML on line 1",
        body: "",
      },
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Linear Algebra"));
    // one editable subject (matrices) → exactly one add-task row
    expect(screen.getAllByRole("button", { name: "+ new task" })).toHaveLength(1);
  });

  it("returns from the plan detail to the list on escape", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByText("Calculus II"));
    expect(screen.getByText("integrals")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("integrals")).not.toBeInTheDocument();
    expect(screen.getByText("Linear Algebra")).toBeInTheDocument();
  });

  it("marks plans whose plan.md has broken YAML instead of hiding them", async () => {
    mockDocs([
      ...SAMPLE_DOCS,
      {
        path: "plans/broken/plan.md",
        frontmatter: {},
        frontmatter_error: "bad YAML on line 2",
        body: "",
      },
    ]);
    renderPage();

    // name falls back to the slug; dates missing → filed under active
    expect(await screen.findByText("broken")).toBeInTheDocument();
    expect(screen.getByTitle("bad YAML on line 2")).toBeInTheDocument();
  });

  it("reports files that don't fit the plans layout", async () => {
    mockDocs([...SAMPLE_DOCS, doc("plans/stray.md", {})]);
    renderPage();

    expect(
      await screen.findByText(/plans\/stray\.md: not part of a plans/),
    ).toBeInTheDocument();
  });

  it("asks for a vault when none is remembered", async () => {
    vi.mocked(ipc.vaultDefaultPath).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByLabelText("vault path")).toBeInTheDocument();
    expect(ipc.docList).not.toHaveBeenCalled();
  });
});
