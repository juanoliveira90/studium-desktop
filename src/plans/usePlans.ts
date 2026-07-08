/*
 * TanStack Query hooks for the plans module. All I/O goes through the invoke
 * layer (src/vault/ipc.ts): the whole plans/ tree is read with doc_list +
 * doc_read and assembled by the domain model. Everything lives under the
 * ["docs", ...] key space so the vault:changed watcher event invalidates it
 * along with every doc query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { docDelete, docList, docRead, docWrite } from "../vault/ipc";
import { todayISO } from "../notes/note";
import {
  addSubtaskFrontmatter,
  newPlanDoc,
  newSubjectDoc,
  plansFromDocs,
  removeSubtaskFrontmatter,
  toggleSubtaskFrontmatter,
  type Subject,
} from "./plan";

export const PLANS_KEY = ["docs", "plans"] as const;

/** Every plan in the vault's plans/ tree, slug order. */
export function usePlans(enabled: boolean) {
  return useQuery({
    queryKey: PLANS_KEY,
    enabled,
    queryFn: async () => {
      const paths = await docList("plans");
      const docs = await Promise.all(paths.map((p) => docRead(p)));
      return plansFromDocs(docs);
    },
  });
}

/** Creates plans/<slug>/plan.md starting today; resolves to its path. */
export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { path, frontmatter, body } = newPlanDoc(name, todayISO());
      await docWrite(path, frontmatter, body);
      return path;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** Creates plans/<slug>/subjects/<tag>.md with an empty subtask list. */
export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planSlug, tag }: { planSlug: string; tag: string }) => {
      const { path, frontmatter, body } = newSubjectDoc(planSlug, tag);
      await docWrite(path, frontmatter, body);
      return path;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** Appends an undone subtask to its subject file, preserving the body. */
export function useAddSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, name }: { subject: Subject; name: string }) =>
      docWrite(subject.path, addSubtaskFrontmatter(subject, name), subject.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** Flips one subtask's done flag in its subject file, preserving the body. */
export function useToggleSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, index }: { subject: Subject; index: number }) =>
      docWrite(subject.path, toggleSubtaskFrontmatter(subject, index), subject.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** Deletes a whole plan directory (plans/<slug>/) from the vault. */
export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => docDelete(`plans/${slug}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** Deletes a subject file from its plan. */
export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => docDelete(path),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}

/** Removes one subtask from its subject file, preserving the body. */
export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, index }: { subject: Subject; index: number }) =>
      docWrite(subject.path, removeSubtaskFrontmatter(subject, index), subject.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANS_KEY }),
  });
}
