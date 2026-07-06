import { Page } from "../components/Page";
import {
  blocksForDay,
  planColorIndex,
  SCHEDULE_BLOCKS,
  WEEKDAYS,
} from "../data/mock";

const START_HOUR = 8;
const END_HOUR = 22;
const HOURS = END_HOUR - START_HOUR;
const ROWS = HOURS * 2; // half-hour resolution, schedule times are "HH:MM"

/** Grid row for a "HH:MM" time: half-hours from START_HOUR plus header row. */
const rowFor = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * 2 + m / 30 + 2;
};

function WeekHeader() {
  return (
    <div className="week-header">
      <h2>week</h2>
      <span className="range">weekly routine</span>
    </div>
  );
}

export function SchedulePage() {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let day = 0; day < 7; day++) {
      cells.push(
        <div
          key={`${row}-${day}`}
          className={`cell${row % 2 === 0 ? " is-half" : ""}`}
          style={{ gridColumn: day + 2, gridRow: row + 2 }}
        />,
      );
    }
  }

  return (
    <Page title="week" hint="alt+4" header={<WeekHeader />}>
      <div className="week-grid">
        <div style={{ gridColumn: 1, gridRow: 1 }} />
        {WEEKDAYS.map((d, i) => (
          <div key={d} className="day-head" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {d}
          </div>
        ))}
        {Array.from({ length: HOURS / 2 + 1 }, (_, i) => {
          const hour = START_HOUR + i * 2;
          return (
            <div
              key={hour}
              className="hour-label"
              style={{ gridRow: i * 4 + 2 }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          );
        })}
        {cells}
        {WEEKDAYS.flatMap((day, col) =>
          blocksForDay(day, SCHEDULE_BLOCKS).map((b) => {
            const color = planColorIndex(b.plan);
            return (
              <div
                key={`${b.day}-${b.start}`}
                className="week-block"
                style={{
                  gridColumn: col + 2,
                  gridRow: `${rowFor(b.start)} / span ${rowFor(b.end) - rowFor(b.start)}`,
                  ...(color && {
                    background: `var(--block-${color})`,
                    borderColor: "transparent",
                  }),
                }}
              >
                {b.title}
              </div>
            );
          }),
        )}
      </div>
    </Page>
  );
}
