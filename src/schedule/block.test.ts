import { describe, expect, it } from "vitest";
import {
  blocksForDay,
  gridPlacement,
  planColorBySlug,
  scheduleFromEntries,
  type ScheduleBlock,
} from "./block";
import type { ScheduleEntry } from "../vault/ipc";

const entry = (frontmatter: Record<string, unknown>): ScheduleEntry => ({
  frontmatter,
  frontmatter_error: null,
});

const block = (over: Partial<ScheduleBlock>): ScheduleBlock => ({
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
      { day: "mon", start: "09:30", end: "11:00", title: "calculus ii", plan: "calculus-ii" },
      { day: "tue", start: "10:00", end: "12:00", title: "gym", plan: undefined },
    ]);
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
      { day: "fri", start: "10:00", end: "11:00", title: "fine", plan: undefined },
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
