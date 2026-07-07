/*
 * Study-plans domain model: pure transforms from the vault's plans/ tree
 * (plans/<slug>/plan.md + plans/<slug>/subjects/<tag>.md) to what the plans
 * page renders. Like the notes model, parsing is lenient: hand-edited files
 * with broken or missing fields stay visible, carrying their error, instead
 * of vanishing from the list. No I/O here — usePlans.ts feeds these from the
 * invoke layer.
 */

import type { DocPayload } from "../vault/ipc";
import { slugify } from "../notes/note";

export interface Subtask {
  name: string;
  done: boolean;
}

/** plans/<slug>/subjects/<tag>.md */
export interface Subject {
  /** Vault-relative path — the write target when toggling subtasks. */
  path: string;
  /** Frontmatter `tag`, else the filename stem. */
  tag: string;
  subtasks: Subtask[];
  body: string;
  /** Full frontmatter as read, preserved verbatim on writes. */
  frontmatter: Record<string, unknown>;
  /** Parse error reported by the vault core for malformed YAML. */
  frontmatterError?: string;
}

/** plans/<slug>/plan.md plus its subjects/ directory. */
export interface Plan {
  slug: string;
  /** Frontmatter `name`, else the slug. */
  name: string;
  /** Quoted ISO dates, as in the vault format. */
  start?: string;
  end?: string;
  /** Slug of the linked schedule block (`schedule_block: "[[slug]]"`). */
  scheduleBlock?: string;
  subjects: Subject[];
  frontmatter: Record<string, unknown>;
  frontmatterError?: string;
}

export type PlanStatus = "active" | "upcoming" | "archive";

export const PLAN_TABS: PlanStatus[] = ["active", "upcoming", "archive"];

const asString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/** "[[slug]]" or a bare slug → slug; anything else is no link. */
const wikiSlug = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value === "") return undefined;
  const wiki = value.match(/^\[\[(.+)\]\]$/);
  return wiki ? wiki[1] : value;
};

/** Well-formed `{name, done}` entries of a hand-editable subtasks list. */
const parseSubtasks = (value: unknown): Subtask[] => {
  if (!Array.isArray(value)) return [];
  const subtasks: Subtask[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const name = (entry as Record<string, unknown>)["name"];
    if (typeof name !== "string") continue;
    const done = (entry as Record<string, unknown>)["done"];
    subtasks.push({ name, done: done === true });
  }
  return subtasks;
};

const stem = (path: string) => path.split("/").pop()!.replace(/\.md$/, "");

const subjectFromDoc = (doc: DocPayload): Subject => ({
  path: doc.path,
  tag: asString(doc.frontmatter["tag"]) ?? stem(doc.path),
  subtasks: parseSubtasks(doc.frontmatter["subtasks"]),
  body: doc.body,
  frontmatter: doc.frontmatter,
  frontmatterError: doc.frontmatter_error ?? undefined,
});

const emptyPlan = (slug: string): Plan => ({
  slug,
  name: slug,
  subjects: [],
  frontmatter: {},
});

/**
 * All docs under plans/ → plans in slug order plus one message per file that
 * doesn't fit the plans/<slug>/ layout. Files that fit but don't parse stay
 * on their plan/subject as `frontmatterError`.
 */
export function plansFromDocs(docs: DocPayload[]): {
  plans: Plan[];
  errors: string[];
} {
  const bySlug = new Map<string, Plan>();
  const errors: string[] = [];
  const planFor = (slug: string): Plan => {
    const existing = bySlug.get(slug);
    if (existing) return existing;
    const created = emptyPlan(slug);
    bySlug.set(slug, created);
    return created;
  };

  for (const doc of docs) {
    const segments = doc.path.split("/");
    const isPlanFile = segments.length === 3 && segments[2] === "plan.md";
    const isSubjectFile = segments.length === 4 && segments[2] === "subjects";
    if (isPlanFile) {
      const plan = planFor(segments[1]);
      plan.name = asString(doc.frontmatter["name"]) ?? plan.slug;
      plan.start = asString(doc.frontmatter["start"]);
      plan.end = asString(doc.frontmatter["end"]);
      plan.scheduleBlock = wikiSlug(doc.frontmatter["schedule_block"]);
      plan.frontmatter = doc.frontmatter;
      plan.frontmatterError = doc.frontmatter_error ?? undefined;
    } else if (isSubjectFile) {
      planFor(segments[1]).subjects.push(subjectFromDoc(doc));
    } else {
      errors.push(`${doc.path}: not part of a plans/<slug>/ directory`);
    }
  }

  // doc_list returns sorted paths, so map insertion order is already
  // slug-sorted and subjects arrive tag-file-sorted within each plan.
  return { plans: [...bySlug.values()], errors };
}

/** Done ratio over every subject's subtasks, as a whole percentage. */
export function planProgress(plan: Plan): number {
  const subtasks = plan.subjects.flatMap((s) => s.subtasks);
  if (subtasks.length === 0) return 0;
  const doneCount = subtasks.filter((t) => t.done).length;
  return Math.round((doneCount / subtasks.length) * 100);
}

/**
 * Which tab a plan belongs to on `today` (ISO date; string compare works).
 * Plans without dates are running now until said otherwise: active.
 */
export function planStatus(plan: Plan, today: string): PlanStatus {
  if (plan.end !== undefined && plan.end < today) return "archive";
  if (plan.start !== undefined && plan.start > today) return "upcoming";
  return "active";
}

/** New frontmatter for a subject with one subtask's done flag flipped. */
export function toggleSubtaskFrontmatter(
  subject: Subject,
  index: number,
): Record<string, unknown> {
  const subtasks = subject.subtasks.map((t, i) =>
    i === index ? { name: t.name, done: !t.done } : { name: t.name, done: t.done },
  );
  return { ...subject.frontmatter, subtasks };
}

/** Path, frontmatter and body for a freshly created plan, starting today. */
export function newPlanDoc(name: string, today: string) {
  return {
    path: `plans/${slugify(name)}/plan.md`,
    frontmatter: { name, start: today },
    body: "",
  };
}
