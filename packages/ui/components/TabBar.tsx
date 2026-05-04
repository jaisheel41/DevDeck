"use client";

import { useState } from "react";

export type Tab = "logs" | "env" | "db";

const TABS: { id: Tab; label: string }[] = [
  { id: "logs", label: "Logs" },
  { id: "env", label: "Env Vars" },
  { id: "db", label: "Database" },
];

function TabBtn({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: "100%",
        padding: "0 18px",
        border: "none",
        borderRadius: 0,
        cursor: "pointer",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        /* Full inversion for active tab */
        background: isActive ? "var(--accent)" : hov ? "var(--surface)" : "transparent",
        color: isActive ? "var(--bg)" : hov ? "#aaa" : "var(--text-ghost)",
        transition: "background 0.12s ease, color 0.12s ease",
      }}
    >
      {label}
    </button>
  );
}

export function TabBar({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div
      style={{
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      {TABS.map((t) => (
        <TabBtn
          key={t.id}
          label={t.label}
          isActive={tab === t.id}
          onClick={() => onChange(t.id)}
        />
      ))}
    </div>
  );
}
