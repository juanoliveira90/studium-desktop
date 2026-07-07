import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SchedulePage } from "./SchedulePage";
import * as ipc from "../vault/ipc";
import type { ScheduleEntry } from "../vault/ipc";

vi.mock("../vault/ipc");

/** sample-vault/schedule.md as the schedule_list command returns it. */
const ENTRIES: ScheduleEntry[] = [
  { frontmatter: { day: "mon", start: "09:30", end: "11:00", title: "calculus ii", plan: "[[calculus-ii]]" }, frontmatter_error: null },
  { frontmatter: { day: "mon", start: "17:00", end: "18:30", title: "gym" }, frontmatter_error: null },
  { frontmatter: { day: "tue", start: "10:00", end: "12:00", title: "linear algebra", plan: "[[linear-algebra]]" }, frontmatter_error: null },
  { frontmatter: { day: "wed", start: "09:30", end: "11:00", title: "calculus ii", plan: "[[calculus-ii]]" }, frontmatter_error: null },
  { frontmatter: { day: "thu", start: "14:00", end: "16:00", title: "sicp reading" }, frontmatter_error: null },
  { frontmatter: { day: "fri", start: "10:00", end: "12:00", title: "linear algebra", plan: "[[linear-algebra]]" }, frontmatter_error: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ipc.vaultDefaultPath).mockResolvedValue("/vault");
  vi.mocked(ipc.vaultOpen).mockResolvedValue({ root: "/vault" });
  vi.mocked(ipc.scheduleList).mockResolvedValue(ENTRIES);
  vi.mocked(ipc.onVaultChanged).mockReturnValue(() => {});
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SchedulePage />
    </QueryClientProvider>,
  );
}

describe("SchedulePage", () => {
  it("renders a column head for each weekday of the recurring routine", async () => {
    renderPage();

    expect(await screen.findByText("mon")).toBeInTheDocument();
    for (const day of ["tue", "wed", "thu", "fri", "sat", "sun"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });

  it("renders hour labels every two hours from 08:00 to 22:00", async () => {
    renderPage();

    for (const hour of ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]) {
      expect(await screen.findByText(hour)).toBeInTheDocument();
    }
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  });

  it("places the vault's blocks on a half-hour grid from their frontmatter times", async () => {
    renderPage();

    // "sicp reading" runs thu 14:00–16:00: rows are half-hours offset from
    // 08:00 plus one header row → row (14-8)*2+2 = 14, span 4 half-hours.
    const sicp = await screen.findByText("sicp reading");
    expect(sicp).toHaveStyle({ gridRow: "14 / span 4" });
    expect(sicp).toHaveStyle({ gridColumn: "5" });

    // "gym" runs mon 17:00–18:30 → row (17-8)*2+2 = 20, span 3.
    const gym = screen.getByText("gym");
    expect(gym).toHaveStyle({ gridRow: "20 / span 3" });
    expect(gym).toHaveStyle({ gridColumn: "2" });
  });

  it("colors blocks by their linked plan and leaves unlinked blocks default", async () => {
    renderPage();

    const calc = (await screen.findAllByText("calculus ii"))[0];
    expect(calc).toHaveStyle({ background: "var(--block-1)" });
    const linalg = screen.getAllByText("linear algebra")[0];
    expect(linalg).toHaveStyle({ background: "var(--block-2)" });
    expect(screen.getByText("gym").getAttribute("style")).not.toContain("background");
  });

  it("labels the schedule as the weekly routine, with no week navigation", async () => {
    renderPage();

    expect(await screen.findByText("weekly routine")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "previous week" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "next week" })).not.toBeInTheDocument();
  });

  it("keeps good blocks and reports the broken ones from hand-edits", async () => {
    vi.mocked(ipc.scheduleList).mockResolvedValue([
      ...ENTRIES,
      { frontmatter: {}, frontmatter_error: "bad YAML on line 2" },
      { frontmatter: { day: "someday", start: "10:00", end: "11:00", title: "limbo" }, frontmatter_error: null },
    ]);
    renderPage();

    expect(await screen.findByText("gym")).toBeInTheDocument();
    expect(screen.queryByText("limbo")).not.toBeInTheDocument();
    const warning = screen.getByText(/2 schedule blocks in schedule.md couldn't be read/);
    expect(warning).toHaveTextContent("block 7: bad YAML on line 2");
    expect(warning).toHaveTextContent("block 8: invalid or missing day");
  });

  it("renders an empty grid for an empty schedule.md", async () => {
    vi.mocked(ipc.scheduleList).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("mon")).toBeInTheDocument();
    expect(screen.queryByText(/couldn't be read/)).not.toBeInTheDocument();
  });

  it("asks for a vault when none is remembered", async () => {
    vi.mocked(ipc.vaultDefaultPath).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByLabelText("vault path")).toBeInTheDocument();
    expect(ipc.scheduleList).not.toHaveBeenCalled();
  });
});
