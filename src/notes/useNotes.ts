/*
 * TanStack Query hooks for the notes module. All I/O goes through the invoke
 * layer (src/vault/ipc.ts); components only see Note values and mutations.
 * Everything lives under the ["docs", ...] key space so the vault:changed
 * watcher event can invalidate every doc query at once.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { docList, docRead, docWrite } from "../vault/ipc";
import { newNoteDoc, noteFromDoc, sortNotes, todayISO, type Note } from "./note";

export const NOTES_KEY = ["docs", "notes"] as const;

/** Every note in the vault's notes/ directory, newest first. */
export function useNotes(enabled: boolean) {
  return useQuery({
    queryKey: NOTES_KEY,
    enabled,
    queryFn: async () => {
      const paths = await docList("notes");
      const docs = await Promise.all(paths.map((p) => docRead(p)));
      return sortNotes(docs.map(noteFromDoc));
    },
  });
}

/** Writes a note body back, bumping `updated` and preserving frontmatter. */
export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ note, body }: { note: Note; body: string }) =>
      docWrite(note.path, { ...note.frontmatter, updated: todayISO() }, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}

/** Creates notes/<slug>.md with fresh frontmatter; resolves to its path. */
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const { path, frontmatter, body } = newNoteDoc(title, todayISO());
      await docWrite(path, frontmatter, body);
      return path;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}
