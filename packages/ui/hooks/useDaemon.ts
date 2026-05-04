"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LogLine, MetricsSnapshot, Service, WSMessage } from "@devdeck/shared";

const MAX_LOGS = 500;
const ROLLING_MS = 60_000;

function daemonHttpBase() {
  if (process.env.NEXT_PUBLIC_DAEMON_HTTP) {
    return process.env.NEXT_PUBLIC_DAEMON_HTTP.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_DEVDECK_EMBEDDED === "1" && typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://127.0.0.1:3131";
}

function daemonWsUrl() {
  if (process.env.NEXT_PUBLIC_DAEMON_WS) return process.env.NEXT_PUBLIC_DAEMON_WS;
  if (process.env.NEXT_PUBLIC_DEVDECK_EMBEDDED === "1" && typeof window !== "undefined") {
    const o = window.location.origin;
    if (o.startsWith("https://")) return `wss://${o.slice(8)}`;
    if (o.startsWith("http://")) return `ws://${o.slice(7)}`;
  }
  const http = daemonHttpBase();
  if (http.startsWith("https://")) return `wss://${http.slice("https://".length)}`;
  if (http.startsWith("http://")) return `ws://${http.slice("http://".length)}`;
  return "ws://127.0.0.1:3131";
}

export interface DaemonState {
  connected: boolean;
  project: string;
  services: Service[];
  logs: LogLine[];
  metricsByService: Record<string, MetricsSnapshot>;
  /** last 30 CPU % samples aggregated */
  cpuHistory: number[];
  /** last 30 memory bytes aggregated */
  memHistory: number[];
}

const initialState: DaemonState = {
  connected: false,
  project: "DevDeck",
  services: [],
  logs: [],
  metricsByService: {},
  cpuHistory: [],
  memHistory: [],
};

export function useDaemon() {
  const [state, setState] = useState<DaemonState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);
  const mounted = useRef(true);

  const applyMessage = useCallback((msg: WSMessage) => {
    setState((prev) => {
      if (msg.type === "services:snapshot") {
        return {
          ...prev,
          services: msg.services,
          project: msg.project,
        };
      }
      if (msg.type === "service:update") {
        const services = prev.services.map((s) => (s.id === msg.service.id ? msg.service : s));
        const has = services.some((s) => s.id === msg.service.id);
        return { ...prev, services: has ? services : [...services, msg.service] };
      }
      if (msg.type === "log:line") {
        const logs = [...prev.logs, msg.line].slice(-MAX_LOGS);
        return { ...prev, logs };
      }
      if (msg.type === "metrics:snapshot") {
        const metricsByService = { ...prev.metricsByService };
        for (const m of msg.metrics) metricsByService[m.serviceId] = m;
        const aggCpu = msg.metrics.reduce((a, m) => a + (m.cpu || 0), 0);
        const aggMem = msg.metrics.reduce((a, m) => a + (m.memory || 0), 0);
        const cpuHistory = [...prev.cpuHistory, aggCpu].slice(-30);
        const memHistory = [...prev.memHistory, aggMem].slice(-30);
        return { ...prev, metricsByService, cpuHistory, memHistory };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    let ws: WebSocket | null = null;
    let closed = false;

    const connect = () => {
      if (closed || !mounted.current) return;
      const url = daemonWsUrl();
      ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        reconnectRef.current = 0;
        setState((s) => ({ ...s, connected: true }));
      };
      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }));
        wsRef.current = null;
        if (closed || !mounted.current) return;
        const delay = Math.min(30_000, 2000 + reconnectRef.current * 500);
        reconnectRef.current += 1;
        setTimeout(connect, delay);
      };
      ws.onerror = () => {
        ws?.close();
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WSMessage;
          applyMessage(msg);
        } catch {
          /* ignore */
        }
      };
    };

    connect();
    return () => {
      closed = true;
      mounted.current = false;
      ws?.close();
    };
  }, [applyMessage]);

  const base = useMemo(() => daemonHttpBase(), []);

  const control = useCallback(
    async (id: string, action: "start" | "stop" | "restart", via: "rest" | "ws" = "rest") => {
      if (via === "ws" && wsRef.current?.readyState === WebSocket.OPEN) {
        const t =
          action === "start" ? "service:start" : action === "stop" ? "service:stop" : "service:restart";
        wsRef.current.send(JSON.stringify({ type: t, serviceId: id }));
        return;
      }
      await fetch(`${base}/api/services/${encodeURIComponent(id)}/${action}`, { method: "POST" });
    },
    [base],
  );

  const start = useCallback((id: string) => control(id, "start"), [control]);
  const stop = useCallback((id: string) => control(id, "stop"), [control]);
  const restart = useCallback((id: string) => control(id, "restart"), [control]);

  return { state, base, start, stop, restart, wsRef };
}

export function useRollingLogStats(logs: LogLine[], selectedServiceId: string | null) {
  return useMemo(() => {
    const now = Date.now();
    const windowStart = now - ROLLING_MS;
    let errors = 0;
    let dbQueries = 0;
    for (const line of logs) {
      if (line.ts < windowStart) continue;
      if (selectedServiceId && line.serviceId !== selectedServiceId) continue;
      if (line.level === "error") errors++;
      const isPgish =
        line.serviceId === "pg" ||
        line.serviceId.includes("postgres") ||
        line.serviceName.toLowerCase().includes("postgres");
      if (isPgish && /\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(line.text)) dbQueries++;
    }
    return { errors, dbQueries };
  }, [logs, selectedServiceId]);
}
