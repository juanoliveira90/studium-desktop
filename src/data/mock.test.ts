import { describe, expect, it } from "vitest";
import {
  blockDuration,
  blocksForDay,
  formatBlockTime,
  formatDateRange,
  formatShortDate,
  MOCK_TODAY,
  PLANS,
  planColorIndex,
  planProgress,
  SCHEDULE_BLOCKS,
  todayChecklist,
  upNextBlock,
} from "./mock";

describe("schedule helpers", () => {
  it("returns only the given day's blocks, sorted by start time", () => {
    const blocks = blocksForDay("mon");

    expect(blocks.map((b) => b.title)).toEqual(["calculus ii", "gym"]);
    expect(blocks.every((b) => b.day === "mon")).toBe(true);
  });

  it("returns an empty array for a day with no blocks", () => {
    expect(blocksForDay("sun")).toEqual([]);
  });

  it("formats a block's times as a range", () => {
    const calc = blocksForDay("mon")[0];
    expect(formatBlockTime(calc)).toBe("09:30–11:00");
  });

  it("derives a human duration from the block times", () => {
    const [calc, gym] = blocksForDay("mon");
    expect(blockDuration(calc)).toBe("1h 30m");
    expect(blockDuration(gym)).toBe("1h 30m");
    expect(
      blockDuration({ day: "tue", start: "10:00", end: "12:00", title: "x" }),
    ).toBe("2h");
  });
});

describe("plan helpers", () => {
  it("computes progress from the done ratio of all subject subtasks", () => {
    const calc = PLANS.find((p) => p.slug === "calculus-ii")!;
    const linalg = PLANS.find((p) => p.slug === "linear-algebra")!;

    // calculus-ii: integrals 2/4 done + series 1/3 done = 3/7
    expect(planProgress(calc)).toBe(43);
    // linear-algebra: matrices 1/2 done
    expect(planProgress(linalg)).toBe(50);
  });

  it("assigns each plan a stable block color index", () => {
    expect(planColorIndex("calculus-ii")).toBe(1);
    expect(planColorIndex("linear-algebra")).toBe(2);
    expect(planColorIndex(undefined)).toBeUndefined();
    expect(planColorIndex("no-such-plan")).toBeUndefined();
  });

  it("formats plan date ranges", () => {
    expect(formatDateRange("2026-06-01", "2026-07-20")).toBe("Jun 1 — Jul 20");
  });
});

describe("date formatting", () => {
  it("formats short dates", () => {
    expect(formatShortDate("2026-07-01")).toBe("Jul 1");
  });
});

describe("home aggregation", () => {
  it("builds today's checklist from today's blocks plus pending subtasks", () => {
    const items = todayChecklist();

    // blocks first: calculus ii already over (mock now is 13:00), gym pending
    expect(items[0]).toEqual({ label: "calculus ii", dur: "1h 30m", done: true });
    expect(items[1]).toEqual({ label: "gym", dur: "1h 30m", done: false });
    // then every pending subtask across the plans, without durations
    const rest = items.slice(2);
    expect(rest.map((i) => i.label)).toEqual([
      "partial fractions",
      "improper integrals",
      "power series exercises",
      "taylor series exercises",
      "matrix factorizations (LU)",
    ]);
    expect(rest.every((i) => !i.done && i.dur === undefined)).toBe(true);
  });

  it("finds the next upcoming block after the mock now", () => {
    expect(upNextBlock()?.title).toBe("gym");
  });

  it("keeps today consistent with the schedule data", () => {
    expect(MOCK_TODAY).toBe("mon");
    expect(SCHEDULE_BLOCKS.some((b) => b.day === MOCK_TODAY)).toBe(true);
  });
});
