/*
 * One subject's task checklist, shared by the plans detail and the home page:
 * clicking a task toggles its done flag, right-clicking a task or the subject
 * heading opens a confirm-to-delete context menu. Mutations write straight
 * back to the subject file through the usePlans hooks.
 */

import type { ReactNode } from "react";
import { AddRow } from "../components/AddRow";
import { type ContextMenuItem } from "../components/ContextMenu";
import type { Subject } from "./plan";
import {
  useAddSubtask,
  useDeleteSubject,
  useDeleteSubtask,
  useToggleSubtask,
} from "./usePlans";

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

  return (
    <div className="subject">
      <div
        className={headingClassName}
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
        {heading ?? subject.tag}
        {subject.frontmatterError && (
          <span className="warn" title={subject.frontmatterError}>
            {" "}
            ⚠ unreadable — not editable
          </span>
        )}
      </div>
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
      {/* unreadable subjects stay read-only: rewriting their frontmatter
          would destroy whatever the parser choked on */}
      {showAddRow && !subject.frontmatterError && (
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
