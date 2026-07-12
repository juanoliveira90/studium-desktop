/*
 * Schedule domain model: pure transforms from schedule.md entries (one
 * frontmatter block per recurring weekly event) to what the week page
 * renders. The grid math is ported from the web app's Schedule.tsx, reduced
 * to what the vault format needs: times are always 24h "HH:MM" strings, so
 * none of the web version's 12h/period juggling survives. No I/O here —
 * useSchedule.ts feeds these from the invoke layer.
 */

import type { ScheduleEntry } from "../vault/ipc";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** One entry of schedule.md — a recurring weekly block. */
export interface ScheduleBlock {
  /** Position of the entry in schedule.md — the handle for update/delete. */
  index: number;
  day: Weekday;
  /** "HH:MM", as quoted in frontmatter. */
  start: string;
  end: string;
  title: string;
  /** Optional free-text line shown under the title. */
  description?: string;
  /** Slug of the linked plan (`plan: "[[calculus-ii]]"`), if any. */
  plan?: string;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** True for the schedule's 24h "HH:MM" format — the form's validation. */
export const isValidTime = (time: string) => TIME_RE.test(time);

/** "HH:MM" → minutes since midnight. */
export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export function formatBlockTime(b: ScheduleBlock): string {
  return `${b.start}–${b.end}`;
}

/** A block's length as a human duration: "1h 30m", "2h", "45m". */
export function blockDuration(b: ScheduleBlock): string {
  const mins = toMinutes(b.end) - toMinutes(b.start);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "[[slug]]" or a bare slug → slug; anything else is no link. */
const planSlug = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value === "") return undefined;
  const wiki = value.match(/^\[\[(.+)\]\]$/);
  return wiki ? wiki[1] : value;
};

/** What the event form edits; `eventFrontmatter` turns it into an entry. */
export interface EventFields {
  day: Weekday;
  start: string;
  end: string;
  title: string;
  description?: string;
  /** Bare plan slug; wrapped as a wiki-link in the frontmatter. */
  plan?: string;
}

/** Event fields → the frontmatter object of one schedule.md block, keys in
 *  the vault format's order, optional fields omitted rather than empty. */
export function eventFrontmatter(fields: EventFields): Record<string, unknown> {
  const frontmatter: Record<string, unknown> = {
    day: fields.day,
    start: fields.start,
    end: fields.end,
    title: fields.title,
  };
  if (fields.description) {
    frontmatter["description"] = fields.description;
  }
  if (fields.plan) {
    frontmatter["plan"] = `[[${fields.plan}]]`;
  }
  return frontmatter;
}

/** One block's frontmatter → block, or the reason it can't be one. */
const blockFromEntry = (entry: ScheduleEntry, index: number): ScheduleBlock | string => {
  if (entry.frontmatter_error) return entry.frontmatter_error;
  const { day, start, end, title } = entry.frontmatter;
  if (typeof day !== "string" || !WEEKDAYS.includes(day as Weekday)) {
    return `invalid or missing day: ${JSON.stringify(day)}`;
  }
  if (typeof start !== "string" || !TIME_RE.test(start)) {
    return `invalid or missing start time: ${JSON.stringify(start)}`;
  }
  if (typeof end !== "string" || !TIME_RE.test(end)) {
    return `invalid or missing end time: ${JSON.stringify(end)}`;
  }
  if (toMinutes(end) <= toMinutes(start)) {
    return `end ${end} is not after start ${start}`;
  }
  if (typeof title !== "string" || title.trim() === "") {
    return "missing title";
  }
  const description = entry.frontmatter["description"];
  return {
    index,
    day: day as Weekday,
    start,
    end,
    title,
    // hand-editable YAML: anything non-string is not a description
    description: typeof description === "string" ? description : undefined,
    plan: planSlug(entry.frontmatter["plan"]),
  };
};

/**
 * All schedule.md entries → placeable blocks plus one message per entry that
 * isn't one (hand-edits happen; broken blocks are reported, never dropped
 * silently, and never sink the rest of the schedule).
 */
export function scheduleFromEntries(entries: ScheduleEntry[]): {
  blocks: ScheduleBlock[];
  errors: string[];
} {
  const blocks: ScheduleBlock[] = [];
  const errors: string[] = [];
  entries.forEach((entry, i) => {
    const result = blockFromEntry(entry, i);
    if (typeof result === "string") {
      errors.push(`block ${i + 1}: ${result}`);
    } else {
      blocks.push(result);
    }
  });
  return { blocks, errors };
}

export function blocksForDay(day: Weekday, blocks: ScheduleBlock[]): ScheduleBlock[] {
  return blocks
    .filter((b) => b.day === day)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/**
 * Where a block sits in a half-hour grid spanning startHour–endHour: 0-based
 * row from the window top plus row span. Blocks spilling past the window are
 * clamped to it (web Schedule.tsx's visibleStart/visibleEnd), off-grid times
 * round outward, and blocks fully outside are null (not rendered).
 */
export function gridPlacement(
  block: ScheduleBlock,
  startHour: number,
  endHour: number,
): { row: number; span: number } | null {
  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;
  const startMin = toMinutes(block.start);
  const endMin = toMinutes(block.end);
  if (endMin <= windowStart || startMin >= windowEnd) return null;
  const visibleStart = Math.max(startMin, windowStart);
  const visibleEnd = Math.min(endMin, windowEnd);
  const row = Math.floor((visibleStart - windowStart) / 30);
  const lastRow = Math.ceil((visibleEnd - windowStart) / 30);
  return { row, span: Math.max(lastRow - row, 1) };
}

/**
 * Where the schedule's scroll should sit after a scroll event. The page
 * stacks three identical 24h copies of the grid; keeping the position inside
 * the middle copy — jumping one cycle back toward it when it drifts into the
 * first or last — makes the scroll wrap around the routine forever.
 */
export function wrappedScrollTop(scrollTop: number, cycleHeight: number): number {
  if (scrollTop < cycleHeight * 0.5) return scrollTop + cycleHeight;
  if (scrollTop > cycleHeight * 1.5) return scrollTop - cycleHeight;
  return scrollTop;
}

/** How many --block-N color tokens the theme defines. */
const PALETTE_SIZE = 4;

/**
 * Stable color per linked plan: slugs take --block-1..N in first-seen order
 * over the week (weekday, then start time), cycling when there are more
 * plans than tokens.
 */
export function planColorBySlug(blocks: ScheduleBlock[]): Map<string, number> {
  const colors = new Map<string, number>();
  for (const day of WEEKDAYS) {
    for (const block of blocksForDay(day, blocks)) {
      if (block.plan !== undefined && !colors.has(block.plan)) {
        colors.set(block.plan, (colors.size % PALETTE_SIZE) + 1);
      }
    }
  }
  return colors;
}
