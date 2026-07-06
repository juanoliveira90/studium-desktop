import { Page } from "../components/Page";

const TABS = ["active", "upcoming", "archive"];

const PLANS = [
  { name: "finals preparation", range: "May 6 — Jun 2", pct: 62, color: 1 },
  { name: "web development", range: "Apr 15 — May 31", pct: 40, color: 2 },
  { name: "machine learning", range: "May 1 — Jun 30", pct: 25, color: 4 },
];

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
        {PLANS.map((p) => (
          <li key={p.name}>
            <div className="plan-head">
              <span
                className="dot"
                style={{ color: `var(--block-${p.color})` }}
              >
                ●
              </span>
              <span className="name">{p.name}</span>
            </div>
            <div className="plan-range">{p.range}</div>
            <div className="plan-progress">
              <div className="track">
                <div className="fill" style={{ width: `${p.pct}%` }} />
              </div>
              <span className="pct">{p.pct}%</span>
            </div>
          </li>
        ))}
      </ul>
      <button className="add-row">+ new plan</button>
    </Page>
  );
}
