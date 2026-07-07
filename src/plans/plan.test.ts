import { describe, expect, it } from "vitest";
import type { DocPayload } from "../vault/ipc";
import {
  addSubtaskFrontmatter,
  newPlanDoc,
  newSubjectDoc,
  planProgress,
  planStatus,
  plansFromDocs,
  toggleSubtaskFrontmatter,
  type Plan,
  type Subject,
} from "./plan";

const doc = (
  path: string,
  frontmatter: Record<string, unknown>,
  body = "",
  frontmatter_error: string | null = null,
): DocPayload => ({ path, frontmatter, frontmatter_error, body });

/** sample-vault/plans/ as doc_list("plans") + doc_read return it. */
const SAMPLE_DOCS: DocPayload[] = [
  doc(
    "plans/calculus-ii/plan.md",
    {
      name: "Calculus II",
      start: "2026-06-01",
      end: "2026-07-20",
      schedule_block: "[[calculus-ii]]",
    },
    "Second-semester calculus.\n",
  ),
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
  doc(
    "plans/linear-algebra/plan.md",
    {
      name: "Linear Algebra",
      start: "2026-07-01",
      end: "2026-08-30",
      schedule_block: "[[linear-algebra]]",
    },
    "Matrices, vector spaces.\n",
  ),
  doc("plans/linear-algebra/subjects/matrices.md", {
    tag: "matrices",
    subtasks: [
      { name: "gaussian elimination practice", done: true },
      { name: "matrix factorizations (LU)", done: false },
    ],
  }),
];

describe("plansFromDocs", () => {
  it("assembles the plans/ tree into plans with their subjects", () => {
    const { plans, errors } = plansFromDocs(SAMPLE_DOCS);

    expect(errors).toEqual([]);
    expect(plans.map((p) => p.slug)).toEqual(["calculus-ii", "linear-algebra"]);

    const calc = plans[0];
    expect(calc.name).toBe("Calculus II");
    expect(calc.start).toBe("2026-06-01");
    expect(calc.end).toBe("2026-07-20");
    expect(calc.scheduleBlock).toBe("calculus-ii");
    expect(calc.subjects.map((s) => s.tag)).toEqual(["integrals", "series"]);
    expect(calc.subjects[0].subtasks).toEqual([
      { name: "u-substitution drills", done: true },
      { name: "integration by parts", done: true },
      { name: "partial fractions", done: false },
      { name: "improper integrals", done: false },
    ]);
    expect(calc.subjects[0].path).toBe("plans/calculus-ii/subjects/integrals.md");
  });

  it("falls back to slugs when names and tags are missing", () => {
    const { plans } = plansFromDocs([
      doc("plans/bare/plan.md", {}),
      doc("plans/bare/subjects/untagged.md", {}),
    ]);

    expect(plans[0].name).toBe("bare");
    expect(plans[0].start).toBeUndefined();
    expect(plans[0].scheduleBlock).toBeUndefined();
    expect(plans[0].subjects[0].tag).toBe("untagged");
    expect(plans[0].subjects[0].subtasks).toEqual([]);
  });

  it("still lists a plan whose directory has subjects but no plan.md", () => {
    const { plans } = plansFromDocs([
      doc("plans/orphan/subjects/topic.md", {
        tag: "topic",
        subtasks: [{ name: "read", done: false }],
      }),
    ]);

    expect(plans).toHaveLength(1);
    expect(plans[0].slug).toBe("orphan");
    expect(plans[0].name).toBe("orphan");
    expect(plans[0].subjects[0].tag).toBe("topic");
  });

  it("carries YAML parse errors on the plan or subject instead of dropping them", () => {
    const { plans, errors } = plansFromDocs([
      doc("plans/broken/plan.md", {}, "", "bad YAML on line 2"),
      doc("plans/broken/subjects/topic.md", {}, "", "bad YAML on line 1"),
    ]);

    expect(errors).toEqual([]);
    expect(plans[0].frontmatterError).toBe("bad YAML on line 2");
    expect(plans[0].name).toBe("broken");
    expect(plans[0].subjects[0].frontmatterError).toBe("bad YAML on line 1");
    expect(plans[0].subjects[0].subtasks).toEqual([]);
  });

  it("reports files that don't fit the plans/<slug> layout", () => {
    const { plans, errors } = plansFromDocs([
      doc("plans/stray.md", {}),
      doc("plans/deep/subjects/nested/too-far.md", {}),
    ]);

    expect(plans).toEqual([]);
    expect(errors).toEqual([
      "plans/stray.md: not part of a plans/<slug>/ directory",
      "plans/deep/subjects/nested/too-far.md: not part of a plans/<slug>/ directory",
    ]);
  });

  it("keeps only well-formed subtask entries from hand-edited YAML", () => {
    const { plans } = plansFromDocs([
      doc("plans/p/plan.md", { name: "P" }),
      doc("plans/p/subjects/s.md", {
        tag: "s",
        subtasks: [
          { name: "good", done: false },
          "just a string",
          { name: 7, done: true },
          { name: "no done flag" },
        ],
      }),
    ]);

    expect(plans[0].subjects[0].subtasks).toEqual([
      { name: "good", done: false },
      { name: "no done flag", done: false },
    ]);
  });
});

const plan = (overrides: Partial<Plan>): Plan => ({
  slug: "p",
  name: "P",
  subjects: [],
  frontmatter: {},
  ...overrides,
});

describe("planProgress", () => {
  const subject = (subtasks: Subject["subtasks"]): Subject => ({
    path: "plans/p/subjects/s.md",
    tag: "s",
    subtasks,
    body: "",
    frontmatter: {},
  });

  it("is the done ratio over every subject's subtasks, rounded", () => {
    const p = plan({
      subjects: [
        subject([
          { name: "a", done: true },
          { name: "b", done: false },
        ]),
        subject([{ name: "c", done: false }]),
      ],
    });

    expect(planProgress(p)).toBe(33);
  });

  it("is 0 for a plan with no subtasks", () => {
    expect(planProgress(plan({}))).toBe(0);
  });
});

describe("planStatus", () => {
  const today = "2026-07-07";

  it("is active while today is inside the date range", () => {
    expect(planStatus(plan({ start: "2026-06-01", end: "2026-07-20" }), today)).toBe("active");
  });

  it("is upcoming before the start date", () => {
    expect(planStatus(plan({ start: "2026-08-01", end: "2026-09-01" }), today)).toBe("upcoming");
  });

  it("is archive after the end date", () => {
    expect(planStatus(plan({ start: "2026-01-01", end: "2026-02-01" }), today)).toBe("archive");
  });

  it("treats boundary days as active", () => {
    expect(planStatus(plan({ start: today, end: today }), today)).toBe("active");
  });

  it("is active when dates are missing", () => {
    expect(planStatus(plan({}), today)).toBe("active");
    expect(planStatus(plan({ start: "2026-06-01" }), today)).toBe("active");
  });
});

describe("toggleSubtaskFrontmatter", () => {
  it("flips one subtask's done flag, preserving the rest of the frontmatter", () => {
    const subject: Subject = {
      path: "plans/p/subjects/s.md",
      tag: "s",
      subtasks: [
        { name: "a", done: true },
        { name: "b", done: false },
      ],
      body: "notes\n",
      frontmatter: {
        tag: "s",
        subtasks: [
          { name: "a", done: true },
          { name: "b", done: false },
        ],
        extra: "kept",
      },
    };

    const next = toggleSubtaskFrontmatter(subject, 1);

    expect(next).toEqual({
      tag: "s",
      subtasks: [
        { name: "a", done: true },
        { name: "b", done: true },
      ],
      extra: "kept",
    });
    // the input is not mutated
    expect(subject.subtasks[1].done).toBe(false);
    expect(subject.frontmatter["subtasks"]).toEqual([
      { name: "a", done: true },
      { name: "b", done: false },
    ]);
  });
});

describe("newPlanDoc", () => {
  it("builds plans/<slug>/plan.md starting today", () => {
    expect(newPlanDoc("Real Analysis I", "2026-07-07")).toEqual({
      path: "plans/real-analysis-i/plan.md",
      frontmatter: { name: "Real Analysis I", start: "2026-07-07" },
      body: "",
    });
  });
});

describe("newSubjectDoc", () => {
  it("builds plans/<slug>/subjects/<tag>.md with an empty subtask list", () => {
    expect(newSubjectDoc("calculus-ii", "Improper Integrals")).toEqual({
      path: "plans/calculus-ii/subjects/improper-integrals.md",
      frontmatter: { tag: "Improper Integrals", subtasks: [] },
      body: "",
    });
  });
});

describe("addSubtaskFrontmatter", () => {
  it("appends an undone subtask, preserving the rest of the frontmatter", () => {
    const subject: Subject = {
      path: "plans/p/subjects/s.md",
      tag: "s",
      subtasks: [{ name: "a", done: true }],
      body: "notes\n",
      frontmatter: {
        tag: "s",
        subtasks: [{ name: "a", done: true }],
        extra: "kept",
      },
    };

    const next = addSubtaskFrontmatter(subject, "b");

    expect(next).toEqual({
      tag: "s",
      subtasks: [
        { name: "a", done: true },
        { name: "b", done: false },
      ],
      extra: "kept",
    });
    // the input is not mutated
    expect(subject.subtasks).toEqual([{ name: "a", done: true }]);
    expect(subject.frontmatter["subtasks"]).toEqual([{ name: "a", done: true }]);
  });

  it("starts the list for a subject with no subtasks yet", () => {
    const subject: Subject = {
      path: "plans/p/subjects/s.md",
      tag: "s",
      subtasks: [],
      body: "",
      frontmatter: { tag: "s" },
    };

    expect(addSubtaskFrontmatter(subject, "first")).toEqual({
      tag: "s",
      subtasks: [{ name: "first", done: false }],
    });
  });
});
