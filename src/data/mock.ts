/*
 * Static placeholder data until the frontend talks to the vault (roadmap
 * steps 5–6; notes and the schedule already read the vault, see src/notes/
 * and src/schedule/). Mirrors sample-vault/ exactly — same shapes the Rust
 * core parses from markdown frontmatter — so swapping in real data is a data
 * source change, not a model change.
 */

import {
  blocksForDay as scheduleBlocksForDay,
  type ScheduleBlock,
  type Weekday,
} from "../schedule/block";

export type { ScheduleBlock, Weekday };
export { WEEKDAYS } from "../schedule/block";

export interface Subtask {
  name: string;
  done: boolean;
}

/** plans/<slug>/subjects/<tag>.md */
export interface Subject {
  tag: string;
  subtasks: Subtask[];
}

/** plans/<slug>/plan.md plus its subjects/ directory. */
export interface Plan {
  slug: string;
  name: string;
  start: string;
  end: string;
  subjects: Subject[];
}

export const SCHEDULE_BLOCKS: ScheduleBlock[] = [
  { day: "mon", start: "09:30", end: "11:00", title: "calculus ii", plan: "calculus-ii" },
  { day: "mon", start: "17:00", end: "18:30", title: "gym" },
  { day: "tue", start: "10:00", end: "12:00", title: "linear algebra", plan: "linear-algebra" },
  { day: "wed", start: "09:30", end: "11:00", title: "calculus ii", plan: "calculus-ii" },
  { day: "thu", start: "14:00", end: "16:00", title: "sicp reading" },
  { day: "fri", start: "10:00", end: "12:00", title: "linear algebra", plan: "linear-algebra" },
];

export const PLANS: Plan[] = [
  {
    slug: "calculus-ii",
    name: "Calculus II",
    start: "2026-06-01",
    end: "2026-07-20",
    subjects: [
      {
        tag: "integrals",
        subtasks: [
          { name: "u-substitution drills", done: true },
          { name: "integration by parts", done: true },
          { name: "partial fractions", done: false },
          { name: "improper integrals", done: false },
        ],
      },
      {
        tag: "series",
        subtasks: [
          { name: "convergence tests summary sheet", done: true },
          { name: "power series exercises", done: false },
          { name: "taylor series exercises", done: false },
        ],
      },
    ],
  },
  {
    slug: "linear-algebra",
    name: "Linear Algebra",
    start: "2026-07-01",
    end: "2026-08-30",
    subjects: [
      {
        tag: "matrices",
        subtasks: [
          { name: "gaussian elimination practice", done: true },
          { name: "matrix factorizations (LU)", done: false },
        ],
      },
    ],
  },
];

/** The mock clock: Monday 2026-07-06, 13:00. */
export const MOCK_TODAY: Weekday = "mon";
export const MOCK_NOW = "13:00";

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export function blocksForDay(
  day: Weekday,
  blocks: ScheduleBlock[] = SCHEDULE_BLOCKS,
): ScheduleBlock[] {
  return scheduleBlocksForDay(day, blocks);
}

export function formatBlockTime(b: ScheduleBlock): string {
  return `${b.start}–${b.end}`;
}

export function blockDuration(b: ScheduleBlock): string {
  const mins = toMinutes(b.end) - toMinutes(b.start);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function planProgress(plan: Plan): number {
  const subtasks = plan.subjects.flatMap((s) => s.subtasks);
  if (subtasks.length === 0) return 0;
  return Math.round((subtasks.filter((t) => t.done).length / subtasks.length) * 100);
}

/** Stable per-plan color: index into the --block-N tokens. */
export function planColorIndex(slug: string | undefined): number | undefined {
  if (!slug) return undefined;
  const i = PLANS.findIndex((p) => p.slug === slug);
  return i === -1 ? undefined : i + 1;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function formatDateRange(start: string, end: string): string {
  return `${formatShortDate(start)} — ${formatShortDate(end)}`;
}

export interface ChecklistItem {
  label: string;
  dur?: string;
  done: boolean;
}

/** Today's blocks (done once they're over) plus every pending plan subtask. */
export function todayChecklist(): ChecklistItem[] {
  const blocks = blocksForDay(MOCK_TODAY).map((b) => ({
    label: b.title,
    dur: blockDuration(b),
    done: toMinutes(b.end) <= toMinutes(MOCK_NOW),
  }));
  const pending = PLANS.flatMap((p) => p.subjects)
    .flatMap((s) => s.subtasks)
    .filter((t) => !t.done)
    .map((t) => ({ label: t.name, done: false }));
  return [...blocks, ...pending];
}

export function upNextBlock(): ScheduleBlock | undefined {
  return blocksForDay(MOCK_TODAY).find(
    (b) => toMinutes(b.start) >= toMinutes(MOCK_NOW),
  );
}
