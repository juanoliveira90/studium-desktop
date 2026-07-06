import { Page } from "../components/Page";
import {
  blocksForDay,
  formatBlockTime,
  MOCK_NOW_HOUR,
  TODAY_DAY_INDEX,
  TODAY_TASKS,
} from "../data/mock";

export function HomePage() {
  const events = blocksForDay(TODAY_DAY_INDEX);
  const upNext = events.find((b) => b.start >= MOCK_NOW_HOUR);

  return (
    <Page title="home" hint="alt+1">
      <div className="home-hero">
        <span className="logo">▣</span>
        <div>
          <h1>studium</h1>
          <span className="tagline">plan. focus. achieve.</span>
        </div>
      </div>

      <div className="home-columns">
        <div>
          <div className="section-label">today</div>
          <ul className="today-list">
            {TODAY_TASKS.map((t) => (
              <li key={t.label} className={t.done ? "is-done" : ""}>
                <span className="box">{t.done ? "☑" : "☐"}</span>
                <span className="label">{t.label}</span>
                <span className="dur">{t.dur}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="section-label">today's events</div>
          <ul className="today-events" aria-label="today's events">
            {events.map((b) => (
              <li key={`${b.day}-${b.start}`}>
                <span
                  className="dot"
                  style={{ color: `var(--block-${b.color})` }}
                >
                  ●
                </span>
                <span className="label">{b.label}</span>
                <span className="time">{formatBlockTime(b)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="home-lower">
        <div className="up-next">
          <div className="section-label">up next</div>
          {upNext ? (
            <div className="entry">
              <span className="chev">›</span>
              <div>
                {upNext.label}
                <span className="when">today&ensp;{`${String(upNext.start).padStart(2, "0")}:00`}</span>
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
        <blockquote className="quote">
          “The beautiful thing about learning is that no one can take it away
          from you.”
          <span className="who">— B.B. King</span>
        </blockquote>
      </div>

      <div className="prompt-line">
        ~ /studium <span className="cursor">&nbsp;</span>
      </div>
    </Page>
  );
}
