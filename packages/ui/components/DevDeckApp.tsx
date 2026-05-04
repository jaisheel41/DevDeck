"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { QuickCommand, QuickLink } from "@devdeck/shared";
import { useDaemon, useRollingLogStats } from "../hooks/useDaemon";
import { BottomBar } from "./BottomBar";
import { DbPanel } from "./DbPanel";
import { EnvVarsPanel } from "./EnvVarsPanel";
import { LogPanel } from "./LogPanel";
import { MetricsPanel } from "./MetricsPanel";
import { Sidebar } from "./Sidebar";
import { TabBar, type Tab } from "./TabBar";
import { TopBar } from "./TopBar";

export function DevDeckApp() {
  const { state, base, start, stop, restart } = useDaemon();
  const [tab, setTab] = useState<Tab>("logs");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);

  const loadUiConfig = useCallback(async () => {
    try {
      const r = await fetch(`${base}/api/ui-config`);
      const j = (await r.json()) as {
        project?: string;
        quickLinks?: QuickLink[];
        quickCommands?: QuickCommand[];
      };
      if (j.quickLinks) setQuickLinks(j.quickLinks);
      if (j.quickCommands) setQuickCommands(j.quickCommands);
    } catch {
      /* daemon not running yet */
    }
  }, [base]);

  useEffect(() => { void loadUiConfig(); }, [loadUiConfig, state.connected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const serviceColors = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of state.services) {
      if (s.color) m[s.id] = s.color;
    }
    return m;
  }, [state.services]);

  const rolling = useRollingLogStats(state.logs, selectedId);

  const runQuick = async (qc: QuickCommand) => {
    await fetch(`${base}/api/quick-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: qc.label, command: qc.command }),
    });
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text-bright)",
        overflow: "hidden",
      }}
    >
      {/* ① Top bar — 50px */}
      <TopBar
        project={state.project}
        connected={state.connected}
        services={state.services}
      />

      {/* ②③④ Body */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* ② Sidebar — 180px */}
        <Sidebar
          services={state.services}
          quickLinks={quickLinks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onStart={start}
          onStop={stop}
          onRestart={restart}
        />

        {/* ③ Centre panel */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TabBar tab={tab} onChange={setTab} />

          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            {tab === "logs" && (
              <LogPanel
                logs={state.logs}
                selectedServiceId={selectedId}
                serviceColors={serviceColors}
              />
            )}
            {tab === "env" && (
              <EnvVarsPanel base={base} serviceId={selectedId} />
            )}
            {tab === "db" && (
              <DbPanel base={base} serviceId={selectedId} />
            )}

            {/* ④ Metrics panel — 186px, always visible */}
            <MetricsPanel
              metricsByService={state.metricsByService}
              cpuHistory={state.cpuHistory}
              memHistory={state.memHistory}
              dbQueries={rolling.dbQueries}
              errors={rolling.errors}
            />
          </div>
        </main>
      </div>

      {/* ⑤ Bottom bar — 42px */}
      <BottomBar commands={quickCommands} onRun={runQuick} />
    </div>
  );
}
