import { Page } from "../components/Page";
import {
  blocksForDay,
  formatBlockTime,
  MOCK_TODAY,
  planColorIndex,
  todayChecklist,
  upNextBlock,
} from "../data/mock";

export function HomePage() {
  const checklist = todayChecklist();
  const events = blocksForDay(MOCK_TODAY);
  const upNext = upNextBlock();

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
              const color = planColorIndex(b.plan);
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
          {upNext ? (
            <div className="entry">
              <span className="chev">›</span>
              <div>
                {upNext.title}
                <span className="when">today&ensp;{upNext.start}</span>
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
