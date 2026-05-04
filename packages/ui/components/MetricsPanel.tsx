"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { MetricsSnapshot } from "@devdeck/shared";

function formatBytes(n: number) {
  if (n >= 1 << 30) return `${(n / (1 << 30)).toFixed(2)} GB`;
  if (n >= 1 << 20) return `${(n / (1 << 20)).toFixed(1)} MB`;
  if (n >= 1 << 10) return `${(n / (1 << 10)).toFixed(0)} KB`;
  return `${n} B`;
}

interface MetricsPanelProps {
  metricsByService: Record<string, MetricsSnapshot>;
  cpuHistory: number[];
  memHistory: number[];
  dbQueries: number;
  errors: number;
}

export function MetricsPanel({ metricsByService, cpuHistory, memHistory, dbQueries, errors }: MetricsPanelProps) {
  const { cpu, mem } = useMemo(() => {
    let c = 0;
    let m = 0;
    for (const v of Object.values(metricsByService)) {
      c += v.cpu || 0;
      m += v.memory || 0;
    }
    return { cpu: c, mem: m };
  }, [metricsByService]);

  const cpuColor = cpu >= 80 ? "text-red-400" : cpu >= 50 ? "text-amber-300" : "text-green-400";
  const memColor = mem >= 1.5 * (1 << 30) ? "text-amber-300" : "text-green-400";

  const cpuChartData = cpuHistory.map((v, i) => ({ i, v }));
  const memChartData = memHistory.map((v, i) => ({ i, v: v / (1 << 20) }));

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 border-l border-deck-border bg-deck-panel p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Metrics</h2>
      <div className="rounded border border-deck-border bg-deck-bg p-2">
        <div className="text-xs text-gray-500">CPU (aggregate)</div>
        <div className={`text-2xl font-mono ${cpuColor}`}>{cpu.toFixed(0)}%</div>
        <div className="mt-1 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cpuChartData}>
              <YAxis hide domain={["auto", "auto"]} />
              <Line type="monotone" dataKey="v" stroke="#58a6ff" dot={false} strokeWidth={1} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded bg-gray-800">
          <div className={`h-full ${cpu >= 80 ? "bg-red-500" : cpu >= 50 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, cpu)}%` }} />
        </div>
      </div>
      <div className="rounded border border-deck-border bg-deck-bg p-2">
        <div className="text-xs text-gray-500">Memory (aggregate)</div>
        <div className={`text-xl font-mono ${memColor}`}>{formatBytes(mem)}</div>
        <div className="mt-1 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={memChartData}>
              <YAxis hide domain={["auto", "auto"]} />
              <Line type="monotone" dataKey="v" stroke="#3fb950" dot={false} strokeWidth={1} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded border border-deck-border bg-deck-bg p-2">
        <div className="text-xs text-gray-500">DB queries (60s, pg logs)</div>
        <div className="font-mono text-xl text-blue-300">{dbQueries}</div>
      </div>
      <div className="rounded border border-deck-border bg-deck-bg p-2">
        <div className="text-xs text-gray-500">Errors (60s)</div>
        <div className={`font-mono text-xl ${errors > 0 ? "text-red-400" : "text-gray-400"}`}>{errors}</div>
      </div>
    </div>
  );
}
