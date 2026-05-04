"use client";

import { useState } from "react";
import type { QuickCommand } from "@jaisheel1/devdeck-shared";

function CommandPill({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0,
        padding: "2px 10px",
        background: "transparent",
        border: `1px solid ${hov ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 3,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 11,
        color: hov ? "var(--accent)" : "#777",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "border-color 0.15s ease, color 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

export function BottomBar({
  commands,
  onRun,
}: {
  commands: QuickCommand[];
  onRun: (qc: QuickCommand) => void;
}) {
  const [addHov, setAddHov] = useState(false);

  return (
    <footer
      style={{
        height: 42,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        borderTop: "2px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      {/* Terminal chevron glyph */}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M1.5 3.5L4.5 5.5L1.5 7.5M5.5 7.5H8.5"
          stroke="var(--text-ghost)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Command pills */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflow: "hidden",
        }}
      >
        {commands.slice(0, 6).map((qc) => (
          <CommandPill
            key={qc.label + qc.command}
            label={qc.label}
            onClick={() => onRun(qc)}
          />
        ))}
        {commands.length === 0 && (
          <span
            style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: 10,
              color: "var(--text-ghost)",
            }}
          >
            no quick commands — add them to devdeck.config.ts
          </span>
        )}
      </div>

      {/* Add Service — solid accent fill, full inversion */}
      <button
        type="button"
        onMouseEnter={() => setAddHov(true)}
        onMouseLeave={() => setAddHov(false)}
        style={{
          flexShrink: 0,
          padding: "5px 14px",
          background: addHov ? "#00dd70" : "var(--accent)",
          border: "none",
          borderRadius: 3,
          fontFamily: "-apple-system, sans-serif",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--bg)",
          cursor: "pointer",
          transition: "background 0.12s ease",
        }}
      >
        + Add Service
      </button>
    </footer>
  );
}
