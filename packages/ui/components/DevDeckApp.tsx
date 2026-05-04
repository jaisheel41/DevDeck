"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { QuickCommand, QuickLink, Service, ServiceStatus } from "@devdeck/shared";
import { useDaemon, useRollingLogStats } from "../hooks/useDaemon";
import { DbPanel } from "./DbPanel";
import { EnvVarsPanel } from "./EnvVarsPanel";
import { LogPanel } from "./LogPanel";
import { MetricsPanel } from "./MetricsPanel";

type Tab = "logs" | "env" | "db";

// ── Primitives ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ServiceStatus }) {
  const color =
    status === "running" ? "#3fb950"
    : status === "starting" ? "#d29922"
    : status === "error" ? "#f85149"
    : "#484f58";

  const pulse =
    status === "starting" ? "animate-pulse-ring"
    : status === "running" ? "animate-pulse-ring-subtle"
    : null;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: 13, height: 13 }}
    >
      {pulse && (
        <span
          className={`absolute inset-0 rounded-full ${pulse}`}
          style={{ background: color }}
        />
      )}
      <span
        className="relative block shrink-0 rounded-full"
        style={{ width: 7, height: 7, background: color }}
      />
    </span>
  );
}

function IconBtn({
  title,
  accentColor,
  onClick,
  children,
}: {
  title: string;
  accentColor: string;
  onClick: (e: React.MouseEvent) => void;
  children: ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center justify-center rounded transition-all duration-100"
      style={{
        width: 20,
        height: 20,
        border: `1px solid ${hov ? `${accentColor}55` : "transparent"}`,
        background: hov ? `${accentColor}18` : "transparent",
        color: hov ? accentColor : "#484f58",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────

function TopBar({
  project,
  connected,
  services,
}: {
  project: string;
  connected: boolean;
  services: Service[];
}) {
  const running = services.filter((s) => s.status === "running").length;
  const hasError = services.some((s) => s.status === "error");
  const allRunning = services.length > 0 && running === services.length;
  const statusColor = hasError
    ? "#f85149"
    : allRunning
      ? "#3fb950"
      : running > 0
        ? "#d29922"
        : "#484f58";

  const [settingsHov, setSettingsHov] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-deck-border bg-deck-panel px-4">
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded"
          style={{
            width: 26,
            height: 26,
            background: "linear-gradient(135deg, #58a6ff1f 0%, #bc8cff1f 100%)",
            border: "1px solid #58a6ff2e",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="#58a6ff" fillOpacity={0.92} />
            <rect x="7.5" y="1" width="5.5" height="5.5" rx="1.2" fill="#bc8cff" fillOpacity={0.72} />
            <rect x="1" y="7.5" width="5.5" height="5.5" rx="1.2" fill="#58a6ff" fillOpacity={0.46} />
            <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.2" fill="#58a6ff" fillOpacity={0.22} />
          </svg>
        </div>
        <span className="text-[14px] font-bold tracking-[-0.02em] text-dt-primary">
          DevDeck
        </span>
      </div>

      <div className="h-5 w-px bg-deck-border" />

      {/* Project pill */}
      <div
        className="flex items-center gap-1.5 rounded px-2 py-1"
        style={{ background: "#1c2128", border: "1px solid #30363d" }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="1" y="2.5" width="8" height="6" rx="1" stroke="#484f58" strokeWidth="1.2" />
          <path d="M3.5 2.5V1.8a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v.7" stroke="#484f58" strokeWidth="1.2" />
        </svg>
        <span className="font-mono text-[11px] text-dt-secondary">{project}</span>
      </div>

      <div className="flex-1" />

      {/* Service status pill */}
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1.5"
        style={{ background: "#1c2128", border: "1px solid #30363d" }}
      >
        <span
          className="relative inline-flex items-center justify-center"
          style={{ width: 14, height: 14 }}
        >
          <span
            className={allRunning ? "animate-pulse-ring-subtle" : ""}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: statusColor,
            }}
          />
          <span
            className="relative block rounded-full"
            style={{ width: 7, height: 7, background: statusColor }}
          />
        </span>
        <span className="font-mono text-[11px] text-dt-secondary">
          {running}
          <span className="text-dt-tertiary">/{services.length}</span>
          <span className="ml-1 text-dt-tertiary">running</span>
        </span>
        {!connected && (
          <span className="font-mono text-[10px] text-deck-amber">· reconnecting…</span>
        )}
      </div>

      {/* Settings */}
      <button
        type="button"
        onMouseEnter={() => setSettingsHov(true)}
        onMouseLeave={() => setSettingsHov(false)}
        className="flex items-center justify-center rounded transition-all duration-100"
        style={{
          width: 28,
          height: 28,
          background: settingsHov ? "#21262d" : "transparent",
          border: `1px solid ${settingsHov ? "#30363d" : "transparent"}`,
          color: settingsHov ? "#8b949e" : "#484f58",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.636 2.636l1.06 1.06M10.304 10.304l1.06 1.06M2.636 11.364l1.06-1.06M10.304 3.696l1.06-1.06"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </header>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  services,
  quickLinks,
  selectedId,
  onSelect,
  onStart,
  onStop,
  onRestart,
}: {
  services: Service[];
  quickLinks: QuickLink[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
}) {
  const running = services.filter((s) => s.status === "running").length;

  return (
    <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-deck-border bg-deck-panel">
      {/* Section header */}
      <div className="flex items-center justify-between px-3.5 pb-2 pt-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-dt-tertiary">
          Services
        </span>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] text-dt-tertiary"
          style={{ background: "#1c2128", border: "1px solid #21262d" }}
        >
          {running}/{services.length}
        </span>
      </div>

      {/* All services */}
      <AllServicesRow isActive={selectedId === null} onClick={() => onSelect(null)} />

      {/* Service list */}
      <div className="flex-1 overflow-y-auto">
        {services.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            isActive={selectedId === s.id}
            onClick={() => onSelect(selectedId === s.id ? null : s.id)}
            onStart={() => onStart(s.id)}
            onStop={() => onStop(s.id)}
            onRestart={() => onRestart(s.id)}
          />
        ))}
      </div>

      {/* Quick Links */}
      {quickLinks.length > 0 && (
        <>
          <div className="mx-3 h-px bg-deck-border" />
          <div className="pb-2 pt-2">
            <div className="px-3.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-dt-tertiary">
              Quick Links
            </div>
            {quickLinks.map((l) => (
              <QuickLinkRow key={l.url + l.label} link={l} />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

function AllServicesRow({ isActive, onClick }: { isActive: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex w-full items-center gap-2 py-1.5 pl-3.5 pr-3 text-left transition-colors duration-100"
      style={{
        background: isActive ? "#272e38" : hov ? "#21262d" : "transparent",
        borderLeft: `2px solid ${isActive ? "#58a6ff" : "transparent"}`,
      }}
    >
      {/* 2×2 grid icon */}
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink: 0 }}>
        <rect x="0" y="0" width="4.5" height="4.5" rx="1" fill={isActive ? "#58a6ff" : "#484f58"} />
        <rect x="6.5" y="0" width="4.5" height="4.5" rx="1" fill={isActive ? "#58a6ff" : "#484f58"} opacity={isActive ? 0.75 : 1} />
        <rect x="0" y="6.5" width="4.5" height="4.5" rx="1" fill={isActive ? "#58a6ff" : "#484f58"} opacity={isActive ? 0.5 : 1} />
        <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="1" fill={isActive ? "#58a6ff" : "#484f58"} opacity={isActive ? 0.28 : 1} />
      </svg>
      <span
        className="text-[13px] transition-colors duration-100"
        style={{
          color: isActive ? "#e6edf3" : "#8b949e",
          fontWeight: isActive ? 500 : 400,
        }}
      >
        All Services
      </span>
    </button>
  );
}

function ServiceRow({
  service,
  isActive,
  onClick,
  onStart,
  onStop,
  onRestart,
}: {
  service: Service;
  isActive: boolean;
  onClick: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}) {
  const [hov, setHov] = useState(false);
  const color = service.color ?? "#58a6ff";
  const showActions = hov && service.status !== "starting";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-2 py-1.5 pl-2.5 pr-2 transition-colors duration-100"
      style={{
        background: isActive ? "#272e38" : hov ? "#21262d" : "transparent",
        borderLeft: `2px solid ${isActive ? color : "transparent"}`,
      }}
    >
      {/* Name + dot — clickable to select */}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <StatusDot status={service.status} />
        <span
          className="flex-1 truncate text-[13px] transition-colors duration-100"
          style={{ color: isActive ? "#e6edf3" : "#8b949e", fontWeight: isActive ? 500 : 400 }}
        >
          {service.name}
        </span>
        {!showActions && service.port != null && (
          <span
            className="shrink-0 rounded px-1 font-mono text-[10px]"
            style={{ color: "#484f58", background: "#1c2128", border: "1px solid #21262d" }}
          >
            :{service.port}
          </span>
        )}
      </button>

      {/* Action buttons — appear on hover */}
      {showActions && (
        <div className="flex shrink-0 items-center gap-0.5">
          {(service.status === "stopped" || service.status === "error") && (
            <IconBtn title="Start" accentColor="#3fb950" onClick={onStart}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <polygon points="2.5,1.5 2.5,8.5 8.5,5" fill="currentColor" />
              </svg>
            </IconBtn>
          )}
          {(service.status === "running" || service.status === "starting") && (
            <IconBtn title="Stop" accentColor="#f85149" onClick={onStop}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor" />
              </svg>
            </IconBtn>
          )}
          <IconBtn title="Restart" accentColor="#d29922" onClick={onRestart}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1.5 5a3.5 3.5 0 1 1 .65 2M1.5 5V2.5M1.5 5H4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconBtn>
        </div>
      )}
    </div>
  );
}

function QuickLinkRow({ link }: { link: QuickLink }) {
  const [hov, setHov] = useState(false);
  const portMatch = link.url.match(/:(\d{2,5})/);
  const port = portMatch ? portMatch[1] : null;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-2 py-1 pl-3.5 pr-3 transition-colors duration-100"
      style={{ background: hov ? "#21262d" : "transparent", textDecoration: "none" }}
    >
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ flexShrink: 0, color: "#484f58" }}>
        <path d="M1 4.5H8M5 1l3.5 3.5L5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        className="flex-1 truncate text-[12px] transition-colors duration-100"
        style={{ color: hov ? "#58a6ff" : "#8b949e" }}
      >
        {link.label}
      </span>
      {port && (
        <span className="shrink-0 font-mono text-[9px] text-dt-tertiary">:{port}</span>
      )}
    </a>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "logs",
    label: "Logs",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1.5 3h9M1.5 6h7M1.5 9h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "env",
    label: "Env Vars",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 3l3.5 3L3 9M7.5 9H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "db",
    label: "Database",
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <ellipse cx="6" cy="3.5" rx="4" ry="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 3.5V8.5c0 .83 1.79 1.5 4 1.5s4-.67 4-1.5V3.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 6c0 .83 1.79 1.5 4 1.5S10 6.83 10 6" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
];

function TabButton({
  id,
  label,
  icon,
  isActive,
  onClick,
}: {
  id: Tab;
  label: string;
  icon: ReactNode;
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
      className="flex items-center gap-1.5 px-3 text-[13px] transition-colors duration-100"
      style={{
        height: "100%",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${isActive ? "#58a6ff" : "transparent"}`,
        cursor: "pointer",
        color: isActive ? "#e6edf3" : hov ? "#8b949e" : "#484f58",
        fontWeight: isActive ? 500 : 400,
        marginBottom: -1,
        paddingBottom: 1,
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.65 }}>{icon}</span>
      {label}
    </button>
  );
}

// ── Bottom Bar ────────────────────────────────────────────────────────────────

function BottomBar({
  commands,
  onRun,
}: {
  commands: QuickCommand[];
  onRun: (qc: QuickCommand) => void;
}) {
  const [addHov, setAddHov] = useState(false);

  return (
    <footer className="flex h-10 shrink-0 items-center gap-2 border-t border-deck-border bg-deck-panel px-3">
      {/* Terminal prompt glyph */}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: "#484f58" }}>
        <path d="M2 3l3.5 2.5L2 8M6.5 8H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Command pills */}
      <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
        {commands.slice(0, 6).map((qc) => (
          <CommandPill key={qc.label + qc.command} label={qc.label} onClick={() => onRun(qc)} />
        ))}
        {commands.length === 0 && (
          <span className="font-mono text-[10px] text-dt-tertiary">
            no quick commands — add them to devdeck.config.ts
          </span>
        )}
      </div>

      {/* Add Service */}
      <button
        type="button"
        onMouseEnter={() => setAddHov(true)}
        onMouseLeave={() => setAddHov(false)}
        className="flex shrink-0 items-center gap-1.5 rounded text-[11px] font-medium transition-all duration-100"
        style={{
          padding: "3px 10px",
          background: addHov ? "#272e38" : "#1c2128",
          border: `1px solid ${addHov ? "#58a6ff44" : "#30363d"}`,
          color: addHov ? "#58a6ff" : "#8b949e",
          cursor: "pointer",
        }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M4.5 1v7M1 4.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add Service
      </button>
    </footer>
  );
}

function CommandPill({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="shrink-0 whitespace-nowrap rounded font-mono text-[11px] transition-all duration-100"
      style={{
        padding: "2px 8px",
        background: hov ? "#21262d" : "#1c2128",
        border: `1px solid ${hov ? "#484f58" : "#30363d"}`,
        color: hov ? "#e6edf3" : "#8b949e",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

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
      /* ignore — daemon may not be running yet */
    }
  }, [base]);

  useEffect(() => {
    void loadUiConfig();
  }, [loadUiConfig, state.connected]);

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
    <div className="flex h-screen min-h-0 flex-col bg-deck-bg text-dt-primary">
      {/* ① Top bar */}
      <TopBar
        project={state.project}
        connected={state.connected}
        services={state.services}
      />

      {/* ②③④ Main body */}
      <div className="flex min-h-0 flex-1">
        {/* ② Left sidebar */}
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
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Tab bar */}
          <div
            className="flex shrink-0 items-center border-b border-deck-border bg-deck-panel"
            style={{ height: 40, paddingLeft: 4, paddingRight: 12 }}
          >
            {TABS.map((t) => (
              <TabButton
                key={t.id}
                id={t.id}
                label={t.label}
                icon={t.icon}
                isActive={tab === t.id}
                onClick={() => setTab(t.id)}
              />
            ))}
          </div>

          {/* Panel content + ④ right metrics */}
          <div className="flex min-h-0 flex-1">
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

            {/* ④ Right metrics — always visible */}
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

      {/* ⑤ Bottom bar */}
      <BottomBar commands={quickCommands} onRun={runQuick} />
    </div>
  );
}
