"use client";

import type { Service } from "@devdeck/shared";

export function TopBar({
  project,
  connected,
  services,
}: {
  project: string;
  connected: boolean;
  services: Service[];
}) {
  const running = services.filter((s) => s.status === "running").length;

  return (
    <header
      style={{
        height: 50,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        borderBottom: "2px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      {/* Wordmark */}
      <span
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 15,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "#fff",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        Dev<span style={{ color: "var(--accent)" }}>Deck</span>
      </span>

      {/* Project pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 9px",
          border: "1px solid var(--border)",
          borderRadius: 3,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <rect x="0.5" y="2.5" width="8" height="6" rx="1" stroke="var(--text-ghost)" strokeWidth="1.2" />
          <path d="M3 2.5V2a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v.5" stroke="var(--text-ghost)" strokeWidth="1.2" />
        </svg>
        <span
          style={{
            fontFamily: "-apple-system, sans-serif",
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          {project}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Running count */}
      <span
        style={{
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: 11,
          color: "var(--text-mid)",
        }}
      >
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>{running}</span>
        <span style={{ color: "var(--text-ghost)" }}>/{services.length}</span>
        <span style={{ color: "var(--text-ghost)", marginLeft: 4 }}>running</span>
      </span>

      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span
          className={connected ? "animate-blink" : undefined}
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: connected ? "var(--accent)" : "var(--error)",
            boxShadow: connected ? "0 0 10px var(--accent)" : "none",
          }}
        />
        <span
          style={{
            fontFamily: "-apple-system, sans-serif",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--text-ghost)",
          }}
        >
          {connected ? "Live" : "Offline"}
        </span>
      </div>
    </header>
  );
}
