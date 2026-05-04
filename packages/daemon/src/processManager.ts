import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { DevDeckConfig, LogLevel, LogLine, Service, ServiceConfig, WSMessage } from "@jaisheel41/devdeck-shared";

const BUFFER_MAX = 500;

export type BroadcastFn = (msg: WSMessage) => void;

function classifyLevel(text: string): LogLevel {
  const t = text.toLowerCase();
  if (/\berror\b/.test(t) || /\bERROR\b/.test(text)) return "error";
  if (/\bwarn\b/.test(t) || /\bwarning\b/.test(t) || /\bWARN\b/.test(text)) return "warn";
  return "info";
}

function makeLogLine(service: ServiceConfig, text: string): LogLine {
  return {
    id: randomUUID(),
    ts: Date.now(),
    serviceId: service.id,
    serviceName: service.name,
    level: classifyLevel(text),
    text,
  };
}

type Managed = {
  config: ServiceConfig;
  status: Service["status"];
  pid?: number;
  proc?: ChildProcess;
  stdoutBuf: string;
  stderrBuf: string;
  logs: LogLine[];
};

export class ProcessManager {
  private byId = new Map<string, Managed>();
  private projectRoot: string;

  constructor(
    private readonly cwd: string,
    private readonly broadcast: BroadcastFn,
  ) {
    this.projectRoot = cwd;
  }

  private serviceToPublic(m: Managed): Service {
    const autoStart = m.config.autoStart === true;
    return {
      ...m.config,
      autoStart,
      color: m.config.color,
      status: m.status,
      pid: m.pid,
    };
  }

  private pushLog(m: Managed, line: LogLine) {
    m.logs.push(line);
    if (m.logs.length > BUFFER_MAX) m.logs.splice(0, m.logs.length - BUFFER_MAX);
    this.broadcast({ type: "log:line", line });
  }

  private emitServiceUpdate(m: Managed) {
    this.broadcast({ type: "service:update", service: this.serviceToPublic(m) });
  }

  private flushStream(m: Managed, chunk: Buffer, which: "stdout" | "stderr", bufKey: "stdoutBuf" | "stderrBuf") {
    const s = chunk.toString();
    m[bufKey] += s;
    const parts = m[bufKey].split("\n");
    m[bufKey] = parts.pop() ?? "";
    for (const raw of parts) {
      if (!raw.length) continue;
      const line = makeLogLine(m.config, raw);
      if (which === "stderr" && line.level === "info") line.level = "warn";
      this.pushLog(m, line);
    }
  }

  getServices(): Service[] {
    return [...this.byId.values()].map((m) => this.serviceToPublic(m));
  }

  getRecentLogs(): LogLine[] {
    const all: LogLine[] = [];
    for (const m of this.byId.values()) all.push(...m.logs);
    return all.sort((a, b) => a.ts - b.ts).slice(-BUFFER_MAX);
  }

  syncConfig(config: DevDeckConfig) {
    const nextIds = new Set(config.services.map((s) => s.id));
    for (const id of [...this.byId.keys()]) {
      if (!nextIds.has(id)) {
        void this.stop(id);
        this.byId.delete(id);
      }
    }
    for (const svc of config.services) {
      const existing = this.byId.get(svc.id);
      if (existing) {
        existing.config = svc;
        this.emitServiceUpdate(existing);
      } else {
        const m: Managed = {
          config: svc,
          status: "stopped",
          stdoutBuf: "",
          stderrBuf: "",
          logs: [],
        };
        this.byId.set(svc.id, m);
        this.emitServiceUpdate(m);
      }
    }
    for (const svc of config.services) {
      if (svc.autoStart === true) {
        const m = this.byId.get(svc.id);
        if (m && m.status === "stopped") void this.start(svc.id);
      }
    }
  }

  async start(id: string): Promise<void> {
    const m = this.byId.get(id);
    if (!m || m.status === "running" || m.status === "starting") return;
    m.status = "starting";
    this.emitServiceUpdate(m);
    const cwd = m.config.cwd ? resolve(this.projectRoot, m.config.cwd) : this.projectRoot;
    const env = { ...process.env, ...m.config.env } as NodeJS.ProcessEnv;
    try {
      const proc = spawn(m.config.command, {
        cwd,
        env,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (!proc.stdout || !proc.stderr) throw new Error("stdio pipes missing");
      m.proc = proc;
      m.pid = proc.pid;
      m.stdoutBuf = "";
      m.stderrBuf = "";
      proc.stdout.on("data", (d) => this.flushStream(m, d, "stdout", "stdoutBuf"));
      proc.stderr.on("data", (d) => this.flushStream(m, d, "stderr", "stderrBuf"));
      proc.on("error", (err) => {
        m.status = "error";
        m.pid = undefined;
        m.proc = undefined;
        this.pushLog(m, makeLogLine(m.config, `spawn error: ${err.message}`));
        this.emitServiceUpdate(m);
      });
      proc.on("exit", (code, signal) => {
        if (m.stdoutBuf.trim()) this.pushLog(m, makeLogLine(m.config, m.stdoutBuf));
        if (m.stderrBuf.trim()) {
          const ln = makeLogLine(m.config, m.stderrBuf);
          ln.level = "warn";
          this.pushLog(m, ln);
        }
        m.stdoutBuf = "";
        m.stderrBuf = "";
        m.proc = undefined;
        m.pid = undefined;
        m.status = code === 0 || signal === "SIGTERM" ? "stopped" : "error";
        const tail =
          code != null && code !== 0
            ? `exited with code ${code}`
            : signal
              ? `terminated by ${signal}`
              : "stopped";
        this.pushLog(m, makeLogLine(m.config, `[process] ${tail}`));
        this.emitServiceUpdate(m);
      });
      m.status = "running";
      this.emitServiceUpdate(m);
    } catch (e) {
      m.status = "error";
      m.proc = undefined;
      m.pid = undefined;
      this.pushLog(m, makeLogLine(m.config, `failed to start: ${String(e)}`));
      this.emitServiceUpdate(m);
    }
  }

  private killTree(proc: ChildProcess) {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }

  async stop(id: string): Promise<void> {
    const m = this.byId.get(id);
    if (!m?.proc) {
      if (m && m.status !== "stopped") {
        m.status = "stopped";
        m.pid = undefined;
        this.emitServiceUpdate(m);
      }
      return;
    }
    const proc = m.proc;
    this.killTree(proc);
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        resolve();
      }, 3000);
      proc.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  async restart(id: string): Promise<void> {
    await this.stop(id);
    await this.start(id);
  }

  sendSnapshotToClient(send: (msg: WSMessage) => void, project: string) {
    send({ type: "services:snapshot", services: this.getServices(), project });
    for (const line of this.getRecentLogs()) send({ type: "log:line", line });
  }
}
