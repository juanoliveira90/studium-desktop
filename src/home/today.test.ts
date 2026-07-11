import { describe, expect, it } from "vitest";
import type { ScheduleBlock } from "../schedule/block";
import type { Plan, Subject } from "../plans/plan";
import { timeOf, todayChecklist, upNext, weekdayOf } from "./today";

/** sample-vault's schedule, as the schedule model produces it. */
const BLOCKS: ScheduleBlock[] = [
  { index: 0, day: "mon", start: "09:30", end: "11:00", title: "calculus ii", plan: "calculus-ii" },
  { index: 1, day: "mon", start: "17:00", end: "18:30", title: "gym" },
  { index: 2, day: "tue", start: "10:00", end: "12:00", title: "linear algebra", plan: "linear-algebra" },
  { index: 3, day: "thu", start: "14:00", end: "16:00", title: "sicp reading" },
];

const subject = (tag: string, subtasks: Subject["subtasks"]): Subject => ({
  path: `plans/x/subjects/${tag}.md`,
  tag,
  subtasks,
  body: "",
  frontmatter: {},
});

const PLANS: Plan[] = [
  {
    slug: "calculus-ii",
    name: "Calculus II",
    frontmatter: {},
    subjects: [
      subject("integrals", [
        { name: "u-substitution drills", done: true },
        { name: "partial fractions", done: false },
      ]),
      subject("series", [{ name: "power series exercises", done: false }]),
    ],
  },
  {
    slug: "linear-algebra",
    name: "Linear Algebra",
    frontmatter: {},
    subjects: [
      subject("matrices", [{ name: "matrix factorizations (LU)", done: false }]),
    ],
  },
];

describe("weekdayOf", () => {
  it("maps JS dates onto vault weekdays", () => {
    expect(weekdayOf(new Date(2026, 6, 6))).toBe("mon");
    expect(weekdayOf(new Date(2026, 6, 12))).toBe("sun");
  });
});

describe("timeOf", () => {
  it("formats the clock as the schedule's zero-padded HH:MM", () => {
    expect(timeOf(new Date(2026, 6, 6, 9, 5))).toBe("09:05");
    expect(timeOf(new Date(2026, 6, 6, 13, 0))).toBe("13:00");
  });
});

describe("todayChecklist", () => {
  it("lists today's blocks with durations, then every pending subtask", () => {
    const items = todayChecklist(BLOCKS, PLANS, "mon", "13:00");

    expect(items[0]).toEqual({ label: "calculus ii", dur: "1h 30m", done: true });
    expect(items[1]).toEqual({ label: "gym", dur: "1h 30m", done: false });
    const rest = items.slice(2);
    expect(rest.map((i) => i.label)).toEqual([
      "partial fractions",
      "power series exercises",
      "matrix factorizations (LU)",
    ]);
    expect(rest.every((i) => !i.done && i.dur === undefined)).toBe(true);
  });

  it("marks a block done only once its end time has passed", () => {
    const during = todayChecklist(BLOCKS, [], "mon", "10:00");
    expect(during[0].done).toBe(false);

    const atEnd = todayChecklist(BLOCKS, [], "mon", "11:00");
    expect(atEnd[0].done).toBe(true);
  });

  it("ignores other days' blocks and done subtasks", () => {
    const labels = todayChecklist(BLOCKS, PLANS, "mon", "13:00").map((i) => i.label);
    expect(labels).not.toContain("sicp reading");
    expect(labels).not.toContain("u-substitution drills");
  });

  it("is empty for a free day with no pending subtasks", () => {
    expect(todayChecklist(BLOCKS, [], "sun", "13:00")).toEqual([]);
  });
});

describe("upNext", () => {
  it("finds the first block starting at or after now", () => {
    expect(upNext(BLOCKS, "mon", "13:00")?.title).toBe("gym");
    expect(upNext(BLOCKS, "mon", "08:00")?.title).toBe("calculus ii");
  });

  it("skips a block already underway", () => {
    expect(upNext(BLOCKS, "mon", "10:00")?.title).toBe("gym");
  });

  it("is undefined once the day's blocks are over", () => {
    expect(upNext(BLOCKS, "mon", "19:00")).toBeUndefined();
    expect(upNext(BLOCKS, "sun", "09:00")).toBeUndefined();
  });
});
