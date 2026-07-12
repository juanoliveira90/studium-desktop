import type { ReactElement } from "react";
import { HomePage } from "./HomePage";
import { NotesPage } from "./NotesPage";
import { PlansPage } from "./PlansPage";
import { SchedulePage } from "./SchedulePage";
import { HomeIcon, NotesIcon, PlansIcon, ScheduleIcon } from "../components/icons";

export type PageId = "home" | "notes" | "plans" | "schedule";

export interface PageDef {
  id: PageId;
  title: string;
  combo: string;
  Component: () => ReactElement;
  /** Decorative icon shown next to the title in the top bar. */
  Icon: () => ReactElement;
}

export const PAGES: PageDef[] = [
  { id: "home", title: "home", combo: "alt+1", Component: HomePage, Icon: HomeIcon },
  { id: "notes", title: "notes", combo: "alt+2", Component: NotesPage, Icon: NotesIcon },
  { id: "plans", title: "study plan", combo: "alt+3", Component: PlansPage, Icon: PlansIcon },
  {
    id: "schedule",
    title: "weekly routine",
    combo: "alt+4",
    Component: SchedulePage,
    Icon: ScheduleIcon,
  },
];
