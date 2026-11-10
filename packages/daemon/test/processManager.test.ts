import assert from "node:assert/strict";
import { test } from "node:test";
import { ProcessManager } from "../src/processManager.js";
import { killPids, processesMatching, waitFor } from "./helpers.js";

test("start captures stdout and a clean exit is stopped", { timeout: 8000 }, async () => {
  const pm = new ProcessManager(process.cwd(), () => undefined);
  pm.syncConfig({
    project: "t",
    services: [
      {
        id: "echo",
        name: "Echo",
        command: `node -e "console.log('hello-devdeck'); console.error('plain-stderr')"`,
        autoStart: false,
      },
    ],
  });
  await pm.start("echo");
  await waitFor(() => pm.getRecentLogs().some((line) => line.text.includes("hello-devdeck")));
  await waitFor(() => pm.getServices()[0]?.status === "stopped");
  const info = pm.getRecentLogs().find((line) => line.text.includes("hello-devdeck"));
  const warn = pm.getRecentLogs().find((line) => line.text.includes("plain-stderr"));
  assert.equal(info?.level, "info");
  assert.equal(info?.serviceName, "Echo");
  assert.equal(warn?.level, "warn");
});

test("log lines that say error are marked error", { timeout: 8000 }, async () => {
  const pm = new ProcessManager(process.cwd(), () => undefined);
  pm.syncConfig({
    project: "t",
    services: [
      {
        id: "boom",
        name: "Boom",
        command: `node -e "console.log('error: boom')"`,
        autoStart: false,
      },
    ],
  });
  await pm.start("boom");
  await waitFor(() => pm.getRecentLogs().some((line) => line.text.includes("error: boom")));
  const line = pm.getRecentLogs().find((entry) => entry.text.includes("error: boom"));
  assert.equal(line?.level, "error");
});

test("stop kills the shell and the child process", { timeout: 8000 }, async () => {
  const token = `devdeck-stop-${process.pid}-${Date.now()}`;
  const pm = new ProcessManager(process.cwd(), () => undefined);
  pm.syncConfig({
    project: "t",
    services: [
      {
        id: "hang",
        name: "Hang",
        command: `node -e "process.title='${token}'; setInterval(() => {}, 1000)"`,
        autoStart: false,
      },
    ],
  });
  try {
    await pm.start("hang");
    await waitFor(() => processesMatching(token).length > 0);
    assert.equal(pm.getServices()[0]?.status, "running");
    await pm.stop("hang");
    await waitFor(() => pm.getServices()[0]?.status === "stopped" && processesMatching(token).length === 0);
  } finally {
    await pm.stop("hang");
    killPids(processesMatching(token));
  }
});
