import { Page } from "../components/Page";
import { formatShortDate, NOTES, noteTags } from "../data/mock";

export function NotesPage() {
  const notes = [...NOTES].sort((a, b) => b.updated.localeCompare(a.updated));
  const tags = ["all", ...noteTags(NOTES)];

  return (
    <Page title="notes" hint="alt+2">
      <input
        className="note-search"
        type="text"
        placeholder="search notes..."
        aria-label="search notes"
      />
      <div className="tabs" role="tablist">
        {tags.map((tag) => (
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
        {notes.map((n) => (
          <li key={n.title}>
            <span className="icon">🗎</span>
            <span>{n.title}</span>
            <span className="date">{formatShortDate(n.updated)}</span>
          </li>
        ))}
      </ul>
      <button className="add-row">+ new note</button>
    </Page>
  );
}
