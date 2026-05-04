#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const daemonPkg = dirname(scriptsDir);
const monorepo = dirname(dirname(daemonPkg));
const uiRoot = join(monorepo, "packages", "ui");
const outDir = join(uiRoot, "out");
const target = join(daemonPkg, "public", "ui");

const b = spawnSync(process.execPath, [join(uiRoot, "build-static.mjs")], {
  cwd: uiRoot,
  stdio: "inherit",
  windowsHide: true,
});
if (b.status !== 0) process.exit(b.status ?? 1);

if (!existsSync(join(outDir, "index.html"))) {
  console.error("prepublish: missing", join(outDir, "index.html"));
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
rmSync(target, { recursive: true, force: true });
cpSync(outDir, target, { recursive: true });
console.log("prepublish: bundled UI to", target);
