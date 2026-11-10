import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";
import { loadServiceEnv, writeServiceEnvFile } from "../src/envManager.js";
import { tempDir } from "./helpers.js";

const service = { id: "web", name: "Web", command: "true" };

test("loadServiceEnv merges allowlisted files and writeServiceEnvFile refuses other names", () => {
  const { dir, cleanup } = tempDir("devdeck-env-");
  try {
    writeFileSync(join(dir, ".env"), "A=1\nB=from-env\n# comment\nexport C=3\n");
    writeFileSync(join(dir, ".env.local"), 'B=from-local\nEMPTY=\nQUOTED="hello there"\n');

    const loaded = loadServiceEnv(dir, service);
    assert.equal(loaded.merged.A, "1");
    assert.equal(loaded.merged.B, "from-local");
    assert.equal(loaded.provenance.B, ".env.local");
    assert.equal(loaded.merged.C, "3");
    assert.equal(loaded.merged.EMPTY, "");
    assert.equal(loaded.merged.QUOTED, "hello there");
    assert.deepEqual(
      loaded.layers.map((layer) => layer.name),
      [".env", ".env.local"],
    );

    const traversal = writeServiceEnvFile(dir, service, "../.env", { A: "nope" });
    assert.equal(traversal.ok, false);
    const evil = writeServiceEnvFile(dir, service, ".env.evil", { A: "nope" });
    assert.equal(evil.ok, false);

    const wrote = writeServiceEnvFile(dir, service, ".env.local", {
      B: "next",
      NOTE: "has hash # inside",
    });
    assert.equal(wrote.ok, true);
    if (wrote.ok) {
      const body = readFileSync(wrote.path, "utf8");
      assert.match(body, /NOTE="has hash # inside"/);
    }

    const again = loadServiceEnv(dir, service);
    assert.equal(again.merged.B, "next");
    assert.equal(again.merged.NOTE, "has hash # inside");
    assert.equal(again.merged.A, "1");
  } finally {
    cleanup();
  }
});
