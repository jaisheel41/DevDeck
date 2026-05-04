import { watch } from "chokidar";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { DevDeckConfig, ServiceConfig } from "@jaisheel1/devdeck-shared";
import { register } from "tsx/esm/api";

/** Walk up from start until devdeck.config.ts or pnpm-workspace.yaml is found (monorepo dev cwd fix). */
export function resolveDevDeckProjectRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, "devdeck.config.ts"))) return dir;
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

let tsxRegistered = false;

function ensureTsx() {
  if (!tsxRegistered) {
    register();
    tsxRegistered = true;
  }
}

const DEFAULT_COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#a371f7", "#79c0ff"];

function normalizeService(s: ServiceConfig, index: number): ServiceConfig {
  const autoStart = s.autoStart === true;
  const color = s.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  return { ...s, autoStart, color };
}

export function normalizeDevDeckConfig(raw: unknown): DevDeckConfig {
  if (!raw || typeof raw !== "object") throw new Error("Invalid devdeck.config: expected object");
  const o = raw as Record<string, unknown>;
  if (typeof o.project !== "string" || !Array.isArray(o.services)) {
    throw new Error("Invalid devdeck.config: project (string) and services (array) are required");
  }
  const services = (o.services as ServiceConfig[]).map((s, i) => normalizeService(s, i));
  const quickCommands = Array.isArray(o.quickCommands) ? (o.quickCommands as DevDeckConfig["quickCommands"])?.slice(0, 5) : undefined;
  return {
    project: o.project,
    services,
    quickLinks: o.quickLinks as DevDeckConfig["quickLinks"],
    quickCommands,
  };
}

export function getDemoConfig(cwd: string): DevDeckConfig {
  return normalizeDevDeckConfig({
    project: "DevDeck Demo",
    services: [
      {
        id: "alpha",
        name: "Alpha ticker",
        command: `node -e "let n=0;setInterval(()=>console.log('[alpha] tick',++n),4000)"`,
        port: 47001,
        autoStart: false,
      },
      {
        id: "beta",
        name: "Beta ticker",
        command: `node -e "let n=0;setInterval(()=>console.warn('[beta] warn',++n),5500)"`,
        port: 47002,
        autoStart: false,
      },
      {
        id: "pg",
        name: "Postgres log sim",
        command: `node -e "setInterval(()=>console.log('[pg] SELECT 1'),6000)"`,
        port: 5432,
        autoStart: false,
      },
    ],
    quickLinks: [{ label: "DevDeck UI", url: "http://localhost:4321" }],
    quickCommands: [{ label: "Echo hi", command: "node -e \"console.log('quick hi')\"" }],
  });
}

export async function loadDevDeckConfigFromDisk(cwd: string): Promise<DevDeckConfig> {
  const configPath = join(cwd, "devdeck.config.ts");
  if (!existsSync(configPath)) {
    return getDemoConfig(cwd);
  }
  ensureTsx();
  try {
    const href = pathToFileURL(configPath).href + `?t=${Date.now()}`;
    const mod = (await import(href)) as { default?: unknown };
    const raw = mod.default ?? mod;
    return normalizeDevDeckConfig(raw);
  } catch (e) {
    console.warn("[devdeck] Failed to load devdeck.config.ts, using demo config:", e);
    return getDemoConfig(cwd);
  }
}

export function watchDevDeckConfig(cwd: string, onReload: (cfg: DevDeckConfig) => void): ReturnType<typeof watch> {
  const configPath = join(cwd, "devdeck.config.ts");
  let timer: NodeJS.Timeout | undefined;
  const w = watch(configPath, { ignoreInitial: true });
  w.on("all", () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const cfg = await loadDevDeckConfigFromDisk(cwd);
        onReload(cfg);
      } catch (e) {
        console.warn("[devdeck] Config reload failed:", e);
      }
    }, 300);
  });
  return w;
}
