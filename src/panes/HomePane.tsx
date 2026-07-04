import { Pane } from "../components/Pane";

// Static placeholder data until the vault modules land (roadmap steps 2–6).
const TODAY = [
  { label: "algorithms — read chapter 4", dur: "2h", done: true },
  { label: "linear algebra — problem set 2", dur: "1h 30m", done: true },
  { label: "operating systems — notes", dur: "1h", done: false },
  { label: "gym", dur: "1h", done: false },
  { label: "revisit spaced repetition", dur: "30m", done: false },
];

export function HomePane() {
  return (
    <Pane title="home" hint="h">
      <div className="home-hero">
        <span className="logo">▣</span>
        <div>
          <h1>studium</h1>
          <span className="tagline">plan. focus. achieve.</span>
        </div>
      </div>

      <div className="section-label">today</div>
      <ul className="today-list">
        {TODAY.map((t) => (
          <li key={t.label} className={t.done ? "is-done" : ""}>
            <span className="box">{t.done ? "☑" : "☐"}</span>
            <span className="label">{t.label}</span>
            <span className="dur">{t.dur}</span>
          </li>
        ))}
      </ul>

      <div className="home-lower">
        <div className="up-next">
          <div className="section-label">up next</div>
          <div className="entry">
            <span className="chev">›</span>
            <div>
              study session
              <span className="when">tomorrow&ensp;10:00</span>
            </div>
          </div>
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
    </Pane>
  );
}
