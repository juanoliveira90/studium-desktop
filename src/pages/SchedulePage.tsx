import { Page } from "../components/Page";
import {
  DAYS,
  SCHEDULE_BLOCKS,
  START_HOUR,
  END_HOUR,
  WEEK_RANGE_LABEL,
} from "../data/mock";

const HOURS = END_HOUR - START_HOUR; // 14 one-hour rows

function WeekHeader() {
  return (
    <div className="week-header">
      <h2>week</h2>
      <button className="nav" aria-label="previous week">‹</button>
      <span className="range">{WEEK_RANGE_LABEL}</span>
      <button className="nav" aria-label="next week">›</button>
      <button className="today-btn">today</button>
    </div>
  );
}

export function SchedulePage() {
  const cells = [];
  for (let row = 0; row < HOURS; row++) {
    for (let day = 0; day < 7; day++) {
      cells.push(
        <div
          key={`${row}-${day}`}
          className="cell"
          style={{ gridColumn: day + 2, gridRow: row + 2 }}
        />,
      );
    }
  }

  return (
    <Page title="week" hint="alt+4" header={<WeekHeader />}>
      <div className="week-grid">
        <div style={{ gridColumn: 1, gridRow: 1 }} />
        {DAYS.map((d, i) => (
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
              style={{ gridRow: i * 2 + 2 }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          );
        })}
        {cells}
        {SCHEDULE_BLOCKS.map((b) => (
          <div
            key={`${b.day}-${b.start}`}
            className="week-block"
            style={{
              gridColumn: b.day + 2,
              gridRow: `${b.start - START_HOUR + 2} / span ${b.end - b.start}`,
              background: `var(--block-${b.color})`,
              borderColor: "transparent",
            }}
          >
            {b.label}
          </div>
        ))}
      </div>
    </Page>
  );
}
