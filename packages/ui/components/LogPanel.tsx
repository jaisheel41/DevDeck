"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LogLevel, LogLine } from "@jaisheel1/devdeck-shared";

// ── Syntax highlighting ───────────────────────────────────────────────────────

function highlightBody(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|\b(\d{3})\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(token)) {
      parts.push(
        <span key={m.index} style={{ color: "var(--accent)", fontWeight: 800 }}>
          {token}
        </span>,
      );
    } else {
      const code = Number(token);
      const color =
        code >= 500
          ? "var(--error)"
          : code >= 400
            ? "var(--warn)"
            : code >= 200 && code < 300
              ? "var(--accent)"
              : "var(--text-mid)";
      parts.push(
        <span key={m.index} style={{ color }}>
          {token}
        </span>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function bodyColor(level: LogLevel): string {
  if (level === "error") return "var(--error)";
  if (level === "warn") return "var(--warn)";
  if (level === "info") return "var(--accent)";
  return "var(--text-mid)";
}

// ── Level pills ───────────────────────────────────────────────────────────────

export type LevelFilter = "all" | "errors" | "warnings";

const PILLS: { id: LevelFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "errors", label: "Err" },
  { id: "warnings", label: "Warn" },
];

// ── LogPanel ──────────────────────────────────────────────────────────────────

interface LogPanelProps {
  logs: LogLine[];
  selectedServiceId: string | null;
  serviceColors: Record<string, string>;
}

export function LogPanel({ logs, selectedServiceId }: LogPanelProps) {
  const [filter, setFilter] = useState("");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [paused, setPaused] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return logs.filter((l) => {
      if (selectedServiceId && l.serviceId !== selectedServiceId) return false;
      if (level === "errors" && l.level !== "error") return false;
      if (level === "warnings" && l.level !== "warn") return false;
      if (f && !l.text.toLowerCase().includes(f)) return false;
      return true;
    });
  }, [logs, filter, level, selectedServiceId]);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!paused) scrollToBottom();
  }, [visible, paused, scrollToBottom]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (!nearBottom && !paused) setPaused(true);
    if (nearBottom && paused) setPaused(false);
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Filter + level bar */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter logs…"
          style={{
            flex: 1,
            minWidth: 100,
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 3,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: 10,
            color: "var(--text-mid)",
            outline: "none",
          }}
        />

        <span
          style={{
            fontFamily: "'SF Mono', monospace",
            fontSize: 10,
            color: "var(--text-ghost)",
            flexShrink: 0,
          }}
        >
          {visible.length}
        </span>

        <div style={{ display: "flex", gap: 4 }}>
          {PILLS.map((pill) => {
            const active = level === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setLevel(pill.id)}
                style={{
                  padding: "2px 9px",
                  background: active ? "var(--accent)" : "transparent",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 3,
                  fontFamily: "-apple-system, sans-serif",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "var(--bg)" : "var(--text-ghost)",
                  cursor: "pointer",
                  transition: "all 0.1s ease",
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {paused && (
          <button
            type="button"
            onClick={() => {
              setPaused(false);
              requestAnimationFrame(scrollToBottom);
            }}
            style={{
              flexShrink: 0,
              padding: "2px 9px",
              background: "transparent",
              border: "1px solid var(--accent)",
              borderRadius: 3,
              fontFamily: "'SF Mono', monospace",
              fontSize: 10,
              color: "var(--accent)",
              cursor: "pointer",
            }}
          >
            ↓ Resume
          </button>
        )}
      </div>

      {/* Log feed */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "6px 10px",
        }}
      >
        {visible.map((l) => {
          const ts = new Date(l.ts).toLocaleTimeString("en", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const color = bodyColor(l.level);
          return (
            <div
              key={l.id}
              className="animate-log-in"
              style={{
                display: "flex",
                gap: 8,
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: 10,
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <span style={{ color: "var(--text-ghost)", flexShrink: 0 }}>
                {ts}
              </span>
              <span
                style={{
                  color: "var(--accent)",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                [{l.serviceName}]
              </span>
              <span style={{ color }}>
                {l.level === "error" || l.level === "warn"
                  ? l.text
                  : highlightBody(l.text)}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
