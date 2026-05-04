import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { LogLine, WSMessage } from "@devdeck/shared";
import express from "express";
import { WebSocketServer } from "ws";
import { loadDevDeckConfigFromDisk, resolveDevDeckProjectRoot, watchDevDeckConfig } from "./config.js";
import { writeDaemonMeta } from "./daemonMeta.js";
import { DbClient } from "./dbClient.js";
import { loadServiceEnv, writeServiceEnvFile } from "./envManager.js";
import { MetricsCollector } from "./metrics.js";
import { ProcessManager } from "./processManager.js";
import { QuickRunManager } from "./quickRun.js";

const BASE_PORT = Number(process.env.DEVDECK_PORT ?? 3131);

/** Allow any localhost UI port when Next picks a fallback (e.g. 4322). */
function cors(req: express.Request, res: express.Response, next: express.NextFunction) {
  const origin = req.headers.origin;
  if (origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin && /^http:\/\/localhost:\d+$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:4321");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

function broadcastAll(clients: Set<import("ws").WebSocket>, msg: WSMessage) {
  const json = JSON.stringify(msg);
  for (const c of clients) {
    if (c.readyState === 1) c.send(json);
  }
}

function bundledUiDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "public", "ui");
}

export async function startDaemon(): Promise<number> {
  const cwd = process.env.DEVDECK_PROJECT_ROOT ?? resolveDevDeckProjectRoot(process.cwd());
  let currentConfig: Awaited<ReturnType<typeof loadDevDeckConfigFromDisk>> = await loadDevDeckConfigFromDisk(cwd);

  const clients = new Set<import("ws").WebSocket>();

  const broadcast = (msg: WSMessage) => broadcastAll(clients, msg);

  const pm = new ProcessManager(cwd, broadcast);
  pm.syncConfig(currentConfig);

  const snapshotMsg = (): WSMessage => ({
    type: "services:snapshot",
    services: pm.getServices(),
    project: currentConfig.project,
  });

  const metrics = new MetricsCollector(broadcast, () => {
    const out: { serviceId: string; pid: number }[] = [];
    for (const s of pm.getServices()) {
      if (s.status === "running" && s.pid) out.push({ serviceId: s.id, pid: s.pid });
    }
    return out;
  });
  metrics.start();

  const db = new DbClient(cwd, (id) => currentConfig.services.find((s) => s.id === id));
  const quickRuns = new QuickRunManager();

  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(cors);

  app.get("/api/ui-config", (_req, res) => {
    res.json({
      project: currentConfig.project,
      quickLinks: currentConfig.quickLinks ?? [],
      quickCommands: (currentConfig.quickCommands ?? []).slice(0, 5),
    });
  });

  app.post("/api/services/:id/start", async (req, res) => {
    await pm.start(req.params.id);
    res.json({ ok: true });
  });
  app.post("/api/services/:id/stop", async (req, res) => {
    await pm.stop(req.params.id);
    res.json({ ok: true });
  });
  app.post("/api/services/:id/restart", async (req, res) => {
    await pm.restart(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/env/:serviceId", (req, res) => {
    const svc = currentConfig.services.find((s) => s.id === req.params.serviceId);
    if (!svc) return res.status(404).json({ error: "service not found" });
    const payload = loadServiceEnv(cwd, svc);
    res.json(payload);
  });

  app.put("/api/env/:serviceId", (req, res) => {
    const svc = currentConfig.services.find((s) => s.id === req.params.serviceId);
    if (!svc) return res.status(404).json({ error: "service not found" });
    const body = req.body as { file?: string; vars?: Record<string, string> };
    if (typeof body.file !== "string" || !body.vars || typeof body.vars !== "object") {
      return res.status(400).json({ error: "file and vars required" });
    }
    try {
      const wr = writeServiceEnvFile(cwd, svc, body.file, body.vars);
      if (!wr.ok) return res.status(400).json({ error: wr.error });
      res.json({ ok: true, path: wr.path });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/db/tables", async (req, res) => {
    const serviceId = String(req.query.serviceId ?? "");
    if (!serviceId) return res.status(400).json({ error: "serviceId required" });
    try {
      const tables = await db.listTables(serviceId);
      res.json({ tables });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post("/api/db/query", async (req, res) => {
    const body = req.body as { serviceId?: string; sql?: string };
    if (!body.serviceId || !body.sql) return res.status(400).json({ error: "serviceId and sql required" });
    const result = await db.runQuery(body.serviceId, body.sql);
    res.json(result);
  });

  app.post("/api/quick-command", (req, res) => {
    const body = req.body as { label?: string; command?: string };
    if (!body.label || !body.command) return res.status(400).json({ error: "label and command required" });
    const r = quickRuns.run(
      body.command,
      cwd,
      (line) => {
        const ln: LogLine = {
          id: randomUUID(),
          ts: Date.now(),
          serviceId: "__quick__",
          serviceName: body.label!,
          level: "info",
          text: line,
        };
        broadcast({ type: "log:line", line: ln });
      },
      (line) => {
        const ln: LogLine = {
          id: randomUUID(),
          ts: Date.now(),
          serviceId: "__quick__",
          serviceName: body.label!,
          level: "warn",
          text: line,
        };
        broadcast({ type: "log:line", line: ln });
      },
      () => undefined,
    );
    if (!r.ok) return res.status(429).json({ error: r.error });
    res.json({ ok: true });
  });

  const server = createServer(app);

  const cfgWatcher = watchDevDeckConfig(cwd, (cfg) => {
    currentConfig = cfg;
    pm.syncConfig(cfg);
    broadcast(snapshotMsg());
  });

  /** Bind HTTP server; must run before WebSocketServer attaches or `ws` emits unhandled `error` on EADDRINUSE. */
  const tryListen = (port: number): Promise<boolean> =>
    new Promise((resolve, reject) => {
      const onErr = (err: NodeJS.ErrnoException) => {
        server.removeListener("error", onErr);
        if (err.code === "EADDRINUSE") resolve(false);
        else reject(err);
      };
      server.once("error", onErr);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", onErr);
        resolve(true);
      });
    });

  let chosenPort = BASE_PORT;
  for (let i = 0; i < 40; i++) {
    chosenPort = BASE_PORT + i;
    const ok = await tryListen(chosenPort);
    if (ok) break;
    await new Promise<void>((res) => server.close(() => res()));
    if (i === 39) throw new Error("No free port for daemon in range");
  }

  process.env.DEVDECK_DAEMON_PORT = String(chosenPort);
  writeDaemonMeta(cwd, chosenPort);

  const uiDir = bundledUiDir();
  const uiIndex = join(uiDir, "index.html");
  if (existsSync(uiIndex)) {
    app.use(express.static(uiDir, { index: "index.html" }));
  } else {
    app.get("/", (_req, res) => {
      const uiHint = process.env.DEVDECK_UI_HINT ?? "http://localhost:4321";
      res
        .type("html")
        .send(
          `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>DevDeck daemon</title></head>` +
            `<body style="font-family:system-ui,Segoe UI,sans-serif;background:#0d1117;color:#c9d1d9;padding:2rem;line-height:1.5">` +
            `<h1 style="font-size:1.25rem">DevDeck daemon</h1>` +
            `<p>This address (<strong>http://127.0.0.1:${chosenPort}</strong>) is the <strong>API + WebSocket</strong>, not the dashboard.</p>` +
            `<p>Open the UI (Next.js) in your browser — usually:<br/><a href="${uiHint}" style="color:#58a6ff">${uiHint}</a></p>` +
            `<p style="opacity:.75;font-size:0.875rem">If <code>pnpm dev</code> printed another port (line starting with <code>[DevDeck]</code>), use that URL instead.</p>` +
            `<p style="opacity:.75;font-size:0.875rem">You do <strong>not</strong> need a separate app project: services are defined in <code>devdeck.config.ts</code> in this repo.</p>` +
            `</body></html>`,
        );
    });
  }

  const wss = new WebSocketServer({ server });
  wss.on("error", () => undefined);

  wss.on("connection", (ws) => {
    clients.add(ws);
    pm.sendSnapshotToClient((msg) => ws.send(JSON.stringify(msg)), currentConfig.project);
    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as WSMessage;
        if (msg.type === "service:start") await pm.start(msg.serviceId);
        else if (msg.type === "service:stop") await pm.stop(msg.serviceId);
        else if (msg.type === "service:restart") await pm.restart(msg.serviceId);
      } catch {
        /* ignore malformed */
      }
    });
    ws.on("close", () => clients.delete(ws));
  });

  const shutdown = async () => {
    cfgWatcher.close().catch(() => undefined);
    metrics.stop();
    quickRuns.shutdown();
    for (const s of pm.getServices()) await pm.stop(s.id);
    await db.shutdown();
    wss.close();
    await new Promise<void>((r) => server.close(() => r()));
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  return chosenPort;
}

const entry = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href;
const isDirectRun = entry === import.meta.url;

if (isDirectRun) {
  void startDaemon().then((port) => {
    const hasUi = existsSync(join(bundledUiDir(), "index.html"));
    console.log(`DevDeck daemon listening on http://127.0.0.1:${port}`);
    if (hasUi) console.log(`Dashboard (bundled): http://127.0.0.1:${port}/`);
    console.log(`WebSocket: ws://127.0.0.1:${port}`);
  });
}
