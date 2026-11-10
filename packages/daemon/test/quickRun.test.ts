import assert from "node:assert/strict";
import { test } from "node:test";
import { QuickRunManager } from "../src/quickRun.js";
import { killPids, processesMatching, waitFor } from "./helpers.js";

test("a fourth quick command is refused and shutdown stops the rest", { timeout: 8000 }, async () => {
  const token = `devdeck-quick-${process.pid}-${Date.now()}`;
  const manager = new QuickRunManager();
  const command = `node -e "process.title='${token}'; setInterval(() => {}, 1000)"`;
  try {
    const results = [0, 1, 2, 3].map(() => manager.run(command, process.cwd(), () => undefined, () => undefined, () => undefined));
    assert.equal(results[0]?.ok, true);
    assert.equal(results[1]?.ok, true);
    assert.equal(results[2]?.ok, true);
    assert.equal(results[3]?.ok, false);
    await waitFor(() => processesMatching(token).length >= 1);
    manager.shutdown();
    await waitFor(() => processesMatching(token).length === 0);
  } finally {
    manager.shutdown();
    killPids(processesMatching(token));
  }
});
