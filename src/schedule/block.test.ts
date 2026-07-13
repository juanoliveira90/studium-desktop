import { describe, expect, it } from "vitest";
import {
  blockDuration,
  blocksForDay,
  cellEventTimes,
  eventFrontmatter,
  formatBlockTime,
  gridPlacement,
  isValidTime,
  planColorBySlug,
  scheduleFromEntries,
  wrappedScrollTop,
  type ScheduleBlock,
} from "./block";
import type { ScheduleEntry } from "../vault/ipc";

const entry = (frontmatter: Record<string, unknown>): ScheduleEntry => ({
  frontmatter,
  frontmatter_error: null,
});

const block = (over: Partial<ScheduleBlock>): ScheduleBlock => ({
  index: 0,
  day: "mon",
  start: "09:00",
  end: "10:00",
  title: "x",
  ...over,
});

describe("scheduleFromEntries", () => {
  it("builds blocks from valid entries, stripping plan wiki-links", () => {
    const { blocks, errors } = scheduleFromEntries([
      entry({ day: "mon", start: "09:30", end: "11:00", title: "calculus ii", plan: "[[calculus-ii]]" }),
      entry({ day: "tue", start: "10:00", end: "12:00", title: "gym" }),
    ]);
    expect(errors).toEqual([]);
    expect(blocks).toEqual([
      { index: 0, day: "mon", start: "09:30", end: "11:00", title: "calculus ii", description: undefined, plan: "calculus-ii" },
      { index: 1, day: "tue", start: "10:00", end: "12:00", title: "gym", description: undefined, plan: undefined },
    ]);
  });

  it("keeps a string description and drops non-string hand-edits", () => {
    const { blocks } = scheduleFromEntries([
      entry({ day: "mon", start: "09:00", end: "10:00", title: "x", description: "ch. 3 exercises" }),
      entry({ day: "tue", start: "09:00", end: "10:00", title: "y", description: 123 }),
    ]);
    expect(blocks[0].description).toBe("ch. 3 exercises");
    expect(blocks[1].description).toBeUndefined();
  });

  it("indexes blocks by their entry position, counting broken entries", () => {
    const { blocks } = scheduleFromEntries([
      { frontmatter: {}, frontmatter_error: "bad YAML" },
      entry({ day: "mon", start: "09:00", end: "10:00", title: "after the broken one" }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].index).toBe(1);
  });

  it("accepts a bare slug in plan", () => {
    const { blocks } = scheduleFromEntries([
      entry({ day: "wed", start: "08:00", end: "09:00", title: "x", plan: "linear-algebra" }),
    ]);
    expect(blocks[0].plan).toBe("linear-algebra");
  });

  it("reports invalid days, times, and missing titles per block, keeping the rest", () => {
    const { blocks, errors } = scheduleFromEntries([
      entry({ day: "monday", start: "09:00", end: "10:00", title: "bad day" }),
      entry({ day: "tue", start: "9am", end: "10:00", title: "bad time" }),
      entry({ day: "wed", start: "09:00", end: "10:00" }),
      entry({ day: "thu", start: "10:00", end: "09:00", title: "ends before it starts" }),
      entry({ day: "fri", start: "10:00", end: "11:00", title: "fine" }),
    ]);
    expect(blocks).toEqual([
      { index: 4, day: "fri", start: "10:00", end: "11:00", title: "fine", description: undefined, plan: undefined },
    ]);
    expect(errors).toHaveLength(4);
    expect(errors[0]).toMatch(/block 1/);
    expect(errors[0]).toMatch(/day/);
    expect(errors[1]).toMatch(/block 2/);
    expect(errors[2]).toMatch(/block 3/);
    expect(errors[3]).toMatch(/block 4/);
  });

  it("surfaces the vault core's YAML error for a malformed block", () => {
    const { blocks, errors } = scheduleFromEntries([
      { frontmatter: {}, frontmatter_error: "expected a mapping, found a sequence" },
      entry({ day: "mon", start: "08:00", end: "09:00", title: "ok" }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(errors).toEqual(["block 1: expected a mapping, found a sequence"]);
  });

  it("has nothing for an empty schedule", () => {
    expect(scheduleFromEntries([])).toEqual({ blocks: [], errors: [] });
  });
});

describe("blocksForDay", () => {
  it("filters to the day and sorts by start time", () => {
    const blocks = [
      block({ day: "mon", start: "17:00", title: "late" }),
      block({ day: "tue", start: "10:00", title: "other day" }),
      block({ day: "mon", start: "09:30", title: "early" }),
    ];
    expect(blocksForDay("mon", blocks).map((b) => b.title)).toEqual(["early", "late"]);
  });
});

describe("formatBlockTime", () => {
  it("formats a block's times as a range", () => {
    expect(formatBlockTime(block({ start: "09:30", end: "11:00" }))).toBe("09:30–11:00");
  });
});

describe("blockDuration", () => {
  it("derives a human duration from the block times", () => {
    expect(blockDuration(block({ start: "09:30", end: "11:00" }))).toBe("1h 30m");
    expect(blockDuration(block({ start: "10:00", end: "12:00" }))).toBe("2h");
    expect(blockDuration(block({ start: "10:00", end: "10:45" }))).toBe("45m");
  });
});

describe("gridPlacement", () => {
  // The page's window is 08:00–22:00 in half-hour rows; row is 0-based from
  // the top of the window.
  it("places a block by half-hour rows within the window", () => {
    const placed = gridPlacement(block({ start: "14:00", end: "16:00" }), 8, 22);
    expect(placed).toEqual({ row: 12, span: 4 });
  });

  it("clamps blocks that spill past the window edges", () => {
    expect(gridPlacement(block({ start: "07:00", end: "09:00" }), 8, 22)).toEqual({ row: 0, span: 2 });
    expect(gridPlacement(block({ start: "21:00", end: "23:30" }), 8, 22)).toEqual({ row: 26, span: 2 });
  });

  it("hides blocks entirely outside the window", () => {
    expect(gridPlacement(block({ start: "06:00", end: "07:30" }), 8, 22)).toBeNull();
    expect(gridPlacement(block({ start: "22:00", end: "23:00" }), 8, 22)).toBeNull();
  });

  it("rounds off-grid times outward and keeps at least one row", () => {
    expect(gridPlacement(block({ start: "09:40", end: "09:55" }), 8, 22)).toEqual({ row: 3, span: 1 });
  });
});

describe("wrappedScrollTop", () => {
  // the page stacks three 24h copies; the scroll position lives in the
  // middle one, jumping a cycle whenever it drifts into the first or last
  // copy so scrolling wraps around the routine forever
  it("keeps a position inside the middle copy unchanged", () => {
    expect(wrappedScrollTop(1000, 1000)).toBe(1000);
  });

  it("jumps a cycle down when scrolled up into the first copy", () => {
    expect(wrappedScrollTop(400, 1000)).toBe(1400);
  });

  it("jumps a cycle up when scrolled down into the last copy", () => {
    expect(wrappedScrollTop(1600, 1000)).toBe(600);
  });
});

describe("isValidTime", () => {
  it("accepts 24h HH:MM and rejects everything else", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("09:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:30")).toBe(false);
    expect(isValidTime("09:60")).toBe(false);
    expect(isValidTime("9am")).toBe(false);
    expect(isValidTime("")).toBe(false);
  });
});

describe("eventFrontmatter", () => {
  it("builds the vault-format frontmatter, wrapping the plan as a wiki-link", () => {
    expect(
      eventFrontmatter({
        day: "mon",
        start: "09:30",
        end: "11:00",
        title: "calculus ii",
        description: "ch. 3 exercises",
        plan: "calculus-ii",
      }),
    ).toEqual({
      day: "mon",
      start: "09:30",
      end: "11:00",
      title: "calculus ii",
      description: "ch. 3 exercises",
      plan: "[[calculus-ii]]",
    });
  });

  it("omits empty optional fields instead of writing empty keys", () => {
    expect(
      eventFrontmatter({ day: "tue", start: "10:00", end: "12:00", title: "gym", description: "", plan: "" }),
    ).toEqual({ day: "tue", start: "10:00", end: "12:00", title: "gym" });
  });
});

describe("cellEventTimes", () => {
  it("starts at the clicked half-hour and lasts one hour", () => {
    expect(cellEventTimes("mon", 0)).toEqual({ day: "mon", start: "00:00", end: "01:00" });
    expect(cellEventTimes("thu", 30)).toEqual({ day: "thu", start: "15:00", end: "16:00" });
    expect(cellEventTimes("sun", 19)).toEqual({ day: "sun", start: "09:30", end: "10:30" });
  });

  it("clamps the end before midnight, where the schedule format stops", () => {
    expect(cellEventTimes("fri", 46)).toEqual({ day: "fri", start: "23:00", end: "23:59" });
    expect(cellEventTimes("fri", 47)).toEqual({ day: "fri", start: "23:30", end: "23:59" });
  });
});

describe("planColorBySlug", () => {
  it("assigns stable colors in weekday-then-time order, cycling the palette", () => {
    const blocks = [
      block({ day: "fri", start: "10:00", plan: "e" }),
      block({ day: "mon", start: "09:00", plan: "a" }),
      block({ day: "mon", start: "11:00", plan: "b" }),
      block({ day: "mon", start: "12:00" }), // unlinked, no color
      block({ day: "tue", start: "09:00", plan: "c" }),
      block({ day: "wed", start: "09:00", plan: "d" }),
      block({ day: "thu", start: "09:00", plan: "a" }), // repeat keeps its color
    ];
    const colors = planColorBySlug(blocks);
    expect(colors.get("a")).toBe(1);
    expect(colors.get("b")).toBe(2);
    expect(colors.get("c")).toBe(3);
    expect(colors.get("d")).toBe(4);
    expect(colors.get("e")).toBe(1); // fifth plan cycles back
    expect(colors.size).toBe(5);
  });
});
