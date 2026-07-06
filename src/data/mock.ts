// Static placeholder data until the vault modules land (roadmap steps 2–6).
// Shared here so Home can aggregate over the same schedule the week page shows.

export interface ScheduleBlock {
  /** 0 = Monday. */
  day: number;
  /** Hours from midnight. */
  start: number;
  end: number;
  label: string;
  color: number;
}

export interface TodayTask {
  label: string;
  dur: string;
  done: boolean;
}

export const DAYS = ["Mon 20", "Tue 21", "Wed 22", "Thu 23", "Fri 24", "Sat 25", "Sun 26"];
export const START_HOUR = 8;
export const END_HOUR = 22;
export const WEEK_RANGE_LABEL = "May 20 — May 26, 2024";

/** "Today" in the fictional mock week (Wed 22). */
export const TODAY_DAY_INDEX = 2;
/** Mock "now", used to derive the next upcoming block. */
export const MOCK_NOW_HOUR = 13;

export const SCHEDULE_BLOCKS: ScheduleBlock[] = [
  { day: 1, start: 8, end: 10, label: "algorithms study", color: 1 },
  { day: 3, start: 8, end: 10, label: "linear algebra problem set", color: 1 },
  { day: 4, start: 8, end: 10, label: "os notes", color: 4 },
  { day: 0, start: 12, end: 13, label: "lunch", color: 2 },
  { day: 2, start: 12, end: 13, label: "lunch", color: 2 },
  { day: 4, start: 12, end: 13, label: "lunch", color: 2 },
  { day: 2, start: 14, end: 16, label: "discrete math", color: 4 },
  { day: 5, start: 14, end: 16, label: "gym", color: 2 },
  { day: 0, start: 18, end: 20, label: "review anki", color: 1 },
  { day: 2, start: 19, end: 21, label: "project work", color: 3 },
  { day: 4, start: 20, end: 22, label: "read paper", color: 1 },
];

export const TODAY_TASKS: TodayTask[] = [
  { label: "algorithms — read chapter 4", dur: "2h", done: true },
  { label: "linear algebra — problem set 2", dur: "1h 30m", done: true },
  { label: "operating systems — notes", dur: "1h", done: false },
  { label: "gym", dur: "1h", done: false },
  { label: "revisit spaced repetition", dur: "30m", done: false },
];

export function blocksForDay(
  day: number,
  blocks: ScheduleBlock[] = SCHEDULE_BLOCKS,
): ScheduleBlock[] {
  return blocks.filter((b) => b.day === day).sort((a, b) => a.start - b.start);
}

export function formatBlockTime(b: ScheduleBlock): string {
  const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
  return `${pad(b.start)}–${pad(b.end)}`;
}
