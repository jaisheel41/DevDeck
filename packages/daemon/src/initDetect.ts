import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ServiceConfig } from "@jaisheel1/devdeck-shared";

function slug(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "svc";
}

const SCRIPT_ORDER = ["dev", "start", "serve", "web", "worker", "api", "build"];

/** Best-effort services from package.json scripts (all autoStart: false). */
export function detectServicesFromPackageJson(cwd: string): ServiceConfig[] {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return [];
  let pkg: { name?: string; scripts?: Record<string, string> };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as typeof pkg;
  } catch {
    return [];
  }
  const scripts = pkg.scripts ?? {};
  const keys = Object.keys(scripts).filter((k) => !k.startsWith("pre") && !k.startsWith("post"));
  keys.sort((a, b) => {
    const ia = SCRIPT_ORDER.indexOf(a);
    const ib = SCRIPT_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.localeCompare(b);
  });
  const seen = new Set<string>();
  const out: ServiceConfig[] = [];
  for (const key of keys) {
    const cmd = scripts[key];
    if (!cmd || typeof cmd !== "string") continue;
    const id = slug(key);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: `${key}${pkg.name ? ` — ${pkg.name}` : ""}`,
      command: cmd,
      autoStart: false,
    });
  }
  return out.slice(0, 12);
}
