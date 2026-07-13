import { describe, expect, it } from "vitest";
import type { ScheduleBlock } from "../schedule/block";
import type { Plan, Subject } from "../plans/plan";
import { timeOf, todaySubjects, upNext, weekdayOf } from "./today";

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

describe("todaySubjects", () => {
  it("groups the tasks of today's linked plans under their subjects", () => {
    const groups = todaySubjects(BLOCKS, PLANS, "mon");

    // only calculus-ii is linked from a Monday block
    expect(groups.map((g) => g.subject)).toEqual(["integrals", "series"]);
    expect(groups[0].tasks).toEqual([
      { name: "u-substitution drills", done: true },
      { name: "partial fractions", done: false },
    ]);
    expect(groups[1].tasks).toEqual([
      { name: "power series exercises", done: false },
    ]);
  });

  it("carries the backing subject file so tasks can be written back", () => {
    const groups = todaySubjects(BLOCKS, PLANS, "mon");
    expect(groups[0].source).toBe(PLANS[0].subjects[0]);
    expect(groups[0].source.path).toBe("plans/x/subjects/integrals.md");
  });

  it("contains neither schedule blocks nor plans without a today event", () => {
    const monday = todaySubjects(BLOCKS, PLANS, "mon");
    const labels = monday.flatMap((g) => [g.subject, ...g.tasks.map((t) => t.name)]);
    expect(labels).not.toContain("calculus ii");
    expect(labels).not.toContain("gym");
    // linear-algebra's block is on Tuesday
    expect(labels).not.toContain("matrix factorizations (LU)");

    const tuesday = todaySubjects(BLOCKS, PLANS, "tue");
    expect(tuesday.map((g) => g.subject)).toEqual(["matrices"]);
  });

  it("is empty for a free day, even with pending plans", () => {
    expect(todaySubjects(BLOCKS, PLANS, "sun")).toEqual([]);
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
