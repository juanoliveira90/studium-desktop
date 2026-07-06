import { describe, expect, it } from "vitest";
import {
  fuzzyScore,
  filterNotes,
  newNoteDoc,
  noteFromDoc,
  noteTags,
  slugify,
  sortNotes,
  type Note,
} from "./note";

const doc = (over: Partial<Parameters<typeof noteFromDoc>[0]> = {}) => ({
  path: "notes/reading-sicp.md",
  frontmatter: {
    created: "2026-06-12",
    updated: "2026-07-01",
    tags: ["book"],
  },
  frontmatter_error: null,
  body: "# Reading SICP\n\nChapter 1 wraps procedures and processes.\n",
  ...over,
});

describe("noteFromDoc", () => {
  it("takes the title from the first heading and dates/tags from frontmatter", () => {
    const note = noteFromDoc(doc());

    expect(note).toMatchObject({
      path: "notes/reading-sicp.md",
      title: "Reading SICP",
      created: "2026-06-12",
      updated: "2026-07-01",
      tags: ["book"],
    });
  });

  it("falls back to the filename stem when the body has no heading", () => {
    const note = noteFromDoc(doc({ body: "no heading here\n" }));

    expect(note.title).toBe("reading-sicp");
  });

  it("tolerates malformed frontmatter, surfacing the error", () => {
    const note = noteFromDoc(
      doc({
        frontmatter: {},
        frontmatter_error: "invalid YAML",
        body: "# Salvaged\n",
      }),
    );

    expect(note.title).toBe("Salvaged");
    expect(note.tags).toEqual([]);
    expect(note.updated).toBeUndefined();
    expect(note.frontmatterError).toBe("invalid YAML");
  });

  it("ignores non-string tags and non-array tag values", () => {
    expect(noteFromDoc(doc({ frontmatter: { tags: [1, "ok"] } })).tags).toEqual(["ok"]);
    expect(noteFromDoc(doc({ frontmatter: { tags: "book" } })).tags).toEqual([]);
  });
});

const note = (title: string, updated: string | undefined, tags: string[] = []): Note => ({
  path: `notes/${slugify(title)}.md`,
  title,
  updated,
  created: updated,
  tags,
  body: "",
  frontmatter: {},
});

describe("sortNotes", () => {
  it("orders by updated date, newest first, undated last", () => {
    const sorted = sortNotes([
      note("old", "2026-01-01"),
      note("undated", undefined),
      note("new", "2026-07-01"),
    ]);

    expect(sorted.map((n) => n.title)).toEqual(["new", "old", "undated"]);
  });
});

describe("noteTags", () => {
  it("returns unique tags in first-seen order", () => {
    const tags = noteTags([
      note("a", "2026-01-01", ["book"]),
      note("b", "2026-01-02", ["lecture", "book"]),
      note("c", "2026-01-03", ["idea"]),
    ]);

    expect(tags).toEqual(["book", "lecture", "idea"]);
  });
});

describe("fuzzyScore", () => {
  it("matches subsequences case-insensitively", () => {
    expect(fuzzyScore("rsicp", "Reading SICP")).not.toBeNull();
    expect(fuzzyScore("SICP", "reading sicp")).not.toBeNull();
    expect(fuzzyScore("xyz", "Reading SICP")).toBeNull();
  });

  it("scores tighter and earlier matches higher", () => {
    const exact = fuzzyScore("sicp", "sicp")!;
    const spread = fuzzyScore("sicp", "s_i_c_p suffix")!;
    expect(exact).toBeGreaterThan(spread);
  });

  it("matches everything on an empty query", () => {
    expect(fuzzyScore("", "anything")).not.toBeNull();
  });
});

describe("filterNotes", () => {
  const notes = [
    note("Reading SICP", "2026-07-01", ["book"]),
    note("Lecture: integration techniques", "2026-06-30", ["lecture"]),
    note("App ideas", "2026-06-28", ["idea", "personal"]),
  ];

  it("filters by tag, 'all' passing everything", () => {
    expect(filterNotes(notes, "all", "").map((n) => n.title)).toHaveLength(3);
    expect(filterNotes(notes, "book", "").map((n) => n.title)).toEqual(["Reading SICP"]);
  });

  it("fuzzy-filters by query, best match first", () => {
    const hits = filterNotes(notes, "all", "in");
    expect(hits.map((n) => n.title)).toContain("Lecture: integration techniques");
    expect(hits.map((n) => n.title)).not.toContain("App ideas");

    expect(filterNotes(notes, "all", "sicp")[0].title).toBe("Reading SICP");
  });

  it("combines tag and query filters", () => {
    expect(filterNotes(notes, "personal", "sicp")).toEqual([]);
  });
});

describe("slugify", () => {
  it("lowercases and dashes the title", () => {
    expect(slugify("Lecture: Integration Techniques!")).toBe(
      "lecture-integration-techniques",
    );
    expect(slugify("  spaced   out  ")).toBe("spaced-out");
  });
});

describe("newNoteDoc", () => {
  it("builds the path, frontmatter and heading body for a title", () => {
    const { path, frontmatter, body } = newNoteDoc("App ideas", "2026-07-06");

    expect(path).toBe("notes/app-ideas.md");
    expect(frontmatter).toEqual({
      created: "2026-07-06",
      updated: "2026-07-06",
      tags: [],
    });
    expect(body).toBe("# App ideas\n\n");
  });
});
