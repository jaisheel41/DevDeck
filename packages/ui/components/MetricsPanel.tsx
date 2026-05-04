"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { MetricsSnapshot } from "@jaisheel41/devdeck-shared";

function formatBytes(n: number): string {
  if (n >= 1 << 30) return `${(n / (1 << 30)).toFixed(1)} GB`;
  if (n >= 1 << 20) return `${(n / (1 << 20)).toFixed(0)} MB`;
  if (n >= 1 << 10) return `${(n / (1 << 10)).toFixed(0)} KB`;
  return `${n} B`;
}

const LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-ghost)",
  fontFamily: "-apple-system, sans-serif",
};

const BIG_VALUE: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: "-2px",
  lineHeight: 1,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  marginTop: 4,
};

function MetricSection({
  label,
  value,
  unit,
  color,
  history,
  progress,
  divider = false,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  history: number[];
  progress: number;
  divider?: boolean;
}) {
  const data = history.map((v, i) => ({ i, v }));

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: "10px 12px 8px",
        borderTop: divider ? "2px solid var(--border)" : undefined,
      }}
    >
      <div style={LABEL}>{label}</div>
      <div style={{ ...BIG_VALUE, color }}>
        {value}
        {unit && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: 0,
              color: "var(--text-mid)",
              marginLeft: 3,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Sparkline */}
      {data.length > 1 && (
        <div style={{ flex: 1, minHeight: 32, marginTop: 6 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 3px progress bar */}
      <div
        style={{
          height: 3,
          background: "var(--border)",
          marginTop: 6,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: color,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

interface MetricsPanelProps {
  metricsByService: Record<string, MetricsSnapshot>;
  cpuHistory: number[];
  memHistory: number[];
  dbQueries: number;
  errors: number;
}

export function MetricsPanel({
  metricsByService,
  cpuHistory,
  memHistory,
  dbQueries,
  errors,
}: MetricsPanelProps) {
  const { cpu, mem } = useMemo(() => {
    let c = 0, m = 0;
    for (const v of Object.values(metricsByService)) {
      c += v.cpu || 0;
      m += v.memory || 0;
    }
    return { cpu: c, mem: m };
  }, [metricsByService]);

  /* Flat sparklines for scalar metrics */
  const dbData = useMemo(() => Array(20).fill(dbQueries) as number[], [dbQueries]);
  const errData = useMemo(() => Array(20).fill(errors) as number[], [errors]);

  const memMax = 4096; /* MB ceiling for progress bar */
  const memMB = mem / (1 << 20);

  return (
    <div
      style={{
        width: 186,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: "2px solid var(--border)",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <MetricSection
        label="CPU"
        value={cpu.toFixed(0)}
        unit="%"
        color="var(--accent)"
        history={cpuHistory}
        progress={cpu}
      />
      <MetricSection
        label="Memory"
        value={formatBytes(mem)}
        color="var(--accent)"
        history={memHistory.map((v) => v / (1 << 20))}
        progress={(memMB / memMax) * 100}
        divider
      />
      <MetricSection
        label="DB Queries"
        value={String(dbQueries)}
        color="var(--warn)"
        history={dbData}
        progress={Math.min(100, (dbQueries / 200) * 100)}
        divider
      />
      <MetricSection
        label="Errors"
        value={String(errors)}
        color={errors > 0 ? "var(--error)" : "var(--text-mid)"}
        history={errData}
        progress={Math.min(100, errors * 5)}
        divider
      />
    </div>
  );
}
