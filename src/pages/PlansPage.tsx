import { useEffect, useState } from "react";
import { Page } from "../components/Page";
import { type ContextMenuItem } from "../components/ContextMenu";
import { useContextMenu } from "../components/useContextMenu";
import {
  planProgress,
  type Plan,
  type Subject,
} from "../plans/plan";
import {
  useAddSubtask,
  useCreatePlan,
  useCreateSubject,
  useDeletePlan,
  useDeleteSubject,
  useDeleteSubtask,
  usePlans,
  useToggleSubtask,
} from "../plans/usePlans";
import { planColorBySlug } from "../schedule/block";
import { useSchedule } from "../schedule/useSchedule";
import { useVault } from "../vault/useVault";
import { VaultGate } from "../vault/VaultGate";

export function PlansPage() {
  const vault = useVault();
  const enabled = Boolean(vault.data);
  const plansQuery = usePlans(enabled);
  // the schedule links blocks to plans; its colors carry over to the dots
  const schedule = useSchedule(enabled);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  let body;
  if (vault.isPending) {
    body = <p className="muted">opening vault…</p>;
  } else if (!vault.data) {
    body = <VaultGate loadError={vault.error} />;
  } else if (plansQuery.isPending) {
    body = <p className="muted">loading plans…</p>;
  } else if (plansQuery.isError) {
    body = <p className="error">failed to load plans: {String(plansQuery.error)}</p>;
  } else {
    const { plans, errors } = plansQuery.data;
    const colors = planColorBySlug(schedule.data?.blocks ?? []);
    const openPlan = openSlug ? plans.find((p) => p.slug === openSlug) : undefined;
    body = openPlan ? (
      <PlanDetail
        plan={openPlan}
        color={colors.get(openPlan.slug)}
        onBack={() => setOpenSlug(null)}
      />
    ) : (
      <PlanList
        plans={plans}
        errors={errors}
        colors={colors}
        onOpen={setOpenSlug}
      />
    );
  }

  return (
    <Page title="study plan">
      {body}
    </Page>
  );
}

/**
 * The "+ new <thing>" row used at every level (plan, subject, task): a button
 * that swaps to a text input. Enter hands the trimmed name to onSubmit along
 * with a close callback (called on mutation success, so the row stays open on
 * failure); escape cancels without bubbling to page-level escape handlers.
 */
function AddRow({
  label,
  placeholder,
  inputLabel,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  inputLabel: string;
  onSubmit: (name: string, close: () => void) => void;
}) {
  const [value, setValue] = useState<string | null>(null);

  if (value === null) {
    return (
      <button className="add-row" onClick={() => setValue("")}>
        {label}
      </button>
    );
  }

  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onSubmit(name, () => setValue(null));
  };

  return (
    <input
      className="note-search add-row"
      type="text"
      placeholder={placeholder}
      aria-label={inputLabel}
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          e.stopPropagation();
          setValue(null);
        }
      }}
    />
  );
}

/** Plan rows with progress; the reference-image half of the page. */
function PlanList({
  plans,
  errors,
  colors,
  onOpen,
}: {
  plans: Plan[];
  errors: string[];
  colors: Map<string, number>;
  onOpen: (slug: string) => void;
}) {
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();
  const { menu, open: openMenu } = useContextMenu();

  return (
    <>
      <ul className="plan-list">
        {plans.map((p) => {
          const pct = planProgress(p);
          const color = colors.get(p.slug);
          return (
            <li key={p.slug}>
              <button
                className="plan-head"
                onClick={() => onOpen(p.slug)}
                onContextMenu={(e) =>
                  openMenu(e, [
                    {
                      label: "delete plan",
                      confirmLabel: "really delete?",
                      onSelect: () => deletePlan.mutate(p.slug),
                    },
                  ])
                }
              >
                <span
                  className="dot"
                  style={color !== undefined ? { color: `var(--block-${color})` } : undefined}
                >
                  ●
                </span>
                <span className="name">{p.name}</span>
                {p.frontmatterError && (
                  <span className="warn" title={p.frontmatterError}>
                    ⚠
                  </span>
                )}
              </button>
              <div className="plan-progress">
                <div className="track">
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="pct">{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
      {plans.length === 0 && <p className="muted">no plans yet</p>}
      <AddRow
        label="+ new plan"
        placeholder="plan name..."
        inputLabel="new plan name"
        onSubmit={(name, close) => createPlan.mutate(name, { onSuccess: close })}
      />
      {errors.length > 0 && (
        <p className="warn">
          ⚠ {errors.length} file{errors.length === 1 ? "" : "s"} under plans/
          couldn&apos;t be read: {errors.join("; ")}
        </p>
      )}
      {menu}
    </>
  );
}

/**
 * The open-plan view: subjects with their subtask checklists. Toggles write
 * straight back to the subject file; subjects whose frontmatter failed to
 * parse are shown read-only (rewriting their frontmatter would destroy
 * whatever the parser choked on).
 */
function PlanDetail({
  plan,
  color,
  onBack,
}: {
  plan: Plan;
  color: number | undefined;
  onBack: () => void;
}) {
  const toggle = useToggleSubtask();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const deleteSubtask = useDeleteSubtask();
  const { menu, open: openMenu } = useContextMenu();

  // window-level so escape works without any element focused
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  return (
    <div className="plan-detail">
      <div className="plan-head">
        <span
          className="dot"
          style={color !== undefined ? { color: `var(--block-${color})` } : undefined}
        >
          ●
        </span>
        <span className="name">{plan.name}</span>
        {plan.frontmatterError && (
          <span className="warn" title={plan.frontmatterError}>
            ⚠
          </span>
        )}
        <span className="hint">esc to close</span>
      </div>
      {plan.subjects.map((s) => (
        <SubjectChecklist
          key={s.path}
          subject={s}
          onToggle={toggle.mutate}
          openMenu={openMenu}
          onDeleteSubject={(subject) => deleteSubject.mutate(subject.path)}
          onDeleteSubtask={deleteSubtask.mutate}
        />
      ))}
      {plan.subjects.length === 0 && <p className="muted">no subjects yet</p>}
      <AddRow
        label="+ new subject"
        placeholder="subject name..."
        inputLabel="new subject name"
        onSubmit={(tag, close) =>
          createSubject.mutate({ planSlug: plan.slug, tag }, { onSuccess: close })
        }
      />
      {menu}
    </div>
  );
}

function SubjectChecklist({
  subject,
  onToggle,
  openMenu,
  onDeleteSubject,
  onDeleteSubtask,
}: {
  subject: Subject;
  onToggle: (args: { subject: Subject; index: number }) => void;
  openMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
  onDeleteSubject: (subject: Subject) => void;
  onDeleteSubtask: (args: { subject: Subject; index: number }) => void;
}) {
  const addSubtask = useAddSubtask();

  return (
    <div className="subject">
      <div
        className="section-label"
        onContextMenu={(e) =>
          openMenu(e, [
            {
              label: "delete subject",
              confirmLabel: "really delete?",
              onSelect: () => onDeleteSubject(subject),
            },
          ])
        }
      >
        {subject.tag}
        {subject.frontmatterError && (
          <span className="warn" title={subject.frontmatterError}>
            {" "}
            ⚠ unreadable — not editable
          </span>
        )}
      </div>
      <ul className="subtask-list">
        {subject.subtasks.map((t, i) => (
          <li key={t.name}>
            <button
              className={`subtask${t.done ? " is-done" : ""}`}
              onClick={() => onToggle({ subject, index: i })}
              onContextMenu={(e) =>
                openMenu(e, [
                  {
                    label: "delete task",
                    confirmLabel: "really delete?",
                    onSelect: () => onDeleteSubtask({ subject, index: i }),
                  },
                ])
              }
            >
              {t.done ? "☑" : "☐"} {t.name}
            </button>
          </li>
        ))}
      </ul>
      {/* unreadable subjects stay read-only: rewriting their frontmatter
          would destroy whatever the parser choked on */}
      {!subject.frontmatterError && (
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
