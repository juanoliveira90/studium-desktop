import { Page } from "../components/Page";
import {
  blocksForDay,
  gridPlacement,
  planColorBySlug,
  WEEKDAYS,
  type ScheduleBlock,
} from "../schedule/block";
import { useSchedule } from "../schedule/useSchedule";
import { useVault } from "../vault/useVault";
import { VaultGate } from "../vault/VaultGate";

const START_HOUR = 8;
const END_HOUR = 22;
const HOURS = END_HOUR - START_HOUR;
const ROWS = HOURS * 2; // half-hour resolution, schedule times are "HH:MM"

export function SchedulePage() {
  const vault = useVault();
  const schedule = useSchedule(Boolean(vault.data));

  let body;
  if (vault.isPending) {
    body = <p className="muted">opening vault…</p>;
  } else if (!vault.data) {
    body = <VaultGate loadError={vault.error} />;
  } else if (schedule.isPending) {
    body = <p className="muted">loading schedule…</p>;
  } else if (schedule.isError) {
    body = <p className="error">failed to load schedule: {String(schedule.error)}</p>;
  } else {
    body = <WeekGrid blocks={schedule.data.blocks} errors={schedule.data.errors} />;
  }

  return (
    <Page title="weekly routine">
      {body}
    </Page>
  );
}

/** The recurring weekly routine on an hour-row × weekday-column grid. */
function WeekGrid({ blocks, errors }: { blocks: ScheduleBlock[]; errors: string[] }) {
  const planColors = planColorBySlug(blocks);

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
    <>
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
          blocksForDay(day, blocks).map((b) => {
            const placed = gridPlacement(b, START_HOUR, END_HOUR);
            if (!placed) return null;
            const color = b.plan ? planColors.get(b.plan) : undefined;
            return (
              <div
                key={`${b.day}-${b.start}`}
                className="week-block"
                style={{
                  gridColumn: col + 2,
                  // +2: grid lines are 1-based and row 1 is the day header
                  gridRow: `${placed.row + 2} / span ${placed.span}`,
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
      {errors.length > 0 && (
        <p className="warn">
          ⚠ {errors.length} schedule block{errors.length === 1 ? "" : "s"} in
          schedule.md couldn&apos;t be read: {errors.join("; ")}
        </p>
      )}
    </>
  );
}
