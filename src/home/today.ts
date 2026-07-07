/*
 * Home-page domain model: pure aggregation over the schedule and plans
 * modules' data — the "today" checklist, and the next upcoming block — as of
 * a given weekday and clock time. No I/O here; HomePage feeds these from
 * useSchedule/usePlans and the real clock.
 */

import {
  blockDuration,
  blocksForDay,
  toMinutes,
  type ScheduleBlock,
  type Weekday,
  WEEKDAYS,
} from "../schedule/block";
import type { Plan } from "../plans/plan";

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

export interface ChecklistItem {
  label: string;
  /** Human duration, only for schedule blocks. */
  dur?: string;
  done: boolean;
}

/** Today's blocks (done once they're over) plus every pending plan subtask. */
export function todayChecklist(
  blocks: ScheduleBlock[],
  plans: Plan[],
  day: Weekday,
  now: string,
): ChecklistItem[] {
  const todays = blocksForDay(day, blocks).map((b) => ({
    label: b.title,
    dur: blockDuration(b),
    done: toMinutes(b.end) <= toMinutes(now),
  }));
  const pending = plans
    .flatMap((p) => p.subjects)
    .flatMap((s) => s.subtasks)
    .filter((t) => !t.done)
    .map((t) => ({ label: t.name, done: false }));
  return [...todays, ...pending];
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
