import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCli } from "../src/cli.js";

const version = (
  JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8")) as {
    version: string;
  }
).version;

describe("cli output", { concurrency: 1 }, () => {
  test("version prints the package version", async () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      await runCli(["node", "devdeck", "--version"]);
      await runCli(["node", "devdeck", "-v"]);
    } finally {
      console.log = orig;
    }
    assert.equal(lines[0], version);
    assert.equal(lines[1], version);
  });

  test("help lists the real commands", async () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };
    try {
      await runCli(["node", "devdeck", "help"]);
    } finally {
      console.log = orig;
    }
    const text = lines.join("\n");
    assert.match(text, /start, serve/);
    assert.match(text, /\binit\b/);
    assert.match(text, /version, -v/);
  });
});
