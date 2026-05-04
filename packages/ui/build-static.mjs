#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const uiRoot = dirname(fileURLToPath(import.meta.url));
const nextBin = join(uiRoot, "node_modules", "next", "dist", "bin", "next");

const env = { ...process.env, DEVDECK_STATIC_EXPORT: "1" };
const r = spawnSync(process.execPath, [nextBin, "build"], { cwd: uiRoot, stdio: "inherit", env, windowsHide: true });
process.exit(r.status ?? 1);
