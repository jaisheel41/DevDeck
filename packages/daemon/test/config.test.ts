import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";
import {
  loadDevDeckConfigFromDisk,
  normalizeDevDeckConfig,
  resolveDevDeckProjectRoot,
} from "../src/config.js";
import { tempDir } from "./helpers.js";

test("normalizeDevDeckConfig fills defaults and caps quick commands", () => {
  assert.throws(() => normalizeDevDeckConfig(null), /expected object/);
  assert.throws(() => normalizeDevDeckConfig({ project: "x" }), /services/);

  const commands = Array.from({ length: 7 }, (_, i) => ({ label: `c${i}`, command: "true" }));
  const cfg = normalizeDevDeckConfig({
    project: "App",
    services: [
      { id: "a", name: "A", command: "true" },
      { id: "b", name: "B", command: "true", autoStart: true, color: "#fff" },
    ],
    quickLinks: [{ label: "App", url: "http://localhost:3000" }],
    quickCommands: commands,
  });

  assert.equal(cfg.project, "App");
  assert.equal(cfg.services[0]?.autoStart, false);
  assert.equal(cfg.services[0]?.color?.startsWith("#"), true);
  assert.equal(cfg.services[1]?.autoStart, true);
  assert.equal(cfg.services[1]?.color, "#fff");
  assert.equal(cfg.quickCommands?.length, 5);
  assert.equal(cfg.quickLinks?.length, 1);
});

test("resolveDevDeckProjectRoot walks up to the config file", () => {
  const { dir, cleanup } = tempDir("devdeck-root-");
  try {
    writeFileSync(join(dir, "devdeck.config.ts"), "export default { project: 'X', services: [] };\n");
    const nested = join(dir, "a", "b");
    mkdirSync(nested, { recursive: true });
    assert.equal(resolveDevDeckProjectRoot(nested), dir);
  } finally {
    cleanup();
  }
});

test("resolveDevDeckProjectRoot stops at a pnpm workspace", () => {
  const { dir, cleanup } = tempDir("devdeck-ws-");
  try {
    writeFileSync(join(dir, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
    const nested = join(dir, "packages", "app");
    mkdirSync(nested, { recursive: true });
    assert.equal(resolveDevDeckProjectRoot(nested), dir);
  } finally {
    cleanup();
  }
});

test("loadDevDeckConfigFromDisk reads a config and falls back when it is missing or invalid", async () => {
  const missing = tempDir("devdeck-missing-");
  try {
    const demo = await loadDevDeckConfigFromDisk(missing.dir);
    assert.equal(demo.project, "DevDeck Demo");
    assert.equal(demo.services.length, 3);
    assert.equal(demo.services.every((s) => s.autoStart === false), true);
  } finally {
    missing.cleanup();
  }

  const valid = tempDir("devdeck-valid-");
  try {
    writeFileSync(
      join(valid.dir, "devdeck.config.ts"),
      "export default { project: 'Fixture', services: [{ id: 'web', name: 'Web', command: 'true' }] };\n",
    );
    const cfg = await loadDevDeckConfigFromDisk(valid.dir);
    assert.equal(cfg.project, "Fixture");
    assert.equal(cfg.services[0]?.id, "web");
    assert.equal(cfg.services[0]?.autoStart, false);
  } finally {
    valid.cleanup();
  }

  const broken = tempDir("devdeck-broken-");
  try {
    writeFileSync(join(broken.dir, "devdeck.config.ts"), "export default { nope: true };\n");
    const cfg = await loadDevDeckConfigFromDisk(broken.dir);
    assert.equal(cfg.project, "DevDeck Demo");
  } finally {
    broken.cleanup();
  }
});
