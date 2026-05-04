"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LogLevel, LogLine } from "@devdeck/shared";

function highlightLine(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re =
    /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|\b(\d{3})\b|(\d{4}-\d{2}-\d{2}T[\d:.-]+Z?|\d{2}:\d{2}:\d{2}\.\d{3})/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const full = m[0];
    if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i.test(full)) {
      parts.push(
        <span key={`${m.index}-m`} className="text-blue-400">
          {full}
        </span>,
      );
    } else if (/^\d{3}$/.test(full)) {
      const code = Number(full);
      const cls =
        code >= 500 ? "text-red-400" : code >= 400 ? "text-amber-400" : code >= 200 && code < 300 ? "text-green-400" : "text-gray-400";
      parts.push(
        <span key={`${m.index}-c`} className={cls}>
          {full}
        </span>,
      );
    } else {
      parts.push(
        <span key={`${m.index}-t`} className="text-gray-500">
          {full}
        </span>,
      );
    }
    last = m.index + full.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function levelColor(level: LogLevel) {
  if (level === "error") return "text-red-400";
  if (level === "warn") return "text-amber-300";
  return "text-gray-300";
}

export type LevelFilter = "all" | "errors" | "warnings";

interface LogPanelProps {
  logs: LogLine[];
  selectedServiceId: string | null;
  serviceColors: Record<string, string>;
}

export function LogPanel({ logs, selectedServiceId, serviceColors }: LogPanelProps) {
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
    <div className="flex min-h-0 flex-1 flex-col rounded border border-deck-border bg-deck-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-deck-border p-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter logs…"
          className="min-w-[12rem] flex-1 rounded border border-deck-border bg-deck-bg px-2 py-1 font-mono text-xs text-gray-200 outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="font-mono text-xs text-gray-500">{visible.length} lines</span>
        <div className="flex gap-1">
          {(["all", "errors", "warnings"] as const).map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setLevel(pill)}
              className={`rounded px-2 py-0.5 font-mono text-xs ${
                level === pill ? "bg-blue-600 text-white" : "bg-deck-bg text-gray-400 hover:bg-gray-800"
              }`}
            >
              {pill === "all" ? "All" : pill === "errors" ? "Errors" : "Warnings"}
            </button>
          ))}
        </div>
        {paused && (
          <button
            type="button"
            onClick={() => {
              setPaused(false);
              requestAnimationFrame(scrollToBottom);
            }}
            className="rounded bg-blue-700 px-2 py-0.5 font-mono text-xs text-white"
          >
            ↓ Resume
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-auto p-2 font-mono text-xs leading-relaxed"
      >
        {visible.map((l) => (
          <div key={l.id} className={`whitespace-pre-wrap break-all ${levelColor(l.level)}`}>
            <span className="text-gray-500">[{new Date(l.ts).toLocaleTimeString()}]</span>{" "}
            <span style={{ color: serviceColors[l.serviceId] ?? "#58a6ff" }}>[{l.serviceName}]</span>{" "}
            {highlightLine(l.text)}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
