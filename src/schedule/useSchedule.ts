/*
 * TanStack Query hook for the schedule module. All I/O goes through the
 * invoke layer (src/vault/ipc.ts). Lives under the ["docs", ...] key space so
 * the vault:changed watcher event invalidates it along with every doc query.
 */

import { useQuery } from "@tanstack/react-query";
import { scheduleList } from "../vault/ipc";
import { scheduleFromEntries } from "./block";

export const SCHEDULE_KEY = ["docs", "schedule"] as const;

/** The weekly routine from schedule.md: placeable blocks + per-block errors. */
export function useSchedule(enabled: boolean) {
  return useQuery({
    queryKey: SCHEDULE_KEY,
    enabled,
    queryFn: async () => scheduleFromEntries(await scheduleList()),
  });
}
