#!/usr/bin/env node
/**
 * Ensures tsx is registered so user devdeck.config.ts loads when running compiled JS.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const pkgRoot = path.join(__dirname, "..");
const entry = path.join(pkgRoot, "dist", "cli-entry.js");
const args = process.argv.slice(2);

const r = spawnSync(process.execPath, ["--import", "tsx", entry, ...args], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

process.exit(r.status ?? 1);
