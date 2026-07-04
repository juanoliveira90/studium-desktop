import { useEffect, useState } from "react";

const WORKSPACES = ["1", "2", "3", "4", "5"];

function formatClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function TopBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <nav className="topbar-ws" aria-label="workspaces">
        {WORKSPACES.map((ws) => (
          <span
            key={ws}
            className={`topbar-ws-item${ws === "1" ? " is-active" : ""}`}
          >
            {ws}
          </span>
        ))}
      </nav>
      <div className="topbar-app">
        <span className="logo">◫</span>
        <span>studium</span>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-status">
        <span className="clock">🕓 {formatClock(now)}</span>
      </div>
    </header>
  );
}
