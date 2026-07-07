import { useEffect, useState } from "react";
import { Page } from "../components/Page";
import { formatDateRange, formatShortDate } from "../data/mock";
import { todayISO } from "../notes/note";
import {
  PLAN_TABS,
  planProgress,
  planStatus,
  type Plan,
  type PlanStatus,
  type Subject,
} from "../plans/plan";
import { useCreatePlan, usePlans, useToggleSubtask } from "../plans/usePlans";
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
    <Page title="study plan" hint="alt+3">
      {body}
    </Page>
  );
}

function rangeLabel(plan: Plan): string {
  if (plan.start !== undefined && plan.end !== undefined) {
    return formatDateRange(plan.start, plan.end);
  }
  if (plan.start !== undefined) return `${formatShortDate(plan.start)} —`;
  return "";
}

/** Status tabs + plan rows with progress; the reference-image half of the page. */
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
  const [tab, setTab] = useState<PlanStatus>("active");
  const [addingName, setAddingName] = useState<string | null>(null);
  const createPlan = useCreatePlan();

  const today = todayISO();
  const shown = plans.filter((p) => planStatus(p, today) === tab);

  const submitNewPlan = () => {
    const name = addingName?.trim();
    if (!name) return;
    createPlan.mutate(name, {
      onSuccess: () => setAddingName(null),
    });
  };

  return (
    <>
      <div className="tabs" role="tablist">
        {PLAN_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tab}
            className={`tab${t === tab ? " is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="plan-list">
        {shown.map((p) => {
          const pct = planProgress(p);
          const color = colors.get(p.slug);
          return (
            <li key={p.slug}>
              <button className="plan-head" onClick={() => onOpen(p.slug)}>
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
              <div className="plan-range">{rangeLabel(p)}</div>
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
      {shown.length === 0 && <p className="muted">no {tab} plans</p>}
      {addingName === null ? (
        <button className="add-row" onClick={() => setAddingName("")}>
          + new plan
        </button>
      ) : (
        <input
          className="note-search add-row"
          type="text"
          placeholder="plan name..."
          aria-label="new plan name"
          autoFocus
          value={addingName}
          onChange={(e) => setAddingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNewPlan();
            if (e.key === "Escape") {
              e.stopPropagation();
              setAddingName(null);
            }
          }}
        />
      )}
      {errors.length > 0 && (
        <p className="warn">
          ⚠ {errors.length} file{errors.length === 1 ? "" : "s"} under plans/
          couldn&apos;t be read: {errors.join("; ")}
        </p>
      )}
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
      <div className="plan-range">{rangeLabel(plan)}</div>
      {plan.subjects.map((s) => (
        <SubjectChecklist key={s.path} subject={s} onToggle={toggle.mutate} />
      ))}
      {plan.subjects.length === 0 && <p className="muted">no subjects yet</p>}
    </div>
  );
}

function SubjectChecklist({
  subject,
  onToggle,
}: {
  subject: Subject;
  onToggle: (args: { subject: Subject; index: number }) => void;
}) {
  return (
    <div className="subject">
      <div className="section-label">
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
            >
              {t.done ? "☑" : "☐"} {t.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
