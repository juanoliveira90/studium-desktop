import { Pane } from "../components/Pane";

const TAGS = ["all", "book", "lecture", "idea", "personal"];

const NOTES = [
  { title: "dynamic programming — patterns", date: "May 20" },
  { title: "ctx switch in operating systems", date: "May 19" },
  { title: "fourier transforms intuition", date: "May 18" },
];

export function NotesPane() {
  return (
    <Pane title="notes" hint="n">
      <input
        className="note-search"
        type="text"
        placeholder="search notes..."
        aria-label="search notes"
      />
      <div className="tabs" role="tablist">
        {TAGS.map((tag) => (
          <button
            key={tag}
            role="tab"
            aria-selected={tag === "all"}
            className={`tab${tag === "all" ? " is-active" : ""}`}
          >
            {tag}
          </button>
        ))}
      </div>
      <ul className="note-list">
        {NOTES.map((n) => (
          <li key={n.title}>
            <span className="icon">🗎</span>
            <span>{n.title}</span>
            <span className="date">{n.date}</span>
          </li>
        ))}
      </ul>
      <button className="add-row">+ new note</button>
    </Pane>
  );
}
