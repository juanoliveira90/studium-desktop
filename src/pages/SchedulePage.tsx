import { useLayoutEffect, useRef, useState } from "react";
import { Page } from "../components/Page";
import { useContextMenu } from "../components/useContextMenu";
import { usePlans } from "../plans/usePlans";
import type { Plan } from "../plans/plan";
import {
  blocksForDay,
  cellEventTimes,
  gridPlacement,
  isValidTime,
  planColorBySlug,
  toMinutes,
  WEEKDAYS,
  wrappedScrollTop,
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

// The grid covers the full day in half-hour rows ("HH:MM" times), stacked
// COPIES times inside a scroll viewport. The scroll position lives in the
// middle copy and wraps (see wrappedScrollTop), so scrolling circles the
// 24h routine forever. The viewport opens at OPEN_HOUR.
const HOURS = 24;
const CYCLE_ROWS = HOURS * 2;
const COPIES = 3;
const OPEN_HOUR = 8;

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

/** The week grid plus event CRUD: clicking an empty cell adds an event
 *  starting at that half-hour (Google Calendar style, in a popover at the
 *  click), the form below the grid adds one from scratch, clicking a block
 *  opens the form in a popover beside it, right-click deletes after
 *  confirming. */
function ScheduleEditor({ blocks, errors }: { blocks: ScheduleBlock[]; errors: string[] }) {
  // null: form closed; "new": adding; a block: editing that entry
  const [editing, setEditing] = useState<ScheduleBlock | "new" | null>(null);
  // day/times of the clicked empty cell; unset when adding from the button
  const [prefill, setPrefill] = useState<Partial<EventFields> | undefined>(undefined);
  // where the edited block sits on screen, so the form can anchor beside it
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
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

  const form = editing !== null && (
    <EventForm
      key={editing === "new" ? `new-${prefill?.day}-${prefill?.start}` : editing.index}
      initial={editing === "new" ? prefill : editing}
      plans={plansQuery.data?.plans ?? []}
      submitLabel={editing === "new" ? "add event" : "save event"}
      onSubmit={submit}
      onCancel={close}
      writeError={addEvent.error ?? updateEvent.error}
    />
  );

  return (
    <>
      <WeekGrid
        blocks={blocks}
        onBlockClick={(block, e) => {
          setAnchor(e.currentTarget.getBoundingClientRect());
          setEditing(block);
        }}
        onCellClick={(day, halfHourRow, e) => {
          setAnchor(e.currentTarget.getBoundingClientRect());
          setPrefill(cellEventTimes(day, halfHourRow));
          setEditing("new");
        }}
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
      {editing === null && (
        <button
          className="add-row"
          onClick={() => {
            setPrefill(undefined);
            setEditing("new");
          }}
        >
          + new event
        </button>
      )}
      {editing === "new" && prefill === undefined && form}
      {editing !== null && (editing !== "new" || prefill !== undefined) && anchor && (
        <EventPopover anchor={anchor}>{form}</EventPopover>
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

/** Floats its children beside the anchored block: to its right when there's
 *  room, flipped to the left otherwise, clamped to stay inside the window. */
function EventPopover({ anchor, children }: { anchor: DOMRect; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: anchor.top, left: anchor.right + POPOVER_GAP });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();

    const overflowsRight = anchor.right + POPOVER_GAP + width > window.innerWidth;
    let left = overflowsRight ? anchor.left - POPOVER_GAP - width : anchor.right + POPOVER_GAP;
    left = Math.max(POPOVER_GAP, left);

    let top = Math.min(anchor.top, window.innerHeight - height - POPOVER_GAP);
    top = Math.max(POPOVER_GAP, top);

    setPos({ top, left });
  }, [anchor]);

  return (
    <div ref={ref} className="event-popover" style={{ top: pos.top, left: pos.left }}>
      {children}
    </div>
  );
}

const POPOVER_GAP = 8;

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
  // a block being edited, or the day/times prefilled from a cell click
  initial?: Partial<EventFields>;
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

/** The recurring weekly routine on an hour-row × weekday-column grid, inside
 *  a scroll viewport that wraps around the 24h cycle endlessly. */
function WeekGrid({
  blocks,
  onBlockClick,
  onCellClick,
  onBlockContextMenu,
}: {
  blocks: ScheduleBlock[];
  onBlockClick: (block: ScheduleBlock, e: React.MouseEvent<HTMLElement>) => void;
  onCellClick: (day: Weekday, halfHourRow: number, e: React.MouseEvent<HTMLElement>) => void;
  onBlockContextMenu: (e: React.MouseEvent, block: ScheduleBlock) => void;
}) {
  const planColors = planColorBySlug(blocks);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);

  // one 24h copy in scroll pixels; the sticky header row is not part of a copy
  const cycleHeight = () => {
    const scroller = scrollRef.current;
    if (!scroller) return 0;
    const headHeight = headRef.current?.offsetHeight ?? 0;
    return (scroller.scrollHeight - headHeight) / COPIES;
  };

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // open on the middle copy, scrolled to OPEN_HOUR
    scroller.scrollTop = cycleHeight() * (1 + OPEN_HOUR / HOURS);
  }, []);

  const onScroll = () => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const cycle = cycleHeight();
    if (cycle <= 0) return;
    const wrapped = wrappedScrollTop(scroller.scrollTop, cycle);
    if (wrapped !== scroller.scrollTop) scroller.scrollTop = wrapped;
  };

  const cells = [];
  for (let row = 0; row < CYCLE_ROWS * COPIES; row++) {
    for (let day = 0; day < 7; day++) {
      cells.push(
        <div
          key={`${row}-${day}`}
          className={`cell${row % 2 === 0 ? " is-half" : ""}`}
          style={{ gridColumn: day + 2, gridRow: row + 2 }}
          // Google Calendar style: a click on empty grid starts a new event
          // there; the same cell in any wrap-around copy is the same time
          onClick={(e) => onCellClick(WEEKDAYS[day], row % CYCLE_ROWS, e)}
        />,
      );
    }
  }

  return (
    <div ref={scrollRef} className="week-scroll" onScroll={onScroll}>
      <div className="week-grid">
        <div ref={headRef} className="day-head" style={{ gridColumn: 1, gridRow: 1 }} />
        {WEEKDAYS.map((d, i) => (
          <div key={d} className="day-head" style={{ gridColumn: i + 2, gridRow: 1 }}>
            {d}
          </div>
        ))}
        {Array.from({ length: COPIES * HOURS / 2 }, (_, i) => {
          const hour = (i * 2) % HOURS;
          return (
            <div
              key={i}
              className="hour-label"
              style={{ gridRow: i * 4 + 2 }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          );
        })}
        {cells}
        {Array.from({ length: COPIES }, (_, copy) =>
          WEEKDAYS.flatMap((day, col) =>
            blocksForDay(day, blocks).map((b) => {
              const placed = gridPlacement(b, 0, HOURS);
              if (!placed) return null;
              const color = b.plan ? planColors.get(b.plan) : undefined;
              return (
                <div
                  key={`${copy}-${b.index}`}
                  className="week-block"
                  onClick={(e) => onBlockClick(b, e)}
                  onContextMenu={(e) => onBlockContextMenu(e, b)}
                  style={{
                    gridColumn: col + 2,
                    // +2: grid lines are 1-based and row 1 is the day header
                    gridRow: `${copy * CYCLE_ROWS + placed.row + 2} / span ${placed.span}`,
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
          ),
        )}
      </div>
    </div>
  );
}
