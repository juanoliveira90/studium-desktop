import { Page } from "../components/Page";
import {
  formatDateRange,
  PLANS,
  planColorIndex,
  planProgress,
} from "../data/mock";

const TABS = ["active", "upcoming", "archive"];

export function PlansPage() {
  return (
    <Page title="study plan" hint="alt+3">
      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={tab === "active"}
            className={`tab${tab === "active" ? " is-active" : ""}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <ul className="plan-list">
        {PLANS.map((p) => {
          const pct = planProgress(p);
          return (
            <li key={p.slug}>
              <div className="plan-head">
                <span
                  className="dot"
                  style={{ color: `var(--block-${planColorIndex(p.slug)})` }}
                >
                  ●
                </span>
                <span className="name">{p.name}</span>
              </div>
              <div className="plan-range">{formatDateRange(p.start, p.end)}</div>
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
      <button className="add-row">+ new plan</button>
    </Page>
  );
}
