import { Page } from "../components/Page";
import {
  blocksForDay,
  formatBlockTime,
  planColorBySlug,
  type ScheduleBlock,
} from "../schedule/block";
import { useSchedule } from "../schedule/useSchedule";
import type { Plan } from "../plans/plan";
import { usePlans } from "../plans/usePlans";
import { timeOf, todayChecklist, upNext, weekdayOf } from "../home/today";
import { useVault } from "../vault/useVault";
import { VaultGate } from "../vault/VaultGate";

export function HomePage() {
  const vault = useVault();
  const enabled = Boolean(vault.data);
  const schedule = useSchedule(enabled);
  const plansQuery = usePlans(enabled);

  let body;
  if (vault.isPending) {
    body = <p className="muted">opening vault…</p>;
  } else if (!vault.data) {
    body = <VaultGate loadError={vault.error} />;
  } else if (schedule.isPending || plansQuery.isPending) {
    body = <p className="muted">loading today…</p>;
  } else if (schedule.isError) {
    body = <p className="error">failed to load schedule: {String(schedule.error)}</p>;
  } else if (plansQuery.isError) {
    body = <p className="error">failed to load plans: {String(plansQuery.error)}</p>;
  } else {
    body = <HomeToday blocks={schedule.data.blocks} plans={plansQuery.data.plans} />;
  }

  return (
    <Page title="home" hint="alt+1">
      <div className="home-hero">
        <span className="logo">▣</span>
        <div>
          <h1>studium</h1>
          <span className="tagline">plan. focus. achieve.</span>
        </div>
      </div>
      {body}
    </Page>
  );
}

/** Today's aggregation over the schedule and plans, as of the real clock. */
function HomeToday({ blocks, plans }: { blocks: ScheduleBlock[]; plans: Plan[] }) {
  const clock = new Date();
  const day = weekdayOf(clock);
  const now = timeOf(clock);

  const checklist = todayChecklist(blocks, plans, day, now);
  const events = blocksForDay(day, blocks);
  const next = upNext(blocks, day, now);
  const colors = planColorBySlug(blocks);

  return (
    <>
      <div className="home-columns">
        <div>
          <div className="section-label">today</div>
          <ul className="today-list" aria-label="today">
            {checklist.map((t) => (
              <li key={t.label} className={t.done ? "is-done" : ""}>
                <span className="box">{t.done ? "☑" : "☐"}</span>
                <span className="label">{t.label}</span>
                {t.dur && <span className="dur">{t.dur}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="section-label">today's events</div>
          <ul className="today-events" aria-label="today's events">
            {events.map((b) => {
              const color = b.plan ? colors.get(b.plan) : undefined;
              return (
                <li key={`${b.day}-${b.start}`}>
                  <span
                    className="dot"
                    style={{
                      color: color ? `var(--block-${color})` : "var(--fg-dim)",
                    }}
                  >
                    ●
                  </span>
                  <span className="label">{b.title}</span>
                  <span className="time">{formatBlockTime(b)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="home-lower">
        <div className="up-next">
          <div className="section-label">up next</div>
          {next ? (
            <div className="entry">
              <span className="chev">›</span>
              <div>
                {next.title}
                <span className="when">today&ensp;{next.start}</span>
              </div>
            </div>
          ) : (
            <div className="entry">
              <span className="chev">›</span>
              <div>
                nothing scheduled
                <span className="when">enjoy the evening</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
