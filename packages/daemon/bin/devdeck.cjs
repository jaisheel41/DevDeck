#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const pkgRoot = path.join(__dirname, "..");
const entry = path.join(pkgRoot, "dist", "cli-entry.js");
const args = process.argv.slice(2);
const tsxPath = pathToFileURL(require.resolve("tsx")).href;
const r = spawnSync(process.execPath, ["--import", tsxPath, entry, ...args], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});
process.exit(r.status ?? 1);