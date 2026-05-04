import { existsSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { ServiceConfig } from "@jaisheel41/devdeck-shared";

function parseDotEnv(content: string): Record<string, string> {
  let text = content;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^export\s+/i.test(trimmed)) trimmed = trimmed.replace(/^export\s+/i, "").trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function serializeDotEnv(vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([k, v]) => {
    const needsQuote = /[\s#]/.test(v) || v === "";
    const esc = v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
    return needsQuote ? `${k}="${esc}"` : `${k}=${v}`;
  });
  return lines.join("\n") + "\n";
}

/**
 * Single merge / discovery order (low → high precedence).
 * Unlike Next at `NODE_ENV=test`, DevDeck always includes `.env.local` when present
 * so local secrets show up in the dashboard and DATABASE_URL resolves.
 */
export const ENV_FILE_ALLOWLIST = [
  ".env.example",
  ".env.sample",
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
] as const;

export type EnvFileName = (typeof ENV_FILE_ALLOWLIST)[number];

export function isAllowedEnvFileName(name: string): name is EnvFileName {
  return (ENV_FILE_ALLOWLIST as readonly string[]).includes(name);
}

/** Same base resolution as ProcessManager spawn cwd; realpath follows symlinks (e.g. monorepos). */
export function serviceWorkingDirectory(projectRoot: string, service: ServiceConfig): string {
  const raw = service.cwd ? resolve(projectRoot, service.cwd) : projectRoot;
  try {
    return realpathSync(raw);
  } catch {
    return raw;
  }
}

function processNodeEnvLabel(): string {
  return process.env.NODE_ENV ?? "development";
}

/** Allowlisted files that exist under baseDir, in merge order (tabs). */
export function discoverExistingEnvLayers(baseDir: string): EnvFileName[] {
  const found: EnvFileName[] = [];
  for (const name of ENV_FILE_ALLOWLIST) {
    const p = join(baseDir, name);
    if (existsSync(p)) found.push(name);
  }
  return found;
}

export interface LoadedServiceEnv {
  merged: Record<string, string>;
  provenance: Record<string, string>;
  layers: Array<{ name: string; path: string; vars: Record<string, string> }>;
  /** process.env.NODE_ENV on the daemon (informational). */
  nodeEnv: string;
}

export function loadServiceEnv(projectRoot: string, service: ServiceConfig): LoadedServiceEnv {
  const baseDir = serviceWorkingDirectory(projectRoot, service);
  const nodeEnv = processNodeEnvLabel();

  const merged: Record<string, string> = {};
  const provenance: Record<string, string> = {};

  for (const name of ENV_FILE_ALLOWLIST) {
    const filePath = join(baseDir, name);
    if (!existsSync(filePath)) continue;
    const vars = parseDotEnv(readFileSync(filePath, "utf8"));
    for (const [k, v] of Object.entries(vars)) {
      merged[k] = v;
      provenance[k] = name;
    }
  }

  const existingNames = discoverExistingEnvLayers(baseDir);
  const layers = existingNames.map((name) => {
    const pathStr = join(baseDir, name);
    const vars = parseDotEnv(readFileSync(pathStr, "utf8"));
    return { name, path: pathStr, vars };
  });

  return { merged, provenance, layers, nodeEnv };
}

export function writeEnvFileAtomic(envPath: string, vars: Record<string, string>) {
  const dir = dirname(envPath);
  const tmp = join(dir, `.env.${process.pid}.${Date.now()}.tmp`);
  const body = serializeDotEnv(vars);
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, envPath);
}

/** Resolve and validate allowlisted env file under service cwd; blocks traversal. */
export function writeServiceEnvFile(
  projectRoot: string,
  service: ServiceConfig,
  fileName: string,
  vars: Record<string, string>,
): { ok: true; path: string } | { ok: false; error: string } {
  if (!isAllowedEnvFileName(fileName)) {
    return { ok: false, error: "Invalid env file name" };
  }
  const baseDir = serviceWorkingDirectory(projectRoot, service);
  const envPath = resolve(baseDir, fileName);
  const rel = relative(baseDir, envPath);
  if (!rel || rel.startsWith("..") || rel.includes("..")) {
    return { ok: false, error: "Invalid path" };
  }
  writeEnvFileAtomic(envPath, vars);
  return { ok: true, path: envPath };
}
