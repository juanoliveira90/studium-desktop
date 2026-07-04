import { Pane } from "../components/Pane";

const DAYS = ["Mon 20", "Tue 21", "Wed 22", "Thu 23", "Fri 24", "Sat 25", "Sun 26"];
const START_HOUR = 8;
const END_HOUR = 22;
const HOURS = END_HOUR - START_HOUR; // 14 one-hour rows

// day: 0 = Monday; start/end in hours from midnight
const BLOCKS = [
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

function WeekHeader() {
  return (
    <div className="week-header">
      <h2>week</h2>
      <button className="nav" aria-label="previous week">‹</button>
      <span className="range">May 20 — May 26, 2024</span>
      <button className="nav" aria-label="next week">›</button>
      <button className="today-btn">today</button>
    </div>
  );
}

export function SchedulePane() {
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
    <Pane title="week" hint="w" header={<WeekHeader />}>
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
        {BLOCKS.map((b) => (
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
    </Pane>
  );
}
