/*
 * One subject's task checklist, shared by the plans detail and the home page:
 * clicking a task toggles its done flag, clicking the subject heading
 * minimizes/expands the checklist, right-clicking a task or the subject
 * heading opens a confirm-to-delete context menu. Mutations write straight
 * back to the subject file through the usePlans hooks.
 */

import { useState, type ReactNode } from "react";
import { AddRow } from "../components/AddRow";
import { type ContextMenuItem } from "../components/ContextMenu";
import type { Subject } from "./plan";
import {
  useAddSubtask,
  useDeleteSubject,
  useDeleteSubtask,
  useToggleSubtask,
} from "./usePlans";

/* Minimized subjects stay minimized across pages and app runs: the choice is
   kept per subject file path in localStorage, not in the vault (it's a view
   preference, not study data). */
const MINIMIZED_KEY = "studium.plans.minimizedSubjects";

function loadMinimizedPaths(): Set<string> {
  const raw = localStorage.getItem(MINIMIZED_KEY);
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    const paths = Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string")
      : [];
    return new Set(paths);
  } catch {
    return new Set();
  }
}

function storeMinimized(path: string, minimized: boolean) {
  const paths = loadMinimizedPaths();
  if (minimized) {
    paths.add(path);
  } else {
    paths.delete(path);
  }
  localStorage.setItem(MINIMIZED_KEY, JSON.stringify([...paths]));
}

export function SubjectChecklist({
  subject,
  openMenu,
  heading,
  headingClassName = "section-label",
  showAddRow = true,
}: {
  subject: Subject;
  openMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
  /** Subject-line content; defaults to the subject's tag. */
  heading?: ReactNode;
  headingClassName?: string;
  showAddRow?: boolean;
}) {
  const toggle = useToggleSubtask();
  const addSubtask = useAddSubtask();
  const deleteSubject = useDeleteSubject();
  const deleteSubtask = useDeleteSubtask();
  const [minimized, setMinimized] = useState(
    () => loadMinimizedPaths().has(subject.path),
  );

  const toggleMinimized = () => {
    const next = !minimized;
    storeMinimized(subject.path, next);
    setMinimized(next);
  };

  return (
    <div className="subject">
      <button
        type="button"
        className={`subject-head-toggle ${headingClassName}`}
        aria-expanded={!minimized}
        onClick={toggleMinimized}
        onContextMenu={(e) =>
          openMenu(e, [
            {
              label: "delete subject",
              confirmLabel: "really delete?",
              onSelect: () => deleteSubject.mutate(subject.path),
            },
          ])
        }
      >
        <span>{heading ?? subject.tag}</span>
        {subject.frontmatterError && (
          <span className="warn" title={subject.frontmatterError}>
            {" "}
            ⚠ unreadable — not editable
          </span>
        )}
        <span className="caret">{minimized ? "▸" : "▾"}</span>
      </button>
      {!minimized && (
        <ul className="subtask-list">
          {subject.subtasks.map((t, i) => (
            <li key={t.name} className={t.done ? "is-done" : ""}>
              <button
                className={`subtask${t.done ? " is-done" : ""}`}
                onClick={() => toggle.mutate({ subject, index: i })}
                onContextMenu={(e) =>
                  openMenu(e, [
                    {
                      label: "delete task",
                      confirmLabel: "really delete?",
                      onSelect: () => deleteSubtask.mutate({ subject, index: i }),
                    },
                  ])
                }
              >
                <span className="box">{t.done ? "☑" : "☐"}</span>{" "}
                <span className="label">{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* unreadable subjects stay read-only: rewriting their frontmatter
          would destroy whatever the parser choked on */}
      {!minimized && showAddRow && !subject.frontmatterError && (
        <AddRow
          label="+ new task"
          placeholder="task name..."
          inputLabel={`new task in ${subject.tag}`}
          onSubmit={(name, close) =>
            addSubtask.mutate({ subject, name }, { onSuccess: close })
          }
        />
      )}
    </div>
  );
}
