import { useCallback, useEffect, useRef, useState } from "react";
import { Page } from "../components/Page";
import { formatShortDate } from "../data/mock";
import { Editor } from "../notes/Editor";
import { filterNotes, noteTags, type Note } from "../notes/note";
import { useCreateNote, useNotes, useSaveNote } from "../notes/useNotes";
import { useVault } from "../vault/useVault";
import { VaultGate } from "../vault/VaultGate";

export function NotesPage() {
  const vault = useVault();
  const notesQuery = useNotes(Boolean(vault.data));
  const [openPath, setOpenPath] = useState<string | null>(null);

  let body;
  if (vault.isPending) {
    body = <p className="muted">opening vault…</p>;
  } else if (!vault.data) {
    body = <VaultGate loadError={vault.error} />;
  } else if (notesQuery.isPending) {
    body = <p className="muted">loading notes…</p>;
  } else if (notesQuery.isError) {
    body = <p className="error">failed to load notes: {String(notesQuery.error)}</p>;
  } else {
    const openNote = openPath
      ? notesQuery.data.find((n) => n.path === openPath)
      : undefined;
    body = openNote ? (
      <NoteEditor
        key={openNote.path}
        note={openNote}
        onBack={() => setOpenPath(null)}
      />
    ) : (
      <NoteList notes={notesQuery.data} onOpen={setOpenPath} />
    );
  }

  return (
    <Page title="notes" hint="alt+2">
      {body}
    </Page>
  );
}

/** Search line + tag tabs + note list; the fuzzy finder half of the page. */
function NoteList({
  notes,
  onOpen,
}: {
  notes: Note[];
  onOpen: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [highlight, setHighlight] = useState(0);
  const [addingTitle, setAddingTitle] = useState<string | null>(null);
  const createNote = useCreateNote();

  const tags = ["all", ...noteTags(notes)];
  const filtered = filterNotes(notes, tag, query);
  const highlighted = Math.min(highlight, Math.max(filtered.length - 1, 0));

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(Math.min(highlighted + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(Math.max(highlighted - 1, 0));
    } else if (e.key === "Enter" && filtered.length > 0) {
      // preventDefault so the keystroke can't leak into the editor that
      // grabs focus as it mounts
      e.preventDefault();
      onOpen(filtered[highlighted].path);
    }
  };

  const submitNewNote = () => {
    const title = addingTitle?.trim();
    if (!title) return;
    createNote.mutate(title, {
      onSuccess: (path) => {
        setAddingTitle(null);
        onOpen(path);
      },
    });
  };

  return (
    <>
      <input
        className="note-search"
        type="text"
        placeholder="search notes..."
        aria-label="search notes"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
        }}
        onKeyDown={onSearchKey}
      />
      <div className="tabs" role="tablist">
        {tags.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tag}
            className={`tab${t === tag ? " is-active" : ""}`}
            onClick={() => {
              setTag(t);
              setHighlight(0);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="note-list">
        {filtered.map((n, i) => (
          <li key={n.path} className={i === highlighted ? "is-highlighted" : ""}>
            <button className="note-row" onClick={() => onOpen(n.path)}>
              <span className="icon">🗎</span>
              <span>{n.title}</span>
              {n.frontmatterError && (
                <span className="warn" title={n.frontmatterError}>
                  ⚠
                </span>
              )}
              <span className="date">{n.updated ? formatShortDate(n.updated) : ""}</span>
            </button>
          </li>
        ))}
      </ul>
      {addingTitle === null ? (
        <button className="add-row" onClick={() => setAddingTitle("")}>
          + new note
        </button>
      ) : (
        <input
          className="note-search add-row"
          type="text"
          placeholder="note title..."
          aria-label="new note title"
          autoFocus
          value={addingTitle}
          onChange={(e) => setAddingTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNewNote();
            if (e.key === "Escape") {
              e.stopPropagation();
              setAddingTitle(null);
            }
          }}
        />
      )}
    </>
  );
}

const SAVE_DEBOUNCE_MS = 800;

/**
 * The open-note view: CodeMirror over the body, autosaving on a debounce and
 * flushing on Escape/unmount. Notes whose frontmatter failed to parse are
 * never written back — regenerating their frontmatter would destroy whatever
 * the parser choked on — so they open effectively read-only.
 */
function NoteEditor({ note, onBack }: { note: Note; onBack: () => void }) {
  const save = useSaveNote();
  const [draft, setDraft] = useState<string>();
  const readOnly = Boolean(note.frontmatterError);

  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const noteRef = useRef(note);
  const mutateRef = useRef(save.mutate);

  useEffect(() => {
    noteRef.current = note;
    mutateRef.current = save.mutate;
  }, [note, save.mutate]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current !== null) {
      mutateRef.current({ note: noteRef.current, body: pending.current });
      pending.current = null;
    }
  }, []);

  useEffect(() => flush, [flush]); // flush on unmount (page switch, etc.)

  const onChange = (body: string) => {
    setDraft(body);
    if (readOnly) return;
    pending.current = body;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  };

  return (
    <div
      className="note-editor"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          flush();
          onBack();
        }
      }}
    >
      <div className="editor-head">
        <span className="path">{note.path}</span>
        {readOnly && (
          <span className="warn">
            ⚠ frontmatter unreadable — not saving ({note.frontmatterError})
          </span>
        )}
        <span className="hint">esc to close</span>
      </div>
      <Editor value={draft ?? note.body} onChange={onChange} />
    </div>
  );
}
