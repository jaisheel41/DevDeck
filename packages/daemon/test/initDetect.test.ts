import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";
import { detectServicesFromPackageJson } from "../src/initDetect.js";
import { tempDir } from "./helpers.js";

test("detectServicesFromPackageJson orders scripts and skips pre and post hooks", () => {
  const { dir, cleanup } = tempDir("devdeck-init-");
  try {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        name: "sample-app",
        scripts: {
          predev: "echo pre",
          dev: "next dev",
          start: "node server.js",
          postbuild: "echo post",
          "my script": "echo hi",
          lint: "eslint .",
        },
      }),
    );
    const services = detectServicesFromPackageJson(dir);
    assert.deepEqual(
      services.map((s) => s.id),
      ["dev", "start", "lint", "my-script"],
    );
    assert.equal(services[0]?.name, "dev (sample-app)");
    assert.equal(services[0]?.command, "next dev");
    assert.equal(services[0]?.autoStart, false);
    assert.equal(services.find((s) => s.id === "my-script")?.command, "echo hi");
  } finally {
    cleanup();
  }
});

test("detectServicesFromPackageJson caps the list and ignores a bad package.json", () => {
  const capped = tempDir("devdeck-cap-");
  try {
    const scripts: Record<string, string> = {};
    for (let i = 0; i < 15; i++) scripts[`task${i}`] = "true";
    writeFileSync(join(capped.dir, "package.json"), JSON.stringify({ scripts }));
    assert.equal(detectServicesFromPackageJson(capped.dir).length, 12);
  } finally {
    capped.cleanup();
  }

  const missing = tempDir("devdeck-nopkg-");
  try {
    assert.deepEqual(detectServicesFromPackageJson(missing.dir), []);
  } finally {
    missing.cleanup();
  }

  const bad = tempDir("devdeck-badpkg-");
  try {
    writeFileSync(join(bad.dir, "package.json"), "{");
    assert.deepEqual(detectServicesFromPackageJson(bad.dir), []);
  } finally {
    bad.cleanup();
  }
});
