/*
 * Notes domain model: pure transforms from vault documents (notes/<slug>.md,
 * frontmatter created/updated/tags, body starting with a `# Title` heading)
 * to what the notes page renders. No I/O here — hooks in useNotes.ts feed
 * these from the invoke layer.
 */

import type { DocPayload } from "../vault/ipc";

export interface Note {
  /** Vault-relative path, e.g. "notes/reading-sicp.md". */
  path: string;
  /** First `#` heading of the body, else the filename stem. */
  title: string;
  created?: string;
  updated?: string;
  tags: string[];
  body: string;
  /** Full frontmatter as read, preserved verbatim on writes. */
  frontmatter: Record<string, unknown>;
  /** Parse error reported by the vault core for malformed YAML. */
  frontmatterError?: string;
}

const dateString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

export function noteFromDoc(doc: DocPayload): Note {
  const heading = doc.body.match(/^#\s+(.+)$/m);
  const stem = doc.path.split("/").pop()!.replace(/\.md$/, "");
  const rawTags = doc.frontmatter["tags"];
  return {
    path: doc.path,
    title: heading ? heading[1].trim() : stem,
    created: dateString(doc.frontmatter["created"]),
    updated: dateString(doc.frontmatter["updated"]),
    tags: Array.isArray(rawTags)
      ? rawTags.filter((t): t is string => typeof t === "string")
      : [],
    body: doc.body,
    frontmatter: doc.frontmatter,
    frontmatterError: doc.frontmatter_error ?? undefined,
  };
}

/** Newest `updated` first; notes without a date sink to the bottom. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) =>
    (b.updated ?? "").localeCompare(a.updated ?? ""),
  );
}

/** Unique tags in first-seen order — drives the filter tabs. */
export function noteTags(notes: Note[]): string[] {
  return [...new Set(notes.flatMap((n) => n.tags))];
}

/**
 * Subsequence fuzzy match, case-insensitive. Returns null on no match;
 * otherwise a score where tighter and earlier matches rank higher.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (q.length === 0) return 0;
  let ti = -1;
  let first = -1;
  for (const ch of q) {
    ti = t.indexOf(ch, ti + 1);
    if (ti === -1) return null;
    if (first === -1) first = ti;
  }
  const span = ti - first + 1; // window the match occupies
  return -(span - q.length) * 2 - first;
}

/** Tag filter plus fuzzy query over titles; query hits sorted best-first. */
export function filterNotes(notes: Note[], tag: string, query: string): Note[] {
  const tagged = tag === "all" ? notes : notes.filter((n) => n.tags.includes(tag));
  if (query === "") return tagged;
  return tagged
    .map((n) => ({ n, score: fuzzyScore(query, n.title) }))
    .filter((x): x is { n: Note; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.n);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Path, frontmatter and body for a freshly created note. */
export function newNoteDoc(title: string, today: string) {
  return {
    path: `notes/${slugify(title)}.md`,
    frontmatter: { created: today, updated: today, tags: [] as string[] },
    body: `# ${title}\n\n`,
  };
}

/** Today as the quoted ISO date the vault format uses. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
