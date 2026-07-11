import { useState } from "react";
import { Page } from "../components/Page";
import { useContextMenu } from "../components/useContextMenu";
import { usePlans } from "../plans/usePlans";
import type { Plan } from "../plans/plan";
import {
  blocksForDay,
  gridPlacement,
  isValidTime,
  planColorBySlug,
  toMinutes,
  WEEKDAYS,
  type EventFields,
  type ScheduleBlock,
  type Weekday,
} from "../schedule/block";
import {
  useAddEvent,
  useDeleteEvent,
  useSchedule,
  useUpdateEvent,
} from "../schedule/useSchedule";
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
    body = <ScheduleEditor blocks={schedule.data.blocks} errors={schedule.data.errors} />;
  }

  return (
    <Page title="weekly routine">
      {body}
    </Page>
  );
}

/** The week grid plus event CRUD: a form below the grid adds events, clicking
 *  a block loads it into the form, right-click deletes after confirming. */
function ScheduleEditor({ blocks, errors }: { blocks: ScheduleBlock[]; errors: string[] }) {
  // null: form closed; "new": adding; a block: editing that entry
  const [editing, setEditing] = useState<ScheduleBlock | "new" | null>(null);
  const addEvent = useAddEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const { menu, open: openMenu } = useContextMenu();
  // the plan dropdown lists the vault's plans (the page renders only with a vault open)
  const plansQuery = usePlans(true);

  const close = () => setEditing(null);
  const submit = (fields: EventFields) => {
    if (editing === "new") {
      addEvent.mutate(fields, { onSuccess: close });
    } else if (editing) {
      updateEvent.mutate({ index: editing.index, fields }, { onSuccess: close });
    }
  };

  return (
    <>
      <WeekGrid
        blocks={blocks}
        onBlockClick={setEditing}
        onBlockContextMenu={(e, block) =>
          openMenu(e, [
            {
              label: "delete event",
              confirmLabel: "really delete?",
              onSelect: () => deleteEvent.mutate(block.index),
            },
          ])
        }
      />
      {editing === null ? (
        <button className="add-row" onClick={() => setEditing("new")}>
          + new event
        </button>
      ) : (
        <EventForm
          key={editing === "new" ? "new" : editing.index}
          initial={editing === "new" ? undefined : editing}
          plans={plansQuery.data?.plans ?? []}
          submitLabel={editing === "new" ? "add event" : "save event"}
          onSubmit={submit}
          onCancel={close}
          writeError={addEvent.error ?? updateEvent.error}
        />
      )}
      {errors.length > 0 && (
        <p className="warn">
          ⚠ {errors.length} schedule block{errors.length === 1 ? "" : "s"} in
          schedule.md couldn&apos;t be read: {errors.join("; ")}
        </p>
      )}
      {menu}
    </>
  );
}

/** What's wrong with the form's fields, or null when they make an event. */
function validate(fields: EventFields): string | null {
  if (fields.title === "") return "title is required";
  if (!isValidTime(fields.start)) return 'start must be 24h "HH:MM"';
  if (!isValidTime(fields.end)) return 'end must be 24h "HH:MM"';
  if (toMinutes(fields.end) <= toMinutes(fields.start)) return "end must be after start";
  return null;
}

function EventForm({
  initial,
  plans,
  submitLabel,
  onSubmit,
  onCancel,
  writeError,
}: {
  initial?: ScheduleBlock;
  plans: Plan[];
  submitLabel: string;
  onSubmit: (fields: EventFields) => void;
  onCancel: () => void;
  writeError: Error | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [day, setDay] = useState<Weekday>(initial?.day ?? "mon");
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.end ?? "");
  const [plan, setPlan] = useState(initial?.plan ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const fields: EventFields = {
      day,
      start,
      end,
      title: title.trim(),
      description: description.trim() || undefined,
      plan: plan || undefined,
    };
    const problem = validate(fields);
    setError(problem);
    if (problem === null) onSubmit(fields);
  };

  return (
    <form
      className="event-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <input
        type="text"
        aria-label="event title"
        placeholder="title..."
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="text"
        aria-label="event description"
        placeholder="description (optional)..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="event-form-row">
        <select aria-label="event day" value={day} onChange={(e) => setDay(e.target.value as Weekday)}>
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="text"
          aria-label="start time"
          placeholder="09:30"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <span className="muted">–</span>
        <input
          type="text"
          aria-label="end time"
          placeholder="11:00"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <select aria-label="linked plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">no plan</option>
          {plans.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {writeError && <p className="error">failed to write schedule.md: {String(writeError)}</p>}
      <div className="event-form-row">
        <button type="submit">{submitLabel}</button>
        <button type="button" onClick={onCancel}>
          cancel
        </button>
      </div>
    </form>
  );
}

/** The recurring weekly routine on an hour-row × weekday-column grid. */
function WeekGrid({
  blocks,
  onBlockClick,
  onBlockContextMenu,
}: {
  blocks: ScheduleBlock[];
  onBlockClick: (block: ScheduleBlock) => void;
  onBlockContextMenu: (e: React.MouseEvent, block: ScheduleBlock) => void;
}) {
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
              key={b.index}
              className="week-block"
              onClick={() => onBlockClick(b)}
              onContextMenu={(e) => onBlockContextMenu(e, b)}
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
              {b.description && <span className="week-block-desc">{b.description}</span>}
            </div>
          );
        }),
      )}
    </div>
  );
}
