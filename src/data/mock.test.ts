import { describe, expect, it } from "vitest";
import {
  blocksForDay,
  formatBlockTime,
  SCHEDULE_BLOCKS,
  TODAY_DAY_INDEX,
  TODAY_TASKS,
} from "./mock";

describe("blocksForDay", () => {
  it("returns only the given day's blocks, sorted by start time", () => {
    const blocks = blocksForDay(TODAY_DAY_INDEX);

    expect(blocks.map((b) => b.label)).toEqual([
      "lunch",
      "discrete math",
      "project work",
    ]);
    expect(blocks.every((b) => b.day === TODAY_DAY_INDEX)).toBe(true);
  });

  it("returns an empty array for a day with no blocks", () => {
    expect(blocksForDay(6)).toEqual([]);
  });
});

describe("formatBlockTime", () => {
  it("formats a block's hours as a zero-padded range", () => {
    expect(
      formatBlockTime({ day: 2, start: 8, end: 10, label: "x", color: 1 }),
    ).toBe("08:00–10:00");
    expect(
      formatBlockTime({ day: 2, start: 14, end: 16, label: "x", color: 1 }),
    ).toBe("14:00–16:00");
  });
});

describe("mock data", () => {
  it("keeps the schedule and today's tasks available", () => {
    expect(SCHEDULE_BLOCKS.length).toBeGreaterThan(0);
    expect(TODAY_TASKS.length).toBe(5);
  });
});
