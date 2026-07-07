import type { ReactElement } from "react";
import { HomePage } from "./HomePage";
import { NotesPage } from "./NotesPage";
import { PlansPage } from "./PlansPage";
import { SchedulePage } from "./SchedulePage";

export type PageId = "home" | "notes" | "plans" | "schedule";

export interface PageDef {
  id: PageId;
  title: string;
  combo: string;
  Component: () => ReactElement;
}

export const PAGES: PageDef[] = [
  { id: "home", title: "home", combo: "alt+1", Component: HomePage },
  { id: "notes", title: "notes", combo: "alt+2", Component: NotesPage },
  { id: "plans", title: "study plan", combo: "alt+3", Component: PlansPage },
  { id: "schedule", title: "weekly routine", combo: "alt+4", Component: SchedulePage },
];
