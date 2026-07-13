import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  vi.mocked(ipc.scheduleAdd).mockResolvedValue(undefined);
  vi.mocked(ipc.scheduleUpdate).mockResolvedValue(undefined);
  vi.mocked(ipc.scheduleDelete).mockResolvedValue(undefined);
  // the form's plan dropdown reads the plans/ tree; empty by default
  vi.mocked(ipc.docList).mockResolvedValue([]);
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

  it("renders the full 24h of hour labels, once per wrap-around copy", async () => {
    renderPage();

    // the 24h cycle is stacked three times so the scroll can wrap around
    expect(await screen.findAllByText("00:00")).toHaveLength(3);
    for (const hour of ["02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]) {
      expect(screen.getAllByText(hour)).toHaveLength(3);
    }
    expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  });

  it("places the vault's blocks on a half-hour grid, once per wrap-around copy", async () => {
    renderPage();

    // "sicp reading" runs thu 14:00–16:00: rows are half-hours from midnight
    // plus one header row → row 14*2+2 = 30 in the first copy, span 4; each
    // further copy sits one 24h cycle (48 rows) down.
    const sicp = await screen.findAllByText("sicp reading");
    expect(sicp.map((el) => el.style.gridRow)).toEqual([
      "30 / span 4",
      "78 / span 4",
      "126 / span 4",
    ]);
    expect(sicp[0]).toHaveStyle({ gridColumn: "5" });

    // "gym" runs mon 17:00–18:30 → row 17*2+2 = 36, span 3.
    const gym = screen.getAllByText("gym");
    expect(gym.map((el) => el.style.gridRow)).toEqual([
      "36 / span 3",
      "84 / span 3",
      "132 / span 3",
    ]);
    expect(gym[0]).toHaveStyle({ gridColumn: "2" });
  });

  it("puts the grid in a scroll viewport so the whole 24h range is reachable", async () => {
    renderPage();
    await screen.findByText("mon");

    const scroller = document.querySelector(".week-scroll");
    expect(scroller).not.toBeNull();
    expect(scroller!.querySelector(".week-grid")).not.toBeNull();
  });

  it("colors blocks by their linked plan and leaves unlinked blocks default", async () => {
    renderPage();

    const calc = (await screen.findAllByText("calculus ii"))[0];
    expect(calc).toHaveStyle({ background: "var(--block-1)" });
    const linalg = screen.getAllByText("linear algebra")[0];
    expect(linalg).toHaveStyle({ background: "var(--block-2)" });
    expect(screen.getAllByText("gym")[0].getAttribute("style")).not.toContain("background");
  });

  it("labels the schedule as the weekly routine, with no week navigation", async () => {
    renderPage();

    expect(await screen.findByRole("region", { name: "weekly routine" })).toBeInTheDocument();
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

    expect((await screen.findAllByText("gym")).length).toBeGreaterThan(0);
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

  it("adds an event through the form", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "+ new event" }));
    await user.type(screen.getByLabelText("event title"), "morning run");
    await user.type(screen.getByLabelText("event description"), "5k easy");
    await user.selectOptions(screen.getByLabelText("event day"), "sat");
    await user.type(screen.getByLabelText("start time"), "08:00");
    await user.type(screen.getByLabelText("end time"), "09:15");
    await user.click(screen.getByRole("button", { name: "add event" }));

    expect(ipc.scheduleAdd).toHaveBeenCalledWith({
      day: "sat",
      start: "08:00",
      end: "09:15",
      title: "morning run",
      description: "5k easy",
    });
    // the form closes back to the button on success
    expect(await screen.findByRole("button", { name: "+ new event" })).toBeInTheDocument();
  });

  it("links a plan from the dropdown as a wiki-link", async () => {
    vi.mocked(ipc.docList).mockResolvedValue(["plans/calculus-ii/plan.md"]);
    vi.mocked(ipc.docRead).mockResolvedValue({
      path: "plans/calculus-ii/plan.md",
      frontmatter: { name: "Calculus II" },
      frontmatter_error: null,
      body: "",
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "+ new event" }));
    await user.type(screen.getByLabelText("event title"), "review session");
    await user.type(screen.getByLabelText("start time"), "13:00");
    await user.type(screen.getByLabelText("end time"), "14:00");
    await user.selectOptions(await screen.findByLabelText("linked plan"), "calculus-ii");
    await user.click(screen.getByRole("button", { name: "add event" }));

    expect(ipc.scheduleAdd).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "[[calculus-ii]]" }),
    );
  });

  it("rejects invalid times and a missing title without writing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "+ new event" }));
    await user.click(screen.getByRole("button", { name: "add event" }));
    expect(await screen.findByText(/title is required/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("event title"), "x");
    await user.type(screen.getByLabelText("start time"), "9am");
    await user.click(screen.getByRole("button", { name: "add event" }));
    expect(await screen.findByText(/start must be/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("start time"));
    await user.type(screen.getByLabelText("start time"), "10:00");
    await user.type(screen.getByLabelText("end time"), "09:00");
    await user.click(screen.getByRole("button", { name: "add event" }));
    expect(await screen.findByText(/end must be after start/)).toBeInTheDocument();

    expect(ipc.scheduleAdd).not.toHaveBeenCalled();
  });

  it("edits an event by clicking its block", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click((await screen.findAllByText("gym"))[0]);
    const title = screen.getByLabelText("event title");
    expect(title).toHaveValue("gym");
    await user.clear(title);
    await user.type(title, "gym session");
    await user.click(screen.getByRole("button", { name: "save event" }));

    // "gym" is the second entry of schedule.md
    expect(ipc.scheduleUpdate).toHaveBeenCalledWith(1, {
      day: "mon",
      start: "17:00",
      end: "18:30",
      title: "gym session",
    });
  });

  it("opens the edit form in a popover beside the clicked block", async () => {
    const user = userEvent.setup();
    renderPage();

    const gym = (await screen.findAllByText("gym"))[0];
    gym.getBoundingClientRect = () =>
      ({ top: 120, left: 200, right: 300, bottom: 160, width: 100, height: 40, x: 200, y: 120, toJSON: () => ({}) }) as DOMRect;
    await user.click(gym);

    const popover = screen.getByLabelText("event title").closest(".event-popover");
    expect(popover).not.toBeNull();
    // beside the block: top aligned with it, left just past its right edge
    expect(popover).toHaveStyle({ top: "120px", left: "308px" });
  });

  it("keeps the new-event form below the grid, not in a popover", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "+ new event" }));

    expect(screen.getByLabelText("event title").closest(".event-popover")).toBeNull();
  });

  it("opens a prefilled new-event popover from a click on an empty cell", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("mon");

    // cells are row-major (7 per row): absolute row 30 is 15:00 (half-hour
    // rows from midnight), day index 3 is thu
    const cell = document.querySelectorAll(".week-grid .cell")[30 * 7 + 3] as HTMLElement;
    await user.click(cell);

    expect(screen.getByLabelText("event day")).toHaveValue("thu");
    expect(screen.getByLabelText("start time")).toHaveValue("15:00");
    expect(screen.getByLabelText("end time")).toHaveValue("16:00");
    // shown where the click happened, like editing a block — not below the grid
    expect(screen.getByLabelText("event title").closest(".event-popover")).not.toBeNull();
  });

  it("maps cell clicks in the wrap-around copies to the same times", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("mon");

    // the same thu 15:00 cell, one 24h copy (48 rows) further down
    const cell = document.querySelectorAll(".week-grid .cell")[(30 + 48) * 7 + 3] as HTMLElement;
    await user.click(cell);

    expect(screen.getByLabelText("event day")).toHaveValue("thu");
    expect(screen.getByLabelText("start time")).toHaveValue("15:00");
    expect(screen.getByLabelText("end time")).toHaveValue("16:00");
  });

  it("adds an event through the cell-click popover", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("mon");

    const cell = document.querySelectorAll(".week-grid .cell")[30 * 7 + 3] as HTMLElement;
    await user.click(cell);
    await user.type(screen.getByLabelText("event title"), "office hours");
    await user.click(screen.getByRole("button", { name: "add event" }));

    expect(ipc.scheduleAdd).toHaveBeenCalledWith({
      day: "thu",
      start: "15:00",
      end: "16:00",
      title: "office hours",
    });
    expect(await screen.findByRole("button", { name: "+ new event" })).toBeInTheDocument();
  });

  it("cancelling an edit writes nothing", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click((await screen.findAllByText("gym"))[0]);
    await user.click(screen.getByRole("button", { name: "cancel" }));

    expect(screen.queryByLabelText("event title")).not.toBeInTheDocument();
    expect(ipc.scheduleUpdate).not.toHaveBeenCalled();
  });

  it("deletes an event from the right-click menu after confirming", async () => {
    const user = userEvent.setup();
    renderPage();

    const gym = (await screen.findAllByText("gym"))[0];
    await user.pointer({ keys: "[MouseRight]", target: gym });
    await user.click(screen.getByRole("menuitem", { name: "delete event" }));
    expect(ipc.scheduleDelete).not.toHaveBeenCalled(); // armed, not fired
    await user.click(screen.getByRole("menuitem", { name: "really delete?" }));

    expect(ipc.scheduleDelete).toHaveBeenCalledWith(1);
  });

  it("shows a block's description under its title", async () => {
    vi.mocked(ipc.scheduleList).mockResolvedValue([
      { frontmatter: { day: "mon", start: "09:00", end: "11:00", title: "deep work", description: "thesis draft" }, frontmatter_error: null },
    ]);
    renderPage();

    expect(await screen.findAllByText("deep work")).toHaveLength(3);
    expect(screen.getAllByText("thesis draft")).toHaveLength(3);
  });

  it("asks for a vault when none is remembered", async () => {
    vi.mocked(ipc.vaultDefaultPath).mockResolvedValue(null);
    renderPage();

    expect(await screen.findByRole("button", { name: /open vault/ })).toBeInTheDocument();
    expect(ipc.scheduleList).not.toHaveBeenCalled();
  });
});
