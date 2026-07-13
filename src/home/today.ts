/*
 * Home-page domain model: pure aggregation over the schedule and plans
 * modules' data — the "today" subjects, and the next upcoming block — as of
 * a given weekday and clock time. No I/O here; HomePage feeds these from
 * useSchedule/usePlans and the real clock.
 */

import {
  blocksForDay,
  toMinutes,
  type ScheduleBlock,
  type Weekday,
  WEEKDAYS,
} from "../schedule/block";
import type { Plan, Subject, Subtask } from "../plans/plan";

/** Date.getDay() is 0 = Sunday; the vault week starts on Monday. */
const JS_DAY_TO_WEEKDAY: Weekday[] = [
  WEEKDAYS[6],
  ...WEEKDAYS.slice(0, 6),
];

export function weekdayOf(now: Date): Weekday {
  return JS_DAY_TO_WEEKDAY[now.getDay()];
}

/** The clock as the schedule's zero-padded "HH:MM". */
export function timeOf(now: Date): string {
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export interface TodaySubject {
  /** Subject file path — a stable render key. */
  path: string;
  subject: string;
  tasks: Subtask[];
  /** The backing subject file — the write target for toggles and deletes. */
  source: Subject;
}

/**
 * The subjects (with their tasks) of every plan referenced by one of today's
 * schedule blocks: weekly routine → study plan → subjects + tasks. The blocks
 * themselves belong to "today's events", not this list.
 */
export function todaySubjects(
  blocks: ScheduleBlock[],
  plans: Plan[],
  day: Weekday,
): TodaySubject[] {
  const linkedSlugs = new Set(blocksForDay(day, blocks).map((b) => b.plan));
  return plans
    .filter((p) => linkedSlugs.has(p.slug))
    .flatMap((p) => p.subjects)
    .map((s) => ({ path: s.path, subject: s.tag, tasks: s.subtasks, source: s }));
}

/** The first of today's blocks still ahead of now, if any. */
export function upNext(
  blocks: ScheduleBlock[],
  day: Weekday,
  now: string,
): ScheduleBlock | undefined {
  const todays = blocksForDay(day, blocks);
  return todays.find((b) => toMinutes(b.start) >= toMinutes(now));
}
