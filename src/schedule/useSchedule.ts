/*
 * TanStack Query hook for the schedule module. All I/O goes through the
 * invoke layer (src/vault/ipc.ts). Lives under the ["docs", ...] key space so
 * the vault:changed watcher event invalidates it along with every doc query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scheduleAdd, scheduleDelete, scheduleList, scheduleUpdate } from "../vault/ipc";
import { eventFrontmatter, scheduleFromEntries, type EventFields } from "./block";

export const SCHEDULE_KEY = ["docs", "schedule"] as const;

/** The weekly routine from schedule.md: placeable blocks + per-block errors. */
export function useSchedule(enabled: boolean) {
  return useQuery({
    queryKey: SCHEDULE_KEY,
    enabled,
    queryFn: async () => scheduleFromEntries(await scheduleList()),
  });
}

/** Appends a new event block to schedule.md. */
export function useAddEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: EventFields) => scheduleAdd(eventFrontmatter(fields)),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULE_KEY }),
  });
}

/** Rewrites the event block at `index` (a ScheduleBlock's index). */
export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ index, fields }: { index: number; fields: EventFields }) =>
      scheduleUpdate(index, eventFrontmatter(fields)),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULE_KEY }),
  });
}

/** Removes the event block at `index` from schedule.md. */
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (index: number) => scheduleDelete(index),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULE_KEY }),
  });
}
